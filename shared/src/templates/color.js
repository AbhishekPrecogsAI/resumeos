/**
 * Accent colours for templates. An accent is accepted only if it's readable both ways it's used:
 * as text/rules on white, and as a background under white text (≥ 4.5:1, WCAG AA). Lighter tints
 * and on-dark text colours are derived from it, never chosen freely.
 */
const HEX = /^#[0-9a-f]{6}$/i;

export const ACCENT_SWATCHES = [
  { name: 'Slate teal', hex: '#17323f' },
  { name: 'Deep teal', hex: '#0f6e66' },
  { name: 'Navy', hex: '#23304a' },
  { name: 'Cobalt', hex: '#1f4fb4' },
  { name: 'Plum', hex: '#5b2a6e' },
  { name: 'Wine', hex: '#8a1f3d' },
  { name: 'Forest', hex: '#245b34' },
  { name: 'Graphite', hex: '#2e3440' },
];

export const isHex = (value) => typeof value === 'string' && HEX.test(value);

function channels(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

const toHex = (rgb) =>
  `#${rgb
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/** Mix `hex` towards `toward` by `amount` (0 = hex, 1 = toward). */
export function mix(hex, toward, amount) {
  const a = channels(hex);
  const b = channels(toward);
  return toHex(a.map((c, i) => c + (b[i] - c) * amount));
}

export function luminance(hex) {
  const [r, g, b] = channels(hex)
    .map((v) => v / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Why an accent is rejected, or null when it's usable. */
export function accentProblem(hex) {
  if (!isHex(hex)) return 'Use a colour like #1f4fb4.';
  if (contrast(hex, '#ffffff') < 4.5)
    return 'This colour is too light to read as text on white or behind white text. Choose a darker shade.';
  return null;
}

/**
 * Colours a template needs, derived from one accent:
 *   accent   text, rules and backgrounds behind white text
 *   soft     very light tint for chips and panels (dark text on it stays ≥ 4.5:1)
 *   rail     light tint for lines and borders
 *   onDark   light text for use on an accent background, ≥ 4.5:1 against it
 *   deep     darker shade for text on `soft`
 */
export function accentPalette(hex) {
  const accent = isHex(hex) ? hex.toLowerCase() : '#17323f';
  let onDark = '#ffffff';
  for (const t of [0.55, 0.65, 0.75, 0.85]) {
    const candidate = mix(accent, '#ffffff', t);
    if (contrast(candidate, accent) >= 4.5) {
      onDark = candidate;
      break;
    }
  }
  const soft = mix(accent, '#ffffff', 0.9);
  let deep = mix(accent, '#000000', 0.25);
  if (contrast(deep, soft) < 4.5) deep = mix(accent, '#000000', 0.45);
  return { accent, soft, rail: mix(accent, '#ffffff', 0.7), onDark, deep };
}
