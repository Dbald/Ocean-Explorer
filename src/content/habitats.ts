import type { Habitat } from './types.ts';

const draft = { status: 'draft' as const };

/** Three connected stops in one compact, Belize-inspired composite scene. */
export const habitats: Habitat[] = [
  {
    id: 'reef',
    title: 'Reef',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-reef-ecosystems', 'noaa-elkhorn', 'bz-hcmr'],
    arrival: 'Coral builds the reef. Its branches and holes make spaces animals use.',
    focus: 'Find the coral, the parrotfish and the barracuda. Look for places a small fish could hide.',
    accessibleDescription:
      'A shallow reef in sunlit turquoise water. Golden-brown elkhorn coral spreads wide, flat branches. A small fish hovers between the branches. A green parrotfish grazes on a rock, and a long silver barracuda swims nearby.',
    narrationId: 'habitat-reef',
  },
  {
    id: 'seagrass',
    title: 'Seagrass meadow',
    contentVersion: 1,
    review: draft,
    sources: ['bz-hcmr', 'noaa-green-turtle'],
    arrival: 'Next to the reef is a meadow of seagrass. Seagrass is a plant that grows underwater.',
    focus: 'Find the green sea turtle. What could the seagrass give an animal?',
    accessibleDescription:
      'A meadow of long green seagrass blades swaying gently next to the reef. A green sea turtle with a brown, patterned shell rests low among the grass.',
    narrationId: 'habitat-seagrass',
  },
  {
    id: 'sand',
    title: 'Sandy seabed',
    contentVersion: 1,
    review: draft,
    sources: ['noaa-queen-conch', 'bz-hcmr'],
    arrival: 'At the edge of the seagrass, the seafloor opens into sand. Life here can be easy to miss.',
    focus: 'Look closely. Find the queen conch at the edge of the sand and seagrass.',
    accessibleDescription:
      'Pale rippled sand at the edge of the seagrass meadow. A large spiral shell — a queen conch — sits on the sand, partly covered with algae, with a pink lip curling out from the opening.',
    narrationId: 'habitat-sand',
  },
];

export const habitatById = new Map(habitats.map((h) => [h.id, h]));
