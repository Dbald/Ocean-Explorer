/**
 * Procedural models for the "spotter" animals: simple, readable shapes at
 * roughly realistic relative scale (1 unit ≈ 1 m), sized up slightly where a
 * real animal would be too small to see on a classroom board. Each builder
 * returns the model plus an optional per-frame animation.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { eyes, finShape, fishBody, std } from './organisms.ts';
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
  const geo = new THREE.TubeGeometry(curve, 24, radius, 6, false);
  if (tapered) {
    // Taper toward the tip.
    const pos = geo.attributes.position;
    const center = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.floor(i / 7) / 24;
      p.fromBufferAttribute(pos, i);
      curve.getPointAt(Math.min(1, t), center);
      p.sub(center).multiplyScalar(1 - t * 0.85).add(center);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    geo.computeVertexNormals();
  }
  return new THREE.Mesh(geo, mat);
};

export function buildNurseShark(): SpotterModel {
  const g = new THREE.Group();
  const skin = std('#a8875a', { roughness: 0.8 });
  const L = 1.6;
  const body = new THREE.Mesh(fishBody(L, 0.26, 0.32, 0.38, 0.32), skin);
  body.scale.y = 0.85;
  g.add(body);
  const belly = new THREE.Mesh(fishBody(L * 0.75, 0.1, 0.28, 0.4, 0.35), std('#d9c49a', { roughness: 0.8 }));
  belly.position.set(0.05, -0.07, 0);
  g.add(belly);
  const finMat = std('#94764c', { side: THREE.DoubleSide, roughness: 0.8 });
  // Two rounded dorsal fins set far back, a long upper tail lobe, and broad pectoral fins.
  const d1 = new THREE.Mesh(finShape([[0, 0.08], [0.16, 0.08], [0.02, 0.24]]), finMat);
  d1.position.x = -0.25;
  g.add(d1);
  const d2 = new THREE.Mesh(finShape([[0, 0.06], [0.12, 0.06], [0.0, 0.17]]), finMat);
  d2.position.x = -0.52;
  g.add(d2);
  const tail = new THREE.Group();
  tail.add(new THREE.Mesh(finShape([[0, 0.02], [-0.42, 0.06], [-0.4, -0.02], [0, -0.06]]), finMat));
  tail.position.set(-L * 0.48, 0, 0);
  g.add(tail);
  for (const side of [1, -1]) {
    const pec = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 6), finMat);
    pec.scale.set(0.16, 0.02, 0.2);
    pec.position.set(0.3, -0.08, side * 0.2);
    pec.rotation.y = side * -0.5;
    g.add(pec);
    const barbel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.06, 5), skin);
    barbel.position.set(L * 0.49, -0.05, side * 0.03);
    g.add(barbel);
  }
  eyes(g, L * 0.38, 0.04, 0.09, 0.012);
  return {
    group: g,
    // Resting: just a slow sway of the tail.
    animate: (t) => (tail.rotation.y = Math.sin(t * 0.8) * 0.12),
    react: (p) => (tail.rotation.y = Math.sin(p * Math.PI * 4) * 0.4),
  };
}

export function buildSpinyLobster(): SpotterModel {
  const g = new THREE.Group();
  const shell = std('#9a4b2c', { roughness: 0.6 });
  const pale = std('#e8c27a', { roughness: 0.6 });
  // Carapace and segmented tail along +x (head forward).
  const cara = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 10), shell);
  cara.scale.set(1.5, 0.8, 0.9);
  cara.position.x = 0.06;
  g.add(cara);
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.055 - i * 0.006, 12, 8), i % 2 ? pale : shell);
    seg.scale.set(0.7, 0.6, 1);
    seg.position.set(-0.04 - i * 0.045, -0.005, 0);
    g.add(seg);
  }
  const fan = new THREE.Mesh(finShape([[0, 0], [-0.07, 0.05], [-0.08, -0.05]]), shell);
  fan.rotation.x = -Math.PI / 2;
  fan.position.set(-0.26, -0.01, 0);
  g.add(fan);
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 5), pale);
    spike.position.set(0.02 + (i % 3) * 0.04, 0.05, i < 3 ? 0.03 : -0.03);
    g.add(spike);
  }
  // Long, spiny antennae — the giveaway, since spiny lobsters have no big claws.
  const antennae: THREE.Mesh[] = [];
  for (const side of [1, -1]) {
    const a = tube(
      [new THREE.Vector3(0.15, 0.02, side * 0.03), new THREE.Vector3(0.3, 0.08, side * 0.12), new THREE.Vector3(0.48, 0.07, side * 0.25), new THREE.Vector3(0.6, 0.02, side * 0.36)],
      0.012,
      shell,
    );
    g.add(a);
    antennae.push(a);
    for (let k = 0; k < 4; k++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.004, 0.09, 5), shell);
      leg.position.set(0.06 - k * 0.035, -0.04, side * 0.06);
      leg.rotation.x = side * 0.9;
      g.add(leg);
    }
  }
  eyes(g, 0.15, 0.03, 0.025, 0.01);
  return {
    group: g,
    animate: (t) => antennae.forEach((a, i) => (a.rotation.y = Math.sin(t * 0.9 + i * 1.7) * 0.08)),
    react: (p) => antennae.forEach((a, i) => (a.rotation.y = Math.sin(p * Math.PI * 6 + i) * 0.25)),
  };
}

export function buildSeaUrchin(): SpotterModel {
  const g = new THREE.Group();
  const black = std('#16141c', { roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), black);
  body.scale.y = 0.75;
  body.position.y = 0.05;
  g.add(body);
  const spikes: THREE.BufferGeometry[] = [];
  const r = rng(77);
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 70; i++) {
    const dir = new THREE.Vector3(range(r, -1, 1), range(r, -0.15, 1), range(r, -1, 1)).normalize();
    const len = range(r, 0.16, 0.26);
    const cone = new THREE.ConeGeometry(0.004, len, 4);
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
  const skin = std('#5d7a2a', { roughness: 0.45, emissive: '#0d1404' });
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
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), skin);
  skull.scale.set(0.8, 0.85, 1.6);
  head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), skin);
  jaw.scale.set(0.75, 0.4, 1.5);
  jaw.position.set(0, -0.035, 0.02);
  head.add(jaw);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 6), std('#2a1418'));
  mouth.scale.set(0.7, 0.2, 1.6);
  mouth.position.set(0, -0.02, 0.04);
  head.add(mouth);
  eyes(head, 0.0, 0.03, 0.04, 0.009);
  head.children.slice(-2).forEach((e) => (e.position.set(e.position.z > 0 ? 0.04 : -0.04, 0.03, 0.04)));
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
  const calm = new THREE.Color('#4f9a8f');
  const flushed = new THREE.Color('#b8562e');
  const mat = std(calm.clone(), { roughness: 0.55 });
  const mantle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 12), mat);
  mantle.scale.set(1, 1.3, 1);
  mantle.position.set(-0.03, 0.12, 0);
  mantle.rotation.z = 0.4;
  g.add(mantle);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), mat);
  head.position.set(0.02, 0.06, 0);
  g.add(head);
  eyes(g, 0.05, 0.09, 0.04, 0.012);
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

function smallFish(color: string, length: number, height: number, stripes?: string): { group: THREE.Group; tail: THREE.Object3D } {
  const g = new THREE.Group();
  const geo = fishBody(length, height, height * 0.35, 0.5, 0.4);
  let mat: THREE.MeshStandardMaterial;
  if (stripes) {
    // Paint vertical stripes with vertex colors (sergeant major).
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(color);
    const band = new THREE.Color(stripes);
    const top = new THREE.Color('#e9d84a');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / length;
      const y = pos.getY(i) / height;
      const striped = x < 0.32 && x > -0.4 && Math.sin((x + 0.5) * Math.PI * 9) > 0.55;
      c.copy(striped ? band : base);
      if (!striped && y > 0.15) c.lerp(top, 0.7);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 });
  } else {
    mat = std(color, { roughness: 0.35 });
  }
  g.add(new THREE.Mesh(geo, mat));
  const tail = new THREE.Group();
  tail.add(new THREE.Mesh(finShape([[0, 0], [-length * 0.3, height * 0.45], [-length * 0.22, 0], [-length * 0.3, -height * 0.45]]), std(stripes ? '#e9d84a' : color, { side: THREE.DoubleSide })));
  tail.position.x = -length * 0.47;
  g.add(tail);
  eyes(g, length * 0.32, height * 0.12, height * 0.16, length * 0.035);
  return { group: g, tail };
}

/** A small group of fish swimming a slow loop around their own centre. */
function school(color: string, length: number, height: number, count: number, radius: number, speed: number, stripes?: string): SpotterModel {
  const g = new THREE.Group();
  const fish = Array.from({ length: count }, () => smallFish(color, length, height, stripes));
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

export const buildBlueTangs = () => school('#2357d8', 0.25, 0.17, 3, 0.45, 0.35);
export const buildSergeantMajors = () => school('#f4f1df', 0.18, 0.12, 3, 0.35, 0.45, '#1b1d22');

export function buildEagleRay(): SpotterModel {
  const g = new THREE.Group();
  const top = std('#262e3a', { roughness: 0.5, side: THREE.DoubleSide });
  const spotMat = std('#f2f4f6');
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), top);
  body.scale.set(1.6, 0.45, 0.8);
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), top);
  head.scale.set(1.4, 0.6, 0.9);
  head.position.x = 0.2;
  g.add(head);
  const wings: THREE.Group[] = [];
  for (const side of [1, -1]) {
    const pivot = new THREE.Group();
    const wing = new THREE.Mesh(finShape([[0.15, 0], [-0.05, side * 0.62], [-0.12, side * 0.5], [-0.12, 0]]), top);
    wing.rotation.x = -Math.PI / 2;
    pivot.add(wing);
    // White spots on the back.
    for (let i = 0; i < 6; i++) {
      const spot = new THREE.Mesh(new THREE.CircleGeometry(0.018, 8), spotMat);
      spot.rotation.x = -Math.PI / 2;
      spot.position.set(0.06 - (i % 3) * 0.06, 0.004, side * (0.12 + Math.floor(i / 3) * 0.16 + (i % 3) * 0.04));
      pivot.add(spot);
    }
    g.add(pivot);
    wings.push(pivot);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.002, 1.1, 5), top);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.68;
  g.add(tail);
  eyes(g, 0.22, 0.02, 0.06, 0.012);
  const flap = (t: number, amount: number) => wings.forEach((w, i) => (w.rotation.x = (i === 0 ? -1 : 1) * Math.sin(t) * amount));
  return { group: g, animate: (t) => flap(t * 1.6, 0.3), react: (p) => flap(p * Math.PI * 6, 0.55) };
}

