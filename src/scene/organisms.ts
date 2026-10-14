/**
 * Procedural models for the featured organisms. Proportions are stylized but
 * keep approximate relative scale (1 unit ≈ 1 m); scale is part of content review.
 * Shapes stay simple; the detail lives in painted skins (see skins.ts).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { blotches, countershade, eyeTexture, finTexture, grain, paint, scales } from './skins.ts';
import { range, rng, type Rand } from './util.ts';

export const std = (color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...extra });

/**
 * A fish body along +x (head at +x), as rings of ellipses. UVs are an
 * "unrolled side view": u from tail (0) to head (1), v from belly (0) to back
 * (1), the same on both sides, so skins can be painted as a side view.
 */
export function fishBody(length: number, height: number, width: number, tailTaper: number, headTaper: number, opts: { stations?: number; radial?: number; squashTail?: number } = {}) {
  const S = opts.stations ?? 40;
  const R = opts.radial ?? 28;
  const peakT = tailTaper / (tailTaper + headTaper);
  const peak = Math.pow(peakT, tailTaper) * Math.pow(1 - peakT, headTaper);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= S; i++) {
    const t = i / S;
    const p = Math.max(0.004, (Math.pow(t, tailTaper) * Math.pow(1 - t, headTaper)) / peak);
    const h = (height / 2) * p;
    // Fish are flatter side to side toward the tail.
    const w = (width / 2) * p * (1 - (opts.squashTail ?? 0.35) * (1 - t));
    for (let j = 0; j <= R; j++) {
      // Start the seam on the belly, where it can't be seen.
      const a = -Math.PI / 2 + (j / R) * Math.PI * 2;
      const s = Math.sin(a);
      // A slightly fuller belly than back.
      const y = s * h * (s < 0 ? 1.06 : 1);
      pos.push((t - 0.5) * length, y, Math.cos(a) * w);
      uv.push(t, 0.5 + 0.5 * s);
    }
  }
  for (let i = 0; i < S; i++)
    for (let j = 0; j < R; j++) {
      const a = i * (R + 1) + j;
      const b = a + R + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A flat fin from an outline. UVs are normalised so the fin texture's rays run
 * from the fin's base outward: `up` (dorsal), `down` (anal, pelvic) or `back` (tail).
 */
export function finShape(points: [number, number][], rays: 'up' | 'down' | 'back' = 'up') {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape, 8);
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const dx = b.max.x - b.min.x || 1;
  const dy = b.max.y - b.min.y || 1;
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = (pos.getX(i) - b.min.x) / dx;
    const ny = (pos.getY(i) - b.min.y) / dy;
    if (rays === 'up') uv.setXY(i, nx, ny);
    else if (rays === 'down') uv.setXY(i, nx, 1 - ny);
    else uv.setXY(i, ny, 1 - nx);
  }
  return g;
}

/** A fin material: the shared ray texture tinted with the fin's colour. */
export function finMat(color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) {
  return std(color, { map: finTexture(), transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, roughness: 0.5, depthWrite: true, ...extra });
}

/** A pair of eyes: domes with a painted iris and pupil facing outward. */
export function eyes(group: THREE.Group, x: number, y: number, z: number, r: number, iris = '#d8b24a') {
  const geo = new THREE.SphereGeometry(r, 16, 12);
  // Project the eye texture straight on from the side, so the iris sits in the middle of the outward face.
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + (0.5 * pos.getX(i)) / r, 0.5 + (0.5 * pos.getY(i)) / r);
  const mat = std('#ffffff', { map: eyeTexture(iris), roughness: 0.12 });
  mat.userData.noSkin = true;
  for (const side of [1, -1]) {
    const eye = new THREE.Mesh(geo, mat);
    eye.position.set(x, y, z * side);
    eye.scale.set(1, 1, 0.7);
    group.add(eye);
  }
}

export interface FishRig {
  group: THREE.Group;
  tail: THREE.Object3D;
}

// ── Skins ────────────────────────────────────────────────────────────────────

