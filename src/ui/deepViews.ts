/**
 * Expedition 4 — "Into the Deep": dock templates for both levels. Pure
 * functions of lesson state.
 */
import {
  DEEP_INTRO,
  DEEP_QUESTION,
  deepActions,
  deepAnimalById,
  deepAnimalsAt,
  deepExitLight,
  deepExitLure,
  deepStepsFor,
  glowFinds,
  glowPrediction,
  glowReveal,
  littleZoneAnimal,
  marineSnowFact,
  migrationTwist,
  pressureFact,
  zoneById,
  zoneClueById,
  zoneClues,
  zoneOrder,
  zones,
  type DeepStep,
  type DeepZone,
} from '../content/deepOcean.ts';
import { choice, deepSummary, type LessonState } from '../lesson/controller.ts';
import { btn, esc } from './html.ts';
import { choiceItem, stepNav, stepper, tabs } from './views.ts';

export const deepStep = (state: LessonState): DeepStep => {
  const list = deepStepsFor(state.deep.level);
  return list[Math.min(state.deep.step, list.length - 1)];
};

/** The zone the camera is in: the class's choice, except where a step decides it. */
export const deepZoneFor = (state: LessonState): DeepZone => state.deep.zone;

// ── Shared pieces ────────────────────────────────────────────────────────────

/** A side view of the water column: three bands, darker going down, with "we are here". */
export function zoneGauge(zone: DeepZone) {
  return `<div class="zone-gauge" role="img" aria-label="We are in the ${esc(zoneById.get(zone)!.title.toLowerCase())}, ${esc(zoneById.get(zone)!.depth)} deep">
    ${zones
      .map(
        (z) => `<div class="zone-band zone-${z.id}${z.id === zone ? ' is-here' : ''}">
          <span class="zone-name">${esc(z.title)}</span><span class="zone-depth">${esc(z.depth)}</span>${z.id === zone ? '<span class="zone-here" aria-hidden="true">◀ We are here</span>' : ''}
        </div>`,
      )
      .join('')}
  </div>`;
}

function zoneFacts(zone: DeepZone) {
  const z = zoneById.get(zone)!;
  return `<dl class="zone-facts">
      <div><dt><span aria-hidden="true">☀️</span> Light</dt><dd>${esc(z.light)}</dd></div>
      <div><dt><span aria-hidden="true">🌡️</span> Cold</dt><dd>${esc(z.cold)}</dd></div>
      <div><dt><span aria-hidden="true">⬇️</span> Pressure</dt><dd>${esc(z.pressure)}</dd></div>
    </dl>`;
}

function zoneNav(state: LessonState) {
  return `<nav class="stop-nav" aria-label="Ocean zones">
    ${zones
      .map((z, i) => btn(`${i + 1}. ${z.title}`, 'dz-zone', { arg: z.id, cls: `stop-btn${state.deep.zone === z.id ? ' is-current' : ''}`, pressed: state.deep.zone === z.id }))
      .join('')}
  </nav>`;
}

function dots(done: number, total: number, label: string) {
  return `<div class="find-dots" role="img" aria-label="${esc(label)}">${Array.from({ length: total }, (_, i) => `<span class="dot${i < done ? ' is-found' : ''}"></span>`).join('')}</div>`;
}

function lightsSwitch(state: LessonState, big = false) {
  const on = state.deep.lights;
  return `<div class="segmented${big ? ' big-seg' : ''}" role="group" aria-label="Our lights">
      ${btn('Our lights on', 'dz-lights', { arg: 'on', cls: `seg${on ? ' is-current' : ''}`, pressed: on, icon: '🔦' })}
      ${btn('Our lights off', 'dz-lights', { arg: 'off', cls: `seg${!on ? ' is-current' : ''}`, pressed: !on, icon: '🌑' })}
    </div>`;
}

// ── Step bodies (Grades 3–6) ─────────────────────────────────────────────────

function briefingBody(step: DeepStep) {
  return `<p>${esc(DEEP_INTRO)}</p>
    <ul class="prompts">${step.prompts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <p class="small muted">The scene is not to scale: the real zones are hundreds of meters thick. The animals are illustrations, shown bigger than life.</p>`;
}

