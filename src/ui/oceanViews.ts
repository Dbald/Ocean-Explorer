/**
 * Expedition 3 — "Plankton to Whale Sharks": dock templates for both levels,
 * and the plankton magnifier. Pure functions of lesson state.
 */
import {
  OCEAN_INTRO,
  OCEAN_QUESTION,
  chainChoices,
  chainLinkById,
  chainLinks,
  chainTwist,
  feedItems,
  oceanActions,
  oceanAnimalById,
  oceanAnimalsAt,
  oceanExitBase,
  oceanExitGladden,
  oceanStepsFor,
  oceanStops,
  oxygenFact,
  plankton,
  planktonById,
  raftFinds,
  spawnPrediction,
  spawnReveal,
  whaleSharkStatus,
  type OceanStep,
  type OceanStop,
} from '../content/openOcean.ts';
import { choice, oceanSummary, type LessonState } from '../lesson/controller.ts';
import { btn, esc } from './html.ts';
import { choiceItem, stepNav, stepper, tabs } from './views.ts';

export const oceanStep = (state: LessonState): OceanStep => {
  const list = oceanStepsFor(state.ocean.level);
  return list[Math.min(state.ocean.step, list.length - 1)];
};

/** Where the camera is for the current step. */
export function oceanStopFor(state: LessonState): OceanStop {
  const kind = oceanStep(state).kind;
  if (kind === 'dive') return state.ocean.stop;
  if (kind === 'spawn') return 'spit';
  if (kind === 'raft') return 'raft';
  return 'blue';
}

// ── Shared pieces ────────────────────────────────────────────────────────────

function oceanStopNav(state: LessonState) {
  return `<nav class="stop-nav" aria-label="Places in the open ocean">
    ${oceanStops
      .map((s, i) =>
        btn(`${i + 1}. ${s.title}`, 'oc-stop', { arg: s.id, cls: `stop-btn${state.ocean.stop === s.id ? ' is-current' : ''}`, pressed: state.ocean.stop === s.id }),
      )
      .join('')}
  </nav>`;
}

function magnifierButton(state: LessonState, big = false) {
  const open = state.ocean.magnifier;
  const seen = state.ocean.seenPlankton.length;
  return `<div class="row">
      ${btn(open ? 'Close the magnifier' : 'Look through the magnifier', 'oc-magnifier', { arg: open ? 'close' : 'open', cls: open ? 'secondary' : big ? 'primary big' : 'primary', icon: '🔍', key: 'oc-magnifier' })}
      <span class="small muted" role="status">${seen} of ${plankton.length} tiny things seen</span>
    </div>`;
}

function dots(done: number, total: number, label: string) {
  return `<div class="find-dots" role="img" aria-label="${esc(label)}">${Array.from({ length: total }, (_, i) => `<span class="dot${i < done ? ' is-found' : ''}"></span>`).join('')}</div>`;
}

// ── Step bodies (Grades 3–6) ─────────────────────────────────────────────────

function briefingBody(step: OceanStep) {
  return `<p>${esc(OCEAN_INTRO)}</p>
    <ul class="prompts">${step.prompts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <p class="small muted">The plankton are drawn much bigger than life, and the animals are illustrations. Gladden Spit is a real place on Belize’s reef.</p>`;
}

function diveBody(state: LessonState) {
  const o = state.ocean;
  const stop = oceanStops.find((s) => s.id === o.stop)!;
  const here = oceanAnimalsAt(o.stop);
  return `${magnifierButton(state)}
    ${oceanStopNav(state)}
    <div class="habitat-intro"><p class="lead">${esc(stop.arrival)}</p></div>
    <p class="eyebrow">Animals here</p>
    <div class="organism-list" role="group" aria-label="Animals at this place">
      ${here.map((a) => btn(o.met.includes(a.id) ? `${a.title} ✓` : a.title, 'oc-meet', { arg: a.id, cls: 'organism-btn' })).join('')}
    </div>
    <p class="progress-note" role="status">Met ${o.met.length} ${o.met.length === 1 ? 'animal' : 'animals'} so far. Tap them on the screen too.</p>`;
}

