# Real reference photos

The reef is illustrated, so the app can show a **real photo** next to each animal and next to sargassum, so children see what the real thing looks like. Photos appear:

- in the animal's card (Explore and the guided lesson), above the facts;
- on the "You found it!" screen in *Can you find…?*;
- in Expedition 2: sargassum on a beach (Briefing / Story), close up (The belt, Seaweed) and in Our reef when the mats are on.

They sit inside the side panel and never cover the reef. Each photo is labelled **Real photo**, with its credit and licence underneath. A subject without a photo simply shows none, so photos can be added one at a time.

## Which photos can be used

Only photos you are allowed to reuse:

- **Your own photos**, for example sargassum on a Belize beach. Credit: "Photo: Devin Baldwin".
- **Public domain**, such as photos by US government agencies (NOAA Photo Library, NOAA Fisheries, US Fish and Wildlife Service, National Park Service).
- **CC0, CC BY or CC BY-SA**, for example from Wikimedia Commons or iNaturalist. Copy the author's name and the licence exactly as listed.

Avoid "NC" (non-commercial) and "ND" (no-derivatives) licences, and photos with no stated licence. Being online does not make a photo free to reuse.

## Photos wanted (22)

| Subject id | What to show |
|---|---|
| `elkhorn-coral` | Elkhorn coral (*Acropora palmata*) |
| `stoplight-parrotfish` | Stoplight parrotfish (*Sparisoma viride*), ideally grazing |
| `great-barracuda` | Great barracuda (*Sphyraena barracuda*) |
| `green-sea-turtle` | Green sea turtle (*Chelonia mydas*) in seagrass |
| `queen-conch` | Queen conch (*Aliger gigas*) on sand |
| `brain-coral` | Brain coral (for example *Diploria labyrinthiformis*) |
| `sea-fan` | Common sea fan (*Gorgonia ventalina*) |
| `tube-sponge` | Tube sponge |
| `nurse-shark` | Nurse shark (*Ginglymostoma cirratum*) |
| `spiny-lobster` | Caribbean spiny lobster (*Panulirus argus*) |
| `sea-urchin` | Long-spined sea urchin (*Diadema antillarum*) |
| `green-moray` | Green moray eel (*Gymnothorax funebris*) |
| `reef-octopus` | Caribbean reef octopus (*Octopus briareus*) |
| `blue-tang` | Blue tang (*Acanthurus coeruleus*) |
| `sergeant-major` | Sergeant major (*Abudefduf saxatilis*) |
| `eagle-ray` | Spotted eagle ray (*Aetobatus narinari*) |
| `cushion-star` | Cushion sea star (*Oreaster reticulatus*) |
| `sea-cucumber` | Sea cucumber on seagrass or sand |
| `southern-stingray` | Southern stingray (*Hypanus americanus*) |
| `hermit-crab` | Hermit crab in its shell |
| `sargassum` | Floating sargassum, close up, showing the small round air bladders |
| `sargassum-beach` | Sargassum piled up on a beach |

The teacher guide (*Sources and credits → Real photos*) lists the photos in use and the subjects still without one.

## Adding a photo

1. Save it as a JPG about 1200 pixels wide (under about 300 KB) in `public/media/photos/`, for example `queen-conch.jpg`.
2. Add a record to `referencePhotos` in `src/content/photos.ts`:

   ```ts
   {
     subject: 'queen-conch',
     file: 'queen-conch.jpg',
     alt: 'A queen conch resting on pale sand',
     credit: 'Photo: NOAA',
     license: 'Public domain',
     sourceUrl: 'https://…the page the photo came from…',
   },
   ```

3. Run `npm test`. It fails if the file is missing, the subject is unknown, or the credit, licence or source is empty.
4. Also mention the photo in the asset register (`src/content/assets.ts`) if it is not your own.
