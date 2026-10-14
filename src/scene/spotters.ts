/**
 * Procedural models for the "spotter" animals: simple, readable shapes at
 * roughly realistic relative scale (1 unit ≈ 1 m), sized up slightly where a
 * real animal would be too small to see on a classroom board. Each builder
 * returns the model plus an optional per-frame animation.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { contourFin, outlineFin, profiledBody, type Profile } from './fishkit.ts';
import { eyes, finMat, finShape, std } from './organisms.ts';
import { blotches, countershade, grain, paint, scales } from './skins.ts';
import { range, rng } from './util.ts';

export interface SpotterModel {
  group: THREE.Group;
  /** Ambient motion; t is scene time in seconds. */
  animate?: (t: number) => void;
  /** Played when a child taps it (p goes 0 → 1 over about a second). */
  react?: (p: number) => void;
}

const tube = (points: THREE.Vector3[], radius: number, mat: THREE.Material, tapered = true) => {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 32, radius, 12, false);
  if (tapered) {
    // Taper toward the tip.
    const pos = geo.attributes.position;
    const center = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.floor(i / 13) / 32;
      p.fromBufferAttribute(pos, i);
      curve.getPointAt(Math.min(1, t), center);
      p.sub(center).multiplyScalar(1 - t * 0.85).add(center);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    geo.computeVertexNormals();
  }
  return new THREE.Mesh(geo, mat);
};

// ── Skins ────────────────────────────────────────────────────────────────────

const sharkSkin = () =>
  paint('nurse-shark', 1024, 256, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#7d6038'],
      [0.4, '#9c7b4c'],
      [0.7, '#b8986a'],
      [1, '#d9c39a'],
    ]);
    blotches(ctx, w, h, 7, 30, 14, 30, 'rgba(90,66,36,1)', 0.12, [0, 0, 1, 0.55]);
    grain(ctx, w, h, 9, 0.18);
  });

const lobsterSkin = () =>
  paint('lobster', 256, 256, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#7a3a20'],
      [1, '#a85a33'],
    ]);
    blotches(ctx, w, h, 3, 30, 10, 24, 'rgba(60,24,10,1)', 0.35);
    // Cream spots, like the ones on a real spiny lobster's tail.
    const r = rng(5);
    ctx.fillStyle = '#f2d99a';
    for (let i = 0; i < 26; i++) {
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 3 + r() * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, w, h, 7, 0.2);
  });

const morayLike = (key: string, base: string, dark: string, light: string, seed: number) =>
  paint(key, 512, 128, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, seed, 60, 6, 16, dark, 0.35);
    blotches(ctx, w, h, seed + 1, 40, 4, 10, light, 0.25);
    grain(ctx, w, h, seed + 2, 0.25);
  });

const tangSkin = () =>
  paint('blue-tang', 256, 128, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#1b3fae'],
      [0.6, '#2f63de'],
      [1, '#6d93f0'],
    ]);
    // Fine, wavy darker lines along the body.
    ctx.strokeStyle = 'rgba(12,30,110,0.55)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 12; i++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) ctx.lineTo(x, (i / 12) * h + Math.sin(x * 0.03 + i) * 1.2);
      ctx.stroke();
    }
    // The pale spine at the base of the tail.
    ctx.fillStyle = '#f4f0d0';
    ctx.beginPath();
    ctx.ellipse(0.1 * w, 0.5 * h, 0.035 * w, 0.06 * h, 0, 0, Math.PI * 2);
    ctx.fill();
  });

const sergeantSkin = () =>
  paint('sergeant-major', 256, 128, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#e6cf3f'],
      [0.3, '#ece27a'],
      [0.45, '#eef0e4'],
      [1, '#f7f8f2'],
    ]);
    // Five dark vertical bars.
    ctx.fillStyle = '#1b1d22';
    for (const x of [0.2, 0.34, 0.48, 0.62, 0.76]) {
      ctx.beginPath();
      ctx.moveTo((x - 0.03) * w, 0);
      ctx.lineTo((x + 0.03) * w, 0);
      ctx.lineTo((x + 0.022) * w, 0.9 * h);
      ctx.lineTo((x - 0.022) * w, 0.9 * h);
      ctx.fill();
    }
    scales(ctx, w, h, 8, '#000000', 0.12, 0.05, 0.85);
  });

