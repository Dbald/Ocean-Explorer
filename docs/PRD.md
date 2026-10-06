# Ocean Explorer — Belize: The Living Reef

Product requirements document · Version 1.0 · October 5, 2026

**Owner:** Devin Baldwin / Devinci Global LLC  
**Status:** Ready for implementation planning; assumptions and content review gates are identified below.  
**First release:** A browser-based, teacher-led reef expedition for a classroom display.  
**Guiding question:** What makes this reef a home?

## 1. Product direction

Ocean Explorer turns an underwater environment into a lesson students can explore, discuss, and explain. The first expedition takes a class through a Belize-inspired reef, adjacent seagrass meadow, and sandy seabed. Students inspect organisms, connect food relationships, predict the effect of losing shelter, and explain a conservation choice.

The opportunity comes from Devin’s classroom trial of Atlas: students were intrigued when the experience ran on a large classroom board. This is evidence of initial engagement, not yet evidence of improved learning or purchasing demand. Ocean Explorer should test whether that curiosity produces understanding and whether another teacher can lead the experience independently.

The reusable product is a lesson framework: **explore → predict → manipulate → observe → explain**. Ocean Explorer is its next application. Reuse suitable Atlas components after inspecting the codebase; this document does not assume a particular engine, framework, repository, or completed integration.

**Positioning:** A guided underwater field trip that helps a whole class understand how organisms depend on food and shelter.

## 2. Audience and assumptions

| Audience | Need | Design response |
|---|---|---|
| Teacher or facilitator | Lead a short lesson without learning complex controls | Start in one click, visible lesson steps, pause, reset, and teacher notes |
| Students, initially grades 3–6 | See relationships and participate in decisions | Clear visuals, short language, class predictions, and immediate explanations |
| Individual desktop learner | Revisit discoveries at their own pace | Self-paced Explore mode using the same scene and cards |
| Future headset learner | Experience scale and presence underwater | A later VR release using the same lesson content |

Grades 3–6 are a proposed starting audience, not a confirmed grade range from the classroom trial. The classroom board’s computer, resolution, touch capabilities, and network speed must be recorded during the first technical test. Do not require touch: a mouse and keyboard must support the full lesson.

The first environment is an educational composite inspired by Belize. It must not be represented as a surveyed digital twin of a named reef or as a live ecological monitoring system.

## 3. Goals and learning outcomes

### Product goals

1. Deliver a complete guided lesson in approximately 10 minutes, with optional discussion extending it to 15 minutes.
2. Make all essential interactions usable on a classroom board through a connected computer.
3. Help students explain relationships rather than only recall organism names.
4. Let another teacher run the lesson using its embedded guide.
5. Establish reusable content, interaction, assessment, and narration components for future expeditions.

### Learning outcomes

At the end, students should be able to:

- Identify at least three of the five featured organisms.
- Describe a reef as habitat that provides resources, including food and shelter.
- Interpret two validated food relationships, with arrows showing energy moving from food to consumer.
- Explain one plausible effect of reduced shelter using evidence from the activity.
- Propose a protective action and connect it to an organism’s needs.

Vocabulary: habitat, organism, ecosystem, food web, shelter, producer, consumer. Introduce terms when needed and provide an accessible glossary. Formal curriculum-standard alignment requires a separate content review; do not claim alignment or certification in the initial release.

## 4. Release boundaries

| Included in MVP / P0 | Later releases |
|---|---|
| One compact Belize-inspired environment with three connected habitat stops | Additional destinations, ocean zones, and deep-sea expeditions |
| Five organism profiles and a small set of supporting food-resource cards | Larger field guide and species collection |
| Guided Lesson and self-paced Explore modes | Student accounts, assignments, and teacher dashboards |
| One food-web activity and one shelter-loss comparison | Temperature, acidification, pollution, and other environmental models |
| Three exit questions and an embedded teacher guide | LMS integration, standards mapping, and persistent learning records |
| Narration support, captions, transcript, and optional Devin video segments | AI tutoring, multilingual narration, and live expert sessions |
| Desktop and classroom-board input | Production VR, multiplayer, and individual student voting devices |
| Local session progress with an explicit reset | Cloud analytics, subscriptions, and school administration features |

