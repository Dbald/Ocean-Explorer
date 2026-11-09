/**
 * Expedition 3 — "Plankton to Whale Sharks": the open ocean beyond Belize's
 * reef. Tiny drifting plankton feed small fish, small fish feed the hunters,
 * and the biggest fish of all, the whale shark, eats plankton directly. Each
 * spring whale sharks gather at Gladden Spit, Belize, to feed on clouds of
 * snapper eggs. Two levels share one open-water scene: Little Explorers
 * (TK–2) and Grades 3–6.
 */
import type { ChoiceOption, ContentRecord, FoodChoiceItem, PredictionOption, RubricLevel } from './types.ts';

const draft = { status: 'draft' as const };

export const OCEAN_TITLE = 'Plankton to Whale Sharks';
export const OCEAN_QUESTION = 'How does the smallest life feed the biggest fish?';
export const OCEAN_OBJECTIVE =
  'Students trace an open-ocean food chain from sunlight and plankton to big fish, and explain why whale sharks visit Belize’s Gladden Spit each spring.';

/** The objective, said to the class. */
export const OCEAN_INTRO =
  'Today you’ll trace an open-ocean food chain from sunlight and plankton to big fish, and find out why whale sharks visit Belize’s Gladden Spit each spring.';

export type OceanLevel = 'older' | 'little';
export type OceanStepKind = 'briefing' | 'dive' | 'chain' | 'spawn' | 'explain' | 'recap' | 'tiny' | 'feed' | 'raft';
/** Places in the open-water scene. */
export type OceanStop = 'blue' | 'raft' | 'spit';

export interface OceanStep {
  id: string;
  kind: OceanStepKind;
  label: string;
  time: string;
  instruction: string;
  narrationId: string;
  teacherNotes: string[];
  prompts: string[];
}

export const oceanStops: { id: OceanStop; title: string; arrival: string }[] = [
  { id: 'blue', title: 'Open water', arrival: 'Deep blue water in every direction, and no seafloor in sight. Life out here drifts, swims or floats.' },
  { id: 'raft', title: 'Seaweed raft', arrival: 'A raft of floating sargassum at the surface. Out here it is a home, with food and places to hide.' },
  { id: 'spit', title: 'Gladden Spit', arrival: 'Where Belize’s reef drops away into deep water. Each spring, snappers gather here to spawn.' },
];

export const olderOceanSteps: OceanStep[] = [
  {
    id: 'oc-briefing',
    kind: 'briefing',
    label: 'Briefing',
    time: '0:00–1:00',
    instruction: `Our question: ${OCEAN_QUESTION}`,
    narrationId: 'oc-step-briefing',
    teacherNotes: [
      'We leave the reef and swim out into the open ocean, where there is no seafloor in sight.',
      'Ask what the biggest fish in the world might eat. Most guesses will be big animals; hold on to them for the twist.',
    ],
    prompts: ['What do you think the biggest fish in the world eats?', 'What could live out here with no reef to hide in?'],
  },
  {
    id: 'oc-dive',
    kind: 'dive',
    label: 'Into the blue',
    time: '1:00–3:00',
    instruction: 'Use the magnifier to see the plankton, then meet the animals out here.',
    narrationId: 'oc-step-dive',
    teacherNotes: [
      'Open the magnifier: the plankton are too small to see without it. Tap each one.',
      'Visit the seaweed raft and Gladden Spit with the place buttons, and tap the animals.',
    ],
    prompts: ['What do the phytoplankton need to make food?', 'Where could a young animal hide out here?'],
  },
  {
    id: 'oc-chain',
    kind: 'chain',
    label: 'Food chain',
    time: '3:00–5:00',
    instruction: 'Build an open-ocean food chain, from sunlight to a hunter. Tap who comes next.',
    narrationId: 'oc-step-chain',
    teacherNotes: [
      'Each arrow means “is eaten by”: energy moves from food to the animal that eats it.',
      'After the chain, share the twist: the whale shark, the biggest fish, eats plankton directly.',
    ],
    prompts: ['What does each link need from the one before it?', 'What would happen to the chain without phytoplankton?'],
  },
  {
    id: 'oc-spawn',
    kind: 'spawn',
    label: 'Spawning moon',
    time: '5:00–7:00',
    instruction: 'Predict: when do whale sharks come to Gladden Spit? Then test your idea.',
    narrationId: 'oc-step-spawn',
    teacherNotes: [
      'Record one class prediction before testing it.',
      'The on/off model is a simplified example: it shows the idea, not real numbers of sharks.',
      'Key idea: the whale sharks come for food. Their visits match the snappers’ spawning, in April and May around the full moon.',
    ],
    prompts: ['Why would a big fish travel to one place at one time of year?', 'What else might depend on the snappers?'],
  },
  {
    id: 'oc-explain',
    kind: 'explain',
    label: 'Explain',
    time: '7:00–9:00',
    instruction: 'Answer three questions about what you learned.',
    narrationId: 'oc-step-explain',
    teacherNotes: ['Question 3 is for discussion: any action connected to plankton, the spawning site or boats counts.'],
    prompts: ['How do you know?', 'What would you tell a friend?'],
  },
  {
    id: 'oc-recap',
    kind: 'recap',
    label: 'Recap',
    time: '9:00+',
    instruction: 'Look back at our question.',
    narrationId: 'oc-step-recap',
    teacherNotes: ['End with the oxygen fact: the tiny plankton matter to us too.'],
    prompts: ['What surprised you?', 'Why do tiny things matter?'],
  },
];

