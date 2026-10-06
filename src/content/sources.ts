import type { Source } from './types.ts';

/**
 * Source register. Each entry says what the source supports — and its limits.
 * Sources support the educational direction; they do not replace species-level
 * review by a qualified reviewer before publication.
 */
export const sources: Source[] = [
  {
    id: 'bz-hcmr',
    title: 'Hol Chan Marine Reserve',
    publisher: 'Belize Fisheries Department',
    url: 'https://fisheries.gov.bz/hcmr/',
    supports:
      'Linked reef, seagrass and mangrove habitats in Belize and local ecology education. Supports the Belize habitat context — not an exact reconstruction of the reserve.',
    accessed: '2026-10-05',
  },
  {
    id: 'noaa-reef-ecosystems',
    title: 'Coral reef ecosystems',
    publisher: 'NOAA Education',
    url: 'https://www.noaa.gov/education/resource-collections/marine-life/coral-reef-ecosystems',
    supports: 'Reefs provide habitat functions including food and shelter. Supports the lesson’s central relationship.',
    accessed: '2026-10-05',
  },
  {
    id: 'noaa-coral-animal',
    title: 'Are corals animals or plants?',
    publisher: 'NOAA National Ocean Service',
    url: 'https://oceanservice.noaa.gov/facts/coral.html',
    supports: 'Coral is an animal; reef-building corals form the reef structure.',
    accessed: '2026-10-05',
  },
  {
    id: 'noaa-marine-life',
    title: 'Marine life',
    publisher: 'NOAA Education',
    url: 'https://www.noaa.gov/education/resource-collections/marine-life',
    supports: 'Educational starting point for marine food relationships. Specific food-web edges are sourced separately.',
    accessed: '2026-10-05',
  },
  {
    id: 'noaa-elkhorn',
    title: 'Elkhorn coral (Acropora palmata)',
    publisher: 'NOAA Fisheries',
    url: 'https://www.fisheries.noaa.gov/species/elkhorn-coral',
    supports:
      'Caribbean reef-building coral; forms thickets in very shallow water that provide habitat for reef animals, especially fish; gets most of its energy from symbiotic zooxanthellae.',
    accessed: '2026-10-06',
  },
  {
    id: 'noaa-green-turtle',
    title: 'Green turtle (Chelonia mydas)',
    publisher: 'NOAA Fisheries',
    url: 'https://www.fisheries.noaa.gov/species/green-turtle',
    supports:
      'Adult green turtles are mainly herbivores that eat seagrasses and algae; juveniles are more omnivorous. Supports the life-stage qualifier on the seagrass → turtle link.',
    accessed: '2026-10-06',
  },
  {
    id: 'noaa-queen-conch',
    title: 'Queen conch (Aliger gigas)',
    publisher: 'NOAA Fisheries',
    url: 'https://www.fisheries.noaa.gov/species/queen-conch',
    supports:
      'Queen conch are grazing herbivores that eat algae and seagrass detritus; juveniles are associated with seagrass beds, adults with sandy algal flats.',
    accessed: '2026-10-06',
  },
  {
    id: 'fishbase-stoplight',
    title: 'Sparisoma viride, Stoplight parrotfish',
    publisher: 'FishBase',
    url: 'https://fishbase.se/summary/1161',
    supports:
      'Stoplight parrotfish feed mainly on algae, scraping it from dead coral and rock surfaces. Diet is species-specific — not all parrotfish eat the same things.',
    accessed: '2026-10-06',
  },
  {
    id: 'flmnh-barracuda',
    title: 'Great barracuda (Sphyraena barracuda)',
    publisher: 'Florida Museum of Natural History',
    url: 'https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/great-barracuda',
    supports: 'Great barracuda are reef predators that eat mostly fish, plus some squid and shrimp, and hunt by sight.',
    accessed: '2026-10-06',
  },
];

export const sourceById = new Map(sources.map((s) => [s.id, s]));
