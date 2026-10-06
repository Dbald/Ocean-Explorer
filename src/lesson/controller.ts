/**
 * Lesson controller: explicit, serializable lesson state and a pure reducer.
 * No DOM or rendering here, so the same controller can drive the 3D scene,
 * the static presentation and a later VR release.
 */
import { connectItems, exitQuestions, shelterPrediction, stepIds } from '../content/lesson.ts';
import { organisms } from '../content/organisms.ts';
import type { FoodChoiceItem, HabitatId, StepId } from '../content/types.ts';

export type Mode = 'lesson' | 'explore';
export type ActivityStatus = 'completed' | 'attempted' | 'skipped';

export interface ChoiceState {
  selected: string | null;
  submitted: boolean;
  correct: boolean;
  tries: number;
}

export interface LessonState {
  version: 1;
  /** null until the user leaves the entry screen. */
  mode: Mode | null;
  step: StepId;
  stop: HabitatId;
  selectedOrganism: string | null;
  discovered: string[];
  visitedStops: HabitatId[];
  baselineNote: string;
  baselineShared: boolean;
  connectIndex: number;
  exitIndex: number;
  choices: Record<string, ChoiceState>;
  shelter: { selected: string | null; recorded: boolean; view: 'before' | 'after'; comparedAfter: boolean };
  protect: { choice: string | null; score: number | null; discussed: boolean };
}

export type Action =
  | { type: 'start'; mode: Mode }
  | { type: 'exit' }
  | { type: 'restart' }
  | { type: 'goto'; step: StepId }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'visitStop'; stop: HabitatId }
  | { type: 'selectOrganism'; id: string | null }
  | { type: 'setBaseline'; text: string }
  | { type: 'markBaselineShared' }
  | { type: 'chooseOption'; item: string; option: string }
  | { type: 'submitChoice'; item: string }
  | { type: 'retryChoice'; item: string }
  | { type: 'setConnectIndex'; index: number }
  | { type: 'setExitIndex'; index: number }
  | { type: 'choosePrediction'; option: string }
  | { type: 'recordPrediction' }
  | { type: 'setShelterView'; view: 'before' | 'after' }
  | { type: 'chooseProtect'; choice: string }
  | { type: 'scoreProtect'; score: number | null }
  | { type: 'markProtectDiscussed' };

export const FEATURED_COUNT = organisms.length;

export function initialState(): LessonState {
  return {
    version: 1,
    mode: null,
    step: 'briefing',
    stop: 'reef',
    selectedOrganism: null,
    discovered: [],
    visitedStops: [],
    baselineNote: '',
    baselineShared: false,
    connectIndex: 0,
    exitIndex: 0,
    choices: {},
    shelter: { selected: null, recorded: false, view: 'before', comparedAfter: false },
    protect: { choice: null, score: null, discussed: false },
  };
}

const emptyChoice: ChoiceState = { selected: null, submitted: false, correct: false, tries: 0 };

/** All auto-checked choice items, keyed by item id. */
const choiceItems = new Map<string, FoodChoiceItem>([
  ...connectItems.map((i) => [i.id, i] as const),
  ...exitQuestions.flatMap((q) => (q.kind === 'food-choice' ? [[q.item.id, q.item] as const] : [])),
]);

/** The shelter-reasoning exit question accepts any plausible, qualified answer. */
const shelterQuestion = exitQuestions.find((q) => q.kind === 'shelter-reasoning');
export const SHELTER_EXIT_ID = shelterQuestion?.id ?? 'exit-shelter';

function isCorrect(item: string, option: string): boolean {
  const choiceItem = choiceItems.get(item);
  if (choiceItem) return choiceItem.options.find((o) => o.id === option)?.correct ?? false;
  if (shelterQuestion?.kind === 'shelter-reasoning' && item === shelterQuestion.id) {
    return shelterQuestion.options.find((o) => o.id === option)?.plausible ?? false;
  }
  return false;
}

export function choice(state: LessonState, item: string): ChoiceState {
  return state.choices[item] ?? emptyChoice;
}

function withStop(state: LessonState, stop: HabitatId): LessonState {
  const visitedStops = state.visitedStops.includes(stop) ? state.visitedStops : [...state.visitedStops, stop];
  return { ...state, stop, visitedStops, selectedOrganism: null };
}

/** The stop shown when a step opens, so the scene always frames the current task. */
const stepStop: Partial<Record<StepId, HabitatId>> = {
  briefing: 'reef',
  investigate: 'reef',
};

function gotoStep(state: LessonState, step: StepId): LessonState {
  const next = { ...state, step, selectedOrganism: null };
  const stop = stepStop[step];
  return stop ? withStop(next, stop) : next;
}

