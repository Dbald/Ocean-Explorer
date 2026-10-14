/**
 * Expedition 2 — "The Changing Reef": sargassum, pollution and warming water,
 * told through Belize's reef. Two levels share one scene: Little Explorers
 * (TK–2) and Grades 3–6. Claims follow the research: extra nutrients from land,
 * ocean currents and warmer water all play a part, and scientists are still
 * investigating — warming alone does not explain the bloom.
 */
import type { ChoiceOption, ContentRecord, FoodChoiceItem, HabitatId, PredictionOption, RubricLevel } from './types.ts';

const draft = { status: 'draft' as const };

export const CHANGING_TITLE = 'The Changing Reef';
export const CHANGING_QUESTION = 'What’s changing on Belize’s reef?';
export const CHANGING_OBJECTIVE =
  'Students describe how too much sargassum and pollution can harm the reef, explain where the extra sargassum comes from, and name ways people can help.';

export type ChangingLevel = 'older' | 'little';

export type ChangingStepKind = 'briefing' | 'belt' | 'causes' | 'reef' | 'cleanup' | 'seaweed' | 'help' | 'explain' | 'recap';

export interface ChangingStep {
  id: string;
  kind: ChangingStepKind;
  label: string;
  time: string;
  instruction: string;
  narrationId: string;
  teacherNotes: string[];
  prompts: string[];
}

export const olderSteps: ChangingStep[] = [
  {
    id: 'ch-briefing',
    kind: 'briefing',
    label: 'Briefing',
    time: '0:00–1:00',
    instruction: `Our question: ${CHANGING_QUESTION} Share what you know about seaweed on beaches.`,
    narrationId: 'ch-step-briefing',
    teacherNotes: [
      'Ask who has seen seaweed piled on a beach. Take a few ideas.',
      'If you have your own photos or stories from Belize, this is the moment to share them.',
    ],
    prompts: ['Have you ever seen seaweed on a beach?', 'Where do you think it comes from?'],
  },
  {
    id: 'ch-belt',
    kind: 'belt',
    label: 'The belt',
    time: '1:00–3:00',
    instruction: 'Look at the map. Compare the years. How has the sargassum belt changed?',
    narrationId: 'ch-step-belt',
    teacherNotes: [
      'Step through the three snapshots: before 2011, 2018 and 2025. The band’s size is drawn to scale between 2018 and 2025.',
      'Point out the currents carrying sargassum west into the Caribbean, all the way to Belize.',
      'This is a simplified drawing based on satellite studies, not a live satellite map.',
    ],
    prompts: ['What do you notice from year to year?', 'Which way does the sargassum travel?'],
  },
  {
    id: 'ch-causes',
    kind: 'causes',
    label: 'What feeds it?',
    time: '3:00–5:00',
    instruction: 'Predict what makes sargassum grow so much. Then turn each factor on and off to see what it does.',
    narrationId: 'ch-step-causes',
    teacherNotes: [
      'Record one class prediction first, then let students turn the factors on and off.',
      'The model is a simplified example: it shows the idea, not real amounts.',
      'Key idea: scientists think extra nutrients from land are a big part, with currents and warmer water too. They are still investigating — there is no single cause.',
    ],
    prompts: ['What happens with no extra nutrients?', 'What happens without the currents?'],
  },
  {
    id: 'ch-reef',
    kind: 'reef',
    label: 'Our reef',
    time: '5:00–7:00',
    instruction: 'Back at our reef: compare it with and without too much sargassum. Then clean up the trash.',
    narrationId: 'ch-step-reef',
    teacherNotes: [
      'Toggle the view, and visit all three stops: the shade over coral and seagrass, and the piles on the sand.',
      'Share the twist: out in the open ocean, sargassum is a home. Too much near shore is the problem.',
      'Students can tap trash to clean it up — every piece has a fact.',
    ],
    prompts: ['What does too much sargassum block?', 'Why might animals leave?'],
  },
  {
    id: 'ch-explain',
    kind: 'explain',
    label: 'Explain',
    time: '7:00–9:00',
    instruction: 'Answer three questions about what you learned.',
    narrationId: 'ch-step-explain',
    teacherNotes: ['Question 3 is for discussion — any action connected to trash, nutrients or learning more counts.'],
    prompts: ['How do you know?', 'What would you tell a friend?'],
  },
  {
    id: 'ch-recap',
    kind: 'recap',
    label: 'Recap',
    time: '9:00+',
    instruction: 'Look back at our question — and look beyond Belize.',
    narrationId: 'ch-step-recap',
    teacherNotes: ['End with the Los Angeles example: warmer water is changing where animals live, far from Belize too.'],
    prompts: ['What surprised you?', 'What could our class do?'],
  },
];

