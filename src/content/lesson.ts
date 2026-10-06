import type {
  ExitQuestion,
  FoodChoiceItem,
  GlossaryTerm,
  LessonStep,
  PredictionOption,
  StepId,
  VideoSegment,
} from './types.ts';

export const LESSON_TITLE = 'Belize: The Living Reef';
export const PRODUCT_NAME = 'Ocean Explorer';
export const GUIDING_QUESTION = 'What makes this reef a home?';
export const OBJECTIVE =
  'Students explain how a reef and the habitats next to it give organisms the food and shelter they need.';
export const COMPOSITE_NOTICE =
  'This is an educational scene inspired by Belize’s reef, seagrass and sand habitats. It is not a map or live view of a real reef.';

/** Explore → predict → manipulate → observe → explain, as five teachable steps plus a recap. */
export const steps: LessonStep[] = [
  {
    id: 'briefing',
    label: 'Briefing',
    time: '0:00–1:00',
    instruction: `Our question: ${GUIDING_QUESTION} Share a first idea as a class.`,
    narrationId: 'step-briefing',
    teacherNotes: [
      'Read the question aloud. Take two or three quick ideas — there are no wrong answers yet.',
      'Optionally type a short summary of the class’s first idea. It appears again in the recap so you can compare.',
      'Do not record student names.',
    ],
    prompts: ['What does any animal need to live somewhere?', 'What do you think a reef could give an animal?'],
  },
  {
    id: 'explore',
    label: 'Explore',
    time: '1:00–4:00',
    instruction: 'Visit the reef, the seagrass and the sand. Select each featured organism to learn about it.',
    narrationId: 'step-explore',
    teacherNotes: [
      'Use the stop buttons to move between the three habitats. Movement is instant if motion is reduced.',
      'Select organisms in the scene or from the list. Read the card, then ask the observation prompt.',
      'Five featured organisms: elkhorn coral, stoplight parrotfish, great barracuda (reef); green sea turtle (seagrass); queen conch (sand).',
    ],
    prompts: ['What do you notice?', 'What is this animal doing?', 'What might this place give it?'],
  },
  {
    id: 'connect',
    label: 'Connect',
    time: '4:00–6:00',
    instruction: 'Choose the arrow that shows how energy moves from food to consumer.',
    narrationId: 'step-connect',
    teacherNotes: [
      'Walk through the example first: the arrow points from the food to the one that eats it.',
      'Let the class discuss before you submit. Incorrect answers explain the relationship and allow a retry.',
      'These are separate food relationships, not one food chain.',
    ],
    prompts: ['Which one is the food? Which one is the consumer?', 'Which way does the energy move?'],
  },
  {
    id: 'investigate',
    label: 'Investigate',
    time: '6:00–8:00',
    instruction: 'Predict: what could happen to a small reef fish if there were fewer places to hide? Record a class prediction, then compare.',
    narrationId: 'step-investigate',
    teacherNotes: [
      'Take a quick show of hands, then record one class prediction. The comparison stays hidden until you do.',
      'Toggle Before/After as many times as you like. This is a simplified example, not a forecast.',
      'Shelter (green, dashed) is a different kind of relationship from feeding (orange arrows).',
    ],
    prompts: ['What changed in the coral?', 'What did the fish do?', 'What evidence supports our prediction?'],
  },
  {
    id: 'explain',
    label: 'Explain',
    time: '8:00–10:00',
    instruction: 'Answer three questions to explain what you learned.',
    narrationId: 'step-explain',
    teacherNotes: [
      'Question 1 gives instant feedback. Questions 2 and 3 are for discussion — accept qualified answers connected to shelter or food.',
      'Use the rubric for the protection choice. Any score you record describes the class discussion, not individual students.',
      'For individual checks, use paper responses or tallies — the app does not collect student data.',
    ],
    prompts: ['How do you know?', 'What evidence from the activity supports that?'],
  },
  {
    id: 'recap',
    label: 'Recap',
    time: '10:00+',
    instruction: 'Look back at our big question and what we found.',
    narrationId: 'step-recap',
    teacherNotes: [
      'Compare the class’s first idea with what they can explain now.',
      'Attempted, skipped and completed activities are listed separately. Skipped means not attempted.',
      'Use Restart lesson to clear all answers before the next class.',
    ],
    prompts: ['How has our answer to the question changed?', 'What would you still like to find out?'],
  },
];