export function buildCushionStar(): SpotterModel {
  const g = new THREE.Group();
  const orange = std('#d9762b', { roughness: 0.75 });
  const knob = std('#f1b05a', { roughness: 0.7 });
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 10), orange);
  center.scale.set(1, 0.5, 1);
  center.position.y = 0.03;
  g.add(center);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 12), orange);
    arm.rotation.z = -Math.PI / 2;
    const holder = new THREE.Group();
    arm.position.x = 0.15;
    arm.scale.set(1, 1, 0.55);
    holder.add(arm);
    for (let k = 0; k < 3; k++) {
      const bump = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), knob);
      bump.position.set(0.08 + k * 0.05, 0.035 - k * 0.006, 0);
      holder.add(bump);
    }
    holder.rotation.y = a;
    holder.position.y = 0.02;
    g.add(holder);
  }
  return { group: g };
}

export function buildSeaCucumber(): SpotterModel {
  const g = new THREE.Group();
  const brown = std('#6b4a2b', { roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.28, 6, 12), brown);
  body.rotation.z = Math.PI / 2;
  body.scale.set(1, 1, 0.8);
  body.position.y = 0.04;
  g.add(body);
  const bumpMat = std('#8a6640', { roughness: 0.9 });
  const r = rng(91);
  for (let i = 0; i < 18; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), bumpMat);
    const x = range(r, -0.16, 0.16);
    const a = range(r, -1.2, 1.2);
    b.position.set(x, 0.04 + Math.cos(a) * 0.045, Math.sin(a) * 0.04);
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
  const top = std('#8f8775', { roughness: 0.9 });
  // A soft, domed diamond: a flattened sphere pulled out toward four points.
  const geo = new THREE.SphereGeometry(0.5, 40, 14);
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
  eyes(g, 0.14, 0.07, 0.05, 0.017);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.002, 0.5, 5), top);
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-0.52, 0.02, 0);
  g.add(tail);
  // A light dusting of sand over the edges of its fins.
  const sand = std(sandColor, { roughness: 1 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const drift = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6), sand);
    drift.scale.set(1.5, 0.22, 0.9);
    drift.position.set(Math.cos(a) * 0.22, 0.02, Math.sin(a) * 0.26);
    g.add(drift);
  }
  return { group: g, react: (p) => (holder.position.y = Math.sin(p * Math.PI) * 0.05) };
}

export function buildHermitCrab(): SpotterModel {
  const g = new THREE.Group();
  const shellMat = std('#c9a36a', { roughness: 0.6 });
  const shell = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.11, 14), shellMat);
  shell.rotation.z = Math.PI / 2 + 0.3;
  shell.position.set(-0.02, 0.05, 0);
  g.add(shell);
  const whorl = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.014, 8, 16), shellMat);
  whorl.position.set(0.03, 0.05, 0);
  whorl.rotation.y = Math.PI / 2;
  g.add(whorl);
  const crab = new THREE.Group();
  const red = std('#c23b22', { roughness: 0.5 });
  const claw = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), red);
  claw.scale.set(1.4, 0.8, 1);
  claw.position.set(0.075, 0.03, 0.02);
  crab.add(claw);
  for (const side of [1, -1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.005, 0.06, 5), red);
    leg.position.set(0.06, 0.015, side * 0.03);
    leg.rotation.x = side * 0.8;
    crab.add(leg);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.03, 4), red);
    stalk.position.set(0.07, 0.06, side * 0.012);
    crab.add(stalk);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), std('#111'));
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