export const littleSteps: ChangingStep[] = [
  {
    id: 'chl-story',
    kind: 'briefing',
    label: 'Story',
    time: '0:00–1:00',
    instruction: 'Something is changing in Belize’s ocean. Let’s find out what!',
    narrationId: 'ch-little-story',
    teacherNotes: ['Keep it short and cheerful. If you have photos from Belize, show them here.'],
    prompts: ['Have you been to a beach?'],
  },
  {
    id: 'chl-cleanup',
    kind: 'cleanup',
    label: 'Clean up',
    time: '1:00–4:00',
    instruction: 'Help clean the reef! Come up and tap the trash.',
    narrationId: 'ch-little-cleanup',
    teacherNotes: ['One child per piece of trash. There are twelve pieces across the three stops — use the stop buttons to move on.'],
    prompts: ['Who can find some trash?'],
  },
  {
    id: 'chl-seaweed',
    kind: 'seaweed',
    label: 'Seaweed',
    time: '4:00–6:00',
    instruction: 'Too much seaweed! Tap the button to see what happens.',
    narrationId: 'ch-little-seaweed',
    teacherNotes: ['Toggle the seaweed on and off. Ask: is it darker or lighter under the seaweed?'],
    prompts: ['Is it lighter or darker?', 'What do plants need?'],
  },
  {
    id: 'chl-help',
    kind: 'help',
    label: 'Helpers',
    time: '6:00–8:00',
    instruction: 'How can we help the ocean? Tap each card.',
    narrationId: 'ch-little-help',
    teacherNotes: ['Every card is a good answer. Invite a different child to tap each one.'],
    prompts: ['Which one can you do this week?'],
  },
  {
    id: 'chl-done',
    kind: 'recap',
    label: 'Well done',
    time: '8:00+',
    instruction: 'You helped the reef!',
    narrationId: 'ch-little-done',
    teacherNotes: ['Celebrate! Remind the class: in the real ocean we look at animals, but never touch them.'],
    prompts: [],
  },
];

export const stepsFor = (level: ChangingLevel) => (level === 'little' ? littleSteps : olderSteps);

// ── The sargassum belt over time ───────────────────────────────────────────

export interface BeltSnapshot extends ContentRecord {
  label: string;
  text: string;
  /** Visual size of the band, relative to 2025 (2018 ≈ 20/38). Not a measurement. */
  amount: number;
  narrationId: string;
}

export const beltSnapshots: BeltSnapshot[] = [
  {
    id: 'belt-before',
    title: 'Before 2011',
    label: 'Before 2011',
    text: 'Before 2011, scientists did not see big belts of sargassum across this part of the Atlantic.',
    amount: 0.04,
    narrationId: 'ch-belt-before',
    contentVersion: 1,
    review: draft,
    sources: ['wang-2019-belt'],
  },
  {
    id: 'belt-2018',
    title: '2018',
    label: '2018',
    text: 'In 2018 the belt stretched about 8,850 kilometers, from Africa to the Gulf of Mexico, with more than 20 million tons of sargassum.',
    amount: 20 / 38,
    narrationId: 'ch-belt-2018',
    contentVersion: 1,
    review: draft,
    sources: ['wang-2019-belt'],
  },
  {
    id: 'belt-2025',
    title: '2025',
    label: '2025',
    text: 'In May 2025 there was a record: about 38 million tons — the most since scientists started studying the belt.',
    amount: 1,
    narrationId: 'ch-belt-2025',
    contentVersion: 1,
    review: draft,
    sources: ['ap-2025-record'],
  },
];

