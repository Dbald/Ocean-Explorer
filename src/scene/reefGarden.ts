/**
 * The living cover of the reef framework: lobed mound corals, small brain
 * corals, purple sea rods and orange encrusting sponge, scattered over the raised
 * rock (never on the sand channel) and kept clear of the animals children tap.
 * Each kind is merged into a single mesh, so the whole garden costs a few draw calls.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { reefLift, terrainHeight } from './environment.ts';
import { surface, type ReefTextures } from './textures.ts';
import { noise2, range, rng } from './util.ts';

export interface Clear {
  x: number;
  z: number;
  r: number;
}

function colorize(g: THREE.BufferGeometry, c: THREE.Color, vary: number, r: () => number) {
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const k = 1 - vary / 2 + r() * vary;
  for (let i = 0; i < n; i++) col.set([c.r * k, c.g * k, c.b * k], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** Keep only the attributes every piece shares, so the pieces can merge. */
function clean(g: THREE.BufferGeometry) {
  const out = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(out.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) out.deleteAttribute(name);
  return out;
}

/** Boulder star coral: a cluster of rounded, bulging lobes, as in the yellow-brown heads on Caribbean reefs. */
function moundHead(r: () => number, x: number, z: number, size: number, color: THREE.Color) {
  const parts: THREE.BufferGeometry[] = [];
  const lobes = 4 + Math.floor(r() * 6);
  const base = terrainHeight(x, z);
  for (let i = 0; i < lobes; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * size * 0.9;
    const rad = size * range(r, 0.35, 0.6);
    const g = new THREE.SphereGeometry(rad, 10, 7);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      // Lumpy, slightly flat-topped lobes.
      const vx = p.getX(k);
      const vy = p.getY(k);
      const vz = p.getZ(k);
      const bump = 1 + noise2(vx * 22 + i, vz * 22 + vy * 9) * 0.05;
      p.setXYZ(k, vx * bump, Math.min(vy * 1.25, rad * 0.95) * bump, vz * bump);
    }
    g.computeVertexNormals();
    const lx = x + Math.cos(a) * d;
    const lz = z + Math.sin(a) * d;
    g.translate(lx, Math.min(base, terrainHeight(lx, lz)) + rad * range(r, 0.45, 0.8), lz);
    parts.push(clean(colorize(g, color, 0.25, r)));
  }
  return parts;
}

function brainHead(r: () => number, x: number, z: number, size: number, color: THREE.Color) {
  const g = new THREE.SphereGeometry(size, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  g.scale(1, 0.75, 1);
  g.translate(x, terrainHeight(x, z) - size * 0.12, z);
  return clean(colorize(g, color, 0.2, r));
}

/** Sea rods: a bush of thin, flexible branches reaching up into the current. */
function seaRods(r: () => number, x: number, z: number, height: number, color: THREE.Color) {
  const parts: THREE.BufferGeometry[] = [];
  const y0 = terrainHeight(x, z) - 0.02;
  const n = 5 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const lean = range(r, 0.1, 0.35);
    const h = height * range(r, 0.6, 1);
    const pts = [0, 0.33, 0.66, 1].map((t) => new THREE.Vector3(x + Math.cos(a) * lean * h * t * t, y0 + h * t, z + Math.sin(a) * lean * h * t * t));
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 7, 0.013, 4, false);
    parts.push(clean(colorize(g, color, 0.3, r)));
    // A short side branch partway up.
    if (r() > 0.4) {
      const from = pts[1].clone().lerp(pts[2], r());
      const b = new THREE.Vector3(Math.cos(a + 1.2) * 0.12, h * 0.3, Math.sin(a + 1.2) * 0.12).add(from);
      parts.push(clean(colorize(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, from.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0.04, 0)), b]), 4, 0.01, 4, false), color, 0.3, r)));
    }
  }
  return parts;
}

