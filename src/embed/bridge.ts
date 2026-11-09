/**
 * The Codex bridge: lets Ocean Explorer run inside The Codex (dbcodex) as part
 * of a course, instead of as a separate site.
 *
 * Embedded mode is on only when the page is framed AND opened with
 * `?embed=codex`. Opened directly, Ocean Explorer behaves exactly as before.
 *
 * Messages are plain objects tagged with `source`, and every message in either
 * direction is checked against an origin allow-list, so no other site can
 * drive the lesson or receive its events. No names or identifying data are
 * ever sent: only lesson progress (steps, creatures tapped, predictions).
 */
import { steps as lessonSteps } from '../content/lesson.ts';
import { stepsFor } from '../content/changing.ts';
import type { LessonState, Mode } from '../lesson/controller.ts';
import type { StepId } from '../content/types.ts';
import { oceanStepsFor } from '../content/openOcean.ts';

export const PROTOCOL_VERSION = 1;
export const LESSON_ID = 'belize-living-reef';

/** Events Ocean Explorer sends up to The Codex. */
export type ToCodex =
  | { type: 'ready'; lesson: string; labels: boolean }
  | { type: 'step_changed'; mode: Mode; step: string; index: number; total: number; label: string }
  | { type: 'organism_selected'; id: string; title: string }
  | { type: 'prediction_recorded'; choice: string | null }
  | { type: 'lesson_completed'; mode: Mode }
  | { type: 'labels_changed'; on: boolean };

/** Commands The Codex can send down to Ocean Explorer. */
export type FromCodex =
  | { type: 'start'; mode: Mode; resume?: boolean }
  | { type: 'set_labels'; on: boolean }
  | { type: 'go_to_step'; step: StepId }
  | { type: 'pause_narration' }
  | { type: 'open_panel'; panel: Panel };

/** Ocean Explorer's own panels, which The Codex's header buttons can open. */
export type Panel = 'guide' | 'transcript' | 'settings';
const PANELS: Panel[] = ['guide', 'transcript', 'settings'];

export const OE_SOURCE = 'ocean-explorer';
export const CODEX_SOURCE = 'the-codex';

/** Production Codex origins. Add more at build time with VITE_CODEX_ORIGINS (comma separated). */
export const DEFAULT_CODEX_ORIGINS = ['https://dbcodex.netlify.app'];

export function allowedOrigins(extra = ''): string[] {
  const added = extra
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return [...new Set([...DEFAULT_CODEX_ORIGINS, ...added])];
}

/**
 * An origin is trusted if it is on the list, or — only in development — a
 * localhost page (so the two apps can be run side by side on any port).
 * Netlify deploy previews of the Codex are allowed too.
 */
export function isAllowedOrigin(origin: string, list: string[], dev: boolean): boolean {
  if (!origin || origin === 'null') return false;
  if (list.includes(origin)) return true;
  if (/^https:\/\/deploy-preview-\d+--dbcodex\.netlify\.app$/.test(origin)) return true;
  if (dev && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

const MODES: Mode[] = ['lesson', 'explore', 'find', 'changing', 'ocean'];

/** Validates an incoming message. Anything malformed is ignored. */
export function parseCommand(data: unknown): FromCodex | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.source !== CODEX_SOURCE) return null;
  switch (d.type) {
    case 'start':
      return MODES.includes(d.mode as Mode) ? { type: 'start', mode: d.mode as Mode, resume: d.resume === true } : null;
    case 'set_labels':
      return typeof d.on === 'boolean' ? { type: 'set_labels', on: d.on } : null;
    case 'go_to_step':
      return lessonSteps.some((s) => s.id === d.step) ? { type: 'go_to_step', step: d.step as StepId } : null;
    case 'pause_narration':
      return { type: 'pause_narration' };
    case 'open_panel':
      return PANELS.includes(d.panel as Panel) ? { type: 'open_panel', panel: d.panel as Panel } : null;
    default:
      return null;
  }
}

