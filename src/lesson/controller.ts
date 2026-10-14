/**
 * Lesson controller: explicit, serializable lesson state and a pure reducer.
 * No DOM or rendering here, so the same controller can drive the 3D scene,
 * the static presentation and a later VR release.
 */
import { connectItems, exitQuestions, shelterPrediction, stepIds } from '../content/lesson.ts';
import { changingActions, changingChoiceItems, causes, litter, stepsFor, type CauseId, type ChangingLevel } from '../content/changing.ts';
import { findableById } from '../content/findables.ts';
import { organismById, organisms } from '../content/organisms.ts';
import type { FoodChoiceItem, HabitatId, StepId } from '../content/types.ts';

export type Mode = 'lesson' | 'explore' | 'find' | 'changing';
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
  /** "Can you find…?" game: targets in play order, the current one, and what was found. */
  find: FindState;
  /** Expedition 2: The Changing Reef. */
  changing: ChangingState;
}

export interface ChangingState {
  level: ChangingLevel;
  step: number;
  /** Which belt snapshot is shown, and which have been viewed. */
  belt: number;
  beltSeen: number[];
  causes: Record<CauseId, boolean>;
  prediction: string | null;
  revealed: boolean;
  /** Reef view with too much sargassum. */
  sargassum: boolean;
  sargassumSeen: boolean;
  cleaned: string[];
  exitIndex: number;
  action: string | null;
  actionScore: number | null;
  actionDiscussed: boolean;
  helpers: string[];
}

export interface FindState {
  order: string[];
  index: number;
  found: string[];
  /** The most recent tap: the right animal, or a different one (which still says hello). */
  lastTap: { id: string; correct: boolean } | null;
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
  | { type: 'markProtectDiscussed' }
  | { type: 'startFind'; order: string[] }
  | { type: 'findTap'; id: string }
  | { type: 'findNext' }
  | { type: 'startChanging'; level: ChangingLevel }
  | { type: 'chGoto'; step: number }
  | { type: 'chBelt'; index: number }
  | { type: 'chToggleCause'; cause: CauseId }
  | { type: 'chPredict'; option: string }
  | { type: 'chReveal' }
  | { type: 'chSargassum'; on: boolean }
  | { type: 'chClean'; id: string }
  | { type: 'chExitIndex'; index: number }
  | { type: 'chAction'; id: string }
  | { type: 'chScore'; score: number | null }
  | { type: 'chDiscussed' }
  | { type: 'chHelper'; id: string };

export const FEATURED_COUNT = organisms.length;

export function initialChanging(level: ChangingLevel): ChangingState {
  return {
    level,
    step: 0,
    belt: 0,
    beltSeen: [0],
    // Start with every factor on, so the model opens showing today's bloom.
    causes: { nutrients: true, warm: true, currents: true },
    prediction: null,
    revealed: false,
    sargassum: false,
    sargassumSeen: false,
    cleaned: [],
    exitIndex: 0,
    action: null,
    actionScore: null,
    actionDiscussed: false,
    helpers: [],
  };
}

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
    find: { order: [], index: 0, found: [], lastTap: null },
    changing: initialChanging('older'),
  };
}

const emptyChoice: ChoiceState = { selected: null, submitted: false, correct: false, tries: 0 };