No collection of real-world organisms, combat, feeding wildlife, or rewards for disturbing the habitat. No backend is required for the MVP. Public publishing and hosting are implementation decisions outside the act of approving this PRD.

## 5. The first lesson

| Time | Stage | Learner action | Teacher control / evidence |
|---|---|---|---|
| 0:00–1:00 | Briefing | Consider “What makes this reef a home?” and offer an initial explanation | Show objective and a brief baseline prompt |
| 1:00–4:00 | Explore | Visit reef, seagrass, and sand; inspect five featured organisms | Advance between framed viewpoints; prompt observations |
| 4:00–6:00 | Connect | Complete two food relationships and explain arrow direction | Select cards, submit, reveal feedback, and retry |
| 6:00–8:00 | Investigate | Predict how fewer hiding places could affect a small reef fish, then compare scenes | Record one class prediction before revealing the example |
| 8:00–10:00 | Explain | Answer three exit questions and justify a protective action | Reveal explanations and open the completion recap |

All timing is a target. Discussion must never be cut off by an automatic timer. Teachers can go back, pause, skip a narration segment, or restart an activity. Skipped activities remain marked as not attempted rather than completed.

### Opening experience

Begin at a calm shallow-water viewpoint with filtered sunlight and a clear reef silhouette. Show the expedition title, a brief objective, and two actions: **Start lesson** and **Explore**. Audio begins only after an intentional user action. An optional short introduction from Devin invites the class to investigate the reef.

### Habitat stops

- **Reef:** Focus on coral structure and the spaces organisms use for shelter.
- **Seagrass meadow:** Show an adjacent habitat and introduce food resources and habitat connections.
- **Sandy seabed:** Encourage close observation of life that may be less immediately visible.

Use a single compact scene or bounded scene sections. Three stops do not mean three large independent worlds. Movement should serve the lesson, with a persistent Return to lesson control.

## 6. Content and scientific accuracy

### Proposed organism roster

| Featured organism | Instructional purpose | Required review before publication |
|---|---|---|
| Reef-building coral | Establish that coral is an animal and that reef structure provides habitat | Select a Belize-relevant species and verify colony form and explanation |
| Parrotfish | Introduce grazing and food relationships | Verify species-specific diet; avoid treating all parrotfish diets as identical |
| Caribbean reef predator, provisionally a barracuda | Introduce a consumer relationship | Validate the selected species, prey connection, and relative scale |
| Green sea turtle | Connect an animal to seagrass habitat | Identify life stage and qualify diet appropriately |
| Queen conch | Encourage observation at the seagrass/sand boundary | Verify name, appearance, diet, and habitat description |

These are content candidates, not five already verified species records. A small unprofiled reef fish may illustrate shelter use, but any specific identity or behavior still needs a source. Supporting algae, seagrass, or plankton cards can explain food resources without expanding the five-profile scope.

Each organism card must include a common name, scientific name after verification, habitat, one short role explanation, one observation prompt, optional narration, transcript, and source record. Default visible copy should stay under roughly 45 words, excluding the name; place additional explanation behind Learn more.

### Content guardrails

- Validate each food-web edge independently. Do not imply that the five featured organisms form one linear chain.
- Label arrows **energy moves from food to consumer** and provide an example before the activity.
- Keep shelter relationships visually distinct from feeding relationships.
- Use **Simplified example** on the shelter comparison. Show fewer hiding places and a possible behavioral response, with language such as “This fish may need to find shelter elsewhere.”
- Do not make organisms instantly die or disappear as if the animation predicts real population change. Do not introduce fabricated population counts, scientific forecasts, or unsupported percentages.
- Any later bleaching lesson must distinguish living bleached coral, coral death, and loss of physical structure; they are not interchangeable events.
- Keep environmental claims, species labels, scale, and behavior traceable to primary scientific or educational sources. Review the complete lesson before release.
- Maintain an asset register for creator, source, license, attribution, and permitted distribution. Online availability does not establish reuse rights.