const raySkin = () =>
  paint('eagle-ray', 512, 512, (ctx, w, h) => {
    // Seen from above: u runs tail to head, v across the wings.
    const g = ctx.createRadialGradient(w * 0.55, h / 2, 10, w * 0.5, h / 2, w * 0.6);
    g.addColorStop(0, '#273246');
    g.addColorStop(1, '#141a26');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // White spots and rings scattered over the back.
    const r = rng(41);
    for (let i = 0; i < 230; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 3 + r() * 6;
      if (r() < 0.3) {
        ctx.strokeStyle = 'rgba(240,244,248,0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, rad + 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(240,244,248,0.95)';
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

const cushionSkin = () =>
  paint('cushion-star', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d06c25';
    ctx.fillRect(0, 0, w, h);
    // A raised network of knobs, darker in the grooves between them.
    const r = rng(61);
    for (let i = 0; i < 60; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 5 + r() * 5;
      ctx.fillStyle = 'rgba(120,52,14,0.55)';
      ctx.beginPath();
      ctx.arc(x, y, rad + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2b061';
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, w, h, 63, 0.2);
  });

const cucumberSkin = () =>
  paint('sea-cucumber', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, 71, 40, 8, 20, 'rgba(40,26,14,1)', 0.4);
    const r = rng(73);
    ctx.fillStyle = '#b08a5c';
    for (let i = 0; i < 90; i++) {
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 1.5 + r() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

const stingraySkin = () =>
  paint('stingray', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8c846f';
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, 81, 50, 8, 22, 'rgba(70,64,52,1)', 0.25);
    blotches(ctx, w, h, 83, 30, 6, 14, 'rgba(190,180,150,1)', 0.2);
    grain(ctx, w, h, 85, 0.3);
  });

const shellBands = (key: string, a: string, b: string) =>
  paint(key, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = b;
    for (let i = 0; i < 12; i++) {
      ctx.lineWidth = 4 + (i % 3) * 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, i * (h / 12) + Math.sin(x * 0.06 + i) * 4);
      ctx.stroke();
    }
    grain(ctx, w, h, 91, 0.25);
  });

// ── Animals ──────────────────────────────────────────────────────────────────

/** Nurse shark, traced from photos: a broad, flattened head, two big rounded dorsal fins set far back, and a long upper tail lobe. */
const NURSE: Profile = {
  top: [[0, 0.018], [0.1, 0.028], [0.3, 0.058], [0.55, 0.082], [0.75, 0.083], [0.9, 0.064], [0.97, 0.04], [1, 0.012]],
  bottom: [[0, -0.018], [0.1, -0.026], [0.3, -0.045], [0.55, -0.06], [0.75, -0.064], [0.9, -0.054], [0.97, -0.036], [1, -0.012]],
  width: [[0, 0.014], [0.2, 0.038], [0.55, 0.088], [0.8, 0.09], [0.95, 0.062], [1, 0.016]],
};

export function buildNurseShark(): SpotterModel {
  const g = new THREE.Group();
  const L = 1.45;
  const skin = std('#ffffff', { map: sharkSkin(), roughness: 0.75 });
  g.add(new THREE.Mesh(profiledBody(L, NURSE, { flat: 2.6 }), skin));
  // Shark fins have no rays: thick, plain skin.
  const finSkin = std('#a3824f', { side: THREE.DoubleSide, roughness: 0.8 });
  g.add(new THREE.Mesh(outlineFin(L, [[-0.13, 0.07], [0.0, 0.08], [-0.02, 0.13], [-0.055, 0.19], [-0.1, 0.18], [-0.135, 0.13]], 'up'), finSkin));
  g.add(new THREE.Mesh(outlineFin(L, [[-0.31, 0.04], [-0.2, 0.052], [-0.215, 0.1], [-0.25, 0.135], [-0.29, 0.125], [-0.315, 0.085]], 'up'), finSkin));
  g.add(new THREE.Mesh(outlineFin(L, [[-0.3, -0.032], [-0.21, -0.04], [-0.24, -0.075], [-0.285, -0.07]], 'down'), finSkin));
  for (const side of [1, -1]) {
    // Big, rounded pectoral fins angled out and down, and smaller pelvic fins under the first dorsal.
    const pec = new THREE.Mesh(outlineFin(L, [[0, 0], [-0.03, 0.09], [-0.1, 0.16], [-0.16, 0.15], [-0.12, 0.06], [-0.06, 0.0]], 'back'), finSkin);
    pec.rotation.x = side * (Math.PI / 2 + 0.35);
    pec.position.set(L * 0.24, -0.05, side * 0.08);
    g.add(pec);
    const pelvic = new THREE.Mesh(outlineFin(L, [[0, 0], [-0.03, 0.05], [-0.08, 0.07], [-0.07, 0.02]], 'back'), finSkin);
    pelvic.rotation.x = side * (Math.PI / 2 + 0.5);
    pelvic.position.set(-L * 0.06, -0.06, side * 0.06);
    g.add(pelvic);
    const barbel = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.004, 0.07, 6), skin);
    barbel.position.set(L * 0.495, -0.04, side * 0.028);
    barbel.rotation.z = 0.5;
    g.add(barbel);
  }
  // A small mouth on the underside of the snout.
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), std('#3a2a1a'));
  mouth.scale.set(0.6, 0.25, 1.4);
  mouth.position.set(L * 0.47, -0.045, 0);
  g.add(mouth);
  const tail = new THREE.Group();
  // Long upper lobe with a notch near the tip, and only a small lower lobe.
  tail.add(
    new THREE.Mesh(
      outlineFin(L, [[0.02, 0.02], [-0.12, 0.04], [-0.26, 0.068], [-0.36, 0.085], [-0.38, 0.058], [-0.33, 0.03], [-0.27, 0.012], [-0.25, -0.016], [-0.15, -0.036], [-0.05, -0.044], [0.02, -0.02]], 'back'),
      finSkin,
    ),
  );
  tail.position.set(-L * 0.5, 0, 0);
  // The tail lobe angles upward, as in the photos.
  tail.children[0].rotation.z = 0.16;
  g.add(tail);
  eyes(g, L * 0.43, 0.04, 0.072, 0.011, '#b9a46a');
  return {
    group: g,
    // Resting: just a slow sway of the tail.
    animate: (t) => (tail.rotation.y = Math.sin(t * 0.8) * 0.12),
    react: (p) => (tail.rotation.y = Math.sin(p * Math.PI * 4) * 0.4),
  };
}

