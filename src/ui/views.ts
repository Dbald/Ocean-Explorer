/**
 * View templates for the lesson dock, organism card and recap. Each returns an
 * HTML string; buttons carry data-action attributes handled by the app.
 */
import { foodRelationshipById, foodRelationships, foodResourceById, shelterRelationships } from '../content/food.ts';
import { habitatById, habitats } from '../content/habitats.ts';
import {
  COMPOSITE_NOTICE,
  GUIDING_QUESTION,
  OBJECTIVE,
  connectExample,
  connectItems,
  exitQuestions,
  shelterPrediction,
  shelterReveal,
  stepById,
  steps,
} from '../content/lesson.ts';
import { isVerified, organismById, organisms } from '../content/organisms.ts';
import { sourceById } from '../content/sources.ts';
import type { FoodChoiceItem, HabitatId, VideoSegment } from '../content/types.ts';
import { activitySummary, choice, FEATURED_COUNT, predictionLabel, SHELTER_EXIT_ID, stepIndex, type LessonState } from '../lesson/controller.ts';
import { btn, esc, foodArrow, shelterLink } from './html.ts';

export function nameOf(id: string): string {
  return organismById.get(id)?.commonName ?? foodResourceById.get(id)?.name ?? id;
}

export interface ViewContext {
  videos: VideoSegment[];
}

// ── Shared pieces ────────────────────────────────────────────────────────────

function stopNav(state: LessonState) {
  return `<nav class="stop-nav" aria-label="Habitat stops">
    ${habitats
      .map((h, i) =>
        btn(`${i + 1}. ${h.title}`, 'stop', {
          arg: h.id,
          cls: `stop-btn${state.stop === h.id ? ' is-current' : ''}`,
          pressed: state.stop === h.id,
        }),
      )
      .join('')}
  </nav>`;
}

function organismList(state: LessonState, stop: HabitatId) {
  const here = organisms.filter((o) => o.habitat === stop);
  return `<div class="organism-list" role="group" aria-label="Featured organisms at this stop">
    ${here
      .map((o) => {
        const seen = state.discovered.includes(o.id);
        return btn(seen ? `${o.commonName} ✓` : o.commonName, 'select', {
          arg: o.id,
          cls: `organism-btn${state.selectedOrganism === o.id ? ' is-selected' : ''}`,
          pressed: state.selectedOrganism === o.id,
          aria: `${o.commonName}${seen ? ', observed' : ''}`,
        });
      })
      .join('')}
  </div>`;
}

function exploreBody(state: LessonState) {
  const h = habitatById.get(state.stop)!;
  return `${stopNav(state)}
    <div class="habitat-intro">
      <p class="lead">${esc(h.arrival)}</p>
      <p>${esc(h.focus)}</p>
    </div>
    ${organismList(state, state.stop)}
    <p class="progress-note" role="status">Observed ${state.discovered.length} of ${FEATURED_COUNT} featured organisms.</p>`;
}

function videoButton(ctx: ViewContext, step: string) {
  const v = ctx.videos.find((s) => s.step === step);
  return v ? btn(`Message from Devin: ${v.title}`, 'video', { arg: v.id, cls: 'ghost', icon: '▶' }) : '';
}

function choiceItem(state: LessonState, item: FoodChoiceItem) {
  const c = choice(state, item.id);
  const selected = item.options.find((o) => o.id === c.selected);
  const options = item.options
    .map((o) => {
      const isSel = c.selected === o.id;
      const cls = `option${isSel ? ' is-selected' : ''}${c.submitted && isSel ? (o.correct ? ' is-correct' : ' is-incorrect') : ''}`;
      return btn(o.label, 'choose', { arg: `${item.id}|${o.id}`, cls, pressed: isSel, disabled: c.submitted && !isSel });
    })
    .join('');
  const feedback =
    c.submitted && selected
      ? `<div class="feedback ${c.correct ? 'good' : 'retry'}" role="status" tabindex="-1" data-key="feedback:${esc(item.id)}">
          <p><strong>${c.correct ? 'Correct.' : 'Try again.'}</strong> ${esc(selected.feedback)}</p>
          ${c.correct ? `<p class="small">${esc(item.explanation)}</p>` : btn('Try again', 'retry', { arg: item.id, cls: 'secondary' })}
        </div>`
      : '';
  return `<fieldset class="choice">
      <legend tabindex="-1" data-key="options:${esc(item.id)}">${esc(item.prompt)}</legend>
      <div class="options">${options}</div>
    </fieldset>
    ${c.submitted ? '' : btn('Submit answer', 'submit', { arg: item.id, cls: 'primary', disabled: c.selected === null })}
    ${feedback}`;
}