## 7. Functional requirements and acceptance criteria

| ID | Requirement | Acceptance criteria |
|---|---|---|
| OE-01 | Launch and loading | Start lesson and Explore work from the entry screen; loading shows progress or meaningful status; an asset failure presents retry or a usable fallback |
| OE-02 | Guided navigation | Teacher can reach all three stops with explicit controls, return to the current task, and never become trapped outside the scene |
| OE-03 | Organism inspection | Every featured organism opens the correct card; selected object is highlighted; close and return controls work with mouse, touch where available, and keyboard |
| OE-04 | Lesson state | Current step is visible; back, next, pause, replay, and restart operate predictably; restart clears answers and progress |
| OE-05 | Food-web challenge | At least two reviewed connections can be attempted; click/tap selection is available without dragging; incorrect answers explain the relationship and allow retry |
| OE-06 | Shelter investigation | A prediction is requested before reveal; before/after states are reversible; explanatory copy identifies the example as simplified |
| OE-07 | Exit questions | Three questions offer feedback; completion recap separates attempted, skipped, and completed work; open-ended reasoning has a teacher rubric |
| OE-08 | Teacher guide | Guide includes objective, timing, vocabulary, prompts, answers, rubric, and source credits; printable browser view contains the full guide |
| OE-09 | Narration and video | Narration can be paused, muted, replayed, or skipped; captions and transcript communicate the same essential content; missing video never blocks a lesson |
| OE-10 | Explore mode | Users can visit stops and inspect organisms without task gates, then start a guided lesson from a known state |
| OE-11 | Session controls | Store only non-identifying local progress/preferences if needed; provide Clear session; browser refresh behavior is documented and tested |
| OE-12 | Alternative presentation | A low-motion presentation with static habitat images and the same lesson cards, questions, and explanations remains usable if 3D fails |

### Assessment design

1. **Food connection:** Choose which way energy moves between a reviewed food source and consumer. Correct response requires the proper direction, followed by an explanation.
2. **Shelter reasoning:** “What might happen if this fish has fewer places to hide?” Accept a plausible, qualified answer connected to shelter needs; do not require one exact phrase.
3. **Protection choice:** “What would you protect here, and why?” Teacher scores 0 for no relevant reasoning, 1 for identifying a need, and 2 for linking an action, habitat feature, and organism need.

Use supportive feedback and discovery progress. Do not score how quickly children answer. On a shared board, displayed responses are class-level interactions; they must never be reported as individual student mastery.

## 8. Visual design, interaction, and accessibility

The visual direction is realistic and inviting: turquoise water, natural reef colors, readable silhouettes, restrained particles, and gentle ambient movement. Environmental beauty should support observation. Avoid a dense game HUD or persistent decorative overlays covering the organisms.

- Large board controls, initially at least 56 CSS pixels in the classroom layout, with adjustable text scale.
- Begin with approximately 28–32 CSS pixel body text at a 1080p classroom layout; validate readability from the back of the actual room rather than relying on pixel size alone.
- Strong text contrast, solid or sufficiently opaque information panels, visible focus states, and no information conveyed only by color.
- Semantic HTML controls and readable text outside the 3D canvas. Every essential learning task must be possible through the alternative presentation.
- One main instruction and one featured information card at a time; use progressive disclosure for details.
- Fixed guided viewpoints by default. No forced camera sway, shaking, sudden dives, or continuous auto-swimming. Respect reduced-motion preferences and offer instant viewpoint changes.
- Pause ambient animation independently of narration. Keep captions on by default in classroom mode; separate voice and ambience volume controls.
- Make fullscreen optional; leaving fullscreen must preserve the lesson. No hover-only instruction or gesture-only action.
- Select organisms to observe them. Interaction does not imply permission to touch or handle wildlife in reality.

## 9. Technical requirements and architecture

Implement as a browser experience with lesson content separated from rendering and input. Inspect Atlas before choosing whether to share components or ship a separate application. Prefer existing, maintainable project conventions over introducing a new engine solely for this lesson.

