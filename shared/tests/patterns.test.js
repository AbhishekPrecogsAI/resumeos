import { describe, it, expect } from 'vitest';
import { PATTERNS, PATTERN_MAX_OPACITY, patternLayer } from '../src/templates/patterns.js';
import { ACCENT_SWATCHES, contrast, mix } from '../src/templates/color.js';
import { sampleResume } from '../src/sample/sampleResume.js';

describe('background patterns', () => {
  it('produce a deterministic SVG layer for every pattern except none', () => {
    for (const p of PATTERNS) {
      const layer = patternLayer(p.id, '#1f4fb4');
      if (p.id === 'none') expect(layer).toBeNull();
      else {
        expect(layer).toMatch(/^url\("data:image\/svg\+xml,/);
        expect(patternLayer(p.id, '#1f4fb4')).toBe(layer);
        expect(decodeURIComponent(layer)).not.toMatch(/<script|<text|href=/i);
      }
    }
    expect(patternLayer('nonsense', '#1f4fb4')).toBeNull();
  });

  it('keep text readable on the darkest point of any pattern for every swatch', () => {
    for (const { hex } of ACCENT_SWATCHES) {
      // Worst case: a pattern mark at full allowed opacity, darkened like the tile colour.
      const darkest = mix('#ffffff', mix(hex, '#000000', 0.15), PATTERN_MAX_OPACITY);
      expect([hex, contrast('#1b1f24', darkest) >= 4.5]).toEqual([hex, true]);
      expect([hex, contrast('#56606b', darkest) >= 4.5]).toEqual([hex, true]); // muted meta text
    }
  });
});

describe('background patterns in templates', () => {
  it('every accent template draws the pattern behind the page and ignores unknown ids', async () => {
    const { TEMPLATES } = await import('../src/templates/index.js');
    for (const t of TEMPLATES.filter((x) => x.accent)) {
      const plain = t.render(sampleResume, {});
      expect(t.render(sampleResume, {}, { pattern: 'none' })).toBe(plain);
      expect(t.render(sampleResume, {}, { pattern: 'nope' })).toBe(plain);
      const css = /<style>([\s\S]*?)<\/style>/.exec(
        t.render(sampleResume, {}, { pattern: 'dots' }),
      )[1];
      expect([t.id, css.includes('html { background: url("data:image/svg+xml,')]).toEqual([
        t.id,
        true,
      ]);
      // Same reading-order guard as plain templates: decoration only, never positioned.
      expect(
        css
          .replace(/@font-face\{[^}]*\}/g, '')
          .match(/(?<![-\w])(?:position:|transform:|opacity:|z-index:)/g),
      ).toBeNull();
    }
  });

  it('Clarity stays plain whatever pattern is asked for', async () => {
    const { getTemplate } = await import('../src/templates/index.js');
    const c = getTemplate('clarity');
    expect(c.render(sampleResume, {}, { pattern: 'network' })).toBe(c.render(sampleResume, {}));
  });
});
