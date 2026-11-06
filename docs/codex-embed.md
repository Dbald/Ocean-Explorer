# Running inside The Codex

Ocean Explorer stays its own app at oceanexp.netlify.app. The Codex (dbcodex.netlify.app) shows it inside a course page, in a frame, and the two talk through `window.postMessage`.

## Turning it on

Embedded mode is on only when the page is framed **and** opened with `?embed=codex`. Opened directly, nothing changes.

```
https://oceanexp.netlify.app/?embed=codex&start=lesson
```

- `start=lesson` opens straight into the Belize lesson (resuming a saved one if there is one).
- In embedded mode the Ocean Explorer brand and the **Home** button are hidden: The Codex header handles the course and leaving.

The Codex frame should allow fullscreen: `<iframe allow="fullscreen; autoplay; xr-spatial-tracking" …>`.

## Trusted origins

Messages are accepted from, and sent to, only:

- `https://dbcodex.netlify.app`
- Codex deploy previews (`https://deploy-preview-N--dbcodex.netlify.app`)
- any origin listed in the build variable `VITE_CODEX_ORIGINS` (comma separated)
- `http://localhost:*`, in development builds only

No names or identifying data are sent: only lesson progress.

## Ocean Explorer → The Codex

Every message has `source: 'ocean-explorer'` and `version: 1`.

| type | fields | when |
|---|---|---|
| `ready` | `lesson`, `labels` | the app has started (`labels`: whether every name label is showing) |
| `step_changed` | `mode`, `step`, `index`, `total`, `label` | a stepped activity starts or moves |
| `lesson_completed` | `mode` | the last step is reached |
| `organism_selected` | `id`, `title` | a creature is tapped |
| `prediction_recorded` | `choice` | the class records its shelter prediction |
| `labels_changed` | `on` | "Always show name labels" is switched in Settings |

## The Codex → Ocean Explorer

Every message needs `source: 'the-codex'`. Anything else is ignored.

| type | fields | effect |
|---|---|---|
| `start` | `mode`, `resume?` | start (or resume) an activity |
| `set_labels` | `on` | `true`: every creature's name shows; `false` (the default): a name shows only on hover or for the selected creature |
| `go_to_step` | `step` | jump to a lesson step |
| `pause_narration` | | pause narration and ambience |

The protocol lives in `src/embed/bridge.ts`. Power a City can copy that file and keep the same message names.
