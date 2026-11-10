/**
 * Expedition 3's open water: a deep-blue area off the reef's front edge, with
 * a whale shark cruising, a school of small fish, a sargassum raft at the
 * surface (mahi-mahi, a young turtle and young fish), and Gladden Spit, where
 * the reef drops away and snappers gather to spawn. Built hidden; shown only
 * during Expedition 3. Simple shapes, painted skins, like the rest of the reef.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildSargassum, type Clump } from './changing3d.ts';
import { contourFin, outlineFin, profiledBody, type Profile } from './fishkit.ts';
import { buildTurtle, eyes, finMat, std } from './organisms.ts';
import { blotches, countershade, grain, paint, scales } from './skins.ts';
import { surface, type ReefTextures } from './textures.ts';
import { noise2, range, rng, sharedTime, smoothstep, sunlight } from './util.ts';

/** Where things are, in the open-water area (z beyond the reef). */
export const OCEAN = {
  blueCenter: new THREE.Vector3(0, 2.4, 44),
  raftCenter: new THREE.Vector3(-9, 5.9, 43),
  spitCenter: new THREE.Vector3(22.5, -0.6, 45),
  surfaceY: 6.3,
};

export const OCEAN_VIEWS = {
  blue: { position: new THREE.Vector3(0, 2.3, 30), target: new THREE.Vector3(0, 2.2, 44) },
  raft: { position: new THREE.Vector3(-9, 2.0, 35.2), target: new THREE.Vector3(-9, 5.2, 42.6) },
  spit: { position: new THREE.Vector3(16.5, 2.8, 33.5), target: new THREE.Vector3(23.5, -0.2, 45) },
};

// ── Whale shark ─────────────────────────────────────────────────────────────

/** Broad, flat head with a wide mouth at the very front; deep body; tall crescent tail. */
const WHALE_SHARK: Profile = {
  top: [[0, 0.012], [0.1, 0.03], [0.35, 0.068], [0.6, 0.085], [0.8, 0.078], [0.93, 0.055], [1, 0.022]],
  bottom: [[0, -0.012], [0.1, -0.022], [0.35, -0.05], [0.6, -0.066], [0.85, -0.062], [0.97, -0.04], [1, -0.024]],
  width: [[0, 0.01], [0.3, 0.05], [0.6, 0.082], [0.85, 0.088], [0.97, 0.075], [1, 0.045]],
};

/** Dark blue-grey above with white spots between pale stripes (a checkerboard); white below. */
const whaleSharkSkin = () =>
  paint('whale-shark', 1024, 256, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#2f4352'],
      [0.45, '#40586a'],
      [0.62, '#7d8f9b'],
      [0.72, '#e4e9ec'],
      [1, '#f3f5f6'],
    ]);
    const r = rng(17);
    // Pale vertical stripes along the body.
    ctx.strokeStyle = 'rgba(225, 235, 240, 0.55)';
    ctx.lineWidth = 3;
    for (let x = 0.06; x < 0.8; x += 0.035) {
      ctx.beginPath();
      ctx.moveTo(x * w, 0);
      ctx.lineTo((x + 0.004) * w, 0.62 * h);
      ctx.stroke();
    }
    // Long ridges along the back and sides.
    ctx.strokeStyle = 'rgba(210, 222, 230, 0.6)';
    ctx.lineWidth = 2.5;
    for (const y of [0.12, 0.26, 0.4]) {
      ctx.beginPath();
      ctx.moveTo(0.05 * w, y * h);
      ctx.quadraticCurveTo(0.45 * w, (y - 0.03) * h, 0.82 * w, (y + 0.02) * h);
      ctx.stroke();
    }
    // White spots: between the stripes, smaller and closer together on the head.
    ctx.fillStyle = '#f1f5f7';
    for (let i = 0; i < 900; i++) {
      const u = r();
      const v = r() * 0.6;
      const head = u > 0.8;
      const rad = (head ? 1.5 : 2.6) + r() * (head ? 1.2 : 2.2);
      ctx.beginPath();
      ctx.arc(u * w, v * h, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    // Five gill slits behind the head.
    ctx.strokeStyle = 'rgba(25, 35, 45, 0.75)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const x = (0.79 + i * 0.012) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0.38 * h);
      ctx.quadraticCurveTo(x - 4, 0.5 * h, x, 0.64 * h);
      ctx.stroke();
    }
    grain(ctx, w, h, 19, 0.12);
  });

export interface SharkRig {
  group: THREE.Group;
  tail: THREE.Object3D;
  mouth: THREE.Mesh;
}