export const stepIds: StepId[] = steps.map((s) => s.id);
export const stepById = new Map(steps.map((s) => [s.id, s]));

/** Worked example shown before the Connect activity. */
export const connectExample = {
  relationship: 'fr-smallfish-barracuda',
  text: 'Example: the great barracuda eats small fish. Energy moves from the small fish to the barracuda, so the arrow points from the food to the consumer.',
  arrow: ['Small fish', 'Great barracuda'] as const,
};

export const connectItems: FoodChoiceItem[] = [
  {
    id: 'connect-turtle',
    relationship: 'fr-seagrass-turtle',
    prompt: 'Adult green sea turtle and seagrass: which arrow is right?',
    options: [
      {
        id: 'a',
        label: 'Green sea turtle → Seagrass',
        correct: false,
        feedback: 'Not quite. The arrow points from the food to the consumer. The turtle eats the seagrass, so the arrow starts at the seagrass.',
      },
      {
        id: 'b',
        label: 'Seagrass → Green sea turtle',
        correct: true,
        feedback: 'Yes! Adult green sea turtles graze on seagrass, so energy moves from the seagrass to the turtle.',
      },
      {
        id: 'c',
        label: 'Sand → Green sea turtle',
        correct: false,
        feedback: 'Not quite. Sand is not food for the turtle. Think about what grows in the meadow where the turtle feeds.',
      },
    ],
    explanation: 'Adult green sea turtles graze on seagrass. Young turtles eat a wider mix of foods.',
  },
  {
    id: 'connect-parrotfish',
    relationship: 'fr-algae-parrotfish',
    prompt: 'Stoplight parrotfish and algae: which arrow is right?',
    options: [
      {
        id: 'a',
        label: 'Algae → Stoplight parrotfish',
        correct: true,
        feedback: 'Yes! The stoplight parrotfish scrapes algae off rock and dead coral, so energy moves from the algae to the fish.',
      },
      {
        id: 'b',
        label: 'Stoplight parrotfish → Algae',
        correct: false,
        feedback: 'Not quite. Algae doesn’t eat the fish — the fish eats the algae. The arrow starts at the food: the algae.',
      },
    ],
    explanation: 'This species of parrotfish eats mainly algae. Other parrotfish species have different diets.',
  },
];

export const shelterPrediction: { prompt: string; options: PredictionOption[] } = {
  prompt: 'What could happen to this small reef fish if there were fewer places to hide?',
  options: [
    {
      id: 'harder',
      label: 'It may have a harder time finding a safe place to hide.',
      plausible: true,
      response: 'That fits what we saw: with fewer branches there are fewer spaces to hide in.',
    },
    {
      id: 'move',
      label: 'It may need to look for shelter somewhere else.',
      plausible: true,
      response: 'That fits what we saw: the fish moved to look for another hiding place.',
    },
    {
      id: 'nothing',
      label: 'Nothing would change for the fish.',
      plausible: false,
      response: 'Let’s check the evidence. The fish had to leave the coral to find another hiding place, so something did change.',
    },
    {
      id: 'unsure',
      label: 'We are not sure yet.',
      plausible: true,
      response: 'A good scientist checks the evidence. What did the comparison show?',
    },
  ],
};

export const shelterReveal = {
  badge: 'Simplified example',
  before: 'Before: many branches, many spaces to hide.',
  after: 'After: fewer branches, fewer spaces to hide.',
  explanation: 'With fewer hiding places, this fish may need to find shelter elsewhere.',
  caution: 'This example shows one possible behavior. It does not predict how many fish a real reef would have.',
};

