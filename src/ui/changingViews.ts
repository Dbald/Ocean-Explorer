/**
 * Expedition 2 — "The Changing Reef": dock templates for both levels, and the
 * map model for the sargassum belt. Pure functions of lesson state.
 */
import {
  CHANGING_OBJECTIVE,
  CHANGING_QUESTION,
  beltSnapshots,
  beyondBelize,
  causes,
  causesPrediction,
  causesReveal,
  changingActions,
  changingExitFood,
  changingExitTwist,
  helpers,
  litter,
  reefEffects,
  sargassumTwist,
  stepsFor,
  type ChangingStep,
} from '../content/changing.ts';
import { COMPOSITE_NOTICE } from '../content/lesson.ts';
import { habitatById } from '../content/habitats.ts';
import { changingSummary, choice, type LessonState } from '../lesson/controller.ts';
import type { MapState } from '../scene/MapView.ts';
import { btn, esc } from './html.ts';
import { choiceItem, stopNav, tabs } from './views.ts';

export const changingStep = (state: LessonState): ChangingStep => {
  const steps = stepsFor(state.changing.level);
  return steps[Math.min(state.changing.step, steps.length - 1)];
};

/** Litter still in the water. */
export const remainingLitter = (state: LessonState) => litter.filter((l) => !state.changing.cleaned.includes(l.id)).map((l) => l.id);

// ── Map model ────────────────────────────────────────────────────────────────

/** What the map shows for the belt and "what feeds it?" steps; null when the map is hidden. */
export function mapStateFor(state: LessonState): MapState | null {
  if (state.mode !== 'changing') return null;
  const c = state.changing;
  const kind = changingStep(state).kind;
  if (kind === 'belt') {
    const snap = beltSnapshots[c.belt];
    return { amount: snap.amount, reach: c.belt > 0, showCurrents: true, nutrients: false, warm: false, caption: snap.text, badge: snap.label };
  }
  if (kind === 'causes') {
    // Before the prediction is shared, the map shows today's bloom with every factor on.
    const on = c.revealed ? c.causes : { nutrients: true, warm: true, currents: true };
    return {
      amount: 0.1 + 0.6 * Number(on.nutrients) + 0.3 * Number(on.warm),
      reach: on.currents,
      showCurrents: on.currents,
      nutrients: on.nutrients,
      warm: on.warm,
      caption: modelCaption(on),
      badge: 'Simplified example',
    };
  }
  return null;
}

export function modelCaption(on: Record<'nutrients' | 'warm' | 'currents', boolean>) {
  const parts: string[] = [];
  if (on.nutrients && on.warm && on.currents) return 'With all three, a giant belt grows and the currents carry it all the way to Belize.';
  if (!on.nutrients) parts.push('Without extra nutrients, much less sargassum grows.');
  if (!on.warm) parts.push('Without the warm, sunny water, it grows a bit less.');
  if (!on.currents) parts.push('Without the currents, it stays far out in the Atlantic and doesn’t reach Belize.');
  return parts.join(' ');
}

// ── Shared pieces ────────────────────────────────────────────────────────────

function cleanupCounter(state: LessonState, big = false) {
  const cleaned = state.changing.cleaned.length;
  const here = litter.filter((l) => l.stop === state.stop);
  const left = here.filter((l) => !state.changing.cleaned.includes(l.id));
  return `<div class="cleanup${big ? ' big' : ''}">
      <p class="cleanup-count" role="status"><span class="cleanup-icon" aria-hidden="true">🗑️</span> ${cleaned} of ${litter.length} pieces of trash cleaned</p>
      <div class="find-dots" aria-hidden="true">${litter.map((l) => `<span class="dot${state.changing.cleaned.includes(l.id) ? ' is-found' : ''}"></span>`).join('')}</div>
      ${
        cleaned === litter.length
          ? '<p class="feedback good">The whole reef is clean. Thank you!</p>'
          : left.length
            ? `<p class="muted">${left.length} here at the ${esc(habitatById.get(state.stop)!.title.toLowerCase())}. Tap the trash in the picture.</p>`
            : '<p class="feedback good">This spot is all clean! Try another stop.</p>'
      }
      ${
        left.length
          ? `<details class="find-list" data-key="litter-list"><summary>Choose from a list</summary><div class="organism-list">${left
              .map((l) => btn(`Pick up the ${l.name}`, 'clean', { arg: l.id, cls: 'organism-btn' }))
              .join('')}</div></details>`
          : ''
      }
    </div>`;
}