const parrotSkin = () =>
  paint('parrotfish', 512, 256, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#0f6a45'],
      [0.45, '#1c9b66'],
      [0.8, '#4cc59a'],
      [1, '#9fe0c6'],
    ]);
    scales(ctx, w, h, 16, '#0a4a2e', 0.55, 0.06, 0.8);
    blotches(ctx, w, h, 3, 20, 8, 20, '#7fe3b5', 0.18, [0.1, 0.1, 0.8, 0.6]);
    // Salmon-pink bands across the head.
    ctx.strokeStyle = '#ef8f7c';
    ctx.lineCap = 'round';
    ctx.lineWidth = h * 0.07;
    for (const [x0, y0, x1, y1] of [
      [0.84, 0.62, 0.99, 0.48],
      [0.86, 0.85, 0.99, 0.72],
    ])
      ctx.beginPath(), ctx.moveTo(x0 * w, y0 * h), ctx.lineTo(x1 * w, y1 * h), ctx.stroke();
    // The bright yellow "stoplight" spot on the upper gill cover.
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.ellipse(0.79 * w, 0.32 * h, h * 0.07, h * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    // Orange-yellow bar where the tail starts.
    const g = ctx.createLinearGradient(0.03 * w, 0, 0.12 * w, 0);
    g.addColorStop(0, 'rgba(246,166,58,0)');
    g.addColorStop(0.5, 'rgba(246,166,58,0.95)');
    g.addColorStop(1, 'rgba(246,166,58,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0.03 * w, 0.15 * h, 0.09 * w, 0.7 * h);
    grain(ctx, w, h, 5, 0.12);
  });

const barracudaSkin = () =>
  paint('barracuda', 1024, 192, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#34465a'],
      [0.3, '#7d8fa0'],
      [0.55, '#cdd7df'],
      [1, '#f3f6f8'],
    ]);
    // Dark, slanted bars along the upper side.
    ctx.fillStyle = 'rgba(30,42,56,0.55)';
    for (let i = 0; i < 20; i++) {
      const x = (0.14 + i * 0.033) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 0.012 * w, 0);
      ctx.lineTo(x - 0.004 * w, 0.42 * h);
      ctx.lineTo(x - 0.014 * w, 0.42 * h);
      ctx.fill();
    }
    // Scattered black blotches on the lower side toward the tail.
    blotches(ctx, w, h, 17, 16, 6, 10, 'rgba(10,14,18,1)', 0.8, [0.08, 0.55, 0.55, 0.78]);
    // Lateral line.
    ctx.strokeStyle = 'rgba(40,50,60,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0.05 * w, 0.45 * h);
    ctx.quadraticCurveTo(0.5 * w, 0.4 * h, 0.9 * w, 0.42 * h);
    ctx.stroke();
    scales(ctx, w, h, 9, '#ffffff', 0.08, 0.05, 0.85);
  });

const blueFishSkin = () =>
  paint('shelter-fish', 256, 128, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#1d47b8'],
      [0.6, '#3f74e6'],
      [1, '#a9c4ff'],
    ]);
    scales(ctx, w, h, 9, '#0d2a7a', 0.45, 0.05, 0.85);
  });

// ── Featured fish ────────────────────────────────────────────────────────────

export function buildParrotfish(): FishRig {
  const g = new THREE.Group();
  const L = 0.45;
  const body = new THREE.Mesh(fishBody(L, 0.17, 0.095, 0.55, 0.28), std('#ffffff', { map: parrotSkin(), roughness: 0.42 }));
  g.add(body);
  // Beak-like fused teeth: two pale plates meeting at the front.
  const beakMat = std('#eef6f2', { roughness: 0.25, emissive: '#2a3a33' });
  for (const s of [1, -1]) {
    const plate = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10, 0, Math.PI), beakMat);
    plate.scale.set(1.3, 0.55, 0.8);
    plate.rotation.x = s > 0 ? 0 : Math.PI;
    plate.position.set(L * 0.5 - 0.012, -0.012 + s * 0.007, 0);
    g.add(plate);
  }
  const green = finMat('#36c48a');
  const orange = finMat('#f0a53a');
  // Long dorsal and anal fins, a pectoral fin on each side, and a squared-off tail.
  const dorsal = new THREE.Mesh(finShape([[-0.16, 0.05], [0.13, 0.065], [0.11, 0.1], [-0.1, 0.095], [-0.17, 0.07]]), green);
  g.add(dorsal);
  const anal = new THREE.Mesh(finShape([[-0.15, -0.055], [0.0, -0.06], [-0.03, -0.095], [-0.14, -0.085]], 'down'), green);
  g.add(anal);
  for (const s of [1, -1]) {
    const pec = new THREE.Mesh(finShape([[0, 0], [-0.07, 0.025], [-0.08, -0.015], [-0.02, -0.02]], 'back'), finMat('#8fe0b9'));
    pec.position.set(L * 0.22, -0.01, s * 0.045);
    pec.rotation.y = s * 0.5;
    g.add(pec);
  }
  const tail = new THREE.Group();
  tail.add(new THREE.Mesh(finShape([[0, 0.012], [-0.1, 0.085], [-0.085, 0], [-0.1, -0.085], [0, -0.012]], 'back'), orange));
  tail.position.set(-L * 0.47, 0, 0);
  g.add(tail);
  eyes(g, L * 0.36, 0.028, 0.034, 0.014, '#e3c25c');
  return { group: g, tail };
}

