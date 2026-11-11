/**
 * Alternative presentation (OE-12): static, low-motion habitat illustrations
 * with real buttons for each organism. Every essential lesson task works here
 * when 3D is unavailable or turned off.
 */
import { habitatById } from '../content/habitats.ts';
import { findablesAt } from '../content/findables.ts';
import type { HabitatId } from '../content/types.ts';
import { oceanAnimalsAt, oceanStops, type OceanStop } from '../content/openOcean.ts';
import { deepAnimalsAt, zoneById, type DeepZone } from '../content/deepOcean.ts';

/** Hotspot positions as percentages of the illustration (x, y). */
const HOTSPOTS: Record<string, { x: number; y: number }> = {
  'elkhorn-coral': { x: 32, y: 52 },
  'stoplight-parrotfish': { x: 70, y: 62 },
  'great-barracuda': { x: 58, y: 24 },
  'brain-coral': { x: 85, y: 76 },
  'sea-fan': { x: 47, y: 58 },
  'tube-sponge': { x: 17, y: 68 },
  'nurse-shark': { x: 52, y: 89 },
  'spiny-lobster': { x: 80, y: 88 },
  'sea-urchin': { x: 26, y: 88 },
  'green-moray': { x: 94, y: 74 },
  'reef-octopus': { x: 40, y: 92 },
  'blue-tang': { x: 75, y: 33 },
  'sergeant-major': { x: 19, y: 42 },
  'green-sea-turtle': { x: 50, y: 58 },
  'eagle-ray': { x: 74, y: 24 },
  'cushion-star': { x: 19, y: 85 },
  'sea-cucumber': { x: 79, y: 87 },
  'queen-conch': { x: 52, y: 74 },
  'southern-stingray': { x: 76, y: 80 },
  'hermit-crab': { x: 26, y: 84 },
};

/** Expedition 2: where each piece of trash sits in the illustrations. */
const LITTER_SPOTS: Record<string, { x: number; y: number; kind: 'bag' | 'bottle' | 'net' | 'line' }> = {
  'litter-1': { x: 42, y: 36, kind: 'bag' },
  'litter-2': { x: 63, y: 80, kind: 'bottle' },
  'litter-3': { x: 8, y: 86, kind: 'net' },
  'litter-4': { x: 60, y: 46, kind: 'line' },
  'litter-5': { x: 66, y: 93, kind: 'bottle' },
  'litter-6': { x: 33, y: 72, kind: 'bag' },
  'litter-7': { x: 63, y: 80, kind: 'bottle' },
  'litter-8': { x: 88, y: 70, kind: 'line' },
  'litter-9': { x: 30, y: 30, kind: 'bag' },
  'litter-10': { x: 64, y: 90, kind: 'bottle' },
  'litter-11': { x: 38, y: 66, kind: 'bag' },
  'litter-12': { x: 90, y: 64, kind: 'line' },
};
const LITTER_STOP: Record<string, HabitatId> = Object.fromEntries(
  Object.keys(LITTER_SPOTS).map((id) => [id, Number(id.slice(7)) <= 5 ? 'reef' : Number(id.slice(7)) <= 9 ? 'seagrass' : 'sand']),
) as Record<string, HabitatId>;

const LITTER_ICONS = {
  bag: '<svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="M-30 -18 Q-34 30 -26 38 L26 38 Q34 30 30 -18 L18 -18 Q18 -40 8 -40 Q2 -26 6 -18 L-6 -18 Q-2 -26 -8 -40 Q-18 -40 -18 -18Z" fill="#f4f7f6" fill-opacity="0.85" stroke="#9fb4ba" stroke-width="3"/><path d="M-20 0 Q0 10 20 -2 M-18 20 Q2 26 22 18" stroke="#c8d6da" stroke-width="3" fill="none"/></svg>',
  bottle: '<svg viewBox="-50 -50 100 100" aria-hidden="true"><g transform="rotate(-70)"><rect x="-14" y="-24" width="28" height="56" rx="8" fill="#bfe6f2" fill-opacity="0.8" stroke="#7fb2c2" stroke-width="3"/><path d="M-10 -24 Q-8 -36 -5 -38 L5 -38 Q8 -36 10 -24Z" fill="#bfe6f2" stroke="#7fb2c2" stroke-width="3"/><rect x="-6" y="-46" width="12" height="9" rx="2" fill="#1f6fe0"/><rect x="-14" y="0" width="28" height="12" fill="#e0453a"/></g></svg>',
  net: '<svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="M-44 30 Q-30 -30 0 -34 Q34 -30 44 30Z" fill="none" stroke="#2f8f6a" stroke-width="3"/><g stroke="#2f8f6a" stroke-width="3">' +
    [-30, -15, 0, 15, 30].map((x) => `<line x1="${x}" y1="30" x2="${x * 0.4}" y2="-32"/>`).join('') +
    [-15, 0, 15].map((y) => `<line x1="-42" y1="${y}" x2="42" y2="${y}"/>`).join('') +
    '</g><circle cx="34" cy="-14" r="8" fill="#f07a22"/></svg>',
  line: '<svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="M-30 10 C-40 -30 20 -40 25 -10 C30 20 -20 30 -15 0 C-10 -25 35 -20 30 15 C25 40 -35 35 -30 10" fill="none" stroke="#e9f27a" stroke-width="4"/><circle cx="30" cy="15" r="6" fill="#7d8590"/></svg>',
};