/** Encrusting sponge: a low, irregular splash of colour on the rock. */
function encrusting(r: () => number, x: number, z: number, size: number, color: THREE.Color) {
  const g = new THREE.SphereGeometry(size, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = g.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const wob = 1 + noise2(p.getX(k) * 9 + x, p.getZ(k) * 9 + z) * 0.25;
    p.setXYZ(k, p.getX(k) * wob, p.getY(k) * 0.25, p.getZ(k) * wob);
  }
  g.computeVertexNormals();
  g.translate(x, terrainHeight(x, z) - 0.01, z);
  return clean(colorize(g, color, 0.3, r));
}

export function buildReefGarden(tex: ReefTextures, clear: Clear[], low: boolean): THREE.Group {
  const r = rng(2024);
  const group = new THREE.Group();
  group.name = 'reef-garden';
  const mounds: THREE.BufferGeometry[] = [];
  const brains: THREE.BufferGeometry[] = [];
  const rods: THREE.BufferGeometry[] = [];
  const crusts: THREE.BufferGeometry[] = [];
  const moundColors = ['#c9a24e', '#b08544', '#a39a52', '#c98d3e', '#8f7a3e'].map((c) => new THREE.Color(c));
  const brainColors = ['#c8b67a', '#b9a46a', '#9fa070'].map((c) => new THREE.Color(c));
  const rodColors = ['#7b4a9a', '#8d5aa8', '#6e5a3a', '#9a6b48'].map((c) => new THREE.Color(c));
  const crustColors = ['#e0702a', '#d65a2a', '#8e4fa0', '#c9b23a'].map((c) => new THREE.Color(c));
  const taken: Clear[] = [];
  const free = (x: number, z: number, rad: number) =>
    !clear.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + rad) && !taken.some((c) => Math.hypot(x - c.x, z - c.z) < (c.r + rad) * 0.8);
  const target = low ? 70 : 140;
  for (let tries = 0, placed = 0; placed < target && tries < target * 30; tries++) {
    const x = range(r, -23.5, -6.5);
    const z = range(r, -8.5, 2.6);
    const lift = reefLift(x, z);
    // Only on the rock framework, never in the sand channel.
    if (lift < 0.14) continue;
    const kind = r();
    if (kind < 0.42) {
      const size = range(r, 0.22, 0.5);
      if (!free(x, z, size)) continue;
      mounds.push(...moundHead(r, x, z, size, moundColors[Math.floor(r() * moundColors.length)]));
      taken.push({ x, z, r: size });
    } else if (kind < 0.55) {
      const size = range(r, 0.15, 0.32);
      if (!free(x, z, size)) continue;
      brains.push(brainHead(r, x, z, size, brainColors[Math.floor(r() * brainColors.length)]));
      taken.push({ x, z, r: size });
    } else if (kind < 0.78) {
      if (!free(x, z, 0.15)) continue;
      rods.push(...seaRods(r, x, z, range(r, 0.35, 0.75), rodColors[Math.floor(r() * rodColors.length)]));
      taken.push({ x, z, r: 0.15 });
    } else {
      const size = range(r, 0.12, 0.3);
      if (!free(x, z, size * 0.5)) continue;
      crusts.push(encrusting(r, x, z, size, crustColors[Math.floor(r() * crustColors.length)]));
      taken.push({ x, z, r: size * 0.5 });
    }
    placed++;
  }
  const add = (parts: THREE.BufferGeometry[], mat: THREE.MeshStandardMaterial) => {
    if (!parts.length) return;
    const mesh = new THREE.Mesh(mergeGeometries(parts), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    parts.forEach((p) => p.dispose());
  };
  const coral = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, map: tex.coral ?? null, normalMap: tex.coralN ?? null });
  coral.normalScale.setScalar(1.3);
  add(mounds, surface(coral, { tiles: 2.5, caustics: 0.15 }));
  const brain = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, map: tex.brain ?? null, normalMap: tex.brainN ?? null });
  brain.normalScale.setScalar(1.4);
  add(brains, surface(brain, { tiles: 2.4, caustics: 0.15 }));
  add(rods, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
  const crust = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, map: tex.coral ?? null, normalMap: tex.coralN ?? null });
  add(crusts, surface(crust, { tiles: 4 }));
  return group;
}
