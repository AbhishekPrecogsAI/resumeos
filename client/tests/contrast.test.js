import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

// jsdom changes import.meta.url's scheme, so resolve from the package root (vitest's cwd).
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

function tokens(selector) {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
  );
}

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// Text/background pairs the UI actually uses, with WCAG AA thresholds.
const TEXT = [
  ...['ink', 'muted', 'faint'].flatMap((fg) =>
    ['canvas', 'surface', 'sunken'].map((bg) => [fg, bg]),
  ),
  ['accent', 'canvas'],
  ['accent', 'surface'],
  ['accent', 'accent-soft'],
  ['on-accent', 'accent'],
  ['added', 'added-soft'],
  ['removed', 'removed-soft'],
  ['warn', 'warn-soft'],
  ['danger', 'danger-soft'],
  ['added', 'surface'],
  ['danger', 'surface'],
  ['warn', 'surface'],
  ['muted', 'accent-soft'],
];
// Non-text: input and control boundaries need 3:1 against their background (WCAG 1.4.11).
const BOUNDARIES = [
  ['rule-strong', 'surface'],
  ['rule-strong', 'canvas'],
];

describe.each([
  ['light', tokens(':root')],
  ['dark', tokens('.dark')],
])('%s theme contrast', (_name, t) => {
  it.each(TEXT)('%s on %s meets 4.5:1', (fg, bg) => {
    expect(t[fg], `missing token ${fg}`).toBeDefined();
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
  it.each(BOUNDARIES)('%s on %s meets 3:1 for control boundaries', (fg, bg) => {
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(3);
  });
});

it('danger buttons are readable in both themes', () => {
  expect(ratio('#ffffff', tokens(':root').danger)).toBeGreaterThanOrEqual(4.5);
  expect(ratio(tokens('.dark').sunken, tokens('.dark').danger)).toBeGreaterThanOrEqual(4.5);
});