/** Thick sargassum mats along the top of the picture, shading everything below. */
function sargassumOverlay(stop: HabitatId) {
  let r = 7;
  const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const clumps = Array.from({ length: 34 }, (_, i) => {
    const x = (i / 33) * 1700 - 50 + rand() * 40;
    const y = 30 + rand() * 90;
    const rx = 60 + rand() * 70;
    return `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${(rx * 0.35).toFixed(0)}" fill="${i % 2 ? '#7d5a1c' : '#5e4416'}"/>`;
  }).join('');
  const bladders = Array.from({ length: 140 }, () => `<circle cx="${(rand() * 1600).toFixed(0)}" cy="${(40 + rand() * 110).toFixed(0)}" r="${(5 + rand() * 5).toFixed(1)}" fill="#a9792a"/>`).join('');
  const strands = Array.from({ length: 40 }, () => {
    const x = rand() * 1600;
    return `<path d="M${x.toFixed(0)} 120 q${(rand() * 30 - 15).toFixed(0)} 60 ${(rand() * 20 - 10).toFixed(0)} ${(70 + rand() * 90).toFixed(0)}" stroke="#6b4d18" stroke-width="4" fill="none"/>`;
  }).join('');
  const piles =
    stop === 'sand'
      ? Array.from({ length: 7 }, (_, i) => `<ellipse cx="${120 + i * 210 + rand() * 40}" cy="${800 + rand() * 50}" rx="${70 + rand() * 30}" ry="22" fill="#5e4416"/>`).join('')
      : '';
  return `<g class="sargassum-overlay"><rect width="1600" height="900" fill="#14281f" opacity="0.38"/>${strands}${clumps}${bladders}${piles}</g>`;
}

// ── Spotter animals (simple, readable shapes) ─────────────────────────────

const seaFan = (x: number, y: number) => `
  <g transform="translate(${x} ${y})" stroke="#7d4fa0" stroke-width="6" fill="none" stroke-linecap="round">
    <path d="M0 0 L0 -40 M0 -40 L-70 -150 M0 -40 L-30 -170 M0 -40 L20 -175 M0 -40 L70 -150 M-50 -110 L50 -110 M-60 -140 L60 -140"/>
    <path d="M-70 -150 Q0 -210 70 -150" stroke-width="8"/>
  </g>`;

const nurseShark = (x: number, y: number) => `
  <g transform="translate(${x} ${y})">
    <path d="M-260 0 L-330 -40 L-310 5 L-330 30Z" fill="#94764c"/>
    <ellipse cx="0" cy="0" rx="270" ry="38" fill="#a8875a"/>
    <ellipse cx="20" cy="14" rx="210" ry="16" fill="#d9c49a"/>
    <path d="M-60 -34 L-30 -78 L0 -34Z M-150 -30 L-128 -62 L-108 -30Z" fill="#94764c"/>
    <circle cx="210" cy="-10" r="7" fill="#0b0f14"/>
    <path d="M262 8 l14 10 M262 4 l14 4" stroke="#7a6040" stroke-width="3"/>
  </g>`;

const lobster = (x: number, y: number) => `
  <g transform="translate(${x} ${y})" stroke-linecap="round">
    <path d="M40 -10 Q140 -90 230 -60 M40 -4 Q150 -40 240 -10" stroke="#9a4b2c" stroke-width="5" fill="none"/>
    <ellipse cx="10" cy="0" rx="50" ry="26" fill="#9a4b2c"/>
    ${[0, 1, 2, 3].map((i) => `<ellipse cx="${-50 - i * 26}" cy="4" rx="16" ry="${18 - i * 2}" fill="${i % 2 ? '#e8c27a' : '#9a4b2c'}"/>`).join('')}
    <path d="M-150 4 l-30 -20 l0 40Z" fill="#9a4b2c"/>
    <circle cx="40" cy="-12" r="5" fill="#0b0f14"/>
  </g>`;

const urchin = (x: number, y: number) => `
  <g transform="translate(${x} ${y})" stroke="#16141c" stroke-width="4" stroke-linecap="round">
    ${Array.from({ length: 22 }, (_, i) => { const a = Math.PI + (i / 21) * Math.PI; return `<line x1="0" y1="0" x2="${Math.cos(a) * 85}" y2="${Math.sin(a) * 85}"/>`; }).join('')}
    <ellipse cx="0" cy="0" rx="34" ry="24" fill="#16141c"/>
  </g>`;

