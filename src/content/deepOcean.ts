/**
 * Expedition 4 — "Into the Deep": a dive straight down from the open water,
 * through the sunlight, twilight and midnight zones. Light fades, the water
 * gets colder and the pressure grows, and the animals that live down there
 * make their own light. Two levels share one dive: Little Explorers (TK–2)
 * and Grades 3–6.
 */
import type { ChoiceOption, ContentRecord, FoodChoiceItem, PredictionOption, RubricLevel } from './types.ts';

const draft = { status: 'draft' as const };

export const DEEP_TITLE = 'Into the Deep';
export const DEEP_QUESTION = 'What changes as we dive deeper, and how do animals live in the dark?';
export const DEEP_OBJECTIVE =
  'Students compare the sunlight, twilight and midnight zones, and explain how deep-sea animals use their own light to find food and stay hidden.';

/** The objective, said to the class. */
export const DEEP_INTRO =
  'Today you’ll dive through three ocean zones, see how light, cold and pressure change, and find out how deep-sea animals use their own light.';

export type DeepLevel = 'older' | 'little';
export type DeepStepKind = 'briefing' | 'descend' | 'sort' | 'glow' | 'explain' | 'recap';
/** The three zones of the dive, from the surface down. */
export type DeepZone = 'sunlight' | 'twilight' | 'midnight';

export interface DeepStep {
  id: string;
  kind: DeepStepKind;
  label: string;
  time: string;
  instruction: string;
  narrationId: string;
  teacherNotes: string[];
  prompts: string[];
}

export interface ZoneInfo {
  id: DeepZone;
  title: string;
  depth: string;
  /** Simplified depth shown on the gauge, in meters. */
  gauge: number;
  light: string;
  cold: string;
  pressure: string;
  arrival: string;
}

/**
 * Depth bands from NOAA. Pressure from NOAA's rule of thumb (about one more
 * atmosphere for every 10 meters), given at the bottom of each zone.
 */
export const zones: ZoneInfo[] = [
  {
    id: 'sunlight',
    title: 'Sunlight zone',
    depth: '0–200 m',
    gauge: 50,
    light: 'Bright. Enough sunlight for phytoplankton to make food.',
    cold: 'The warmest water, near the surface.',
    pressure: 'Up to about 20 times the air pressure we feel.',
    arrival: 'The sunlight zone: bright water near the surface. This is where phytoplankton use sunlight to make food.',
  },
  {
    id: 'twilight',
    title: 'Twilight zone',
    depth: '200–1,000 m',
    gauge: 500,
    light: 'Dim blue light. Too little for phytoplankton.',
    cold: 'Colder and colder as we go down.',
    pressure: 'Up to about 100 times the air pressure we feel.',
    arrival: 'The twilight zone: only a dim blue glow from above. Many animals here make their own light.',
  },
  {
    id: 'midnight',
    title: 'Midnight zone',
    depth: '1,000–4,000 m',
    gauge: 2000,
    light: 'No sunlight at all. The only light is made by animals.',
    cold: 'About 4 °C, all the time: as cold as a fridge.',
    pressure: 'Up to about 400 times the air pressure we feel.',
    arrival: 'The midnight zone: completely dark and very cold. The only light down here comes from animals.',
  },
];
export const zoneById = new Map(zones.map((z) => [z.id, z]));
export const zoneOrder: DeepZone[] = zones.map((z) => z.id);

