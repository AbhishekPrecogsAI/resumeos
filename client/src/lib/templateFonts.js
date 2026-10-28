import { buildFontCss } from '@resumeos/shared/templates/fonts.js';
import { getTemplate, DEFAULT_TEMPLATE_ID } from '@resumeos/shared/templates/index.js';
// Vite turns each font file into a hashed, same-origin asset URL. Keep in sync with TEMPLATE_FONTS.
import f_source_serif_4_latin_400 from '@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2?url';
import f_source_serif_4_latin_ext_400 from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-400-normal.woff2?url';
import f_source_serif_4_vietnamese_400 from '@fontsource/source-serif-4/files/source-serif-4-vietnamese-400-normal.woff2?url';
import f_source_serif_4_latin_600 from '@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff2?url';
import f_source_serif_4_latin_ext_600 from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-600-normal.woff2?url';
import f_source_serif_4_vietnamese_600 from '@fontsource/source-serif-4/files/source-serif-4-vietnamese-600-normal.woff2?url';
import f_source_serif_4_latin_700 from '@fontsource/source-serif-4/files/source-serif-4-latin-700-normal.woff2?url';
import f_source_serif_4_latin_ext_700 from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-700-normal.woff2?url';
import f_source_serif_4_vietnamese_700 from '@fontsource/source-serif-4/files/source-serif-4-vietnamese-700-normal.woff2?url';
import f_ibm_plex_sans_latin_400 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url';
import f_ibm_plex_sans_latin_ext_400 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-ext-400-normal.woff2?url';
import f_ibm_plex_sans_vietnamese_400 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-vietnamese-400-normal.woff2?url';
import f_ibm_plex_sans_latin_500 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2?url';
import f_ibm_plex_sans_latin_ext_500 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-ext-500-normal.woff2?url';
import f_ibm_plex_sans_vietnamese_500 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-vietnamese-500-normal.woff2?url';
import f_ibm_plex_sans_latin_600 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2?url';
import f_ibm_plex_sans_latin_ext_600 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-ext-600-normal.woff2?url';
import f_ibm_plex_sans_vietnamese_600 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-vietnamese-600-normal.woff2?url';

const byFile = {
  'source-serif-4-latin-400-normal.woff2': f_source_serif_4_latin_400,
  'source-serif-4-latin-ext-400-normal.woff2': f_source_serif_4_latin_ext_400,
  'source-serif-4-vietnamese-400-normal.woff2': f_source_serif_4_vietnamese_400,
  'source-serif-4-latin-600-normal.woff2': f_source_serif_4_latin_600,
  'source-serif-4-latin-ext-600-normal.woff2': f_source_serif_4_latin_ext_600,
  'source-serif-4-vietnamese-600-normal.woff2': f_source_serif_4_vietnamese_600,
  'source-serif-4-latin-700-normal.woff2': f_source_serif_4_latin_700,
  'source-serif-4-latin-ext-700-normal.woff2': f_source_serif_4_latin_ext_700,
  'source-serif-4-vietnamese-700-normal.woff2': f_source_serif_4_vietnamese_700,
  'ibm-plex-sans-latin-400-normal.woff2': f_ibm_plex_sans_latin_400,
  'ibm-plex-sans-latin-ext-400-normal.woff2': f_ibm_plex_sans_latin_ext_400,
  'ibm-plex-sans-vietnamese-400-normal.woff2': f_ibm_plex_sans_vietnamese_400,
  'ibm-plex-sans-latin-500-normal.woff2': f_ibm_plex_sans_latin_500,
  'ibm-plex-sans-latin-ext-500-normal.woff2': f_ibm_plex_sans_latin_ext_500,
  'ibm-plex-sans-vietnamese-500-normal.woff2': f_ibm_plex_sans_vietnamese_500,
  'ibm-plex-sans-latin-600-normal.woff2': f_ibm_plex_sans_latin_600,
  'ibm-plex-sans-latin-ext-600-normal.woff2': f_ibm_plex_sans_latin_ext_600,
  'ibm-plex-sans-vietnamese-600-normal.woff2': f_ibm_plex_sans_vietnamese_600,
};

const cache = new Map();

/** @font-face CSS for a template's own font families. */
export function templateFontCss(templateId = DEFAULT_TEMPLATE_ID) {
  const template = getTemplate(templateId) ?? getTemplate(DEFAULT_TEMPLATE_ID);
  if (!cache.has(template.id))
    cache.set(
      template.id,
      buildFontCss(template.fonts, (file) => byFile[file] ?? ''),
    );
  return cache.get(template.id);
}