const moray = (x: number, y: number) => `
  <g transform="translate(${x} ${y})">
    <ellipse cx="40" cy="20" rx="120" ry="80" fill="#6f6a5c"/>
    <ellipse cx="0" cy="10" rx="40" ry="30" fill="#2a2620"/>
    <path d="M10 10 Q-30 -40 -70 -40 Q-110 -40 -110 -20 Q-90 0 -60 -10 Q-30 -10 -10 25Z" fill="#5d7a2a"/>
    <path d="M-110 -20 Q-90 -8 -70 -18" stroke="#2a1418" stroke-width="4" fill="none"/>
    <circle cx="-80" cy="-32" r="5" fill="#0b0f14"/>
  </g>`;

const octopus = (x: number, y: number) => `
  <g transform="translate(${x} ${y})" stroke="#4f9a8f" stroke-width="12" stroke-linecap="round" fill="none">
    ${[-1, -0.6, -0.2, 0.2, 0.6, 1].map((k) => `<path d="M0 0 Q${k * 60} 30 ${k * 110} ${10 + Math.abs(k) * 10} q${k * 20} -20 ${k * 10} -30"/>`).join('')}
    <ellipse cx="0" cy="-40" rx="42" ry="52" fill="#4f9a8f" stroke="none"/>
    <circle cx="-14" cy="-20" r="6" fill="#0b0f14" stroke="none"/><circle cx="14" cy="-20" r="6" fill="#0b0f14" stroke="none"/>
  </g>`;

const littleFish = (x: number, y: number, body: string, tail: string, stripes = false) => `
  <g transform="translate(${x} ${y})">
    <path d="M-40 0 L-62 -18 L-58 0 L-62 18Z" fill="${tail}"/>
    <ellipse cx="0" cy="0" rx="44" ry="26" fill="${body}"/>
    ${stripes ? [-22, -6, 10].map((sx) => `<rect x="${sx}" y="-24" width="7" height="48" fill="#1b1d22"/>`).join('') : ''}
    <circle cx="26" cy="-6" r="5" fill="#0b0f14"/>
  </g>`;

const trio = (x: number, y: number, body: string, tail: string, stripes = false) =>
  littleFish(x, y, body, tail, stripes) + littleFish(x + 90, y - 40, body, tail, stripes) + littleFish(x + 70, y + 45, body, tail, stripes);

const eagleRay = (x: number, y: number) => `
  <g transform="translate(${x} ${y})">
    <path d="M60 0 L-60 -150 L-40 0 L-60 150Z" fill="#262e3a"/>
    <path d="M-40 0 L-260 6" stroke="#262e3a" stroke-width="5"/>
    <ellipse cx="70" cy="0" rx="40" ry="26" fill="#262e3a"/>
    ${[[-10, -60], [-30, -100], [0, -30], [-10, 60], [-30, 100], [0, 30], [20, -10], [20, 10]].map(([sx, sy]) => `<circle cx="${sx}" cy="${sy}" r="7" fill="#f2f4f6"/>`).join('')}
  </g>`;

const cushionStar = (x: number, y: number) => `
  <g transform="translate(${x} ${y})">
    <path d="${Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 34 : 80; return `${i ? 'L' : 'M'}${Math.cos(a) * r} ${Math.sin(a) * r * 0.6}`; }).join(' ')}Z" fill="#d9762b" stroke="#b85f1f" stroke-width="4" stroke-linejoin="round"/>
    ${[[0, -20], [-30, 0], [30, 0], [-15, 18], [15, 18]].map(([bx, by]) => `<circle cx="${bx}" cy="${by}" r="6" fill="#f1b05a"/>`).join('')}
  </g>`;

const seaCucumber = (x: number, y: number) => `
  <g transform="translate(${x} ${y})">
    <rect x="-110" y="-26" width="220" height="52" rx="26" fill="#6b4a2b"/>
    ${[-80, -50, -20, 10, 40, 70].map((bx, i) => `<circle cx="${bx}" cy="${i % 2 ? -10 : 8}" r="6" fill="#8a6640"/>`).join('')}
  </g>`;

const stingray = (x: number, y: number) => `
  <g transform="translate(${x} ${y})">
    <path d="M-150 0 L-330 10" stroke="#8f8775" stroke-width="5"/>
    <path d="M150 0 Q20 -70 -10 -80 Q-110 -40 -160 0 Q-110 40 -10 80 Q20 70 150 0Z" fill="#8f8775"/>
    <ellipse cx="-20" cy="60" rx="90" ry="16" fill="#d6c79c"/><ellipse cx="-10" cy="-62" rx="80" ry="14" fill="#d6c79c"/>
    <circle cx="70" cy="-14" r="8" fill="#0b0f14"/><circle cx="70" cy="14" r="8" fill="#0b0f14"/>
  </g>`;

