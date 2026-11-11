/**
 * Lesson controller: explicit, serializable lesson state and a pure reducer.
 * No DOM or rendering here, so the same controller can drive the 3D scene,
 * the static presentation and a later VR release.
 */
import { connectItems, exitQuestions, shelterPrediction, stepIds } from '../content/lesson.ts';
import { changingActions, changingChoiceItems, causes, litter, stepsFor, type CauseId, type ChangingLevel } from '../content/changing.ts';
import { findableById } from '../content/findables.ts';
import {
  chainLinks,
  feedItems,
  oceanActions,
  oceanAnimalById,
  oceanChoiceItems,
  oceanStepsFor,
  plankton,
  raftFinds,
  type OceanLevel,
  type OceanStop,
} from '../content/openOcean.ts';
import {
  deepActions,
  deepAnimalById,
  deepChoiceItems,
  deepStepsFor,
  glowFinds,
  zoneClueById,
  zoneClues,
  zoneOrder,
  type DeepLevel,
  type DeepZone,
} from '../content/deepOcean.ts';
import { organismById, organisms } from '../content/organisms.ts';
import type { FoodChoiceItem, HabitatId, StepId } from '../content/types.ts';

export type Mode = 'lesson' | 'explore' | 'find' | 'changing' | 'ocean' | 'deep';
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
  /** Expedition 3: Plankton to Whale Sharks. */
  ocean: OceanState;
  /** Expedition 4: Into the Deep. */
  deep: DeepState;
}

export interface DeepState {
  level: DeepLevel;
  step: number;
  /** The zone the class is in now. */
  zone: DeepZone;
  visited: DeepZone[];
  /** Deep-sea animals the class has tapped. */
  met: string[];
  /** Zone clues placed correctly, by clue id. */
  sorted: Record<string, DeepZone>;
  /** The last wrong placement, for a hint. Cleared by a right one. */
  sortMiss: { clue: string; zone: DeepZone } | null;
  prediction: string | null;
  revealed: boolean;
  /** Our lights: on shows the animals' bodies, off shows only their own light. */
  lights: boolean;
  sawDark: boolean;
  /** Little Explorers: glowing animals found with the lights off. */
  found: string[];
  exitIndex: number;
  action: string | null;
  actionScore: number | null;
  actionDiscussed: boolean;
}