function chainBody(state: LessonState) {
  const o = state.ocean;
  const placed = o.chain.map((id) => chainLinkById.get(id)!);
  const prev = placed.length ? placed[placed.length - 1].title.toLowerCase() : 'sunlight';
  const done = placed.length === chainLinks.length;
  const slots = chainLinks
    .map((_, i) => {
      const p = placed[i];
      const arrow = i < chainLinks.length - 1 ? '<span class="arrow" aria-hidden="true">→</span>' : '';
      return `<span class="chain-link"><span class="chain-slot${p ? ' is-placed' : ''}">${p ? `<strong>${esc(p.title)}</strong><span class="small">${esc(p.note)}</span>` : '<span class="muted">?</span>'}</span>${arrow}</span>`;
    })
    .join('');
  const miss = o.chainMiss ? chainLinkById.get(o.chainMiss) : null;
  return `<div class="chain" role="group" aria-label="Our food chain">
      <span class="chain-link"><span class="chain-slot is-sun"><strong>☀️ Sunlight</strong></span><span class="arrow" aria-hidden="true">→</span></span>${slots}
    </div>
    <p class="legend-note small"><span class="arrow" aria-hidden="true">→</span> <span>Arrows mean <strong>energy moves from food to the animal that eats it</strong>.</span></p>
    ${
      done
        ? `<div class="twist"><p class="eyebrow">${esc(chainTwist.title)}</p><p>${esc(chainTwist.text)}</p>
            <p class="food-arrow"><span class="chip">Plankton</span><span class="arrow" aria-hidden="true">→</span><span class="sr-only"> gives energy to </span><span class="chip">Whale shark</span></p>
            ${btn('Listen', 'say', { arg: 'oc-chain-done', cls: 'ghost small-btn', icon: '🔊' })}</div>`
        : `<fieldset class="choice"><legend tabindex="-1" data-key="chain-legend">What eats ${esc(prev)}? Tap who comes next.</legend>
            <div class="options">${chainChoices
              .map((id) => {
                const l = chainLinkById.get(id)!;
                const used = o.chain.includes(id);
                return btn(used ? `${l.title} ✓` : l.title, 'oc-chain', { arg: id, cls: `option${used ? ' is-correct' : ''}`, disabled: used });
              })
              .join('')}</div></fieldset>
          ${miss ? `<p class="feedback retry" role="status">Not yet. ${esc(miss.title)} ${miss.id === 'phytoplankton' ? 'makes its own food from sunlight' : `doesn’t eat ${esc(prev)}`}. Which one does?</p>` : ''}`
    }`;
}

function spawnBody(state: LessonState) {
  const o = state.ocean;
  const chosen = spawnPrediction.options.find((x) => x.id === o.prediction);
  const predict = `<fieldset class="choice"><legend>${esc(spawnPrediction.prompt)}</legend>
      <div class="options">${spawnPrediction.options
        .map((x) => btn(x.label, 'oc-predict', { arg: x.id, cls: `option${o.prediction === x.id ? ' is-selected' : ''}`, pressed: o.prediction === x.id, disabled: o.revealed && o.prediction !== x.id }))
        .join('')}</div></fieldset>`;
  if (!o.revealed) {
    return `<p class="moon-note"><span aria-hidden="true">🌕</span> Gladden Spit, Belize: where the reef drops away into deep water.</p>
      ${predict}
      ${btn('Record class prediction', 'oc-reveal', { cls: 'primary', disabled: o.prediction === null })}
      <p class="small muted">The test opens after the class records a prediction.</p>`;
  }
  return `<p class="badge-row"><span class="badge">${esc(spawnReveal.badge)}</span></p>
    <p><strong>Our prediction:</strong> ${esc(chosen?.label ?? '')}</p>
    <div class="segmented big-seg" role="group" aria-label="Snapper spawning">
      ${btn('Snappers resting', 'oc-spawn', { arg: 'off', cls: `seg${!o.spawning ? ' is-current' : ''}`, pressed: !o.spawning })}
      ${btn('Snappers spawning', 'oc-spawn', { arg: 'on', cls: `seg${o.spawning ? ' is-current' : ''}`, pressed: o.spawning })}
    </div>
    <p class="lead" role="status">${esc(o.spawning ? spawnReveal.on : spawnReveal.off)}</p>
    ${
      o.sawSpawn
        ? `<div class="feedback good"><p><strong>What scientists found:</strong> ${esc(spawnReveal.explanation)}</p>${chosen ? `<p class="small">${esc(chosen.response)}</p>` : ''}</div>
           <p class="moon-note"><span aria-hidden="true">🌕</span> April and May, around the full moon.</p>`
        : '<p class="small muted">Switch the snappers to spawning and watch who arrives.</p>'
    }`;
}