export function buildSpinyLobster(): SpotterModel {
  const g = new THREE.Group();
  const shell = std('#ffffff', { map: lobsterSkin(), roughness: 0.55 });
  const leg = std('#a0552f', { roughness: 0.6 });
  const pale = std('#e8c27a', { roughness: 0.6 });
  // Carapace and segmented tail along +x (head forward).
  const cara = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), shell);
  cara.scale.set(1.5, 0.8, 0.9);
  cara.position.x = 0.06;
  g.add(cara);
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.055 - i * 0.006, 18, 12), shell);
    seg.scale.set(0.7, 0.6, 1);
    seg.position.set(-0.04 - i * 0.045, -0.005, 0);
    g.add(seg);
  }
  const fan = new THREE.Mesh(finShape([[0, 0.01], [-0.07, 0.055], [-0.085, 0], [-0.07, -0.055], [0, -0.01]], 'back'), finMat('#b0623a'));
  fan.rotation.x = -Math.PI / 2;
  fan.position.set(-0.25, -0.01, 0);
  g.add(fan);
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 6), pale);
    spike.position.set(0.02 + (i % 3) * 0.04, 0.05, i < 3 ? 0.03 : -0.03);
    g.add(spike);
  }
  // Long, spiny antennae — the giveaway, since spiny lobsters have no big claws.
  const antennae: THREE.Mesh[] = [];
  for (const side of [1, -1]) {
    const a = tube(
      [new THREE.Vector3(0.15, 0.02, side * 0.03), new THREE.Vector3(0.3, 0.08, side * 0.12), new THREE.Vector3(0.48, 0.07, side * 0.25), new THREE.Vector3(0.6, 0.02, side * 0.36)],
      0.012,
      std('#ffffff', { map: lobsterSkin(), roughness: 0.55 }),
    );
    g.add(a);
    antennae.push(a);
    for (let k = 0; k < 4; k++) {
      const l = tube([new THREE.Vector3(0.06 - k * 0.035, -0.02, side * 0.05), new THREE.Vector3(0.07 - k * 0.035, -0.04, side * 0.1), new THREE.Vector3(0.08 - k * 0.035, -0.07, side * 0.12)], 0.006, leg);
      g.add(l);
    }
  }
  eyes(g, 0.15, 0.03, 0.025, 0.01, '#222222');
  return {
    group: g,
    animate: (t) => antennae.forEach((a, i) => (a.rotation.y = Math.sin(t * 0.9 + i * 1.7) * 0.08)),
    react: (p) => antennae.forEach((a, i) => (a.rotation.y = Math.sin(p * Math.PI * 6 + i) * 0.25)),
  };
}

