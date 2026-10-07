/**
 * Experience shell: entry screen, modes, loading and error recovery, settings,
 * and the wiring between lesson state, the renderer, narration and input.
 */
import { Ambience, Narrator, type NarrationState } from './audio/narrator.ts';
import { foodRelationshipById } from './content/food.ts';
import { habitatById } from './content/habitats.ts';
import { COMPOSITE_NOTICE, GUIDING_QUESTION, LESSON_TITLE, OBJECTIVE, PRODUCT_NAME, connectItems, exitQuestions, stepById, steps, videoSegments } from './content/lesson.ts';
import { findNarrationId, spotterNarrationId } from './content/findables.ts';
import { narrationById } from './content/narration.ts';
import { recordedAudioFor } from './content/recordings.ts';
import { organismById, organisms } from './content/organisms.ts';
import type { HabitatId, StepId, VideoSegment } from './content/types.ts';
import { currentFindTarget, initialState, reduce, type Action, type LessonState, type Mode } from './lesson/controller.ts';
import { clearAll, loadPreferences, loadSession, savePreferences, saveSession, type Preferences } from './lesson/store.ts';
import { ReefScene, webglAvailable, type Viewpoint } from './scene/ReefScene.ts';
import { StaticScene } from './scene/StaticScene.ts';
import { renderGuide, renderTranscript, SHORTCUTS } from './ui/guide.ts';
import { btn, esc } from './ui/html.ts';
import { findOrder, renderCard, renderExploreDock, renderFindDock, renderLessonDock } from './ui/views.ts';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

interface SceneTarget {
  view: Viewpoint;
  stop: HabitatId;
  shelter: 'before' | 'after' | null;
}

export class App {
  private state: LessonState;
  /** A saved session from a previous visit, offered as "Resume" on the entry screen. */
  private resumable: LessonState | null = null;
  private prefs: Preferences;
  private paused = false;
  private muted = false;
  private scene3d: ReefScene | null = null;
  private staticScene: StaticScene | null = null;
  private lastView: Viewpoint | null = null;
  private narrator: Narrator;
  private ambience = new Ambience();
  private caption: string | null = null;
  private narrationState: NarrationState = 'idle';
  /** Clips to play back to back (e.g. "You found it!" then the animal's fact). */
  private narrationQueue: string[] = [];
  /** Animal pointed out by the game's Hint button in the illustrations view. */
  private staticHint: string | null = null;
  private videos: VideoSegment[] = [];
  private returnFocus: HTMLElement | null = null;
  private perfTimer = 0;
  private reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  constructor() {
    this.prefs = loadPreferences(this.reducedMotion);
    const params = new URLSearchParams(location.search);
    const forced = params.get('presentation');
    if (forced === 'static' || forced === '3d') this.prefs.presentation = forced;
    const saved = loadSession();
    this.resumable = saved.mode !== null ? saved : null;
    this.state = initialState();
    this.narrator = new Narrator({
      onCaption: (text) => {
        this.caption = text;
        this.renderCaptions();
      },
      onState: (s) => {
        this.narrationState = s;
        this.renderCaptions();
        if (s === 'idle' && this.narrationQueue.length) {
          const next = this.narrationQueue.shift()!;
          window.setTimeout(() => this.playNarration(next), 250);
        }
      },
    }, recordedAudioFor);
  }

  init() {
    this.applyPrefs();
    this.bindEvents();
    new ResizeObserver(() => this.updateInsets()).observe($('dock'));
    window.addEventListener('resize', () => this.updateInsets());
    this.renderAll();
    this.startPresentation();
    void this.detectVideos();
    $('guide').innerHTML = this.guideMarkup();
    // Tells the start-up watchdog in index.html that the app is running.
    document.documentElement.setAttribute('data-booted', '1');
    $('boot-error').hidden = true;
    if (location.hash === '#guide') this.openGuide();
    if (location.hash === '#record') void this.openRecorder();
  }

  private recorder: { open(): void; close(): void; isOpen: boolean } | null = null;

  /** The recording page loads on demand, so it adds nothing to the lesson's own load. */
  private async openRecorder() {
    this.stopNarration();
    if (!this.recorder) {
      const { Recorder } = await import('./ui/recorder.ts');
      this.recorder = new Recorder($('recorder'), () => {
        if (location.hash === '#record') history.replaceState(null, '', location.pathname + location.search);
      });
    }
    $('guide').hidden = true;
    this.recorder.open();
  }

  // ── State ──────────────────────────────────────────────────────────────────

  private dispatch(action: Action) {
    const prev = this.state;
    this.state = reduce(prev, action);
    if (this.state.mode !== null) saveSession(this.state);
    this.afterChange(prev, action);
  }

