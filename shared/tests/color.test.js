import { describe, it, expect } from 'vitest';
import {
  ACCENT_SWATCHES,
  accentPalette,
  accentProblem,
  contrast,
  mix,
} from '../src/templates/color.js';

describe('accent colours', () => {
  it.each(ACCENT_SWATCHES.map((s) => [s.name, s.hex]))(
    'swatch %s is readable everywhere it is used',
    (_name, hex) => {
      const p = accentPalette(hex);
      expect(accentProblem(hex)).toBeNull();
      expect(contrast(p.accent, '#ffffff')).toBeGreaterThanOrEqual(4.5); // accent text on white, white on accent
      expect(contrast(p.onDark, p.accent)).toBeGreaterThanOrEqual(4.5); // light text on accent backgrounds
      expect(contrast(p.deep, p.soft)).toBeGreaterThanOrEqual(4.5); // chip text on tint
      expect(contrast('#1b1f24', p.soft)).toBeGreaterThanOrEqual(4.5); // body text on tinted panels
    },
  );

  it('rejects light or malformed colours', () => {
    expect(accentProblem('#ffd500')).toMatch(/too light/);
    expect(accentProblem('#88aaff')).toMatch(/too light/);
    expect(accentProblem('red')).toMatch(/#1f4fb4/);
    expect(accentProblem('#12345')).toMatch(/#1f4fb4/);
    expect(accentProblem('#1f4fb4')).toBeNull();
  });

  it('derives a readable palette for any accepted custom colour', () => {
    for (let i = 0; i < 300; i += 1) {
      const hex = `#${Math.floor(((i * 2654435761) >>> 0) % 0xffffff)
        .toString(16)
        .padStart(6, '0')}`;
      if (accentProblem(hex)) continue;
      const p = accentPalette(hex);
      expect(contrast(p.onDark, p.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.deep, p.soft)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('mixes channels', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});
