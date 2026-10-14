/**
 * Embedded teacher guide (OE-08). Everything a second teacher needs to lead the
 * lesson without Devin present. The same markup is used on screen and in print.
 */
import { assets } from '../content/assets.ts';
import {
  CHANGING_OBJECTIVE,
  CHANGING_QUESTION,
  CHANGING_TITLE,
  beltSnapshots,
  beyondBelize,
  causesReveal,
  changingActions,
  changingExitFood,
  changingExitTwist,
  changingRecords,
  helpers,
  littleSteps,
  olderSteps,
  reefEffects,
  sargassumTwist,
  type ChangingStep,
} from '../content/changing.ts';
import { findables } from '../content/findables.ts';
import { foodRelationships, shelterRelationships } from '../content/food.ts';
import { habitatById } from '../content/habitats.ts';
import {
  COMPOSITE_NOTICE,
  GUIDING_QUESTION,
  LESSON_TITLE,
  OBJECTIVE,
  PRODUCT_NAME,
  connectExample,
  connectItems,
  exitQuestions,
  glossary,
  shelterPrediction,
  shelterReveal,
  steps,
  videoSegments,
} from '../content/lesson.ts';
import { narration, narrationById } from '../content/narration.ts';
import { organisms } from '../content/organisms.ts';
import { sources } from '../content/sources.ts';
import { esc, foodArrow, shelterLink } from './html.ts';
import { nameOf } from './views.ts';

export const SHORTCUTS: [string, string][] = [
  ['N, Page Down', 'Next step'],
  ['B, Page Up', 'Previous step'],
  ['P', 'Pause or resume narration and motion'],
  ['R', 'Replay narration'],
  ['Esc', 'Close the open card or panel'],
  ['Tab / Shift+Tab', 'Move between controls; Enter or Space to select'],
];

