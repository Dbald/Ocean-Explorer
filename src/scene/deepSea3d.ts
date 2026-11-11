/**
 * Expedition 4's dive: a column of water straight down from the open-water
 * stop of Expedition 3, through the sunlight, twilight and midnight zones.
 * The scene is not to scale: the zones are tens of meters apart here, not
 * hundreds. ReefScene darkens the water and lights with depth; this module
 * builds the animals, their own light (bioluminescence), marine snow, and the
 * phytoplankton of the sunlight zone. Built hidden; shown only in Expedition 4.
 */
import * as THREE from 'three';
import { contourFin, outlineFin, profiledBody, type Profile } from './fishkit.ts';
import { eyes, finMat, std } from './organisms.ts';
import { countershade, grain, paint } from './skins.ts';
import { range, rng } from './util.ts';

export type DeepZoneId = 'sunlight' | 'twilight' | 'midnight';

/** The column's centre, and the height of each zone's stop. */
export const DEEP = {
  x: 0,
  z: 44,
  y: { sunlight: 2.2, twilight: -32, midnight: -72 } as Record<DeepZoneId, number>,
};

export const DEEP_VIEWS: Record<DeepZoneId, { position: THREE.Vector3; target: THREE.Vector3 }> = {
  // The same place as Expedition 3's open-water stop, so the dive starts where that lesson was.
  sunlight: { position: new THREE.Vector3(0, 2.3, 30), target: new THREE.Vector3(0, 2.2, 44) },
  twilight: { position: new THREE.Vector3(0, -31.6, 33.5), target: new THREE.Vector3(0, -32, 44) },
  midnight: { position: new THREE.Vector3(0, -71.6, 34), target: new THREE.Vector3(0, -72, 44) },
};

/**
 * How much sunlight reaches a height in the column: 1 at the surface, about a
 * fifth in the twilight zone, none in the midnight zone.
 */
export function daylightAt(y: number) {
  const k = Math.exp(Math.min(0, y - 2) / 21);
  return THREE.MathUtils.clamp((k - 0.03) / 0.97, 0, 1);
}

// ── Light that animals make ────────────────────────────────────────────────

const glowSprite = () =>
  paint('glow-dot', 64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

/** Soft glowing dots that add light (they never darken what is behind them). */
function glowPoints(positions: number[], color: THREE.ColorRepresentation, size: number, vertexColors = false) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (vertexColors) {
    const c = new THREE.Color(color);
    const cols: number[] = [];
    for (let i = 0; i < positions.length / 3; i++) cols.push(c.r, c.g, c.b);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  }
  const mat = new THREE.PointsMaterial({
    map: glowSprite(),
    color: vertexColors ? '#ffffff' : color,
    vertexColors,
    size,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    // Animal light carries through the dark water: the haze doesn't swallow it.
    fog: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

// ── Lanternfish ────────────────────────────────────────────────────────────

const LANTERN: Profile = {
  top: [[0, 0.03], [0.2, 0.05], [0.55, 0.1], [0.85, 0.09], [1, 0.03]],
  bottom: [[0, -0.03], [0.2, -0.05], [0.55, -0.09], [0.85, -0.08], [1, -0.03]],
  width: [[0, 0.015], [0.5, 0.055], [0.9, 0.05], [1, 0.015]],
};

const lanternSkin = () =>
  paint('lanternfish', 256, 64, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#16222e'],
      [0.4, '#3b5262'],
      [0.6, '#9fb3bf'],
      [1, '#d7e1e6'],
    ]);
    grain(ctx, w, h, 41, 0.15);
  });

interface Swimmer {
  group: THREE.Group;
  tail: THREE.Object3D;
}

function buildLanternfish(L: number, mat: THREE.Material, fin: THREE.Material): Swimmer {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(profiledBody(L, LANTERN, { stations: 24, radial: 14 }), mat));
  // A huge eye, for the dim light.
  eyes(g, L * 0.36, L * 0.015, L * 0.045, L * 0.045, '#33424d');
  const tail = new THREE.Group();
  tail.add(new THREE.Mesh(outlineFin(L, [[0.01, 0.02], [-0.1, 0.1], [-0.08, 0], [-0.1, -0.1], [0.01, -0.02]], 'back'), fin));
  tail.position.x = -L * 0.5;
  g.add(tail);
  // Rows of light organs: along the belly, and a second row low on each side.
  const dots: number[] = [];
  for (let t = 0.12; t < 0.86; t += 0.075) {
    const x = (t - 0.5) * L;
    dots.push(x, -0.075 * L, 0);
    for (const s of [1, -1]) dots.push(x, -0.035 * L, s * 0.045 * L);
  }
  g.add(glowPoints(dots, '#7fd8ff', L * 0.14));
  return { group: g, tail };
}

