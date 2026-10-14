/**
 * Generates the reef's surface textures: seamless 512×512 colour and normal
 * maps for sand, reef rubble, rock, coral, brain coral and sea fans.
 * Everything is procedural, so the textures belong to the project and need no
 * licence. Output: public/textures/*.jpg (and .png where alpha is needed).
 *
 *   node scripts/generate-textures.ts      (needs ffmpeg on the PATH)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, '..', 'public', 'textures');
const TMP = join(OUT, '.tmp');
const N = 512;

// ── Seeded, tileable noise ───────────────────────────────────────────────────

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (x: number, y: number, s: number) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Periodic gradient noise at (u, v) in [0, 1), with `period` cells across. Range ≈ [-1, 1]. */
function noise(u: number, v: number, period: number, seed: number) {
  const x = u * period;
  const y = v * period;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const g = (ix: number, iy: number, dx: number, dy: number) => {
    const a = hash(((ix % period) + period) % period, ((iy % period) + period) % period, seed) * Math.PI * 2;
    return Math.cos(a) * dx + Math.sin(a) * dy;
  };
  const n00 = g(xi, yi, xf, yf);
  const n10 = g(xi + 1, yi, xf - 1, yf);
  const n01 = g(xi, yi + 1, xf, yf - 1);
  const n11 = g(xi + 1, yi + 1, xf - 1, yf - 1);
  const sx = fade(xf);
  const sy = fade(yf);
  return 1.4 * ((n00 + (n10 - n00) * sx) * (1 - sy) + (n01 + (n11 - n01) * sx) * sy);
}

function fbm(u: number, v: number, period: number, octaves: number, seed: number) {
  let sum = 0;
  let amp = 0.5;
  let p = period;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(u, v, p, seed + o * 17);
    amp *= 0.5;
    p *= 2;
  }
  return sum;
}

/** Periodic cellular noise: distance to nearest and second-nearest feature points, plus the nearest cell's id. */
function cells(u: number, v: number, period: number, seed: number) {
  const x = u * period;
  const y = v * period;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  let id = 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx;
      const cy = yi + dy;
      const wx = ((cx % period) + period) % period;
      const wy = ((cy % period) + period) % period;
      const px = cx + hash(wx, wy, seed);
      const py = cy + hash(wx, wy, seed + 1);
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = hash(wx, wy, seed + 2);
      } else if (d < f2) f2 = d;
    }
  return { f1, f2, id };
}

// ── Image helpers ────────────────────────────────────────────────────────────

type Field = Float32Array;
const field = (fn: (u: number, v: number, i: number) => number): Field => {
  const f = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) f[y * N + x] = fn(x / N, y / N, y * N + x);
  return f;
};
const at = (f: Field, x: number, y: number) => f[((y + N) % N) * N + ((x + N) % N)];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number[], b: number[], t: number) => a.map((x, i) => x + (b[i] - x) * t);
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

/** Tangent-space normal map from a height field (wraps at the edges, so it tiles). */
function normals(h: Field, strength: number): Uint8Array {
  const out = new Uint8Array(N * N * 3);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = (at(h, x + 1, y) - at(h, x - 1, y)) * strength;
      const dy = (at(h, x, y + 1) - at(h, x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * N + x) * 3;
      out[i] = Math.round((-dx / len) * 127.5 + 127.5);
      // three.js expects +Y up in the texture (OpenGL convention); image rows go down.
      out[i + 1] = Math.round((dy / len) * 127.5 + 127.5);
      out[i + 2] = Math.round((1 / len) * 127.5 + 127.5);
    }
  return out;
}

