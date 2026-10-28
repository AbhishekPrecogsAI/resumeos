import { buildFontCss, fontFamiliesFor } from '@resumeos/shared/templates/fonts.js';
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

import f_inter_latin_400_normal from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';
import f_inter_latin_ext_400_normal from '@fontsource/inter/files/inter-latin-ext-400-normal.woff2?url';
import f_inter_vietnamese_400_normal from '@fontsource/inter/files/inter-vietnamese-400-normal.woff2?url';
import f_inter_latin_500_normal from '@fontsource/inter/files/inter-latin-500-normal.woff2?url';
import f_inter_latin_ext_500_normal from '@fontsource/inter/files/inter-latin-ext-500-normal.woff2?url';
import f_inter_vietnamese_500_normal from '@fontsource/inter/files/inter-vietnamese-500-normal.woff2?url';
import f_inter_latin_600_normal from '@fontsource/inter/files/inter-latin-600-normal.woff2?url';
import f_inter_latin_ext_600_normal from '@fontsource/inter/files/inter-latin-ext-600-normal.woff2?url';
import f_inter_vietnamese_600_normal from '@fontsource/inter/files/inter-vietnamese-600-normal.woff2?url';
import f_inter_latin_700_normal from '@fontsource/inter/files/inter-latin-700-normal.woff2?url';
import f_inter_latin_ext_700_normal from '@fontsource/inter/files/inter-latin-ext-700-normal.woff2?url';
import f_inter_vietnamese_700_normal from '@fontsource/inter/files/inter-vietnamese-700-normal.woff2?url';
import f_inter_latin_800_normal from '@fontsource/inter/files/inter-latin-800-normal.woff2?url';
import f_inter_latin_ext_800_normal from '@fontsource/inter/files/inter-latin-ext-800-normal.woff2?url';
import f_inter_vietnamese_800_normal from '@fontsource/inter/files/inter-vietnamese-800-normal.woff2?url';
import f_lora_latin_400_normal from '@fontsource/lora/files/lora-latin-400-normal.woff2?url';
import f_lora_latin_ext_400_normal from '@fontsource/lora/files/lora-latin-ext-400-normal.woff2?url';
import f_lora_vietnamese_400_normal from '@fontsource/lora/files/lora-vietnamese-400-normal.woff2?url';
import f_lora_latin_500_normal from '@fontsource/lora/files/lora-latin-500-normal.woff2?url';
import f_lora_latin_ext_500_normal from '@fontsource/lora/files/lora-latin-ext-500-normal.woff2?url';
import f_lora_vietnamese_500_normal from '@fontsource/lora/files/lora-vietnamese-500-normal.woff2?url';
import f_lora_latin_600_normal from '@fontsource/lora/files/lora-latin-600-normal.woff2?url';
import f_lora_latin_ext_600_normal from '@fontsource/lora/files/lora-latin-ext-600-normal.woff2?url';
import f_lora_vietnamese_600_normal from '@fontsource/lora/files/lora-vietnamese-600-normal.woff2?url';
import f_lora_latin_700_normal from '@fontsource/lora/files/lora-latin-700-normal.woff2?url';
import f_lora_latin_ext_700_normal from '@fontsource/lora/files/lora-latin-ext-700-normal.woff2?url';
import f_lora_vietnamese_700_normal from '@fontsource/lora/files/lora-vietnamese-700-normal.woff2?url';
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
  'inter-latin-400-normal.woff2': f_inter_latin_400_normal,
  'inter-latin-ext-400-normal.woff2': f_inter_latin_ext_400_normal,
  'inter-vietnamese-400-normal.woff2': f_inter_vietnamese_400_normal,
  'inter-latin-500-normal.woff2': f_inter_latin_500_normal,
  'inter-latin-ext-500-normal.woff2': f_inter_latin_ext_500_normal,
  'inter-vietnamese-500-normal.woff2': f_inter_vietnamese_500_normal,
  'inter-latin-600-normal.woff2': f_inter_latin_600_normal,
  'inter-latin-ext-600-normal.woff2': f_inter_latin_ext_600_normal,
  'inter-vietnamese-600-normal.woff2': f_inter_vietnamese_600_normal,
  'inter-latin-700-normal.woff2': f_inter_latin_700_normal,
  'inter-latin-ext-700-normal.woff2': f_inter_latin_ext_700_normal,
  'inter-vietnamese-700-normal.woff2': f_inter_vietnamese_700_normal,
  'inter-latin-800-normal.woff2': f_inter_latin_800_normal,
  'inter-latin-ext-800-normal.woff2': f_inter_latin_ext_800_normal,
  'inter-vietnamese-800-normal.woff2': f_inter_vietnamese_800_normal,
  'lora-latin-400-normal.woff2': f_lora_latin_400_normal,
  'lora-latin-ext-400-normal.woff2': f_lora_latin_ext_400_normal,
  'lora-vietnamese-400-normal.woff2': f_lora_vietnamese_400_normal,
  'lora-latin-500-normal.woff2': f_lora_latin_500_normal,
  'lora-latin-ext-500-normal.woff2': f_lora_latin_ext_500_normal,
  'lora-vietnamese-500-normal.woff2': f_lora_vietnamese_500_normal,
  'lora-latin-600-normal.woff2': f_lora_latin_600_normal,
  'lora-latin-ext-600-normal.woff2': f_lora_latin_ext_600_normal,
  'lora-vietnamese-600-normal.woff2': f_lora_vietnamese_600_normal,
  'lora-latin-700-normal.woff2': f_lora_latin_700_normal,
  'lora-latin-ext-700-normal.woff2': f_lora_latin_ext_700_normal,
  'lora-vietnamese-700-normal.woff2': f_lora_vietnamese_700_normal,
};

const cache = new Map();

/** @font-face CSS for a template's own font families, plus the resume's chosen body font. */
export function templateFontCss(templateId = DEFAULT_TEMPLATE_ID, font = null) {
  const template = getTemplate(templateId) ?? getTemplate(DEFAULT_TEMPLATE_ID);
  const families = fontFamiliesFor(template.fonts, font);
  const key = families.join('|');
  if (!cache.has(key))
    cache.set(
      key,
      buildFontCss(families, (file) => byFile[file] ?? ''),
    );
  return cache.get(key);
}