export const olderDeepSteps: DeepStep[] = [
  {
    id: 'dz-briefing',
    kind: 'briefing',
    label: 'Briefing',
    time: '0:00–1:00',
    instruction: `Our question: ${DEEP_QUESTION}`,
    narrationId: 'dz-step-briefing',
    teacherNotes: [
      'We dive straight down from the open water of Expedition 3. The deepest parts of the ocean are among the least explored places on Earth.',
      'Ask what will change as we go down. Collect ideas (darker, colder, more pressure) and check them on the dive.',
    ],
    prompts: ['What do you think will change as we dive deeper?', 'Could anything live where there is no sunlight?'],
  },
  {
    id: 'dz-descend',
    kind: 'descend',
    label: 'Dive down',
    time: '1:00–3:00',
    instruction: 'Dive through all three zones. Watch the gauge, and tap the animals you meet.',
    narrationId: 'dz-step-descend',
    teacherNotes: [
      'The gauge shows the depth, light, cold and pressure in each zone. The scene is not to scale: the real midnight zone is kilometers deep.',
      'Tap the animals at each zone. Notice the light getting dimmer as we go down.',
    ],
    prompts: ['What changed between the zones?', 'Why do you think there are no phytoplankton in the deep zones?'],
  },
  {
    id: 'dz-sort',
    kind: 'sort',
    label: 'Zone clues',
    time: '3:00–5:00',
    instruction: 'Which zone is each clue about? Tap a zone for every card.',
    narrationId: 'dz-step-sort',
    teacherNotes: [
      'Let the class argue each card before tapping. A wrong tap gets a hint, then try again.',
      'After the last card, share the twist: the daily migration up and down.',
    ],
    prompts: ['How did you decide?', 'Which clue was the trickiest?'],
  },
  {
    id: 'dz-glow',
    kind: 'glow',
    label: 'Lights out',
    time: '5:00–7:00',
    instruction: 'Predict: why do deep-sea animals make light? Then switch off our lights and look.',
    narrationId: 'dz-step-glow',
    teacherNotes: [
      'Record one class prediction before switching the lights off.',
      'Our lights are like a submarine’s. With them off, all you can see is the light the animals make.',
      'Key idea: animals use light to find food, to hide, and to signal to each other.',
    ],
    prompts: ['Which animal’s light would you follow?', 'How could light help an animal hide?'],
  },
  {
    id: 'dz-explain',
    kind: 'explain',
    label: 'Explain',
    time: '7:00–9:00',
    instruction: 'Answer three questions about what you learned.',
    narrationId: 'dz-step-explain',
    teacherNotes: ['Question 3 is for discussion: any animal, any challenge (dark, cold, pressure or little food) counts if it is linked to how the animal copes.'],
    prompts: ['How do you know?', 'What would you tell a friend?'],
  },
  {
    id: 'dz-recap',
    kind: 'recap',
    label: 'Recap',
    time: '9:00+',
    instruction: 'Look back at our question.',
    narrationId: 'dz-step-recap',
    teacherNotes: ['End with marine snow: even in the dark, food comes from the sunlight zone.'],
    prompts: ['What surprised you?', 'What would you want to explore down there?'],
  },
];

export const littleDeepSteps: DeepStep[] = [
  {
    id: 'dzl-story',
    kind: 'briefing',
    label: 'Story',
    time: '0:00–1:00',
    instruction: 'Let’s dive down, down, down into the deep sea!',
    narrationId: 'dzl-story',
    teacherNotes: ['Ask: what do you think it is like at the very bottom of the ocean?'],
    prompts: ['Is it light or dark down deep?'],
  },
  {
    id: 'dzl-descend',
    kind: 'descend',
    label: 'Dive down',
    time: '1:00–3:00',
    instruction: 'Tap “Dive deeper!” Then tap the animal you meet.',
    narrationId: 'dzl-descend',
    teacherNotes: ['One child taps “Dive deeper!”, another taps the animal. Count the zones together: one, two, three.'],
    prompts: ['Is it getting lighter or darker?'],
  },
  {
    id: 'dzl-glow',
    kind: 'glow',
    label: 'Lights out',
    time: '3:00–5:00',
    instruction: 'Turn off our lights! Tap the three animals that glow.',
    narrationId: 'dzl-glow',
    teacherNotes: ['With our lights off, only the animals’ own light shows. One child per glowing animal.'],
    prompts: ['How many glowing animals can you find?'],
  },
  {
    id: 'dzl-done',
    kind: 'recap',
    label: 'Well done',
    time: '5:00+',
    instruction: 'You dove all the way to the midnight zone!',
    narrationId: 'dzl-done',
    teacherNotes: ['Celebrate! Remind the class: in the ocean we look at animals, but never touch them.'],
    prompts: [],
  },
];

export const deepStepsFor = (level: DeepLevel) => (level === 'little' ? littleDeepSteps : olderDeepSteps);