/** Where the current mode is, as a step position. null when no stepped activity is running. */
export function stepPosition(s: LessonState): { step: string; index: number; total: number; label: string } | null {
  if (s.mode === 'lesson') {
    const index = lessonSteps.findIndex((x) => x.id === s.step);
    return { step: s.step, index, total: lessonSteps.length, label: lessonSteps[index]?.label ?? s.step };
  }
  if (s.mode === 'ocean') {
    const list = oceanStepsFor(s.ocean.level);
    const index = Math.min(s.ocean.step, list.length - 1);
    return { step: String(index), index, total: list.length, label: list[index]?.label ?? '' };
  }
  if (s.mode === 'changing') {
    const list = stepsFor(s.changing.level);
    const index = Math.min(s.changing.step, list.length - 1);
    return { step: String(index), index, total: list.length, label: list[index]?.label ?? '' };
  }
  return null;
}

/**
 * The events a state change produces. Pure, so it can be tested without a DOM.
 * `titleOf` turns an organism id into its display name.
 */
export function eventsFor(prev: LessonState, next: LessonState, titleOf: (id: string) => string): ToCodex[] {
  const out: ToCodex[] = [];
  if (next.mode === null) return out;
  const a = stepPosition(prev);
  const b = stepPosition(next);
  if (b && (prev.mode !== next.mode || a?.index !== b.index)) {
    out.push({ type: 'step_changed', mode: next.mode, ...b });
    const wasLast = !!a && prev.mode === next.mode && a.index === a.total - 1;
    if (b.index === b.total - 1 && !wasLast) out.push({ type: 'lesson_completed', mode: next.mode });
  }
  if (next.selectedOrganism && next.selectedOrganism !== prev.selectedOrganism) {
    out.push({ type: 'organism_selected', id: next.selectedOrganism, title: titleOf(next.selectedOrganism) });
  }
  if (next.shelter.recorded && !prev.shelter.recorded) {
    out.push({ type: 'prediction_recorded', choice: next.shelter.selected });
  }
  return out;
}

export interface BridgeOptions {
  onCommand: (cmd: FromCodex) => void;
  /** Extra allowed origins (VITE_CODEX_ORIGINS). */
  extraOrigins?: string;
  dev?: boolean;
  win?: Window;
}

/** True when this page is running inside The Codex. */
export function isEmbedded(win: Window = window): boolean {
  try {
    return new URLSearchParams(win.location.search).get('embed') === 'codex' && win.parent !== win;
  } catch {
    return false;
  }
}

export class CodexBridge {
  private origins: string[];
  private dev: boolean;
  private win: Window;
  /** Locked to the parent's origin once it has spoken to us (or from the referrer). */
  private parentOrigin: string | null = null;
  private opts: BridgeOptions;

  constructor(opts: BridgeOptions) {
    this.opts = opts;
    this.win = opts.win ?? window;
    this.origins = allowedOrigins(opts.extraOrigins ?? '');
    this.dev = !!opts.dev;
    try {
      const ref = this.win.document.referrer ? new URL(this.win.document.referrer).origin : '';
      if (isAllowedOrigin(ref, this.origins, this.dev)) this.parentOrigin = ref;
    } catch {
      // No usable referrer: wait for the parent's first message.
    }
    this.win.addEventListener('message', this.onMessage);
  }

  private onMessage = (e: MessageEvent) => {
    if (e.source !== this.win.parent) return;
    if (!isAllowedOrigin(e.origin, this.origins, this.dev)) return;
    const cmd = parseCommand(e.data);
    if (!cmd) return;
    this.parentOrigin = e.origin;
    this.opts.onCommand(cmd);
  };

  send(msg: ToCodex) {
    const payload = { source: OE_SOURCE, version: PROTOCOL_VERSION, ...msg };
    // Before the parent is known, address each trusted origin; the browser only delivers to the one that matches.
    const targets = this.parentOrigin ? [this.parentOrigin] : this.origins;
    for (const origin of targets) {
      try {
        this.win.parent.postMessage(payload, origin);
      } catch {
        // A closed or navigated parent: nothing to do.
      }
    }
  }

  dispose() {
    this.win.removeEventListener('message', this.onMessage);
  }
}