const hermitCrab = (x: number, y: number) => `
  <g transform="translate(${x} ${y})">
    <path d="M-80 20 Q-90 -60 -10 -60 Q50 -50 40 20Z" fill="#c9a36a"/>
    <path d="M-60 0 Q-50 -40 -10 -36 Q20 -30 15 0" stroke="#a9834a" stroke-width="6" fill="none"/>
    <ellipse cx="55" cy="10" rx="26" ry="18" fill="#c23b22"/>
    <path d="M60 -6 l0 -26 M74 -4 l4 -26" stroke="#c23b22" stroke-width="5"/>
    <circle cx="60" cy="-34" r="6" fill="#111"/><circle cx="78" cy="-32" r="6" fill="#111"/>
    <path d="M40 24 l-12 18 M60 26 l0 20 M78 22 l12 16" stroke="#c23b22" stroke-width="6" stroke-linecap="round"/>
  </g>`;

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

// ── Expedition 3: the open ocean ─────────────────────────────────────────

const OCEAN_STOPS = new Set(['blue', 'raft', 'spit']);
const isOceanStop = (stop: string): stop is OceanStop => OCEAN_STOPS.has(stop);

const deepWater = `
  <defs>
    <linearGradient id="deep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a9ab4"/><stop offset="0.5" stop-color="#14658a"/><stop offset="1" stop-color="#0a3552"/></linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#deep)"/>
  <g fill="#ffffff" opacity="0.07">${[150, 520, 900, 1280].map((x) => `<path d="M${x} 0 l120 0 l-260 900 l-120 0z"/>`).join('')}</g>
  <g fill="#e6fbf2" opacity="0.5">${Array.from({ length: 90 }, (_, i) => `<circle cx="${(i * 173) % 1600}" cy="${(i * 97) % 900}" r="${1.5 + (i % 3)}"/>`).join('')}</g>`;

/** Whale shark side view: dark with white spots, wide flat mouth at the front. */
const whaleShark = (x: number, y: number, s = 1, flip = false, open = false) => `
  <g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
    <path d="M-330 -10 L-420 -120 L-395 -10 L-430 70 Z" fill="#3a4e5d"/>
    <path d="M-60 -70 L-10 -150 L40 -70 Z" fill="#3a4e5d"/>
    <path d="M-250 -40 L-230 -80 L-205 -40 Z" fill="#3a4e5d"/>
    <path d="M-340 0 C-200 -90 150 -100 330 -40 C350 -20 350 20 330 35 C150 70 -200 60 -340 0 Z" fill="#40586a"/>
    <path d="M-300 20 C-150 55 150 60 320 34 C250 60 -150 70 -300 20 Z" fill="#e8edf0"/>
    <path d="M80 30 L20 110 L-10 105 L30 40 Z" fill="#3a4e5d"/>
    ${Array.from({ length: 60 }, (_, i) => `<circle cx="${-300 + ((i * 47) % 600)}" cy="${-50 + ((i * 29) % 60)}" r="${4 + (i % 3)}" fill="#f1f5f7"/>`).join('')}
    <g stroke="#2a3a46" stroke-width="5">${[0, 1, 2, 3, 4].map((i) => `<path d="M${215 + i * 12} -20 q-6 20 0 40" fill="none"/>`).join('')}</g>
    <ellipse cx="335" cy="${open ? 8 : 5}" rx="16" ry="${open ? 22 : 8}" fill="#141a20"/>
    <circle cx="300" cy="-14" r="6" fill="#141a20"/>
  </g>`;

const fishSchool = (x: number, y: number, n: number, color: string, size = 1) =>
  `<g fill="${color}">${Array.from({ length: n }, (_, i) => {
    const fx = x + ((i * 53) % 260) - 130;
    const fy = y + ((i * 37) % 140) - 70;
    return `<g transform="translate(${fx} ${fy}) scale(${size})"><ellipse cx="0" cy="0" rx="16" ry="6"/><path d="M-14 0 l-10 -7 l0 14z"/></g>`;
  }).join('')}</g>`;

const mahi = (x: number, y: number, flip = false) => `
  <g transform="translate(${x} ${y}) scale(${flip ? -1 : 1} 1)">
    <path d="M-110 0 L-140 -30 L-130 0 L-140 30 Z" fill="#2e9a8f"/>
    <path d="M-110 -6 C-60 -28 40 -40 90 -30 C110 -20 112 10 95 20 C40 30 -60 22 -110 6 Z" fill="#d9c43a"/>
    <path d="M-100 -12 C-40 -40 50 -52 92 -30 C50 -38 -40 -30 -100 -12 Z" fill="#1f7fa0"/>
    <circle cx="80" cy="-6" r="5" fill="#141a20"/>
  </g>`;

const youngTurtle = (x: number, y: number) => `
  <g transform="translate(${x} ${y})">
    <ellipse cx="0" cy="0" rx="34" ry="22" fill="#8a5a2a"/>
    <path d="M-20 -6 L20 -6 M-14 8 L14 8" stroke="#d8b070" stroke-width="3"/>
    <ellipse cx="40" cy="-2" rx="12" ry="9" fill="#6a5a30"/>
    <path d="M-10 18 l-22 18 M10 18 l18 20 M-10 -18 l-20 -16 M10 -18 l18 -16" stroke="#6a5a30" stroke-width="8" stroke-linecap="round"/>
  </g>`;