// ── Animals of the deep ────────────────────────────────────────────────────

export interface DeepAnimal extends ContentRecord {
  zone: DeepZone;
  /** One short line read aloud when tapped. */
  line: string;
  /** Makes its own light: shows in the dark with our lights off. */
  glows: boolean;
}

export const deepAnimals: DeepAnimal[] = [
  {
    id: 'phytoplankton-cloud',
    title: 'Phytoplankton',
    zone: 'sunlight',
    glows: false,
    line: 'Phytoplankton! They live only in the sunlight zone, where there is light to make food.',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-light-travel', 'noaa-phytoplankton'],
  },
  {
    id: 'diving-whale-shark',
    title: 'Whale shark',
    zone: 'sunlight',
    glows: false,
    line: 'A whale shark! It feeds near the surface, but scientists tracked one diving almost 2,000 meters deep.',
    contentVersion: 1,
    review: draft,
    sources: ['tyminski-2015-whale-shark-dives'],
  },
  {
    id: 'lanternfish',
    title: 'Lanternfish',
    zone: 'twilight',
    glows: true,
    line: 'Lanternfish! Tiny lights on their bellies help them hide. At night they swim up to feed.',
    contentVersion: 1,
    review: draft,
    sources: ['whoi-lanternfish', 'noaa-oe-migration'],
  },
  {
    id: 'hatchetfish',
    title: 'Hatchetfish',
    zone: 'twilight',
    glows: true,
    line: 'A hatchetfish! Its belly glows like the light from above, so hunters below can’t see its shadow.',
    contentVersion: 1,
    review: draft,
    sources: ['whoi-fish-flashlights'],
  },
  {
    id: 'anglerfish',
    title: 'Anglerfish',
    zone: 'midnight',
    glows: true,
    line: 'An anglerfish! It dangles a glowing lure to attract food in the dark.',
    contentVersion: 1,
    review: draft,
    sources: ['si-anglerfish'],
  },
  {
    id: 'gulper-eel',
    title: 'Gulper eel',
    zone: 'midnight',
    glows: true,
    line: 'A gulper eel! Its huge mouth catches any food it finds, because food is hard to find down here.',
    contentVersion: 1,
    review: draft,
    sources: ['whoi-pelican-eel'],
  },
  {
    id: 'atolla-jelly',
    title: 'Atolla jelly',
    zone: 'midnight',
    glows: true,
    line: 'An Atolla jelly! If something grabs it, it flashes rings of blue light, like a burglar alarm.',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-oe-atolla'],
  },
  {
    id: 'marine-snow',
    title: 'Marine snow',
    zone: 'midnight',
    glows: false,
    line: 'Marine snow! Bits of food drift down from the sunlight zone. Many deep-sea animals eat it.',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-marine-snow'],
  },
];

export const deepAnimalById = new Map(deepAnimals.map((a) => [a.id, a]));
export const isDeepAnimal = (id: string) => deepAnimalById.has(id);
export const deepAnimalsAt = (zone: DeepZone) => deepAnimals.filter((a) => a.zone === zone);
/** What the Little Explorers look for with the lights off. */
export const glowFinds = ['anglerfish', 'atolla-jelly', 'gulper-eel'];
/** The one animal each Little Explorers zone introduces. */
export const littleZoneAnimal: Record<DeepZone, string> = { sunlight: 'diving-whale-shark', twilight: 'lanternfish', midnight: 'anglerfish' };

export const zonesRecord: ContentRecord = {
  id: 'ocean-zones',
  title: 'Sunlight zone 0–200 m, twilight zone 200–1,000 m, midnight zone 1,000–4,000 m; light, cold and pressure',
  contentVersion: 1,
  review: draft,
  sources: ['noaa-light-travel', 'noaa-ocean-layers', 'noaa-pressure'],
};

// ── Zone clues (Grades 3–6) ────────────────────────────────────────────────

export interface ZoneClue {
  id: string;
  text: string;
  zone: DeepZone;
  /** Said after a wrong tap. */
  hint: string;
}