  private afterChange(prev: LessonState, action: Action) {
    const s = this.state;
    const stepChanged = prev.step !== s.step || prev.mode !== s.mode;
    if (action.type === 'start' || action.type === 'restart') this.startAudio();

    this.renderAll();
    this.syncScene();

    // Narration follows what changed, unless paused or turned off.
    if (s.mode === 'lesson' && stepChanged) this.narrate(stepById.get(s.step)!.narrationId);
    else if (s.mode === 'explore' && action.type === 'start') this.narrate(habitatById.get(s.stop)!.narrationId);
    if (action.type === 'visitStop' && prev.stop !== s.stop) this.narrate(habitatById.get(s.stop)!.narrationId);
    if (action.type === 'selectOrganism' && action.id) {
      this.narrate(organismById.get(action.id)?.narrationId ?? spotterNarrationId(action.id));
    }

    if (stepChanged && s.mode !== null) this.focusKey('instruction');
    if (action.type === 'selectOrganism' && action.id) this.focusKey('card-title');
  }

  private narrate(id: string, force = false) {
    this.narrateSequence([id], force);
  }

  /** Plays narration clips one after another; any new narration replaces the queue. */
  private narrateSequence(ids: string[], force = false) {
    if (!force && (!this.prefs.autoNarrate || this.paused)) return;
    const [first, ...rest] = ids;
    this.narrationQueue = rest;
    if (first) this.playNarration(first);
  }

  private playNarration(id: string) {
    const seg = narrationById.get(id);
    if (seg) this.narrator.play(seg.id, seg.text);
  }

  private stopNarration() {
    this.narrationQueue = [];
    this.narrator.skip();
  }

  /** A tap on an animal in the scene: it always says hello; in the game it is also a guess. */
  private onTap(id: string) {
    this.scene3d?.react(id);
    if (this.state.mode === 'find') return this.findTap(id);
    this.returnFocus = null;
    this.dispatch({ type: 'selectOrganism', id });
  }

  // ── "Can you find…?" ───────────────────────────────────────────────────────

  private startFind() {
    this.paused = false;
    this.resumable = null;
    this.startAudio();
    this.dispatch({ type: 'startFind', order: findOrder() });
    const first = currentFindTarget(this.state);
    this.narrateSequence(['find-intro', ...(first ? [findNarrationId(first)] : [])]);
  }

  private findTap(id: string) {
    this.dispatch({ type: 'findTap', id });
    const tap = this.state.find.lastTap;
    if (tap?.correct) this.narrateSequence(['find-yes', spotterNarrationId(id)]);
    else this.narrate(spotterNarrationId(id));
  }

  private findNext() {
    this.scene3d?.hint(null);
    this.staticHint = null;
    this.dispatch({ type: 'findNext' });
    const next = currentFindTarget(this.state);
    if (next) this.narrate(findNarrationId(next));
    else this.narrateSequence(['find-done', 'find-remember']);
  }

  private findHint() {
    const target = currentFindTarget(this.state);
    if (!target) return;
    this.scene3d?.hint(target);
    this.staticHint = target;
    this.syncScene();
    window.setTimeout(() => {
      if (this.staticHint === target) {
        this.staticHint = null;
        this.syncScene();
      }
    }, 3300);
  }

  private startAudio() {
    if (this.prefs.ambienceVolume > 0) this.ambience.start();
    this.ambience.setVolume(this.prefs.ambienceVolume);
  }

  // ── Presentation (3D or static) ────────────────────────────────────────────

  private async startPresentation() {
    this.scene3d?.dispose();
    this.scene3d = null;
    this.staticScene?.dispose();
    this.staticScene = null;
    this.lastView = null;
    const stage = $('stage');
    stage.dataset.presentation = this.prefs.presentation;

    if (this.prefs.presentation === 'static') {
      this.useStatic();
      return;
    }
    if (!webglAvailable()) {
      this.fallbackToStatic('3D isn’t available in this browser. Showing illustrations — every activity still works.');
      return;
    }
    const loading = $('loading');
    loading.hidden = false;
    $('loading-actions').innerHTML = '';
    try {
      const scene = new ReefScene(stage, {
        quality: this.prefs.quality,
        ambientMotion: this.prefs.ambientMotion && !this.paused,
        instantCamera: this.prefs.instantCamera,
        onSelect: (id) => this.onTap(id),
        onProgress: (f, label) => {
          $('loading-label').textContent = label;
          $('loading-bar').style.width = `${Math.round(f * 100)}%`;
          loading.querySelector('[role=progressbar]')?.setAttribute('aria-valuenow', String(Math.round(f * 100)));
        },
        onContextLost: () => this.fallbackToStatic('The 3D view stopped working. Showing illustrations — your place in the lesson is kept.'),
      });
      this.scene3d = scene;
      this.bindCanvas(scene);
      await scene.build();
      loading.hidden = true;
      this.updateInsets();
      this.syncScene();
    } catch (err) {
      console.error(err);
      this.scene3d?.dispose();
      this.scene3d = null;
      $('loading-label').textContent = 'The 3D reef could not load.';
      $('loading-actions').innerHTML = btn('Try again', 'retry-3d', { cls: 'primary' }) + btn('Use illustrations', 'use-static', { cls: 'secondary' });
    }
  }

