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