// ── Hatchetfish ────────────────────────────────────────────────────────────

/** Tall and thin as a blade, with a deep belly like the head of a hatchet. */
const HATCHET: Profile = {
  top: [[0, 0.03], [0.2, 0.06], [0.5, 0.17], [0.75, 0.2], [0.93, 0.13], [1, 0.05]],
  bottom: [[0, -0.03], [0.2, -0.1], [0.42, -0.33], [0.68, -0.34], [0.88, -0.2], [1, -0.06]],
  width: [[0, 0.012], [0.5, 0.045], [0.85, 0.04], [1, 0.012]],
};

const hatchetSkin = () =>
  paint('hatchetfish', 256, 128, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#2a3440'],
      [0.25, '#8d9ba6'],
      [0.6, '#dfe7ec'],
      [1, '#f3f6f8'],
    ]);
    grain(ctx, w, h, 43, 0.1);
  });

function buildHatchetfish(L: number, mat: THREE.Material, fin: THREE.Material): Swimmer {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(profiledBody(L, HATCHET, { stations: 28, radial: 14 }), mat));
  eyes(g, L * 0.36, L * 0.1, L * 0.035, L * 0.05, '#2c3a44');
  g.add(new THREE.Mesh(contourFin(L, HATCHET, 0.45, 0.62, [[0, 0.02], [0.4, 0.07], [1, 0]], 'top'), fin));
  const tail = new THREE.Group();
  tail.add(new THREE.Mesh(outlineFin(L, [[0.01, 0.03], [-0.1, 0.1], [-0.07, 0], [-0.1, -0.1], [0.01, -0.03]], 'back'), fin));
  tail.position.x = -L * 0.5;
  g.add(tail);
  // Light organs along the bottom edge of the belly: they glow like the faint light from above.
  const dots: number[] = [];
  for (let t = 0.3; t < 0.9; t += 0.045) {
    const y = t < 0.42 ? -0.1 - ((t - 0.2) / 0.22) * 0.23 : t < 0.68 ? -0.33 : -0.33 + ((t - 0.68) / 0.2) * 0.13;
    for (const s of [1, -1]) dots.push((t - 0.5) * L, y * L * 0.93, s * 0.025 * L);
  }
  g.add(glowPoints(dots, '#6fc8ff', L * 0.14));
  return { group: g, tail };
}

// ── Anglerfish ─────────────────────────────────────────────────────────────

const ANGLER: Profile = {
  top: [[0, 0.03], [0.2, 0.12], [0.5, 0.3], [0.75, 0.33], [0.93, 0.24], [1, 0.12]],
  bottom: [[0, -0.03], [0.2, -0.12], [0.5, -0.28], [0.75, -0.3], [0.93, -0.22], [1, -0.16]],
  width: [[0, 0.02], [0.3, 0.15], [0.65, 0.26], [0.9, 0.22], [1, 0.15]],
};

const anglerSkin = () =>
  paint('anglerfish', 256, 128, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#2b1f1d'],
      [0.6, '#3a2a27'],
      [1, '#4a3632'],
    ]);
    grain(ctx, w, h, 47, 0.35, false);
  });

interface AnglerRig {
  group: THREE.Group;
  lure: THREE.Mesh;
  lureGlow: THREE.Points;
}