// ── What feeds the bloom ───────────────────────────────────────────────────

export type CauseId = 'nutrients' | 'warm' | 'currents';

export interface Cause extends ContentRecord {
  id: CauseId;
  label: string;
  short: string;
  explain: string;
}

export const causes: Cause[] = [
  {
    id: 'nutrients',
    title: 'Extra nutrients from land',
    label: 'Extra nutrients',
    short: 'Rivers, farm fertilizer, sewage and dust',
    explain: 'Rivers like the Amazon, fertilizer and sewage washing off land, and dust blowing from Africa add nutrients — food for seaweed.',
    contentVersion: 1,
    review: draft,
    sources: ['wang-2019-belt', 'fau-nitrogen'],
  },
  {
    id: 'warm',
    title: 'Warmer water',
    label: 'Warmer water',
    short: 'Sunlight and warm seas',
    explain: 'Sargassum grows in warm, sunny water. Warming changes where it grows best — it can help in some places and hurt in others.',
    contentVersion: 1,
    review: draft,
    sources: ['globe-shifting-climate'],
  },
  {
    id: 'currents',
    title: 'Ocean currents',
    label: 'Ocean currents',
    short: 'Moving water carries it west',
    explain: 'Ocean currents carry the floating sargassum west across the Atlantic and into the Caribbean — all the way to Belize.',
    contentVersion: 1,
    review: draft,
    sources: ['wang-2019-belt'],
  },
];

export const causesPrediction: { prompt: string; options: PredictionOption[] } = {
  prompt: 'What do you think makes sargassum grow so much?',
  options: [
    { id: 'nutrients', label: 'Extra nutrients washing off land', plausible: true, response: 'Scientists agree this is a big part of it.' },
    { id: 'warm', label: 'Warmer water', plausible: true, response: 'Warm water matters too — but it isn’t the whole story.' },
    { id: 'currents', label: 'Ocean currents', plausible: true, response: 'Currents decide where it goes — that’s how it reaches Belize.' },
    { id: 'unsure', label: 'We’re not sure yet', plausible: true, response: 'Good thinking — scientists are still investigating too!' },
  ],
};

export const causesReveal =
  'Scientists think extra nutrients from land are a big part of it. Ocean currents carry the sargassum to Belize, and warmer water plays a part too. There isn’t one single cause — scientists are still investigating.';

// ── Back at the reef ───────────────────────────────────────────────────────

export const reefEffects: Record<HabitatId, string> = {
  reef: 'Thick mats float on top and block sunlight. Coral needs sunlight, because the tiny algae living inside it make its food from sunlight.',
  seagrass: 'Seagrass is a plant. Under thick mats it gets less sunlight to make its food.',
  sand: 'Near the shore, sargassum piles up on the sand and on beaches, and rots. Rotting seaweed uses up oxygen in the water and gives off a smelly gas, so grown-ups clean it up with gloves.',
};

export const reefEffectsRecord: ContentRecord = {
  id: 'reef-effects',
  title: 'Effects of too much sargassum near shore',
  contentVersion: 1,
  review: draft,
  sources: ['sanpedrosun-2025', 'epa-sargassum-health', 'noaa-coral-animal'],
};

export const sargassumTwist = {
  title: 'But here’s a twist',
  text: 'Out in the open ocean, floating sargassum is a home for baby sea turtles and young fish. It’s too much piling up near shore that causes harm.',
  record: { id: 'sargassum-habitat', title: 'Sargassum as open-ocean habitat', contentVersion: 1, review: draft, sources: ['noaa-sargassum-habitat'] } as ContentRecord,
};

/** Trash to clean up. Positions are set by the scene; facts are sourced. */
export interface LitterItem extends ContentRecord {
  kind: 'bag' | 'bottle' | 'net' | 'line';
  stop: HabitatId;
  name: string;
  fact: string;
}