export function buildWhaleShark(L = 7): SharkRig {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(profiledBody(L, WHALE_SHARK, { stations: 64, radial: 36, flat: 2.6 }), std('#ffffff', { map: whaleSharkSkin(), roughness: 0.6 })));
  const fin = std('#3a4e5d', { side: THREE.DoubleSide, roughness: 0.6 });
  // Large first dorsal fin set back on the body, a small second one near the tail.
  g.add(new THREE.Mesh(outlineFin(L, [[-0.12, 0.07], [0.02, 0.08], [-0.04, 0.13], [-0.1, 0.17], [-0.14, 0.12]], 'up'), fin));
  g.add(new THREE.Mesh(outlineFin(L, [[-0.33, 0.035], [-0.27, 0.042], [-0.3, 0.065], [-0.335, 0.06]], 'up'), fin));
  for (const s of [1, -1]) {
    // Long, curved pectoral fins.
    const pec = new THREE.Mesh(outlineFin(L, [[0, 0], [-0.05, 0.03], [-0.17, 0.09], [-0.21, 0.08], [-0.12, 0.02], [-0.04, -0.01]], 'back'), fin);
    pec.rotation.x = s * (Math.PI / 2 + 0.4);
    pec.position.set(L * 0.2, -L * 0.04, s * L * 0.06);
    g.add(pec);
  }
  // The mouth: a wide, dark opening right at the front of the flat head.
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), std('#141a20', { roughness: 0.9 }));
  mouth.scale.set(0.06 * L, 0.012 * L, 0.06 * L);
  mouth.position.set(L * 0.495, -0.008 * L, 0);
  g.add(mouth);
  eyes(g, L * 0.45, 0.012 * L, 0.066 * L, 0.0055 * L, '#3a3326');
  // Tall, crescent tail: the upper lobe is longer.
  const tail = new THREE.Group();
  tail.add(new THREE.Mesh(outlineFin(L, [[0.02, 0.018], [-0.06, 0.08], [-0.14, 0.17], [-0.12, 0.09], [-0.07, 0.0], [-0.1, -0.08], [-0.06, -0.06], [0.02, -0.018]], 'back'), fin));
  tail.position.x = -L * 0.5;
  g.add(tail);
  return { group: g, tail, mouth };
}

// ── Schools (instanced: one draw call for the bodies, one for the tails) ────

interface School {
  body: THREE.InstancedMesh;
  tail: THREE.InstancedMesh;
  count: number;
  length: number;
  offsets: THREE.Vector3[];
  phases: number[];
}

function buildSchool(body: THREE.BufferGeometry, bodyMat: THREE.Material, tail: THREE.BufferGeometry, tailMat: THREE.Material, count: number, length: number, seed: number, spread: [number, number, number]): School {
  const r = rng(seed);
  const b = new THREE.InstancedMesh(body, bodyMat, count);
  const t = new THREE.InstancedMesh(tail, tailMat, count);
  b.frustumCulled = false;
  t.frustumCulled = false;
  return {
    body: b,
    tail: t,
    count,
    length,
    offsets: Array.from({ length: count }, () => new THREE.Vector3(range(r, -1, 1) * spread[0], range(r, -1, 1) * spread[1], range(r, -1, 1) * spread[2])),
    phases: Array.from({ length: count }, () => r() * Math.PI * 2),
  };
}

const tmpM = new THREE.Matrix4();
const tmpT = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);

/** Places fish i facing `yaw`, with its tail swung by `wag`. */
function poseFish(s: School, i: number, pos: THREE.Vector3, yaw: number, pitch: number, wag: number) {
  tmpM.compose(pos, tmpQ.setFromEuler(tmpE.set(0, yaw, pitch)), ONE);
  s.body.setMatrixAt(i, tmpM);
  tmpT.makeRotationY(wag);
  tmpT.setPosition(-s.length * 0.47, 0, 0);
  s.tail.setMatrixAt(i, tmpM.multiply(tmpT));
}

const snapperSkin = () =>
  paint('cubera-snapper', 256, 128, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#4a2f2c'],
      [0.5, '#7a4a3f'],
      [1, '#c79181'],
    ]);
    scales(ctx, w, h, 9, '#2a1714', 0.35, 0.05, 0.85);
    grain(ctx, w, h, 29, 0.15);
  });

const baitSkin = () =>
  paint('small-fish', 128, 64, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#2f5d7a'],
      [0.45, '#9fc3d6'],
      [0.55, '#e9f2f6'],
      [1, '#f7fafb'],
    ]);
  });

const SNAPPER: Profile = {
  top: [[0, 0.05], [0.15, 0.08], [0.45, 0.16], [0.7, 0.17], [0.88, 0.12], [1, 0.03]],
  bottom: [[0, -0.05], [0.15, -0.07], [0.45, -0.13], [0.75, -0.12], [0.9, -0.07], [1, -0.03]],
  width: [[0, 0.02], [0.5, 0.07], [0.85, 0.06], [1, 0.015]],
};
const BAIT: Profile = {
  top: [[0, 0.03], [0.2, 0.05], [0.55, 0.09], [0.85, 0.07], [1, 0.015]],
  bottom: [[0, -0.03], [0.2, -0.045], [0.55, -0.08], [0.85, -0.06], [1, -0.015]],
  width: [[0, 0.015], [0.5, 0.05], [1, 0.01]],
};

