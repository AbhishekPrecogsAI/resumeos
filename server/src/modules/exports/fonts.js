import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { buildFontCss } from '@resumeos/shared/templates/fonts.js';

const require = createRequire(import.meta.url);
const cache = new Map();

/** A template's fonts embedded as data: URIs, so rendering needs no file or network access. */
export function serverFontCss(families) {
  const key = families.join('|');
  if (!cache.has(key)) {
    cache.set(
      key,
      buildFontCss(families, (file, pkg) => {
        const dir = join(dirname(require.resolve(`${pkg}/package.json`)), 'files');
        return `data:font/woff2;base64,${readFileSync(join(dir, file)).toString('base64')}`;
      }),
    );
  }
  return cache.get(key);
}
