# Platform decision

**Decision (October 6, 2026):** Ship Ocean Explorer as a separate, standalone browser application (Vite + TypeScript + three.js), structured so its lesson framework can later be shared with Atlas.

## Atlas assessment

The PRD asks for Atlas to be inspected before deciding whether to share components. No repository named Atlas was available to this implementation: the Ocean Explorer repository was empty, and the GitHub account's repository list had no Atlas project. That means:

- No Atlas component was reused, and no integration with Atlas is assumed.
- Atlas performance on classroom hardware has not been measured here.
- If Atlas lives in another repository, the reuse review in milestone 1 is still open. The table below shows what would transfer.

## What is reusable from Ocean Explorer

| Layer | Reusable as is | Notes |
|---|---|---|
| Lesson controller (`src/lesson/controller.ts`) | Yes | Pure reducer; steps come from content. Works the same in any renderer. |
| Content model and validation (`src/content/types.ts`, `validate.ts`) | Yes | Review status, sources, asset register and the release gate apply to any expedition. |
| Storage (`src/lesson/store.ts`) | Yes | Local, non-identifying, with Clear session. |
| Narration and captions (`src/audio/narrator.ts`) | Yes | Plain text in, captions out. |
| Teacher guide (`src/ui/guide.ts`) | Mostly | Built from content data; section order is lesson-specific. |
| Dock, cards and activities (`src/ui/views.ts`) | Mostly | The food-choice, prediction, comparison and rubric patterns are generic; the copy comes from content. |
| Reef scene (`src/scene/`) | Lesson-specific | Procedural models are specific to this reef, but the viewpoint, selection and insets API is generic. |

## Why standalone

- The PRD prefers existing project conventions over a new engine, but there was no existing project to inspect. three.js is a small, widely used dependency with no build-time engine lock-in.
- A separate app keeps Ocean Explorer's identity distinct within the Devinci Global portfolio, as the working defaults suggest, while still allowing an entry point from Atlas later.
- The production build is about 185 KB gzipped, which leaves plenty of room under the 15 MB budget for future recorded media.

## Revisit when

- The Atlas repository becomes available: compare its renderer, input handling and content model with the table above before the next expedition.
- A VR release is planned: add a WebXR renderer behind the same `ReefScene` interface (`setViewpoint`, `setSelected`, `setShelterView`) and keep the controller and content unchanged.