function fishGeometry(L: number, p: Profile, finned: boolean) {
  const parts = [profiledBody(L, p, { stations: 18, radial: 12 })];
  if (finned) {
    parts.push(contourFin(L, p, 0.3, 0.75, [[0, 0.02], [0.3, 0.1], [0.8, 0.07], [1, 0]], 'top'));
    parts.push(contourFin(L, p, 0.18, 0.4, [[0, 0.02], [0.5, 0.07], [1, 0]], 'bottom'));
  }
  const g = mergeGeometries(parts.map((x) => (x.index ? x : x)));
  parts.forEach((x) => x.dispose());
  return g;
}

// ── Mahi-mahi ───────────────────────────────────────────────────────────────

/** A blunt, high forehead, a long dorsal fin from head to tail, and a forked tail. */
const MAHI: Profile = {
  top: [[0, 0.03], [0.15, 0.06], [0.5, 0.11], [0.78, 0.13], [0.9, 0.12], [0.97, 0.07], [1, 0.02]],
  bottom: [[0, -0.03], [0.2, -0.05], [0.55, -0.08], [0.85, -0.07], [0.97, -0.04], [1, -0.02]],
  width: [[0, 0.012], [0.5, 0.045], [0.85, 0.045], [1, 0.012]],
};

const mahiSkin = () =>
  paint('mahi-mahi', 512, 128, (ctx, w, h) => {
    countershade(ctx, w, h, [
      [0, '#1f6f8f'],
      [0.25, '#2f9c78'],
      [0.5, '#d9c43a'],
      [0.8, '#efdc6a'],
      [1, '#f6eeb0'],
    ]);
    blotches(ctx, w, h, 37, 60, 2, 4, 'rgba(40, 110, 200, 1)', 0.8, [0.05, 0.15, 0.85, 0.7]);
    grain(ctx, w, h, 39, 0.12);
  });

export interface MahiRig {
  group: THREE.Group;
  tail: THREE.Object3D;
}

export function buildMahi(L = 1.1): MahiRig {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(profiledBody(L, MAHI, { stations: 40, radial: 24 }), std('#ffffff', { map: mahiSkin(), roughness: 0.35, metalness: 0.15 })));
  g.add(new THREE.Mesh(contourFin(L, MAHI, 0.08, 0.92, [[0, 0.02], [0.1, 0.06], [0.8, 0.07], [1, 0.02]], 'top'), finMat('#1f7fa0')));
  g.add(new THREE.Mesh(contourFin(L, MAHI, 0.08, 0.45, [[0, 0.02], [0.2, 0.05], [1, 0.01]], 'bottom'), finMat('#5fb4a0')));
  const tail = new THREE.Group();
  tail.add(new THREE.Mesh(outlineFin(L, [[0.01, 0.015], [-0.08, 0.09], [-0.12, 0.11], [-0.07, 0.0], [-0.12, -0.11], [-0.08, -0.09], [0.01, -0.015]], 'back'), finMat('#2e9a8f')));
  tail.position.x = -L * 0.5;
  g.add(tail);
  eyes(g, L * 0.4, 0.01, 0.025, 0.012);
  return { group: g, tail };
}

// ── Surface, light and plankton specks ─────────────────────────────────────

/** A tangle of sargassum (stems, serrated leaves, round floats) painted on a raft-shaped mask. */
function raftTexture() {
  return paint('raft-mat', 1024, 1024, (ctx, w, h) => {
    const r = rng(311);
    const cx = w / 2;
    const cy = h / 2;
    const stroke = (col: string, width: number) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
    };
    const shades = ['#6e4a12', '#8a5e18', '#a8741f', '#c08a2a', '#7b5414', '#d39b38'];
    // Branching stems, each with leaves and floats along it.
    const branch = (x: number, y: number, ang: number, len: number, depth: number) => {
      let px = x;
      let py = y;
      const steps = Math.round(len / 9);
      stroke(shades[Math.floor(r() * 3)], 3.2 - depth);
      for (let i = 0; i < steps; i++) {
        ang += range(r, -0.35, 0.35);
        const nx = px + Math.cos(ang) * 9;
        const ny = py + Math.sin(ang) * 9;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        if (r() < 0.55) {
          // A serrated leaf.
          const la = ang + (r() < 0.5 ? 1 : -1) * range(r, 0.6, 1.2);
          ctx.save();
          ctx.translate(nx, ny);
          ctx.rotate(la);
          ctx.fillStyle = shades[1 + Math.floor(r() * 5)];
          ctx.beginPath();
          ctx.ellipse(11, 0, 12, 3.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        if (r() < 0.3) {
          // A gas-filled float, with a glint of light.
          const bx = nx + range(r, -6, 6);
          const by = ny + range(r, -6, 6);
          const br = range(r, 3.5, 6);
          ctx.fillStyle = shades[3 + Math.floor(r() * 3)];
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 236, 170, 0.6)';
          ctx.beginPath();
          ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
        if (depth < 2 && r() < 0.08) branch(nx, ny, ang + range(r, -1.2, 1.2), len * 0.5, depth + 1);
        px = nx;
        py = ny;
      }
    };
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * w * 0.42;
      branch(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r() * Math.PI * 2, range(r, 60, 160), 0);
    }
    // Trim to a ragged raft outline, denser in the middle and thinning to wisps at the edge.
    ctx.globalCompositeOperation = 'destination-in';
    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const m = mask.getContext('2d')!;
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * w * 0.2;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const rad = range(r, w * 0.14, w * 0.26);
      const g = m.createRadialGradient(x, y, rad * 0.35, x, y, rad);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = g;
      m.fillRect(0, 0, w, h);
    }
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  });
}