function buildAnglerfish(L: number): AnglerRig {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(profiledBody(L, ANGLER, { stations: 36, radial: 24 }), std('#ffffff', { map: anglerSkin(), roughness: 0.85 })));
  // A huge open mouth at the front, lined with needle teeth.
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), std('#0b0707', { roughness: 1 }));
  mouth.scale.set(0.07 * L, 0.15 * L, 0.17 * L);
  mouth.position.set(0.47 * L, -0.06 * L, 0);
  g.add(mouth);
  const toothMat = std('#e9e2d4', { roughness: 0.4 });
  const toothGeo = new THREE.ConeGeometry(0.009 * L, 0.07 * L, 5);
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI * 0.42 + (i / 13) * Math.PI * 0.84;
    for (const jaw of [1, -1]) {
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(0.52 * L, -0.06 * L + jaw * 0.13 * L * Math.cos(a * 0.6), Math.sin(a) * 0.16 * L);
      // Upper teeth point down, lower teeth point up, all a little inward.
      tooth.rotation.set(0, 0, jaw > 0 ? Math.PI : 0);
      tooth.scale.setScalar(0.7 + ((i * 7) % 5) * 0.12);
      g.add(tooth);
    }
  }
  eyes(g, 0.36 * L, 0.16 * L, 0.13 * L, 0.025 * L, '#c7c3a0');
  // The fishing rod: a thin spine curving up and forward from the head.
  const rod = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.3 * L, 0.3 * L, 0), new THREE.Vector3(0.55 * L, 0.72 * L, 0), new THREE.Vector3(0.78 * L, 0.42 * L, 0));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(rod, 20, 0.008 * L, 6, false), std('#4a3632', { roughness: 0.8 })));
  // The lure: a bulb of glowing bacteria.
  const lure = new THREE.Mesh(new THREE.SphereGeometry(0.035 * L, 16, 12), new THREE.MeshStandardMaterial({ color: '#b8fff6', emissive: '#7ff7ff', emissiveIntensity: 2.2 }));
  lure.position.set(0.79 * L, 0.39 * L, 0);
  g.add(lure);
  const lureGlow = glowPoints([0.79 * L, 0.39 * L, 0], '#8ffcff', 1.1 * L);
  g.add(lureGlow);
  const fin = finMat('#3a2a27');
  const tail = new THREE.Mesh(outlineFin(L, [[0.01, 0.04], [-0.12, 0.12], [-0.14, 0], [-0.12, -0.12], [0.01, -0.04]], 'back'), fin);
  tail.position.x = -L * 0.5;
  g.add(tail);
  for (const s of [1, -1]) {
    const pec = new THREE.Mesh(outlineFin(L, [[0, 0], [-0.04, 0.06], [-0.1, 0.07], [-0.08, 0], [-0.02, -0.02]], 'back'), fin);
    pec.position.set(0.05 * L, -0.08 * L, s * 0.24 * L);
    pec.rotation.y = s * 0.6;
    g.add(pec);
  }
  return { group: g, lure, lureGlow };
}

// ── Gulper eel ─────────────────────────────────────────────────────────────

/** A whip of a body with an enormous pouch of a mouth at the front. */
const GULPER: Profile = {
  top: [[0, 0.002], [0.5, 0.008], [0.72, 0.012], [0.8, 0.025], [0.9, 0.045], [0.97, 0.04], [1, 0.008]],
  bottom: [[0, -0.002], [0.5, -0.008], [0.72, -0.014], [0.8, -0.05], [0.88, -0.1], [0.96, -0.07], [1, -0.01]],
  width: [[0, 0.002], [0.5, 0.007], [0.75, 0.012], [0.85, 0.035], [0.93, 0.045], [1, 0.01]],
};

interface EelRig {
  group: THREE.Group;
  body: THREE.Mesh;
  base: Float32Array;
  tailGlow: THREE.Points;
  L: number;
}

function buildGulperEel(L: number): EelRig {
  const g = new THREE.Group();
  const geo = profiledBody(L, GULPER, { stations: 90, radial: 12 });
  const body = new THREE.Mesh(geo, std('#3a2c36', { roughness: 0.45 }));
  body.frustumCulled = false;
  g.add(body);
  eyes(g, 0.47 * L, 0.03 * L, 0.012 * L, 0.006 * L, '#2a2a30');
  // The glowing tip of the tail, thought to work like a lure.
  const tailGlow = glowPoints([-0.5 * L, 0, 0], '#ff5ea8', 0.2 * L);
  g.add(tailGlow);
  return { group: g, body, base: Float32Array.from(geo.attributes.position.array), tailGlow, L };
}

/** Sideways S-wave along the eel, strongest at the tail. */
function eelWave(L: number, x: number, t: number) {
  const s = 0.5 - x / L; // 0 at the head, 1 at the tail
  return Math.sin((x / L) * 9 + t * 2.4) * 0.07 * L * s * s;
}