function tabs(action: string, labels: string[], current: number, statuses: boolean[]) {
  return `<div class="subtabs" role="group" aria-label="Questions">
    ${labels
      .map((l, i) => btn(`${l}${statuses[i] ? ' ✓' : ''}`, action, { arg: String(i), cls: `subtab${i === current ? ' is-current' : ''}`, pressed: i === current }))
      .join('')}
  </div>`;
}

// ── Step bodies ──────────────────────────────────────────────────────────────

function briefingBody(state: LessonState, ctx: ViewContext) {
  const s = stepById.get('briefing')!;
  return `<p class="question">${esc(GUIDING_QUESTION)}</p>
    <p>${esc(OBJECTIVE)}</p>
    <ul class="prompts">${s.prompts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <label class="field">
      <span>Class’s first idea <span class="muted">(optional — no names)</span></span>
      <textarea data-input="baseline" data-key="baseline" rows="2" maxlength="280">${esc(state.baselineNote)}</textarea>
    </label>
    <div class="row">
      ${btn(state.baselineShared ? 'Ideas shared ✓' : 'We shared our ideas', 'baseline-shared', { cls: state.baselineShared ? 'secondary is-done' : 'secondary', pressed: state.baselineShared })}
      ${videoButton(ctx, 'briefing')}
    </div>
    <p class="notice small">${esc(COMPOSITE_NOTICE)}</p>`;
}

function connectBody(state: LessonState) {
  const item = connectItems[state.connectIndex];
  const done = connectItems.map((i) => choice(state, i.id).correct);
  const learned = connectItems.filter((i) => choice(state, i.id).correct).map((i) => foodRelationshipById.get(i.relationship)!);
  return `<div class="example">
      <p class="eyebrow">Example</p>
      ${foodArrow(connectExample.arrow[0], connectExample.arrow[1])}
      <p class="small">${esc(connectExample.text)}</p>
    </div>
    <p class="legend-note small"><span class="arrow" aria-hidden="true">→</span> <span>Arrows mean <strong>energy moves from food to consumer</strong>.</span></p>
    ${tabs('connect-item', connectItems.map((_, i) => `Relationship ${i + 1}`), state.connectIndex, done)}
    ${choiceItem(state, item)}
    ${
      learned.length
        ? `<div class="web"><p class="eyebrow">Our food relationships</p>${learned.map((r) => foodArrow(nameOf(r.food), nameOf(r.consumer))).join('')}
           <p class="small muted">Each arrow is a separate relationship — not one food chain.</p></div>`
        : ''
    }
    ${done[state.connectIndex] && state.connectIndex < connectItems.length - 1 ? btn('Next relationship', 'connect-item', { arg: String(state.connectIndex + 1), cls: 'secondary' }) : ''}`;
}

