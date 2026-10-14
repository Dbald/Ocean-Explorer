/**
 * Expedition 2 scene layers: floating sargassum mats that shade the reef, and
 * tappable trash. Procedural like the rest of the reef, so nothing is downloaded.
 */
import * as THREE from 'three';
import type { HabitatId } from '../content/types.ts';
import { terrainHeight } from './environment.ts';
import { range, rng } from './util.ts';

// ── Sargassum ────────────────────────────────────────────────────────────────

interface Clump {
  x: number;
  y: number;
  z: number;
  r: number;
  /** Resting on the seabed rather than floating. */
  ground?: boolean;
}

/** Mats float over each stop where its camera looks up; at the sand stop they also pile on the seabed. */
function clumpLayout(): Clump[] {
  const r = rng(77);
  const out: Clump[] = [];
  const add = (n: number, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r0: number, r1: number) => {
    for (let i = 0; i < n; i++) out.push({ x: range(r, x0, x1), y: range(r, y0, y1), z: range(r, z0, z1), r: range(r, r0, r1) });
  };
  // Reef: a broken canopy overhead and drifting further back.
  add(22, -22, -8, 3.2, 3.8, -6, 3.5, 0.6, 1.3);
  add(6, -20, -10, 2.6, 3.0, -6, -2.5, 0.4, 0.8);
  // Seagrass: the camera is lower, so the mats sit lower.
  add(16, -1, 10, 2.25, 2.7, -5, 1.6, 0.5, 1.1);
  // Sand: a few drifting clumps, and piles settled on the seabed.
  add(6, 15, 22, 1.25, 1.6, -4, -0.5, 0.35, 0.7);
  const clear = [
    [17.6, 0.9, 0.6], // conch
    [18.6, -0.02, 0.75], // stingray
    [16.85, 1.55, 0.5], // hermit crab
    ...Object.values(LITTER_PLACES).filter((l) => l.stop === 'sand').map((l) => [l.x, l.z, 0.45]),
  ];
  for (let i = 0; i < 16; i++) {
    const x = range(r, 15.3, 19.8);
    const z = range(r, -1.3, 1.5);
    // Leave the animals and the trash in view.
    if (clear.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr)) continue;
    out.push({ x, y: terrainHeight(x, z) + 0.03, z, r: range(r, 0.22, 0.45), ground: true });
  }
  return out;
}