export function renderGuide(availableVideos: string[]) {
  const allDraft = [...organisms, ...foodRelationships, ...shelterRelationships].some((r) => r.review.status !== 'reviewed');
  return `<article class="guide">
    <header>
      <p class="eyebrow">${esc(PRODUCT_NAME)} · Teacher guide</p>
      <h1>${esc(LESSON_TITLE)}</h1>
      <p class="lead"><strong>Objective:</strong> ${esc(OBJECTIVE)}</p>
      <p><strong>Guiding question:</strong> ${esc(GUIDING_QUESTION)}</p>
      <p><strong>Time:</strong> about 10 minutes, or 15 with discussion. Timings are targets — nothing advances on a timer.</p>
      <p><strong>Proposed audience:</strong> grades 3–6 (to be confirmed in the pilot).</p>
      ${allDraft ? '<p class="notice"><strong>Content status:</strong> draft. Species facts and food relationships are sourced but still need scientific review before public release.</p>' : ''}
      <p class="small">${esc(COMPOSITE_NOTICE)}</p>
    </header>

    <section>
      <h2>Before class</h2>
      <ol>
        <li>Open the lesson link on the classroom computer and check that the reef appears. If 3D is slow, choose <em>Settings → Quality: Low</em> or <em>Presentation: Illustrations</em>.</li>
        <li>Check sound. Narration uses the browser’s voice where available; captions are always on screen.</li>
        <li>Stand at the back of the room and check that you can read the text. Use <em>Settings → Text size</em> if needed.</li>
        <li>Choose <strong>Start lesson</strong>. If a previous class left answers behind, use <em>Restart lesson</em> first.</li>
        <li>Have paper or sticky notes ready if you want individual exit responses — the app records no student data.</li>
      </ol>
    </section>

    <section>
      <h2>Lesson sequence</h2>
      <table>
        <thead><tr><th scope="col">Time</th><th scope="col">Step</th><th scope="col">What students do</th><th scope="col">Teacher notes and prompts</th></tr></thead>
        <tbody>
          ${steps
            .map(
              (s) => `<tr>
                <td>${esc(s.time)}</td>
                <th scope="row">${esc(s.label)}</th>
                <td>${esc(s.instruction)}</td>
                <td><ul>${s.teacherNotes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
                  <p><em>Ask:</em> ${s.prompts.map(esc).join(' · ')}</p></td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </section>

    <section>
      <h2>Can you find…? (great for TK–2)</h2>
      <p>A turn-taking game that gives every child a chance to come up and tap. Choose <strong>Can you find…?</strong> on the start screen or in Explore.</p>
      <ol>
        <li>The board asks for one animal, for example “Can you find the sea star?”. Invite one child up to tap it.</li>
        <li>Tapping a different animal is never wrong: it wiggles and says what it is, and the board asks the child to keep looking.</li>
        <li>When the right animal is found, the camera moves in close and the animal’s fact is read aloud. Choose <strong>Next animal</strong> for the next child.</li>
        <li><strong>Hint</strong> makes the animal wiggle with a ring around it. <strong>Hear it again</strong> repeats the question. <strong>Skip this animal</strong> moves on.</li>
      </ol>
      <p>There are ${findables.length} animals across the three stops, enough for a whole class to have a turn. The game finishes with a reminder that in the real ocean we look at animals but never touch them.</p>
      <p class="small">Keyboard and switch users can open <em>Choose from a list</em> in the panel. In the illustrations view the tap areas have no labels, so the picture is the puzzle.</p>
      <table>
        <thead><tr><th scope="col">Animal</th><th scope="col">Stop</th><th scope="col">What children hear</th></tr></thead>
        <tbody>${findables
          .map((f) => `<tr><th scope="row">${esc(f.title)}${f.featured ? ' <span class="small">(featured)</span>' : ''}</th><td>${esc(habitatById.get(f.habitat)!.title)}</td><td>${esc(f.line)}</td></tr>`)
          .join('')}</tbody>
      </table>
    </section>

    ${renderChangingGuide()}

    <section>
      <h2>Vocabulary</h2>
      <dl class="glossary">${glossary.map((g) => `<dt>${esc(g.term)}</dt><dd>${esc(g.definition)}</dd>`).join('')}</dl>
    </section>

    <section>
      <h2>Answers</h2>
      <h3>Connect: food relationships</h3>
      <p>${esc(connectExample.text)}</p>
      <ul>
        ${connectItems
          .map((i) => {
            const right = i.options.find((o) => o.correct)!;
            return `<li>${esc(i.prompt)} <strong>${esc(right.label)}</strong>. ${esc(i.explanation)}</li>`;
          })
          .join('')}
      </ul>
      <h3>Investigate: shelter</h3>
      <p>${esc(shelterPrediction.prompt)} Any plausible, qualified prediction is fine — the comparison is evidence to discuss, not a test.</p>
      <ul>${shelterPrediction.options.map((o) => `<li>${esc(o.label)} — <em>${o.plausible ? 'reasonable' : 'check against the evidence'}</em></li>`).join('')}</ul>
      <p>${esc(shelterReveal.explanation)} ${esc(shelterReveal.caution)}</p>
      <h3>Explain: exit questions</h3>
      <ol>
        ${exitQuestions
          .map((q) => {
            if (q.kind === 'food-choice') {
              return `<li><strong>${esc(q.title)}.</strong> ${esc(q.item.prompt)} Answer: <strong>${esc(q.item.options.find((o) => o.correct)!.label)}</strong>.</li>`;
            }
            if (q.kind === 'shelter-reasoning') {
              return `<li><strong>${esc(q.title)}.</strong> ${esc(q.prompt)} Accept: ${q.options
                .filter((o) => o.plausible)
                .map((o) => `“${esc(o.label)}”`)
                .join(' or ')}, or any other qualified answer connected to shelter. ${esc(q.discussion)}</li>`;
            }
            return `<li><strong>${esc(q.title)}.</strong> ${esc(q.prompt)} ${esc(q.discussion)}
              <table class="rubric-table"><thead><tr><th scope="col">Score</th><th scope="col">Description</th><th scope="col">Example</th></tr></thead>
              <tbody>${q.rubric.map((r) => `<tr><td>${r.score}</td><td>${esc(r.label)}</td><td>${esc(r.example)}</td></tr>`).join('')}</tbody></table>
              <p class="small">On a shared screen, any score you record describes the class discussion — never an individual student’s mastery.</p></li>`;
          })
          .join('')}
      </ol>
    </section>

    <section>
      <h2>Organisms and relationships</h2>
      <table>
        <thead><tr><th scope="col">Organism</th><th scope="col">Stop</th><th scope="col">Role</th><th scope="col">Review</th></tr></thead>
        <tbody>${organisms
          .map(
            (o) => `<tr><th scope="row">${esc(o.commonName)}<br><span class="small"><em>${esc(o.scientificName)}</em>${o.review.status === 'reviewed' ? '' : ' (provisional)'}</span></th>
              <td>${esc(habitatById.get(o.habitat)!.title)}</td><td>${esc(o.role)}</td><td>${esc(o.review.status)}</td></tr>`,
          )
          .join('')}</tbody>
      </table>
      <div class="web">${foodRelationships.map((r) => foodArrow(nameOf(r.food), nameOf(r.consumer))).join('')}
        ${shelterRelationships.map((r) => shelterLink(nameOf(r.shelter), nameOf(r.user))).join('')}</div>
      <p class="small">Arrows: energy moves from food to consumer. Dashed links: shelter. These are separate relationships, not one food chain.</p>
    </section>

    <section>
      <h2>Accessibility and classroom controls</h2>
      <ul>
        <li>Everything works with a mouse and keyboard; touch is optional. Drag is never required.</li>
        <li><strong>Settings:</strong> text size, 3D quality, illustrations instead of 3D, ambient motion, instant camera moves, captions, automatic narration, voice and ambience volume.</li>
        <li><strong>Pause</strong> stops narration and ambient motion together. Discussion is never cut off.</li>
        <li>Captions are on by default and match the narration word for word. The full transcript is under <em>Transcript</em>.</li>
        <li>Fullscreen is optional; leaving fullscreen keeps your place.</li>
        <li>Progress is saved on this computer only, so a refresh resumes where you were. <em>Settings → Clear session</em> removes it.</li>
      </ul>
      <table class="shortcuts"><thead><tr><th scope="col">Key</th><th scope="col">Action</th></tr></thead>
        <tbody>${SHORTCUTS.map(([k, a]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(a)}</td></tr>`).join('')}</tbody></table>
    </section>

    <section>
      <h2>Optional video segments</h2>
      <ul>${videoSegments
        .map((v) => `<li><strong>${esc(v.title)}</strong> (${esc(v.step)}) — ${availableVideos.includes(v.id) ? 'available' : 'not yet recorded; the lesson works without it'}.</li>`)
        .join('')}</ul>
    </section>

    <section>
      <h2>Transcript</h2>
      ${renderTranscript(availableVideos)}
    </section>

    <section>
      <h2>Sources and credits</h2>
      <ul class="sources">${sources
        .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher)} — ${esc(s.title)}</a>. <span class="small">${esc(s.supports)}</span></li>`)
        .join('')}</ul>
      <p class="small">No institutional affiliation or endorsement is implied.</p>
      <h3>Asset credits</h3>
      <ul class="small">${assets.map((a) => `<li>${esc(a.description)} — ${esc(a.creator)}; ${esc(a.license)}.</li>`).join('')}</ul>
      <h3>Privacy</h3>
      <p class="small">No accounts, names, recordings, advertising or tracking. Only lesson progress and display settings are stored, on this device.</p>
    </section>
  </article>`;
}

function sequenceTable(list: ChangingStep[]) {
  return `<table>
    <thead><tr><th scope="col">Time</th><th scope="col">Step</th><th scope="col">What students do</th><th scope="col">Teacher notes and prompts</th></tr></thead>
    <tbody>${list
      .map(
        (s) => `<tr><td>${esc(s.time)}</td><th scope="row">${esc(s.label)}</th><td>${esc(s.instruction)}</td>
          <td><ul>${s.teacherNotes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>${s.prompts.length ? `<p><em>Ask:</em> ${s.prompts.map(esc).join(' · ')}</p>` : ''}</td></tr>`,
      )
      .join('')}</tbody>
  </table>`;
}

/** Expedition 2 — The Changing Reef: both levels, the science framing and the answers. */
function renderChangingGuide() {
  const draft = changingRecords.some((r) => r.review.status !== 'reviewed');
  const answer = (q: typeof changingExitFood) => `${esc(q.prompt)} Answer: <strong>${esc(q.options.find((o) => o.correct)!.label)}</strong>. ${esc(q.explanation)}`;
  return `<section class="guide-expedition">
      <p class="eyebrow">Expedition 2</p>
      <h2>${esc(CHANGING_TITLE)}</h2>
      <p class="lead"><strong>Objective:</strong> ${esc(CHANGING_OBJECTIVE)}</p>
      <p><strong>Guiding question:</strong> ${esc(CHANGING_QUESTION)}</p>
      <p><strong>Two levels.</strong> <em>Grades 3–6</em> uses a map of the sargassum belt, a cause model, the reef with and without too much sargassum, and three exit questions. <em>Little Explorers (TK–2)</em> is a short, hands-on version: clean up the trash, see the seaweed block the light, and pick ways to help. About 10 minutes each.</p>
      ${draft ? '<p class="notice"><strong>Content status:</strong> draft. These facts are sourced but still need scientific review before public release.</p>' : ''}
      <h3>The science, in brief</h3>
      <ul>
        <li><strong>The belt.</strong> Since 2011 a huge belt of sargassum has formed across the tropical Atlantic. ${esc(beltSnapshots[1].text)} ${esc(beltSnapshots[2].text)}</li>
        <li><strong>What feeds it.</strong> ${esc(causesReveal)}</li>
        <li><strong>Be careful with “global warming makes the seaweed grow”.</strong> Warmer water is one factor, but research does not show it as the main or only cause, and warming can also shrink sargassum in some places. Extra nutrients are a big part of the story.</li>
        <li><strong>At the reef.</strong> ${esc(reefEffects.reef)} ${esc(reefEffects.sand)}</li>
        <li><strong>The twist.</strong> ${esc(sargassumTwist.text)}</li>
        <li><strong>${esc(beyondBelize.title)}.</strong> ${esc(beyondBelize.text)}</li>
      </ul>
      <p class="small">The map is a simplified drawing based on satellite studies, not a live satellite map. The “What feeds it?” model is labelled <em>Simplified example</em>: it shows the idea, not real amounts.</p>
      <p class="small"><strong>Your own experience:</strong> the lesson works without it, but photos or stories from Belize fit naturally in the Briefing (or Story) step.</p>
      <h3>Grades 3–6 sequence</h3>
      ${sequenceTable(olderSteps)}
      <h3>Little Explorers (TK–2) sequence</h3>
      ${sequenceTable(littleSteps)}
      <p>Ways to help (every card is a good answer): ${helpers.map((h) => esc(h.label)).join(' · ')}.</p>
      <h3>Answers (Grades 3–6)</h3>
      <ol>
        <li>${answer(changingExitFood)}</li>
        <li>${answer(changingExitTwist)}</li>
        <li>${esc(changingActions.prompt)} Any action connected to trash, nutrients or learning more counts.
          <table class="rubric-table"><thead><tr><th scope="col">Score</th><th scope="col">Description</th><th scope="col">Example</th></tr></thead>
          <tbody>${changingActions.rubric.map((r) => `<tr><td>${r.score}</td><td>${esc(r.label)}</td><td>${esc(r.example)}</td></tr>`).join('')}</tbody></table></li>
      </ol>
      <p class="small"><strong>Safety:</strong> rotting sargassum on beaches gives off gas, so clean-up is a job for adults with gloves. Children never touch reef animals.</p>
    </section>`;
}

export function renderTranscript(availableVideos: string[]) {
  const stepText = steps.map((s) => `<h4>${esc(s.label)}</h4><p>${esc(narrationById.get(s.narrationId)?.text ?? '')}</p>`).join('');
  const others = narration
    .filter((n) => !n.id.startsWith('step-') && !n.id.startsWith('ch-'))
    .map((n) => `<p>${esc(n.text)}</p>`)
    .join('');
  const changing = narration
    .filter((n) => n.id.startsWith('ch-'))
    .map((n) => `<p>${esc(n.text)}</p>`)
    .join('');
  const videos = videoSegments
    .filter((v) => availableVideos.includes(v.id))
    .map((v) => `<p><strong>${esc(v.title)} (video, optional):</strong> ${esc(v.transcript)}</p>`).join('');
  return `<div class="transcript"><h3>Expedition 1: ${esc(LESSON_TITLE)}</h3>${stepText}<h4>Habitats and organisms</h4>${others}${videos ? `<h4>Video segments</h4>${videos}` : ''}
    <h3>Expedition 2: ${esc(CHANGING_TITLE)}</h3>${changing}</div>`;
}
