/**
 * Painted skins for the animals: simple shapes, detailed surfaces. Each skin is
 * drawn once with the 2D canvas when the reef builds (a few milliseconds each),
 * in an "unrolled side view": x runs from tail (0) to head (1), y from back
 * (top) to belly (bottom). Bodies built with `fishBody` and fins built with
 * `finShape` carry matching UVs, so a stripe painted here lands on the fish.
 */
import * as THREE from 'three';
import { rng } from './util.ts';

type Ctx = CanvasRenderingContext2D;

let maxAniso = 4;
/** Set from the renderer so skins stay sharp at glancing angles. */
export function setSkinAnisotropy(n: number) {
  maxAniso = Math.max(1, Math.min(8, n));
}

const cache = new Map<string, THREE.Texture>();

/** Draws a texture once and reuses it (shared by every copy of an animal). */
export function paint(key: string, w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void, opts: { srgb?: boolean } = {}): THREE.Texture | null {
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, tex);
  return tex;
}

export function disposeSkins() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

/** Vertical gradient from back colour to belly colour. */
export function countershade(ctx: Ctx, w: number, h: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Overlapping scale outlines, offset row by row. */
export function scales(ctx: Ctx, w: number, h: number, size: number, color: string, alpha: number, x0 = 0, x1 = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.12);
  const rows = Math.ceil(h / (size * 0.7)) + 1;
  for (let row = 0; row < rows; row++) {
    const y = row * size * 0.7;
    for (let x = x0 * w + (row % 2) * size * 0.5; x < x1 * w + size; x += size) {
      ctx.beginPath();
      // Scales overlap toward the tail (left), so each arc opens to the right.
      ctx.arc(x, y, size * 0.55, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Soft blotches of a colour (mottling, spots). */
export function blotches(ctx: Ctx, w: number, h: number, seed: number, n: number, rMin: number, rMax: number, color: string, alpha: number, area: [number, number, number, number] = [0, 0, 1, 1]) {
  const r = rng(seed);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = (area[0] + r() * (area[2] - area[0])) * w;
    const y = (area[1] + r() * (area[3] - area[1])) * h;
    const rad = rMin + r() * (rMax - rMin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Fine speckle noise for skin grain. */
export function grain(ctx: Ctx, w: number, h: number, seed: number, amount: number, light = true) {
  const r = rng(seed);
  ctx.save();
  const n = Math.round(w * h * 0.02);
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = r() * amount;
    ctx.fillStyle = light && r() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(r() * w, r() * h, 1.5, 1.5);
  }
  ctx.restore();
}

// ── Shared textures ──────────────────────────────────────────────────────────

/** Fin membrane: fine rays with translucent webbing between them (multiplied by the fin's colour). */
export function finTexture() {
  return paint('fin', 256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    for (let i = 0; i <= 18; i++) {
      const x = (i / 18) * w;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, h);
      // Rays fan slightly and branch near the edge.
      ctx.quadraticCurveTo(x + (i - 9) * 1.5, h * 0.5, x + (i - 9) * 3, 0);
      ctx.stroke();
    }
    // Darker shading toward the base where the fin meets the body.
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.25)');
    g.addColorStop(0.4, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillRect(0, 0, w, h);
  });
}

/** An eye: gold iris, black pupil and a highlight, painted on the outward face of a dome. */
export function eyeTexture(iris = '#d8b24a') {
  return paint(`eye:${iris}`, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#101418';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const g = ctx.createRadialGradient(cx, cy, w * 0.12, cx, cy, w * 0.42);
    g.addColorStop(0, iris);
    g.addColorStop(0.8, iris);
    g.addColorStop(1, '#2a2416');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(cx - w * 0.1, cy - h * 0.1, w * 0.06, 0, Math.PI * 2);
    ctx.fill();
  });
}
