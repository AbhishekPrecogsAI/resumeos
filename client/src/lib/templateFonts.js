import { buildFontCss } from '@resumeos/shared/templates/fonts.js';
import { getTemplate, DEFAULT_TEMPLATE_ID } from '@resumeos/shared/templates/index.js';
// Generated from TEMPLATE_FONTS (shared/src/templates/fonts.js). Vite turns each file into a
// hashed, same-origin asset URL. Regenerate when fonts change; a test checks every file resolves.
import f_source_serif_4_latin_400_normal from '@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2?url';
import f_source_serif_4_latin_ext_400_normal from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-400-normal.woff2?url';
import f_source_serif_4_vietnamese_400_normal from '@fontsource/source-serif-4/files/source-serif-4-vietnamese-400-normal.woff2?url';
import f_source_serif_4_latin_600_normal from '@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff2?url';
import f_source_serif_4_latin_ext_600_normal from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-600-normal.woff2?url';
import f_source_serif_4_vietnamese_600_normal from '@fontsource/source-serif-4/files/source-serif-4-vietnamese-600-normal.woff2?url';
import f_source_serif_4_latin_700_normal from '@fontsource/source-serif-4/files/source-serif-4-latin-700-normal.woff2?url';
import f_source_serif_4_latin_ext_700_normal from '@fontsource/source-serif-4/files/source-serif-4-latin-ext-700-normal.woff2?url';
import f_source_serif_4_vietnamese_700_normal from '@fontsource/source-serif-4/files/source-serif-4-vietnamese-700-normal.woff2?url';
import f_ibm_plex_sans_latin_400_normal from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url';
import f_ibm_plex_sans_latin_ext_400_normal from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-ext-400-normal.woff2?url';
import f_ibm_plex_sans_vietnamese_400_normal from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-vietnamese-400-normal.woff2?url';
import f_ibm_plex_sans_latin_500_normal from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2?url';
import f_ibm_plex_sans_latin_ext_500_normal from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-ext-500-normal.woff2?url';
import f_ibm_plex_sans_vietnamese_500_normal from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-vietnamese-500-normal.woff2?url';
import f_ibm_plex_sans_latin_600_normal from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2?url';
import f_ibm_plex_sans_latin_ext_600_normal from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-ext-600-normal.woff2?url';
import f_ibm_plex_sans_vietnamese_600_normal from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-vietnamese-600-normal.woff2?url';
import f_manrope_latin_400_normal from '@fontsource/manrope/files/manrope-latin-400-normal.woff2?url';
import f_manrope_latin_ext_400_normal from '@fontsource/manrope/files/manrope-latin-ext-400-normal.woff2?url';
import f_manrope_vietnamese_400_normal from '@fontsource/manrope/files/manrope-vietnamese-400-normal.woff2?url';
import f_manrope_latin_500_normal from '@fontsource/manrope/files/manrope-latin-500-normal.woff2?url';
import f_manrope_latin_ext_500_normal from '@fontsource/manrope/files/manrope-latin-ext-500-normal.woff2?url';
import f_manrope_vietnamese_500_normal from '@fontsource/manrope/files/manrope-vietnamese-500-normal.woff2?url';
import f_manrope_latin_600_normal from '@fontsource/manrope/files/manrope-latin-600-normal.woff2?url';
import f_manrope_latin_ext_600_normal from '@fontsource/manrope/files/manrope-latin-ext-600-normal.woff2?url';
import f_manrope_vietnamese_600_normal from '@fontsource/manrope/files/manrope-vietnamese-600-normal.woff2?url';
import f_manrope_latin_700_normal from '@fontsource/manrope/files/manrope-latin-700-normal.woff2?url';
import f_manrope_latin_ext_700_normal from '@fontsource/manrope/files/manrope-latin-ext-700-normal.woff2?url';
import f_manrope_vietnamese_700_normal from '@fontsource/manrope/files/manrope-vietnamese-700-normal.woff2?url';
import f_manrope_latin_800_normal from '@fontsource/manrope/files/manrope-latin-800-normal.woff2?url';
import f_manrope_latin_ext_800_normal from '@fontsource/manrope/files/manrope-latin-ext-800-normal.woff2?url';
import f_manrope_vietnamese_800_normal from '@fontsource/manrope/files/manrope-vietnamese-800-normal.woff2?url';
import f_outfit_latin_500_normal from '@fontsource/outfit/files/outfit-latin-500-normal.woff2?url';
import f_outfit_latin_ext_500_normal from '@fontsource/outfit/files/outfit-latin-ext-500-normal.woff2?url';
import f_outfit_latin_600_normal from '@fontsource/outfit/files/outfit-latin-600-normal.woff2?url';
import f_outfit_latin_ext_600_normal from '@fontsource/outfit/files/outfit-latin-ext-600-normal.woff2?url';
import f_outfit_latin_700_normal from '@fontsource/outfit/files/outfit-latin-700-normal.woff2?url';
import f_outfit_latin_ext_700_normal from '@fontsource/outfit/files/outfit-latin-ext-700-normal.woff2?url';