### Components

- **Experience shell:** Entry screen, settings, modes, loading, and error recovery.
- **Environment renderer:** Habitat sections, organisms, lighting, bounded navigation, and quality levels.
- **Interaction layer:** Selection, focus, highlights, and input adapters.
- **Lesson controller:** Explicit step state, prerequisites, answers, retries, and completion state.
- **Content layer:** Organism records, habitat records, prompts, reviewed relationships, source credits, captions, and media references.
- **Teacher layer:** Facilitation notes, printable guide, explanations, and classroom presentation controls.
- **Assessment layer:** Question feedback and a local recap; no account or server dependency.

Minimum content fields: stable ID, title, content version, review status, source references, habitat ID, asset references, accessible description, narration/transcript references, and activity-specific fields. A food relationship stores source organism/resource, consumer, explanation, citation, and review status. Release validation rejects unreviewed relationships.

### Initial engineering budgets

These are proposed targets to validate on the actual classroom hardware, not measured capabilities of Atlas.

| Area | Target / release check |
|---|---|
| Initial transfer | At most 15 MB compressed for first usable scene and essential UI; load optional video and other assets on demand |
| Time to usable scene | At most 10 seconds under a documented 20 Mbps connection test; provide progress during longer loads |
| Desktop rendering | Target 60 FPS on the development reference device; sustain at least 30 FPS on the classroom device during the complete lesson |
| Control feedback | Visible response within roughly 200 ms for local UI actions |
| Reliability | Complete a 15-minute session with no crash, unrecoverable state, or failed essential interaction |
| Quality reduction | Low-quality setting reduces particles, shadows, and effects without removing required organisms, cards, or activities |

Use compressed 3D assets and textures, repeated geometry efficiently, simple animation, capped visual effects, and bounded render resolution as appropriate to the selected engine. Record device and browser details alongside performance measurements.

Core lesson content should be bundled or otherwise independent of live third-party APIs. Full offline installation is deferred; if cached content is unavailable and the network fails, show a clear recovery path. A live data feed is not required.

### VR extension boundary

Structure input and lesson content so VR can be added without rewriting the curriculum. VR is not an MVP release gate. A later release must separately validate controller selection, comfortable UI distance and scale, stationary/teleport navigation, snap turning, captions, and performance on the chosen headset. Do not market VR support until that device-specific testing passes.

## 10. Teacher package and personal presence

The embedded guide must allow a second teacher to lead the experience without Devin present. Include a one-sentence objective, a 10-minute sequence, suggested discussion prompts, vocabulary, answers, assessment rubric, accessibility controls, and preparation instructions.

Support three optional Devin segments: an opening invitation, a prompt before the shelter investigation, and a closing reflection. Keep each approximately 15–30 seconds and within the lesson timing. Display video in a dismissible panel so it does not obscure the scene. Caption all segments and provide equivalent text. Recorded video is an enhancement; a complete text-led lesson can ship first.

## 11. Validation and success criteria

### Pilot plan

1. Run a technical rehearsal on the actual classroom computer and display.
2. Deliver the lesson in Devin’s classroom; note navigation friction, readability, discussion time, and points of confusion.
3. Use a brief baseline question and the exit questions to compare understanding. Paper responses or teacher tallies can measure individual understanding without creating online student profiles.
4. Ask a second educator to run the lesson from the guide and record where assistance was needed.
5. Revise scientific copy, pacing, and controls before expanding the content library.

### Proposed pilot thresholds

- A second teacher can start the lesson within two minutes of opening the link and guide.
- The guided content takes roughly 8–12 minutes, excluding optional discussion.
- At least 80% of sampled students identify three featured organisms after the lesson.
- At least 70% provide a valid food relationship and shelter explanation using the rubric.
- Baseline-to-exit results show improvement in the targeted explanation; report sample size and method, and do not infer causal impact from a small uncontrolled pilot.
- Teacher can read essential labels from the back of the room and complete every task without technical intervention.