export function buildSeaUrchin(): SpotterModel {
  const g = new THREE.Group();
  const black = std('#16141c', { roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14), black);
  body.scale.y = 0.75;
  body.position.y = 0.05;
  g.add(body);
  const spikes: THREE.BufferGeometry[] = [];
  const r = rng(77);
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 90; i++) {
    const dir = new THREE.Vector3(range(r, -1, 1), range(r, -0.15, 1), range(r, -1, 1)).normalize();
    const len = range(r, 0.16, 0.28);
    const cone = new THREE.ConeGeometry(0.004, len, 5);
    cone.translate(0, len / 2, 0);
    cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
    cone.translate(0, 0.05, 0);
    spikes.push(cone);
  }
  const spines = new THREE.Mesh(mergeGeometries(spikes), black);
  g.add(spines);
  spikes.forEach((s) => s.dispose());
  return {
    group: g,
    react: (p) => (spines.rotation.y = Math.sin(p * Math.PI * 3) * 0.2),
  };
}

export function buildGreenMoray(): SpotterModel {
  const g = new THREE.Group();
  const skin = std('#ffffff', { map: morayLike('moray', '#5f7d2a', 'rgba(36,52,14,1)', 'rgba(170,190,80,1)', 101), roughness: 0.35, emissive: '#0d1404' });
  // Body curving out of the rock (along +z toward the viewer), head at the end.
  const body = tube(
    [new THREE.Vector3(0, 0.02, -0.35), new THREE.Vector3(0, 0.08, -0.15), new THREE.Vector3(0.02, 0.16, 0.02), new THREE.Vector3(0.05, 0.2, 0.12)],
    0.055,
    skin,
    false,
  );
  g.add(body);
  const head = new THREE.Group();
  head.position.set(0.05, 0.2, 0.12);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.06, 22, 16), skin);
  skull.scale.set(0.8, 0.85, 1.6);
  head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.05, 18, 12), skin);
  jaw.scale.set(0.75, 0.4, 1.5);
  jaw.position.set(0, -0.035, 0.02);
  head.add(jaw);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 8), std('#2a1418'));
  mouth.scale.set(0.7, 0.2, 1.6);
  mouth.position.set(0, -0.02, 0.04);
  head.add(mouth);
  // Eyes on the sides of the head, looking forward.
  const eyeHolder = new THREE.Group();
  eyes(eyeHolder, 0.0, 0.0, 0.042, 0.01, '#c9b23a');
  eyeHolder.rotation.y = Math.PI / 2;
  eyeHolder.position.set(0, 0.03, 0.04);
  head.add(eyeHolder);
  g.add(head);
  return {
    group: g,
    // The mouth opens and closes to pump water over the gills.
    animate: (t) => (jaw.rotation.x = 0.1 + Math.max(0, Math.sin(t * 2.2)) * 0.35),
    react: (p) => (head.rotation.y = Math.sin(p * Math.PI * 2) * 0.35),
  };
}