function investigateBody(state: LessonState, ctx: ViewContext) {
  const sh = state.shelter;
  const chosen = shelterPrediction.options.find((o) => o.id === sh.selected);
  const predict = `<fieldset class="choice">
      <legend>${esc(shelterPrediction.prompt)}</legend>
      <div class="options">
        ${shelterPrediction.options
          .map((o) =>
            btn(o.label, 'predict', {
              arg: o.id,
              cls: `option${sh.selected === o.id ? ' is-selected' : ''}`,
              pressed: sh.selected === o.id,
              disabled: sh.recorded && sh.selected !== o.id,
            }),
          )
          .join('')}
      </div>
    </fieldset>`;
  if (!sh.recorded) {
    return `${videoButton(ctx, 'investigate')}
      ${predict}
      ${btn('Record class prediction', 'record-prediction', { cls: 'primary', disabled: sh.selected === null })}
      <p class="small muted">The comparison appears after the class records a prediction.</p>`;
  }
  return `<p class="badge-row"><span class="badge">${esc(shelterReveal.badge)}</span></p>
    <p><strong>Our prediction:</strong> ${esc(predictionLabel(state) ?? '')}</p>
    <div class="segmented" role="group" aria-label="Compare before and after">
      ${btn('Before', 'shelter-view', { arg: 'before', cls: `seg${sh.view === 'before' ? ' is-current' : ''}`, pressed: sh.view === 'before' })}
      ${btn('After', 'shelter-view', { arg: 'after', cls: `seg${sh.view === 'after' ? ' is-current' : ''}`, pressed: sh.view === 'after' })}
    </div>
    <p class="lead" role="status">${esc(sh.view === 'before' ? shelterReveal.before : shelterReveal.after)}</p>
    ${sh.comparedAfter ? `<p>${esc(shelterReveal.explanation)}</p>${chosen ? `<p class="feedback ${chosen.plausible ? 'good' : 'retry'}">${esc(chosen.response)}</p>` : ''}` : '<p class="small muted">Select After to see what changes.</p>'}
    <p class="legend-note small">${shelterLink('Coral branches', 'Small fish')} <span>Dashed lines show <strong>shelter</strong>, not food.</span></p>
    <p class="small muted">${esc(shelterReveal.caution)}</p>`;
}

function explainBody(state: LessonState) {
  const q = exitQuestions[state.exitIndex];
  const statuses = activitySummary(state);
  const done = exitQuestions.map((x) => statuses.find((s) => s.id === x.id)?.status === 'completed');
  let body = '';
  if (q.kind === 'food-choice') {
    body = choiceItem(state, q.item);
  } else if (q.kind === 'shelter-reasoning') {
    const c = choice(state, SHELTER_EXIT_ID);
    const sel = q.options.find((o) => o.id === c.selected);
    body = `<fieldset class="choice"><legend tabindex="-1" data-key="options:${esc(q.id)}">${esc(q.prompt)}</legend><div class="options">
        ${q.options
          .map((o) =>
            btn(o.label, 'choose', {
              arg: `${q.id}|${o.id}`,
              cls: `option${c.selected === o.id ? ' is-selected' : ''}${c.submitted && c.selected === o.id ? (o.plausible ? ' is-correct' : ' is-incorrect') : ''}`,
              pressed: c.selected === o.id,
              disabled: c.submitted && c.selected !== o.id,
            }),
          )
          .join('')}
      </div></fieldset>
      ${c.submitted ? '' : btn('Share answer', 'submit', { arg: q.id, cls: 'primary', disabled: c.selected === null })}
      ${
        c.submitted && sel
          ? `<div class="feedback ${sel.plausible ? 'good' : 'retry'}" role="status" tabindex="-1" data-key="feedback:${esc(q.id)}"><p>${esc(sel.response)}</p>${sel.plausible ? '' : btn('Think again', 'retry', { arg: q.id, cls: 'secondary' })}</div>`
          : ''
      }
      <p class="small">${esc(q.discussion)}</p>`;
  } else {
    const p = state.protect;
    const chosen = q.choices.find((c) => c.id === p.choice);
    body = `<fieldset class="choice"><legend>${esc(q.prompt)}</legend><div class="options">
        ${q.choices.map((c) => btn(c.label, 'protect', { arg: c.id, cls: `option${p.choice === c.id ? ' is-selected' : ''}`, pressed: p.choice === c.id })).join('')}
      </div></fieldset>
      ${
        chosen
          ? `<p class="lead">We would protect <strong>${esc(chosen.label.toLowerCase())}</strong> because ${esc(chosen.need)}.</p>
             <p class="small">${esc(q.discussion)}</p>
             <details class="rubric" data-key="rubric">
               <summary>Teacher rubric (class discussion, not individual scores)</summary>
               <div class="rubric-levels">
                 ${q.rubric
                   .map((r) =>
                     btn(`${r.score} — ${r.label}`, 'score', {
                       arg: String(r.score),
                       cls: `option rubric-btn${p.score === r.score ? ' is-selected' : ''}`,
                       pressed: p.score === r.score,
                     }) + `<p class="small muted">e.g. ${esc(r.example)}</p>`,
                   )
                   .join('')}
               </div>
             </details>
             ${btn(p.discussed ? 'Reasons discussed ✓' : 'We discussed our reasons', 'protect-discussed', { cls: p.discussed ? 'secondary is-done' : 'secondary', pressed: p.discussed })}`
          : ''
      }`;
  }
  return `${tabs('exit-item', exitQuestions.map((x, i) => `${i + 1}. ${x.title}`), state.exitIndex, done)}
    ${body}
    ${state.exitIndex < exitQuestions.length - 1 ? btn('Next question', 'exit-item', { arg: String(state.exitIndex + 1), cls: 'secondary' }) : ''}`;
}