const raftClumps = (cx: number, cy: number) =>
  `<g>${Array.from({ length: 16 }, (_, i) => `<ellipse cx="${cx + ((i * 71) % 620) - 310}" cy="${cy + ((i * 23) % 60) - 30}" rx="${60 + (i % 4) * 18}" ry="${22 + (i % 3) * 6}" fill="${i % 2 ? '#7d5a1c' : '#5e4416'}"/>`).join('')}
    ${Array.from({ length: 80 }, (_, i) => `<circle cx="${cx + ((i * 37) % 640) - 320}" cy="${cy + ((i * 19) % 70) - 35}" r="${5 + (i % 3)}" fill="#a9792a"/>`).join('')}
    ${Array.from({ length: 24 }, (_, i) => `<path d="M${cx + ((i * 53) % 600) - 300} ${cy + 20} q${(i % 5) * 4 - 8} 40 ${(i % 3) * 6 - 6} ${60 + (i % 4) * 20}" stroke="#6b4d18" stroke-width="4" fill="none"/>`).join('')}</g>`;

function oceanIllustration(stop: OceanStop, spawning: boolean) {
  switch (stop) {
    case 'blue':
      return `${deepWater}
        ${fishSchool(420, 330, 26, '#c9dde6')}
        ${whaleShark(900, 520, 1.15, false)}`;
    case 'raft':
      return `${deepWater}
        <rect width="1600" height="120" fill="#9fe2ee" opacity="0.6"/>
        ${raftClumps(780, 150)}
        ${youngTurtle(640, 230)}
        ${fishSchool(940, 260, 6, '#c2a24a', 0.7)}
        ${mahi(560, 520)}
        ${mahi(1120, 600, true)}`;
    case 'spit':
      return `${deepWater}
        <path d="M900 900 L1000 560 Q1080 520 1200 540 L1600 520 L1600 900 Z" fill="#7a7363"/>
        <g>${Array.from({ length: 14 }, (_, i) => `<ellipse cx="${1020 + i * 42}" cy="${540 - (i % 3) * 8}" rx="${30 + (i % 3) * 8}" ry="${22 + (i % 2) * 6}" fill="${['#c9a24e', '#b08544', '#8e5aa8', '#d0703a'][i % 4]}"/>`).join('')}</g>
        ${fishSchool(820, spawning ? 360 : 480, 22, '#8a4f42', 1.4)}
        ${spawning ? `<g fill="#fff6e0" opacity="0.8">${Array.from({ length: 160 }, (_, i) => `<circle cx="${820 + ((i * 41) % 360) - 180}" cy="${230 + ((i * 29) % 200) - 100}" r="${2 + (i % 3)}"/>`).join('')}</g>
          ${whaleShark(420, 260, 0.75, false, true)}${whaleShark(1180, 180, 0.6, true, true)}` : ''}`;
  }
}

/** Where each open-ocean animal sits in its illustration (percent). */
const OCEAN_HOTSPOTS: Record<string, { x: number; y: number }> = {
  'whale-shark': { x: 58, y: 56 },
  'small-fish': { x: 26, y: 37 },
  'sargassum-raft': { x: 72, y: 15 },
  'young-turtle': { x: 40, y: 26 },
  'young-fish': { x: 59, y: 29 },
  'mahi-mahi': { x: 35, y: 58 },
  'cubera-snapper': { x: 51, y: 50 },
};

// ── Expedition 4: into the deep ──────────────────────────────────────────

const DEEP_ZONES = new Set(['sunlight', 'twilight', 'midnight']);
const isDeepZone = (stop: string): stop is DeepZone => DEEP_ZONES.has(stop);

const deepGradient = (id: string, top: string, bottom: string) =>
  `<defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
    <radialGradient id="glow-blue"><stop offset="0" stop-color="#d9f6ff"/><stop offset="0.3" stop-color="#6fd0ff" stop-opacity="0.8"/><stop offset="1" stop-color="#2a8cff" stop-opacity="0"/></radialGradient>
    <radialGradient id="glow-cyan"><stop offset="0" stop-color="#ffffff"/><stop offset="0.25" stop-color="#9ffcff" stop-opacity="0.9"/><stop offset="1" stop-color="#3fd8ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="glow-pink"><stop offset="0" stop-color="#ffe0ef"/><stop offset="0.3" stop-color="#ff6eb0" stop-opacity="0.85"/><stop offset="1" stop-color="#ff3d8f" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#${id})"/>`;

const marineSnow = (n: number, opacity: number) =>
  `<g fill="#dfe8ec" opacity="${opacity}">${Array.from({ length: n }, (_, i) => `<circle cx="${(i * 137) % 1600}" cy="${(i * 211) % 900}" r="${1.2 + (i % 3) * 0.7}"/>`).join('')}</g>`;

const glowDot = (x: number, y: number, r: number, grad = 'glow-blue') => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${grad})"/>`;

