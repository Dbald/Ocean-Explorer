/**
 * Fish built from their side profile: the top and bottom outline and the
 * half-width along the body, traced from reference photos and given in units
 * of body length (tail base t = 0, snout t = 1). Fins either hug the body's
 * outline (long dorsal and anal fins) or come from a smoothed outline.
 * UVs match `fishBody` (an unrolled side view), so painted skins line up.
 */
import * as THREE from 'three';

type Pts = [number, number][];

/** Smooth interpolation through (t, value) points (cubic Hermite with averaged slopes). */
export function curve(points: Pts) {
  const p = [...points].sort((a, b) => a[0] - b[0]);
  const slope = (i: number) => {
    const a = p[Math.max(0, i - 1)];
    const b = p[Math.min(p.length - 1, i + 1)];
    return (b[1] - a[1]) / (b[0] - a[0] || 1);
  };
  return (t: number) => {
    if (t <= p[0][0]) return p[0][1];
    if (t >= p[p.length - 1][0]) return p[p.length - 1][1];
    let i = 0;
    while (t > p[i + 1][0]) i++;
    const [t0, y0] = p[i];
    const [t1, y1] = p[i + 1];
    const h = t1 - t0;
    const s = (t - t0) / h;
    const m0 = slope(i) * h;
    const m1 = slope(i + 1) * h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * m1;
  };
}

export interface Profile {
  top: Pts;
  bottom: Pts;
  width: Pts;
}

/** A body from its side profile, centred on x = 0 with the head toward +x. */
export function profiledBody(length: number, profile: Profile, opts: { stations?: number; radial?: number; flat?: number } = {}) {
  const top = curve(profile.top);
  const bottom = curve(profile.bottom);
  const width = curve(profile.width);
  const S = opts.stations ?? 56;
  const R = opts.radial ?? 32;
  // Flatter sides (a squarer cross-section) for flattened fish like sharks: 2 is an ellipse.
  const ex = 2 / (opts.flat ?? 2);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= S; i++) {
    // More stations near the snout and tail tip, where the shape changes fastest.
    const t = 0.5 - 0.5 * Math.cos((i / S) * Math.PI);
    const yt = top(t) * length;
    const yb = bottom(t) * length;
    const c = (yt + yb) / 2;
    const h = Math.max(0.0005, (yt - yb) / 2);
    const w = Math.max(0.0005, width(t) * length);
    for (let j = 0; j <= R; j++) {
      const a = -Math.PI / 2 + (j / R) * Math.PI * 2;
      const s = Math.sin(a);
      const co = Math.cos(a);
      const sx = Math.sign(co) * Math.pow(Math.abs(co), ex);
      const sy = Math.sign(s) * Math.pow(Math.abs(s), ex);
      pos.push((t - 0.5) * length, c + sy * h, sx * w);
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

function normalisedUV(g: THREE.BufferGeometry, rays: 'up' | 'down' | 'back') {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const dx = b.max.x - b.min.x || 1;
  const dy = b.max.y - b.min.y || 1;
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = (pos.getX(i) - b.min.x) / dx;
    const ny = (pos.getY(i) - b.min.y) / dy;
    const [u, v] = rays === 'up' ? [nx, ny] : rays === 'down' ? [nx, 1 - ny] : [ny, 1 - nx];
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/**
 * A fin that follows the body's top (or bottom) outline from t0 to t1, with a
 * height profile along it. Its base is tucked just inside the body so there is no gap.
 */
export function contourFin(length: number, profile: Profile, t0: number, t1: number, height: Pts, side: 'top' | 'bottom') {
  const edge = curve(side === 'top' ? profile.top : profile.bottom);
  const hgt = curve(height);
  const dir = side === 'top' ? 1 : -1;
  const n = 24;
  const base: THREE.Vector2[] = [];
  const outer: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const t = t0 + (t1 - t0) * f;
    const y = edge(t) * length;
    base.push(new THREE.Vector2((t - 0.5) * length, y - dir * 0.012 * length));
    outer.push(new THREE.Vector2((t - 0.5) * length, y + dir * hgt(f) * length));
  }
  const shape = new THREE.Shape([...base, ...outer.reverse()]);
  const g = new THREE.ShapeGeometry(shape, 1);
  normalisedUV(g, side === 'top' ? 'up' : 'down');
  return g;
}

/** A fin from a few outline points (in units of body length), smoothed into curves. */
export function outlineFin(length: number, points: Pts, rays: 'up' | 'down' | 'back') {
  const shape = new THREE.Shape();
  const pts = points.map(([x, y]) => new THREE.Vector2(x * length, y * length));
  shape.moveTo(pts[0].x, pts[0].y);
  shape.splineThru([...pts.slice(1), pts[0]]);
  const g = new THREE.ShapeGeometry(shape, 24);
  normalisedUV(g, rays);
  return g;
}