export function buildBarracuda(): FishRig {
  const g = new THREE.Group();
  const L = 1.3;
  const body = new THREE.Mesh(fishBody(L, 0.17, 0.13, 0.42, 0.75, { stations: 56 }), std('#ffffff', { map: barracudaSkin(), metalness: 0.35, roughness: 0.32 }));
  g.add(body);
  // Long, jutting lower jaw (the underbite) with a pointed upper jaw above it.
  const silver = std('#c7d2dc', { metalness: 0.45, roughness: 0.3 });
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.2, 14), silver);
  jaw.rotation.z = -Math.PI / 2;
  jaw.scale.set(1, 1, 0.75);
  jaw.position.set(L * 0.5 + 0.02, -0.022, 0);
  g.add(jaw);
  const fin = finMat('#46566a');
  const d1 = new THREE.Mesh(finShape([[0, 0.065], [0.11, 0.07], [0.03, 0.15]]), fin);
  d1.position.x = 0.04;
  g.add(d1);
  const d2 = new THREE.Mesh(finShape([[0, 0.05], [0.1, 0.05], [0.0, 0.12]]), fin);
  d2.position.x = -0.36;
  g.add(d2);
  const anal = new THREE.Mesh(finShape([[0, -0.05], [0.1, -0.05], [0.0, -0.11]], 'down'), fin);
  anal.position.x = -0.36;
  g.add(anal);
  for (const s of [1, -1]) {
    const pec = new THREE.Mesh(finShape([[0, 0], [-0.1, 0.02], [-0.11, -0.01], [-0.02, -0.015]], 'back'), finMat('#9aa8b6'));
    pec.position.set(L * 0.3, -0.03, s * 0.055);
    pec.rotation.y = s * 0.45;
    g.add(pec);
  }
  // Forked tail, dark with pale tips.
  const tail = new THREE.Group();
  tail.add(new THREE.Mesh(finShape([[0, 0.015], [-0.18, 0.16], [-0.15, 0.13], [-0.1, 0], [-0.15, -0.13], [-0.18, -0.16], [0, -0.015]], 'back'), finMat('#2f3b48')));
  tail.position.set(-L * 0.48, 0, 0);
  g.add(tail);
  eyes(g, L * 0.39, 0.024, 0.045, 0.018, '#c9c2a2');
  return { group: g, tail };
}

/** A small, unprofiled reef fish used only to show shelter use. */
export function buildSmallFish(): FishRig {
  const g = new THREE.Group();
  const L = 0.14;
  g.add(new THREE.Mesh(fishBody(L, 0.075, 0.035, 0.5, 0.35), std('#ffffff', { map: blueFishSkin(), roughness: 0.35, emissive: '#0a1640' })));
  g.add(new THREE.Mesh(finShape([[-0.04, 0.025], [0.03, 0.03], [-0.03, 0.05]]), finMat('#5b86f0')));
  const tail = new THREE.Group();
  tail.add(new THREE.Mesh(finShape([[0, 0.006], [-0.04, 0.035], [-0.03, 0], [-0.04, -0.035], [0, -0.006]], 'back'), finMat('#f5d23f', { emissive: '#3a2c00' })));
  tail.position.set(-L * 0.47, 0, 0);
  g.add(tail);
  eyes(g, L * 0.33, 0.01, 0.014, 0.007);
  return { group: g, tail };
}