function sargassumToggle(state: LessonState, labels: [string, string]) {
  const on = state.changing.sargassum;
  return `<div class="segmented big-seg" role="group" aria-label="Compare the reef">
      ${btn(labels[0], 'ch-sarg', { arg: 'off', cls: `seg${!on ? ' is-current' : ''}`, pressed: !on })}
      ${btn(labels[1], 'ch-sarg', { arg: 'on', cls: `seg${on ? ' is-current' : ''}`, pressed: on })}
    </div>`;
}

// ── Step bodies (Grades 3–6) ─────────────────────────────────────────────────

function briefingBody(step: ChangingStep) {
  return `<p class="question">${esc(CHANGING_QUESTION)}</p>
    <p>${esc(CHANGING_OBJECTIVE)}</p>
    <ul class="prompts">${step.prompts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <p class="small muted">Teacher: if you have your own photos or stories from Belize, this is a good moment to share them.</p>
    <p class="notice small">${esc(COMPOSITE_NOTICE)}</p>`;
}

function beltBody(state: LessonState) {
  const c = state.changing;
  const snap = beltSnapshots[c.belt];
  return `<div class="segmented big-seg" role="group" aria-label="Choose a year">
      ${beltSnapshots.map((b, i) => btn(`${b.label}${c.beltSeen.includes(i) && i !== c.belt ? ' ✓' : ''}`, 'ch-belt', { arg: String(i), cls: `seg${i === c.belt ? ' is-current' : ''}`, pressed: i === c.belt })).join('')}
    </div>
    <p class="lead" role="status">${esc(snap.text)}</p>
    <p>Ocean currents carry the floating sargassum west across the Atlantic and into the Caribbean Sea, all the way to Belize.</p>
    ${c.beltSeen.length < beltSnapshots.length ? '<p class="small muted">Compare all three years.</p>' : ''}
    <p class="small muted">A simplified drawing based on satellite studies, not a live satellite map.</p>`;
}

function causesBody(state: LessonState) {
  const c = state.changing;
  const chosen = causesPrediction.options.find((o) => o.id === c.prediction);
  const predict = `<fieldset class="choice">
      <legend>${esc(causesPrediction.prompt)}</legend>
      <div class="options">${causesPrediction.options
        .map((o) => btn(o.label, 'ch-predict', { arg: o.id, cls: `option${c.prediction === o.id ? ' is-selected' : ''}`, pressed: c.prediction === o.id, disabled: c.revealed && c.prediction !== o.id }))
        .join('')}</div>
    </fieldset>`;
  if (!c.revealed) {
    return `${predict}
      ${btn('Record class prediction', 'ch-reveal', { cls: 'primary', disabled: c.prediction === null })}
      <p class="small muted">The model opens after the class records a prediction.</p>`;
  }
  return `<p class="badge-row"><span class="badge">Simplified example</span></p>
    <p><strong>Our prediction:</strong> ${esc(chosen?.label ?? '')}</p>
    <p class="small">Turn each one on or off and watch the map.</p>
    <div class="cause-toggles" role="group" aria-label="What feeds the sargassum">
      ${causes
        .map((x) =>
          btn(`${x.label}: ${c.causes[x.id] ? 'on' : 'off'}`, 'ch-cause', { arg: x.id, cls: `cause-btn${c.causes[x.id] ? ' is-on' : ''}`, pressed: c.causes[x.id], icon: x.id === 'nutrients' ? '🌾' : x.id === 'warm' ? '☀️' : '🌊' }),
        )
        .join('')}
    </div>
    <p class="lead" role="status">${esc(modelCaption(c.causes))}</p>
    <div class="feedback good"><p><strong>What scientists think:</strong> ${esc(causesReveal)}</p>${chosen ? `<p class="small">${esc(chosen.response)}</p>` : ''}</div>
    <details class="learn-more" data-key="causes-more"><summary>Learn more</summary>${causes.map((x) => `<p><strong>${esc(x.title)}.</strong> ${esc(x.explain)}</p>`).join('')}</details>
    <p class="small muted">The model shows the idea, not real amounts.</p>`;
}

function reefBody(state: LessonState) {
  const c = state.changing;
  return `${stopNav(state)}
    ${sargassumToggle(state, ['Clear water', 'Too much sargassum'])}
    <p class="lead" role="status">${c.sargassum ? esc(reefEffects[state.stop]) : 'Clear water: sunlight reaches the coral and the seagrass.'}</p>
    ${
      c.sargassumSeen
        ? `<div class="twist"><p class="eyebrow">${esc(sargassumTwist.title)}</p><p>${esc(sargassumTwist.text)}</p>${btn('Listen', 'say', { arg: 'ch-twist', cls: 'ghost small-btn', icon: '🔊' })}</div>`
        : ''
    }
    ${cleanupCounter(state)}`;
}