function recapBody(state: LessonState, ctx: ViewContext) {
  const summary = activitySummary(state);
  const group = (status: string, title: string) => {
    const items = summary.filter((s) => s.status === status);
    return `<div class="recap-group recap-${status}"><h3>${title} <span class="count">${items.length}</span></h3>
      ${items.length ? `<ul>${items.map((i) => `<li>${esc(i.label)}</li>`).join('')}</ul>` : '<p class="small muted">None</p>'}</div>`;
  };
  return `<p class="question">${esc(GUIDING_QUESTION)}</p>
    ${state.baselineNote.trim() ? `<p><strong>Our first idea:</strong> “${esc(state.baselineNote)}”</p>` : ''}
    <p>A reef is a <strong>habitat</strong>: it gives organisms <strong>food</strong> and <strong>shelter</strong>. The seagrass and sand next to it are habitats too.</p>
    <div class="web">${foodRelationships.map((r) => foodArrow(nameOf(r.food), nameOf(r.consumer))).join('')}
      ${shelterRelationships.map((r) => shelterLink(nameOf(r.shelter), nameOf(r.user))).join('')}</div>
    <div class="recap-grid">${group('completed', 'Completed')}${group('attempted', 'Attempted')}${group('skipped', 'Skipped (not attempted)')}</div>
    <p class="small muted">These results describe this class session on a shared screen — not individual students.</p>
    <div class="row">
      ${videoButton(ctx, 'recap')}
      ${btn('Explore freely', 'start', { arg: 'explore', cls: 'secondary' })}
      ${btn('Restart lesson', 'restart', { cls: 'secondary' })}
    </div>`;
}

// ── Dock ─────────────────────────────────────────────────────────────────────