/** All auto-checked choice items, keyed by item id. */
const choiceItems = new Map<string, FoodChoiceItem>([
  ...connectItems.map((i) => [i.id, i] as const),
  ...exitQuestions.flatMap((q) => (q.kind === 'food-choice' ? [[q.item.id, q.item] as const] : [])),
  ...changingChoiceItems.map((i) => [i.id, i] as const),
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
    case 'startFind': {
      const order = action.order.filter((id) => findableById.has(id));
      const first = findableById.get(order[0] ?? '');
      return {
        ...initialState(),
        mode: 'find',
        stop: first?.habitat ?? 'reef',
        visitedStops: [first?.habitat ?? 'reef'],
        find: { order, index: 0, found: [], lastTap: null },
      };
    }
    case 'findTap': {
      if (state.mode !== 'find' || !findableById.has(action.id)) return state;
      const target = currentFindTarget(state);
      const f = state.find;
      if (target === null || f.found.includes(target)) return { ...state, find: { ...f, lastTap: { id: action.id, correct: false } } };
      if (action.id === target) {
        return { ...state, selectedOrganism: action.id, find: { ...f, found: [...f.found, target], lastTap: { id: action.id, correct: true } } };
      }
      return { ...state, selectedOrganism: null, find: { ...f, lastTap: { id: action.id, correct: false } } };
    }
    case 'findNext': {
      if (state.mode !== 'find') return state;
      const index = Math.min(state.find.index + 1, state.find.order.length);
      const next = findableById.get(state.find.order[index] ?? '');
      const moved = next ? withStop(state, next.habitat) : { ...state, selectedOrganism: null };
      return { ...moved, find: { ...state.find, index, lastTap: null } };
    }
    case 'startChanging':
      return { ...initialState(), mode: 'changing', stop: 'reef', visitedStops: ['reef'], changing: initialChanging(action.level) };
    case 'chGoto': {
      if (state.mode !== 'changing') return state;
      const max = stepsFor(state.changing.level).length - 1;
      return { ...state, selectedOrganism: null, changing: { ...state.changing, step: clamp(action.step, 0, max) } };
    }
    case 'chBelt': {
      const index = clamp(action.index, 0, 2);
      const seen = state.changing.beltSeen.includes(index) ? state.changing.beltSeen : [...state.changing.beltSeen, index];
      return { ...state, changing: { ...state.changing, belt: index, beltSeen: seen } };
    }
    case 'chToggleCause':
      return { ...state, changing: { ...state.changing, causes: { ...state.changing.causes, [action.cause]: !state.changing.causes[action.cause] } } };
    case 'chPredict':
      if (state.changing.revealed) return state;
      return { ...state, changing: { ...state.changing, prediction: action.option } };
    case 'chReveal':
      // The research is revealed only after the class has made a prediction.
      if (state.changing.prediction === null) return state;
      return { ...state, changing: { ...state.changing, revealed: true } };
    case 'chSargassum':
      return { ...state, changing: { ...state.changing, sargassum: action.on, sargassumSeen: state.changing.sargassumSeen || action.on } };
    case 'chClean': {
      if (!litter.some((l) => l.id === action.id) || state.changing.cleaned.includes(action.id)) return state;
      return { ...state, changing: { ...state.changing, cleaned: [...state.changing.cleaned, action.id] } };
    }
    case 'chExitIndex':
      return { ...state, changing: { ...state.changing, exitIndex: clamp(action.index, 0, 2) } };
    case 'chAction':
      return { ...state, changing: { ...state.changing, action: action.id } };
    case 'chScore':
      return { ...state, changing: { ...state.changing, actionScore: action.score } };
    case 'chDiscussed':
      if (state.changing.action === null) return state;
      return { ...state, changing: { ...state.changing, actionDiscussed: true } };
    case 'chHelper': {
      const h = state.changing.helpers;
      return h.includes(action.id) ? state : { ...state, changing: { ...state.changing, helpers: [...h, action.id] } };
    }
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
    featuredDiscovered(state) >= FEATURED_COUNT ? 'completed' : featuredDiscovered(state) > 0 ? 'attempted' : 'skipped';

  return [
    {
      id: 'baseline',
      label: 'Briefing: first idea',
      status: state.baselineShared || state.baselineNote.trim() ? 'completed' : 'skipped',
    },
    { id: 'explore', label: `Explore: ${featuredDiscovered(state)} of ${FEATURED_COUNT} organisms observed`, status: exploreStatus },
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

/** Only the five featured organisms count toward Explore; spotters are bonus discoveries. */
export function featuredDiscovered(state: LessonState): number {
  return state.discovered.filter((id) => organismById.has(id)).length;
}

/** The animal the class is looking for now, or null when the game is over. */
export function currentFindTarget(state: LessonState): string | null {
  return state.find.order[state.find.index] ?? null;
}

/** Expedition 2 recap: completed, attempted or skipped — never completed just by moving past. */
export function changingSummary(state: LessonState): ActivitySummary[] {
  const c = state.changing;
  const status = (done: boolean, tried: boolean): ActivityStatus => (done ? 'completed' : tried ? 'attempted' : 'skipped');
  if (c.level === 'little') {
    return [
      { id: 'cleanup', label: `Clean up: ${c.cleaned.length} of ${litter.length} pieces of trash`, status: status(c.cleaned.length === litter.length, c.cleaned.length > 0) },
      { id: 'seaweed', label: 'Seaweed: compared with and without', status: status(c.sargassumSeen, false) },
      { id: 'helpers', label: `Helpers: ${c.helpers.length} ideas`, status: status(c.helpers.length >= 2, c.helpers.length > 0) },
    ];
  }
  const choiceStatusFor = (id: string) => {
    const ch = choice(state, id);
    return status(ch.submitted && ch.correct, ch.tries > 0 || ch.selected !== null);
  };
  return [
    { id: 'belt', label: 'The belt: compared the years', status: status(c.beltSeen.length === 3, c.beltSeen.length > 1) },
    { id: 'causes', label: 'What feeds it: prediction and research', status: status(c.revealed, c.prediction !== null) },
    { id: 'reef', label: 'Our reef: with and without too much sargassum', status: status(c.sargassumSeen, false) },
    { id: 'cleanup', label: `Clean up: ${c.cleaned.length} of ${litter.length} pieces`, status: status(c.cleaned.length === litter.length, c.cleaned.length > 0) },
    { id: 'ch-exit-nutrients', label: 'Explain: question 1 — where the extra food comes from', status: choiceStatusFor('ch-exit-nutrients') },
    { id: 'ch-exit-twist', label: 'Explain: question 2 — is sargassum always bad?', status: choiceStatusFor('ch-exit-twist') },
    {
      id: 'ch-exit-action',
      label: 'Explain: question 3 — what people can do',
      status: status(c.action !== null && (c.actionDiscussed || c.actionScore !== null), c.action !== null),
    },
  ];
}

export const CHANGING_ACTION_IDS = changingActions.choices.map((x) => x.id);
export const CAUSE_IDS = causes.map((x) => x.id);

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
    find: { ...base.find, ...(r.find ?? {}), lastTap: null },
    changing: { ...base.changing, ...(r.changing ?? {}) },
    choices: { ...(r.choices ?? {}) },
    selectedOrganism: null,
  };
  if (!stepIds.includes(merged.step)) merged.step = 'briefing';
  if (!['reef', 'seagrass', 'sand'].includes(merged.stop)) merged.stop = 'reef';
  return merged;
}