export const littleOceanSteps: OceanStep[] = [
  {
    id: 'ocl-story',
    kind: 'briefing',
    label: 'Story',
    time: '0:00–1:00',
    instruction: 'Let’s swim past the reef into the big blue ocean!',
    narrationId: 'ocl-story',
    teacherNotes: ['Ask: what do you think lives out where there is only water?'],
    prompts: ['What lives in the big blue ocean?'],
  },
  {
    id: 'ocl-tiny',
    kind: 'tiny',
    label: 'Tiny things',
    time: '1:00–3:00',
    instruction: 'Look through the magnifier! Tap each tiny thing.',
    narrationId: 'ocl-tiny',
    teacherNotes: ['One child per tiny thing. They are real kinds of plankton, drawn much bigger than life.'],
    prompts: ['Can you see them without the magnifier?'],
  },
  {
    id: 'ocl-feed',
    kind: 'feed',
    label: 'Feed the shark',
    time: '3:00–5:00',
    instruction: 'The whale shark is hungry! Tap its food.',
    narrationId: 'ocl-feed',
    teacherNotes: ['Every tap gets an answer. The plastic bottle is a chance to remember Lesson 2: trash is not food.'],
    prompts: ['Is the biggest fish eating big food or tiny food?'],
  },
  {
    id: 'ocl-raft',
    kind: 'raft',
    label: 'Seaweed raft',
    time: '5:00–7:00',
    instruction: 'Who is hiding in the floating seaweed? Tap to find them.',
    narrationId: 'ocl-raft',
    teacherNotes: ['This is the sargassum from Lesson 2. Out in the ocean it is a home.'],
    prompts: ['Why is the seaweed a good place to hide?'],
  },
  {
    id: 'ocl-done',
    kind: 'recap',
    label: 'Well done',
    time: '7:00+',
    instruction: 'The tiniest things feed the biggest fish!',
    narrationId: 'ocl-done',
    teacherNotes: ['Celebrate! Remind the class: in the ocean we look at animals, but never touch them.'],
    prompts: [],
  },
];

export const oceanStepsFor = (level: OceanLevel) => (level === 'little' ? littleOceanSteps : olderOceanSteps);

// ── Animals in the open water ──────────────────────────────────────────────

export interface OceanAnimal extends ContentRecord {
  stop: OceanStop;
  /** One short line read aloud when tapped. */
  line: string;
  /** Only in the Little Explorers' raft hunt. */
  hidden?: boolean;
}