These are decision thresholds, not results or promises. Collect feedback through teacher observation for the MVP. Avoid names, student recordings, personal profiles, advertising, and third-party behavioral tracking in the product.

## 12. Delivery sequence and release gates

| Milestone | Deliverable | Exit condition |
|---|---|---|
| 1. Content and reuse review | Final species roster, source register, lesson storyboard, Atlas component assessment | Food relationships and habitat claims reviewed; platform decision recorded |
| 2. Playable slice | One habitat stop, one selectable organism, one question, working classroom controls | Works on the classroom display; basic readability and performance targets hold |
| 3. Complete lesson | Three stops, five profiles, food web, shelter comparison, exit questions | Entire lesson works without placeholder essential content |
| 4. Teaching and access pass | Guide, captions, keyboard flow, alternative presentation, optional video | Second teacher can follow the guide; essential learning is available without 3D or audio |
| 5. Classroom pilot | Observation notes and learning checks | Identified blockers resolved; scope and evidence reviewed before expansion |

Release requires reviewed scientific content and licenses; successful board/desktop testing; correct lesson state and reset; readable captions and controls; tested recovery from missing optional media and 3D failure; and a complete teacher guide. Validate the chosen browser versions at implementation time. Timeline estimates follow repository and asset inspection.

## 13. Risks and decisions

| Risk / unresolved point | Response |
|---|---|
| The environment is engaging but the lesson is unclear | Tie each interaction to an outcome; test explanations and remove distracting features |
| Classroom hardware struggles | Test the playable slice early; provide low-quality and static presentation modes |
| Species or food relationships are inaccurate | Complete source-based content review before final modeling and publication |
| Scope expands into a complete ocean simulator | Hold the MVP to one location, five profiles, two activities, and one lesson |
| The guided lesson depends on Devin’s live explanation | Put essential teaching cues and explanations into the guide and UI |
| Atlas reuse is more expensive than expected | Inspect the repository before estimating; isolate transferable content and interaction patterns |
| Actual student grade or reading level differs | Pilot the proposed grades 3–6 language and adjust before claiming broader suitability |

Working defaults: desktop/classroom first; separate Ocean Explorer identity within Devinci Global’s learning portfolio; optional future entry point from Atlas; no required student account; no required headset; no required live API. These defaults allow implementation planning without making unverified integration commitments.

## 14. Expansion and commercial hypothesis

After the first lesson is usable by another educator and learning checks are promising, add additional expeditions using the same framework: mangrove nurseries, reef stewardship, ocean zones, and eventually a carefully researched Belize sargassum module.

Potential audiences include schools, after-school programs, museums, aquariums, and conservation education partners. A reusable expedition library or commissioned partner module may become a business offering. Buyer interest, budgets, pricing, and procurement fit remain unvalidated; the MVP should produce a working lesson, a teacher case study, and a credible demonstration before building payment or administration systems.

## 15. Source foundation

Sources checked during PRD preparation. These support the educational direction; they do not replace species-level review, model validation, or asset licensing. No institutional affiliation or endorsement is implied.

- [Belize Fisheries Department — Hol Chan Marine Reserve](https://fisheries.gov.bz/hcmr/): describes linked reef, seagrass, and mangrove habitats and local ecology education. Supports the Belize habitat context, not an exact reconstruction of a reserve.
- [NOAA — Coral reef ecosystems](https://www.noaa.gov/education/resource-collections/marine-life/coral-reef-ecosystems): explains habitat functions including food and shelter. Supports the lesson’s central relationship.
- [NOAA — Are corals animals or plants?](https://oceanservice.noaa.gov/facts/coral.html): supports the coral-as-an-animal concept and reef-building explanation.
- [NOAA — Marine life](https://www.noaa.gov/education/resource-collections/marine-life): provides an educational starting point for marine food relationships. Specific MVP food-web edges still require verification.

**Definition of done:** Another teacher can open Ocean Explorer, lead a coherent Belize reef lesson on a classroom display, and use student explanations to assess whether the intended learning occurred.