// ── Green sea turtle ─────────────────────────────────────────────────────────

/**
 * Cells for scute and scale patterns: nearest and second-nearest of a set of
 * seed points, drawn pixel by pixel (the image is small, so this is fast).
 */
function cellPaint(ctx: CanvasRenderingContext2D, w: number, h: number, seeds: [number, number][], fill: (i: number, d1: number, edge: number, ang: number, x: number, y: number) => [number, number, number]) {
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      let d1 = 9;
      let d2 = 9;
      let k = 0;
      for (let i = 0; i < seeds.length; i++) {
        const d = Math.hypot(u - seeds[i][0], v - seeds[i][1]);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          k = i;
        } else if (d < d2) d2 = d;
      }
      const [r, g, b] = fill(k, d1, d2 - d1, Math.atan2(v - seeds[k][1], u - seeds[k][0]), u, v);
      const o = (y * w + x) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
}

/** The carapace seen from above: five central scutes, four on each side and a ring of small ones at the rim. */
const shellSkin = () =>
  paint('turtle-shell', 512, 512, (ctx, w, h) => {
    const seeds: [number, number][] = [];
    // u runs tail (0) to head (1); v runs across the shell.
    for (let i = 0; i < 5; i++) seeds.push([0.2 + i * 0.15, 0.5]);
    for (const side of [0.24, 0.76]) for (let i = 0; i < 4; i++) seeds.push([0.25 + i * 0.165, side]);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      seeds.push([0.5 + Math.cos(a) * 0.47, 0.5 + Math.sin(a) * 0.47]);
    }
    const r = rng(9);
    const tint = seeds.map(() => 0.85 + r() * 0.3);
    cellPaint(ctx, w, h, seeds, (k, d1, edge, ang) => {
      // Each scute has a sunburst of pale streaks radiating from its centre.
      const burst = 0.5 + 0.5 * Math.sin(ang * 9 + k * 1.7 + Math.sin(ang * 3) * 1.5);
      const streak = burst * Math.min(1, d1 * 9) * 0.55;
      const base = [96, 72, 40].map((c) => c * tint[k]);
      const light = [196, 160, 92];
      let c = base.map((x, i) => x + (light[i] - x) * streak);
      // Pale seams between scutes.
      if (edge < 0.012) c = c.map((x) => x + (225 - x) * (1 - edge / 0.012) * 0.6);
      return c as [number, number, number];
    });
    grain(ctx, w, h, 13, 0.15);
  });

/** Head and flipper skin: large polygonal scales with pale edges. */
const scaleSkin = () =>
  paint('turtle-skin', 256, 256, (ctx, w, h) => {
    const r = rng(21);
    const seeds: [number, number][] = Array.from({ length: 70 }, () => [r(), r()]);
    cellPaint(ctx, w, h, seeds, (k, _d1, edge) => {
      const t = 0.85 + ((k * 37) % 11) / 40;
      const base: [number, number, number] = [92 * t, 98 * t, 62 * t];
      if (edge < 0.02) return base.map((x) => x + (214 - x) * (1 - edge / 0.02) * 0.7) as [number, number, number];
      return base;
    });
  });

/** UVs from a top-down projection, normalised to the geometry's footprint. */
function topUV(g: THREE.BufferGeometry) {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - b.min.x) / (b.max.x - b.min.x || 1);
    uv[i * 2 + 1] = (pos.getZ(i) - b.min.z) / (b.max.z - b.min.z || 1);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** A flat, rounded paddle (flipper) from an outline in the x–z plane, with bevelled edges. */
function paddle(outline: [number, number][], thickness: number) {
  const shape = new THREE.Shape();
  shape.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) {
    const [x, z] = outline[i];
    const [px, pz] = outline[i - 1];
    shape.quadraticCurveTo(px, pz, (px + x) / 2, (pz + z) / 2);
    shape.lineTo(x, z);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness * 0.4, bevelEnabled: true, bevelThickness: thickness * 0.3, bevelSize: thickness * 0.5, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -thickness * 0.2);
  // Shape y becomes z (sideways), extrusion becomes vertical.
  g.rotateX(Math.PI / 2);
  topUV(g);
  g.computeVertexNormals();
  return g;
}

export interface TurtleRig {
  group: THREE.Group;
  flippers: THREE.Object3D[];
  head: THREE.Object3D;
}

