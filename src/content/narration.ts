import { habitats } from './habitats.ts';
import { organisms } from './organisms.ts';
import { GUIDING_QUESTION } from './lesson.ts';
import type { NarrationSegment } from './types.ts';

/**
 * Narration script. The same text is spoken (when voice is available), shown
 * as captions and collected in the transcript, so all three always match.
 */
const stepNarration: NarrationSegment[] = [
  {
    id: 'step-briefing',
    text: `Welcome to the reef. Today we are going on an expedition with one big question: ${GUIDING_QUESTION} Before we look, share your first idea.`,
  },
  {
    id: 'step-explore',
    text: 'We will visit three places next to each other: a coral reef, a seagrass meadow and a sandy seabed. Look closely and select each animal to learn about it.',
  },
  {
    id: 'step-connect',
    text: 'Animals get energy from food. In a food web, the arrow points from the food to the consumer — the one that eats it. Choose the arrow that shows which way energy moves.',
  },
  {
    id: 'step-investigate',
    text: 'Look at the small fish hiding in the coral. What could happen to it if there were fewer places to hide? Make a prediction as a class. Then compare before and after.',
  },
  {
    id: 'step-explain',
    text: 'Now it is your turn to explain. Answer three questions about food, shelter and how we can protect this home.',
  },
  {
    id: 'step-recap',
    text: `Let’s look back at our big question: ${GUIDING_QUESTION} The reef and the habitats around it give organisms food and shelter.`,
  },
];

const habitatNarration: NarrationSegment[] = habitats.map((h) => ({
  id: h.narrationId,
  text: `${h.title}. ${h.arrival} ${h.focus}`,
}));

const organismNarration: NarrationSegment[] = organisms.map((o) => ({
  id: o.narrationId,
  text: `${o.commonName}. ${o.role} ${o.observe}`,
}));

export const narration: NarrationSegment[] = [...stepNarration, ...habitatNarration, ...organismNarration];
export const narrationById = new Map(narration.map((n) => [n.id, n]));