export const oceanAnimals: OceanAnimal[] = [
  {
    id: 'whale-shark',
    title: 'Whale shark',
    stop: 'blue',
    line: 'Whale shark! The biggest fish in the world eats some of the smallest food: plankton.',
    contentVersion: 1,
    review: draft,
    sources: ['wa-whale-shark', 'iucn-whale-shark'],
  },
  {
    id: 'small-fish',
    title: 'School of small fish',
    stop: 'blue',
    line: 'A school of small fish. They eat tiny zooplankton, and bigger fish eat them.',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-plankton'],
  },
  {
    id: 'mahi-mahi',
    title: 'Mahi-mahi',
    stop: 'raft',
    line: 'Mahi-mahi! A fast hunter that often swims under floating sargassum.',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-mahi'],
  },
  {
    id: 'young-turtle',
    title: 'Young sea turtle',
    stop: 'raft',
    line: 'A young sea turtle! It finds food and shelter in the floating sargassum.',
    hidden: true,
    contentVersion: 1,
    review: draft,
    sources: ['noaa-oe-sargassum', 'noaa-sargassum-habitat'],
  },
  {
    id: 'young-fish',
    title: 'Young fish',
    stop: 'raft',
    line: 'Young fish! The sargassum gives them food and a place to hide.',
    hidden: true,
    contentVersion: 1,
    review: draft,
    sources: ['noaa-oe-sargassum'],
  },
  {
    id: 'sargassum-raft',
    title: 'Floating sargassum',
    stop: 'raft',
    line: 'Floating sargassum! Out here it is a home, with food and shelter for young animals.',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-sargassum-habitat', 'noaa-oe-sargassum'],
  },
  {
    id: 'cubera-snapper',
    title: 'Cubera snapper',
    stop: 'spit',
    line: 'Cubera snappers! At Gladden Spit they gather to spawn, and whale sharks come to eat their eggs.',
    contentVersion: 1,
    review: draft,
    sources: ['heyman-2001-gladden'],
  },
];

export const oceanAnimalById = new Map(oceanAnimals.map((a) => [a.id, a]));
export const isOceanAnimal = (id: string) => oceanAnimalById.has(id);
export const oceanAnimalsAt = (stop: OceanStop) => oceanAnimals.filter((a) => a.stop === stop);
/** What the Little Explorers look for at the raft. */
export const raftFinds = ['young-turtle', 'young-fish', 'mahi-mahi'];

// ── Plankton, seen through the magnifier ───────────────────────────────────

export interface Plankton extends ContentRecord {
  kind: 'phytoplankton' | 'zooplankton';
  line: string;
}

export const plankton: Plankton[] = [
  {
    id: 'diatom',
    title: 'Diatom',
    kind: 'phytoplankton',
    line: 'A diatom: phytoplankton with a hard shell made of parts that fit together. It uses sunlight to make its own food.',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-phytoplankton'],
  },
  {
    id: 'dinoflagellate',
    title: 'Dinoflagellate',
    kind: 'phytoplankton',
    line: 'A dinoflagellate: phytoplankton that swims with a tiny whip-like tail. It uses sunlight to make its own food.',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-phytoplankton'],
  },
  {
    id: 'copepod',
    title: 'Copepod',
    kind: 'zooplankton',
    line: 'A copepod: a tiny animal. Zooplankton like this eat phytoplankton, and bigger animals eat them.',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-plankton'],
  },
];

export const planktonById = new Map(plankton.map((p) => [p.id, p]));

// ── The food chain (Grades 3–6) ────────────────────────────────────────────

export interface ChainLink {
  id: string;
  title: string;
  /** Shown once placed: how it gets its energy. */
  note: string;
}

/** In order, after sunlight. Each arrow means "is eaten by". */
export const chainLinks: ChainLink[] = [
  { id: 'phytoplankton', title: 'Phytoplankton', note: 'uses sunlight to make food' },
  { id: 'zooplankton', title: 'Zooplankton', note: 'eats phytoplankton' },
  { id: 'small-fish', title: 'Small fish', note: 'eats zooplankton' },
  { id: 'mahi-mahi', title: 'Mahi-mahi', note: 'a hunter that eats small fish' },
];
/** The order the cards are offered in (not the answer). */
export const chainChoices = ['mahi-mahi', 'zooplankton', 'phytoplankton', 'small-fish'];
export const chainLinkById = new Map(chainLinks.map((l) => [l.id, l]));

export const chainRecord: ContentRecord = {
  id: 'open-ocean-chain',
  title: 'Open-ocean food chain: sunlight → phytoplankton → zooplankton → small fish → mahi-mahi',
  contentVersion: 1,
  review: draft,
  sources: ['noaa-phytoplankton', 'noaa-plankton', 'noaa-mahi'],
};