export function buildTurtle(): TurtleRig {
  const g = new THREE.Group();
  // Carapace: a low dome, a little narrower at the back, with the scute pattern mapped from above.
  const shellGeo = new THREE.SphereGeometry(0.5, 48, 18, 0, Math.PI * 2, 0, Math.PI / 2);
  const sp = shellGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i);
    const y = sp.getY(i);
    const z = sp.getZ(i);
    const rear = Math.max(0, -x / 0.5);
    // Flatter crown, a slight keel down the middle, and a tapered rear.
    sp.setXYZ(i, x, Math.pow(Math.max(0, y) / 0.5, 0.8) * 0.5 * 0.34 + Math.max(0, 0.02 - Math.abs(z) * 0.06), z * 0.82 * (1 - 0.16 * rear * rear));
  }
  topUV(shellGeo);
  shellGeo.computeVertexNormals();
  const shell = new THREE.Mesh(shellGeo, std('#ffffff', { map: shellSkin(), roughness: 0.5 }));
  shell.position.y = 0.02;
  g.add(shell);
  // Rim of the shell and the pale underside (plastron).
  const plastron = new THREE.Mesh(new THREE.SphereGeometry(0.47, 32, 12), std('#e1d2a2', { roughness: 0.7 }));
  plastron.scale.set(1, 0.12, 0.74);
  plastron.position.y = 0.0;
  g.add(plastron);
  const skinTex = scaleSkin();
  const skin = std('#ffffff', { map: skinTex, roughness: 0.75 });
  // Head: blunt and rounded, on a short neck.
  const head = new THREE.Group();
  const skullGeo = new THREE.SphereGeometry(0.1, 24, 16);
  const kp = skullGeo.attributes.position;
  for (let i = 0; i < kp.count; i++) {
    const x = kp.getX(i);
    // Taper toward a short, rounded snout.
    const k = x > 0 ? 1 - (x / 0.1) * 0.25 : 1;
    kp.setXYZ(i, x * 1.35, kp.getY(i) * 0.82 * k, kp.getZ(i) * 0.92 * k);
  }
  skullGeo.computeVertexNormals();
  const skull = new THREE.Mesh(skullGeo, skin);
  head.add(skull);
  // A darker beak line along the mouth.
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.006, 6, 20, Math.PI * 0.6), std('#3b3020'));
  mouth.rotation.set(Math.PI / 2, 0, -Math.PI * 0.3);
  mouth.position.set(0.03, -0.035, 0);
  head.add(mouth);
  eyes(head, 0.07, 0.025, 0.06, 0.017, '#6b4a22');
  head.position.set(0.58, 0.05, 0);
  g.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.082, 0.18, 16), skin);
  neck.rotation.z = Math.PI / 2;
  neck.position.set(0.47, 0.035, 0);
  g.add(neck);
  // Flippers: long, swept-back front flippers and short, rounded rear ones.
  const flippers: THREE.Object3D[] = [];
  const front: [number, number][] = [[0.06, 0], [0.06, 0.1], [-0.02, 0.32], [-0.18, 0.56], [-0.25, 0.54], [-0.15, 0.3], [-0.07, 0.07]];
  const rear: [number, number][] = [[0.02, 0], [0.01, 0.07], [-0.07, 0.16], [-0.15, 0.17], [-0.16, 0.09], [-0.09, 0.01]];
  for (const [x, z, outline, side] of [
    [0.24, 0.3, front, 1],
    [0.24, -0.3, front, -1],
    [-0.32, 0.24, rear, 1],
    [-0.32, -0.24, rear, -1],
  ] as const) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.015, z);
    const fl = new THREE.Mesh(paddle(outline.map(([px, pz]) => [px, pz * side] as [number, number]), 0.035), skin);
    pivot.add(fl);
    g.add(pivot);
    flippers.push(pivot);
  }
  return { group: g, flippers, head };
}

// ── Queen conch ──────────────────────────────────────────────────────────────

