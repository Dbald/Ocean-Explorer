/**
 * The compact composite environment: one scene with three bounded sections
 * (reef → seagrass → sand) along the x axis.
 */
import * as THREE from 'three';
import { noise2, range, rng, sharedTime, smoothstep, withCaustics } from './util.ts';

export const SECTION = {
  reef: { x0: -24, x1: -6 },
  seagrass: { x0: -5, x1: 16 },
  sand: { x0: 15, x1: 30 },
};

export function terrainHeight(x: number, z: number) {
  const reefness = 1 - smoothstep(-8, -3, x);
  const sandness = smoothstep(14, 18, x);
  const base = noise2(x * 0.25, z * 0.25) * 0.18;
  const reefBumps = reefness * (noise2(x * 0.6 + 4, z * 0.6) * 0.22 + 0.05);
  const ripples = sandness * Math.sin(x * 4.2 + Math.sin(z * 0.8) * 1.5) * 0.025;
  // The floor gently drops away behind the scene to give depth.
  const backSlope = Math.min(0, z + 6) * 0.12;
  return base + reefBumps + ripples + backSlope;
}

function buildFloor() {
  const geo = new THREE.PlaneGeometry(80, 34, 240, 100);
  geo.rotateX(-Math.PI / 2);
  geo.translate(3, 0, -5);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const reef = new THREE.Color('#8c8466');
  const grass = new THREE.Color('#8f8d5e');
  const sand = new THREE.Color('#e3d4ab');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
    c.copy(reef).lerp(grass, smoothstep(-8, -2, x)).lerp(sand, smoothstep(13, 18, x));
    const n = noise2(x * 1.3, z * 1.3) * 0.05;
    colors.set([c.r + n, c.g + n, c.b + n], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = withCaustics(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), 0.2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function buildBackdrop() {
  // Gradient water "sky": bright filtered light above, deep blue below.
  const geo = new THREE.SphereGeometry(150, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color('#9fe6ef') }, mid: { value: new THREE.Color('#2a9bb0') }, bottom: { value: new THREE.Color('#0b4a63') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.7, h)) : mix(mid, bottom, smoothstep(0.0, -0.4, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  return new THREE.Mesh(geo, mat);
}

function rock(r: () => number, size: number, color: string) {
  const geo = new THREE.IcosahedronGeometry(size, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    const k = 1 + noise2(v.x * 3 + r(), v.z * 3) * 0.18 + noise2(v.y * 4, v.x * 2) * 0.1;
    v.multiplyScalar(k);
    v.y *= 0.6;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, withCaustics(new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: false }), 0.25));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function boulderCoral(r: () => number, size: number, color: string) {
  const geo = new THREE.SphereGeometry(size, 28, 18);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    const ridges = Math.sin(v.x * 40 + Math.sin(v.z * 30) * 2) * 0.012;
    v.multiplyScalar(1 + ridges + noise2(v.x * 5, v.z * 5) * 0.04);
    v.y = Math.max(v.y * 0.7, -0.05);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  mesh.rotation.y = r() * Math.PI;
  mesh.castShadow = true;
  return mesh;
}

function seaFan(r: () => number, size: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (0.15 + 0.7 * (i / 12));
    const rr = size * (0.85 + r() * 0.2);
    shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  shape.closePath();
  const mat = new THREE.MeshStandardMaterial({ color: '#8a4fa8', side: THREE.DoubleSide, roughness: 0.8, transparent: true, opacity: 0.88 });
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 6), mat);
  mesh.userData.sway = r() * Math.PI * 2;
  return mesh;
}

function tubeSponge(r: () => number, color: string) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const h = range(r, 0.3, 0.7);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, h, 12, 1, true), mat);
    tube.position.set(range(r, -0.12, 0.12), h / 2, range(r, -0.12, 0.12));
    tube.rotation.set(range(r, -0.2, 0.2), 0, range(r, -0.2, 0.2));
    g.add(tube);
  }
  return g;
}