  private useStatic() {
    $('loading').hidden = true;
    this.staticScene = new StaticScene($('stage'), (id) => this.onTap(id));
    this.syncScene();
  }

  private fallbackToStatic(message: string) {
    this.scene3d?.dispose();
    this.scene3d = null;
    $('stage').dataset.presentation = 'static';
    if (!this.staticScene) this.useStatic();
    this.toast(message);
  }

  private bindCanvas(scene: ReefScene) {
    let down: { x: number; y: number } | null = null;
    scene.canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    scene.canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
      const id = scene.pick(e.clientX, e.clientY);
      if (id) this.onTap(id);
    });
    scene.canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') scene.setHover(scene.pick(e.clientX, e.clientY));
    });
    scene.canvas.addEventListener('pointerleave', () => scene.setHover(null));
  }

  /** Which view frames the current task. Pure function of lesson state. */
  private sceneTarget(): SceneTarget {
    const s = this.state;
    const at = (stop: HabitatId): SceneTarget => ({ view: stop, stop, shelter: null });
    if (s.mode === 'explore' || s.mode === 'find') return at(s.stop);
    if (s.mode !== 'lesson') return at('reef');
    switch (s.step) {
      case 'explore':
        return at(s.stop);
      case 'connect': {
        const rel = foodRelationshipById.get(connectItems[s.connectIndex].relationship);
        return at(organismById.get(rel?.consumer ?? '')?.habitat ?? 'reef');
      }
      case 'investigate':
        return { view: 'shelter', stop: 'reef', shelter: s.shelter.recorded ? s.shelter.view : 'before' };
      case 'explain': {
        const q = exitQuestions[s.exitIndex];
        if (q.kind === 'food-choice') {
          const rel = foodRelationshipById.get(q.item.relationship);
          return at(organismById.get(rel?.consumer ?? '')?.habitat ?? 'reef');
        }
        if (q.kind === 'shelter-reasoning') return { view: 'shelter', stop: 'reef', shelter: 'before' };
        const pick: Record<string, HabitatId> = { coral: 'reef', seagrass: 'seagrass', 'algae-sand': 'sand' };
        return at(pick[s.protect.choice ?? ''] ?? 'reef');
      }
      default:
        return at('reef');
    }
  }

  private syncScene() {
    const t = this.sceneTarget();
    if (this.scene3d) {
      if (t.view !== this.lastView) {
        this.scene3d.setViewpoint(t.view, this.lastView === null || this.prefs.instantCamera);
        this.lastView = t.view;
      }
      this.scene3d.setShelterView(t.shelter);
      this.scene3d.setSelected(this.state.selectedOrganism);
    }
    this.staticScene?.render({
      stop: t.stop,
      selected: this.state.selectedOrganism,
      shelterView: t.shelter,
      labels: this.state.mode !== 'find',
      hint: this.staticHint,
    });
    $('stage').setAttribute('data-stop', t.stop);
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  private renderAll() {
    this.renderTop();
    this.renderEntry();
    this.renderDock();
    this.renderCardPanel();
    this.renderCaptions();
  }

  /** Re-renders a region while keeping keyboard focus and open disclosures. */
  private patch(el: HTMLElement, html: string) {
    const active = document.activeElement as HTMLElement | null;
    const key = el.contains(active) ? active?.dataset.key : undefined;
    const open = new Set([...el.querySelectorAll<HTMLDetailsElement>('details[open]')].map((d) => d.dataset.key));
    el.innerHTML = html;
    el.querySelectorAll<HTMLDetailsElement>('details').forEach((d) => {
      if (open.has(d.dataset.key)) d.open = true;
    });
    if (key) {
      const target = el.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
      if (target && !(target as HTMLButtonElement).disabled) target.focus();
      else el.querySelector<HTMLElement>('[data-key="instruction"], h2')?.focus();
    }
  }

  private renderTop() {
    const s = this.state;
    const parts: string[] = [];
    if (s.mode === 'lesson') {
      const i = steps.findIndex((x) => x.id === s.step);
      parts.push(`<span class="step-indicator">Step ${i + 1} of ${steps.length}: ${esc(steps[i].label)}</span>`);
      parts.push(btn('Return to lesson', 'return', { cls: 'top-btn', icon: '↩' }));
    } else if (s.mode === 'explore') {
      parts.push('<span class="step-indicator">Explore mode</span>');
    } else if (s.mode === 'find') {
      parts.push('<span class="step-indicator">Can you find…?</span>');
    }
    if (s.mode !== null) parts.push(btn('Home', 'home', { cls: 'top-btn', icon: '⌂' }));
    parts.push(btn('Teacher guide', 'guide', { cls: 'top-btn', icon: '📘' }));
    parts.push(btn('Transcript', 'transcript', { cls: 'top-btn', icon: '☰' }));
    parts.push(btn('Settings', 'settings', { cls: 'top-btn', icon: '⚙' }));
    if (document.fullscreenEnabled) {
      parts.push(btn(document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen', 'fullscreen', { cls: 'top-btn', icon: '⛶' }));
    }
    this.patch($('top-actions'), parts.join(''));
  }

  private renderEntry() {
    const entry = $('entry');
    entry.hidden = this.state.mode !== null;
    if (entry.hidden) return;
    const r = this.resumable;
    const resumeLabel = !r
      ? ''
      : r.mode === 'lesson'
        ? `Resume lesson (step ${steps.findIndex((x) => x.id === r.step) + 1}: ${stepById.get(r.step)!.label})`
        : r.mode === 'find'
          ? 'Resume Can you find…?'
          : 'Resume exploring';
    const draft = organisms.some((o) => o.review.status !== 'reviewed');
    this.patch(
      entry,
      `<div class="entry-box">
        <p class="eyebrow">${esc(PRODUCT_NAME)} · Expedition 1</p>
        <h1 id="entry-title">${esc(LESSON_TITLE)}</h1>
        <p class="question">${esc(GUIDING_QUESTION)}</p>
        <p>${esc(OBJECTIVE)}</p>
        <div class="row entry-actions">
          ${btn('Start lesson', 'start', { arg: 'lesson', cls: 'primary big', key: 'entry-start', icon: '▶' })}
          ${btn('Explore', 'start', { arg: 'explore', cls: 'secondary big', key: 'entry-explore' })}
          ${btn('Can you find…?', 'find', { cls: 'secondary big', key: 'entry-find', icon: '🔍' })}
          ${r ? btn(resumeLabel, 'resume', { cls: 'secondary big', key: 'entry-resume' }) : ''}
        </div>
        <p class="small muted">Sound starts only after you choose. Captions are on. About 10 minutes, teacher-led.</p>
        <p class="small muted">${esc(COMPOSITE_NOTICE)}${draft ? ' Draft content — scientific review pending.' : ''}</p>
      </div>`,
    );
  }

  /** Tells the scene how much of the screen the lesson panel covers. */
  private updateInsets() {
    const dock = $('dock');
    let right = 0;
    let bottom = 0;
    if (!dock.hidden) {
      const r = dock.getBoundingClientRect();
      const side = r.width < window.innerWidth * 0.7;
      if (side) right = window.innerWidth - r.left;
      else bottom = window.innerHeight - r.top;
    }
    document.documentElement.style.setProperty('--inset-right', `${right}px`);
    document.documentElement.style.setProperty('--inset-bottom', `${bottom}px`);
    this.scene3d?.setInsets(right, bottom);
  }

  private renderDock() {
    const dock = $('dock');
    dock.hidden = this.state.mode === null;
    if (dock.hidden) return this.updateInsets();
    const ctx = { videos: this.videos };
    dock.dataset.mode = this.state.mode ?? '';
    dock.dataset.step = this.state.step;
    const mode = this.state.mode;
    this.patch(
      dock,
      mode === 'lesson' ? renderLessonDock(this.state, ctx, this.paused) : mode === 'find' ? renderFindDock(this.state) : renderExploreDock(this.state),
    );
    this.updateInsets();
  }

  private renderCardPanel() {
    const card = $('card');
    const id = this.state.selectedOrganism;
    // In the game, the dock celebrates the find, so no card covers it.
    card.hidden = !id || this.state.mode === null || this.state.mode === 'find';
    if (!card.hidden && id) this.patch(card, renderCard(id));
  }

  private renderCaptions() {
    const bar = $('caption-bar');
    const active = this.narrationState !== 'idle';
    bar.hidden = this.state.mode === null || !active;
    $('caption').textContent = this.prefs.captions && active ? (this.caption ?? '') : '';
    $('caption').hidden = !this.prefs.captions;
    const playing = this.narrationState === 'playing';
    const voice = this.narrator.voiceAvailable;
    this.patch(
      $('caption-controls'),
      [
        btn(playing ? 'Pause narration' : 'Play narration', 'narr-toggle', { cls: 'small-btn', icon: playing ? '❚❚' : '▶' }),
        btn('Skip', 'narr-skip', { cls: 'small-btn', icon: '⏭' }),
        voice ? btn(this.muted ? 'Unmute voice' : 'Mute voice', 'narr-mute', { cls: 'small-btn', pressed: this.muted }) : '<span class="small muted">Captions only — no voice in this browser</span>',
      ].join(''),
    );
  }

  /** Rendering is synchronous, so focus moves immediately — a fast keypress never lands on a stale element. */
  private focusKey(key: string) {
    document.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus();
  }

  private toast(message: string) {
    const n = $('notice');
    n.textContent = message;
    n.hidden = false;
    window.clearTimeout(Number(n.dataset.timer));
    n.dataset.timer = String(window.setTimeout(() => (n.hidden = true), 7000));
  }

  // ── Settings, guide, transcript, confirm ───────────────────────────────────

  private applyPrefs() {
    const p = this.prefs;
    document.documentElement.style.setProperty('--text-scale', String(p.textScale));
    document.documentElement.dataset.motion = p.ambientMotion ? 'on' : 'off';
    this.narrator.setVolume(p.voiceVolume);
    this.ambience.setVolume(p.ambienceVolume);
    this.scene3d?.setAmbientMotion(p.ambientMotion && !this.paused);
    this.scene3d?.setInstantCamera(p.instantCamera);
    $('perf').hidden = !p.showPerformance;
    window.clearInterval(this.perfTimer);
    if (p.showPerformance) {
      this.perfTimer = window.setInterval(() => {
        const fps = this.scene3d ? `${this.scene3d.fps.toFixed(0)} FPS` : 'static';
        $('perf').textContent = `${fps} · ${p.quality} · ${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`;
      }, 500);
    }
    savePreferences(p);
  }

  private settingsMarkup() {
    const p = this.prefs;
    const toggle = (label: string, key: keyof Preferences, help = '') =>
      `<div class="setting"><span>${esc(label)}${help ? `<span class="small muted"> ${esc(help)}</span>` : ''}</span>${btn(p[key] ? 'On' : 'Off', 'pref-toggle', { arg: key, cls: 'switch', pressed: !!p[key], aria: label })}</div>`;
    const choice = (label: string, key: 'quality' | 'presentation', options: [string, string][]) =>
      `<div class="setting"><span>${esc(label)}</span><div class="segmented" role="group" aria-label="${esc(label)}">${options
        .map(([v, l]) => btn(l, 'pref-choice', { arg: `${key}|${v}`, cls: `seg${p[key] === v ? ' is-current' : ''}`, pressed: p[key] === v }))
        .join('')}</div></div>`;
    const slider = (label: string, key: 'voiceVolume' | 'ambienceVolume') =>
      `<label class="setting"><span>${esc(label)}</span><input type="range" min="0" max="1" step="0.05" value="${p[key]}" data-input="${key}" data-key="${key}"></label>`;
    return `<div class="dialog-head"><h2 id="settings-title">Settings</h2>${btn('Close', 'close-dialog', { arg: 'settings', cls: 'icon-btn', icon: '✕', aria: 'Close settings' })}</div>
      <div class="setting"><span>Text size</span><div class="row tight">
        ${btn('Smaller', 'text-size', { arg: '-', cls: 'secondary', aria: 'Smaller text' })}
        <span class="value" aria-live="polite">${Math.round(p.textScale * 100)}%</span>
        ${btn('Larger', 'text-size', { arg: '+', cls: 'secondary', aria: 'Larger text' })}</div></div>
      ${choice('Presentation', 'presentation', [['3d', '3D reef'], ['static', 'Illustrations']])}
      ${choice('3D quality', 'quality', [['high', 'High'], ['low', 'Low']])}
      ${toggle('Ambient motion', 'ambientMotion', 'Swaying seagrass, swimming fish, light')}
      ${toggle('Instant camera moves', 'instantCamera')}
      ${toggle('Captions', 'captions')}
      ${toggle('Read aloud automatically', 'autoNarrate')}
      ${slider('Voice volume', 'voiceVolume')}
      ${slider('Ambience volume', 'ambienceVolume')}
      ${toggle('Show performance', 'showPerformance', 'For the technical rehearsal')}
      <div class="setting"><span>Lesson</span><div class="row tight">
        ${btn('Restart lesson', 'restart', { cls: 'secondary' })}
        ${btn('Clear session', 'clear-session', { cls: 'secondary danger' })}</div></div>
      <p class="small muted">Clear session removes saved progress and settings from this computer. Nothing is stored anywhere else.</p>
      <h3>Keyboard</h3>
      <table class="shortcuts"><tbody>${SHORTCUTS.map(([k, a]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(a)}</td></tr>`).join('')}</tbody></table>`;
  }

  private openDialog(id: 'settings' | 'transcript') {
    const d = $<HTMLDialogElement>(id);
    if (id === 'settings') d.innerHTML = this.settingsMarkup();
    else
      d.innerHTML = `<div class="dialog-head"><h2 id="transcript-title">Transcript</h2>${btn('Close', 'close-dialog', { arg: 'transcript', cls: 'icon-btn', icon: '✕', aria: 'Close transcript' })}</div>${renderTranscript(this.videos.map((v) => v.id))}`;
    this.returnFocus = document.activeElement as HTMLElement;
    if (!d.open) d.showModal();
  }

  private refreshSettings() {
    const d = $<HTMLDialogElement>('settings');
    if (d.open) this.patch(d, this.settingsMarkup());
  }

  private confirm(title: string, message: string, label: string, onYes: () => void) {
    const d = $<HTMLDialogElement>('confirm');
    d.innerHTML = `<h2 id="confirm-title">${esc(title)}</h2><p>${esc(message)}</p>
      <div class="row">${btn(label, 'confirm-yes', { cls: 'primary danger' })}${btn('Cancel', 'close-dialog', { arg: 'confirm', cls: 'secondary' })}</div>`;
    this.pendingConfirm = onYes;
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>('[data-action="close-dialog"]')?.focus();
  }
  private pendingConfirm: (() => void) | null = null;

  private guideMarkup() {
    return `<div class="guide-toolbar"><a class="btn secondary" href="#record"><span class="btn-icon" aria-hidden="true">●</span><span>Record narration</span></a>${btn('Print guide', 'print-guide', { cls: 'secondary', icon: '⎙' })}${btn('Close guide', 'close-guide', { cls: 'primary', icon: '✕' })}</div>${renderGuide(this.videos.map((v) => v.id))}`;
  }

  private openGuide() {
    this.returnFocus = document.activeElement as HTMLElement;
    const g = $('guide');
    g.innerHTML = this.guideMarkup();
    g.hidden = false;
    document.body.classList.add('guide-open');
    // The lesson behind an open overlay can't be reached by keyboard or screen reader.
    $('app').inert = true;
    g.querySelector<HTMLElement>('[data-action="close-guide"]')?.focus();
  }

  private closeGuide() {
    $('guide').hidden = true;
    document.body.classList.remove('guide-open');
    $('app').inert = false;
    if (location.hash === '#guide') history.replaceState(null, '', location.pathname + location.search);
    this.returnFocus?.focus();
  }

  // ── Video ──────────────────────────────────────────────────────────────────

  private async detectVideos() {
    const found: VideoSegment[] = [];
    await Promise.all(
      videoSegments.map(async (v) => {
        try {
          const res = await fetch(new URL(v.src, document.baseURI), { method: 'HEAD' });
          if (res.ok && (res.headers.get('content-type') ?? '').startsWith('video/')) found.push(v);
        } catch {
          // Missing optional media never blocks the lesson.
        }
      }),
    );
    this.videos = videoSegments.filter((v) => found.includes(v));
    if (this.videos.length) {
      this.renderDock();
      $('guide').innerHTML = this.guideMarkup();
    }
  }

  private openVideo(id: string) {
    const v = this.videos.find((x) => x.id === id);
    if (!v) return;
    this.stopNarration();
    const panel = $('video-panel');
    panel.innerHTML = `<div class="dialog-head"><h2 class="h-small">${esc(v.title)}</h2>${btn('Close video', 'close-video', { cls: 'icon-btn', icon: '✕', aria: 'Close video' })}</div>
      <video controls autoplay playsinline preload="metadata" src="${esc(v.src)}">
        <track kind="captions" srclang="en" label="English" src="${esc(v.captions)}" default>
      </video>
      <details><summary>Text version</summary><p>${esc(v.transcript)}</p></details>`;
    panel.hidden = false;
    panel.querySelector('video')?.addEventListener('error', () => {
      panel.querySelector('video')?.remove();
      panel.insertAdjacentHTML('beforeend', `<p>The video couldn’t play. Here is the text version:</p><p>${esc(v.transcript)}</p>`);
    });
  }

  private closeVideo() {
    const panel = $('video-panel');
    panel.querySelector('video')?.pause();
    panel.hidden = true;
    panel.innerHTML = '';
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private bindEvents() {
    document.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!el || (el as HTMLButtonElement).disabled) return;
      this.handleAction(el.dataset.action!, el.dataset.arg, el);
    });

    document.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement;
      switch (el.dataset.input) {
        case 'baseline':
          // Update state without re-rendering so typing is never interrupted.
          this.state = reduce(this.state, { type: 'setBaseline', text: el.value });
          saveSession(this.state);
          break;
        case 'voiceVolume':
        case 'ambienceVolume': {
          const key = el.dataset.input as 'voiceVolume' | 'ambienceVolume';
          this.prefs[key] = Number(el.value);
          if (key === 'ambienceVolume' && this.state.mode !== null) this.startAudio();
          this.applyPrefs();
          break;
        }
      }
    });

    document.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('fullscreenchange', () => this.renderTop());
    for (const id of ['settings', 'transcript', 'confirm']) {
      $<HTMLDialogElement>(id).addEventListener('close', () => {
        if (id !== 'confirm') this.returnFocus?.focus();
      });
    }
    window.addEventListener('hashchange', () => {
      if (location.hash === '#guide') this.openGuide();
      if (location.hash === '#record') void this.openRecorder();
    });
  }

  private onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.recorder?.isOpen) return this.recorder.close();
      if (!$('guide').hidden) return this.closeGuide();
      if (!$('video-panel').hidden) return this.closeVideo();
      if (this.state.selectedOrganism) {
        e.preventDefault();
        return this.closeCard();
      }
      return;
    }
    const target = e.target as HTMLElement;
    const typing = target.closest('input, textarea, select, [contenteditable]');
    const modalOpen = document.querySelector('dialog[open]') || !$('guide').hidden || !$('recorder').hidden;
    if (typing || modalOpen || e.ctrlKey || e.metaKey || e.altKey) return;
    if (this.state.mode !== 'lesson') return;
    const key = e.key.toLowerCase();
    if (key === 'n' || e.key === 'PageDown') {
      e.preventDefault();
      this.dispatch({ type: 'next' });
    } else if (key === 'b' || e.key === 'PageUp') {
      e.preventDefault();
      this.dispatch({ type: 'back' });
    } else if (key === 'p') {
      this.togglePause();
    } else if (key === 'r') {
      this.narrate(stepById.get(this.state.step)!.narrationId, true);
    }
  }

  private closeCard() {
    this.dispatch({ type: 'selectOrganism', id: null });
    const back = this.returnFocus;
    this.returnFocus = null;
    if (back && document.contains(back)) back.focus();
    else this.focusKey('instruction');
  }

  private togglePause() {
    this.paused = !this.paused;
    if (this.paused) {
      this.narrator.pause();
      this.ambience.suspend();
    } else {
      this.narrator.resume();
      if (this.state.mode !== null) this.startAudio();
    }
    this.scene3d?.setAmbientMotion(this.prefs.ambientMotion && !this.paused);
    this.renderDock();
  }

  private handleAction(action: string, arg: string | undefined, el: HTMLElement) {
    const [a, b] = (arg ?? '').split('|');
    switch (action) {
      case 'start':
        this.paused = false;
        this.resumable = null;
        return this.dispatch({ type: 'start', mode: a as Mode });
      case 'resume': {
        if (!this.resumable) return;
        const prev = this.state;
        this.state = { ...this.resumable, selectedOrganism: null };
        this.resumable = null;
        this.startAudio();
        return this.afterChange(prev, { type: 'goto', step: this.state.step });
      }
      case 'home':
        this.stopNarration();
        this.resumable = this.state;
        return this.dispatch({ type: 'exit' });
      case 'stop':
        return this.dispatch({ type: 'visitStop', stop: a as HabitatId });
      case 'select':
        this.returnFocus = el;
        this.scene3d?.react(a);
        return this.dispatch({ type: 'selectOrganism', id: a });
      case 'find':
        return this.startFind();
      case 'find-pick':
        this.scene3d?.react(a);
        return this.findTap(a);
      case 'find-next':
        this.findNext();
        return this.focusKey('instruction');
      case 'find-again': {
        const target = currentFindTarget(this.state);
        return target ? this.narrate(findNarrationId(target), true) : undefined;
      }
      case 'find-hint':
        return this.findHint();
      case 'close-card':
        return this.closeCard();
      case 'return':
        // Closing the card also returns the camera from its close-up to the task's view.
        this.dispatch({ type: 'selectOrganism', id: null });
        return this.focusKey('instruction');
      case 'listen':
        return this.narrate(organismById.get(a)?.narrationId ?? spotterNarrationId(a), true);
      case 'baseline-shared':
        return this.dispatch({ type: 'markBaselineShared' });
      case 'choose':
        return this.dispatch({ type: 'chooseOption', item: a, option: b });
      case 'submit':
        this.dispatch({ type: 'submitChoice', item: a });
        return this.focusKey(`feedback:${a}`);
      case 'retry':
        this.dispatch({ type: 'retryChoice', item: a });
        return this.focusKey(`options:${a}`);
      case 'connect-item':
        this.dispatch({ type: 'setConnectIndex', index: Number(a) });
        return this.focusKey('instruction');
      case 'exit-item':
        this.dispatch({ type: 'setExitIndex', index: Number(a) });
        return this.focusKey('instruction');
      case 'predict':
        return this.dispatch({ type: 'choosePrediction', option: a });
      case 'record-prediction':
        return this.dispatch({ type: 'recordPrediction' });
      case 'shelter-view':
        return this.dispatch({ type: 'setShelterView', view: a as 'before' | 'after' });
      case 'protect':
        return this.dispatch({ type: 'chooseProtect', choice: a });
      case 'score':
        return this.dispatch({ type: 'scoreProtect', score: this.state.protect.score === Number(a) ? null : Number(a) });
      case 'protect-discussed':
        return this.dispatch({ type: 'markProtectDiscussed' });
      case 'goto':
        return this.dispatch({ type: 'goto', step: a as StepId });
      case 'next':
        return this.dispatch({ type: 'next' });
      case 'back':
        return this.dispatch({ type: 'back' });
      case 'pause':
        return this.togglePause();
      case 'replay':
        return this.narrate(stepById.get(this.state.step)!.narrationId, true);
      case 'restart':
        return this.confirm('Restart the lesson?', 'This clears all answers and progress for this lesson.', 'Restart', () => {
          $<HTMLDialogElement>('settings').close();
          this.paused = false;
          this.dispatch({ type: 'restart' });
        });
      case 'clear-session':
        return this.confirm('Clear this session?', 'This removes saved progress and settings from this computer.', 'Clear session', () => {
          clearAll();
          this.prefs = loadPreferences(this.reducedMotion);
          this.resumable = null;
          this.stopNarration();
          const prev = this.state;
          this.state = initialState();
          this.applyPrefs();
          $<HTMLDialogElement>('settings').close();
          this.afterChange(prev, { type: 'exit' });
          void this.startPresentation();
          this.toast('Session cleared.');
        });
      case 'confirm-yes': {
        const fn = this.pendingConfirm;
        this.pendingConfirm = null;
        $<HTMLDialogElement>('confirm').close();
        return fn?.();
      }
      case 'close-dialog':
        return $<HTMLDialogElement>(a).close();
      case 'video':
        return this.openVideo(a);
      case 'close-video':
        return this.closeVideo();
      case 'guide':
        return this.openGuide();
      case 'close-guide':
        return this.closeGuide();
      case 'print-guide':
        return window.print();
      case 'transcript':
        return this.openDialog('transcript');
      case 'settings':
        return this.openDialog('settings');
      case 'fullscreen':
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.().catch(() => this.toast('Fullscreen isn’t available here.'));
        return;
      case 'text-size':
        this.prefs.textScale = Math.round(Math.min(1.5, Math.max(0.75, this.prefs.textScale + (a === '+' ? 0.1 : -0.1))) * 100) / 100;
        this.applyPrefs();
        return this.refreshSettings();
      case 'pref-toggle': {
        const key = a as 'ambientMotion' | 'instantCamera' | 'captions' | 'autoNarrate' | 'showPerformance';
        this.prefs[key] = !this.prefs[key];
        this.applyPrefs();
        if (key === 'captions') this.renderCaptions();
        if (key === 'autoNarrate' && !this.prefs.autoNarrate) this.stopNarration();
        return this.refreshSettings();
      }
      case 'pref-choice': {
        if (a === 'quality') {
          this.prefs.quality = b as 'high' | 'low';
          this.scene3d?.setQuality(this.prefs.quality);
        } else if (a === 'presentation' && this.prefs.presentation !== b) {
          this.prefs.presentation = b as '3d' | 'static';
          void this.startPresentation();
        }
        this.applyPrefs();
        return this.refreshSettings();
      }
      case 'retry-3d':
        return void this.startPresentation();
      case 'use-static':
        this.prefs.presentation = 'static';
        this.applyPrefs();
        return void this.startPresentation();
      case 'narr-toggle':
        if (this.narrationState === 'playing') this.narrator.pause();
        else if (this.narrationState === 'paused') this.narrator.resume();
        else this.narrator.replay();
        return;
      case 'narr-skip':
        return this.stopNarration();
      case 'narr-mute':
        this.muted = !this.muted;
        this.narrator.setMuted(this.muted);
        return this.renderCaptions();
    }
  }
}
