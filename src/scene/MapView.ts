/**
 * Simplified map of the tropical Atlantic for Expedition 2: the sargassum belt,
 * the currents that carry it to Belize, and the "what feeds it?" model. Drawn
 * by hand from rough coastline points (equirectangular), so it stays small,
 * works without 3D, and needs no third-party map imagery.
 */
import { rng } from './util.ts';

const W = 1600;
const H = 900;
// Framed on the Caribbean and the tropical Atlantic, from Belize to West Africa.
const LON0 = -98;
const LAT0 = 31.5;
const K = W / 93; // px per degree

const px = (lon: number, lat: number) => [(lon - LON0) * K, (LAT0 - lat) * K] as const;
const path = (pts: [number, number][], close = true) =>
  pts.map(([lon, lat], i) => `${i ? 'L' : 'M'}${px(lon, lat)[0].toFixed(1)} ${px(lon, lat)[1].toFixed(1)}`).join(' ') + (close ? 'Z' : '');

// Rough coastlines (lon, lat). Simplified, not to scale.
const AMERICAS: [number, number][] = [
  [-100, 40.5], [-74, 40.5], [-74, 40], [-75.5, 38.5], [-76, 37], [-75.5, 35.5], [-77.5, 34.5], [-79, 33.5], [-81, 31.5], [-81.3, 30],
  [-80.5, 28], [-80, 26.5], [-80.4, 25.2], [-81.2, 25.2], [-81.8, 26.5], [-82.7, 28], [-83.5, 29.7], [-85, 29.7], [-86.5, 30.4], [-88.5, 30.4],
  [-89.5, 29.2], [-90.5, 29.1], [-93.5, 29.7], [-95, 29.3], [-97.2, 27.5], [-97.4, 25.5], [-97.8, 22.5], [-97.2, 20.5], [-96.2, 19.2], [-94.8, 18.5],
  [-92.5, 18.6], [-91, 18.8], [-90.5, 20.5], [-90.3, 21.2], [-88.5, 21.5], [-87, 21.5], [-87.5, 20.5], [-87.8, 19], [-88.2, 18.3], [-88.3, 17.3],
  [-88.6, 16.2], [-88.9, 15.8], [-87.5, 15.8], [-86, 15.9], [-84, 15.5], [-83.2, 15], [-83.5, 12.5], [-83.8, 11], [-82.5, 9.5], [-81, 8.8],
  [-79.5, 9.5], [-77.5, 8.5], [-76, 9.5], [-75.5, 10.5], [-74.5, 11], [-72.5, 11.8], [-71.5, 12.4], [-70.5, 11.5], [-68.5, 10.5], [-66, 10.5],
  [-64, 10.6], [-62, 10.6], [-61, 9.8], [-60, 8.5], [-58.5, 7], [-57, 6], [-54, 5.8], [-52, 5], [-51, 4], [-50, 1.8], [-49.5, 0], [-48, -1],
  [-44.5, -2.5], [-41, -3], [-38.5, -3.8], [-35.2, -5.5], [-35, -9], [-37, -12], [-38.5, -13], [-39, -17], [-40, -20], [-41, -22], [-44, -23],
  [-48, -26], [-48.5, -27.5], [-71, -27.5], [-71, -18], [-75, -14], [-81, -5], [-80, 0], [-79, 2], [-77.5, 6], [-78, 7.5], [-80, 7.5], [-83, 8.3],
  [-85.7, 10], [-86, 11.5], [-87.5, 13], [-91.5, 14], [-94.5, 16], [-96.5, 15.7], [-100, 17],
];
const CUBA: [number, number][] = [
  [-85, 21.8], [-83, 23], [-81, 23.2], [-79, 23], [-77, 22], [-75.5, 20.7], [-74.2, 20.2], [-75.5, 19.9], [-77.7, 19.9], [-78.5, 21.5], [-81, 22], [-83, 21.9], [-84.9, 21.4],
];
const HISPANIOLA: [number, number][] = [[-74.4, 19.8], [-72.5, 19.9], [-70, 19.7], [-68.4, 18.6], [-70, 18.2], [-71.5, 17.6], [-72.8, 18.1], [-74.4, 18.4]];
const IBERIA: [number, number][] = [[-9, 40.5], [-9.4, 39], [-8.9, 37], [-6, 36.2], [-5.3, 36], [-2, 36.7], [0, 38.7], [0.5, 40.5]];
const AFRICA: [number, number][] = [
  [20, 32.5], [15, 32], [11, 33.5], [10, 36.8], [5, 36.8], [0, 35.8], [-2, 35.1], [-5.6, 35.8], [-6, 35.5], [-7.5, 33.6], [-9.6, 30.4], [-11.5, 28],
  [-13, 27.5], [-14.5, 26], [-16, 24], [-17, 21], [-16.5, 19.5], [-16.2, 17], [-17.2, 14.7], [-16.8, 13], [-16.7, 12.3], [-15, 11], [-13.5, 9.5],
  [-13, 8.5], [-11.5, 6.9], [-9.5, 5.3], [-7.5, 4.4], [-5, 5.1], [-2, 4.8], [1, 5.9], [3, 6.4], [5, 5.6], [6.5, 4.3], [8.5, 4.5], [9.6, 3.5],
  [9.6, 1], [9.3, -1], [11, -3.5], [12, -5], [12.3, -6.2], [13.2, -9], [13.5, -12], [12, -15], [11.8, -17], [14, -22], [14.5, -25], [15.3, -27.5], [20, -27.5],
];
const SMALL_ISLANDS: [number, number, number, number][] = [
  [-77.3, 18.1, 1.2, 0.35], [-66.4, 18.2, 0.8, 0.25], [-77.5, 24.5, 0.5, 0.9], [-76, 23.6, 0.4, 0.6], [-78, 26.6, 0.6, 0.3],
  [-61.5, 16.2, 0.25, 0.25], [-61.3, 15.4, 0.2, 0.25], [-61, 14.6, 0.2, 0.25], [-61, 13.9, 0.2, 0.25], [-61.2, 13.2, 0.2, 0.2], [-61.7, 12.1, 0.2, 0.2], [-61.3, 10.6, 0.5, 0.35],
];

