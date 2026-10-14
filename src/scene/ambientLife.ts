/**
 * Background life: schools of fish drawn as flat silhouettes (2D billboards)
 * drifting through the distance, and a large ray gliding overhead now and
 * then. The water's fog fades them into the blue, so they read as far-off life
 * without competing with the animals children can tap. They are not tappable.
 */
import * as THREE from 'three';
import { paint } from './skins.ts';
import { range, rng } from './util.ts';

type Shape = 'reef' | 'jack' | 'bait';

/** Side-view silhouettes, head to the right, with a lighter belly so they read in the blue. */
function silhouette(kind: Shape) {
  return paint(`silhouette:${kind}`, 256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.8);
    g.addColorStop(0, '#1a3442');
    g.addColorStop(1, kind === 'jack' ? '#9fb8c4' : '#5d7f8e');
    ctx.fillStyle = g;
    ctx.beginPath();
    const deep = kind === 'reef' ? 0.32 : kind === 'jack' ? 0.24 : 0.16;
    // Body.
    ctx.ellipse(w * 0.55, h * 0.5, w * 0.36, h * deep, 0, 0, Math.PI * 2);
    ctx.fill();
    // Forked tail.
    ctx.beginPath();
    ctx.moveTo(w * 0.22, h * 0.5);
    ctx.lineTo(w * 0.05, h * (0.5 - deep * 1.1));
    ctx.lineTo(w * 0.12, h * 0.5);
    ctx.lineTo(w * 0.05, h * (0.5 + deep * 1.1));
    ctx.closePath();
    ctx.fill();
    // Dorsal fin.
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * (0.5 - deep * 0.9));
    ctx.lineTo(w * 0.55, h * (0.5 - deep * 1.6));
    ctx.lineTo(w * 0.62, h * (0.5 - deep * 0.9));
    ctx.fill();
  });
}

/** A ray seen from below: broad, pointed wings and a thin tail. */
function raySilhouette() {
  return paint('silhouette:ray', 256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#16303d';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.18);
    ctx.quadraticCurveTo(w * 0.72, h * 0.3, w * 0.98, h * 0.42);
    ctx.quadraticCurveTo(w * 0.7, h * 0.5, w * 0.54, h * 0.62);
    ctx.lineTo(w * 0.46, h * 0.62);
    ctx.quadraticCurveTo(w * 0.3, h * 0.5, w * 0.02, h * 0.42);
    ctx.quadraticCurveTo(w * 0.28, h * 0.3, w * 0.5, h * 0.18);
    ctx.fill();
    ctx.strokeStyle = '#16303d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.62);
    ctx.lineTo(w * 0.5, h * 0.98);
    ctx.stroke();
  });
}

interface School {
  mesh: THREE.Mesh;
  pos: THREE.BufferAttribute;
  center: THREE.Vector3;
  dir: 1 | -1;
  speed: number;
  size: number;
  offsets: THREE.Vector3[];
  phases: number[];
}

const X_MIN = -34;
const X_MAX = 38;

export class AmbientLife {
  readonly group = new THREE.Group();
  private schools: School[] = [];
  private ray: THREE.Mesh;