/** Lanternfish: small and silvery, with rows of blue lights along the belly. */
const lanternfish = (x: number, y: number, s: number, flip: boolean, body: number) => `
  <g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
    <g opacity="${body}">
      <path d="M-40 0 L-56 -12 L-52 0 L-56 12 Z" fill="#5d7484"/>
      <path d="M-42 0 C-30 -14 20 -16 38 -6 C44 0 42 6 36 9 C20 16 -30 12 -42 0 Z" fill="#7d93a1"/>
      <path d="M-42 0 C-30 -14 20 -16 38 -6 C10 -10 -20 -8 -42 0 Z" fill="#26384a"/>
      <circle cx="26" cy="-2" r="7" fill="#1a242c"/><circle cx="27" cy="-3" r="2.5" fill="#cfe3ec"/>
    </g>
    ${[-28, -18, -8, 2, 12, 22].map((dx) => glowDot(dx, 10, 6)).join('')}
    ${[-24, -12, 0, 12].map((dx) => glowDot(dx, 3, 4)).join('')}
  </g>`;

/** Hatchetfish: thin as a blade, a deep belly lined with lights. */
const hatchetfish = (x: number, y: number, s: number, flip: boolean, body: number) => `
  <g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
    <g opacity="${body}">
      <path d="M-46 -4 L-60 -16 L-58 0 L-60 14 Z" fill="#c9d4da"/>
      <path d="M-46 -6 C-30 -16 10 -24 40 -18 C48 -12 48 0 40 8 C20 40 -10 52 -24 40 C-34 28 -42 12 -46 -6 Z" fill="#dfe7ec"/>
      <path d="M-46 -6 C-30 -16 10 -24 40 -18 C10 -14 -20 -10 -46 -6 Z" fill="#3a4652"/>
      <circle cx="28" cy="-10" r="9" fill="#1a242c"/><circle cx="29" cy="-12" r="3" fill="#cfe3ec"/>
    </g>
    ${[-20, -12, -4, 4, 12, 20, 28].map((dx, i) => glowDot(dx, 40 - Math.abs(dx - 4) * 0.7 - (i === 6 ? 12 : 0), 6)).join('')}
  </g>`;

