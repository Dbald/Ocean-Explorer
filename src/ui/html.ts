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
