# Ocean Explorer — Belize: The Living Reef

A teacher-led, browser-based reef expedition for a classroom display. A class explores a Belize-inspired reef, seagrass meadow and sandy seabed, inspects five organisms, connects food relationships, predicts the effect of losing shelter, and explains a conservation choice.

**Guiding question:** What makes this reef a home?
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
| `/` | Entry screen (Start lesson / Explore) |
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

## Your own voice

The narration can use recordings of your own voice in place of the browser voice: 14 short lines, about 3½ minutes in total. Open `/#record` (or **Teacher guide → Record narration**) to record them line by line in the browser. See [docs/narration.md](docs/narration.md) for the full script and how recordings are added.

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

## Privacy

No accounts, names, recordings, analytics, advertising or third-party tracking. On a shared board, answers are class-level interactions and are never reported as individual mastery.

---

© Devinci Global LLC. The scene is an educational composite inspired by Belize. It is not a surveyed digital twin of any named reef or a live monitoring system. No institutional affiliation or endorsement is implied by the sources cited.