const conchSkin = () =>
  paint('conch', 256, 256, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#cdb084'],
      [1, '#a98a5e'],
    ]);
    // Wavy growth bands and a periostracum (outer skin) of algae-tinged brown.
    ctx.strokeStyle = 'rgba(120,88,52,0.45)';
    for (let i = 0; i < 18; i++) {
      ctx.lineWidth = 2 + (i % 3);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, i * (h / 18) + Math.sin(x * 0.08 + i) * 3);
      ctx.stroke();
    }
    blotches(ctx, w, h, 31, 18, 8, 22, 'rgba(110,124,64,1)', 0.35);
    grain(ctx, w, h, 33, 0.2);
  });

export function buildConch(): THREE.Group {
  const g = new THREE.Group();
  const shellMat = std('#ffffff', { map: conchSkin(), roughness: 0.7 });
  const algaeMat = std('#7d8a47', { roughness: 0.9 });
  // Body whorl and stepped spire as one lathe, lying on its side.
  const profile: THREE.Vector2[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // Wide body whorl tapering to a stepped, pointed spire.
    const r = t < 0.55 ? 0.11 * Math.sin((t / 0.55) * Math.PI * 0.5 + 0.35) : 0.11 * (1 - (t - 0.55) / 0.45) * (0.9 + 0.1 * Math.cos(t * 40));
    profile.push(new THREE.Vector2(Math.max(0.002, r), t * 0.3 - 0.12));
  }
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), shellMat);
  body.rotation.z = Math.PI / 2 + 0.15;
  body.scale.set(1, 1, 0.85);
  g.add(body);
  // A crown of knobs on the shoulder of each whorl.
  for (let i = 0; i < 9; i++) {
    const t = i / 9;
    const knob = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.045, 8), i % 3 === 0 ? algaeMat : shellMat);
    const a = t * Math.PI * 2.5;
    const rad = 0.085 * (1 - t * 0.5);
    knob.position.set(-0.03 - t * 0.09, Math.cos(a) * rad, Math.sin(a) * rad);
    knob.lookAt(knob.position.clone().multiplyScalar(2).setX(knob.position.x));
    knob.rotateX(Math.PI / 2);
    g.add(knob);
  }
  // The flared, glossy pink lip: a curved sheet rather than a flat cut-out.
  const lipGeo = new THREE.SphereGeometry(0.15, 20, 12, 0, Math.PI * 0.75, Math.PI * 0.2, Math.PI * 0.45);
  const lip = new THREE.Mesh(lipGeo, std('#f2a3a0', { side: THREE.DoubleSide, roughness: 0.2, emissive: '#3a1010' }));
  lip.scale.set(1, 0.45, 1);
  lip.rotation.set(0, Math.PI * 0.15, 0);
  lip.position.set(0.0, -0.03, 0.0);
  g.add(lip);
  return g;
}

// ── Elkhorn coral ────────────────────────────────────────────────────────────

export interface CoralColony {
  group: THREE.Group;
  /** Branches removed in the "fewer hiding places" example. */
  removable: THREE.Mesh | null;
  rubble: THREE.Mesh | null;
}

const ELK_BASE = new THREE.Color('#7e5219');
const ELK_MID = new THREE.Color('#c08a3a');
const ELK_TIP = new THREE.Color('#f0e2bb');

/**
 * One flattened, antler-like branch: an elliptical cross-section that widens
 * toward the tip (palmate), stays thin top to bottom, curves gently upward and
 * ends in a rounded, pale growing edge.
 */