function buildRaftMat(c: THREE.Vector3, low: boolean) {
  const g = new THREE.Group();
  const tex = raftTexture();
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    alphaTest: 0.3,
    side: THREE.DoubleSide,
    roughness: 0.8,
    color: '#ffffff',
    emissive: '#7a5716',
    emissiveMap: tex,
    emissiveIntensity: 0.75,
  });
  // Three layers, each turned and gently lumpy, give the mat thickness from below.
  [
    [0.12, 0, 1],
    [-0.08, 2.1, 0.9],
    [-0.3, 4.2, 0.75],
  ].forEach(([dy, rot, sc], i) => {
    const geo = new THREE.PlaneGeometry(8.5 * sc, 7 * sc, low ? 12 : 24, low ? 10 : 20);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) p.setY(k, noise2(p.getX(k) * 0.6 + i * 7, p.getZ(k) * 0.6) * 0.25);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(c.x, c.y + dy, c.z);
    mesh.rotation.y = rot;
    g.add(mesh);
  });
  return g;
}

function buildSurface() {
  // The underside of the sea surface: a bright, rippling skin of light.
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: { uTime: sharedTime, uSun: sunlight },
    vertexShader: 'varying vec2 vW; varying float vD; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xz; vec4 v = viewMatrix * w; vD = -v.z; gl_Position = projectionMatrix * v; }',
    fragmentShader: `uniform float uTime; uniform float uSun; varying vec2 vW; varying float vD;
      void main(){
        float a = sin(vW.x*1.3 + uTime*0.8 + sin(vW.y*0.9 + uTime*0.5)*1.6);
        float b = sin(vW.y*1.7 - uTime*0.6 + sin(vW.x*1.1 - uTime*0.4)*1.4);
        float c = pow(max(0.0, 1.0 - abs(a*b)*1.4), 3.0);
        float edge = smoothstep(80.0, 20.0, length(vW - vec2(0.0, 45.0)));
        vec3 col = mix(vec3(0.24, 0.62, 0.72), vec3(0.7, 0.9, 0.95), c);
        // Far away, the surface melts into the blue haze.
        float near = exp(-vD * 0.05);
        gl_FragColor = vec4(col, (0.2 + 0.3*c) * edge * near * (0.4 + 0.6*uSun));
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(180, 140, 1, 1), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(0, OCEAN.surfaceY, 45);
  return m;
}

function buildShafts(count: number) {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: sharedTime, uSun: sunlight },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform float uTime; uniform float uSun; varying vec2 vUv; void main(){ float edge = smoothstep(0.0,0.35,vUv.x)*smoothstep(1.0,0.65,vUv.x); float fade = smoothstep(0.0,0.95,vUv.y); float flicker = 0.75 + 0.25*sin(uTime*0.6 + vUv.x*6.0); gl_FragColor = vec4(vec3(0.85,0.97,1.0), edge*fade*0.08*flicker*uSun); }',
  });
  const r = rng(61);
  for (let i = 0; i < count; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(range(r, 1.5, 3), 16), mat);
    s.position.set(range(r, -20, 24), -1.5, range(r, 38, 58));
    s.rotation.set(0, range(r, -0.6, 0.6), range(r, 0.12, 0.28));
    g.add(s);
  }
  return g;
}

/** A soft round dot for particles. */
const speckSprite = () =>
  paint('speck', 32, 32, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

function specks(count: number, seed: number, color: string, size: number, box: [number, number, number, number, number, number]) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) pos.set([range(r, box[0], box[1]), range(r, box[2], box[3]), range(r, box[4], box[5])], i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size, map: speckSprite(), transparent: true, opacity: 0.7, depthWrite: false, sizeAttenuation: true });
  return new THREE.Points(geo, mat);
}

// ── Gladden Spit: the reef's drop-off ──────────────────────────────────────

function dropOffHeight(x: number, z: number) {
  // A shelf on the right that falls away steeply into deep water on the left.
  const shelf = -1.4 + noise2(x * 0.4, z * 0.4) * 0.35 + noise2(x * 1.3, z * 1.3) * 0.1;
  const wall = smoothstep(20, 25.5, x + noise2(z * 0.3, 2) * 1.2 + noise2(z * 1.1, 5) * 0.5);
  // Past the wall the slope keeps falling, deep into the haze, so no cut edge ever shows.
  const deep = x > 16 ? -16 + (x - 16) * 0.5 : -16 + (x - 16) * 2.2;
  return shelf * wall + (1 - wall) * Math.max(-45, deep);
}

/**
 * Below the lip of the wall, the rock melts into the same deep blue as the water
 * behind it (the backdrop's own gradient), so the slope never ends in a hard edge.
 */
function fadeIntoDeep(mat: THREE.MeshStandardMaterial) {
  const base = mat.onBeforeCompile.bind(mat);
  const key = mat.customProgramCacheKey.bind(mat);
  mat.customProgramCacheKey = () => `${key()}:deep`;
  mat.onBeforeCompile = (shader, renderer) => {
    base(shader, renderer);
    shader.uniforms.uDeepMid = { value: new THREE.Color('#2a9bb0') };
    shader.uniforms.uDeepBottom = { value: new THREE.Color('#0b4a63') };
    shader.fragmentShader = shader.fragmentShader
      .replace('uniform float uTime;', 'uniform float uTime;\nuniform vec3 uDeepMid;\nuniform vec3 uDeepBottom;')
      .replace(
        '#include <fog_fragment>',
        `#include <fog_fragment>
{
  vec3 dir = normalize(vOeWorld - cameraPosition);
  vec3 bg = mix(uDeepMid, uDeepBottom, smoothstep(0.0, -0.4, dir.y));
  vec3 murk = vec3(dot(bg, vec3(0.3, 0.5, 0.2))) * vec3(0.62, 0.7, 0.5);
  bg = mix(murk, bg, uSun);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, bg, smoothstep(-2.0, -9.0, vOeWorld.y));
}`,
      );
  };
  return mat;
}

function buildDropOff(tex: ReefTextures, low: boolean) {
  const g = new THREE.Group();
  // Starts just past the open-water view's edge, so the deep wall never shows there.
  const geo = new THREE.PlaneGeometry(44, 56, low ? 90 : 150, low ? 110 : 180);
  geo.rotateX(-Math.PI / 2);
  geo.translate(27, 0, 50);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, dropOffHeight(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: tex.rock ? '#c9c2b4' : '#7a7363', roughness: 0.95, map: tex.rock ?? null, normalMap: tex.rockN ?? null });
  g.add(new THREE.Mesh(geo, fadeIntoDeep(surface(mat, { tiles: 0.6, caustics: 0.18 }))));
  // Coral heads crowd the edge of the shelf.
  const r = rng(73);
  const heads: THREE.BufferGeometry[] = [];
  const colors = ['#c9a24e', '#b08544', '#a39a52', '#c98d3e', '#8e5aa8', '#d0703a'].map((c) => new THREE.Color(c));
  for (let i = 0; i < (low ? 30 : 60); i++) {
    const x = range(r, 24.5, 40);
    const z = range(r, 32, 66);
    const rad = range(r, 0.3, 0.8);
    const s = new THREE.SphereGeometry(rad, 10, 7);
    const sp = s.attributes.position;
    for (let k = 0; k < sp.count; k++) sp.setY(k, Math.min(sp.getY(k) * 1.2, rad * 0.9) * (1 + noise2(sp.getX(k) * 9, sp.getZ(k) * 9) * 0.08));
    s.computeVertexNormals();
    s.translate(x, dropOffHeight(x, z) + rad * 0.45, z);
    const c = colors[Math.floor(r() * colors.length)];
    const col = new Float32Array(sp.count * 3);
    for (let k = 0; k < sp.count; k++) col.set([c.r, c.g, c.b], k * 3);
    s.setAttribute('color', new THREE.BufferAttribute(col, 3));
    heads.push(s.toNonIndexed());
    s.dispose();
  }
  const coral = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, map: tex.coral ?? null, normalMap: tex.coralN ?? null });
  g.add(new THREE.Mesh(mergeGeometries(heads), surface(coral, { tiles: 2.5, caustics: 0.12 })));
  heads.forEach((h) => h.dispose());
  return g;
}

// ── The whole open-water world ─────────────────────────────────────────────

export interface Tappable {
  id: string;
  main: THREE.Object3D;
  others?: THREE.Object3D[];
  /** Generous tap area radius (added by the scene). */
  tap?: number;
}

export class OpenOcean {
  readonly group = new THREE.Group();
  readonly tappables: Tappable[] = [];
  private shark: SharkRig;
  /** Extra whale sharks that come to Gladden Spit when the snappers spawn. */
  private visitors: SharkRig[] = [];
  private snappers: School;
  private bait: School;
  /** Points that follow each school's centre: name labels hang from these. */
  private baitAnchor = new THREE.Object3D();
  private snapperAnchor = new THREE.Object3D();
  private mahis: MahiRig[] = [];
  private youngFish: THREE.Group[] = [];
  private turtle: ReturnType<typeof buildTurtle>;
  private spawnCloud: THREE.Points;
  private spawnBase: Float32Array;
  private dropOff: THREE.Group;
  /** Little Explorers' feeding step: the whale shark swims close to the camera. */
  private close = false;
  private closeT = 0;
  private spawnT = 0;
  private spawnTarget = 0;
  private feedT = 0;
  private refuseT = 0;
  private time = 0;

  constructor(tex: ReefTextures, low: boolean) {
    this.group.name = 'open-ocean';
    this.group.visible = false;
    this.group.add(buildSurface());
    this.group.add(buildShafts(low ? 4 : 8));
    // Drifting plankton specks: the open ocean is full of tiny life.
    this.group.add(specks(low ? 500 : 1400, 83, '#d9f2e8', 0.07, [-28, 30, -6, 6, 26, 70]));
    // The drop-off only shows at Gladden Spit: seen from the open water its far, fogged end
    // would look like a pale wedge against the darker deep water.
    this.dropOff = buildDropOff(tex, low);
    this.dropOff.visible = false;
    this.group.add(this.dropOff);

    // The whale shark cruising the open water.
    this.shark = buildWhaleShark(7);
    this.group.add(this.shark.group);
    for (let i = 0; i < 2; i++) {
      const v = buildWhaleShark(i ? 6.2 : 6.6);
      v.group.visible = false;
      this.visitors.push(v);
      this.group.add(v.group);
    }
    this.tappables.push({ id: 'whale-shark', main: this.shark.group, others: this.visitors.map((v) => v.group), tap: 1.6 });

    // A school of small fish in open water.
    this.bait = buildSchool(fishGeometry(0.22, BAIT, false), std('#ffffff', { map: baitSkin(), roughness: 0.3, metalness: 0.4 }), outlineFin(0.22, [[0.01, 0.01], [-0.07, 0.06], [-0.05, 0], [-0.07, -0.06], [0.01, -0.01]], 'back'), finMat('#9fc3d6'), low ? 70 : 140, 0.22, 91, [1.6, 0.9, 1.2]);
    this.group.add(this.bait.body, this.bait.tail, this.baitAnchor);
    this.tappables.push({ id: 'small-fish', main: this.baitAnchor, others: [this.bait.body, this.bait.tail] });

    // Snappers gathering at the edge of Gladden Spit.
    this.snappers = buildSchool(fishGeometry(0.85, SNAPPER, true), std('#ffffff', { map: snapperSkin(), roughness: 0.45 }), outlineFin(0.85, [[0.01, 0.02], [-0.1, 0.1], [-0.08, 0], [-0.1, -0.1], [0.01, -0.02]], 'back'), finMat('#6d3f36'), low ? 22 : 40, 0.85, 97, [2.4, 0.9, 2.4]);
    this.group.add(this.snappers.body, this.snappers.tail, this.snapperAnchor);
    this.tappables.push({ id: 'cubera-snapper', main: this.snapperAnchor, others: [this.snappers.body, this.snappers.tail] });

    // The cloud of eggs, shown while the snappers spawn.
    const r = rng(101);
    const n = low ? 400 : 900;
    this.spawnBase = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const dir = new THREE.Vector3(range(r, -1, 1), range(r, -0.6, 1), range(r, -1, 1)).normalize().multiplyScalar(Math.cbrt(r()));
      this.spawnBase.set([dir.x, dir.y, dir.z], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.spawnBase), 3));
    this.spawnCloud = new THREE.Points(
      sg,
      new THREE.PointsMaterial({ color: '#fff6e0', size: 0.09, transparent: true, opacity: 0, depthWrite: false, map: speckSprite() }),
    );
    this.spawnCloud.frustumCulled = false;
    this.group.add(this.spawnCloud);

    // The sargassum raft at the surface, with who lives under it.
    const rr = rng(107);
    const c = OCEAN.raftCenter;
    const clumps: Clump[] = Array.from({ length: low ? 16 : 28 }, () => {
      const a = rr() * Math.PI * 2;
      const d = Math.sqrt(rr()) * 2.5;
      return { x: c.x + Math.cos(a) * d, y: c.y + range(rr, -0.2, 0.05), z: c.z + Math.sin(a) * d * 0.8, r: range(rr, 0.8, 1.3) };
    });
    const raft = buildSargassum(clumps, 'sargassum-raft', false);
    raft.setAmount(1);
    // Lit from above, a raft seen from below would be almost black: a little glow keeps it golden.
    raft.group.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && 'emissive' in m) {
        m.emissive.set('#6a4c12');
        m.emissiveIntensity = 0.7;
      }
    });
    // The woven body of the raft: layers of painted tangle that let light through the gaps.
    raft.group.add(buildRaftMat(c, low));
    this.group.add(raft.group);
    this.tappables.push({ id: 'sargassum-raft', main: raft.group, tap: 2.5 });

    this.turtle = buildTurtle();
    this.turtle.group.scale.setScalar(0.45);
    this.turtle.group.position.set(c.x + 0.8, c.y - 0.6, c.z - 0.9);
    this.turtle.group.rotation.set(0.15, 2.2, 0);
    this.group.add(this.turtle.group);
    this.tappables.push({ id: 'young-turtle', main: this.turtle.group, tap: 0.6 });

    const yf = new THREE.Group();
    const yfSkin = paint('young-fish', 128, 64, (ctx, w, h) => {
      countershade(ctx, w, h, [
        [0, '#6b5a2a'],
        [1, '#d8c27a'],
      ]);
      ctx.fillStyle = 'rgba(60, 45, 20, 0.8)';
      for (const x of [0.3, 0.5, 0.7]) ctx.fillRect(x * w, 0, 0.06 * w, h);
    });
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Group();
      f.add(new THREE.Mesh(profiledBody(0.14, BAIT, { stations: 14, radial: 10 }), std('#ffffff', { map: yfSkin, roughness: 0.5 })));
      // A generous, invisible tap area: young fish are small targets for small fingers.
      f.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ visible: false })));
      yf.add(f);
      this.youngFish.push(f);
    }
    this.group.add(yf);
    this.tappables.push({ id: 'young-fish', main: yf, tap: 0.8 });

    for (let i = 0; i < 2; i++) {
      const m = buildMahi(i ? 0.95 : 1.15);
      this.mahis.push(m);
      this.group.add(m.group);
    }
    this.tappables.push({ id: 'mahi-mahi', main: this.mahis[0].group, others: [this.mahis[1].group], tap: 0.6 });

    this.update(0, 0, true);
  }

  setVisible(on: boolean) {
    this.group.visible = on;
  }

  /** Which place the class is at: the drop-off appears only at Gladden Spit. */
  setStop(stop: 'blue' | 'raft' | 'spit', closeShark: boolean) {
    this.dropOff.visible = stop === 'spit';
    this.close = closeShark;
  }

  setSpawning(on: boolean, instant: boolean) {
    this.spawnTarget = on ? 1 : 0;
    if (instant) this.spawnT = this.spawnTarget;
  }

  /** The class offered the whale shark something: real food, or not. */
  feed(food: boolean) {
    if (food) this.feedT = 2.4;
    else this.refuseT = 1.2;
  }

  /** dt: real seconds (transitions); t: ambient time (stops when motion is off). */
  update(t: number, dt: number, ambient: boolean) {
    this.time = t;
    if (this.spawnT !== this.spawnTarget) this.spawnT = THREE.MathUtils.clamp(this.spawnT + Math.sign(this.spawnTarget - this.spawnT) * (dt / 3), 0, 1);
    this.feedT = Math.max(0, this.feedT - dt);
    this.refuseT = Math.max(0, this.refuseT - dt);
    const sp = this.spawnT * this.spawnT * (3 - 2 * this.spawnT);

    // Main whale shark: a slow loop through the open water, mouth wide when fed.
    // When the class is feeding it, the loop tightens and comes close to the camera.
    this.closeT = THREE.MathUtils.clamp(this.closeT + (this.close ? 1 : -1) * (dt / 2.5), 0, 1);
    const k = this.closeT * this.closeT * (3 - 2 * this.closeT);
    const a = t * 0.08;
    const bc = OCEAN.blueCenter;
    const rx = 4.5 - 1.5 * k;
    const rz = 3 - 1.8 * k;
    this.shark.group.position.set(bc.x + Math.cos(a) * rx, bc.y + Math.sin(a * 2) * 0.3 - 0.3 * k, bc.z - 4.5 * k + Math.sin(a) * rz);
    this.shark.group.rotation.set(0, Math.atan2(-Math.cos(a) * rz, -Math.sin(a) * rx), Math.sin(this.refuseT * 14) * 0.08);
    this.shark.tail.rotation.y = Math.sin(t * 1.1) * 0.25;
    const gape = Math.max(0.35, Math.min(1, this.feedT));
    this.shark.mouth.scale.y = 0.012 * 7 * (1 + gape * 2.5);

    // Visiting whale sharks: swim in from the deep and circle the egg cloud.
    const sc = OCEAN.spitCenter;
    this.visitors.forEach((v, i) => {
      v.group.visible = sp > 0.02;
      const b = t * 0.12 + i * Math.PI;
      const circle = new THREE.Vector3(sc.x + Math.cos(b) * 4.5, sc.y + 2.2 + i * 0.6, sc.z + Math.sin(b) * 3.5);
      const away = new THREE.Vector3(sc.x - 24, sc.y + 2, sc.z + 20 + i * 6);
      v.group.position.lerpVectors(away, circle, sp);
      v.group.rotation.y = Math.atan2(-Math.cos(b) * 3.5, -Math.sin(b) * 4.5);
      v.tail.rotation.y = Math.sin(t * 1.2 + i) * 0.25;
      v.mouth.scale.y = 0.012 * 6.4 * (1 + sp * 2.2);
    });

    // Snappers: milling over the edge, rising in a column to spawn.
    const s = this.snappers;
    for (let i = 0; i < s.count; i++) {
      const o = s.offsets[i];
      const ph = s.phases[i];
      const ang = t * 0.25 + ph;
      const rad = (1.4 + Math.abs(o.x)) * (1 - sp * 0.5);
      tmpV.set(sc.x + Math.cos(ang) * rad, sc.y + o.y + sp * (1.2 + Math.sin(t * 0.8 + ph) * 0.6), sc.z + Math.sin(ang) * rad * 0.8 + o.z * 0.3);
      poseFish(s, i, tmpV, Math.atan2(-Math.cos(ang), -Math.sin(ang)) + Math.PI / 2, sp * 0.5, Math.sin(t * 6 + ph) * 0.35);
    }
    s.body.instanceMatrix.needsUpdate = true;
    s.tail.instanceMatrix.needsUpdate = true;
    this.snapperAnchor.position.set(sc.x, sc.y + sp * 1.2 + 0.6, sc.z);

    // The egg cloud billows up above the spawning snappers.
    const cloudMat = this.spawnCloud.material as THREE.PointsMaterial;
    cloudMat.opacity = sp * 0.85;
    this.spawnCloud.visible = sp > 0.01;
    if (this.spawnCloud.visible) {
      const pos = this.spawnCloud.geometry.attributes.position as THREE.BufferAttribute;
      const grow = 1.2 + sp * 2.8 + Math.sin(t * 0.3) * 0.2;
      for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(i, sc.x + this.spawnBase[i * 3] * grow * 1.3, sc.y + 1.6 + this.spawnBase[i * 3 + 1] * grow, sc.z + this.spawnBase[i * 3 + 2] * grow);
      }
      pos.needsUpdate = true;
    }

    // The small-fish school: a ball that turns and drifts.
    const bt = this.bait;
    const ballC = new THREE.Vector3(bc.x - 4 + Math.sin(t * 0.07) * 2, bc.y + 0.6, bc.z + 3 + Math.cos(t * 0.05) * 1.5);
    for (let i = 0; i < bt.count; i++) {
      const o = bt.offsets[i];
      const ph = bt.phases[i];
      const ang = t * 0.6 + ph;
      tmpV.set(ballC.x + Math.cos(ang) * (0.6 + Math.abs(o.x)), ballC.y + o.y, ballC.z + Math.sin(ang) * (0.6 + Math.abs(o.z)));
      poseFish(bt, i, tmpV, Math.atan2(-Math.cos(ang), -Math.sin(ang)) + Math.PI / 2, 0, Math.sin(t * 12 + ph) * 0.4);
    }
    bt.body.instanceMatrix.needsUpdate = true;
    bt.tail.instanceMatrix.needsUpdate = true;
    this.baitAnchor.position.copy(ballC).add(new THREE.Vector3(0, 0.9, 0));

    // Under the raft: mahi-mahi patrolling, young fish tucked close, a young turtle resting.
    const rc = OCEAN.raftCenter;
    this.mahis.forEach((m, i) => {
      const b = t * 0.35 + i * 2.4;
      m.group.position.set(rc.x + Math.cos(b) * (2.4 + i * 0.6), rc.y - 1.6 - i * 0.5, rc.z + Math.sin(b) * 1.8);
      m.group.rotation.y = Math.atan2(-Math.cos(b) * 1.8, -Math.sin(b) * (2.4 + i * 0.6));
      m.tail.rotation.y = Math.sin(t * 7 + i) * 0.35;
    });
    this.youngFish.forEach((f, i) => {
      const b = t * 0.5 + i * 1.05;
      f.position.set(rc.x - 0.6 + Math.cos(b) * 0.5, rc.y - 0.55 + Math.sin(b * 2) * 0.08, rc.z + 0.4 + Math.sin(b) * 0.4);
      f.rotation.y = Math.atan2(-Math.cos(b) * 0.4, -Math.sin(b) * 0.5);
    });
    if (ambient) {
      this.turtle.flippers.forEach((f, i) => (f.rotation.x = Math.sin(t * 0.9 + (i % 2) * Math.PI) * (i < 2 ? 0.2 : 0.08)));
      this.group.children.forEach((c) => {
        if (c instanceof THREE.Points && c !== this.spawnCloud) c.position.y = Math.sin(t * 0.1) * 0.3;
      });
    }
  }

  /** Raycasting uses each instanced school's bounds, which move with the fish. */
  refreshBounds() {
    for (const m of [this.bait.body, this.bait.tail, this.snappers.body, this.snappers.tail]) {
      m.computeBoundingSphere();
      m.computeBoundingBox();
    }
  }

  get elapsed() {
    return this.time;
  }
}
