/**
 * Alternative presentation (OE-12): static, low-motion habitat illustrations
 * with real buttons for each organism. Every essential lesson task works here
 * when 3D is unavailable or turned off.
 */
import { habitatById } from '../content/habitats.ts';
import { organisms } from '../content/organisms.ts';
import type { HabitatId } from '../content/types.ts';

/** Hotspot positions as percentages of the illustration (x, y). */
const HOTSPOTS: Record<string, { x: number; y: number }> = {
  'elkhorn-coral': { x: 32, y: 52 },
  'stoplight-parrotfish': { x: 70, y: 62 },
  'great-barracuda': { x: 58, y: 24 },
  'green-sea-turtle': { x: 50, y: 58 },
  'queen-conch': { x: 52, y: 74 },
};

const water = `
  <defs>
    <linearGradient id="oe-water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fdde8"/><stop offset="0.55" stop-color="#2c9db2"/><stop offset="1" stop-color="#17677c"/>
    </linearGradient>
    <linearGradient id="oe-ray" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#oe-water)"/>
  <path d="M250 0 L380 0 L250 700 L130 700Z M760 0 L860 0 L760 640 L660 640Z M1250 0 L1340 0 L1270 600 L1180 600Z" fill="url(#oe-ray)"/>`;

function elkhorn(x: number, y: number, s: number, reduced: boolean) {
  const keep = `
    <path d="M0 0 C -5 -60 -10 -90 -20 -110" />
    <path d="M-20 -110 C -60 -150 -120 -170 -180 -175" />
    <path d="M-20 -110 C 0 -170 10 -210 0 -250" />
    <path d="M-20 -110 C 30 -150 90 -160 150 -150" />`;
  const removable = `
    <path d="M-120 -170 C -160 -220 -170 -250 -160 -290" />
    <path d="M60 -158 C 90 -210 110 -240 150 -260" />
    <path d="M-20 -110 C -80 -110 -150 -90 -210 -60" />
    <path d="M-20 -110 C 50 -100 130 -80 200 -40" />`;
  const rubble = `
    <g fill="#a89f8a" stroke="none">
      <rect x="-200" y="-12" width="70" height="16" rx="8" transform="rotate(-8 -165 -4)"/>
      <rect x="120" y="-10" width="80" height="16" rx="8" transform="rotate(10 160 -2)"/>
      <rect x="-90" y="-6" width="50" height="14" rx="7"/>
    </g>`;
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke-linecap="round">
    <g stroke="#a7742f" stroke-width="40">${keep}${reduced ? '' : removable}</g>
    <g stroke="#e3c27c" stroke-width="16" opacity="0.7">${keep}${reduced ? '' : removable}</g>
    ${reduced ? rubble : ''}
  </g>`;
}

const smallFish = (x: number, y: number, flip = false) => `
  <g transform="translate(${x} ${y}) scale(${flip ? -1 : 1} 1)">
    <ellipse cx="0" cy="0" rx="26" ry="13" fill="#3d6fe0"/>
    <path d="M-24 0 L-42 -12 L-38 0 L-42 12Z" fill="#f5d23f"/>
    <circle cx="14" cy="-3" r="3" fill="#0b0f14"/>
  </g>`;

const parrotfish = (x: number, y: number) => `
  <g transform="translate(${x} ${y}) rotate(18)">
    <ellipse cx="0" cy="0" rx="90" ry="38" fill="#1f9e6a"/>
    <ellipse cx="6" cy="14" rx="60" ry="14" fill="#5fd3a0"/>
    <path d="M-86 0 L-130 -34 L-118 0 L-130 34Z" fill="#f0a53a"/>
    <path d="M-50 -34 Q 0 -60 50 -34Z" fill="#2bb57c"/>
    <circle cx="-62" cy="-8" r="9" fill="#f6d23a"/>
    <path d="M86 -6 L104 2 L86 10Z" fill="#e8f2ec"/>
    <circle cx="58" cy="-10" r="6" fill="#0b0f14"/>
  </g>`;

const barracuda = (x: number, y: number) => `
  <g transform="translate(${x} ${y})">
    <ellipse cx="0" cy="0" rx="230" ry="30" fill="#c7d2dc"/>
    <ellipse cx="-10" cy="-12" rx="200" ry="12" fill="#55677a"/>
    ${[-120, -80, -40, 0, 40, 80].map((dx) => `<ellipse cx="${dx}" cy="10" rx="12" ry="7" fill="#1f2a35"/>`).join('')}
    <path d="M225 4 L262 10 L225 14Z" fill="#c7d2dc"/>
    <path d="M-225 0 L-270 -36 L-252 0 L-270 36Z" fill="#3b4855"/>
    <path d="M20 -28 L40 -60 L60 -28Z M-110 -28 L-96 -52 L-80 -28Z" fill="#3b4855"/>
    <circle cx="190" cy="-6" r="7" fill="#0b0f14"/>
  </g>`;

function seagrassBlades(x0: number, x1: number, baseY: number, n: number, seed: number) {
  let out = '';
  let a = seed;
  const rand = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * (x1 - x0);
    const h = 120 + rand() * 170;
    const lean = (rand() - 0.5) * 70;
    const shade = ['#3f7d3a', '#4d8f3f', '#356b33', '#5a9a46'][i % 4];
    out += `<path d="M${x} ${baseY} Q ${x + lean * 0.4} ${baseY - h * 0.6} ${x + lean} ${baseY - h}" stroke="${shade}" stroke-width="${7 + rand() * 4}" fill="none" stroke-linecap="round"/>`;
  }
  return out;
}

const turtle = (x: number, y: number) => `
  <g transform="translate(${x} ${y})">
    <ellipse cx="-110" cy="38" rx="90" ry="26" fill="#7c8a5a" transform="rotate(25 -110 38)"/>
    <ellipse cx="120" cy="40" rx="90" ry="26" fill="#7c8a5a" transform="rotate(-25 120 40)"/>
    <ellipse cx="0" cy="0" rx="160" ry="80" fill="#6b4b2a"/>
    <g fill="#a77d45" opacity="0.85">
      <polygon points="-30,-50 30,-50 50,0 30,50 -30,50 -50,0"/>
      <polygon points="-120,-30 -70,-50 -50,0 -70,50 -120,30 -140,0"/>
      <polygon points="120,-30 70,-50 50,0 70,50 120,30 140,0"/>
    </g>
    <ellipse cx="185" cy="0" rx="42" ry="30" fill="#7c8a5a"/>
    <circle cx="200" cy="-8" r="6" fill="#0b0f14"/>
  </g>`;

const conch = (x: number, y: number) => `
  <g transform="translate(${x} ${y})">
    <path d="M-120 20 L60 -50 L90 20 Z" fill="#b8996b"/>
    <g fill="#9c8257">${[-70, -30, 10, 50].map((dx, i) => `<path d="M${dx} ${-30 + i * -6} l10 -26 l10 26Z"/>`).join('')}</g>
    <ellipse cx="-20" cy="-8" rx="40" ry="10" fill="#7d8a47" opacity="0.85"/>
    <ellipse cx="40" cy="-20" rx="24" ry="8" fill="#7d8a47" opacity="0.85"/>
    <path d="M60 -40 Q 150 -30 130 30 Q 90 40 70 20 Z" fill="#f2a3a0"/>
  </g>`;

function floor(color: string, ripples = false) {
  return `<path d="M0 700 Q 400 660 800 690 T 1600 680 L1600 900 L0 900Z" fill="${color}"/>
    ${ripples ? [730, 770, 810, 850].map((y) => `<path d="M0 ${y} Q 200 ${y - 12} 400 ${y} T 800 ${y} T 1200 ${y} T 1600 ${y}" stroke="#cdbb8c" stroke-width="4" fill="none"/>`).join('') : ''}`;
}

function illustration(stop: HabitatId, shelterView: 'before' | 'after' | null) {
  const reduced = shelterView === 'after';
  switch (stop) {
    case 'reef':
      return `${water}${floor('#8c8466')}
        <ellipse cx="1220" cy="700" rx="120" ry="70" fill="#7a7363"/>
        <ellipse cx="1360" cy="690" rx="90" ry="60" fill="#b59f63"/>
        <ellipse cx="190" cy="705" rx="120" ry="70" fill="#7a7363"/>
        <g fill="#d9792f"><rect x="250" y="600" width="26" height="100" rx="10"/><rect x="282" y="620" width="24" height="80" rx="10"/></g>
        ${elkhorn(520, 720, 1.4, reduced)}
        ${shelterView === null || !reduced ? smallFish(500, 520) : smallFish(215, 620, true)}
        ${shelterView ? `<circle cx="${reduced ? 215 : 500}" cy="${reduced ? 620 : 520}" r="56" fill="none" stroke="#7dffb2" stroke-width="6" stroke-dasharray="14 10"/>` : ''}
        ${parrotfish(1120, 600)}
        <g fill="#5f7a2e">${[1180, 1210, 1240, 1260].map((x) => `<path d="M${x} 650 l8 -24 l8 24Z"/>`).join('')}</g>
        <g transform="translate(930 210) scale(0.6) translate(-930 -210)">${barracuda(930, 210)}</g>`;
    case 'seagrass':
      return `${water}${floor('#8f8d5e')}
        ${seagrassBlades(0, 1600, 720, 110, 3)}
        ${turtle(800, 520)}
        ${seagrassBlades(0, 1600, 760, 70, 17)}`;
    case 'sand':
      return `${water}${floor('#e3d4ab', true)}
        ${seagrassBlades(0, 420, 720, 40, 9)}
        <g fill="#5f7a2e">${[700, 760, 900, 980, 1050].map((x) => `<path d="M${x} 700 l7 -20 l7 20Z"/>`).join('')}</g>
        ${conch(840, 680)}`;
  }
}

export interface StaticSceneState {
  stop: HabitatId;
  selected: string | null;
  shelterView: 'before' | 'after' | null;
}

export class StaticScene {
  readonly root: HTMLElement;
  private lastKey = '';

  private onSelect: (id: string) => void;

  constructor(container: HTMLElement, onSelect: (id: string) => void) {
    this.onSelect = onSelect;
    this.root = document.createElement('div');
    this.root.className = 'static-scene';
    container.appendChild(this.root);
  }

  render(s: StaticSceneState) {
    const key = `${s.stop}|${s.selected}|${s.shelterView}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const focused = (document.activeElement as HTMLElement | null)?.dataset?.organism;
    const habitat = habitatById.get(s.stop);
    const here = organisms.filter((o) => o.habitat === s.stop);
    this.root.innerHTML = `<div class="static-frame">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${habitat?.accessibleDescription ?? ''}">
        ${illustration(s.stop, s.shelterView)}
      </svg>
      ${s.shelterView ? '' : here
        .map((o) => {
          const p = HOTSPOTS[o.id];
          return `<button class="hotspot${o.id === s.selected ? ' is-selected' : ''}" style="left:${p.x}%;top:${p.y}%" data-organism="${o.id}" aria-pressed="${o.id === s.selected}">${o.commonName}</button>`;
        })
        .join('')}</div>`;
    this.root.querySelectorAll<HTMLButtonElement>('[data-organism]').forEach((b) =>
      b.addEventListener('click', () => this.onSelect(b.dataset.organism!)),
    );
    // Re-rendering replaces the buttons; keep keyboard focus where it was.
    if (focused) this.root.querySelector<HTMLButtonElement>(`[data-organism="${focused}"]`)?.focus();
  }

  dispose() {
    this.root.remove();
  }
}