const litterFacts: Record<LitterItem['kind'], { name: string; fact: string; sources: string[] }> = {
  bag: { name: 'plastic bag', fact: 'Sea turtles can mistake plastic bags for jellyfish and try to eat them.', sources: ['noaa-debris-turtles'] },
  bottle: { name: 'plastic bottle', fact: 'Plastic breaks into tiny pieces that can harm ocean animals.', sources: ['noaa-microplastics'] },
  net: { name: 'old fishing net', fact: 'Old fishing nets can trap animals and damage coral.', sources: ['noaa-derelict-gear'] },
  line: { name: 'fishing line', fact: 'Fishing line can tangle around animals.', sources: ['noaa-derelict-gear'] },
};

const litterPlan: [LitterItem['kind'], HabitatId][] = [
  ['bag', 'reef'],
  ['bottle', 'reef'],
  ['net', 'reef'],
  ['line', 'reef'],
  ['bottle', 'reef'],
  ['bag', 'seagrass'],
  ['bottle', 'seagrass'],
  ['line', 'seagrass'],
  ['bag', 'seagrass'],
  ['bottle', 'sand'],
  ['bag', 'sand'],
  ['line', 'sand'],
];

export const litter: LitterItem[] = litterPlan.map(([kind, stop], i) => ({
  id: `litter-${i + 1}`,
  title: litterFacts[kind].name,
  kind,
  stop,
  name: litterFacts[kind].name,
  fact: litterFacts[kind].fact,
  contentVersion: 1,
  review: draft,
  sources: litterFacts[kind].sources,
}));

export const litterById = new Map(litter.map((l) => [l.id, l]));
export const isLitterId = (id: string) => id.startsWith('litter-');

// ── Helping ────────────────────────────────────────────────────────────────

export const helpers = [
  { id: 'bin', icon: '🗑️', label: 'Put trash in a bin', line: 'Put trash in a bin, so it never reaches the ocean.' },
  { id: 'grownup', icon: '🧑‍🤝‍🧑', label: 'Let grown-ups clean the seaweed', line: 'If seaweed piles up on the beach, let grown-ups clean it up safely.' },
  { id: 'look', icon: '👀', label: 'Look, don’t touch', line: 'In the ocean, we look at animals, but we never touch them.' },
  { id: 'share', icon: '💬', label: 'Tell others', line: 'Tell your family what you learned about the ocean.' },
];

// ── Exit questions (Grades 3–6) ────────────────────────────────────────────

const opts = (o: ChoiceOption[]) => o;

export const changingExitFood: FoodChoiceItem = {
  id: 'ch-exit-nutrients',
  relationship: 'cause-nutrients',
  prompt: 'Where does a lot of the extra “food” for sargassum come from?',
  options: opts([
    { id: 'a', label: 'Nutrients washing off land in rivers, plus dust in the wind', correct: true, feedback: 'Yes! Rivers, fertilizer, sewage and dust add nutrients that feed the seaweed.' },
    { id: 'b', label: 'Sand on the beach', correct: false, feedback: 'Not quite. Sand doesn’t feed seaweed. Think about what washes off land into rivers.' },
    { id: 'c', label: 'Fish eating it', correct: false, feedback: 'Not quite. Fish eating seaweed would make less of it, not more.' },
  ]),
  explanation: 'Extra nutrients from land are a big part of the story, with currents and warmer water too.',
};

export const changingExitTwist: FoodChoiceItem = {
  id: 'ch-exit-twist',
  relationship: 'sargassum-habitat',
  prompt: 'Is sargassum always bad?',
  options: opts([
    { id: 'a', label: 'Yes, it is always bad', correct: false, feedback: 'Not quite. Remember the twist — out in the open ocean it’s a home.' },
    { id: 'b', label: 'No — in the open ocean it’s a home for baby turtles and young fish', correct: true, feedback: 'Yes! It’s too much piling up near shore that causes harm.' },
  ]),
  explanation: 'Sargassum is habitat out at sea; too much near shore blocks light and uses up oxygen as it rots.',
};