export function buildOctopus(): SpotterModel {
  const g = new THREE.Group();
  const calm = new THREE.Color('#5aa597');
  const flushed = new THREE.Color('#c4602f');
  // A pale, mottled skin tinted by the material colour, so the colour change still works.
  const mat = std(calm.clone(), { map: morayLike('octopus', '#f2f2ea', 'rgba(90,70,60,1)', 'rgba(255,255,255,1)', 111), roughness: 0.5 });
  const mantle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 24, 18), mat);
  mantle.scale.set(1, 1.3, 1);
  mantle.position.set(-0.03, 0.12, 0);
  mantle.rotation.z = 0.4;
  g.add(mantle);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), mat);
  head.position.set(0.02, 0.06, 0);
  g.add(head);
  eyes(g, 0.05, 0.09, 0.045, 0.013, '#e0c060');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    g.add(
      tube(
        [
          new THREE.Vector3(0.02 + c * 0.04, 0.04, s * 0.04),
          new THREE.Vector3(0.02 + c * 0.14, 0.015, s * 0.14),
          new THREE.Vector3(0.02 + c * 0.24 - s * 0.05, 0.02, s * 0.24 + c * 0.05),
          new THREE.Vector3(0.02 + c * 0.27 - s * 0.12, 0.05, s * 0.27 + c * 0.12),
        ],
        0.018,
        mat,
      ),
    );
  }
  return {
    group: g,
    // Changes color when tapped, then fades back: octopuses can change color to blend in or signal.
    react: (p) => mat.color.copy(calm).lerp(flushed, Math.sin(p * Math.PI)),
  };
}

interface FishSpec {
  skin: () => THREE.Texture | null;
  profile: Profile;
  fin: string;
  tailFin: string;
  /** Dorsal fin along the back: start, end and heights (in units of body length). */
  dorsal: [number, number, [number, number][]];
  anal: [number, number, [number, number][]];
  tail: [number, number][];
  eye: [number, number];
}

function smallFish(spec: FishSpec, length: number): { group: THREE.Group; tail: THREE.Object3D } {
  const g = new THREE.Group();
  const L = length;
  g.add(new THREE.Mesh(profiledBody(L, spec.profile, { stations: 40, radial: 28 }), std('#ffffff', { map: spec.skin(), roughness: 0.38 })));
  const fin = finMat(spec.fin);
  g.add(new THREE.Mesh(contourFin(L, spec.profile, spec.dorsal[0], spec.dorsal[1], spec.dorsal[2], 'top'), fin));
  g.add(new THREE.Mesh(contourFin(L, spec.profile, spec.anal[0], spec.anal[1], spec.anal[2], 'bottom'), fin));
  for (const s of [1, -1]) {
    const pec = new THREE.Mesh(outlineFin(L, [[0, 0], [-0.16, 0.06], [-0.18, -0.01], [-0.04, -0.04]], 'back'), finMat(spec.fin, { opacity: 0.85 }));
    pec.position.set(L * 0.2, -L * 0.04, s * L * 0.07);
    pec.rotation.y = s * 0.45;
    g.add(pec);
    const pelvic = new THREE.Mesh(outlineFin(L, [[0, 0], [-0.1, -0.12], [-0.04, -0.13]], 'down'), finMat(spec.fin));
    pelvic.position.set(L * 0.14, -L * 0.2, s * L * 0.03);
    g.add(pelvic);
  }
  const tail = new THREE.Group();
  tail.add(new THREE.Mesh(outlineFin(L, spec.tail, 'back'), finMat(spec.tailFin)));
  tail.position.x = -L * 0.5;
  g.add(tail);
  eyes(g, L * (spec.eye[0] - 0.5), L * spec.eye[1], L * 0.06, L * 0.045);
  return { group: g, tail };
}

/** A small group of fish swimming a slow loop around their own centre. */
function school(spec: FishSpec, length: number, count: number, radius: number, speed: number): SpotterModel {
  const g = new THREE.Group();
  const fish = Array.from({ length: count }, () => smallFish(spec, length));
  fish.forEach((f) => g.add(f.group));
  const place = (t: number) =>
    fish.forEach((f, i) => {
      const a = t * speed + (i / count) * Math.PI * 2;
      f.group.position.set(Math.cos(a) * radius, Math.sin(a * 2 + i) * 0.06 + i * 0.05, Math.sin(a) * radius * 0.6);
      f.group.rotation.y = Math.atan2(-Math.cos(a) * radius * 0.6, -Math.sin(a) * radius);
      f.tail.rotation.y = Math.sin(t * 9 + i) * 0.4;
    });
  place(0);
  return { group: g, animate: place, react: (p) => fish.forEach((f) => (f.tail.rotation.y = Math.sin(p * 40) * 0.6)) };
}