function explainBody(state: LessonState) {
  const o = state.ocean;
  const done = [choice(state, oceanExitBase.id).correct, choice(state, oceanExitGladden.id).correct, o.action !== null && (o.actionDiscussed || o.actionScore !== null)];
  let body = '';
  if (o.exitIndex === 0) body = choiceItem(state, oceanExitBase);
  else if (o.exitIndex === 1) body = choiceItem(state, oceanExitGladden);
  else {
    const chosen = oceanActions.choices.find((x) => x.id === o.action);
    body = `<fieldset class="choice"><legend>${esc(oceanActions.prompt)}</legend><div class="options">
        ${oceanActions.choices.map((x) => btn(x.label, 'oc-action', { arg: x.id, cls: `option${o.action === x.id ? ' is-selected' : ''}`, pressed: o.action === x.id })).join('')}
      </div></fieldset>
      ${
        chosen
          ? `<p class="lead">We chose <strong>${esc(chosen.label.toLowerCase())}</strong> because ${esc(chosen.need)}.</p>
             <p class="small">Any action connected to plankton, the spawning site or boats counts. Ask: how does it help the whale sharks?</p>
             <details class="rubric" data-key="oc-rubric">
               <summary>Teacher rubric (class discussion, not individual scores)</summary>
               <div class="rubric-levels">${oceanActions.rubric
                 .map((r) => btn(`${r.score} — ${r.label}`, 'oc-score', { arg: String(r.score), cls: `option rubric-btn${o.actionScore === r.score ? ' is-selected' : ''}`, pressed: o.actionScore === r.score }) + `<p class="small muted">e.g. ${esc(r.example)}</p>`)
                 .join('')}</div>
             </details>
             ${btn(o.actionDiscussed ? 'Reasons discussed ✓' : 'We discussed our reasons', 'oc-discussed', { cls: o.actionDiscussed ? 'secondary is-done' : 'secondary', pressed: o.actionDiscussed })}`
          : ''
      }`;
  }
  return `${tabs('oc-exit', ['1. The bottom', '2. Gladden Spit', '3. How to help'], o.exitIndex, done)}
    ${body}
    ${o.exitIndex < 2 ? btn('Next question', 'oc-exit', { arg: String(o.exitIndex + 1), cls: 'secondary' }) : ''}`;
}

