/**
 * Procedural models for the featured organisms. Proportions are stylized but
 * keep approximate relative scale (1 unit ≈ 1 m); scale is part of content review.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { range, rng, type Rand } from './util.ts';

const std = (color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...extra });

/** A spindle-shaped fish body along +x (head at +x). */
function fishBody(length: number, height: number, width: number, tailTaper: number, headTaper: number) {
  const pts: THREE.Vector2[] = [];
  const peakT = tailTaper / (tailTaper + headTaper);
  const peak = Math.pow(peakT, tailTaper) * Math.pow(1 - peakT, headTaper);
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = (Math.pow(t, tailTaper) * Math.pow(1 - t, headTaper)) / peak;
    pts.push(new THREE.Vector2(Math.max(r, 0.001), t - 0.5));
  }
  const g = new THREE.LatheGeometry(pts, 18);
  g.rotateZ(-Math.PI / 2);
  g.scale(length, height / 2, width / 2);
  return g;
}

function finShape(points: [number, number][]) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function eyes(group: THREE.Group, x: number, y: number, z: number, r: number) {
  const eyeMat = std('#0b0f14', { roughness: 0.2 });
  for (const side of [1, -1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), eyeMat);
    eye.position.set(x, y, z * side);
    group.add(eye);
  }
}

export interface FishRig {
  group: THREE.Group;
  tail: THREE.Object3D;
}

export function buildParrotfish(): FishRig {
  const g = new THREE.Group();
  const L = 0.45;
  const body = new THREE.Mesh(fishBody(L, 0.17, 0.09, 0.55, 0.32), std('#1f9e6a', { roughness: 0.45 }));
  g.add(body);
  // Pale belly band and the yellow spot near the tail base (terminal-phase colors).
  const belly = new THREE.Mesh(fishBody(L * 0.7, 0.06, 0.07, 0.6, 0.4), std('#5fd3a0', { roughness: 0.5 }));
  belly.position.set(0.02, -0.045, 0);
  g.add(belly);
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), std('#f6d23a', { emissive: '#3a2a00' }));
  spot.scale.set(1, 1.2, 1.6);
  spot.position.set(-L * 0.3, 0.035, 0);
  g.add(spot);
  // Beak-like fused teeth.
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.07, 12), std('#f4fbf7', { roughness: 0.25, emissive: '#2a3a33' }));
  beak.rotation.z = -Math.PI / 2;
  beak.scale.set(1, 1, 0.8);
  beak.position.set(L * 0.5 + 0.005, -0.015, 0);
  g.add(beak);
  const finMat = std('#2bb57c', { side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
  const dorsal = new THREE.Mesh(finShape([[-0.15, 0.06], [0.12, 0.07], [0.1, 0.1], [-0.13, 0.09]]), finMat);
  g.add(dorsal);
  const tail = new THREE.Group();
  const tailFin = new THREE.Mesh(finShape([[0, 0], [-0.1, 0.08], [-0.075, 0], [-0.1, -0.08]]), std('#f0a53a', { side: THREE.DoubleSide }));
  tail.add(tailFin);
  tail.position.set(-L * 0.47, 0, 0);
  g.add(tail);
  eyes(g, L * 0.33, 0.03, 0.04, 0.012);
  return { group: g, tail };
}

export function buildBarracuda(): FishRig {
  const g = new THREE.Group();
  const L = 1.3;
  const silver = std('#c7d2dc', { metalness: 0.55, roughness: 0.32 });
  g.add(new THREE.Mesh(fishBody(L, 0.17, 0.13, 0.42, 0.75), silver));
  const back = new THREE.Mesh(fishBody(L * 0.9, 0.08, 0.1, 0.45, 0.7), std('#55677a', { metalness: 0.4, roughness: 0.4 }));
  back.position.y = 0.035;
  g.add(back);
  // Dark blotches along the lower side.
  const blotchMat = std('#1f2a35', { roughness: 0.5 });
  for (let i = 0; i < 7; i++) {
    for (const side of [1, -1]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), blotchMat);
      b.scale.set(1.2, 0.8, 0.25);
      const x = -L * 0.32 + i * L * 0.08;
      b.position.set(x, -0.02, side * 0.055 * (1 - Math.abs(x) * 0.6));
      g.add(b);
    }
  }
  // Long lower jaw.
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 10), silver);
  jaw.rotation.z = -Math.PI / 2;
  jaw.position.set(L * 0.5, -0.02, 0);
  g.add(jaw);
  const finMat = std('#3b4855', { side: THREE.DoubleSide });
  const d1 = new THREE.Mesh(finShape([[0, 0.06], [0.1, 0.06], [0.02, 0.14]]), finMat);
  d1.position.x = 0.05;
  g.add(d1);
  const d2 = new THREE.Mesh(finShape([[0, 0.05], [0.09, 0.05], [0.0, 0.11]]), finMat);
  d2.position.x = -0.35;
  g.add(d2);
  const tail = new THREE.Group();
  tail.add(new THREE.Mesh(finShape([[0, 0], [-0.17, 0.15], [-0.11, 0], [-0.17, -0.15]]), finMat));
  tail.position.set(-L * 0.48, 0, 0);
  g.add(tail);
  eyes(g, L * 0.38, 0.025, 0.045, 0.016);
  return { group: g, tail };
}