export const chainTwist = {
  title: 'Here’s a twist',
  text: 'The whale shark, the biggest fish of all, skips the middle of the chain. It filters plankton straight out of the water.',
  record: { id: 'whale-shark-diet', title: 'Whale sharks are filter feeders that eat plankton', contentVersion: 1, review: draft, sources: ['wa-whale-shark'] } as ContentRecord,
};

// ── The spawning moon at Gladden Spit ──────────────────────────────────────

export const spawnPrediction: { prompt: string; options: PredictionOption[] } = {
  prompt: 'When do you think whale sharks come to Gladden Spit?',
  options: [
    { id: 'snappers', label: 'When the snappers spawn and release clouds of eggs', plausible: true, response: 'That’s what scientists found!' },
    { id: 'warm', label: 'When the water is warmest', plausible: true, response: 'A good idea to test. Scientists found the timing matches the snappers’ spawning.' },
    { id: 'random', label: 'Any time, at random', plausible: false, response: 'Let’s test it. Scientists found the sharks come at the same time each year.' },
    { id: 'unsure', label: 'We’re not sure yet', plausible: true, response: 'Good thinking. Let’s test it!' },
  ],
};

export const spawnReveal = {
  badge: 'Simplified example',
  on: 'The snappers release clouds of eggs. Whale sharks swim in to feed.',
  off: 'No spawning: the water is quiet, and the whale sharks swim on.',
  explanation:
    'Scientists found that whale sharks gather at Gladden Spit in April and May, around the full moon, when cubera and dog snappers spawn. The whale sharks feed on the clouds of eggs.',
  record: { id: 'gladden-spawning', title: 'Whale sharks feed on snapper spawn at Gladden Spit', contentVersion: 1, review: draft, sources: ['heyman-2001-gladden'] } as ContentRecord,
};

// ── Feed the whale shark (Little Explorers) ────────────────────────────────

export const feedItems = [
  { id: 'plankton', icon: '🦐', label: 'Tiny plankton', food: true, line: 'Yum! Tiny plankton. That is whale shark food.' },
  { id: 'eggs', icon: '🫧', label: 'Snapper eggs', food: true, line: 'Yum! A cloud of snapper eggs.' },
  { id: 'bottle', icon: '🧴', label: 'Plastic bottle', food: false, line: 'No! Plastic is not food. Trash goes in the bin.' },
  { id: 'rock', icon: '🪨', label: 'A rock', food: false, line: 'No, a rock is not food.' },
];

// ── Exit questions (Grades 3–6) ────────────────────────────────────────────

const opts = (o: ChoiceOption[]) => o;

export const oceanExitBase: FoodChoiceItem = {
  id: 'oc-exit-base',
  relationship: 'open-ocean-chain',
  prompt: 'What is at the bottom of the open-ocean food chain?',
  options: opts([
    { id: 'a', label: 'Phytoplankton, which use sunlight to make food', correct: true, feedback: 'Yes! Every other link gets its energy, in the end, from phytoplankton.' },
    { id: 'b', label: 'Whale sharks', correct: false, feedback: 'Not quite. Whale sharks are the biggest, but they eat plankton.' },
    { id: 'c', label: 'Mahi-mahi', correct: false, feedback: 'Not quite. Mahi-mahi are hunters near the top of the chain.' },
  ]),
  explanation: 'Phytoplankton use sunlight to make food. Zooplankton eat them, small fish eat zooplankton, and hunters eat small fish.',
};

export const oceanExitGladden: FoodChoiceItem = {
  id: 'oc-exit-gladden',
  relationship: 'gladden-spawning',
  prompt: 'Why do whale sharks visit Gladden Spit in April and May?',
  options: opts([
    { id: 'a', label: 'To lay their own eggs', correct: false, feedback: 'Not quite. Think about who is spawning at Gladden Spit.' },
    { id: 'b', label: 'To eat the clouds of snapper eggs', correct: true, feedback: 'Yes! Their visits match the snappers’ spawning.' },
    { id: 'c', label: 'To get away from cold water', correct: false, feedback: 'Not quite. They come at the same time as something else happens there.' },
  ]),
  explanation: 'Whale sharks gather when cubera and dog snappers spawn, around the full moon in April and May, and feed on the eggs.',
};

