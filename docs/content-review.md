# Content review

The release gate (`npm run release-check`) fails until every habitat, organism, food resource and relationship below has been reviewed by a qualified person. This page explains what the reviewer checks and how to record the review.

## Status

All records are currently **draft**: written and sourced, but not yet reviewed. The sources were located during implementation, and their key claims are summarised in `src/content/sources.ts`. A reviewer must open each source and confirm the claim. Learners see scientific names only after the organism record is reviewed; the teacher guide shows them as *(provisional)* until then.

## Organisms

| ID | Common name | Proposed scientific name | Stop | What to verify | Sources |
|---|---|---|---|---|---|
| `elkhorn-coral` | Elkhorn coral | *Acropora palmata* | Reef | Belize relevance; colony form (wide, flattened branches); coral-as-animal and zooxanthellae explanation; "much rarer than it used to be" wording | NOAA coral facts; NOAA Fisheries elkhorn coral |
| `stoplight-parrotfish` | Stoplight parrotfish | *Sparisoma viride* | Reef | Diet mainly algae scraped from dead coral and rock; terminal-phase colours (green, yellow spot at tail base); daytime feeding | FishBase 1161 |
| `great-barracuda` | Great barracuda | *Sphyraena barracuda* | Reef (also seagrass) | Predator of mostly fish, plus some squid and shrimp; hunts by sight; relative scale against the parrotfish | Florida Museum species profile |
| `green-sea-turtle` | Green sea turtle | *Chelonia mydas* | Seagrass | Life stage is **adult**; adult diet mostly seagrass and algae; juvenile qualifier | NOAA Fisheries green turtle |
| `queen-conch` | Queen conch | *Aliger gigas* (formerly *Strombus gigas* / *Lobatus gigas*) | Sand (also seagrass) | Current accepted name; appearance (pink lip, algae on shell); grazing diet; juvenile seagrass / adult sandy-flat habitat; fishing-limits wording | NOAA Fisheries queen conch |

The small fish in the shelter comparison is deliberately **unidentified and unprofiled**. If it is ever given a species identity or a behaviour claim, add a source first.

## Relationships

Each relationship is validated on its own. They are separate examples, not one food chain.

| ID | Relationship | Qualifier | Sources |
|---|---|---|---|
| `fr-seagrass-turtle` | Seagrass → Green sea turtle | Adults; juveniles eat a wider mix | NOAA Fisheries green turtle |
| `fr-algae-parrotfish` | Algae → Stoplight parrotfish | This species only | FishBase 1161 |
| `fr-algae-conch` | Algae → Queen conch | — | NOAA Fisheries queen conch |
| `fr-smallfish-barracuda` | Small fish → Great barracuda | — | Florida Museum |
| `sh-coral-smallfish` | Elkhorn coral ⋯ shelter ⋯ small fish | Shelter, not food | NOAA Fisheries elkhorn coral; NOAA reef ecosystems |

## Lesson-wide checks

- [ ] Relative scale of organisms in the 3D scene and illustrations (1 unit ≈ 1 m; see `src/scene/organisms.ts`).
- [ ] The shelter comparison is labelled **Simplified example**. It shows fewer hiding places and one possible behaviour (the fish moves to other shelter), never death, disappearance or population change.
- [ ] No fabricated counts, forecasts or percentages appear anywhere.
- [ ] The language suits the pilot grade range (proposed grades 3–6).
- [ ] No curriculum-standard alignment or certification is claimed.
- [ ] The asset register (`src/content/assets.ts`) covers every shipped asset, including any recorded video.

## Expedition 2: The Changing Reef

Every record in `src/content/changing.ts` (the belt snapshots, the three causes, the reef effects, the sargassum twist, the Los Angeles example and the 12 pieces of trash) is a draft awaiting review.

- [ ] The cause framing matches current research: extra nutrients from land are a big part, with currents and warmer water. There is no single cause, and warming is never presented as the main or only driver.
- [ ] The belt figures (about 8,850 km and more than 20 million tons in 2018; about 38 million tons in May 2025) still match the sources.
- [ ] The map is labelled a simplified drawing, and the cause model is labelled **Simplified example**.
- [ ] The Los Angeles heatwave example is still current and fairly described.
- [ ] Trash facts are supported by the NOAA sources listed below.
- [ ] Safety wording: sargassum clean-up is for adults with gloves.

## Expedition 3: Plankton to Whale Sharks