function descendBody(state: LessonState) {
  const d = state.deep;
  const here = deepAnimalsAt(d.zone);
  return `${zoneNav(state)}
    <div class="zone-panel">
      ${zoneGauge(d.zone)}
      <div>
        <p class="lead">${esc(zoneById.get(d.zone)!.arrival)}</p>
        ${zoneFacts(d.zone)}
      </div>
    </div>
    <p class="eyebrow">Animals here</p>
    <div class="organism-list" role="group" aria-label="Animals in this zone">
      ${here.map((a) => btn(d.met.includes(a.id) ? `${a.title} ✓` : a.title, 'dz-meet', { arg: a.id, cls: 'organism-btn' })).join('')}
    </div>
    <p class="progress-note" role="status">Visited ${d.visited.length} of ${zones.length} zones · met ${d.met.length} ${d.met.length === 1 ? 'animal' : 'animals'}. Tap them on the screen too.</p>`;
}

function sortBody(state: LessonState) {
  const d = state.deep;
  const placed = Object.keys(d.sorted).length;
  const done = placed === zoneClues.length;
  const miss = d.sortMiss ? zoneClueById.get(d.sortMiss.clue) : null;
  return `<ol class="clue-list">
      ${zoneClues
        .map((c) => {
          const at = d.sorted[c.id];
          const buttons = at
            ? `<span class="clue-answer zone-${at}">✓ ${esc(zoneById.get(at)!.title)}</span>`
            : `<div class="clue-zones" role="group" aria-label="Which zone?">${zones
                .map((z) =>
                  btn(z.title.replace(' zone', ''), 'dz-sort', {
                    arg: `${c.id}:${z.id}`,
                    cls: `option clue-btn zone-${z.id}${d.sortMiss?.clue === c.id && d.sortMiss.zone === z.id ? ' is-wrong' : ''}`,
                    key: `dz-sort:${c.id}:${z.id}`,
                  }),
                )
                .join('')}</div>`;
          return `<li class="clue${at ? ' is-placed' : ''}"><p>${esc(c.text)}</p>${buttons}</li>`;
        })
        .join('')}
    </ol>
    ${miss ? `<p class="feedback retry" role="status">Not yet. ${esc(miss.hint)}</p>` : ''}
    <p class="progress-note" role="status">${placed} of ${zoneClues.length} clues placed.</p>
    ${
      done
        ? `<div class="twist"><p class="eyebrow">${esc(migrationTwist.title)}</p><p>${esc(migrationTwist.text)}</p>
            ${btn('Listen', 'say', { arg: 'dz-sort-done', cls: 'ghost small-btn', icon: '🔊' })}</div>`
        : ''
    }`;
}

function glowBody(state: LessonState) {
  const d = state.deep;
  const chosen = glowPrediction.options.find((x) => x.id === d.prediction);
  const predict = `<fieldset class="choice"><legend>${esc(glowPrediction.prompt)}</legend>
      <div class="options">${glowPrediction.options
        .map((x) => btn(x.label, 'dz-predict', { arg: x.id, cls: `option${d.prediction === x.id ? ' is-selected' : ''}`, pressed: d.prediction === x.id, disabled: d.revealed && d.prediction !== x.id }))
        .join('')}</div></fieldset>`;
  if (!d.revealed) {
    return `<p class="moon-note"><span aria-hidden="true">🌑</span> The midnight zone: no sunlight ever reaches here.</p>
      ${predict}
      ${btn('Record class prediction', 'dz-reveal', { cls: 'primary', disabled: d.prediction === null })}
      <p class="small muted">The lights switch opens after the class records a prediction.</p>`;
  }
  return `<p class="badge-row"><span class="badge">${esc(glowReveal.badge)}</span></p>
    <p><strong>Our prediction:</strong> ${esc(chosen?.label ?? '')}</p>
    ${lightsSwitch(state, true)}
    <p class="lead" role="status">${esc(d.lights ? glowReveal.on : glowReveal.off)}</p>
    ${
      d.sawDark
        ? `<div class="feedback good"><p><strong>What scientists found:</strong> ${esc(glowReveal.explanation)}</p>${chosen ? `<p class="small">${esc(chosen.response)}</p>` : ''}</div>`
        : '<p class="small muted">Switch our lights off and see what is still glowing.</p>'
    }`;
}