export const changingActions = {
  prompt: 'What could people do to help Belize’s reef?',
  choices: [
    { id: 'trash', label: 'Keep trash out of the ocean', need: 'trash can hurt turtles, fish and coral' },
    { id: 'nutrients', label: 'Use less fertilizer and keep sewage out of rivers', need: 'extra nutrients feed the seaweed' },
    { id: 'science', label: 'Support scientists who track sargassum', need: 'tracking helps people prepare for it' },
  ],
  rubric: [
    { score: 0, label: 'No relevant reasoning', example: '“Because.”' },
    { score: 1, label: 'Names an action', example: '“Pick up trash.”' },
    { score: 2, label: 'Links an action to how it helps the reef', example: '“Use less fertilizer, because nutrients feed the seaweed.”' },
  ] as RubricLevel[],
};

/** Choice items checked automatically (shared with the lesson controller). */
export const changingChoiceItems: FoodChoiceItem[] = [changingExitFood, changingExitTwist];

// ── Beyond Belize ──────────────────────────────────────────────────────────

export const beyondBelize = {
  title: 'Not just Belize',
  text: 'Far away in Los Angeles, a marine heatwave in 2026 brought warm-water fish and sharks that usually live farther south. When ocean water warms, animals can move — and habitats change.',
  record: { id: 'beyond-belize', title: 'Warming water changes where animals live', contentVersion: 1, review: draft, sources: ['abc7-la-heatwave', 'accuweather-la-sharks'] } as ContentRecord,
};

export const CHANGING_LINES: Record<string, string> = {
  'ch-step-briefing': `${CHANGING_QUESTION} In Belize, more and more brown seaweed called sargassum is floating in and piling up on the beaches. Let’s find out why, and what it means for the reef.`,
  'ch-step-belt': 'This map shows a giant belt of sargassum floating across the Atlantic Ocean. Compare the years. Watch how ocean currents carry it west, all the way to Belize.',
  'ch-step-causes': 'What makes the sargassum grow so much? Make a prediction. Then turn each one on and off and watch what happens.',
  'ch-step-reef': 'We’re back at our reef. Compare it with and without too much sargassum. Then help clean up the trash.',
  'ch-step-explain': 'Now it’s your turn to explain. Answer three questions about what you learned.',
  'ch-step-recap': 'Too much sargassum and pollution can harm Belize’s reef. Extra nutrients, currents and warmer water all play a part. And people can help.',
  'ch-belt-before': beltSnapshots[0].text,
  'ch-belt-2018': beltSnapshots[1].text,
  'ch-belt-2025': beltSnapshots[2].text,
  'ch-causes-reveal': causesReveal,
  'ch-twist': sargassumTwist.text,
  'ch-beyond': beyondBelize.text,
  'ch-little-story': 'Something is changing in Belize’s ocean. There is trash in the water, and lots of brown seaweed floating in. Let’s help the reef!',
  'ch-little-cleanup': 'Help clean the reef! Come up and tap the trash.',
  'ch-little-thanks': 'Thank you! The reef is cleaner.',
  'ch-little-clean-stop': 'This spot is all clean! Let’s check the next one.',
  'ch-little-seaweed': 'This brown seaweed is called sargassum. Out in the deep ocean, it’s a home for baby sea turtles. But when too much floats in, it blocks the sunlight. Tap the button to see.',
  'ch-little-help': 'How can we help the ocean? Tap each card.',
  'ch-little-done': 'You helped the reef! Remember, in the ocean we look at animals, but we never touch them.',
  ...Object.fromEntries(helpers.map((h) => [`ch-help-${h.id}`, h.line])),
  ...Object.fromEntries((['bag', 'bottle', 'net', 'line'] as const).map((k) => [`ch-litter-${k}`, `${litterFacts[k].name[0].toUpperCase()}${litterFacts[k].name.slice(1)}! ${litterFacts[k].fact}`])),
};

/** Every content record in Expedition 2, for validation and the release gate. */
export const changingRecords: ContentRecord[] = [
  ...beltSnapshots,
  ...causes,
  reefEffectsRecord,
  sargassumTwist.record,
  beyondBelize.record,
  ...litter,
];
