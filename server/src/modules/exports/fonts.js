import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { buildFontCss, TEMPLATE_FONT_PACKAGE } from '@resumeos/shared/templates/fonts.js';

let cached;

/** Template fonts embedded as data: URIs, so rendering needs no file or network access. */
export function serverFontCss() {
  if (cached !== undefined) return cached;
  const require = createRequire(import.meta.url);
  const dir = join(dirname(require.resolve(`${TEMPLATE_FONT_PACKAGE}/package.json`)), 'files');
  cached = buildFontCss(
    (file) => `data:font/woff2;base64,${readFileSync(join(dir, file)).toString('base64')}`,
  );
  return cached;
}