function rgb(fn: (u: number, v: number, i: number) => number[]): Uint8Array {
  const out = new Uint8Array(N * N * 3);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const c = fn(x / N, y / N, y * N + x);
      const i = (y * N + x) * 3;
      out[i] = Math.round(clamp01(c[0]) * 255);
      out[i + 1] = Math.round(clamp01(c[1]) * 255);
      out[i + 2] = Math.round(clamp01(c[2]) * 255);
    }
  return out;
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b: Buffer) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function png(path: string, data: Uint8Array, channels: 3 | 4) {
  const raw = Buffer.alloc(N * (N * channels + 1));
  for (let y = 0; y < N; y++) {
    raw[y * (N * channels + 1)] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * N * channels, N * channels).copy(raw, y * (N * channels + 1) + 1);
  }
  const chunk = (type: string, body: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const tb = Buffer.concat([Buffer.from(type), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(tb));
    return Buffer.concat([len, tb, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0);
  ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

function save(name: string, data: Uint8Array, quality = 4) {
  const tmp = join(TMP, `${name}.png`);
  png(tmp, data, 3);
  execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', tmp, '-q:v', String(quality), join(OUT, `${name}.jpg`)]);
}

function savePng(name: string, data: Uint8Array) {
  png(join(OUT, `${name}.png`), data, 4);
}

// ── Textures ─────────────────────────────────────────────────────────────────

/** Fine sand: ripples, grains and a few shell flecks. Light and near-neutral, tinted by the floor's colours. */
function sand() {
  const warp = field((u, v) => fbm(u, v, 3, 3, 11));
  const ripple = field((u, v, i) => Math.sin(Math.PI * 2 * (7 * v + 0.55 * warp[i] + 0.08 * fbm(u, v, 12, 2, 5))));
  const grain = field((u, v) => hash(Math.floor(u * N), Math.floor(v * N), 3));
  const mottle = field((u, v) => fbm(u, v, 6, 4, 21));
  const height = field((_u, _v, i) => 0.55 * (ripple[i] * 0.5 + 0.5) ** 1.6 + 0.25 * mottle[i] + 0.12 * grain[i]);
  save('sand_normal', normals(height, 9));
  save(
    'sand_color',
    rgb((_u, _v, i) => {
      const base = hex('#f2e9d6');
      const shade = 0.86 + 0.12 * (ripple[i] * 0.5 + 0.5) + 0.08 * mottle[i];
      let c = base.map((x) => x * shade);
      const g = grain[i];
      if (g > 0.985) c = mix(c, hex('#ffffff'), 0.7);
      else if (g < 0.02) c = mix(c, hex('#8f8470'), 0.5);
      return c;
    }),
  );
}

/** Reef floor: coral rubble and pebbles settled in sediment. */
function rubble() {
  const warp = field((u, v) => fbm(u, v, 4, 3, 31));
  // Two layers of stones; only some cells hold one, so silt shows between them.
  const layer = (period: number, seed: number, keep: number) =>
    Array.from({ length: N * N }, (_, i) => {
      const u = (i % N) / N + warp[i] * 0.03;
      const v = Math.floor(i / N) / N + warp[i] * 0.03;
      const c = cells(u, v, period, seed);
      const r = 0.32 + 0.18 * c.id;
      const dome = c.id < keep ? Math.max(0, 1 - (c.f1 / r) ** 2) : 0;
      return { h: Math.sqrt(dome), id: c.id };
    });
  const big = layer(9, 41, 0.55);
  const small = layer(23, 43, 0.5);
  const fine = field((u, v) => fbm(u, v, 24, 3, 51));
  const height = field((_, __, i) => Math.max(big[i].h * 0.9, small[i].h * 0.55) + 0.08 * fine[i]);
  save('rubble_normal', normals(height, 22));
  const palette = ['#d8cfba', '#c9bea6', '#b8ae99', '#cdb9ad', '#bfb398', '#ddd5c3'].map(hex);
  save(
    'rubble_color',
    rgb((_, __, i) => {
      const top = big[i].h * 0.9 >= small[i].h * 0.55 ? big[i] : small[i];
      const stone = smooth(0.0, 0.25, top.h);
      const p = palette[Math.floor(top.id * 1000) % palette.length].map((x) => x * (0.82 + 0.18 * top.h));
      return mix(hex('#a39a83'), p, stone * 0.85).map((x) => x * (0.9 + 0.12 * fine[i]));
    }),
  );
}

/** Reef rock: porous limestone with pink coralline crust and patches of turf algae. */
function rock() {
  const big = field((u, v) => fbm(u, v, 4, 5, 61));
  // Pits: only some cells hold a hole, at two sizes, so the surface reads as porous rather than dotted.
  const pits = Array.from({ length: N * N }, (_, i) => {
    const u = (i % N) / N;
    const v = Math.floor(i / N) / N;
    const a = cells(u, v, 18, 71);
    const b = cells(u, v, 42, 72);
    const pa = a.id < 0.35 ? a.f1 / (0.25 + 0.3 * a.id) : 1;
    const pb = b.id < 0.3 ? b.f1 / (0.2 + 0.3 * b.id) : 1;
    return Math.min(1, pa, pb);
  });
  const crust = field((u, v) => fbm(u, v, 5, 4, 81));
  const turf = field((u, v) => fbm(u, v, 7, 4, 91));
  const height = field((u, v, i) => 0.5 * big[i] + 0.3 * smooth(0.2, 1.0, pits[i]) + 0.12 * fbm(u, v, 32, 2, 63));
  save('rock_normal', normals(height, 10));
  save(
    'rock_color',
    rgb((_, __, i) => {
      let c = mix(hex('#8f877a'), hex('#b8ae9c'), clamp01(0.5 + big[i]));
      c = c.map((x) => x * (0.6 + 0.4 * smooth(0.2, 1.0, pits[i])));
      c = mix(c, hex('#c98f9a'), smooth(0.1, 0.32, crust[i]) * 0.75);
      c = mix(c, hex('#5e6b34'), smooth(0.12, 0.3, turf[i]) * 0.7);
      return c;
    }),
  );
}

/** Elkhorn coral and sponge surface: a near-white base with tiny corallite pores (tinted by the coral's own colour). */
function coral() {
  const pores = Array.from({ length: N * N }, (_, i) => cells((i % N) / N, Math.floor(i / N) / N, 40, 101).f1);
  const low = field((u, v) => fbm(u, v, 5, 3, 111));
  const height = field((_, __, i) => smooth(0.05, 0.42, pores[i]) + 0.2 * low[i]);
  save('coral_normal', normals(height, 7));
  save(
    'coral_color',
    rgb((_, __, i) => {
      const k = 0.72 + 0.28 * smooth(0.05, 0.4, pores[i]) + 0.06 * low[i];
      return [k, k * 0.98, k * 0.94];
    }),
  );
}

/** Brain coral: a labyrinth of ridges and valleys grown with a reaction–diffusion model. */
function brain() {
  const M = 256;
  let A = new Float32Array(M * M).fill(1);
  let B = new Float32Array(M * M);
  const r = rng(7);
  // Seed small patches; the pattern grows out from them into a connected maze.
  for (let n = 0; n < 60; n++) {
    const cx = Math.floor(r() * M);
    const cy = Math.floor(r() * M);
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const i = ((cy + dy + M) % M) * M + ((cx + dx + M) % M);
        A[i] = 0.5;
        B[i] = 0.25 + r() * 0.05;
      }
  }
  const f = 0.029;
  const k = 0.057;
  let A2 = new Float32Array(M * M);
  let B2 = new Float32Array(M * M);
  for (let it = 0; it < 7000; it++) {
    for (let y = 0; y < M; y++) {
      const yu = ((y - 1 + M) % M) * M;
      const yd = ((y + 1) % M) * M;
      const yc = y * M;
      for (let x = 0; x < M; x++) {
        const xl = (x - 1 + M) % M;
        const xr = (x + 1) % M;
        const i = yc + x;
        const lapA = 0.2 * (A[yc + xl] + A[yc + xr] + A[yu + x] + A[yd + x]) + 0.05 * (A[yu + xl] + A[yu + xr] + A[yd + xl] + A[yd + xr]) - A[i];
        const lapB = 0.2 * (B[yc + xl] + B[yc + xr] + B[yu + x] + B[yd + x]) + 0.05 * (B[yu + xl] + B[yu + xr] + B[yd + xl] + B[yd + xr]) - B[i];
        const abb = A[i] * B[i] * B[i];
        A2[i] = A[i] + (lapA - abb + f * (1 - A[i]));
        B2[i] = B[i] + (0.5 * lapB + abb - (k + f) * B[i]);
      }
    }
    [A, A2] = [A2, A];
    [B, B2] = [B2, B];
  }
  // Upsample with bilinear filtering, then soften so ridges are rounded.
  const up = field((u, v) => {
    const x = u * M - 0.5;
    const y = v * M - 0.5;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = x - x0;
    const ty = y - y0;
    const s = (xx: number, yy: number) => B[((yy + M) % M) * M + ((xx + M) % M)];
    return (s(x0, y0) * (1 - tx) + s(x0 + 1, y0) * tx) * (1 - ty) + (s(x0, y0 + 1) * (1 - tx) + s(x0 + 1, y0 + 1) * tx) * ty;
  });
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of up) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const ridge = field((_, __, i) => smooth(0.25, 0.75, (up[i] - lo) / (hi - lo || 1)));
  const height = field((u, v, i) => ridge[i] + 0.05 * fbm(u, v, 20, 2, 131));
  save('brain_normal', normals(height, 16));
  const tint = field((u, v) => fbm(u, v, 3, 3, 141));
  save(
    'brain_color',
    rgb((_, __, i) => {
      // Valleys darker and greener; ridge tops pale.
      const c = mix(hex('#6f6a3e'), hex('#e3d6a8'), 0.15 + 0.85 * ridge[i]);
      return c.map((x) => x * (0.9 + 0.15 * tint[i]));
    }),
  );
}

/** Sea fan: a fine, irregular lattice of purple branches (alpha cut-out). */
function seaFan() {
  const net = Array.from({ length: N * N }, (_, i) => cells((i % N) / N, Math.floor(i / N) / N, 16, 151));
  const warp = field((u, v) => fbm(u, v, 3, 3, 161));
  const out = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const edge = net[i].f2 - net[i].f1;
    const a = 1 - smooth(0.06, 0.11, edge);
    // Main branches: a few thicker vertical ribs.
    const u = (i % N) / N;
    const rib = Math.abs(Math.sin(Math.PI * (6 * u + 0.4 * warp[i]))) < 0.1 ? 1 : 0;
    const alpha = Math.max(a, rib);
    const shade = 0.75 + 0.25 * hash(i, 1, 3);
    out[i * 4] = Math.round(150 * shade);
    out[i * 4 + 1] = Math.round(78 * shade);
    out[i * 4 + 2] = Math.round(182 * shade);
    out[i * 4 + 3] = Math.round(alpha * 255);
  }
  savePng('seafan', out);
}