export interface OceanState {
  level: OceanLevel;
  step: number;
  /** Where the class is in the open-water scene. */
  stop: OceanStop;
  /** The plankton magnifier is open. */
  magnifier: boolean;
  seenPlankton: string[];
  /** Open-ocean animals the class has tapped. */
  met: string[];
  /** Food chain links placed so far, in order (after sunlight). */
  chain: string[];
  /** The last card tapped that didn't come next. */
  chainMiss: string | null;
  prediction: string | null;
  revealed: boolean;
  /** The snappers are spawning in the Gladden Spit model. */
  spawning: boolean;
  sawSpawn: boolean;
  /** Little Explorers: what has been offered to the whale shark, and the last one. */
  fed: string[];
  lastFeed: string | null;
  /** Little Explorers: who has been found in the seaweed raft. */
  found: string[];
  exitIndex: number;
  action: string | null;
  actionScore: number | null;
  actionDiscussed: boolean;
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
  | { type: 'chHelper'; id: string }
  | { type: 'startOcean'; level: OceanLevel }
  | { type: 'ocGoto'; step: number }
  | { type: 'ocStop'; stop: OceanStop }
  | { type: 'ocMagnifier'; open: boolean }
  | { type: 'ocPlankton'; id: string }
  | { type: 'ocMeet'; id: string }
  | { type: 'ocChain'; id: string }
  | { type: 'ocPredict'; option: string }
  | { type: 'ocReveal' }
  | { type: 'ocSpawn'; on: boolean }
  | { type: 'ocFeed'; id: string }
  | { type: 'ocFind'; id: string }
  | { type: 'ocExitIndex'; index: number }
  | { type: 'ocAction'; id: string }
  | { type: 'ocScore'; score: number | null }
  | { type: 'ocDiscussed' }
  | { type: 'startDeep'; level: DeepLevel }
  | { type: 'dzGoto'; step: number }
  | { type: 'dzZone'; zone: DeepZone }
  | { type: 'dzDeeper' }
  | { type: 'dzMeet'; id: string }
  | { type: 'dzSort'; clue: string; zone: DeepZone }
  | { type: 'dzPredict'; option: string }
  | { type: 'dzReveal' }
  | { type: 'dzLights'; on: boolean }
  | { type: 'dzFind'; id: string }
  | { type: 'dzExitIndex'; index: number }
  | { type: 'dzAction'; id: string }
  | { type: 'dzScore'; score: number | null }
  | { type: 'dzDiscussed' };

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

export function initialOcean(level: OceanLevel): OceanState {
  return {
    level,
    step: 0,
    stop: 'blue',
    magnifier: false,
    seenPlankton: [],
    met: [],
    chain: [],
    chainMiss: null,
    prediction: null,
    revealed: false,
    spawning: false,
    sawSpawn: false,
    fed: [],
    lastFeed: null,
    found: [],
    exitIndex: 0,
    action: null,
    actionScore: null,
    actionDiscussed: false,
  };
}

const addOnce = <T,>(list: T[], id: T) => (list.includes(id) ? list : [...list, id]);

export function initialDeep(level: DeepLevel): DeepState {
  return {
    level,
    step: 0,
    zone: 'sunlight',
    visited: ['sunlight'],
    met: [],
    sorted: {},
    sortMiss: null,
    prediction: null,
    revealed: false,
    lights: true,
    sawDark: false,
    found: [],
    exitIndex: 0,
    action: null,
    actionScore: null,
    actionDiscussed: false,
  };
}

/** The zone each step happens in, when the step decides it (otherwise the class chooses). */
export function deepZoneForStep(level: DeepLevel, step: number): DeepZone | null {
  const kind = deepStepsFor(level)[step]?.kind;
  if (kind === 'glow') return 'midnight';
  if (kind === 'briefing' && step === 0) return 'sunlight';
  return null;
}

/** Expedition 4 actions. Pure, like the rest of the reducer. */
function reduceDeep(state: LessonState, action: Action): LessonState {
  const d = state.deep;
  const set = (patch: Partial<DeepState>): LessonState => ({ ...state, deep: { ...d, ...patch } });
  const goZone = (zone: DeepZone) => set({ zone, visited: addOnce(d.visited, zone) });
  switch (action.type) {
    case 'dzGoto': {
      const max = deepStepsFor(d.level).length - 1;
      const step = clamp(action.step, 0, max);
      const zone = deepZoneForStep(d.level, step) ?? d.zone;
      // Leaving the lights-out step turns our lights back on.
      return { ...state, selectedOrganism: null, deep: { ...d, step, zone, visited: addOnce(d.visited, zone), sortMiss: null, lights: true } };
    }
    case 'dzZone':
      return zoneOrder.includes(action.zone) ? goZone(action.zone) : state;
    case 'dzDeeper': {
      const next = zoneOrder[zoneOrder.indexOf(d.zone) + 1];
      return next ? goZone(next) : state;
    }
    case 'dzMeet': {
      const a = deepAnimalById.get(action.id);
      return a ? set({ met: addOnce(d.met, a.id) }) : state;
    }
    case 'dzSort': {
      const clue = zoneClueById.get(action.clue);
      if (!clue || d.sorted[clue.id]) return state;
      return clue.zone === action.zone
        ? set({ sorted: { ...d.sorted, [clue.id]: action.zone }, sortMiss: null })
        : set({ sortMiss: { clue: clue.id, zone: action.zone } });
    }
    case 'dzPredict':
      return d.revealed ? state : set({ prediction: action.option });
    case 'dzReveal':
      return d.prediction === null ? state : set({ revealed: true });
    case 'dzLights': {
      // Older classes predict first; the little ones go straight to the lights.
      if (d.level === 'older' && !d.revealed) return state;
      return set({ lights: action.on, sawDark: d.sawDark || !action.on });
    }
    case 'dzFind':
      return glowFinds.includes(action.id) && !d.lights ? set({ found: addOnce(d.found, action.id), met: addOnce(d.met, action.id) }) : state;
    case 'dzExitIndex':
      return set({ exitIndex: clamp(action.index, 0, 2) });
    case 'dzAction':
      return deepActions.choices.some((c) => c.id === action.id) ? set({ action: action.id }) : state;
    case 'dzScore':
      return set({ actionScore: action.score });
    case 'dzDiscussed':
      return d.action === null ? state : set({ actionDiscussed: true });
    default:
      return state;
  }
}

/** Expedition 3 actions. Pure, like the rest of the reducer. */
function reduceOcean(state: LessonState, action: Action): LessonState {
  const o = state.ocean;
  const set = (patch: Partial<OceanState>): LessonState => ({ ...state, ocean: { ...o, ...patch } });
  switch (action.type) {
    case 'ocGoto': {
      const max = oceanStepsFor(o.level).length - 1;
      return { ...set({ step: clamp(action.step, 0, max), magnifier: false, chainMiss: null, lastFeed: null }), selectedOrganism: null };
    }
    case 'ocStop':
      return set({ stop: action.stop });
    case 'ocMagnifier':
      return set({ magnifier: action.open });
    case 'ocPlankton':
      return plankton.some((p) => p.id === action.id) ? set({ seenPlankton: addOnce(o.seenPlankton, action.id) }) : state;
    case 'ocMeet':
      return oceanAnimalById.has(action.id) ? set({ met: addOnce(o.met, action.id) }) : state;
    case 'ocChain': {
      const next = chainLinks[o.chain.length];
      if (!next) return state;
      return action.id === next.id ? set({ chain: [...o.chain, next.id], chainMiss: null }) : set({ chainMiss: action.id });
    }
    case 'ocPredict':
      return o.revealed ? state : set({ prediction: action.option });
    case 'ocReveal':
      return o.prediction === null ? state : set({ revealed: true });
    case 'ocSpawn':
      // The model opens only once the class has made a prediction.
      return o.revealed ? set({ spawning: action.on, sawSpawn: o.sawSpawn || action.on }) : state;
    case 'ocFeed':
      return feedItems.some((f) => f.id === action.id) ? set({ fed: addOnce(o.fed, action.id), lastFeed: action.id }) : state;
    case 'ocFind':
      return raftFinds.includes(action.id) ? set({ found: addOnce(o.found, action.id), met: addOnce(o.met, action.id) }) : state;
    case 'ocExitIndex':
      return set({ exitIndex: clamp(action.index, 0, 2) });
    case 'ocAction':
      return oceanActions.choices.some((c) => c.id === action.id) ? set({ action: action.id }) : state;
    case 'ocScore':
      return set({ actionScore: action.score });
    case 'ocDiscussed':
      return o.action === null ? state : set({ actionDiscussed: true });
    default:
      return state;
  }
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
    ocean: initialOcean('older'),
    deep: initialDeep('older'),
  };
}

