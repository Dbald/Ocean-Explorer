/**
 * Content model for Ocean Explorer.
 *
 * Lesson content is plain data, kept separate from rendering and input so the
 * same records can drive the 3D scene, the static presentation, the teacher
 * guide and (later) a VR release.
 */

/**
 * `draft`     – written and sourced, but not yet checked by a human reviewer.
 * `reviewed`  – a named reviewer has checked the claim against its sources.
 * Release validation rejects anything that is not `reviewed`.
 */
export type ReviewStatus = 'draft' | 'reviewed';

export interface Review {
  status: ReviewStatus;
  /** Name or role of the person who reviewed the record. Required when reviewed. */
  reviewer?: string;
  /** ISO date of the review. Required when reviewed. */
  date?: string;
  notes?: string;
}

/** Fields every content record carries (PRD §9 minimum content fields). */
export interface ContentRecord {
  /** Stable identifier — never reuse or rename once published. */
  id: string;
  title: string;
  /** Bumped whenever the record's learner-facing meaning changes. */
  contentVersion: number;
  review: Review;
  /** IDs into the source register. */
  sources: string[];
}

export type HabitatId = 'reef' | 'seagrass' | 'sand';

export interface Habitat extends ContentRecord {
  id: HabitatId;
  /** Short framing line shown when the class arrives at this stop. */
  arrival: string;
  /** What to look for at this stop. */
  focus: string;
  /** Text alternative for the 3D view and the static illustration. */
  accessibleDescription: string;
  narrationId: string;
}

export interface Organism extends ContentRecord {
  commonName: string;
  /** Shown only once the identification is verified (review.status === 'reviewed'). */
  scientificName: string;
  habitat: HabitatId;
  /** Habitats the organism is also associated with (shown in Learn more). */
  alsoFoundIn?: HabitatId[];
  /** One short explanation of its role. Part of the ≤45-word default card copy. */
  role: string;
  /** One observation prompt. Part of the ≤45-word default card copy. */
  observe: string;
  /** Additional explanation behind "Learn more". */
  learnMore: string;
  accessibleDescription: string;
  narrationId: string;
  /** Asset register IDs for the visual representations of this organism. */
  assets: string[];
}

/**
 * Anything a child can tap in the scene: the five featured organisms plus
 * "spotter" animals with a one-line, read-aloud fact. Also the targets of the
 * "Can you find…?" game.
 */
export interface Findable extends ContentRecord {
  /** Used in "Can you find the ___?" — e.g. "sea star". */
  name: string;
  habitat: HabitatId;
  /** One short, kid-friendly fact, spoken aloud (also the caption). */
  line: string;
  accessibleDescription: string;
  /** Featured organisms also have a full card; spotters have a short one. */
  featured: boolean;
  assets: string[];
}

/** Supporting food-resource cards (algae, seagrass, small fish). Not full profiles. */
export interface FoodResource extends ContentRecord {
  name: string;
  kind: 'producer' | 'consumer';
  description: string;
}

/**
 * A single, independently validated feeding link. Energy moves from `food`
 * to `consumer`. Never chain these into one linear food chain.
 */
export interface FoodRelationship extends ContentRecord {
  /** Organism or food-resource ID that is eaten. */
  food: string;
  /** Organism ID that eats it. */
  consumer: string;
  explanation: string;
  /** Qualifier about life stage or species-specific diet, if needed. */
  qualifier?: string;
}

/** Shelter is a different kind of relationship and is drawn differently. */
export interface ShelterRelationship extends ContentRecord {
  shelter: string;
  user: string;
  explanation: string;
}

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  /** What this source supports — and what it does not. */
  supports: string;
  accessed: string;
}

export interface AssetRecord {
  id: string;
  description: string;
  creator: string;
  source: string;
  license: string;
  attribution: string;
  distribution: string;
}

export interface NarrationSegment {
  id: string;
  /** Text spoken by narration — also the caption and transcript text. */
  text: string;
}

export interface VideoSegment {
  id: string;
  title: string;
  /** Path under /media. The lesson never depends on this file existing. */
  src: string;
  captions: string;
  /** Equivalent text shown with the video and in the transcript. */
  transcript: string;
  /** Lesson step where the segment is offered. */
  step: StepId;
}

export type StepId = 'briefing' | 'explore' | 'connect' | 'investigate' | 'explain' | 'recap';

export interface LessonStep {
  id: StepId;
  label: string;
  /** Target time window, e.g. "1:00–4:00". Never enforced by a timer. */
  time: string;
  /** The one main instruction on screen. */
  instruction: string;
  narrationId: string;
  teacherNotes: string[];
  prompts: string[];
}

export interface ChoiceOption {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
}

/** A food-direction item used in the Connect activity and the first exit question. */
export interface FoodChoiceItem {
  id: string;
  relationship: string;
  prompt: string;
  options: ChoiceOption[];
  explanation: string;
}

export interface PredictionOption {
  id: string;
  label: string;
  /** Plausible, qualified predictions are acknowledged as reasonable. */
  plausible: boolean;
  response: string;
}

export interface RubricLevel {
  score: number;
  label: string;
  example: string;
}

export type ExitQuestion =
  | {
      id: string;
      kind: 'food-choice';
      title: string;
      item: FoodChoiceItem;
    }
  | {
      id: string;
      kind: 'shelter-reasoning';
      title: string;
      prompt: string;
      options: PredictionOption[];
      discussion: string;
    }
  | {
      id: string;
      kind: 'protection-choice';
      title: string;
      prompt: string;
      choices: { id: string; label: string; need: string }[];
      rubric: RubricLevel[];
      discussion: string;
    };

export interface GlossaryTerm {
  term: string;
  definition: string;
}
