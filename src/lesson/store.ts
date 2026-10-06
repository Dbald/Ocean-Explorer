/**
 * Local session storage. Stores only non-identifying lesson progress and
 * display preferences on this device — no names, accounts or analytics.
 * Every access is guarded: storage can be unavailable (private windows,
 * blocked site data), and the lesson must still work without it.
 */
import { hydrate, type LessonState } from './controller.ts';

const SESSION_KEY = 'ocean-explorer:session:v1';
const PREFS_KEY = 'ocean-explorer:prefs:v1';

export interface Preferences {
  textScale: number;
  quality: 'high' | 'low';
  presentation: '3d' | 'static';
  ambientMotion: boolean;
  instantCamera: boolean;
  captions: boolean;
  autoNarrate: boolean;
  voiceVolume: number;
  ambienceVolume: number;
  showPerformance: boolean;
}

export function defaultPreferences(reducedMotion: boolean): Preferences {
  return {
    textScale: 1,
    quality: 'high',
    presentation: '3d',
    ambientMotion: !reducedMotion,
    instantCamera: reducedMotion,
    captions: true,
    autoNarrate: true,
    voiceVolume: 0.9,
    ambienceVolume: 0.35,
    showPerformance: false,
  };
}

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — the session simply won't survive a refresh.
  }
}

export function loadSession(): LessonState {
  return hydrate(read(SESSION_KEY));
}

export function saveSession(state: LessonState) {
  write(SESSION_KEY, state);
}

export function loadPreferences(reducedMotion: boolean): Preferences {
  const base = defaultPreferences(reducedMotion);
  const stored = read(PREFS_KEY);
  if (!stored || typeof stored !== 'object') return base;
  const merged = { ...base, ...(stored as Partial<Preferences>) };
  merged.textScale = Math.min(1.5, Math.max(0.75, Number(merged.textScale) || 1));
  return merged;
}

export function savePreferences(prefs: Preferences) {
  write(PREFS_KEY, prefs);
}

/** Clear session: removes all stored progress and preferences from this device. */
export function clearAll() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(PREFS_KEY);
  } catch {
    // Nothing stored or storage unavailable.
  }
}
