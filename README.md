# Ocean Explorer — Belize

Teacher-led, browser-based reef expeditions for a classroom display, set in a Belize-inspired reef, seagrass meadow and sandy seabed.

| Expedition | Guiding question | Levels |
|---|---|---|
| **1. The Living Reef** | What makes this reef a home? | Grades 3–6 lesson, Explore, and the *Can you find…?* game for TK–2 |
| **2. The Changing Reef** | What’s changing on Belize’s reef? | Grades 3–6, and Little Explorers (TK–2) |

In Expedition 1 a class inspects five organisms, connects food relationships, predicts the effect of losing shelter, and explains a conservation choice. Expedition 2 is about sargassum, trash and warming water (see below).

**Lesson framework:** explore → predict → manipulate → observe → explain.

> **Content status: draft.** The species facts and food relationships are sourced but still need review by a qualified person. `npm run release-check` fails until that review is recorded (see [docs/content-review.md](docs/content-review.md)).

## Quick start

```bash
npm install
npm run dev          # local development at http://localhost:5173
npm run build        # production build in dist/ (static files, no backend)
npm run preview      # serve the build at http://localhost:4173
```

Open `dist/index.html` from any static host. The build uses relative paths, so it also works from a sub-folder. There is no backend, no account and no live API.

Useful URLs:

| URL | Opens |
|---|---|
| `/` | Entry screen: choose an expedition (or resume) |
| `/#guide` | The teacher guide, ready to print |
| `/#record` | Record the narration in your own voice |
| `/?presentation=static` | Illustrations instead of 3D (also available in Settings) |

## Checks

```bash
npm run typecheck          # TypeScript
npm test                   # unit tests: lesson controller + content validation
npm run validate:content   # structural content checks; lists records awaiting review
npm run release-check      # also fails on any unreviewed record or relationship
npm run test:e2e           # Playwright: full keyboard-only lesson, fallbacks, refresh, guide
```

To run the end-to-end tests against a Chromium that is already installed, set `CHROMIUM_PATH=/path/to/chrome`. Otherwise run `npx playwright install chromium` once.

## What's in the MVP

| PRD requirement | Where |
|---|---|
| OE-01 Launch and loading | Entry screen with **Start lesson** / **Explore**; progress while the reef builds; on failure, **Try again** or **Use illustrations** (`src/app.ts`) |
| OE-02 Guided navigation | Three stop buttons, fixed framed viewpoints, persistent **Return to lesson** (`src/scene/ReefScene.ts`) |
| OE-03 Organism inspection | Select in the scene or from the list; highlight ring; card with close / return; Esc closes and focus returns (`src/ui/views.ts`) |
| OE-04 Lesson state | Step indicator; Back, Next, Pause, Replay, Restart (`src/lesson/controller.ts`) |
| OE-05 Food-web challenge | Two relationships, click/tap only, explanatory feedback and retry |
| OE-06 Shelter investigation | Prediction required before reveal; reversible Before/After; labelled **Simplified example** |
| OE-07 Exit questions | Three questions; recap separates completed, attempted and skipped; rubric for open reasoning |
| OE-08 Teacher guide | Objective, timing, vocabulary, prompts, answers, rubric, sources; prints in full (`src/ui/guide.ts`) |
| OE-09 Narration and video | Pause, mute, replay, skip; captions match narration; transcript; optional video never blocks |
| OE-10 Explore mode | Free exploration with no gates; **Start guided lesson** begins from a clean state |
| OE-11 Session controls | Non-identifying progress and settings in local storage; **Clear session**; refresh behaviour below |
| OE-12 Alternative presentation | Static illustrations with the same cards, questions and explanations (`src/scene/StaticScene.ts`) |

### Browser support

Classroom boards often run an older built-in browser. The build produces two bundles: a modern one, and a legacy one (with polyfills) for browsers older than Chrome 105, down to Chrome 64 / Safari 12. Each browser loads the right one automatically. The 3D reef needs WebGL 2; without it the lesson switches to the illustrations. If the app ever fails to start, the page shows a message with the browser version after 15 seconds, so nobody is left looking at a blank screen. A Playwright test runs the lesson through the legacy bundle.

### Refresh behaviour