/** Sargassum: golden-brown branches with small round air bladders that keep it afloat. */
export function buildSargassum() {
  const group = new THREE.Group();
  group.name = 'sargassum';
  const clumps = clumpLayout();
  const r = rng(91);

  const bladderMat = new THREE.MeshStandardMaterial({ color: '#a9792a', roughness: 0.55, transparent: true });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#7d5a1c', roughness: 0.75, side: THREE.DoubleSide, transparent: true });
  const coreMat = new THREE.MeshStandardMaterial({ color: '#5f4718', roughness: 0.9, transparent: true });
  const strandMat = new THREE.MeshStandardMaterial({ color: '#6b4d18', roughness: 0.8, transparent: true });

  // A serrated leaf, a little curved.
  const leafGeo = new THREE.PlaneGeometry(0.16, 0.045, 4, 1);
  {
    const p = leafGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setY(i, p.getY(i) * (1 - (x / 0.08) ** 2 * 0.7));
      p.setZ(i, (x / 0.08) ** 2 * 0.015);
    }
    leafGeo.computeVertexNormals();
  }
  const bladderGeo = new THREE.IcosahedronGeometry(1, 0);
  const coreGeo = new THREE.IcosahedronGeometry(1, 1);
  {
    const p = coreGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + (Math.sin(p.getX(i) * 7 + p.getZ(i) * 5) * 0.18);
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * 0.22, p.getZ(i) * k);
    }
    coreGeo.computeVertexNormals();
  }
  const strandGeo = new THREE.CylinderGeometry(0.008, 0.004, 1, 4, 1);
  strandGeo.translate(0, -0.5, 0);

  let nB = 0;
  let nL = 0;
  let nS = 0;
  for (const c of clumps) {
    nB += Math.round(c.r * 90);
    nL += Math.round(c.r * 80);
    nS += c.ground ? 0 : Math.round(c.r * 7);
  }
  const bladders = new THREE.InstancedMesh(bladderGeo, bladderMat, nB);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, nL);
  const cores = new THREE.InstancedMesh(coreGeo, coreMat, clumps.length);
  const strands = new THREE.InstancedMesh(strandGeo, strandMat, Math.max(1, nS));

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  let iB = 0;
  let iL = 0;
  let iS = 0;
  clumps.forEach((c, ci) => {
    // Dense, dark core gives the mat its mass when seen from below.
    m.compose(pos.set(c.x, c.y, c.z), q.setFromEuler(e.set(0, r() * 6, 0)), scl.set(c.r * 0.6, c.r * (c.ground ? 0.8 : 1.1), c.r * 0.55));
    cores.setMatrixAt(ci, m);
    const nb = Math.round(c.r * 90);
    for (let i = 0; i < nb; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * c.r;
      const y = (r() - 0.5) * c.r * (c.ground ? 0.3 : 0.35);
      const s = range(r, 0.018, 0.034) * (c.ground ? 1.2 : 1);
      m.compose(pos.set(c.x + Math.cos(a) * d, c.y + y, c.z + Math.sin(a) * d * 0.85), q.identity(), scl.set(s, s, s));
      bladders.setMatrixAt(iB++, m);
    }
    const nl = Math.round(c.r * 80);
    for (let i = 0; i < nl; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * c.r * 1.05;
      const y = (r() - 0.5) * c.r * 0.4;
      const s = range(r, 0.8, 1.6);
      m.compose(
        pos.set(c.x + Math.cos(a) * d, c.y + y, c.z + Math.sin(a) * d * 0.85),
        q.setFromEuler(e.set(range(r, -1.2, 1.2), r() * Math.PI * 2, range(r, -0.6, 0.6))),
        scl.set(s, s, s),
      );
      leaves.setMatrixAt(iL++, m);
    }
    if (!c.ground) {
      const ns = Math.round(c.r * 7);
      for (let i = 0; i < ns; i++) {
        const a = r() * Math.PI * 2;
        const d = r() * c.r * 0.8;
        m.compose(
          pos.set(c.x + Math.cos(a) * d, c.y - c.r * 0.15, c.z + Math.sin(a) * d * 0.8),
          q.setFromEuler(e.set(range(r, -0.35, 0.35), 0, range(r, -0.35, 0.35))),
          scl.set(1, range(r, 0.25, 0.7), 1),
        );
        strands.setMatrixAt(iS++, m);
      }
    }
  });
  strands.count = iS;
  for (const mesh of [bladders, leaves, cores, strands]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    group.add(mesh);
  }
  const mats = [bladderMat, leafMat, coreMat, strandMat];

  return {
    group,
    /** f: 0 = clear water, 1 = mats fully in. Mats drift in from above as they fade in. */
    setAmount(f: number) {
      group.visible = f > 0.001;
      group.position.y = (1 - f) * 0.8;
      for (const mat of mats) {
        mat.opacity = f;
        mat.depthWrite = f > 0.95;
      }
    },
    animate(t: number) {
      group.position.x = Math.sin(t * 0.08) * 0.25;
      group.position.z = Math.cos(t * 0.06) * 0.15;
    },
  };
}

// ── Trash ────────────────────────────────────────────────────────────────────

export type LitterKind = 'bag' | 'bottle' | 'net' | 'line';

/** Where each piece goes (by id), and whether it floats. Kept clear of the animals at each stop. */
export const LITTER_PLACES: Record<string, { x: number; z: number; lift: number; yaw: number; free?: boolean; stop: HabitatId }> = {
  'litter-1': { stop: 'reef', x: -16.6, z: 2.4, lift: 1.05, yaw: 0.4, free: true },
  'litter-2': { stop: 'reef', x: -13.9, z: 3.0, lift: 0.05, yaw: 0.9 },
  'litter-3': { stop: 'reef', x: -17.9, z: 2.4, lift: 0.02, yaw: 0.2 },
  'litter-4': { stop: 'reef', x: -13.1, z: 0.6, lift: 0.3, yaw: 0 },
  'litter-5': { stop: 'reef', x: -16.2, z: 3.7, lift: 0.05, yaw: -0.7 },
  'litter-6': { stop: 'seagrass', x: 2.6, z: 0.9, lift: 0.16, yaw: 0.3 },
  'litter-7': { stop: 'seagrass', x: 6.0, z: 0.4, lift: 0.1, yaw: -1.1 },
  'litter-8': { stop: 'seagrass', x: 2.4, z: -0.6, lift: 0.14, yaw: 0.5 },
  'litter-9': { stop: 'seagrass', x: 6.1, z: -0.9, lift: 1.1, yaw: 1.4, free: true },
  'litter-10': { stop: 'sand', x: 18.35, z: 1.35, lift: 0.05, yaw: 0.6 },
  'litter-11': { stop: 'sand', x: 16.4, z: 0.0, lift: 0.04, yaw: -0.4 },
  'litter-12': { stop: 'sand', x: 17.3, z: -0.6, lift: 0.04, yaw: 0.2 },
};