export const zoneClues: ZoneClue[] = [
  { id: 'food', text: 'Phytoplankton use sunlight here to make food.', zone: 'sunlight', hint: 'Phytoplankton need plenty of sunlight. Where is it brightest?' },
  { id: 'dim', text: 'A dim blue glow from above, but too little light for phytoplankton.', zone: 'twilight', hint: 'There is still a little light here. Which zone is in between?' },
  { id: 'dark', text: 'Completely dark. The only light is made by animals.', zone: 'midnight', hint: 'No sunlight at all reaches this zone. Which is deepest?' },
  { id: 'cold', text: 'About 4 °C all the time, as cold as a fridge.', zone: 'midnight', hint: 'The water gets colder the deeper you go.' },
  { id: 'hide', text: 'Lanternfish hide here by day, then swim up at night to feed.', zone: 'twilight', hint: 'Lanternfish live in the zone with a little light left.' },
];
export const zoneClueById = new Map(zoneClues.map((c) => [c.id, c]));

export const migrationTwist = {
  title: 'Here’s a twist',
  text: 'Every night, lanternfish and many other animals swim up toward the sunlight zone to feed, then sink back down by morning. Scientists call it the biggest migration on Earth.',
  record: {
    id: 'daily-migration',
    title: 'Each night many twilight-zone animals swim up to feed, the largest migration on Earth',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-oe-migration', 'whoi-lanternfish'],
  } as ContentRecord,
};

// ── Lights out: why make light? ────────────────────────────────────────────

export const glowPrediction: { prompt: string; options: PredictionOption[] } = {
  prompt: 'Why do you think deep-sea animals make their own light?',
  options: [
    { id: 'food', label: 'To find or attract food', plausible: true, response: 'Yes, that’s one way scientists found!' },
    { id: 'hide', label: 'To hide from hunters', plausible: true, response: 'Yes, that’s one way scientists found!' },
    { id: 'signal', label: 'To signal to each other', plausible: true, response: 'Yes, that’s one way scientists found!' },
    { id: 'unsure', label: 'We’re not sure yet', plausible: true, response: 'Good thinking. Let’s look!' },
  ],
};

export const glowReveal = {
  badge: 'Simplified example',
  on: 'Our lights are on: we can see the animals’ bodies.',
  off: 'Our lights are off: all you can see is the light the animals make.',
  explanation:
    'Scientists found animals use their light in many ways. The anglerfish’s glowing lure attracts food. Lanternfish and hatchetfish glow on their bellies to hide their shadows from hunters below. And light can help animals signal to each other.',
  record: {
    id: 'bioluminescence-uses',
    title: 'Deep-sea animals use light to attract food, to hide, and to signal',
    contentVersion: 1,
    review: draft,
    sources: ['si-bioluminescence', 'si-anglerfish', 'whoi-fish-flashlights'],
  } as ContentRecord,
};

// ── Exit questions (Grades 3–6) ────────────────────────────────────────────

const opts = (o: ChoiceOption[]) => o;

export const deepExitLight: FoodChoiceItem = {
  id: 'dz-exit-light',
  relationship: 'ocean-zones',
  prompt: 'Why are there no phytoplankton in the midnight zone?',
  options: opts([
    { id: 'a', label: 'There is no sunlight for them to make food', correct: true, feedback: 'Yes! Phytoplankton need sunlight, and it never reaches the midnight zone.' },
    { id: 'b', label: 'The water is too salty', correct: false, feedback: 'Not quite. Think about what phytoplankton need to make food.' },
    { id: 'c', label: 'Anglerfish eat them all', correct: false, feedback: 'Not quite. What is missing in the midnight zone?' },
  ]),
  explanation: 'Phytoplankton use sunlight to make food, so they live only in the sunlight zone. No sunlight reaches the midnight zone.',
};

