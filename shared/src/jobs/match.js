import { TERM_DICTIONARY, fold, compact, findDictionaryEntry } from './dictionary.js';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Regex for a whole-term match. Boundaries treat letters, digits, + and # as part of a word, so
 * "C" doesn't match inside "C++" and "Java" doesn't match "JavaScript". A trailing full stop is
 * allowed ("…with Node.js.").
 */
export function termPattern(text, { caseSensitive = false } = {}) {
  const body = escape(text.normalize('NFKC')).replace(/\s+/g, '[\\s-]+');
  return new RegExp(
    `(?<![\\p{L}\\p{N}+#])${body}(?![\\p{L}\\p{N}+#])`,
    caseSensitive ? 'gu' : 'giu',
  );
}

const cache = new Map();
function pattern(text, caseSensitive) {
  const key = `${caseSensitive ? 1 : 0}:${text}`;
  if (!cache.has(key)) cache.set(key, termPattern(text, { caseSensitive }));
  const re = cache.get(key);
  re.lastIndex = 0;
  return re;
}

export function countMatches(haystack, text, caseSensitive = false) {
  return (
    String(haystack ?? '')
      .normalize('NFKC')
      .match(pattern(text, caseSensitive)) ?? []
  ).length;
}

// Every dictionary form, longest first, so "Node.js" claims its text before "JS" or "Node" can.
const FORMS = TERM_DICTIONARY.flatMap((entry) =>
  [entry.term, ...entry.variants].map((form) => ({ entry, form, exact: form === entry.term })),
).sort((a, b) => b.form.length - a.form.length);

/**
 * Scan text for dictionary terms with longest-match-first masking: each span of text is claimed by
 * at most one form, so "JS" inside "Node.js" or "k8s" after "K8s" is never counted again.
 * Returns Map<canonical term, { count, kind, forms }> where kind is 'exact' if the canonical
 * spelling appears anywhere, otherwise 'normalized'.
 */
export function scanDictionary(text) {
  let masked = String(text ?? '').normalize('NFKC');
  const found = new Map();
  for (const { entry, form, exact } of FORMS) {
    const re = pattern(form, entry.caseSensitive);
    let hit = false;
    masked = masked.replace(re, (m) => {
      hit = true;
      const rec = found.get(entry.term) ?? { count: 0, kind: 'normalized', forms: new Set() };
      rec.count += 1;
      if (exact) rec.kind = 'exact';
      rec.forms.add(form);
      found.set(entry.term, rec);
      return ' '.repeat(m.length);
    });
    if (hit) re.lastIndex = 0;
  }
  return found;
}

const scanCache = new Map();
function cachedScan(text) {
  if (scanCache.has(text)) return scanCache.get(text);
  const result = scanDictionary(text);
  if (scanCache.size > 500) scanCache.clear();
  scanCache.set(text, result);
  return result;
}

/**
 * How a term appears in a piece of text:
 *   'exact'      the term itself (case-insensitive unless the term is case-sensitive)
 *   'normalized' a listed variant/synonym, or the same letters ignoring spaces, dots and hyphens
 *   null         not found
 * Dictionary terms use the masked scan; user-added terms are matched directly.
 */
export function matchKind(haystack, term) {
  const text = String(haystack ?? '');
  if (!text) return null;
  const entry = findDictionaryEntry(term.term);
  if (entry && entry.term === term.term) {
    const rec = cachedScan(text).get(entry.term);
    return rec ? rec.kind : null;
  }
  if (countMatches(text, term.term, term.caseSensitive)) return 'exact';
  for (const v of term.variants ?? [])
    if (countMatches(text, v, term.caseSensitive)) return 'normalized';
  const c = compact(term.term);
  // Compact matching only for terms long enough not to collide with ordinary words.
  if (c.length >= 4 && !term.caseSensitive) {
    const tokens = fold(text)
      .split(/[^\p{L}\p{N}.+#\-/]+/u)
      .map(compact);
    if (
      tokens.includes(c) ||
      tokens.includes(`${c}s`) ||
      (c.endsWith('s') && tokens.includes(c.slice(0, -1)))
    )
      return 'normalized';
  }
  return null;
}