const emptyChoice: ChoiceState = { selected: null, submitted: false, correct: false, tries: 0 };

/** All auto-checked choice items, keyed by item id. */
const choiceItems = new Map<string, FoodChoiceItem>([
  ...connectItems.map((i) => [i.id, i] as const),
  ...exitQuestions.flatMap((q) => (q.kind === 'food-choice' ? [[q.item.id, q.item] as const] : [])),
  ...changingChoiceItems.map((i) => [i.id, i] as const),
  ...oceanChoiceItems.map((i) => [i.id, i] as const),
  ...deepChoiceItems.map((i) => [i.id, i] as const),
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
    case 'startOcean':
      return { ...initialState(), mode: 'ocean', ocean: initialOcean(action.level) };
    case 'ocGoto':
    case 'ocStop':
    case 'ocMagnifier':
    case 'ocPlankton':
    case 'ocMeet':
    case 'ocChain':
    case 'ocPredict':
    case 'ocReveal':
    case 'ocSpawn':
    case 'ocFeed':
    case 'ocFind':
    case 'ocExitIndex':
    case 'ocAction':
    case 'ocScore':
    case 'ocDiscussed':
      return state.mode === 'ocean' ? reduceOcean(state, action) : state;
    case 'startDeep':
      return { ...initialState(), mode: 'deep', deep: initialDeep(action.level) };
    case 'dzGoto':
    case 'dzZone':
    case 'dzDeeper':
    case 'dzMeet':
    case 'dzSort':
    case 'dzPredict':
    case 'dzReveal':
    case 'dzLights':
    case 'dzFind':
    case 'dzExitIndex':
    case 'dzAction':
    case 'dzScore':
    case 'dzDiscussed':
      return state.mode === 'deep' ? reduceDeep(state, action) : state;
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

/** Expedition 3 recap: completed, attempted or skipped — never completed just by moving past. */
export function oceanSummary(state: LessonState): ActivitySummary[] {
  const o = state.ocean;
  const status = (done: boolean, tried: boolean): ActivityStatus => (done ? 'completed' : tried ? 'attempted' : 'skipped');
  const food = feedItems.filter((f) => f.food).map((f) => f.id);
  if (o.level === 'little') {
    return [
      { id: 'tiny', label: `Tiny things: ${o.seenPlankton.length} of ${plankton.length} plankton`, status: status(o.seenPlankton.length === plankton.length, o.seenPlankton.length > 0) },
      { id: 'feed', label: 'Fed the whale shark', status: status(food.every((f) => o.fed.includes(f)), o.fed.length > 0) },
      { id: 'raft', label: `Seaweed raft: found ${o.found.length} of ${raftFinds.length}`, status: status(o.found.length === raftFinds.length, o.found.length > 0) },
    ];
  }
  const choiceStatusFor = (id: string) => {
    const ch = choice(state, id);
    return status(ch.submitted && ch.correct, ch.tries > 0 || ch.selected !== null);
  };
  return [
    { id: 'dive', label: 'Into the blue: plankton and animals', status: status(o.seenPlankton.length === plankton.length && o.met.length >= 3, o.seenPlankton.length > 0 || o.met.length > 0) },
    { id: 'chain', label: 'Food chain: from sunlight to a hunter', status: status(o.chain.length === chainLinks.length, o.chain.length > 0 || o.chainMiss !== null) },
    { id: 'spawn', label: 'Spawning moon: prediction and test', status: status(o.revealed && o.sawSpawn, o.prediction !== null) },
    { id: 'oc-exit-base', label: 'Explain: question 1 — the bottom of the food chain', status: choiceStatusFor('oc-exit-base') },
    { id: 'oc-exit-gladden', label: 'Explain: question 2 — why whale sharks visit Gladden Spit', status: choiceStatusFor('oc-exit-gladden') },
    { id: 'oc-exit-action', label: 'Explain: question 3 — how people can help', status: status(o.action !== null && (o.actionDiscussed || o.actionScore !== null), o.action !== null) },
  ];
}

/** Expedition 4 recap: completed, attempted or skipped — never completed just by moving past. */
export function deepSummary(state: LessonState): ActivitySummary[] {
  const d = state.deep;
  const status = (done: boolean, tried: boolean): ActivityStatus => (done ? 'completed' : tried ? 'attempted' : 'skipped');
  const allZones = zoneOrder.every((z) => d.visited.includes(z));
  if (d.level === 'little') {
    return [
      { id: 'descend', label: `Dive down: ${d.visited.length} of ${zoneOrder.length} zones`, status: status(allZones && d.met.length >= 3, d.visited.length > 1 || d.met.length > 0) },
      { id: 'glow', label: `Lights out: found ${d.found.length} of ${glowFinds.length} glowing animals`, status: status(d.found.length === glowFinds.length, d.sawDark) },
    ];
  }
  const choiceStatusFor = (id: string) => {
    const ch = choice(state, id);
    return status(ch.submitted && ch.correct, ch.tries > 0 || ch.selected !== null);
  };
  const nSorted = Object.keys(d.sorted).length;
  return [
    { id: 'descend', label: 'Dive down: three zones and their animals', status: status(allZones && d.met.length >= 3, d.visited.length > 1 || d.met.length > 0) },
    { id: 'sort', label: `Zone clues: ${nSorted} of ${zoneClues.length}`, status: status(nSorted === zoneClues.length, nSorted > 0 || d.sortMiss !== null) },
    { id: 'glow', label: 'Lights out: prediction and observation', status: status(d.revealed && d.sawDark, d.prediction !== null) },
    { id: 'dz-exit-light', label: 'Explain: question 1 — no phytoplankton in the midnight zone', status: choiceStatusFor('dz-exit-light') },
    { id: 'dz-exit-lure', label: 'Explain: question 2 — the anglerfish’s lure', status: choiceStatusFor('dz-exit-lure') },
    { id: 'dz-exit-action', label: 'Explain: question 3 — how a deep-sea animal survives', status: status(d.action !== null && (d.actionDiscussed || d.actionScore !== null), d.action !== null) },
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
    ocean: { ...base.ocean, ...(r.ocean ?? {}), magnifier: false, chainMiss: null, lastFeed: null },
    deep: { ...base.deep, ...(r.deep ?? {}), sortMiss: null },
    choices: { ...(r.choices ?? {}) },
    selectedOrganism: null,
  };
  if (!stepIds.includes(merged.step)) merged.step = 'briefing';
  if (!['reef', 'seagrass', 'sand'].includes(merged.stop)) merged.stop = 'reef';
  return merged;
}