/** Animal skin: soft mottling and fine scales. Near-white, so each animal keeps its own colour. */
function skin() {
  const scales = Array.from({ length: N * N }, (_, i) => {
    const u = (i % N) / N;
    const v = Math.floor(i / N) / N;
    // Offset rows of cells read as overlapping scales.
    return cells(u, v, 28, 191);
  });
  const mottle = field((u, v) => fbm(u, v, 5, 4, 201));
  const fine = field((u, v) => fbm(u, v, 40, 2, 211));
  const height = field((_u, _v, i) => 0.6 * smooth(0.0, 0.5, scales[i].f2 - scales[i].f1) + 0.25 * fine[i]);
  save('skin_normal', normals(height, 5));
  save(
    'skin_color',
    rgb((_u, _v, i) => {
      const k = 0.86 + 0.12 * smooth(-0.3, 0.3, mottle[i]) + 0.04 * fine[i];
      return [k, k, k];
    }),
  );
}

mkdirSync(TMP, { recursive: true });
const jobs: [string, () => void][] = [
  ['sand', sand],
  ['rubble', rubble],
  ['rock', rock],
  ['coral', coral],
  ['brain', brain],
  ['sea fan', seaFan],
  ['skin', skin],
];
for (const [name, fn] of jobs) {
  const t = performance.now();
  fn();
  console.log(`${name.padEnd(9)} ${((performance.now() - t) / 1000).toFixed(1)} s`);
}
rmSync(TMP, { recursive: true, force: true });