function explainBody(state: LessonState) {
  const c = state.changing;
  const done = [choice(state, changingExitFood.id).correct, choice(state, changingExitTwist.id).correct, c.action !== null && (c.actionDiscussed || c.actionScore !== null)];
  let body = '';
  if (c.exitIndex === 0) body = choiceItem(state, changingExitFood);
  else if (c.exitIndex === 1) body = choiceItem(state, changingExitTwist);
  else {
    const chosen = changingActions.choices.find((x) => x.id === c.action);
    body = `<fieldset class="choice"><legend>${esc(changingActions.prompt)}</legend><div class="options">
        ${changingActions.choices.map((x) => btn(x.label, 'ch-action', { arg: x.id, cls: `option${c.action === x.id ? ' is-selected' : ''}`, pressed: c.action === x.id })).join('')}
      </div></fieldset>
      ${
        chosen
          ? `<p class="lead">We chose <strong>${esc(chosen.label.toLowerCase())}</strong> because ${esc(chosen.need)}.</p>
             <p class="small">Any action connected to trash, nutrients or learning more counts. Ask: how does it help the reef?</p>
             <details class="rubric" data-key="ch-rubric">
               <summary>Teacher rubric (class discussion, not individual scores)</summary>
               <div class="rubric-levels">${changingActions.rubric
                 .map((r) => btn(`${r.score} — ${r.label}`, 'ch-score', { arg: String(r.score), cls: `option rubric-btn${c.actionScore === r.score ? ' is-selected' : ''}`, pressed: c.actionScore === r.score }) + `<p class="small muted">e.g. ${esc(r.example)}</p>`)
                 .join('')}</div>
             </details>
             ${btn(c.actionDiscussed ? 'Reasons discussed ✓' : 'We discussed our reasons', 'ch-discussed', { cls: c.actionDiscussed ? 'secondary is-done' : 'secondary', pressed: c.actionDiscussed })}`
          : ''
      }`;
  }
  return `${tabs('ch-exit', ['1. Extra food', '2. Always bad?', '3. How to help'], c.exitIndex, done)}
    ${body}
    ${c.exitIndex < 2 ? btn('Next question', 'ch-exit', { arg: String(c.exitIndex + 1), cls: 'secondary' }) : ''}`;
}

function recapBody(state: LessonState) {
  const summary = changingSummary(state);
  const group = (status: string, title: string) => {
    const items = summary.filter((s) => s.status === status);
    return `<div class="recap-group recap-${status}"><h3>${title} <span class="count">${items.length}</span></h3>
      ${items.length ? `<ul>${items.map((i) => `<li>${esc(i.label)}</li>`).join('')}</ul>` : '<p class="small muted">None</p>'}</div>`;
  };
  return `<p class="question">${esc(CHANGING_QUESTION)}</p>
    <ul class="key-ideas">
      <li>Too much sargassum near shore blocks sunlight and uses up oxygen as it rots.</li>
      <li>Extra nutrients from land, ocean currents and warmer water all play a part. Scientists are still investigating.</li>
      <li>Trash hurts reef animals, and people can help.</li>
    </ul>
    <div class="beyond">
      <p class="eyebrow">${esc(beyondBelize.title)}</p>
      <p>${esc(beyondBelize.text)}</p>
      ${btn('Listen', 'say', { arg: 'ch-beyond', cls: 'ghost small-btn', icon: '🔊' })}
    </div>
    <div class="recap-grid">${group('completed', 'Completed')}${group('attempted', 'Attempted')}${group('skipped', 'Skipped (not attempted)')}</div>
    <p class="small muted">These results describe this class session on a shared screen — not individual students.</p>
    <div class="row">
      ${btn('Restart this expedition', 'restart', { cls: 'secondary' })}
      ${btn('Home', 'home', { cls: 'secondary', icon: '⌂' })}
    </div>`;
}

// ── Step bodies (Little Explorers, TK–2) ─────────────────────────────────────

function littleStoryBody() {
  return `<div class="little-hero" aria-hidden="true">🐢 🐠 🪸</div>
    <p class="lead">Something is changing in Belize’s ocean. There is trash in the water, and lots of brown seaweed floating in.</p>
    <p class="big-line">Let’s help the reef!</p>
    <p class="small muted">Teacher: if you have photos from Belize, show them now.</p>`;
}

