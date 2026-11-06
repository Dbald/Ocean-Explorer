import { photoFor, photoSrc, type ReferencePhoto } from '../content/photos.ts';

/** Escapes text for safe interpolation into HTML templates. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Builds a button wired to the app's delegated action handler. */
export function btn(
  label: string,
  action: string,
  opts: { arg?: string; cls?: string; key?: string; pressed?: boolean; current?: boolean; disabled?: boolean; aria?: string; icon?: string } = {},
): string {
  const attrs = [
    `type="button"`,
    `class="btn ${opts.cls ?? ''}"`,
    `data-action="${esc(action)}"`,
    opts.arg !== undefined ? `data-arg="${esc(opts.arg)}"` : '',
    `data-key="${esc(opts.key ?? `${action}:${opts.arg ?? ''}`)}"`,
    opts.pressed !== undefined ? `aria-pressed="${opts.pressed}"` : '',
    opts.current ? 'aria-current="step"' : '',
    opts.disabled ? 'disabled' : '',
    opts.aria ? `aria-label="${esc(opts.aria)}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const icon = opts.icon ? `<span class="btn-icon" aria-hidden="true">${opts.icon}</span>` : '';
  return `<button ${attrs}>${icon}<span>${esc(label)}</span></button>`;
}

/** A food relationship drawn as an arrow from food to consumer. */
export function foodArrow(food: string, consumer: string): string {
  return `<span class="food-arrow"><span class="chip">${esc(food)}</span><span class="arrow" aria-hidden="true">→</span><span class="sr-only"> gives energy to </span><span class="chip">${esc(consumer)}</span></span>`;
}

/** A shelter relationship, drawn differently from feeding. */
export function shelterLink(shelter: string, user: string): string {
  return `<span class="shelter-link"><span class="chip">${esc(shelter)}</span><span class="dash" aria-hidden="true">⋯⌂⋯</span><span class="sr-only"> gives shelter to </span><span class="chip">${esc(user)}</span></span>`;
}

/**
 * A real reference photo with its credit, or nothing if the subject has none.
 * It sits inside a panel, never over the scene; if the file fails to load it hides itself.
 */
export function refPhoto(subject: string, opts: { caption?: string; size?: 'card' | 'small'; list?: ReferencePhoto[] } = {}): string {
  const p = photoFor(subject, opts.list);
  if (!p) return '';
  return `<figure class="ref-photo ${opts.size ?? 'card'}" data-photo="${esc(subject)}">
    <div class="ref-photo-frame"><img src="${esc(photoSrc(p))}" alt="${esc(p.alt)}" decoding="async" onerror="this.closest('figure').hidden=true"><span class="ref-badge">Real photo</span></div>
    <figcaption>${opts.caption ? `<span>${esc(opts.caption)}</span> ` : ''}<span class="ref-credit">${esc(p.credit)} · <a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">${esc(p.license)}</a></span></figcaption>
  </figure>`;
}

/** Line icons for the round header and narration buttons (stroke uses the text colour). */
const svg = (d: string) => `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
  guide: svg('<path d="M6 3h12v18l-6-4-6 4z"/>'),
  transcript: svg('<path d="M5 7h14M5 12h14M5 17h9"/>'),
  settings: svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'),
  fullscreen: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  exitFullscreen: svg('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
  pause: svg('<path d="M9 5v14M15 5v14"/>'),
  play: svg('<path d="M7 5l12 7-12 7z" fill="currentColor"/>'),
  replay: svg('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v5h5"/>'),
};
