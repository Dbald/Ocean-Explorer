import type { Organism } from './types.ts';

const draft = { status: 'draft' as const };

/**
 * The five featured organism profiles. Default visible copy (role + observe)
 * stays under roughly 45 words; everything else goes behind Learn more.
 * Scientific names are displayed only after review (see `isVerified`).
 */
export const organisms: Organism[] = [
  {
    id: 'elkhorn-coral',
    title: 'Elkhorn coral',
    commonName: 'Elkhorn coral',
    scientificName: 'Acropora palmata',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-coral-animal', 'noaa-elkhorn', 'noaa-reef-ecosystems'],
    habitat: 'reef',
    role: 'Coral is an animal. Elkhorn coral builds a hard skeleton with wide, flat branches. The spaces between branches give fish places to hide.',
    observe: 'Look between the branches. What is using those spaces?',
    learnMore:
      'Tiny algae live inside the coral’s body. They use sunlight to make food and give the coral most of its energy. Elkhorn coral grows in shallow, sunny water. Over many years, corals like this built the reefs of the Caribbean. Today elkhorn coral is much rarer than it used to be.',
    accessibleDescription:
      'Golden-brown coral with wide, flat branches spreading out like antlers, close to the water’s surface.',
    narrationId: 'organism-elkhorn-coral',
    assets: ['proc-elkhorn-coral', 'svg-elkhorn-coral'],
  },
  {
    id: 'stoplight-parrotfish',
    title: 'Stoplight parrotfish',
    commonName: 'Stoplight parrotfish',
    scientificName: 'Sparisoma viride',
    contentVersion: 1,
    review: draft,
    sources: ['fishbase-stoplight'],
    habitat: 'reef',
    role: 'This parrotfish scrapes algae off rocks and dead coral with its beak-like teeth. Algae is its main food.',
    observe: 'Watch its mouth. Where does it look for food?',
    learnMore:
      'Different kinds of parrotfish eat different foods, so this card describes one species: the stoplight parrotfish. It feeds during the day. Its colors change as it grows — older fish are bright green with a yellow spot near the tail.',
    accessibleDescription:
      'A bright green fish with a rounded body, a beak-like mouth and a small yellow spot near the base of its tail.',
    narrationId: 'organism-stoplight-parrotfish',
    assets: ['proc-parrotfish', 'svg-parrotfish'],
  },
  {
    id: 'great-barracuda',
    title: 'Great barracuda',
    commonName: 'Great barracuda',
    scientificName: 'Sphyraena barracuda',
    contentVersion: 1,
    review: draft,
    sources: ['flmnh-barracuda'],
    habitat: 'reef',
    alsoFoundIn: ['seagrass'],
    role: 'The great barracuda is a predator. It hunts by sight and eats mostly other fish.',
    observe: 'Look at its long body. How might that shape help it move quickly?',
    learnMore:
      'Besides fish, great barracuda sometimes eat squid and shrimp. They are usually active during the day, when they can see their prey. On this card the barracuda shows one consumer relationship — it is not the top of one single food chain.',
    accessibleDescription:
      'A long, slim, silver fish with dark marks along its side, a pointed head and a large jaw.',
    narrationId: 'organism-great-barracuda',
    assets: ['proc-barracuda', 'svg-barracuda'],
  },
  {
    id: 'green-sea-turtle',
    title: 'Green sea turtle',
    commonName: 'Green sea turtle',
    scientificName: 'Chelonia mydas',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-green-turtle'],
    habitat: 'seagrass',
    role: 'Adult green sea turtles eat mostly seagrass and algae. Seagrass meadows are places where they feed.',
    observe: 'Where does the turtle spend its time? Why might it stay near the seagrass?',
    learnMore:
      'Young green turtles eat a wider mix of foods, including small animals such as jellyfish and sponges. As adults they eat mainly seagrass and algae. Sea turtles breathe air, so they swim up to the surface to take a breath.',
    accessibleDescription:
      'A large sea turtle with a smooth, brown, patterned shell, four flippers and a rounded head, resting in the seagrass.',
    narrationId: 'organism-green-sea-turtle',
    assets: ['proc-turtle', 'svg-turtle'],
  },
  {
    id: 'queen-conch',
    title: 'Queen conch',
    commonName: 'Queen conch',
    scientificName: 'Aliger gigas',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-queen-conch'],
    habitat: 'sand',
    alsoFoundIn: ['seagrass'],
    role: 'The queen conch is a large sea snail. It moves slowly along the seafloor, grazing on algae.',
    observe: 'Look closely at the edge of the sand. What helps the conch blend in?',
    learnMore:
      'Young conch live mostly in seagrass meadows. Older conch are often found on sandy areas where algae grows. The outside of the shell can be covered in algae, but the inside lip is a glossy pink. Many places limit conch fishing so that conch can recover.',
    accessibleDescription:
      'A large spiral shell, tan and partly covered with green algae, with a wide pink lip curling out from its opening.',
    narrationId: 'organism-queen-conch',
    assets: ['proc-conch', 'svg-conch'],
  },
];

export const organismById = new Map(organisms.map((o) => [o.id, o]));

/** Scientific names are shown to learners only after the record is reviewed. */
export function isVerified(o: Organism): boolean {
  return o.review.status === 'reviewed';
}

export function cardWordCount(o: Organism): number {
  return `${o.role} ${o.observe}`.split(/\s+/).filter(Boolean).length;
}