function littleSeaweedBody(state: LessonState) {
  const on = state.changing.sargassum;
  return `${stopNav(state)}
    ${sargassumToggle(state, ['No seaweed', 'Lots of seaweed'])}
    <p class="big-line" role="status">${on ? 'It’s darker! Coral and seagrass need sunlight.' : 'Sunny and bright!'}</p>
    ${state.changing.sargassumSeen ? `<div class="twist"><p>Out in the deep ocean, this seaweed is a home for baby sea turtles. 🐢</p></div>` : ''}`;
}

function littleHelpBody(state: LessonState) {
  return `<div class="helper-grid" role="group" aria-label="Ways to help">
      ${helpers
        .map((h) => {
          const done = state.changing.helpers.includes(h.id);
          return `<button type="button" class="btn helper-card${done ? ' is-done' : ''}" data-action="ch-helper" data-arg="${h.id}" data-key="ch-helper:${h.id}" aria-pressed="${done}">
            <span class="helper-icon" aria-hidden="true">${h.icon}</span><span>${esc(h.label)}${done ? ' ✓' : ''}</span></button>`;
        })
        .join('')}
    </div>`;
}

function littleDoneBody(state: LessonState) {
  const c = state.changing;
  return `<div class="little-hero" aria-hidden="true">🎉 🐢 🎉</div>
    <p class="big-line">You helped the reef!</p>
    <p class="lead">You cleaned ${c.cleaned.length} of ${litter.length} pieces of trash${c.helpers.length ? ` and found ${c.helpers.length} ways to help` : ''}.</p>
    <p class="notice">In the ocean, we look at animals, but we never touch them.</p>
    <div class="row">
      ${btn('Play again', 'restart', { cls: 'secondary', icon: '↻' })}
      ${btn('Home', 'home', { cls: 'secondary', icon: '⌂' })}
    </div>`;
}

// ── Dock ─────────────────────────────────────────────────────────────────────

export function renderChangingDock(state: LessonState, paused: boolean) {
  const c = state.changing;
  const steps = stepsFor(c.level);
  const i = Math.min(c.step, steps.length - 1);
  const step = steps[i];
  const little = c.level === 'little';
  let body = '';
  switch (step.kind) {
    case 'briefing':
      body = little ? littleStoryBody() : briefingBody(step);
      break;
    case 'belt':
      body = beltBody(state);
      break;
    case 'causes':
      body = causesBody(state);
      break;
    case 'reef':
      body = reefBody(state);
      break;
    case 'cleanup':
      body = `${stopNav(state)}${cleanupCounter(state, true)}`;
      break;
    case 'seaweed':
      body = littleSeaweedBody(state);
      break;
    case 'help':
      body = littleHelpBody(state);
      break;
    case 'explain':
      body = explainBody(state);
      break;
    case 'recap':
      body = little ? littleDoneBody(state) : recapBody(state);
      break;
  }
  const notes = `<details class="teacher-notes" data-key="notes">
      <summary>Teacher notes · ${esc(step.time)}</summary>
      <ul>${step.teacherNotes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
      ${step.prompts.length ? `<p class="small"><strong>Prompts:</strong> ${step.prompts.map(esc).join(' · ')}</p>` : ''}
    </details>`;
  return `<ol class="stepper" aria-label="Expedition steps">
      ${steps.map((s, k) => `<li>${btn(`${k + 1}. ${s.label}`, 'ch-goto', { arg: String(k), cls: `step-btn${k === i ? ' is-current' : k < i ? ' is-past' : ''}`, current: k === i })}</li>`).join('')}
    </ol>
    <div class="dock-body${little ? ' little' : ''}">
      <h2 class="instruction" tabindex="-1" data-key="instruction">${esc(step.instruction)}</h2>
      ${paused ? '<p class="paused-banner" role="status">Paused — narration and motion are stopped. Discussion time is never cut off.</p>' : ''}
      ${body}
      ${notes}
    </div>
    <div class="lesson-nav">
      ${btn('Back', 'ch-back', { cls: 'secondary', disabled: i === 0, icon: '←' })}
      ${btn(paused ? 'Resume' : 'Pause', 'pause', { cls: 'secondary', pressed: paused, icon: paused ? '▶' : '❚❚' })}
      ${btn('Replay', 'replay', { cls: 'secondary', icon: '↻', aria: 'Replay narration' })}
      ${i < steps.length - 1 ? btn(`Next: ${steps[i + 1].label}`, 'ch-next', { cls: 'primary', icon: '→' }) : ''}
    </div>`;
}