export const oceanActions = {
  prompt: 'How could people help the whale sharks of Gladden Spit?',
  choices: [
    { id: 'spawning', label: 'Protect the snappers’ spawning site', need: 'whale sharks come to eat the snappers’ eggs' },
    { id: 'plankton', label: 'Keep the ocean clean for plankton', need: 'plankton are the base of the food chain' },
    { id: 'boats', label: 'Boats go slowly and keep their distance', need: 'being hit by ships is a danger to whale sharks' },
  ],
  rubric: [
    { score: 0, label: 'No relevant reasoning', example: '“Because.”' },
    { score: 1, label: 'Names an action', example: '“Keep the water clean.”' },
    { score: 2, label: 'Links an action to the food chain or the whale sharks’ needs', example: '“Protect the snappers, because whale sharks come to eat their eggs.”' },
  ] as RubricLevel[],
};

export const oceanChoiceItems: FoodChoiceItem[] = [oceanExitBase, oceanExitGladden];

// ── Did you know? ──────────────────────────────────────────────────────────

export const oxygenFact = {
  title: 'Did you know?',
  text: 'Scientists estimate that about half of the oxygen made on Earth comes from the ocean, mostly from tiny plankton.',
  record: { id: 'ocean-oxygen', title: 'About half of Earth’s oxygen is made in the ocean, mostly by plankton', contentVersion: 1, review: draft, sources: ['noaa-ocean-oxygen'] } as ContentRecord,
};

export const whaleSharkStatus = {
  text: 'Whale sharks are endangered. Fishing, getting caught in nets and being hit by ships are dangers for them.',
  record: { id: 'whale-shark-status', title: 'Whale sharks are listed as Endangered', contentVersion: 1, review: draft, sources: ['iucn-whale-shark'] } as ContentRecord,
};

// ── Narration ──────────────────────────────────────────────────────────────

export const OCEAN_LINES: Record<string, string> = {
  'oc-step-briefing': `${OCEAN_QUESTION} Today we swim off the reef into the open ocean, where the biggest fish in the world eats some of the smallest living things.`,
  'oc-step-dive': 'Out here there is only water. Use the magnifier to see the plankton, then meet the animals of the open ocean.',
  'oc-step-chain': 'Let’s build a food chain. Start with sunlight, then tap who comes next.',
  'oc-step-spawn': 'Every spring, whale sharks come to Gladden Spit in Belize. Make a prediction: when do they come, and why? Then test your idea.',
  'oc-step-explain': 'Now it’s your turn to explain. Answer three questions about what you learned.',
  'oc-step-recap': 'Phytoplankton use sunlight to make food, and the energy passes up the food chain. The biggest fish, the whale shark, eats plankton, and comes to Gladden Spit to eat snapper eggs.',
  'oc-chain-done': chainTwist.text,
  'oc-spawn-reveal': spawnReveal.explanation,
  'oc-oxygen': oxygenFact.text,
  'ocl-story': 'Let’s swim past the reef into the big blue ocean! Out here live the tiniest living things, and the biggest fish in the world.',
  'ocl-tiny': 'Look through the magnifier! Tap each tiny thing to meet it.',
  'ocl-feed': 'The whale shark is hungry! What does it eat? Tap the food.',
  'ocl-raft': 'Look up! A raft of floating seaweed. Who is hiding here? Tap to find them.',
  'ocl-done': 'You did it! The tiniest things feed the biggest fish. Remember, in the ocean we look at animals, but we never touch them.',
  ...Object.fromEntries(oceanAnimals.map((a) => [`oc-animal-${a.id}`, a.line])),
  ...Object.fromEntries(plankton.map((p) => [`oc-plankton-${p.id}`, p.line])),
  ...Object.fromEntries(feedItems.map((f) => [`ocl-feed-${f.id}`, f.line])),
};

/** Every content record in Expedition 3, for validation and the release gate. */
export const oceanRecords: ContentRecord[] = [
  ...oceanAnimals,
  ...plankton,
  chainRecord,
  chainTwist.record,
  spawnReveal.record,
  oxygenFact.record,
  whaleSharkStatus.record,
];