/** A small, unprofiled reef fish used only to show shelter use. */
export function buildSmallFish(): FishRig {
  const g = new THREE.Group();
  const L = 0.14;
  g.add(new THREE.Mesh(fishBody(L, 0.075, 0.035, 0.5, 0.4), std('#3d6fe0', { roughness: 0.35, emissive: '#0a1640' })));
  const tail = new THREE.Group();
  tail.add(new THREE.Mesh(finShape([[0, 0], [-0.04, 0.035], [-0.03, 0], [-0.04, -0.035]]), std('#f5d23f', { side: THREE.DoubleSide, emissive: '#3a2c00' })));
  tail.position.set(-L * 0.47, 0, 0);
  g.add(tail);
  eyes(g, L * 0.32, 0.012, 0.016, 0.006);
  return { group: g, tail };
}

function shellTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#6e5130';
  ctx.fillRect(0, 0, 256, 256);
  const r = rng(7);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const cx = col * 56 + (row % 2) * 28 + 4;
      const cy = row * 56 + 20;
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 34);
      grad.addColorStop(0, '#c49a5a');
      grad.addColorStop(0.6, '#94683a');
      grad.addColorStop(1, '#4f3519');
      ctx.fillStyle = grad;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.5;
        const rr = 26 + r() * 4;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(214,182,120,0.5)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 7; k++) {
        const a = r() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22);
        ctx.stroke();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface TurtleRig {
  group: THREE.Group;
  flippers: THREE.Object3D[];
  head: THREE.Object3D;
}

export function buildTurtle(): TurtleRig {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 20), std('#ffffff', { map: shellTexture(), roughness: 0.55 }));
  shell.scale.set(1, 0.32, 0.8);
  shell.position.y = 0.06;
  g.add(shell);
  const plastron = new THREE.Mesh(new THREE.SphereGeometry(0.47, 24, 12), std('#d8c79a'));
  plastron.scale.set(1, 0.14, 0.76);
  plastron.position.y = 0.0;
  g.add(plastron);
  const skin = std('#7c8a5a', { roughness: 0.8 });
  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), skin);
  skull.scale.set(1.35, 0.85, 0.95);
  head.add(skull);
  eyes(head, 0.06, 0.03, 0.065, 0.014);
  head.position.set(0.58, 0.05, 0);
  g.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.16, 12), skin);
  neck.rotation.z = Math.PI / 2;
  neck.position.set(0.47, 0.04, 0);
  g.add(neck);
  const flippers: THREE.Object3D[] = [];
  const flipperGeo = new THREE.SphereGeometry(0.5, 16, 8);
  for (const [x, z, len, w, ang] of [
    [0.25, 0.36, 0.55, 0.16, -0.5],
    [0.25, -0.36, 0.55, 0.16, 0.5],
    [-0.35, 0.28, 0.25, 0.12, -1.0],
    [-0.35, -0.28, 0.25, 0.12, 1.0],
  ] as const) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.02, z);
    pivot.rotation.y = ang + (z > 0 ? -0.6 : 0.6);
    const fl = new THREE.Mesh(flipperGeo, skin);
    fl.scale.set(len, 0.035, w);
    fl.position.set(-len * 0.35, 0, z > 0 ? w * 0.6 : -w * 0.6);
    pivot.add(fl);
    g.add(pivot);
    flippers.push(pivot);
  }
  return { group: g, flippers, head };
}

export function buildConch(): THREE.Group {
  const g = new THREE.Group();
  const shellMat = std('#b8996b', { roughness: 0.75 });
  const algaeMat = std('#7d8a47', { roughness: 0.9 });
  // Main body whorl and spire, lying on its side.
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 20), shellMat);
  body.rotation.z = Math.PI / 2;
  body.scale.set(1, 1, 0.85);
  g.add(body);
  const r = rng(11);
  for (let i = 0; i < 9; i++) {
    const t = i / 9;
    const knob = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.045, 8), i % 3 === 0 ? algaeMat : shellMat);
    const a = t * Math.PI * 2.5;
    knob.position.set(-0.02 - t * 0.09, Math.cos(a) * 0.075 * (1 - t * 0.5), Math.sin(a) * 0.075 * (1 - t * 0.5));
    knob.lookAt(knob.position.clone().multiplyScalar(2).setX(knob.position.x));
    knob.rotateX(Math.PI / 2);
    g.add(knob);
  }
  // Patches of algae growing on the shell help it blend in.
  for (let i = 0; i < 6; i++) {
    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), algaeMat);
    patch.scale.set(1.4, 0.4, 1.2);
    patch.position.set(range(r, -0.08, 0.08), 0.05 + r() * 0.03, range(r, -0.06, 0.06));
    g.add(patch);
  }
  // The flared pink lip.
  const lipShape = new THREE.Shape();
  lipShape.moveTo(0, 0);
  lipShape.quadraticCurveTo(0.08, 0.16, -0.06, 0.2);
  lipShape.quadraticCurveTo(-0.16, 0.12, -0.12, 0);
  lipShape.closePath();
  const lip = new THREE.Mesh(
    new THREE.ShapeGeometry(lipShape, 12),
    std('#f2a3a0', { side: THREE.DoubleSide, roughness: 0.25, emissive: '#3a1010' }),
  );
  lip.rotation.set(-Math.PI / 2 + 0.25, 0, 0.2);
  lip.position.set(0.06, -0.02, 0.05);
  g.add(lip);
  return g;
}