Lesson progress (step, stop, answers, class prediction, optional class idea) and display settings are saved in the browser's local storage on this computer only. After a refresh, the entry screen offers **Resume lesson (step N)** alongside **Start lesson**; audio restarts only after a click. The open organism card is not restored. **Restart lesson** clears answers; **Settings → Clear session** removes everything stored. If storage is blocked (for example a private window), the lesson still works but won't survive a refresh. This is covered by `tests/e2e/lesson.spec.ts`.

### Keyboard

| Key | Action |
|---|---|
| N or Page Down | Next step (works with presentation clickers) |
| B or Page Up | Previous step |
| P | Pause or resume narration and motion |
| R | Replay narration |
| Esc | Close the open card, video or guide |

Everything else is reachable with Tab and Enter/Space. Touch works but is never required, and no task needs dragging.

## Architecture

Lesson content is plain data, kept separate from rendering and input so the same records can drive the 3D scene, the illustrations, the guide and a later VR release.

```
src/
  content/        Content layer: organisms, habitats, food & shelter relationships,
                  lesson steps, questions, narration, sources, asset register, validation
  lesson/         Lesson controller (pure reducer, serializable state) and local storage
  scene/          Environment renderer (three.js, procedural models) and static illustrations
  audio/          Narration (browser speech + captions) and synthesized ambience
  ui/             Dock, card, recap and teacher-guide templates
  app.ts          Experience shell: entry, modes, loading/error recovery, settings, input
tests/unit/       Controller and content tests (Vitest)
tests/e2e/        Classroom-board flows (Playwright)
scripts/          Content validation / release gate
```

- **No external assets.** Every 3D model, illustration and the ambience sound is generated in code, so there is nothing third-party to license or download. The asset register is in `src/content/assets.ts`.
- **Textures.** Simple shapes, good surfaces: seamless sand ripples, coral rubble, porous rock with coralline crust, elkhorn corallites, brain-coral grooves (grown with a reaction–diffusion model), sea-fan lattices and fine animal skin. They are generated by `node scripts/generate-textures.ts` into `public/textures/` (about 1.5 MB). Rocks, corals and animals use seamless triplanar mapping (`src/scene/textures.ts`). If a texture can't load, that surface falls back to plain colour.
- **Release gate.** Every content record carries `contentVersion`, `review` and `sources`. Release validation rejects anything unreviewed, any reviewed record without a reviewer and date, broken references, card copy over 45 words, and assets missing from the register.
- **Quality levels.** Low quality halves the seagrass, cuts particles and light shafts, removes shadows and caps pixel ratio at 1. No organism, card or activity is removed.
- **Motion.** Fixed viewpoints only — no sway, shake, dives or auto-swimming. `prefers-reduced-motion` turns off ambient motion and makes camera moves instant; both are also in Settings.
- **VR boundary.** Input reaches the lesson only through `dispatch(action)`, and the scene only through `setViewpoint` / `setSelected` / `setShelterView`, so a WebXR renderer can reuse the controller and content without touching the curriculum. VR is not part of this release.

### Budgets (initial targets — validate on the classroom hardware)

| Area | Target | Current build |
|---|---|---|
| Initial transfer | ≤ 15 MB compressed | ≈ 185 KB gzipped (JS + CSS + HTML) |
| Time to usable scene | ≤ 10 s on 20 Mbps | Measure during the technical rehearsal |
| Rendering | 60 FPS reference, ≥ 30 FPS classroom | **Settings → Show performance** shows live FPS |
| Control feedback | ≈ 200 ms | Local UI updates synchronously |

## Can you find…? and bonus animals

Twenty animals can be tapped, across all three stops: the five featured organisms plus 15 "spotters", including brain coral, sea fan, sponge, nurse shark, spiny lobster, sea urchin, green moray, octopus, blue tangs, sergeant majors, spotted eagle ray, cushion sea star, sea cucumber, southern stingray and hermit crab. Each one wiggles and reads a one-line fact aloud, and small animals have generous invisible tap areas for small fingers.

**Can you find…?** (start screen or Explore) is a turn-taking game for the youngest classes. The board asks for one animal at a time. Any tap gets a response, and the right one is celebrated with a close-up. Hint, Hear it again and Skip this animal keep it moving. Spotter content lives in `src/content/findables.ts` with sources and review status, like the featured organisms.