export function renderLessonDock(state: LessonState, ctx: ViewContext, paused: boolean) {
  const step = stepById.get(state.step)!;
  const i = stepIndex(state.step);
  let body = '';
  switch (state.step) {
    case 'briefing':
      body = briefingBody(state, ctx);
      break;
    case 'explore':
      body = exploreBody(state);
      break;
    case 'connect':
      body = connectBody(state);
      break;
    case 'investigate':
      body = investigateBody(state, ctx);
      break;
    case 'explain':
      body = explainBody(state);
      break;
    case 'recap':
      body = recapBody(state, ctx);
      break;
  }
  const notes = `<details class="teacher-notes" data-key="notes">
      <summary>Teacher notes · ${esc(step.time)}</summary>
      <ul>${step.teacherNotes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
      <p class="small"><strong>Prompts:</strong> ${step.prompts.map(esc).join(' · ')}</p>
    </details>`;
  return `<ol class="stepper" aria-label="Lesson steps">
      ${steps
        .map((s, k) => `<li>${btn(`${k + 1}. ${s.label}`, 'goto', { arg: s.id, cls: `step-btn${k === i ? ' is-current' : k < i ? ' is-past' : ''}`, current: k === i })}</li>`)
        .join('')}
    </ol>
    <div class="dock-body">
      <h2 class="instruction" tabindex="-1" data-key="instruction">${esc(step.instruction)}</h2>
      ${paused ? '<p class="paused-banner" role="status">Paused — narration and motion are stopped. Discussion time is never cut off.</p>' : ''}
      ${body}
      ${notes}
    </div>
    <div class="lesson-nav">
      ${btn('Back', 'back', { cls: 'secondary', disabled: i === 0, icon: '←' })}
      ${btn(paused ? 'Resume' : 'Pause', 'pause', { cls: 'secondary', pressed: paused, icon: paused ? '▶' : '❚❚' })}
      ${btn('Replay', 'replay', { cls: 'secondary', icon: '↻', aria: 'Replay narration' })}
      ${i < steps.length - 1 ? btn(`Next: ${steps[i + 1].label}`, 'next', { cls: 'primary', icon: '→' }) : ''}
    </div>`;
}

export function renderExploreDock(state: LessonState) {
  return `<div class="dock-body">
      <h2 class="instruction" tabindex="-1" data-key="instruction">Explore at your own pace</h2>
      ${exploreBody(state)}
    </div>
    <div class="lesson-nav">
      ${btn('Start guided lesson', 'start', { arg: 'lesson', cls: 'primary', icon: '→' })}
    </div>`;
}

// ── Organism card ────────────────────────────────────────────────────────────

export function renderCard(id: string) {
  const o = organismById.get(id);
  if (!o) return '';
  const habitat = habitatById.get(o.habitat)!;
  const eats = foodRelationships.filter((r) => r.consumer === id);
  const eatenBy = foodRelationships.filter((r) => r.food === id);
  const shelter = shelterRelationships.filter((r) => r.shelter === id || r.user === id);
  const sources = o.sources.map((s) => sourceById.get(s)).filter((s) => !!s);
  return `<div class="card-head">
      <div>
        <p class="eyebrow">${esc(habitat.title)}${o.alsoFoundIn?.length ? ` · also ${o.alsoFoundIn.map((h) => habitatById.get(h)!.title.toLowerCase()).join(', ')}` : ''}</p>
        <h2 id="card-title" tabindex="-1" data-key="card-title">${esc(o.commonName)}</h2>
        ${isVerified(o) ? `<p class="sci"><em>${esc(o.scientificName)}</em></p>` : ''}
      </div>
      ${btn('Close', 'close-card', { cls: 'icon-btn', aria: 'Close card', icon: '✕' })}
    </div>
    <p>${esc(o.role)}</p>
    <p class="observe"><strong>Observe:</strong> ${esc(o.observe)}</p>
    ${eats.length || eatenBy.length || shelter.length ? `<div class="web compact">
      ${[...eats, ...eatenBy].map((r) => foodArrow(nameOf(r.food), nameOf(r.consumer))).join('')}
      ${shelter.map((r) => shelterLink(nameOf(r.shelter), nameOf(r.user))).join('')}
    </div>` : ''}
    <details class="learn-more" data-key="learn-more">
      <summary>Learn more</summary>
      <p>${esc(o.learnMore)}</p>
      ${eats.filter((r) => r.qualifier).map((r) => `<p class="small">${esc(r.qualifier)}</p>`).join('')}
      <p class="small muted">Sources: ${sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher)}</a>`).join(', ')}</p>
    </details>
    <p class="small muted">Selecting an animal here is for observing. In real life, we watch wildlife without touching it.</p>
    <div class="row">
      ${btn('Listen', 'listen', { arg: id, cls: 'secondary', icon: '🔊' })}
      ${btn('Return to lesson', 'return', { cls: 'secondary' })}
    </div>`;
}
