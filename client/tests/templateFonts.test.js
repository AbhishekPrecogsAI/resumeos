import { describe, it, expect } from 'vitest';
import { fontFiles, FONT_CHOICES } from '@resumeos/shared/templates/fonts.js';
import { TEMPLATES } from '@resumeos/shared/templates/index.js';
import { templateFontCss } from '../src/lib/templateFonts.js';

describe('template fonts', () => {
  it.each(TEMPLATES.map((t) => [t.id, t]))('resolves every font file for %s', (_id, t) => {
    const css = templateFontCss(t.id);
    expect(css).not.toMatch(/url\(''\)/);
    expect(css.match(/@font-face/g)).toHaveLength(t.fonts.flatMap(fontFiles).length);
  });
});

describe('chosen body fonts', () => {
  it.each(FONT_CHOICES.map((f) => [f.id]))('resolves every file for %s', (font) => {
    const css = templateFontCss('clarity', font);
    expect(css).not.toMatch(/url\(''\)/);
    expect(css).toContain(`font-family:'${font}'`);
  });
});
