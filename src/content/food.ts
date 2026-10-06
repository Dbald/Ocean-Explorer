import type { FoodRelationship, FoodResource, ShelterRelationship } from './types.ts';

const draft = { status: 'draft' as const };

/** Supporting food-resource cards. They explain food without adding profiles. */
export const foodResources: FoodResource[] = [
  {
    id: 'algae',
    title: 'Algae',
    name: 'Algae',
    kind: 'producer',
    contentVersion: 1,
    review: draft,
    sources: ['fishbase-stoplight', 'noaa-queen-conch'],
    description: 'Algae are living things that use sunlight to make their own food. They grow on rocks, dead coral and the seafloor.',
  },
  {
    id: 'seagrass',
    title: 'Seagrass',
    name: 'Seagrass',
    kind: 'producer',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-green-turtle'],
    description: 'Seagrass is a flowering plant that grows underwater. Like plants on land, it uses sunlight to make food.',
  },
  {
    id: 'small-fish',
    title: 'Small fish',
    name: 'Small fish',
    kind: 'consumer',
    contentVersion: 1,
    review: draft,
    sources: ['flmnh-barracuda'],
    description: 'Many kinds of small fish live around reefs and seagrass. Some become food for larger fish.',
  },
];

/**
 * Each feeding link is validated on its own. Together they are NOT one linear
 * food chain — they are separate examples of energy moving from food to consumer.
 */
export const foodRelationships: FoodRelationship[] = [
  {
    id: 'fr-seagrass-turtle',
    title: 'Seagrass → Green sea turtle',
    food: 'seagrass',
    consumer: 'green-sea-turtle',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-green-turtle'],
    explanation: 'Adult green sea turtles graze on seagrass, so energy moves from the seagrass to the turtle.',
    qualifier: 'Adult turtles. Young green turtles eat a wider mix of foods.',
  },
  {
    id: 'fr-algae-parrotfish',
    title: 'Algae → Stoplight parrotfish',
    food: 'algae',
    consumer: 'stoplight-parrotfish',
    contentVersion: 1,
    review: draft,
    sources: ['fishbase-stoplight'],
    explanation: 'The stoplight parrotfish scrapes algae off rock and dead coral and eats it, so energy moves from the algae to the fish.',
    qualifier: 'This species. Other parrotfish species have different diets.',
  },
  {
    id: 'fr-algae-conch',
    title: 'Algae → Queen conch',
    food: 'algae',
    consumer: 'queen-conch',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-queen-conch'],
    explanation: 'The queen conch grazes on algae on the seafloor, so energy moves from the algae to the conch.',
  },
  {
    id: 'fr-smallfish-barracuda',
    title: 'Small fish → Great barracuda',
    food: 'small-fish',
    consumer: 'great-barracuda',
    contentVersion: 1,
    review: draft,
    sources: ['flmnh-barracuda'],
    explanation: 'The great barracuda hunts and eats small fish, so energy moves from the small fish to the barracuda.',
  },
];

export const shelterRelationships: ShelterRelationship[] = [
  {
    id: 'sh-coral-smallfish',
    title: 'Coral branches shelter small fish',
    shelter: 'elkhorn-coral',
    user: 'small-fish',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-elkhorn', 'noaa-reef-ecosystems'],
    explanation: 'Elkhorn coral thickets make spaces that reef animals, especially fish, use as habitat and shelter.',
  },
];

export const foodRelationshipById = new Map(foodRelationships.map((r) => [r.id, r]));
export const foodResourceById = new Map(foodResources.map((r) => [r.id, r]));