function recapBody(state: LessonState) {
  const summary = oceanSummary(state);
  const group = (status: string, title: string) => {
    const items = summary.filter((s) => s.status === status);
    return `<div class="recap-group recap-${status}"><h3>${title} <span class="count">${items.length}</span></h3>
      ${items.length ? `<ul>${items.map((i) => `<li>${esc(i.label)}</li>`).join('')}</ul>` : '<p class="small muted">None</p>'}</div>`;
  };
  return `<p class="question">${esc(OCEAN_QUESTION)}</p>
    <ul class="key-ideas">
      <li>Phytoplankton use sunlight to make food. The energy passes up the chain: zooplankton, small fish, then hunters.</li>
      <li>The whale shark, the biggest fish, eats plankton, and comes to Gladden Spit to eat clouds of snapper eggs.</li>
      <li>${esc(whaleSharkStatus.text)}</li>
    </ul>
    <div class="beyond">
      <p class="eyebrow">${esc(oxygenFact.title)}</p>
      <p>${esc(oxygenFact.text)}</p>
      ${btn('Listen', 'say', { arg: 'oc-oxygen', cls: 'ghost small-btn', icon: '🔊' })}
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
  return `<div class="little-hero" aria-hidden="true">🌊 🦈 🐢</div>
    <p class="lead">Past the reef, the water gets deep and blue. Out here live the tiniest living things, and the biggest fish in the world.</p>
    <p class="big-line">Let’s go and see!</p>`;
}

function littleTinyBody(state: LessonState) {
  const n = state.ocean.seenPlankton.length;
  return `${magnifierButton(state, true)}
    ${dots(n, plankton.length, `${n} of ${plankton.length} tiny things`)}
    <p class="big-line" role="status">${n === plankton.length ? 'You found them all! They are called plankton.' : 'Tap each tiny thing in the magnifier.'}</p>`;
}

function littleFeedBody(state: LessonState) {
  const o = state.ocean;
  const last = feedItems.find((f) => f.id === o.lastFeed);
  return `<div class="helper-grid" role="group" aria-label="What does the whale shark eat?">
      ${feedItems
        .map((f) => {
          const tried = o.fed.includes(f.id);
          const cls = `btn helper-card${tried ? (f.food ? ' is-done' : ' is-wrong') : ''}`;
          return `<button type="button" class="${cls}" data-action="oc-feed" data-arg="${f.id}" data-key="oc-feed:${f.id}"><span class="helper-icon" aria-hidden="true">${f.icon}</span><span>${esc(f.label)}${tried ? (f.food ? ' ✓' : ' ✗') : ''}</span></button>`;
        })
        .join('')}
    </div>
    ${last ? `<p class="feedback ${last.food ? 'good' : 'retry'}" role="status">${esc(last.line)}</p>` : ''}`;
}

function littleRaftBody(state: LessonState) {
  const o = state.ocean;
  const left = raftFinds.filter((id) => !o.found.includes(id));
  return `${dots(o.found.length, raftFinds.length, `Found ${o.found.length} of ${raftFinds.length}`)}
    <p class="big-line" role="status">${left.length ? `Found ${o.found.length} of ${raftFinds.length}. Keep looking!` : 'You found everyone hiding in the seaweed!'}</p>
    ${
      left.length
        ? `<details class="find-list" data-key="raft-list"><summary>Choose from a list</summary><div class="organism-list">${left
            .map((id) => btn(oceanAnimalById.get(id)!.title, 'oc-find', { arg: id, cls: 'organism-btn' }))
            .join('')}</div></details>`
        : ''
    }`;
}

function littleDoneBody(state: LessonState) {
  const o = state.ocean;
  return `<div class="little-hero" aria-hidden="true">🎉 🦈 🎉</div>
    <p class="big-line">The tiniest things feed the biggest fish!</p>
    <p class="lead">You saw ${o.seenPlankton.length} kinds of plankton, fed the whale shark, and found ${o.found.length} animals in the seaweed.</p>
    <p class="notice">In the ocean, we look at animals, but we never touch them.</p>
    <div class="row">
      ${btn('Play again', 'restart', { cls: 'secondary', icon: '↻' })}
      ${btn('Home', 'home', { cls: 'secondary', icon: '⌂' })}
    </div>`;
}

// ── Dock ─────────────────────────────────────────────────────────────────────

export function renderOceanDock(state: LessonState, paused: boolean) {
  const o = state.ocean;
  const steps = oceanStepsFor(o.level);
  const i = Math.min(o.step, steps.length - 1);
  const step = steps[i];
  const little = o.level === 'little';
  let body = '';
  switch (step.kind) {
    case 'briefing':
      body = little ? littleStoryBody() : briefingBody(step);
      break;
    case 'dive':
      body = diveBody(state);
      break;
    case 'chain':
      body = chainBody(state);
      break;
    case 'spawn':
      body = spawnBody(state);
      break;
    case 'explain':
      body = explainBody(state);
      break;
    case 'recap':
      body = little ? littleDoneBody(state) : recapBody(state);
      break;
    case 'tiny':
      body = littleTinyBody(state);
      break;
    case 'feed':
      body = littleFeedBody(state);
      break;
    case 'raft':
      body = littleRaftBody(state);
      break;
  }
  const notes = `<details class="teacher-notes" data-key="notes">
      <summary>Teacher notes · ${esc(step.time)}</summary>
      <ul>${step.teacherNotes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
      ${step.prompts.length ? `<p class="small"><strong>Prompts:</strong> ${step.prompts.map(esc).join(' · ')}</p>` : ''}
    </details>`;
  const title = step.kind === 'briefing' && !little ? OCEAN_QUESTION : step.instruction;
  return `${stepper(
      steps.map((s) => s.label),
      i,
      'oc-goto',
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
    ${stepNav({ paused, canBack: i > 0, next: i < steps.length - 1 ? steps[i + 1].label : null, backAction: 'oc-back', nextAction: 'oc-next' })}`;
}

// ── The plankton magnifier ──────────────────────────────────────────────────

/** Drawings of each plankton, much bigger than life, in a 200×200 box. */
const PLANKTON_ART: Record<string, string> = {
  diatom: `<g fill="#d9b44a" stroke="#7a5a12" stroke-width="3">
      ${[0, 1, 2].map((i) => `<rect x="${30 + i * 48}" y="80" width="44" height="40" rx="14"/><line x1="${36 + i * 48}" y1="100" x2="${68 + i * 48}" y2="100" stroke-dasharray="3 4"/>`).join('')}
    </g><g fill="#8a9a2a" opacity="0.7">${[0, 1, 2].map((i) => `<circle cx="${52 + i * 48}" cy="100" r="7"/>`).join('')}</g>`,
  dinoflagellate: `<g fill="#c9a03a" stroke="#6e4f10" stroke-width="3" stroke-linejoin="round">
      <path d="M100 55 L112 95 L150 150 L118 120 L104 165 L92 120 L58 150 L88 95 Z"/>
      <path d="M78 98 Q100 110 122 98" fill="none"/>
    </g><path d="M122 100 q20 -10 30 5 t25 5" fill="none" stroke="#6e4f10" stroke-width="2.5"/>`,
  copepod: `<g stroke="#9a3b1f" stroke-width="3" fill="#f0a27a" fill-opacity="0.85">
      <path d="M60 100 q20 -26 60 -22 q30 4 34 22 q-4 18 -34 22 q-40 4 -60 -22 z"/>
      <path d="M154 100 l26 -14 M154 100 l26 14" fill="none"/>
    </g><path d="M66 92 Q30 40 10 30 M66 108 Q30 160 10 170" fill="none" stroke="#9a3b1f" stroke-width="2.5"/>
    <circle cx="74" cy="96" r="5" fill="#c0261b"/>
    <g stroke="#9a3b1f" stroke-width="2">${[0, 1, 2, 3].map((i) => `<line x1="${92 + i * 12}" y1="118" x2="${86 + i * 12}" y2="138"/>`).join('')}</g>`,
};

/** Where each plankton sits in the lens (percent of the lens). */
const PLANKTON_SPOT: Record<string, [number, number]> = { diatom: [29, 33], dinoflagellate: [71, 33], copepod: [50, 66] };

export function renderMagnifier(state: LessonState) {
  const o = state.ocean;
  const last = o.seenPlankton.length ? planktonById.get(o.seenPlankton[o.seenPlankton.length - 1]) : null;
  return `<div class="magnifier" role="group" aria-label="Magnifier: plankton, drawn much bigger than life">
      <div class="lens">
        ${plankton
          .map((p) => {
            const [x, y] = PLANKTON_SPOT[p.id];
            const seen = o.seenPlankton.includes(p.id);
            return `<button type="button" class="plankton${seen ? ' is-seen' : ''}" style="left:${x}%;top:${y}%" data-action="oc-plankton" data-arg="${p.id}" data-key="oc-plankton:${p.id}" aria-label="${esc(p.title)}${seen ? ', seen' : ''}">
              <svg viewBox="0 0 200 200" aria-hidden="true">${PLANKTON_ART[p.id]}</svg>
              ${seen ? `<span class="plankton-name">${esc(p.title)}<span class="plankton-kind">${esc(p.kind)}</span></span>` : ''}
            </button>`;
          })
          .join('')}
      </div>
      <div class="lens-caption">
        ${last ? `<p>${esc(last.line)}</p>` : '<p>Tap each tiny thing to meet it.</p>'}
        <p class="small">Drawn much bigger than life.</p>
        ${btn('Close', 'oc-magnifier', { arg: 'close', cls: 'secondary small-btn', icon: '✕' })}
      </div>
    </div>`;
}

