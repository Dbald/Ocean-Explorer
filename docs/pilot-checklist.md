# Pilot checklist

## 1. Technical rehearsal (on the actual classroom computer and display)

Turn on **Settings → Show performance** to see live FPS, quality level and viewport size.

| Item | Record |
|---|---|
| Date / who ran it | |
| Computer (make, model, OS) | |
| Browser and version | |
| Display (size, resolution, scaling) | |
| Touch available? (not required) | |
| Network speed (e.g. speed test) | |
| Time from opening the link to a usable reef | target ≤ 10 s at 20 Mbps |
| FPS at each stop, High quality | target ≥ 30 |
| FPS at each stop, Low quality | |
| Narration voice available? | |
| Sound level for voice and ambience | |
| Readable from the back of the room at default text size? | |
| Text size used | |
| Full 15-minute run with no crash or stuck state? | |
| Fallback checked: Settings → Presentation → Illustrations | |
| Fullscreen entered and left without losing place? | |
| Refresh mid-lesson → Resume works? | |

If FPS drops below 30, switch to Low quality. If it's still low, use Illustrations: every activity works there.

## 2. Classroom delivery (Devin's class)

Note navigation friction, readability, discussion time and points of confusion for each step:

| Step | Time taken | Friction / confusion | Notes |
|---|---|---|---|
| Briefing | | | |
| Explore | | | |
| Connect | | | |
| Investigate | | | |
| Explain | | | |
| Recap | | | |

Collect the baseline question before and the exit questions after, on paper or as teacher tallies. Don't record names in the app.

## 3. Second-educator run

The second teacher uses only the link and the printed guide (`/#guide`, then Print).

| Item | Record |
|---|---|
| Time from opening the link and guide to starting the lesson | target ≤ 2 min |
| Points where help was needed | |
| Guide sections that were unclear | |

## 4. Decision thresholds (from the PRD — decisions, not promises)

- [ ] A second teacher starts the lesson within two minutes.
- [ ] Guided content takes roughly 8–12 minutes, excluding optional discussion.
- [ ] At least 80% of sampled students identify three featured organisms.
- [ ] At least 70% give a valid food relationship and shelter explanation, scored with the rubric.
- [ ] Baseline-to-exit results improve on the targeted explanation. Report sample size and method, and don't infer causal impact from a small uncontrolled pilot.
- [ ] Essential labels are readable from the back of the room, and every task is completed without technical intervention.

## 5. Before expanding

- [ ] Content review recorded and `npm run release-check` passes.
- [ ] Blockers from the rehearsal and pilot resolved.
- [ ] Scope and evidence reviewed before adding expeditions.