/** Caribbean blue tang (Acanthurus coeruleus): a deep oval disc with a steep forehead, long fins edged in bright blue, and a crescent tail. */
const TANG: Profile = {
  top: [[0, 0.06], [0.08, 0.09], [0.25, 0.22], [0.5, 0.29], [0.7, 0.285], [0.85, 0.23], [0.95, 0.12], [1, 0.02]],
  bottom: [[0, -0.06], [0.08, -0.09], [0.25, -0.22], [0.5, -0.28], [0.7, -0.25], [0.85, -0.17], [0.95, -0.08], [1, -0.01]],
  width: [[0, 0.02], [0.3, 0.065], [0.6, 0.075], [0.9, 0.05], [1, 0.012]],
};
export const buildBlueTangs = () =>
  school(
    {
      skin: tangSkin,
      profile: TANG,
      fin: '#2f63e0',
      tailFin: '#2a55c8',
      dorsal: [0.12, 0.84, [[0, 0.02], [0.15, 0.1], [0.6, 0.12], [0.9, 0.08], [1, 0.0]]],
      anal: [0.12, 0.62, [[0, 0.02], [0.2, 0.1], [0.7, 0.11], [1, 0.0]]],
      tail: [[0.01, 0.05], [-0.1, 0.2], [-0.17, 0.27], [-0.13, 0.13], [-0.11, 0.0], [-0.13, -0.13], [-0.17, -0.27], [-0.1, -0.2], [0.01, -0.05]],
      eye: [0.86, 0.11],
    },
    0.25,
    3,
    0.45,
    0.35,
  );
/** Sergeant major (Abudefduf saxatilis): an oval, deep body, a long spiny dorsal fin and a forked tail. */
const SERGEANT: Profile = {
  top: [[0, 0.07], [0.1, 0.1], [0.3, 0.24], [0.55, 0.28], [0.75, 0.25], [0.9, 0.16], [1, 0.03]],
  bottom: [[0, -0.07], [0.1, -0.1], [0.3, -0.21], [0.55, -0.25], [0.75, -0.21], [0.9, -0.12], [1, -0.02]],
  width: [[0, 0.02], [0.4, 0.075], [0.7, 0.075], [1, 0.012]],
};
export const buildSergeantMajors = () =>
  school(
    {
      skin: sergeantSkin,
      profile: SERGEANT,
      fin: '#c9d2d6',
      tailFin: '#c9cfa8',
      dorsal: [0.18, 0.86, [[0, 0.05], [0.25, 0.14], [0.6, 0.1], [0.85, 0.12], [1, 0.02]]],
      anal: [0.14, 0.5, [[0, 0.05], [0.4, 0.15], [1, 0.02]]],
      tail: [[0.01, 0.06], [-0.12, 0.2], [-0.2, 0.25], [-0.15, 0.1], [-0.12, 0.0], [-0.15, -0.1], [-0.2, -0.25], [-0.12, -0.2], [0.01, -0.06]],
      eye: [0.84, 0.09],
    },
    0.18,
    3,
    0.35,
    0.45,
  );

/** Spotted eagle ray: one smooth body and wings, so the wings bend as they flap instead of hinging. */
const RAY_SPAN = 0.66;