## Expedition 2: The Changing Reef

What’s harming Belize’s reef, told the way the research tells it. Both levels share the same reef and work in 3D or with the illustrations.

**Grades 3–6** (about 10 minutes, six steps):

1. **Briefing.** Who has seen seaweed piled on a beach? This is a good moment for the teacher’s own photos or stories from Belize.
2. **The belt.** A simplified map of the Atlantic shows the great sargassum belt before 2011, in 2018 and at the May 2025 record, drawn to scale between the two years. Animated currents carry it west to Belize.
3. **What feeds it?** The class records a prediction first, then turns *extra nutrients*, *warmer water* and *ocean currents* on and off and watches the map (labelled **Simplified example**). The reveal follows the research: nutrients from land are a big part, with currents and warmer water too, and scientists are still investigating. Warming is never presented as the only cause.
4. **Our reef.** A toggle brings thick mats in overhead. Light dims and the caustics fade, and piles settle on the sand. Each stop explains what the shade does to coral and seagrass and why rotting piles are a problem. Then comes the twist: in the open ocean, sargassum is a home for baby turtles. Twelve pieces of trash (bags, bottles, a ghost net, fishing line) can be tapped to clean them up, each with a sourced fact.
5. **Explain.** Two checked questions, plus a discussion question with a rubric.
6. **Recap.** Key ideas, a completed / attempted / skipped summary, and **Not just Belize**: the 2026 Southern California marine heatwave that brought warm-water fish and sharks north.

**Little Explorers (TK–2)** (five steps): a short story; **clean up**, where children take turns tapping the trash across all three stops; **seaweed**, where they see it get darker under the mats; **helpers**, four big cards with ways to help; and a celebration that ends with “look, don’t touch”.

Content lives in `src/content/changing.ts`, with every claim sourced and marked draft until reviewed. The map is drawn in code (`src/scene/MapView.ts`), and the 3D mats and trash are in `src/scene/changing3d.ts`.

## Real reference photos

The scene is illustrated, so animal cards, the *Can you find…?* "You found it!" screen and Expedition 2 have a slot for a **real photo**: the actual animal, or real sargassum floating and piled on a beach. Photos sit in the side panel, labelled *Real photo* with their credit and licence, and never cover the reef. Subjects without a photo show none. See [docs/photos.md](docs/photos.md) for the 22 photos wanted, which licences are safe, and how to add one.

## Your own voice

The narration can use recordings of your own voice in place of the browser voice. The 14 Expedition 1 lines are recorded; the game, animal-fact and Expedition 2 lines still use the browser voice until they are recorded. Open `/#record` (or **Teacher guide → Record narration**) to record them line by line in the browser. See [docs/narration.md](docs/narration.md) for the full script and how recordings are added.

## Optional video segments

Three short segments from Devin are supported: an opening invitation, a prompt before the shelter investigation and a closing reflection. To add one, place the file and its captions in `public/media/`:

```
public/media/devin-opening.mp4   public/media/devin-opening.vtt
public/media/devin-shelter.mp4   public/media/devin-shelter.vtt
public/media/devin-closing.mp4   public/media/devin-closing.vtt
```

The app checks for each file at startup and offers a **Message from Devin** button only when it exists. Then update the `transcript` in `src/content/lesson.ts` to the exact words spoken. The current transcripts are suggested scripts, and they appear in the app only once a video is added. Keep each segment to about 15–30 seconds, and add the recording to the asset register.

## Documents

- [docs/content-review.md](docs/content-review.md): source register, review checklist and how to record a review
- [docs/platform-decision.md](docs/platform-decision.md): Atlas reuse assessment and the platform decision
- [docs/pilot-checklist.md](docs/pilot-checklist.md): technical rehearsal log and pilot plan
- [docs/narration.md](docs/narration.md): narration script and how to add your recordings
- [docs/photos.md](docs/photos.md): real reference photos — what's wanted and how to add them

## Privacy

No accounts, names, recordings, analytics, advertising or third-party tracking. On a shared board, answers are class-level interactions and are never reported as individual mastery.

---

© Devinci Global LLC. The scene is an educational composite inspired by Belize. It is not a surveyed digital twin of any named reef or a live monitoring system. No institutional affiliation or endorsement is implied by the sources cited.