const byFile = {
  'source-serif-4-latin-400-normal.woff2': f_source_serif_4_latin_400_normal,
  'source-serif-4-latin-ext-400-normal.woff2': f_source_serif_4_latin_ext_400_normal,
  'source-serif-4-vietnamese-400-normal.woff2': f_source_serif_4_vietnamese_400_normal,
  'source-serif-4-latin-600-normal.woff2': f_source_serif_4_latin_600_normal,
  'source-serif-4-latin-ext-600-normal.woff2': f_source_serif_4_latin_ext_600_normal,
  'source-serif-4-vietnamese-600-normal.woff2': f_source_serif_4_vietnamese_600_normal,
  'source-serif-4-latin-700-normal.woff2': f_source_serif_4_latin_700_normal,
  'source-serif-4-latin-ext-700-normal.woff2': f_source_serif_4_latin_ext_700_normal,
  'source-serif-4-vietnamese-700-normal.woff2': f_source_serif_4_vietnamese_700_normal,
  'ibm-plex-sans-latin-400-normal.woff2': f_ibm_plex_sans_latin_400_normal,
  'ibm-plex-sans-latin-ext-400-normal.woff2': f_ibm_plex_sans_latin_ext_400_normal,
  'ibm-plex-sans-vietnamese-400-normal.woff2': f_ibm_plex_sans_vietnamese_400_normal,
  'ibm-plex-sans-latin-500-normal.woff2': f_ibm_plex_sans_latin_500_normal,
  'ibm-plex-sans-latin-ext-500-normal.woff2': f_ibm_plex_sans_latin_ext_500_normal,
  'ibm-plex-sans-vietnamese-500-normal.woff2': f_ibm_plex_sans_vietnamese_500_normal,
  'ibm-plex-sans-latin-600-normal.woff2': f_ibm_plex_sans_latin_600_normal,
  'ibm-plex-sans-latin-ext-600-normal.woff2': f_ibm_plex_sans_latin_ext_600_normal,
  'ibm-plex-sans-vietnamese-600-normal.woff2': f_ibm_plex_sans_vietnamese_600_normal,
  'manrope-latin-400-normal.woff2': f_manrope_latin_400_normal,
  'manrope-latin-ext-400-normal.woff2': f_manrope_latin_ext_400_normal,
  'manrope-vietnamese-400-normal.woff2': f_manrope_vietnamese_400_normal,
  'manrope-latin-500-normal.woff2': f_manrope_latin_500_normal,
  'manrope-latin-ext-500-normal.woff2': f_manrope_latin_ext_500_normal,
  'manrope-vietnamese-500-normal.woff2': f_manrope_vietnamese_500_normal,
  'manrope-latin-600-normal.woff2': f_manrope_latin_600_normal,
  'manrope-latin-ext-600-normal.woff2': f_manrope_latin_ext_600_normal,
  'manrope-vietnamese-600-normal.woff2': f_manrope_vietnamese_600_normal,
  'manrope-latin-700-normal.woff2': f_manrope_latin_700_normal,
  'manrope-latin-ext-700-normal.woff2': f_manrope_latin_ext_700_normal,
  'manrope-vietnamese-700-normal.woff2': f_manrope_vietnamese_700_normal,
  'manrope-latin-800-normal.woff2': f_manrope_latin_800_normal,
  'manrope-latin-ext-800-normal.woff2': f_manrope_latin_ext_800_normal,
  'manrope-vietnamese-800-normal.woff2': f_manrope_vietnamese_800_normal,
  'outfit-latin-500-normal.woff2': f_outfit_latin_500_normal,
  'outfit-latin-ext-500-normal.woff2': f_outfit_latin_ext_500_normal,
  'outfit-latin-600-normal.woff2': f_outfit_latin_600_normal,
  'outfit-latin-ext-600-normal.woff2': f_outfit_latin_ext_600_normal,
  'outfit-latin-700-normal.woff2': f_outfit_latin_700_normal,
  'outfit-latin-ext-700-normal.woff2': f_outfit_latin_ext_700_normal,
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