function rayDisc(top: boolean) {
  const NS = 32;
  const NC = 16;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= NS; i++) {
    const zf = -1 + (2 * i) / NS;
    const a = Math.abs(zf);
    const chord = 0.52 * Math.pow(1 - a, 0.75) + 0.012;
    // Wings sweep back toward pointed tips.
    const xm = 0.02 - 0.14 * Math.pow(a, 1.1);
    const thick = 0.075 * Math.pow(1 - a, 1.6) + 0.003;
    for (let j = 0; j <= NC; j++) {
      const f = j / NC;
      const x = xm + chord / 2 - f * chord;
      const y = (top ? 1 : -0.45) * thick * Math.pow(Math.sin(Math.PI * f), 0.7);
      pos.push(x, y, zf * RAY_SPAN);
    }
  }
  for (let i = 0; i < NS; i++)
    for (let j = 0; j < NC; j++) {
      const a = i * (NC + 1) + j;
      const b = a + NC + 1;
      if (top) idx.push(a, a + 1, b, b, a + 1, b + 1);
      else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const uv: number[] = [];
  for (let k = 0; k < pos.length; k += 3) uv.push((pos[k] - bb.min.x) / (bb.max.x - bb.min.x), (pos[k + 2] - bb.min.z) / (bb.max.z - bb.min.z));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** Bends the wings up and down in the vertex shader, with matching normals for lighting. */
function flapping(mat: THREE.MeshStandardMaterial, flap: { value: number }) {
  mat.userData.noSkin = true;
  mat.customProgramCacheKey = () => 'eagle-ray-flap';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFlap = flap;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uFlap;`)
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
float oeA0 = clamp(abs(position.z) / ${RAY_SPAN.toFixed(2)}, 0.0, 1.0);
objectNormal.z -= sign(position.z) * uFlap * 0.32 * 1.7 * pow(oeA0, 0.7) / ${RAY_SPAN.toFixed(2)} * objectNormal.y;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float oeA = clamp(abs(transformed.z) / ${RAY_SPAN.toFixed(2)}, 0.0, 1.0);
transformed.y += uFlap * pow(oeA, 1.7) * 0.32;
transformed.z *= 1.0 - abs(uFlap) * pow(oeA, 2.0) * 0.06;`,
      );
  };
  return mat;
}

export function buildEagleRay(): SpotterModel {
  const g = new THREE.Group();
  const flap = { value: 0 };
  const top = new THREE.Mesh(rayDisc(true), flapping(std('#ffffff', { map: raySkin(), roughness: 0.45 }), flap));
  const belly = new THREE.Mesh(rayDisc(false), flapping(std('#eef1f2', { roughness: 0.6 }), flap));
  g.add(top, belly);
  // A domed head and the flat, duck-bill snout.
  const dark = std('#1d2433', { roughness: 0.45 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), dark);
  head.scale.set(1.25, 0.6, 0.95);
  head.position.set(0.26, 0.015, 0);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 12), dark);
  snout.scale.set(1.5, 0.42, 0.9);
  snout.position.set(0.34, -0.002, 0);
  g.add(snout);
  eyes(g, 0.27, 0.035, 0.062, 0.013, '#c8b070');
  // Long, thin, whip-like tail.
  g.add(tube([new THREE.Vector3(-0.22, 0, 0), new THREE.Vector3(-0.6, 0.015, 0.01), new THREE.Vector3(-1.0, 0.0, 0.05), new THREE.Vector3(-1.45, -0.03, 0.09)], 0.012, dark));
  const flapAt = (phase: number, amount: number) => (flap.value = Math.sin(phase) * amount);
  return { group: g, animate: (t) => flapAt(t * 1.6, 0.55), react: (p) => flapAt(p * Math.PI * 6, 1) };
}

export function buildCushionStar(): SpotterModel {
  const g = new THREE.Group();
  const orange = std('#ffffff', { map: cushionSkin(), roughness: 0.7 });
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.1, 28, 16), orange);
  center.scale.set(1, 0.5, 1);
  center.position.y = 0.03;
  g.add(center);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    // Short, thick arms that blend into the puffy centre.
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 12), orange);
    arm.scale.set(1.9, 0.55, 0.85);
    arm.position.x = 0.12;
    const holder = new THREE.Group();
    holder.add(arm);
    holder.rotation.y = a;
    holder.position.y = 0.02;
    g.add(holder);
  }
  return { group: g };
}

