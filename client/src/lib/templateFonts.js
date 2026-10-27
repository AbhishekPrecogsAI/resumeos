import { buildFontCss } from '@resumeos/shared/templates/fonts.js';
// Vite turns each font file into a hashed, same-origin asset URL. Keep in sync with TEMPLATE_FONT_FILES.
import f_latin_400 from '@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2?url';
import f_latin_ext_400 from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-400-normal.woff2?url';
import f_vietnamese_400 from '@fontsource/source-serif-4/files/source-serif-4-vietnamese-400-normal.woff2?url';
import f_latin_600 from '@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff2?url';
import f_latin_ext_600 from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-600-normal.woff2?url';
import f_vietnamese_600 from '@fontsource/source-serif-4/files/source-serif-4-vietnamese-600-normal.woff2?url';
import f_latin_700 from '@fontsource/source-serif-4/files/source-serif-4-latin-700-normal.woff2?url';
import f_latin_ext_700 from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-700-normal.woff2?url';
import f_vietnamese_700 from '@fontsource/source-serif-4/files/source-serif-4-vietnamese-700-normal.woff2?url';

const byFile = {
  'source-serif-4-latin-400-normal.woff2': f_latin_400,
  'source-serif-4-latin-ext-400-normal.woff2': f_latin_ext_400,
  'source-serif-4-vietnamese-400-normal.woff2': f_vietnamese_400,
  'source-serif-4-latin-600-normal.woff2': f_latin_600,
  'source-serif-4-latin-ext-600-normal.woff2': f_latin_ext_600,
  'source-serif-4-vietnamese-600-normal.woff2': f_vietnamese_600,
  'source-serif-4-latin-700-normal.woff2': f_latin_700,
  'source-serif-4-latin-ext-700-normal.woff2': f_latin_ext_700,
  'source-serif-4-vietnamese-700-normal.woff2': f_vietnamese_700,
};

export const templateFontCss = buildFontCss((file) => byFile[file] ?? '');