// The belt runs from off West Africa across the Atlantic into the Caribbean,
// toward Belize, with a branch into the Gulf of Mexico.
const BELT_MAIN: [number, number][] = [[-18, 7.5], [-28, 8.5], [-38, 9.5], [-48, 10.5], [-56, 12], [-61, 13.5], [-68, 15], [-76, 16], [-83, 17], [-87.4, 17.6]];
const BELT_GULF: [number, number][] = [[-83, 17.5], [-85.5, 21], [-87, 24], [-90, 25.6]];
const BELT_EAST_ONLY: [number, number][] = BELT_MAIN.slice(0, 4);

const CURRENTS: { pts: [number, number][]; label?: [number, number, string] }[] = [
  { pts: [[-20, 14.5], [-35, 15], [-52, 15.5]], label: [-36, 17.2, 'North Equatorial Current'] },
  { pts: [[-30, 1], [-42, 2], [-50, 5], [-57, 9]] },
  { pts: [[-63, 13], [-72, 13.5], [-80, 15.2], [-85, 18]] },
  { pts: [[-85.8, 20], [-86.2, 23.5], [-85, 25.4], [-82.5, 24.3], [-80, 25.8], [-79.7, 29]] },
];

export interface MapState {
  /** 0–1: how much sargassum to draw (relative to the 2025 record). */
  amount: number;
  /** Whether currents carry the belt all the way to Belize. */
  reach: boolean;
  showCurrents: boolean;
  nutrients: boolean;
  warm: boolean;
  caption: string;
  /** Short label in the corner, e.g. the year. */
  badge: string;
}

function clumps(pts: [number, number][], count: number, spread: number, seed: number) {
  const r = rng(seed);
  // Sample points along the polyline.
  const segs = pts.slice(1).map((p, i) => [pts[i], p] as const);
  const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
  const total = lens.reduce((x, y) => x + y, 0);
  let out = '';
  for (let i = 0; i < count; i++) {
    let d = r() * total;
    let k = 0;
    while (k < lens.length - 1 && d > lens[k]) d -= lens[k++];
    const t = d / lens[k];
    const [a, b] = segs[k];
    const lon = a[0] + (b[0] - a[0]) * t + (r() - 0.5) * spread;
    const lat = a[1] + (b[1] - a[1]) * t + (r() - 0.5) * spread * 0.6;
    const [x, y] = px(lon, lat);
    const rad = 3 + r() * 6;
    out += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(rad * 1.6).toFixed(1)}" ry="${rad.toFixed(1)}" fill="${r() > 0.5 ? '#8a6a24' : '#b08a34'}" opacity="0.85"/>`;
  }
  return out;
}