/** Instanced seagrass meadow with GPU sway. */
function buildSeagrass(count: number, avoid: { x: number; z: number; r: number }[]) {
  const blade = new THREE.PlaneGeometry(0.045, 1, 1, 6);
  blade.translate(0, 0.5, 0);
  const pos = blade.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) * (1 - pos.getY(i) * 0.55));
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.7 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float oeH = position.y;
vec4 oeBase = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
float oeSway = sin(uTime * 0.9 + oeBase.x * 0.6 + oeBase.z * 0.4) * 0.16 + sin(uTime * 1.7 + oeBase.x * 1.3) * 0.05;
transformed.x += oeSway * oeH * oeH;
transformed.z += oeSway * 0.4 * oeH * oeH;`,
      );
  };
  const mesh = new THREE.InstancedMesh(blade, mat, count);
  const r = rng(42);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  let placed = 0;
  let guard = 0;
  while (placed < count && guard++ < count * 6) {
    const x = range(r, SECTION.seagrass.x0, SECTION.seagrass.x1);
    const z = range(r, -9, 3.6);
    // Thin out toward the reef and the sand edges.
    const density = smoothstep(SECTION.seagrass.x0, SECTION.seagrass.x0 + 3, x) * (1 - smoothstep(13, 16.5, x));
    if (r() > density) continue;
    if (avoid.some((a) => (x - a.x) ** 2 + (z - a.z) ** 2 < a.r * a.r)) continue;
    const h = range(r, 0.35, 0.85) * (z > 1.5 ? 0.7 : 1);
    p.set(x, terrainHeight(x, z) - 0.02, z);
    q.setFromEuler(new THREE.Euler(range(r, -0.15, 0.15), r() * Math.PI, range(r, -0.15, 0.15)));
    s.set(range(r, 0.8, 1.4), h, 1);
    m.compose(p, q, s);
    mesh.setMatrixAt(placed, m);
    c.setHSL(range(r, 0.22, 0.3), range(r, 0.45, 0.6), range(r, 0.26, 0.38));
    mesh.setColorAt(placed, c);
    placed++;
  }
  mesh.count = placed;
  mesh.userData.maxCount = placed;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  return mesh;
}

function algaeTufts(r: () => number, cx: number, cz: number, spread: number, n: number) {
  const g = new THREE.Group();
  const mats = ['#5f7a2e', '#6f8b34', '#4f6a2a'].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  for (let i = 0; i < n; i++) {
    const x = cx + range(r, -spread, spread);
    const z = cz + range(r, -spread * 0.6, spread * 0.6);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(range(r, 0.04, 0.09), 8, 5), mats[i % 3]);
    tuft.scale.set(1.3, 0.35, 1);
    tuft.position.set(x, terrainHeight(x, z) + 0.01, z);
    g.add(tuft);
  }
  return g;
}

function lightShafts(count: number) {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: sharedTime },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform float uTime; varying vec2 vUv; void main(){ float edge = smoothstep(0.0,0.35,vUv.x)*smoothstep(1.0,0.65,vUv.x); float fade = smoothstep(0.0,0.9,vUv.y); float flicker = 0.75 + 0.25*sin(uTime*0.6 + vUv.x*6.0); gl_FragColor = vec4(vec3(0.85,0.97,1.0), edge*fade*0.09*flicker); }',
  });
  const r = rng(5);
  for (let i = 0; i < count; i++) {
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(range(r, 1.2, 2.6), 14), mat);
    shaft.position.set(range(r, -22, 26), 6, range(r, -6, 0));
    shaft.rotation.set(0, range(r, -0.6, 0.6), range(r, 0.15, 0.3));
    shaft.userData.phase = r() * Math.PI * 2;
    g.add(shaft);
  }
  return g;
}

function marineSnow(count: number) {
  const r = rng(9);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions.set([range(r, -26, 32), range(r, 0.2, 7), range(r, -8, 8)], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: '#e8fbff', size: 0.035, transparent: true, opacity: 0.55, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  pts.userData.maxCount = count;
  return pts;
}

export interface Environment {
  root: THREE.Group;
  seagrass: THREE.InstancedMesh;
  shafts: THREE.Group;
  snow: THREE.Points;
  fans: THREE.Mesh[];
  /** Rock crevice where the small fish goes to find shelter elsewhere. */
  shelterElsewhere: THREE.Vector3;
}

export function buildEnvironment(avoid: { x: number; z: number; r: number }[]): Environment {
  const root = new THREE.Group();
  const r = rng(1234);
  root.add(buildBackdrop());
  root.add(buildFloor());

  // Reef section: rocks, boulder corals, sea fans and sponges around the elkhorn thicket.
  const rockSpots: [number, number, number][] = [
    [-12.95, 0.3, 0.8],
    [-20.6, 0.5, 0.2],
    [-22, 0.8, -3.5],
    [-9, 0.6, -3.2],
    [-17.8, 0.45, -4.5],
    [-7.4, 0.35, -0.8],
  ];
  for (const [x, size, z] of rockSpots) {
    const m = rock(r, size, '#7a7363');
    m.position.set(x, terrainHeight(x, z) + size * 0.2, z);
    root.add(m);
  }
  const boulders: [number, number, number, string][] = [
    [-13, -3.6, 0.55, '#b59f63'],
    [-19.5, -1.4, 0.45, '#8c9a55'],
    [-10.2, -1.9, 0.4, '#a98a5c'],
    [-15.6, 1.6, 0.3, '#9da35d'],
    [-21.5, 1.3, 0.35, '#b59f63'],
  ];
  for (const [x, z, size, color] of boulders) {
    const m = boulderCoral(r, size, color);
    m.position.set(x, terrainHeight(x, z), z);
    root.add(m);
  }
  const fans: THREE.Mesh[] = [];
  for (const [x, z, s] of [
    [-12.2, -2.6, 0.7],
    [-20.4, -2.2, 0.9],
    [-17.5, -3.4, 0.6],
    [-8.6, -1.4, 0.5],
  ] as const) {
    const fan = seaFan(r, s);
    fan.position.set(x, terrainHeight(x, z), z);
    fan.rotation.y = range(r, -0.5, 0.5);
    root.add(fan);
    fans.push(fan);
  }
  for (const [x, z, color] of [
    [-18.6, 0.9, '#d9792f'],
    [-9.8, 0.2, '#7d4a9e'],
    [-21.4, -0.8, '#c96a2b'],
  ] as const) {
    const sp = tubeSponge(r, color);
    sp.position.set(x, terrainHeight(x, z), z);
    root.add(sp);
  }
  // Algae turf where the parrotfish grazes, and algae on the sand near the conch.
  root.add(algaeTufts(r, -12.95, 0.85, 0.45, 26));
  root.add(algaeTufts(r, 17.6, 0.9, 1.0, 26));

  const seagrass = buildSeagrass(2600, avoid);
  root.add(seagrass);
  const shafts = lightShafts(7);
  root.add(shafts);
  const snow = marineSnow(600);
  root.add(snow);

  return { root, seagrass, shafts, snow, fans, shelterElsewhere: new THREE.Vector3(-18.92, 0.3, 1.12) };
}