function plasticBag(seed: number) {
  const r = rng(seed);
  const geo = new THREE.PlaneGeometry(0.42, 0.5, 10, 12);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    // Crumple, and pinch the handles in at the top.
    const pinch = y > 0.12 ? 1 - (y - 0.12) * 1.4 : 1;
    p.setXYZ(i, x * pinch, y, Math.sin(x * 14 + r()) * 0.03 + Math.sin(y * 11) * 0.03 + (Math.abs(x) < 0.08 && y > 0.18 ? -0.05 : 0));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: '#f4f7f6', roughness: 0.35, transparent: true, opacity: 0.82, side: THREE.DoubleSide, emissive: '#3a4a50', emissiveIntensity: 0.4 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.set(-1.1, 0, 0.2);
  const g = new THREE.Group();
  g.add(mesh);
  return g;
}

function plasticBottle() {
  const profile = [
    [0, 0],
    [0.055, 0],
    [0.06, 0.01],
    [0.06, 0.17],
    [0.045, 0.21],
    [0.022, 0.24],
    [0.02, 0.27],
    [0, 0.27],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 18),
    new THREE.MeshStandardMaterial({ color: '#bfe6f2', roughness: 0.15, metalness: 0.0, transparent: true, opacity: 0.7, emissive: '#2c5866', emissiveIntensity: 0.35 }),
  );
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.025, 14), new THREE.MeshStandardMaterial({ color: '#1f6fe0', roughness: 0.5 }));
  cap.position.y = 0.282;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0615, 0.0615, 0.07, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#e0453a', roughness: 0.6 }));
  label.position.y = 0.1;
  const g = new THREE.Group();
  const bottle = new THREE.Group();
  bottle.add(body, cap, label);
  // Lying on its side, a little bigger than life so it reads on a board.
  bottle.rotation.z = Math.PI / 2;
  bottle.position.set(0.14, 0.06, 0);
  bottle.scale.setScalar(1.5);
  g.add(bottle);
  return g;
}

function netTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = '#2f8f6a';
  ctx.lineWidth = 5;
  for (let i = -128; i <= 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, 128);
    ctx.lineTo(i + 128, 0);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function fishingNet(seed: number) {
  const r = rng(seed);
  const geo = new THREE.PlaneGeometry(0.9, 0.7, 14, 12);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    // Draped in a heap, higher in the middle, with ragged folds.
    const heap = Math.max(0, 1 - Math.hypot(x / 0.45, z / 0.35)) * 0.22;
    p.setY(i, heap + Math.sin(x * 12 + r()) * 0.025 + Math.sin(z * 15) * 0.02);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: netTexture(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mat));
  // An orange float still tied to it.
  const float = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: '#f07a22', roughness: 0.5 }));
  float.position.set(0.32, 0.08, -0.18);
  g.add(float);
  return g;
}

function fishingLine(seed: number) {
  const r = rng(seed);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 26; i++) {
    const a = i * 0.9 + r() * 0.6;
    const rad = 0.12 + r() * 0.1;
    pts.push(new THREE.Vector3(Math.cos(a) * rad, 0.04 + r() * 0.16, Math.sin(a) * rad * 0.8));
  }
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.007, 5, false);
  const mat = new THREE.MeshStandardMaterial({ color: '#e9f27a', roughness: 0.3, emissive: '#5a6010', emissiveIntensity: 0.5 });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mat));
  // A hook and a lead weight make it read as fishing line.
  const weight = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshStandardMaterial({ color: '#7d8590', roughness: 0.4, metalness: 0.6 }));
  weight.position.copy(pts[pts.length - 1]);
  g.add(weight);
  return g;
}

export function buildLitter(kind: LitterKind, seed: number): THREE.Group {
  switch (kind) {
    case 'bag':
      return plasticBag(seed);
    case 'bottle':
      return plasticBottle();
    case 'net':
      return fishingNet(seed);
    case 'line':
      return fishingLine(seed);
  }
}