Every record in `src/content/openOcean.ts` (the open-ocean animals, the three plankton, the food chain, the Gladden Spit reveal, the oxygen fact, the whale shark's status and the exit questions) is a draft awaiting review.

- [ ] The food chain (sunlight → phytoplankton → zooplankton → small fish → mahi-mahi) is a fair simplified chain. Mahi-mahi prey is given only as "small fish"; NOAA supports mahi-mahi as top predators near the surface.
- [ ] The whale shark twist is right: it filters plankton (and fish eggs) directly, so it skips the middle of the chain.
- [ ] The Gladden Spit reveal matches Heyman et al. (2001): whale sharks gather in April and May, around the full and last-quarter moons, and feed on the spawn of cubera and dog snappers. The spawning model is labelled **Simplified example**.
- [ ] The oxygen fact keeps NOAA's hedge ("scientists estimate about half").
- [ ] The whale shark is still listed as Endangered by the IUCN (2016 assessment).
- [ ] Sargassum is described as a home in the open ocean, consistent with Expedition 2's "too much near shore" message.
- [ ] Little Explorers: plankton and snapper eggs are food; the bottle and rock are clearly not.

## Expedition 4: Into the Deep

Every record in `src/content/deepOcean.ts` (the deep-sea animals, the zone facts, the migration twist, the uses of animal light, marine snow and the pressure fact) is a draft awaiting review.

- [ ] Zone depths match NOAA: sunlight 0–200 m, twilight 200–1,000 m, midnight 1,000–4,000 m. Phytoplankton are described as needing the sunlight zone.
- [ ] Pressure wording ("about 20 / 100 / 400 times the air pressure we feel" at the bottom of each zone) follows NOAA’s one-atmosphere-per-10-meters rule and is fair for children.
- [ ] The midnight zone’s “about 4 °C, as cold as a fridge” matches NOAA JetStream.
- [ ] The daily migration is called “the biggest migration on Earth”, as NOAA Ocean Exploration describes it.
- [ ] Animal light: attracting food (anglerfish lure), hiding (counter-illumination in hatchetfish and lanternfish) and signaling are each supported. The lights switch is labelled **Simplified example**.
- [ ] Each animal sits in a plausible zone. In particular, confirm the Atolla jelly as a midnight-zone animal (the NOAA source covers its “burglar alarm”; MBARI describes it as common in the midnight zone but could not be checked from here), and the gulper eel’s range across the twilight and midnight zones.
- [ ] The whale shark’s deep dive (“almost 2,000 meters”) matches Tyminski et al. (2015), maximum 1,928 m.
- [ ] The scene is described as not to scale, and the animals as shown bigger than life.

## Recording a review

In the record's file under `src/content/`, change its `review` to:

```ts
review: { status: 'reviewed', reviewer: 'Name or role', date: '2026-10-20', notes: 'Optional' },
```

If the learner-facing meaning changes, increase `contentVersion`. Then run:

```bash
npm run validate:content   # lists anything still awaiting review
npm run release-check      # must pass before public release
```

The gate also rejects a `reviewed` record that has no reviewer or date.

## Sources

| ID | Source | Supports |
|---|---|---|
| `bz-hcmr` | [Belize Fisheries Department — Hol Chan Marine Reserve](https://fisheries.gov.bz/hcmr/) | Belize habitat context (reef, seagrass, mangrove) — not an exact reconstruction |
| `noaa-reef-ecosystems` | [NOAA — Coral reef ecosystems](https://www.noaa.gov/education/resource-collections/marine-life/coral-reef-ecosystems) | Reefs provide food and shelter |
| `noaa-coral-animal` | [NOAA — Are corals animals or plants?](https://oceanservice.noaa.gov/facts/coral.html) | Coral is an animal; reef-building |
| `noaa-marine-life` | [NOAA — Marine life](https://www.noaa.gov/education/resource-collections/marine-life) | Starting point for food relationships |
| `noaa-elkhorn` | [NOAA Fisheries — Elkhorn coral](https://www.fisheries.noaa.gov/species/elkhorn-coral) | Thickets shelter fish; zooxanthellae energy |
| `noaa-green-turtle` | [NOAA Fisheries — Green turtle](https://www.fisheries.noaa.gov/species/green-turtle) | Adult herbivory; juvenile omnivory |
| `noaa-queen-conch` | [NOAA Fisheries — Queen conch](https://www.fisheries.noaa.gov/species/queen-conch) | Grazing herbivore; habitat by life stage |
| `fishbase-stoplight` | [FishBase — *Sparisoma viride*](https://fishbase.se/summary/1161) | Algae diet; species-specific |
| `flmnh-barracuda` | [Florida Museum — Great barracuda](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/great-barracuda) | Predator of fish, squid, shrimp; sight hunter |
| `wang-2019-belt` | [Science / Woods Hole Oceanographic Institution copy — The great Atlantic Sargassum belt (Wang et al., Science, 2019)](https://science.whoi.edu/users/mcgillic/Sargassum/pdfs/wang_et_al_science_2019.pdf) | Since 2011 a belt of sargassum has formed across the tropical Atlantic; in June 2018 it was about 8,850 km long and held more than 20 million tons. Ocean currents control where it goes; nutrients from West African upwelling and the Amazon River are linked to its growth. |
| `ap-2025-record` | [Associated Press (via News4Jax) — Scientists say a record amount of seaweed hit the Caribbean and nearby areas in May](https://www.news4jax.com/tech/2025/06/03/scientists-say-a-record-amount-of-seaweed-hit-the-caribbean-and-nearby-areas-in-may/) | About 38 million tons of sargassum in May 2025, the most since study of the belt began in 2011; scientists still lack a full explanation. |
| `fau-nitrogen` | [Florida Atlantic University (Harbor Branch) — Sargassum now the world’s largest harmful algal bloom due to nitrogen](https://www.fau.edu/newsdesk/articles/nitrogen-seaweed-study.php) | Nitrogen in sargassum tissue has risen since the 1980s, linked to runoff, wastewater and atmospheric inputs from land. |
| `globe-shifting-climate` | [The Boston Globe (AP) — Shifting climate alters pattern of Atlantic’s giant seaweed blobs](https://www.bostonglobe.com/2025/12/04/nation/shifting-climate-alters-pattern-atlantics-giant-seaweed-blobs) | Warming is one of several factors: the northern Sargasso Sea patch shrank in warmer water while the tropical belt grew. No single cause. |
| `noaa-sargassum-habitat` | [NOAA National Ocean Service — Sargassum: a floating habitat](https://oceanservice.noaa.gov/news/sargassum) | Floating sargassum in the open ocean is habitat for young fish and young sea turtles. |
| `sanpedrosun-2025` | [The San Pedro Sun — Delicate balance at risk: Belize reef battles record sargassum levels](https://www.sanpedrosun.com/conservation/2025/08/21/delicate-balance-at-risk-belize-reef-battles-record-sargassum-levels/) | In Belize in 2025, thick mats reduced sunlight and oxygen near shore; dead lobsters, crabs, octopus, eels and fish washed ashore; mats reached over the reef. |
| `epa-sargassum-health` | [U.S. Environmental Protection Agency — Sargassum inundation events: impacts on human health](https://19january2025snapshot.epa.gov/habs/sargassum-inundation-events-sies-impacts-human-health) | Sargassum rotting on beaches gives off hydrogen sulfide and ammonia gas; clean-up is a job for adults with protective gear. |
| `noaa-debris-turtles` | [NOAA Marine Debris Program — NOAA Marine Debris Program blog: sea turtles and plastic bags](https://blog.marinedebris.noaa.gov/node/181) | A floating plastic bag can look like a jellyfish, a favorite sea turtle food; once swallowed it can make the turtle very sick. |
| `noaa-derelict-gear` | [NOAA Marine Debris Program — Derelict fishing gear](https://marinedebris.noaa.gov/types/derelict-fishing-gear) | Lost fishing gear such as nets and fishing line can entangle wildlife ("ghost fishing") and damage coral reefs, mangroves and seagrass beds. |
| `noaa-microplastics` | [NOAA National Ocean Service — What are microplastics?](https://oceanservice.noaa.gov/facts/microplastics.html) | Microplastics are pieces smaller than 5 mm; many come from larger plastic debris that breaks into smaller and smaller pieces, and they can harm ocean life. |
| `abc7-la-heatwave` | [ABC7 Los Angeles — Warm ocean waters bring unusual fishing boom off Southern California coast](https://abc7.com/post/warm-ocean-waters-bring-unusual-fishing-boom-off-southern-california-coast/19792295/) | A 2026 marine heatwave brought warm-water fish usually found farther south to Southern California, according to a California Department of Fish and Wildlife scientist. |
| `accuweather-la-sharks` | [AccuWeather — Warmer ocean waters draw more sharks to Southern California](https://www.accuweather.com/en/climate/warmer-ocean-waters-draw-more-sharks-to-southern-california/1924130) | Warm-water shark species that usually stay farther south have been seen more often off Southern California as waters warm. |
| `heyman-2001-gladden` | [Marine Ecology Progress Series (Inter-Research) — Whale sharks *Rhincodon typus* aggregate to feed on fish spawn in Belize (Heyman et al., 2001)](https://www.int-res.com/abstracts/meps/v215/p275-282/) | At Gladden Spit, whale sharks gather in April and May around the full and last-quarter moons, during a multispecies snapper spawning aggregation, and feed on cubera and dog snapper spawn. |
| `iucn-whale-shark` | [IUCN Red List — Whale shark, *Rhincodon typus* (2016 assessment)](https://www.iucnredlist.org/species/19488/2365291) | Endangered (2016); threats include fishing, bycatch and ship strikes. |
| `wa-whale-shark` | [Department of Fisheries, Western Australia — Whale shark fact sheet](https://www.fish.wa.gov.au/Documents/recreational_fishing/fact_sheets/fact_sheet_whale_shark.pdf) | The world's largest living fish; a docile filter feeder that looks for plankton. |
| `noaa-phytoplankton` | [NOAA National Ocean Service — What are phytoplankton?](https://oceanservice.noaa.gov/facts/phyto.html) | Phytoplankton live where sunlight reaches and feed many sea creatures; diatoms and dinoflagellates are the two main groups. |
| `noaa-plankton` | [NOAA National Ocean Service — What are plankton?](https://oceanservice.noaa.gov/facts/plankton.html) | Plankton drift with the water; most zooplankton eat phytoplankton and are eaten by larger animals. |
| `noaa-ocean-oxygen` | [NOAA National Ocean Service — How much oxygen comes from the ocean?](https://oceanservice.noaa.gov/facts/ocean-oxygen.html) | Scientists estimate roughly half of Earth's oxygen comes from the ocean, mostly from plankton. |
| `noaa-mahi` | [NOAA Fisheries — Atlantic mahi-mahi](https://www.fisheries.noaa.gov/species/atlantic-mahi-mahi) | Top predators near the surface; often found near floating sargassum, and spawn under it. |
| `noaa-oe-sargassum` | [NOAA Ocean Exploration — Sargassum](https://oceanexplorer.noaa.gov/explorations/03edge/background/sargassum/sargassum.html) | Floating sargassum gives food and shelter to young fish and young sea turtles. |
| `noaa-light-travel` | [NOAA National Ocean Service — How far does light travel in the ocean?](https://oceanservice.noaa.gov/facts/light_travel.html) | Rarely any significant light below 200 m; the twilight zone (200–1,000 m) has too little light for photosynthesis. |
| `noaa-ocean-layers` | [NOAA JetStream — Layers of the ocean](https://www.noaa.gov/jetstream/ocean/layers-of-ocean) | Twilight (mesopelagic) zone 200–1,000 m; midnight (bathypelagic) zone 1,000–4,000 m, constantly dark, about 4 °C. |
| `noaa-pressure` | [NOAA National Ocean Service — Does the ocean have more pressure the deeper you go?](https://oceanservice.noaa.gov/facts/pressure.html) | Pressure rises by about one atmosphere for every 10 m (33 ft) of depth. |
| `noaa-oe-migration` | [NOAA Ocean Exploration — Water column research](https://oceanexplorer.noaa.gov/explorations/17deepsearch/background/water-column-research/water-column-research.html) | Diel vertical migration: deep animals rise to feed at night and sink by day, the largest organized mass movement of animals on the planet. |
| `whoi-lanternfish` | [Woods Hole Oceanographic Institution — Lanternfishes](https://www.whoi.edu/ocean-learning-hub/ocean-facts/lanternfishes/) | Lanternfishes are among the most numerous deep-sea fish, with light organs along the belly; they rise at night. |
| `whoi-fish-flashlights` | [Woods Hole Oceanographic Institution — Fish with flashlights](https://www.whoi.edu/news-insights/content/fish-with-flashlights) | Hatchetfish and lanternfish match their belly light to the light from above (counter-illumination). |
| `si-bioluminescence` | [Smithsonian Ocean — Bioluminescence](https://ocean.si.edu/ocean-life/fish/bioluminescence) | Deep-sea animals use light to find or attract food, hide from predators, and communicate. |
| `si-anglerfish` | [Smithsonian Ocean — Meet the tiny bacteria that give anglerfishes their spooky glow](https://ocean.si.edu/ocean-life/fish/meet-tiny-bacteria-give-anglerfishes-their-spooky-glow) | Female deep-sea anglerfish have a lure (esca) lit by bacteria, used to attract prey. |
| `whoi-pelican-eel` | [WHOI Ocean Twilight Zone — Pelican eel](https://twilightzone.whoi.edu/explore-the-otz/creature-features/pelican-eel) | The gulper (pelican) eel’s huge mouth works like a net where food is scarce; its tail tip glows. |
| `noaa-marine-snow` | [NOAA National Ocean Service — What is marine snow?](https://oceanservice.noaa.gov/facts/marinesnow.html) | Organic material from the upper ocean falls to the deep and feeds deep-sea animals. |
| `tyminski-2015-whale-shark-dives` | [PLOS ONE (PubMed Central) — Vertical movements and patterns in diving behavior of whale sharks (Tyminski et al., 2015)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4651344/) | Tagged whale sharks occasionally dove deep; maximum recorded 1,928 m. |
| `noaa-oe-atolla` | [NOAA Ocean Exploration — The “burglar alarm” of the Atolla jellyfish](https://oceanexplorer.noaa.gov/explorations/15biolum/background/medusa/media/burglar.html) | When attacked, Atolla flashes a pinwheel of blue light that may attract a bigger predator to its attacker. |