export function reduce(state: LessonState, action: Action): LessonState {
  switch (action.type) {
    case 'start':
      // Explore keeps nothing from a lesson; a lesson always starts from a known state.
      return action.mode === 'lesson'
        ? { ...initialState(), mode: 'lesson', visitedStops: ['reef'] }
        : { ...initialState(), mode: 'explore', visitedStops: ['reef'] };
    case 'exit':
      return { ...state, mode: null, selectedOrganism: null };
    case 'restart':
      return { ...initialState(), mode: state.mode ?? 'lesson', visitedStops: ['reef'] };
    case 'goto':
      return gotoStep(state, action.step);
    case 'next': {
      const i = stepIds.indexOf(state.step);
      return i < stepIds.length - 1 ? gotoStep(state, stepIds[i + 1]) : state;
    }
    case 'back': {
      const i = stepIds.indexOf(state.step);
      return i > 0 ? gotoStep(state, stepIds[i - 1]) : state;
    }
    case 'visitStop':
      return withStop(state, action.stop);
    case 'selectOrganism': {
      if (action.id === null) return { ...state, selectedOrganism: null };
      const discovered = state.discovered.includes(action.id) ? state.discovered : [...state.discovered, action.id];
      return { ...state, selectedOrganism: action.id, discovered };
    }
    case 'setBaseline':
      return { ...state, baselineNote: action.text.slice(0, 280) };
    case 'markBaselineShared':
      return { ...state, baselineShared: true };
    case 'chooseOption': {
      const current = choice(state, action.item);
      if (current.submitted) return state;
      return { ...state, choices: { ...state.choices, [action.item]: { ...current, selected: action.option } } };
    }
    case 'submitChoice': {
      const current = choice(state, action.item);
      if (current.submitted || current.selected === null) return state;
      const correct = isCorrect(action.item, current.selected);
      return {
        ...state,
        choices: { ...state.choices, [action.item]: { ...current, submitted: true, correct, tries: current.tries + 1 } },
      };
    }
    case 'retryChoice': {
      const current = choice(state, action.item);
      return { ...state, choices: { ...state.choices, [action.item]: { ...current, selected: null, submitted: false, correct: false } } };
    }
    case 'setConnectIndex':
      return { ...state, connectIndex: clamp(action.index, 0, connectItems.length - 1) };
    case 'setExitIndex':
      return { ...state, exitIndex: clamp(action.index, 0, exitQuestions.length - 1) };
    case 'choosePrediction':
      if (state.shelter.recorded) return state;
      return { ...state, shelter: { ...state.shelter, selected: action.option } };
    case 'recordPrediction':
      if (state.shelter.selected === null) return state;
      return { ...withStop(state, 'reef'), shelter: { ...state.shelter, recorded: true } };
    case 'setShelterView':
      // The comparison is reversible, but only revealed after a recorded prediction.
      if (!state.shelter.recorded) return state;
      return {
        ...state,
        shelter: { ...state.shelter, view: action.view, comparedAfter: state.shelter.comparedAfter || action.view === 'after' },
      };
    case 'chooseProtect':
      return { ...state, protect: { ...state.protect, choice: action.choice } };
    case 'scoreProtect':
      return { ...state, protect: { ...state.protect, score: action.score } };
    case 'markProtectDiscussed':
      if (state.protect.choice === null) return state;
      return { ...state, protect: { ...state.protect, discussed: true } };
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export interface ActivitySummary {
  id: string;
  label: string;
  status: ActivityStatus;
}

function choiceStatus(state: LessonState, item: string): ActivityStatus {
  const c = choice(state, item);
  if (c.submitted && c.correct) return 'completed';
  return c.tries > 0 || c.selected !== null ? 'attempted' : 'skipped';
}

/**
 * Completion recap. Skipped means not attempted — moving past an activity
 * never marks it as completed.
 */
export function activitySummary(state: LessonState): ActivitySummary[] {
  const shelterStatus: ActivityStatus =
    state.shelter.recorded && state.shelter.comparedAfter
      ? 'completed'
      : state.shelter.selected !== null
        ? 'attempted'
        : 'skipped';
  const protectStatus: ActivityStatus =
    state.protect.choice !== null && (state.protect.discussed || state.protect.score !== null)
      ? 'completed'
      : state.protect.choice !== null
        ? 'attempted'
        : 'skipped';
  const exploreStatus: ActivityStatus =
    state.discovered.length >= FEATURED_COUNT ? 'completed' : state.discovered.length > 0 ? 'attempted' : 'skipped';

  return [
    {
      id: 'baseline',
      label: 'Briefing: first idea',
      status: state.baselineShared || state.baselineNote.trim() ? 'completed' : 'skipped',
    },
    { id: 'explore', label: `Explore: ${state.discovered.length} of ${FEATURED_COUNT} organisms observed`, status: exploreStatus },
    ...connectItems.map((item, i) => ({
      id: item.id,
      label: `Connect: food relationship ${i + 1}`,
      status: choiceStatus(state, item.id),
    })),
    { id: 'shelter', label: 'Investigate: shelter prediction and comparison', status: shelterStatus },
    ...exitQuestions.map((q, i) => ({
      id: q.id,
      label: `Explain: question ${i + 1} — ${q.title.toLowerCase()}`,
      status: q.kind === 'food-choice' ? choiceStatus(state, q.item.id) : q.kind === 'shelter-reasoning' ? choiceStatus(state, q.id) : protectStatus,
    })),
  ];
}

export function stepIndex(step: StepId): number {
  return stepIds.indexOf(step);
}

export function predictionLabel(state: LessonState): string | null {
  return shelterPrediction.options.find((o) => o.id === state.shelter.selected)?.label ?? null;
}

/** Restores a persisted state, falling back to a clean one if it doesn't fit the current shape. */
export function hydrate(raw: unknown): LessonState {
  const base = initialState();
  if (!raw || typeof raw !== 'object' || (raw as { version?: unknown }).version !== 1) return base;
  const r = raw as Partial<LessonState>;
  const merged: LessonState = {
    ...base,
    ...r,
    shelter: { ...base.shelter, ...(r.shelter ?? {}) },
    protect: { ...base.protect, ...(r.protect ?? {}) },
    choices: { ...(r.choices ?? {}) },
    selectedOrganism: null,
  };
  if (!stepIds.includes(merged.step)) merged.step = 'briefing';
  if (!['reef', 'seagrass', 'sand'].includes(merged.stop)) merged.stop = 'reef';
  return merged;
}