export interface CoralColony {
  group: THREE.Group;
  /** Branches removed in the "fewer hiding places" example. */
  removable: THREE.Mesh | null;
  rubble: THREE.Mesh | null;
}

function branch(r: Rand, from: THREE.Vector3, dir: THREE.Vector3, len: number, radius: number, base: number, tip: number) {
  const shaft = new THREE.CylinderGeometry(radius * 0.75, radius, len, 9, 3);
  shaft.translate(0, len / 2, 0);
  // Rounded growing tip.
  const cap = new THREE.SphereGeometry(radius * 0.75, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  cap.translate(0, len, 0);
  const geo = mergeGeometries([shaft, cap]);
  shaft.dispose();
  cap.dispose();
  geo.scale(2.1, 1, 0.75); // flattened, paddle-like branches
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const roll = new THREE.Quaternion().setFromAxisAngle(dir.clone().normalize(), range(r, -0.4, 0.4));
  geo.applyQuaternion(roll.multiply(q));
  geo.translate(from.x, from.y, from.z);
  // Color: darker golden-brown at the base, paler toward growing tips.
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const dark = new THREE.Color('#7a4a14');
  const pale = new THREE.Color('#d6a650');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const along = THREE.MathUtils.clamp((new THREE.Vector3().fromBufferAttribute(pos, i).sub(from).dot(dir.clone().normalize())) / len, 0, 1);
    c.copy(dark).lerp(pale, base + (tip - base) * along);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/**
 * An elkhorn coral colony: a short trunk with wide, flattened branches that
 * spread outward and upward. With `split`, half of the branches are kept in a
 * separate mesh so the shelter comparison can remove them.
 */
export function buildElkhorn(seed: number, scale = 1, split = false): CoralColony {
  const r = rng(seed);
  const kept: THREE.BufferGeometry[] = [];
  const removable: THREE.BufferGeometry[] = [];
  const trunkTop = new THREE.Vector3(0, 0.45 * scale, 0);
  kept.push(branch(r, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 0.5 * scale, 0.17 * scale, 0, 0.1));
  const primaries = 6;
  for (let i = 0; i < primaries; i++) {
    const a = (i / primaries) * Math.PI * 2 + range(r, -0.3, 0.3);
    const tilt = range(r, 0.35, 0.7);
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(tilt), Math.sin(tilt), Math.sin(a) * Math.cos(tilt));
    const len = range(r, 0.75, 1.05) * scale;
    const bucket = split && i % 2 === 1 ? removable : kept;
    bucket.push(branch(r, trunkTop, dir, len, 0.11 * scale, 0.1, 0.55));
    const end = trunkTop.clone().addScaledVector(dir, len * 0.95);
    for (let k = 0; k < 2; k++) {
      const spread = (k === 0 ? 1 : -1) * range(r, 0.35, 0.65);
      const d2 = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
      d2.y = Math.max(0.15, d2.y + range(r, -0.1, 0.25));
      bucket.push(branch(r, end, d2, range(r, 0.4, 0.65) * scale, 0.075 * scale, 0.5, 1));
    }
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const group = new THREE.Group();
  const keptMesh = new THREE.Mesh(mergeGeometries(kept), mat);
  keptMesh.castShadow = true;
  group.add(keptMesh);
  let removableMesh: THREE.Mesh | null = null;
  let rubbleMesh: THREE.Mesh | null = null;
  if (removable.length) {
    removableMesh = new THREE.Mesh(mergeGeometries(removable), mat);
    removableMesh.castShadow = true;
    group.add(removableMesh);
    const pieces: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const a = range(r, 0, Math.PI * 2);
      const from = new THREE.Vector3(Math.cos(a) * range(r, 0.5, 1.3), 0.04, Math.sin(a) * range(r, 0.5, 1.3));
      pieces.push(branch(r, from, new THREE.Vector3(Math.cos(a + 1.3), 0.05, Math.sin(a + 1.3)), range(r, 0.25, 0.45), 0.06, 0.2, 0.6));
    }
    rubbleMesh = new THREE.Mesh(mergeGeometries(pieces), new THREE.MeshStandardMaterial({ color: '#a89f8a', roughness: 1 }));
    rubbleMesh.visible = false;
    group.add(rubbleMesh);
  }
  for (const g of [...kept, ...removable]) g.dispose();
  return { group, removable: removableMesh, rubble: rubbleMesh };
}