function explainBody(state: LessonState) {
  const d = state.deep;
  const done = [choice(state, deepExitLight.id).correct, choice(state, deepExitLure.id).correct, d.action !== null && (d.actionDiscussed || d.actionScore !== null)];
  let body = '';
  if (d.exitIndex === 0) body = choiceItem(state, deepExitLight);
  else if (d.exitIndex === 1) body = choiceItem(state, deepExitLure);
  else {
    const chosen = deepActions.choices.find((x) => x.id === d.action);
    body = `<fieldset class="choice"><legend>${esc(deepActions.prompt)}</legend><div class="options">
        ${deepActions.choices.map((x) => btn(x.label, 'dz-action', { arg: x.id, cls: `option${d.action === x.id ? ' is-selected' : ''}`, pressed: d.action === x.id })).join('')}
      </div></fieldset>
      ${
        chosen
          ? `<p class="lead">The ${esc(chosen.label.toLowerCase())} lives where ${esc(chosen.need)}. How does it cope?</p>
             <p class="small">Any feature counts if the class links it to a challenge of the deep: dark, cold, pressure or little food.</p>
             <details class="rubric" data-key="dz-rubric">
               <summary>Teacher rubric (class discussion, not individual scores)</summary>
               <div class="rubric-levels">${deepActions.rubric
                 .map((r) => btn(`${r.score} — ${r.label}`, 'dz-score', { arg: String(r.score), cls: `option rubric-btn${d.actionScore === r.score ? ' is-selected' : ''}`, pressed: d.actionScore === r.score }) + `<p class="small muted">e.g. ${esc(r.example)}</p>`)
                 .join('')}</div>
             </details>
             ${btn(d.actionDiscussed ? 'Reasons discussed ✓' : 'We discussed our reasons', 'dz-discussed', { cls: d.actionDiscussed ? 'secondary is-done' : 'secondary', pressed: d.actionDiscussed })}`
          : ''
      }`;
  }
  return `${tabs('dz-exit', ['1. No sunlight', '2. The lure', '3. Surviving'], d.exitIndex, done)}
    ${body}
    ${d.exitIndex < 2 ? btn('Next question', 'dz-exit', { arg: String(d.exitIndex + 1), cls: 'secondary' }) : ''}`;
}