// ── Atolla jelly ───────────────────────────────────────────────────────────

interface JellyRig {
  group: THREE.Group;
  bell: THREE.Mesh;
  ring: THREE.Points;
}

function buildAtolla(R: number): JellyRig {
  const g = new THREE.Group();
  // A deep red bell (red looks black in the deep), grooved like a crown.
  const geo = new THREE.SphereGeometry(R, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i));
    const k = 1 + Math.sin(a * 20) * 0.03;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * 0.45, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  const bell = new THREE.Mesh(geo, std('#7a1220', { roughness: 0.35, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
  g.add(bell);
  // Short tentacles round the rim, and one long trailing one.
  const tent = std('#8a2a32', { roughness: 0.5 });
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const len = R * (0.35 + (i % 3) * 0.12);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.008, R * 0.003, len, 4), tent);
    m.position.set(Math.cos(a) * R * 1.02, -len / 2 + R * 0.02, Math.sin(a) * R * 1.02);
    m.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    g.add(m);
  }
  const long = new THREE.CatmullRomCurve3([new THREE.Vector3(R * 0.9, 0, 0), new THREE.Vector3(R * 1.3, -R * 2, R * 0.3), new THREE.Vector3(R * 0.8, -R * 4.5, -R * 0.2), new THREE.Vector3(R * 1.4, -R * 7, R * 0.2)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(long, 40, R * 0.014, 4, false), tent));
  // Its alarm: a ring of blue lights round the bell that flash in a spinning wheel.
  const dots: number[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    // On the rim, just outside the bell, so nothing hides them.
    dots.push(Math.cos(a) * R * 1.06, R * 0.04, Math.sin(a) * R * 1.06);
  }
  const ring = glowPoints(dots, '#4fb8ff', R * 0.9, true);
  (ring.material as THREE.PointsMaterial).depthTest = false;
  ring.renderOrder = 5;
  g.add(ring);
  return { group: g, bell, ring };
}

// ── Drifting things: phytoplankton, marine snow, twinkles ──────────────────

function speckCloud(count: number, seed: number, centre: THREE.Vector3, radii: [number, number, number], color: string, size: number, opacity: number) {
  const r = rng(seed);
  const pos: number[] = [];
  for (let i = 0; i < count; i++) {
    // Denser towards the middle.
    const u = Math.pow(r(), 0.7);
    const a = r() * Math.PI * 2;
    const b = Math.acos(2 * r() - 1);
    pos.push(centre.x + Math.sin(b) * Math.cos(a) * radii[0] * u, centre.y + Math.cos(b) * radii[1] * u, centre.z + Math.sin(b) * Math.sin(a) * radii[2] * u);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: glowSprite(), sizeAttenuation: true, transparent: true, opacity, depthWrite: false }));
  pts.frustumCulled = false;
  return pts;
}

/** Marine snow fills the column below the sunlight zone and drifts slowly down. */
const SNOW_BOX = { x: 14, z0: 32, z1: 58, top: -16, bottom: -82 };

export interface DeepTappable {
  id: string;
  main: THREE.Object3D;
  others?: THREE.Object3D[];
  tap?: number;
}

export class DeepSea {
  readonly group = new THREE.Group();
  readonly tappables: DeepTappable[] = [];
  private lanterns: Swimmer[] = [];
  private lanternPhase: number[] = [];
  private lanternAnchor = new THREE.Object3D();
  private hatchets: Swimmer[] = [];
  private angler: AnglerRig;
  private eel: EelRig;
  private atolla: JellyRig;
  private snow: THREE.Points;
  private twinkles: THREE.Points;
  private time = 0;