export const deepExitLure: FoodChoiceItem = {
  id: 'dz-exit-lure',
  relationship: 'bioluminescence-uses',
  prompt: 'What does an anglerfish use its glowing lure for?',
  options: opts([
    { id: 'a', label: 'To light up the sea floor', correct: false, feedback: 'Not quite. Think about what the anglerfish is fishing for.' },
    { id: 'b', label: 'To attract food in the dark', correct: true, feedback: 'Yes! Animals swim toward the light, and the anglerfish catches them.' },
    { id: 'c', label: 'To keep warm', correct: false, feedback: 'Not quite. Animal light gives off almost no heat.' },
  ]),
  explanation: 'The anglerfish’s lure glows in the dark. Animals come close to the light, and the anglerfish catches them.',
};

export const deepActions = {
  prompt: 'Pick a deep-sea animal. How does it survive down there?',
  choices: [
    { id: 'anglerfish', label: 'Anglerfish', need: 'it is dark and food is hard to find' },
    { id: 'lanternfish', label: 'Lanternfish', need: 'hunters lurk below in the dim light' },
    { id: 'gulper-eel', label: 'Gulper eel', need: 'food is hard to find in the deep' },
  ],
  rubric: [
    { score: 0, label: 'No relevant reasoning', example: '“It just does.”' },
    { score: 1, label: 'Names a feature of the animal', example: '“The anglerfish has a light.”' },
    { score: 2, label: 'Links the feature to a challenge of the deep', example: '“The anglerfish’s glowing lure attracts food, because it is dark and food is hard to find.”' },
  ] as RubricLevel[],
};

export const deepChoiceItems: FoodChoiceItem[] = [deepExitLight, deepExitLure];

// ── Did you know? ──────────────────────────────────────────────────────────

export const marineSnowFact = {
  title: 'Did you know?',
  text: 'Even in the dark, food comes from above. Bits of dead plankton and other food sink down like snow. Scientists call it marine snow.',
  record: { id: 'marine-snow-food', title: 'Marine snow from the upper ocean feeds deep-sea animals', contentVersion: 1, review: draft, sources: ['noaa-marine-snow'] } as ContentRecord,
};

export const pressureFact = {
  text: 'Every 10 meters down, the water presses on you with about one more atmosphere: as much again as all the air above us.',
  record: { id: 'ocean-pressure', title: 'Pressure grows by about one atmosphere every 10 meters', contentVersion: 1, review: draft, sources: ['noaa-pressure'] } as ContentRecord,
};

// ── Narration ──────────────────────────────────────────────────────────────

export const DEEP_LINES: Record<string, string> = {
  'dz-step-briefing': `${DEEP_QUESTION} Today we dive straight down from the open ocean, through three zones, into the dark.`,
  'dz-step-descend': 'Let’s dive! Watch the gauge as we go down through the sunlight, twilight and midnight zones, and tap the animals we meet.',
  'dz-step-sort': 'Which zone is each clue about? Talk it over, then tap a zone.',
  'dz-step-glow': 'Down here, many animals make their own light. Why do you think they do it? Make a prediction, then switch off our lights.',
  'dz-step-explain': 'Now it’s your turn to explain. Answer three questions about what you learned.',
  'dz-step-recap': 'As we dive deeper, the light fades, the water gets colder and the pressure grows. In the dark, many animals make their own light, to find food and to hide.',
  'dz-sort-done': migrationTwist.text,
  'dz-glow-reveal': glowReveal.explanation,
  'dz-marine-snow': marineSnowFact.text,
  'dzl-story': 'Let’s dive down, down, down into the deep sea! It gets darker and colder the deeper we go.',
  'dzl-descend': 'Tap “Dive deeper!” to go down. Then tap the animal you meet.',
  'dzl-glow': 'It’s dark down here! Let’s turn off our lights. Tap the animals that glow.',
  'dzl-done': 'You dove all the way to the midnight zone! Remember, in the ocean we look at animals, but we never touch them.',
  ...Object.fromEntries(zones.map((z) => [`dz-zone-${z.id}`, z.arrival])),
  ...Object.fromEntries(deepAnimals.map((a) => [`dz-animal-${a.id}`, a.line])),
};

/** Every content record in Expedition 4, for validation and the release gate. */
export const deepRecords: ContentRecord[] = [
  ...deepAnimals,
  zonesRecord,
  migrationTwist.record,
  glowReveal.record,
  marineSnowFact.record,
  pressureFact.record,
];