export class MapView {
  readonly root: HTMLElement;
  private last = '';

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'map-view';
    this.root.hidden = true;
    container.appendChild(this.root);
  }

  show(on: boolean) {
    this.root.hidden = !on;
  }

  render(s: MapState) {
    const key = JSON.stringify(s);
    if (key === this.last) return;
    this.last = key;
    const a = Math.max(0, Math.min(1, s.amount));
    const belt = s.reach ? BELT_MAIN : BELT_EAST_ONLY;
    const width = 6 + 64 * a;
    const [bx, by] = px(-88.3, 17.3);
    const label = (lon: number, lat: number, text: string, cls = 'map-label') => {
      const [x, y] = px(lon, lat);
      return `<text x="${x}" y="${y}" class="${cls}">${text}</text>`;
    };
    const plume = (lon: number, lat: number, rx: number, ry: number) => {
      const [x, y] = px(lon, lat);
      return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" class="map-plume"/>`;
    };
    this.root.innerHTML = `<div class="map-frame">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Simplified map of the tropical Atlantic Ocean from Africa to Belize. ${s.caption}">
        <defs>
          <linearGradient id="map-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d6d8c"/><stop offset="1" stop-color="#0f4d68"/></linearGradient>
          <linearGradient id="map-warm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a3c" stop-opacity="0"/><stop offset="0.3" stop-color="#ff9a3c" stop-opacity="0.32"/><stop offset="0.7" stop-color="#ff9a3c" stop-opacity="0.32"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></linearGradient>
          <marker id="map-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#cfefff"/></marker>
        </defs>
        <rect width="${W}" height="${H}" fill="url(#map-sea)"/>
        ${s.warm ? `<path d="${path([[-100, 28], [20, 28], [20, 0], [-100, 0]])}" fill="url(#map-warm)"/>${label(-31, 2.2, '☀ Warm, sunny water', 'map-label warm')}` : ''}
        <path d="${path(AMERICAS)}" class="map-land"/>
        <path d="${path(AFRICA)}" class="map-land"/>
        <path d="${path(IBERIA)}" class="map-land"/>
        <path d="${path(CUBA)}" class="map-land"/>
        <path d="${path(HISPANIOLA)}" class="map-land"/>
        ${SMALL_ISLANDS.map(([lon, lat, rx, ry]) => { const [x, y] = px(lon, lat); return `<ellipse cx="${x}" cy="${y}" rx="${rx * K}" ry="${ry * K}" class="map-land"/>`; }).join('')}
        ${s.nutrients ? `${plume(-47.5, 2.5, 70, 40)}${plume(-19, 12, 60, 70)}${label(-58, -3.5, 'Amazon River: nutrients', 'map-label nutrient')}${label(-36, 23.5, 'Dust and nutrients', 'map-label nutrient')}${label(-36, 21.8, 'from Africa', 'map-label nutrient')}` : ''}
        <path d="${path(belt, false)}" class="map-belt" style="stroke-width:${width.toFixed(1)}px;opacity:${(0.25 + 0.55 * a).toFixed(2)}"/>
        ${s.reach && a > 0.2 ? `<path d="${path(BELT_GULF, false)}" class="map-belt" style="stroke-width:${(width * 0.55).toFixed(1)}px;opacity:${(0.2 + 0.45 * a).toFixed(2)}"/>` : ''}
        ${clumps(belt, Math.round(180 * a), 2 + 4 * a, 11)}
        ${s.reach && a > 0.2 ? clumps(BELT_GULF, Math.round(50 * a), 2, 23) : ''}
        ${s.showCurrents ? CURRENTS.map((c) => `<path d="${path(c.pts, false)}" class="map-current" marker-end="url(#map-arrow)"/>${c.label ? label(c.label[0], c.label[1], c.label[2], 'map-label current') : ''}`).join('') : ''}
        <circle cx="${bx}" cy="${by}" r="16" class="map-belize-ring"/>
        <path d="M${bx} ${by - 11} l3.2 6.6 7.3 1 -5.3 5.1 1.3 7.2 -6.5 -3.4 -6.5 3.4 1.3 -7.2 -5.3 -5.1 7.3 -1Z" class="map-belize"/>
        ${label(-96.5, 15.2, 'Belize')}
        ${label(-52, 26, 'Atlantic Ocean', 'map-label ocean')}
        ${label(-81, 12.2, 'Caribbean Sea', 'map-label ocean')}
        ${label(-93.5, 24.4, 'Gulf of Mexico', 'map-label ocean small')}
        ${label(-14.5, 19, 'Africa', 'map-label land')}
        ${label(-66, -8, 'South America', 'map-label land')}
        <rect x="24" y="24" width="${16 + s.badge.length * 22}" height="62" rx="12" class="map-badge"/>
        <text x="40" y="68" class="map-badge-text">${s.badge}</text>
        <rect x="${W - 1010}" y="${H - 54}" width="996" height="42" rx="8" fill="rgba(0,0,0,0.55)"/>
        <text x="${W - 24}" y="${H - 24}" class="map-credit" text-anchor="end">Simplified drawing based on satellite studies (Wang et al., Science 2019; AP 2025). Not to scale.</text>
      </svg>
    </div>`;
  }

  dispose() {
    this.root.remove();
  }
}