function branch(r: Rand, from: THREE.Vector3, dir: THREE.Vector3, len: number, radius: number, base: number, tip: number, widen = 1.6) {
  const d = dir.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const bend = range(r, 0.05, 0.18);
  const curve = new THREE.CatmullRomCurve3([
    from.clone(),
    from.clone().addScaledVector(d, len * 0.35),
    from.clone().addScaledVector(d, len * 0.7).addScaledVector(up, len * bend * 0.6),
    from.clone().addScaledVector(d, len).addScaledVector(up, len * bend),
  ]);
  const S = 14;
  const R = 16;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i <= S; i++) {
    const t = i / S;
    const p = curve.getPointAt(t);
    const T = curve.getTangentAt(t);
    // Flat side faces the light: width runs horizontally, thickness vertically.
    let side = new THREE.Vector3().crossVectors(T, up);
    if (side.lengthSq() < 1e-4) side = new THREE.Vector3(1, 0, 0);
    side.normalize();
    const N = new THREE.Vector3().crossVectors(side, T).normalize();
    const cap = t > 0.82 ? Math.sqrt(Math.max(0, 1 - ((t - 0.82) / 0.18) ** 2)) : 1;
    const w = radius * (1 + (widen - 1) * Math.pow(t, 0.9)) * (0.85 + 0.15 * Math.sin(t * 7 + r())) * Math.max(cap, 0.05);
    const h = radius * 0.55 * (1 - 0.45 * t) * Math.max(cap, 0.05);
    for (let j = 0; j <= R; j++) {
      const a = (j / R) * Math.PI * 2;
      const ca = Math.cos(a);
      const v = p.clone().addScaledVector(side, ca * w).addScaledVector(N, Math.sin(a) * h);
      pos.push(v.x, v.y, v.z);
      // Darker at the base, golden along the branch, a pale growing rim at the tip and edges.
      const along = base + (tip - base) * t;
      c.copy(ELK_BASE).lerp(ELK_MID, Math.min(1, along * 1.6));
      const rim = Math.max(0, Math.abs(ca) - 0.75) * 4 * Math.max(0, t - 0.4) + Math.max(0, t - 0.8) * 3;
      c.lerp(ELK_TIP, Math.min(0.85, rim * tip));
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < S; i++)
    for (let j = 0; j < R; j++) {
      const a = i * (R + 1) + j;
      const b = a + R + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { geo, end: curve.getPointAt(0.92), dir: curve.getTangentAt(0.92) };
}

/**
 * An elkhorn coral colony: a stout trunk with broad, flattened branches that
 * spread outward and up, each splitting into flat lobes like a moose's antler.
 * With `split`, half of the branches are kept in a separate mesh so the
 * shelter comparison can remove them.
 */
export function buildElkhorn(seed: number, scale = 1, split = false): CoralColony {
  const r = rng(seed);
  const kept: THREE.BufferGeometry[] = [];
  const removable: THREE.BufferGeometry[] = [];
  const trunk = branch(r, new THREE.Vector3(0, -0.05, 0), new THREE.Vector3(0.05, 1, 0), 0.52 * scale, 0.16 * scale, 0, 0.15, 1.3);
  kept.push(trunk.geo);
  const trunkTop = new THREE.Vector3(0, 0.42 * scale, 0);
  const primaries = 6;
  for (let i = 0; i < primaries; i++) {
    const a = (i / primaries) * Math.PI * 2 + range(r, -0.3, 0.3);
    const tilt = range(r, 0.3, 0.6);
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(tilt), Math.sin(tilt), Math.sin(a) * Math.cos(tilt));
    const len = range(r, 0.7, 1.0) * scale;
    const bucket = split && i % 2 === 1 ? removable : kept;
    const main = branch(r, trunkTop, dir, len, 0.1 * scale, 0.15, 0.55, 1.9);
    bucket.push(main.geo);
    // The flat end splits into two or three lobes.
    const lobes = r() > 0.5 ? 3 : 2;
    for (let k = 0; k < lobes; k++) {
      const spread = (k - (lobes - 1) / 2) * range(r, 0.45, 0.7);
      const d2 = main.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
      d2.y = Math.max(0.12, d2.y + range(r, -0.05, 0.25));
      bucket.push(branch(r, main.end, d2, range(r, 0.32, 0.55) * scale, 0.11 * scale, 0.55, 1, 1.5).geo);
    }
  }
  // A little self-light so the shaded undersides of the flat branches stay readable.
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, emissive: '#4a3214', emissiveIntensity: 0.55 });
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
      const from = new THREE.Vector3(Math.cos(a) * range(r, 0.5, 1.3), 0.03, Math.sin(a) * range(r, 0.5, 1.3));
      pieces.push(branch(r, from, new THREE.Vector3(Math.cos(a + 1.3), 0.02, Math.sin(a + 1.3)), range(r, 0.25, 0.45), 0.06, 0.2, 0.6, 1.4).geo);
    }
    rubbleMesh = new THREE.Mesh(mergeGeometries(pieces), new THREE.MeshStandardMaterial({ color: '#a89f8a', roughness: 1 }));
    rubbleMesh.visible = false;
    group.add(rubbleMesh);
  }
  for (const geo of [...kept, ...removable]) geo.dispose();
  return { group, removable: removableMesh, rubble: rubbleMesh };
}