  constructor(low: boolean) {
    this.group.name = 'deep-sea';
    this.group.visible = false;
    const tw = DEEP.y.twilight;
    const mid = DEEP.y.midnight;

    // Sunlight zone: a green haze of phytoplankton near the surface.
    const phyto = new THREE.Object3D();
    phyto.position.set(1.8, 4.4, 38);
    this.group.add(phyto, speckCloud(low ? 700 : 1500, 61, phyto.position, [2.6, 1.1, 1.8], '#b6e27a', 0.09, 0.9));
    this.tappables.push({ id: 'phytoplankton-cloud', main: phyto, tap: 1.6 });

    // Twilight zone: a school of lanternfish circling, and hatchetfish hanging still.
    const lmat = std('#ffffff', { map: lanternSkin(), roughness: 0.35, metalness: 0.35 });
    const lfin = finMat('#5d7484');
    const nL = low ? 14 : 24;
    for (let i = 0; i < nL; i++) {
      const f = buildLanternfish(0.42, lmat, lfin);
      this.lanterns.push(f);
      this.lanternPhase.push(i * 2.399);
      this.group.add(f.group);
    }
    this.lanternAnchor.position.set(1.2, tw + 0.9, 44);
    this.group.add(this.lanternAnchor);
    this.tappables.push({ id: 'lanternfish', main: this.lanternAnchor, others: this.lanterns.map((l) => l.group) });

    const hmat = std('#ffffff', { map: hatchetSkin(), roughness: 0.22, metalness: 0.6 });
    const hfin = finMat('#c9d4da');
    const hr = rng(71);
    for (let i = 0; i < 4; i++) {
      const f = buildHatchetfish(0.5, hmat, hfin);
      f.group.position.set(range(hr, -4.2, -1.8) + i * 0.4, tw - 0.6 + range(hr, -0.8, 0.9), range(hr, 40.5, 45));
      f.group.rotation.y = range(hr, -0.6, 0.6) + (i % 2 ? Math.PI : 0);
      this.hatchets.push(f);
      this.group.add(f.group);
    }
    this.tappables.push({ id: 'hatchetfish', main: this.hatchets[0].group, others: this.hatchets.slice(1).map((h) => h.group), tap: 0.5 });

    // Midnight zone: an anglerfish with its lure, a gulper eel, an Atolla jelly.
    this.angler = buildAnglerfish(1.0);
    this.angler.group.position.set(1.9, mid - 0.3, 40.8);
    this.angler.group.rotation.y = 1.05;
    this.group.add(this.angler.group);
    this.tappables.push({ id: 'anglerfish', main: this.angler.group, tap: 0.8 });

    this.eel = buildGulperEel(3.4);
    this.eel.group.position.set(-2.2, mid + 0.9, 41.5);
    this.eel.group.rotation.y = Math.PI + 0.25;
    this.group.add(this.eel.group);
    this.tappables.push({ id: 'gulper-eel', main: this.eel.group, tap: 0.9 });

    this.atolla = buildAtolla(0.45);
    this.atolla.group.position.set(-1.4, mid - 1.1, 40.2);
    this.group.add(this.atolla.group);
    this.tappables.push({ id: 'atolla-jelly', main: this.atolla.group, tap: 0.7 });

    // Marine snow everywhere below the sunlight zone, with a thicker flurry to tap in the midnight zone.
    const sr = rng(83);
    const snowPos: number[] = [];
    for (let i = 0; i < (low ? 1400 : 3200); i++) snowPos.push(range(sr, -SNOW_BOX.x, SNOW_BOX.x), range(sr, SNOW_BOX.bottom, SNOW_BOX.top), range(sr, SNOW_BOX.z0, SNOW_BOX.z1));
    const flurry = new THREE.Vector3(3.6, mid + 1.6, 41.5);
    for (let i = 0; i < (low ? 120 : 260); i++) snowPos.push(flurry.x + range(sr, -0.9, 0.9), flurry.y + range(sr, -1.2, 1.2), flurry.z + range(sr, -0.8, 0.8));
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(snowPos, 3));
    this.snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: '#d9e3e8', size: 0.07, map: glowSprite(), sizeAttenuation: true, transparent: true, opacity: 0.75, depthWrite: false }));
    this.snow.frustumCulled = false;
    this.group.add(this.snow);
    const snowAnchor = new THREE.Object3D();
    snowAnchor.position.copy(flurry);
    this.group.add(snowAnchor);
    this.tappables.push({ id: 'marine-snow', main: snowAnchor, tap: 1.0 });

    // Distant flashes of other glowing animals.
    const tr = rng(97);
    const tpos: number[] = [];
    for (let i = 0; i < (low ? 60 : 140); i++) tpos.push(range(tr, -12, 12), range(tr, -80, -26), range(tr, 43, 60));
    this.twinkles = glowPoints(tpos, '#5fc4ff', 0.45, true);
    this.group.add(this.twinkles);
  }

  setVisible(on: boolean) {
    this.group.visible = on;
  }

  /**
   * How well lit the water is (daylight or our lamp), 0–1. Marine snow makes
   * no light of its own, so in the dark with our lights off it all but vanishes.
   */
  setLit(f: number) {
    (this.snow.material as THREE.PointsMaterial).opacity = 0.05 + 0.7 * f;
  }

  /** dt: real seconds; t: ambient time (stops when motion is off). */
  update(t: number, dt: number, ambient: boolean) {
    this.time = t;
    const mid = DEEP.y.midnight;

    // Lanternfish circle in a loose school; each points along its path.
    const c = this.lanternAnchor.position;
    this.lanterns.forEach((f, i) => {
      const ph = this.lanternPhase[i];
      const a = t * 0.35 + ph;
      const rx = 2.0 + (i % 5) * 0.35;
      const rz = 1.4 + (i % 3) * 0.3;
      f.group.position.set(c.x + Math.cos(a) * rx, c.y - 0.9 + Math.sin(ph * 3) * 0.9 + Math.sin(t * 0.8 + ph) * 0.12, c.z + Math.sin(a) * rz);
      f.group.rotation.y = Math.atan2(-Math.cos(a) * rz, -Math.sin(a) * rx);
      f.tail.rotation.y = Math.sin(t * 9 + ph) * 0.4;
    });

    // Hatchetfish hang almost still, with tiny fin beats.
    this.hatchets.forEach((f, i) => {
      f.group.position.y += Math.sin(t * 0.6 + i) * 0.0008;
      f.tail.rotation.y = Math.sin(t * 3 + i) * 0.2;
    });

    // The anglerfish hovers; its lure sways and pulses.
    const ag = this.angler.group;
    ag.position.y = mid - 0.3 + Math.sin(t * 0.4) * 0.08;
    ag.rotation.y = 1.05 + Math.sin(t * 0.2) * 0.12;
    const pulse = 0.85 + Math.sin(this.time * 2.1) * 0.15;
    (this.angler.lureGlow.material as THREE.PointsMaterial).size = 1.1 * pulse;

    // The gulper eel ripples along its length; the glow rides on its tail tip.
    if (ambient) {
      const { body, base, L } = this.eel;
      const pos = body.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        pos.setZ(i, base[i * 3 + 2] + eelWave(L, x, t));
      }
      pos.needsUpdate = true;
      this.eel.tailGlow.position.z = eelWave(L, -0.5 * L, t);
      this.eel.group.position.x = -2.2 + Math.sin(t * 0.12) * 0.4;
    }

    // The Atolla's alarm: a wheel of blue light chasing round its bell.
    const ring = this.atolla.ring.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < ring.count; i++) {
      const k = Math.max(0, Math.cos((i / ring.count) * Math.PI * 2 - t * 3.2));
      const v = 0.3 + Math.pow(k, 4) * 1.4;
      ring.setXYZ(i, 0.31 * v, 0.72 * v, v);
    }
    ring.needsUpdate = true;
    this.atolla.group.position.y = mid - 1.1 + Math.sin(t * 0.5) * 0.12;
    this.atolla.bell.scale.set(1 + Math.sin(t * 1.4) * 0.05, 1 - Math.sin(t * 1.4) * 0.08, 1 + Math.sin(t * 1.4) * 0.05);

    // Marine snow sinks slowly, wrapping round to the top of the column.
    if (ambient) {
      const sp = this.snow.geometry.attributes.position as THREE.BufferAttribute;
      const fall = dt * 0.12;
      for (let i = 0; i < sp.count; i++) {
        let y = sp.getY(i) - fall;
        if (y < SNOW_BOX.bottom) y += SNOW_BOX.top - SNOW_BOX.bottom;
        sp.setY(i, y);
      }
      sp.needsUpdate = true;
    }

    // Twinkles flash on and off at their own pace.
    const tc = this.twinkles.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < tc.count; i++) {
      const v = Math.pow(Math.max(0, Math.sin(t * (0.5 + (i % 7) * 0.13) + i * 1.7)), 12);
      tc.setXYZ(i, 0.35 * v, 0.75 * v, v);
    }
    tc.needsUpdate = true;
  }
}