export function buildSeaCucumber(): SpotterModel {
  const g = new THREE.Group();
  const brown = std('#ffffff', { map: cucumberSkin(), roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.28, 8, 18), brown);
  body.rotation.z = Math.PI / 2;
  body.scale.set(1, 1, 0.8);
  body.position.y = 0.04;
  g.add(body);
  const bumpMat = std('#8a6640', { roughness: 0.9 });
  const r = rng(91);
  for (let i = 0; i < 22; i++) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.02, 6), bumpMat);
    const x = range(r, -0.16, 0.16);
    const a = range(r, -1.2, 1.2);
    b.position.set(x, 0.04 + Math.cos(a) * 0.045, Math.sin(a) * 0.04);
    b.rotation.x = a;
    g.add(b);
  }
  return {
    group: g,
    // Inches along very slowly, as if crawling.
    animate: (t) => (body.scale.x = 1 + Math.sin(t * 0.7) * 0.05),
  };
}

export function buildStingray(sandColor: string): SpotterModel {
  const g = new THREE.Group();
  const top = std('#ffffff', { map: stingraySkin(), roughness: 0.85 });
  // A soft, domed diamond: a flattened sphere pulled out toward four points.
  const geo = new THREE.SphereGeometry(0.5, 48, 18);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const k = Math.pow(1 / (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a))), 0.75) * 1.25;
    pos.setXYZ(i, x * k * 0.72, Math.max(0, pos.getY(i)) * 0.16, z * k * 0.6);
  }
  geo.computeVertexNormals();
  const disc = new THREE.Mesh(geo, top);
  const holder = new THREE.Group();
  holder.add(disc);
  g.add(holder);
  // Bumpy eyes on top — the part you can still see when it hides in the sand.
  eyes(g, 0.14, 0.07, 0.05, 0.017, '#a39662');
  const tail = tube([new THREE.Vector3(-0.3, 0.02, 0), new THREE.Vector3(-0.55, 0.02, 0.02), new THREE.Vector3(-0.8, 0.015, 0.05)], 0.012, std('#6f6858'));
  g.add(tail);
  // A light dusting of sand over the edges of its fins.
  const sand = std(sandColor, { roughness: 1 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const drift = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 8), sand);
    drift.scale.set(1.5, 0.22, 0.9);
    drift.position.set(Math.cos(a) * 0.22, 0.02, Math.sin(a) * 0.26);
    g.add(drift);
  }
  return { group: g, react: (p) => (holder.position.y = Math.sin(p * Math.PI) * 0.05) };
}

export function buildHermitCrab(): SpotterModel {
  const g = new THREE.Group();
  const shellMat = std('#ffffff', { map: shellBands('hermit-shell', '#cfae78', 'rgba(140,96,56,0.6)'), roughness: 0.55 });
  // A coiled snail shell: a cone for the spire and a fat body whorl.
  const shell = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.11, 24), shellMat);
  shell.rotation.z = Math.PI / 2 + 0.3;
  shell.position.set(-0.03, 0.05, 0);
  g.add(shell);
  const whorl = new THREE.Mesh(new THREE.SphereGeometry(0.048, 22, 16), shellMat);
  whorl.scale.set(0.9, 0.85, 0.9);
  whorl.position.set(0.02, 0.045, 0);
  g.add(whorl);
  const crab = new THREE.Group();
  const red = std('#c23b22', { roughness: 0.45 });
  const claw = new THREE.Mesh(new THREE.SphereGeometry(0.02, 14, 10), red);
  claw.scale.set(1.4, 0.8, 1);
  claw.position.set(0.075, 0.03, 0.02);
  crab.add(claw);
  for (const side of [1, -1]) {
    for (let k = 0; k < 2; k++) {
      const leg = tube([new THREE.Vector3(0.06, 0.03, side * 0.02), new THREE.Vector3(0.07 + k * 0.01, 0.03, side * (0.045 + k * 0.01)), new THREE.Vector3(0.08 + k * 0.012, 0.0, side * (0.06 + k * 0.012))], 0.005, red);
      crab.add(leg);
    }
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.03, 6), red);
    stalk.position.set(0.07, 0.06, side * 0.012);
    crab.add(stalk);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 10, 8), std('#111', { roughness: 0.15 }));
    eye.position.set(0.07, 0.077, side * 0.012);
    crab.add(eye);
  }
  g.add(crab);
  return {
    group: g,
    // Ducks back into its shell when tapped, then peeks out again.
    react: (p) => (crab.position.x = -Math.sin(p * Math.PI) * 0.05),
  };
}