export const exitQuestions: ExitQuestion[] = [
  {
    id: 'exit-food',
    kind: 'food-choice',
    title: 'Food connection',
    item: {
      id: 'exit-conch',
      relationship: 'fr-algae-conch',
      prompt: 'The queen conch grazes on algae. Which arrow shows how energy moves?',
      options: [
        {
          id: 'a',
          label: 'Queen conch → Algae',
          correct: false,
          feedback: 'Not quite. The arrow starts at the food. The conch eats the algae, so the arrow points from the algae to the conch.',
        },
        {
          id: 'b',
          label: 'Algae → Queen conch',
          correct: true,
          feedback: 'Yes! Energy moves from the algae (food) to the queen conch (consumer).',
        },
      ],
      explanation: 'Energy moves from food to consumer: algae → queen conch.',
    },
  },
  {
    id: 'exit-shelter',
    kind: 'shelter-reasoning',
    title: 'Shelter reasoning',
    prompt: 'What might happen if this fish has fewer places to hide?',
    options: [
      {
        id: 'move',
        label: 'It might have to find shelter somewhere else.',
        plausible: true,
        response: 'Reasonable — it connects to the fish’s need for shelter, and it matches what we observed.',
      },
      {
        id: 'risk',
        label: 'It might be easier for a predator to find it.',
        plausible: true,
        response: 'Reasonable — with fewer places to hide, a small fish may be easier to find. Notice the word “might”.',
      },
      {
        id: 'vanish',
        label: 'All the fish would disappear right away.',
        plausible: false,
        response: 'Our example didn’t show that. We saw one fish move to look for shelter. Real reefs are more complicated.',
      },
    ],
    discussion: 'Ask the class: what evidence from the comparison supports your answer? Accept any qualified answer connected to shelter — no exact phrase is needed.',
  },
  {
    id: 'exit-protect',
    kind: 'protection-choice',
    title: 'Protection choice',
    prompt: 'What would you protect here, and why?',
    choices: [
      { id: 'coral', label: 'The coral’s branches', need: 'small fish need spaces to hide' },
      { id: 'seagrass', label: 'The seagrass meadow', need: 'adult green sea turtles feed on seagrass' },
      { id: 'algae-sand', label: 'The sandy seabed and its algae', need: 'queen conch graze on algae there' },
    ],
    rubric: [
      { score: 0, label: 'No relevant reasoning', example: '“Because it’s pretty.”' },
      { score: 1, label: 'Identifies a need', example: '“Turtles need food.”' },
      {
        score: 2,
        label: 'Links an action, a habitat feature and an organism’s need',
        example: '“Don’t damage the seagrass, because adult green turtles eat it.”',
      },
    ],
    discussion: 'Ask the class to finish the sentence: “We would protect ___ because ___ needs it for ___.”',
  },
];

export const glossary: GlossaryTerm[] = [
  { term: 'Habitat', definition: 'The place where an organism lives and finds what it needs, like food and shelter.' },
  { term: 'Organism', definition: 'Any living thing — an animal, a plant, algae or a tiny living thing you need a microscope to see.' },
  { term: 'Ecosystem', definition: 'All the living things in a place, plus the water, sunlight and ground around them, working together.' },
  { term: 'Food web', definition: 'A picture of many feeding relationships. Arrows show energy moving from food to consumer.' },
  { term: 'Shelter', definition: 'A place that protects an organism, such as a space to hide from predators.' },
  { term: 'Producer', definition: 'An organism that makes its own food, usually using sunlight. Seagrass and algae are producers.' },
  { term: 'Consumer', definition: 'An organism that gets energy by eating other organisms. Turtles and fish are consumers.' },
];

/**
 * Optional recorded segments from Devin. Each is offered only when its video
 * file is present; the text-led lesson is complete without them. Replace the
 * transcript with the exact words spoken once a segment is recorded.
 */
export const videoSegments: VideoSegment[] = [
  {
    id: 'devin-opening',
    title: 'An invitation to the reef',
    src: 'media/devin-opening.mp4',
    captions: 'media/devin-opening.vtt',
    transcript: 'Welcome to the reef. Today you are scientists on an expedition. Look closely, ask questions and help me answer one big question: what makes this reef a home?',
    step: 'briefing',
  },
  {
    id: 'devin-shelter',
    title: 'Before the shelter investigation',
    src: 'media/devin-shelter.mp4',
    captions: 'media/devin-shelter.vtt',
    transcript: 'Scientists make a prediction before they look. Think about the small fish in the coral. What could change for it if there were fewer places to hide?',
    step: 'investigate',
  },
  {
    id: 'devin-closing',
    title: 'Closing reflection',
    src: 'media/devin-closing.mp4',
    captions: 'media/devin-closing.vtt',
    transcript: 'You found food, you found shelter and you found connections between habitats. Every organism here depends on its home. What would you protect?',
    step: 'recap',
  },
];