function recapBody(state: LessonState) {
  const summary = deepSummary(state);
  const group = (status: string, title: string) => {
    const items = summary.filter((s) => s.status === status);
    return `<div class="recap-group recap-${status}"><h3>${title} <span class="count">${items.length}</span></h3>
      ${items.length ? `<ul>${items.map((i) => `<li>${esc(i.label)}</li>`).join('')}</ul>` : '<p class="small muted">None</p>'}</div>`;
  };
  return `<p class="question">${esc(DEEP_QUESTION)}</p>
    <ul class="key-ideas">
      <li>The deeper we go, the darker and colder it gets. Below about 200 meters there is too little light for phytoplankton.</li>
      <li>${esc(pressureFact.text)}</li>
      <li>In the dark, many animals make their own light: to attract food, to hide, and to signal.</li>
    </ul>
    <div class="beyond">
      <p class="eyebrow">${esc(marineSnowFact.title)}</p>
      <p>${esc(marineSnowFact.text)}</p>
      ${btn('Listen', 'say', { arg: 'dz-marine-snow', cls: 'ghost small-btn', icon: '🔊' })}
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
  return `<div class="little-hero" aria-hidden="true">🌊 ⬇️ 🌑</div>
    <p class="lead">The ocean is very, very deep. The deeper we go, the darker and colder it gets.</p>
    <p class="big-line">Let’s dive down and see who lives there!</p>`;
}

function littleDescendBody(state: LessonState) {
  const d = state.deep;
  const z = zoneById.get(d.zone)!;
  const animal = deepAnimalById.get(littleZoneAnimal[d.zone])!;
  const bottom = zoneOrder.indexOf(d.zone) === zoneOrder.length - 1;
  return `${zoneGauge(d.zone)}
    <p class="big-line" role="status">${esc(z.title)}: ${d.zone === 'sunlight' ? 'bright and warm' : d.zone === 'twilight' ? 'dim and blue' : 'dark and cold'}!</p>
    <div class="row">
      ${bottom ? '<p class="lead">We reached the midnight zone!</p>' : btn('Dive deeper!', 'dz-deeper', { cls: 'primary big', icon: '⬇️', key: 'dz-deeper' })}
      ${btn(d.met.includes(animal.id) ? `${animal.title} ✓` : `Meet the ${animal.title.toLowerCase()}`, 'dz-meet', { arg: animal.id, cls: 'secondary big' })}
    </div>
    ${dots(d.visited.length, zones.length, `${d.visited.length} of ${zones.length} zones`)}`;
}

function littleGlowBody(state: LessonState) {
  const d = state.deep;
  const left = glowFinds.filter((id) => !d.found.includes(id));
  return `${btn(d.lights ? 'Turn off our lights' : 'Turn our lights back on', 'dz-lights', { arg: d.lights ? 'off' : 'on', cls: d.lights ? 'primary big' : 'secondary big', icon: d.lights ? '🌑' : '🔦', key: 'dz-lights' })}
    ${dots(d.found.length, glowFinds.length, `Found ${d.found.length} of ${glowFinds.length}`)}
    <p class="big-line" role="status">${
      d.lights ? 'Turn off our lights to see who glows.' : left.length ? `Found ${d.found.length} of ${glowFinds.length}. Tap a glowing animal!` : 'You found all the glowing animals!'
    }</p>
    ${
      !d.lights && left.length
        ? `<details class="find-list" data-key="glow-list"><summary>Choose from a list</summary><div class="organism-list">${left
            .map((id) => btn(deepAnimalById.get(id)!.title, 'dz-find', { arg: id, cls: 'organism-btn' }))
            .join('')}</div></details>`
        : ''
    }`;
}

function littleDoneBody(state: LessonState) {
  const d = state.deep;
  return `<div class="little-hero" aria-hidden="true">🎉 🌑 🎉</div>
    <p class="big-line">You dove all the way to the midnight zone!</p>
    <p class="lead">You visited ${d.visited.length} zones and found ${d.found.length} glowing animals in the dark.</p>
    <p class="notice">In the ocean, we look at animals, but we never touch them.</p>
    <div class="row">
      ${btn('Play again', 'restart', { cls: 'secondary', icon: '↻' })}
      ${btn('Home', 'home', { cls: 'secondary', icon: '⌂' })}
    </div>`;
}

// ── Dock ─────────────────────────────────────────────────────────────────────

export function renderDeepDock(state: LessonState, paused: boolean) {
  const d = state.deep;
  const steps = deepStepsFor(d.level);
  const i = Math.min(d.step, steps.length - 1);
  const step = steps[i];
  const little = d.level === 'little';
  let body = '';
  switch (step.kind) {
    case 'briefing':
      body = little ? littleStoryBody() : briefingBody(step);
      break;
    case 'descend':
      body = little ? littleDescendBody(state) : descendBody(state);
      break;
    case 'sort':
      body = sortBody(state);
      break;
    case 'glow':
      body = little ? littleGlowBody(state) : glowBody(state);
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
  const title = step.kind === 'briefing' && !little ? DEEP_QUESTION : step.instruction;
  return `${stepper(
      steps.map((s) => s.label),
      i,
      'dz-goto',
      steps.map((_, k) => String(k)),
      'Expedition steps',
    )}
    <div class="dock-body${little ? ' little' : ''}">
      <section class="step-card">
        <p class="step-eyebrow">Step ${i + 1} · ${esc(step.label)}</p>
        <h2 class="instruction" tabindex="-1" data-key="instruction">${esc(title)}</h2>
        ${paused ? '<p class="paused-banner" role="status">Paused — narration and motion are stopped. Discussion time is never cut off.</p>' : ''}
        ${body}
      </section>
      ${notes}
    </div>
    ${stepNav({ paused, canBack: i > 0, next: i < steps.length - 1 ? steps[i + 1].label : null, backAction: 'dz-back', nextAction: 'dz-next' })}`;
}