  constructor(low: boolean) {
    this.group.name = 'ambient-life';
    const r = rng(505);
    const plans: { kind: Shape; count: number; size: number; z: [number, number]; y: [number, number]; speed: number; spread: [number, number, number] }[] = [
      { kind: 'bait', count: 60, size: 0.22, z: [-9, -12], y: [3.2, 4.4], speed: 0.9, spread: [2.6, 0.7, 1.2] },
      { kind: 'jack', count: 16, size: 0.55, z: [-11, -14], y: [2.0, 3.0], speed: 0.6, spread: [2.2, 0.6, 1.4] },
      { kind: 'reef', count: 22, size: 0.32, z: [-8, -10], y: [1.3, 2.2], speed: 0.35, spread: [1.6, 0.5, 1.0] },
      { kind: 'bait', count: 45, size: 0.2, z: [-13, -16], y: [2.5, 4.0], speed: 1.1, spread: [3.0, 0.8, 1.4] },
      { kind: 'jack', count: 12, size: 0.6, z: [-15, -18], y: [3.0, 4.2], speed: 0.5, spread: [2.4, 0.7, 1.6] },
      { kind: 'reef', count: 18, size: 0.3, z: [-9, -11], y: [1.4, 2.4], speed: 0.4, spread: [1.4, 0.5, 0.9] },
    ];
    for (const [i, p] of plans.entries()) {
      if (low && i % 2 === 1) continue;
      const mat = new THREE.MeshBasicMaterial({ map: silhouette(p.kind), transparent: true, alphaTest: 0.35, depthWrite: false, side: THREE.DoubleSide, fog: true });
      // One mesh of quads per school, moved on the CPU each frame: a single draw call per school.
      const geo = new THREE.BufferGeometry();
      const pos = new THREE.BufferAttribute(new Float32Array(p.count * 12), 3);
      pos.setUsage(THREE.DynamicDrawUsage);
      const uv = new Float32Array(p.count * 8);
      const idx: number[] = [];
      for (let k = 0; k < p.count; k++) {
        uv.set([0, 0, 1, 0, 1, 1, 0, 1], k * 8);
        idx.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3);
      }
      geo.setAttribute('position', pos);
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(idx);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      const school: School = {
        mesh,
        pos,
        center: new THREE.Vector3(range(r, X_MIN, X_MAX), range(r, p.y[0], p.y[1]), range(r, p.z[1], p.z[0])),
        dir: r() > 0.5 ? 1 : -1,
        speed: p.speed * range(r, 0.8, 1.2),
        size: p.size,
        offsets: Array.from({ length: p.count }, () => new THREE.Vector3(range(r, -1, 1) * p.spread[0], range(r, -1, 1) * p.spread[1], range(r, -1, 1) * p.spread[2])),
        phases: Array.from({ length: p.count }, () => r() * Math.PI * 2),
      };
      this.schools.push(school);
      this.group.add(mesh);
    }
    this.ray = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 2.2),
      new THREE.MeshBasicMaterial({ map: raySilhouette(), transparent: true, alphaTest: 0.3, depthWrite: false, side: THREE.DoubleSide, fog: true }),
    );
    // Seen from below, gliding high above the reef.
    this.ray.rotation.x = Math.PI / 2;
    this.group.add(this.ray);
    this.update(0);
  }

  update(t: number) {
    const span = X_MAX - X_MIN;
    for (const s of this.schools) {
      // Drift along the reef and wrap around out of sight.
      const x = X_MIN + ((((s.center.x - X_MIN + s.dir * s.speed * t) % span) + span) % span);
      const sway = Math.sin(t * 0.3 + s.center.z) * 0.4;
      const a = s.pos.array as Float32Array;
      s.offsets.forEach((o, i) => {
        const ph = s.phases[i];
        const cx = x + o.x + Math.sin(t * 0.5 + ph) * 0.15;
        const cy = s.center.y + o.y + sway * 0.3 + Math.sin(t * 1.3 + ph) * 0.05;
        const cz = s.center.z + o.z;
        // A quick flick of the tail (a slight squash) and a gentle pitch.
        const hw = 0.5 * s.size * s.dir * (1 + Math.sin(t * 7 + ph) * 0.06);
        const hh = 0.25 * s.size;
        const tilt = Math.sin(t * 0.9 + ph) * 0.08;
        const c = Math.cos(tilt);
        const sn = Math.sin(tilt);
        const corners = [
          [-hw, -hh],
          [hw, -hh],
          [hw, hh],
          [-hw, hh],
        ];
        corners.forEach(([u, v], k) => a.set([cx + u * c - v * sn, cy + u * sn + v * c, cz], (i * 4 + k) * 3));
      });
      s.pos.needsUpdate = true;
    }
    // The ray crosses about once every two minutes, banking gently.
    const cycle = (t % 120) / 120;
    this.ray.visible = cycle < 0.55;
    this.ray.position.set(-30 + cycle * 120, 5.4 + Math.sin(t * 0.2) * 0.3, -6 + Math.sin(t * 0.05) * 2);
    this.ray.rotation.z = -Math.PI / 2;
    // Wingbeats: the wings (across the image) narrow and widen.
    this.ray.scale.set(1 + Math.sin(t * 1.4) * 0.12, 1, 1);
  }
}
