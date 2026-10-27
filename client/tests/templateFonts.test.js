import { describe, it, expect } from 'vitest';
import { TEMPLATE_FONT_FILES } from '@resumeos/shared/templates/fonts.js';
import { templateFontCss } from '../src/lib/templateFonts.js';

describe('template fonts', () => {
  it('resolves a URL for every declared font file', () => {
    expect(templateFontCss).not.toMatch(/url\(''\)/);
    expect(templateFontCss.match(/@font-face/g)).toHaveLength(TEMPLATE_FONT_FILES.length);
  });
});