/** Anglerfish: round and dark, a huge toothy mouth, and a glowing lure on a rod. */
const anglerfish = (x: number, y: number, s: number, body: number) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <g opacity="${body}">
      <path d="M-120 0 L-170 -40 L-160 0 L-170 40 Z" fill="#3a2a27"/>
      <ellipse cx="0" cy="0" rx="125" ry="95" fill="#3a2a27"/>
      <path d="M60 -30 C120 -30 140 10 130 50 C100 70 60 60 50 30 Z" fill="#0b0707"/>
      <g fill="#efe7d6">${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${70 + i * 11} -24 l5 22 l5 -22z"/><path d="M${66 + i * 11} 52 l5 -22 l5 22z"/>`).join('')}</g>
      <circle cx="40" cy="-50" r="9" fill="#c7c3a0"/><circle cx="41" cy="-51" r="4" fill="#141010"/>
      <path d="M10 -90 Q 90 -210 170 -120" stroke="#4a3632" stroke-width="6" fill="none"/>
    </g>
    ${glowDot(172, -116, 46, 'glow-cyan')}
    <circle cx="172" cy="-116" r="10" fill="#e8ffff"/>
  </g>`;

/** Gulper eel: a whip of a body, an enormous pouch of a mouth, a glowing pink tail tip. */
const gulperEel = (x: number, y: number, s: number, body: number) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <g opacity="${body}">
      <path d="M-260 60 C-180 20 -120 90 -40 40 C0 15 30 10 60 0" stroke="#1d171b" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M40 -10 C90 -40 170 -30 190 0 C170 60 90 90 50 30 Z" fill="#241c22"/>
      <path d="M60 0 C110 -10 170 -6 188 2" stroke="#4a3a44" stroke-width="3" fill="none"/>
      <circle cx="150" cy="-14" r="4" fill="#cfcfd6"/>
    </g>
    ${glowDot(-262, 62, 30, 'glow-pink')}
  </g>`;

/** Atolla jelly: a deep-red crown of a bell with a ring of blue lights. */
const atolla = (x: number, y: number, s: number, body: number) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <g opacity="${body}">
      <path d="M-70 0 C-70 -50 70 -50 70 0 Z" fill="#7a1220"/>
      <g stroke="#8a2a32" stroke-width="2">${Array.from({ length: 12 }, (_, i) => `<path d="M${-66 + i * 12} 0 l${(i % 3) - 1} 40" fill="none"/>`).join('')}</g>
      <path d="M60 0 C80 60 40 120 70 200" stroke="#8a2a32" stroke-width="3" fill="none"/>
    </g>
    ${Array.from({ length: 9 }, (_, i) => glowDot(-56 + i * 14, -14 - Math.sin((i / 8) * Math.PI) * 10, i % 3 === 0 ? 16 : 9)).join('')}
  </g>`;

function deepIllustration(zone: DeepZone, lights: boolean) {
  // With our lights off, the bodies fade to almost nothing and only the animals' own light shows.
  const body = lights ? 1 : 0.12;
  switch (zone) {
    case 'sunlight':
      return `${deepWater}
        <g fill="#a9d86e" opacity="0.85">${Array.from({ length: 140 }, (_, i) => `<circle cx="${380 + ((i * 53) % 300) - 150}" cy="${270 + ((i * 31) % 160) - 80}" r="${2 + (i % 3)}"/>`).join('')}</g>
        ${whaleShark(930, 520, 1.1, false)}`;
    case 'twilight':
      return `${deepGradient('twi', '#123f6a', '#04162b')}
        <g fill="#7fb4d8" opacity="0.06">${[300, 760, 1180].map((x) => `<path d="M${x} 0 l90 0 l-180 900 l-90 0z"/>`).join('')}</g>
        ${marineSnow(110, 0.45)}
        ${Array.from({ length: 12 }, (_, i) => lanternfish(860 + ((i * 97) % 360) - 180, 340 + ((i * 61) % 200) - 100, 1.1, i % 2 === 1, body)).join('')}
        ${hatchetfish(330, 480, 1.4, false, body)}${hatchetfish(470, 560, 1.2, true, body)}${hatchetfish(250, 620, 1.0, false, body)}`;
    case 'midnight':
      return `${deepGradient('mid', '#050b16', '#000000')}
        ${marineSnow(140, lights ? 0.5 : 0.25)}
        <g fill="#dfe8ec" opacity="${lights ? 0.8 : 0.4}">${Array.from({ length: 50 }, (_, i) => `<circle cx="${1310 + ((i * 41) % 160) - 80}" cy="${250 + ((i * 29) % 140) - 70}" r="${1.5 + (i % 3)}"/>`).join('')}</g>
        ${gulperEel(420, 360, 1.3, body)}
        ${anglerfish(990, 500, 1.2, body)}
        ${atolla(680, 600, 1.1, body)}
        ${Array.from({ length: 10 }, (_, i) => glowDot((i * 337) % 1600, (i * 191) % 900, 5)).join('')}`;
  }
}

/** Where each deep-sea animal sits in its illustration (percent). */
const DEEP_HOTSPOTS: Record<string, { x: number; y: number }> = {
  'phytoplankton-cloud': { x: 24, y: 30 },
  'diving-whale-shark': { x: 58, y: 58 },
  lanternfish: { x: 54, y: 38 },
  hatchetfish: { x: 22, y: 58 },
  anglerfish: { x: 62, y: 56 },
  'gulper-eel': { x: 30, y: 40 },
  'atolla-jelly': { x: 43, y: 64 },
  'marine-snow': { x: 82, y: 28 },
};

function illustration(stop: HabitatId, shelterView: 'before' | 'after' | null) {
  const reduced = shelterView === 'after';
  switch (stop) {
    case 'reef':
      return `${water}${floor('#8c8466')}
        <ellipse cx="1220" cy="700" rx="120" ry="70" fill="#7a7363"/>
        <ellipse cx="1360" cy="690" rx="90" ry="60" fill="#c2a25e"/>
        <path d="M1290 690 q20 -30 40 0 t40 0 t40 0 M1300 665 q20 -25 40 0 t40 0 t30 0 M1310 715 q20 -20 40 0 t40 0 t30 0" stroke="#8c7440" stroke-width="5" fill="none"/>
        ${seaFan(760, 560)}
        ${moray(1500, 670)}
        ${trio(1140, 300, '#2357d8', '#2357d8')}
        ${trio(250, 380, '#f4f1df', '#e9d84a', true)}
        <ellipse cx="190" cy="705" rx="120" ry="70" fill="#7a7363"/>
        <g fill="#d9792f"><rect x="250" y="600" width="26" height="100" rx="10"/><rect x="282" y="620" width="24" height="80" rx="10"/></g>
        ${elkhorn(520, 720, 1.4, reduced)}
        ${shelterView === null || !reduced ? smallFish(500, 520) : smallFish(215, 620, true)}
        ${shelterView ? `<circle cx="${reduced ? 215 : 500}" cy="${reduced ? 620 : 520}" r="56" fill="none" stroke="#7dffb2" stroke-width="6" stroke-dasharray="14 10"/>` : ''}
        ${parrotfish(1120, 600)}
        <g fill="#5f7a2e">${[1180, 1210, 1240, 1260].map((x) => `<path d="M${x} 650 l8 -24 l8 24Z"/>`).join('')}</g>
        <g transform="translate(930 210) scale(0.6) translate(-930 -210)">${barracuda(930, 210)}</g>
        ${urchin(420, 800)}
        ${octopus(640, 830)}
        <g transform="translate(830 800) scale(0.75) translate(-830 -800)">${nurseShark(830, 800)}</g>
        <g transform="translate(1250 790) scale(0.7) translate(-1250 -790)">${lobster(1250, 790)}</g>`;
    case 'seagrass':
      return `${water}${floor('#8f8d5e')}
        ${seagrassBlades(0, 1600, 720, 110, 3)}
        ${turtle(800, 520)}
        ${seagrassBlades(0, 1600, 760, 70, 17)}
        ${eagleRay(1180, 220)}
        ${cushionStar(300, 765)}
        ${seaCucumber(1260, 785)}`;
    case 'sand':
      return `${water}${floor('#e3d4ab', true)}
        ${seagrassBlades(0, 420, 720, 40, 9)}
        <g fill="#5f7a2e">${[700, 760, 900, 980, 1050].map((x) => `<path d="M${x} 700 l7 -20 l7 20Z"/>`).join('')}</g>
        ${conch(840, 680)}
        ${stingray(1230, 720)}
        ${hermitCrab(420, 760)}`;
  }
}

export interface StaticSceneState {
  stop: HabitatId | OceanStop | DeepZone;
  selected: string | null;
  shelterView: 'before' | 'after' | null;
  /** In the "Can you find…?" game the buttons carry no visible names, so the picture is the puzzle. */
  labels: boolean;
  /** An animal to point out (game hint). */
  hint: string | null;
  /** Every name showing at once; otherwise a name shows on hover, focus or selection. */
  labelsAlways?: boolean;
  /** Animals the class has met (their dot turns teal, with a ✓). */
  discovered?: string[];
  /** Expedition 3: the snappers are spawning at Gladden Spit. */
  spawning?: boolean;
  /** Expedition 4: our submarine's lights (off shows only the animals' own light). */
  lights?: boolean;
  /** Expedition 2: thick sargassum overhead. */
  sargassum?: boolean;
  /** Expedition 2: trash still in the water (null = none shown). While trash is shown, the animals' buttons step aside. */
  litter?: string[] | null;
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
    const key = `${s.stop}|${s.selected}|${s.shelterView}|${s.labels}|${s.labelsAlways}|${s.discovered?.join(',')}|${s.hint}|${s.sargassum}|${s.litter?.join(',') ?? '-'}|${s.spawning}|${s.lights}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const focused = (document.activeElement as HTMLElement | null)?.dataset?.organism;
    const ocean = isOceanStop(s.stop);
    const deep = isDeepZone(s.stop);
    const label = ocean
      ? (oceanStops.find((o) => o.id === s.stop)?.arrival ?? '')
      : deep
        ? (zoneById.get(s.stop as DeepZone)?.arrival ?? '')
        : (habitatById.get(s.stop as HabitatId)?.accessibleDescription ?? '');
    const here: { id: string; title: string }[] = ocean ? oceanAnimalsAt(s.stop as OceanStop) : deep ? deepAnimalsAt(s.stop as DeepZone) : findablesAt(s.stop as HabitatId);
    const spots = ocean ? OCEAN_HOTSPOTS : deep ? DEEP_HOTSPOTS : HOTSPOTS;
    // While a card is open, zoom in on that organism so the class can see the detail it asks about.
    const focus = s.selected && !s.shelterView ? spots[s.selected] : undefined;
    const zoomed = !!focus && here.some((o) => o.id === s.selected);
    const zoom = zoomed && focus ? ` style="transform: scale(2); transform-origin: ${focus.x}% ${focus.y}%"` : '';
    this.root.innerHTML = `<div class="static-frame">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label}"${zoom}>
        ${ocean ? oceanIllustration(s.stop as OceanStop, !!s.spawning) : deep ? deepIllustration(s.stop as DeepZone, s.lights !== false) : illustration(s.stop as HabitatId, s.shelterView)}
        ${s.sargassum && !ocean && !deep ? sargassumOverlay(s.stop as HabitatId) : ''}
      </svg>
      ${s.shelterView || zoomed || s.litter ? '' : here
        .map((o) => {
          const p = spots[o.id];
          const done = !!s.discovered?.includes(o.id);
          const cls = `hotspot${s.labels ? '' : ' is-blank'}${s.labels && s.labelsAlways ? ' is-labelled' : ''}${done ? ' is-done' : ''}${o.id === s.selected ? ' is-selected' : ''}${o.id === s.hint ? ' is-hint' : ''}`;
          // A dot on the animal; its name appears beside it on hover, focus or selection.
          const name = s.labels ? `<span class="hotspot-label">${o.title}${done ? ' ✓' : ''}</span>` : '';
          return `<button class="${cls}" style="left:${p.x}%;top:${p.y}%" data-organism="${o.id}" aria-label="${o.title}" aria-pressed="${o.id === s.selected}"><span class="hotspot-dot" aria-hidden="true"></span>${name}</button>`;
        })
        .join('')}
      ${zoomed ? '' : (s.litter ?? [])
        .filter((id) => LITTER_STOP[id] === s.stop)
        .map((id) => {
          const p = LITTER_SPOTS[id];
          return `<button class="litter-spot" style="left:${p.x}%;top:${p.y}%" data-organism="${id}" aria-label="Trash: ${p.kind === 'line' ? 'fishing line' : p.kind === 'net' ? 'fishing net' : `plastic ${p.kind}`}">${LITTER_ICONS[p.kind]}</button>`;
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
