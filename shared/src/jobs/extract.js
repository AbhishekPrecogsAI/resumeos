import { TERM_DICTIONARY, termId, findDictionaryEntry, fold } from './dictionary.js';
import { countMatches, scanDictionary } from './match.js';

export const MAX_JOB_DESCRIPTION_CHARS = 20_000;
export const MAX_TERMS = 80;

const PREFERRED_HEADING =
  /\b(nice[\s-]to[\s-]have|bonus|preferred|plus|desirable|good to have|ideally)\b/i;
const REQUIRED_HEADING =
  /\b(requirements?|qualifications?|must[\s-]have|what you('|’)ll need|you have|required|skills|experience)\b/i;

// Capitalised words that are common in job ads but aren't skills.
const STOP = new Set(
  'a an and are as at be by for from in is it of on or our the to we with you your this that will team teams role roles work working company years year experience strong ability skills including such using across about who what when where how our us they them their etc join help build new great looking ideal candidate benefits salary remote hybrid office equal opportunity employer apply day days week weeks month months responsibilities requirements qualifications nice have must preferred bonus plus senior junior lead staff principal engineer engineers engineering developer developers software product products customer customers business data platform platforms service services system systems tools tool technology technologies stack backend frontend full fullstack mid level knowledge understanding familiarity proficiency hands-on excellent good solid deep the'.split(
    ' ',
  ),
);

function linesWithImportance(text) {
  let current = 'required';
  let sawHeading = false;
  return text.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    const isHeading =
      trimmed.length > 0 &&
      trimmed.length < 70 &&
      (/:$/.test(trimmed) ||
        /^#+\s/.test(trimmed) ||
        (!/[.]$/.test(trimmed) && trimmed.split(/\s+/).length <= 6));
    if (isHeading && PREFERRED_HEADING.test(trimmed)) {
      current = 'preferred';
      sawHeading = true;
    } else if (isHeading && REQUIRED_HEADING.test(trimmed)) {
      current = 'required';
      sawHeading = true;
    } else if (/\b(nice to have|is a plus|would be a plus|bonus|preferred)\b/i.test(trimmed)) {
      return { line, importance: 'preferred' };
    }
    return { line, importance: sawHeading ? current : 'mentioned' };
  });
}

const RANK = { required: 0, mentioned: 1, preferred: 2 };

/**
 * Deterministic term extraction:
 *  1. Find every dictionary term or variant, using whole-word matching (case-sensitive for
 *     ambiguous names).
 *  2. Note importance from the nearest heading ("Requirements" / "Nice to have") or inline
 *     phrases like "is a plus"; lines before any heading are "mentioned".
 *  3. Add capitalised words or acronyms that appear at least twice and aren't in the dictionary,
 *     marked as candidates for the user to keep or remove.
 * Returns terms sorted by importance, then frequency.
 */
export function extractTerms(text) {
  const source = String(text ?? '')
    .slice(0, MAX_JOB_DESCRIPTION_CHARS)
    .normalize('NFKC');
  const lines = linesWithImportance(source);
  const found = new Map();

  const byTerm = new Map(TERM_DICTIONARY.map((e) => [e.term, e]));
  for (const { line, importance: imp } of lines) {
    for (const [name, rec] of scanDictionary(line)) {
      const entry = byTerm.get(name);
      const id = termId(name);
      const existing = found.get(id) ?? {
        id,
        term: name,
        category: entry.category,
        variants: entry.variants,
        caseSensitive: Boolean(entry.caseSensitive),
        count: 0,
        importance: imp,
        source: 'dictionary',
        matchedForms: [],
      };
      existing.count += rec.count;
      if (RANK[imp] < RANK[existing.importance]) existing.importance = imp;
      existing.matchedForms = [...new Set([...existing.matchedForms, ...rec.forms])];
      found.set(id, existing);
    }
  }

  // Candidates: capitalised words / acronyms repeated at least twice, not already covered.
  const tokenCounts = new Map();
  for (const m of source.matchAll(
    /(?<![\p{L}\p{N}])([A-Z][A-Za-z0-9+#.]{1,30}|[A-Z]{2,10})(?![\p{L}\p{N}])/gu,
  )) {
    const token = m[1].replace(/\.$/, '');
    if (token.length < 2 || STOP.has(fold(token)) || findDictionaryEntry(token)) continue;
    tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
  }
  for (const [token, count] of tokenCounts) {
    const id = termId(token);
    if (count < 2 || found.has(id)) continue;
    // Skip tokens that only ever appear at the start of a sentence (ordinary capitalised words).
    const midSentence = new RegExp(
      `[a-z,;:(]\\s+${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`,
      'u',
    ).test(source);
    if (!midSentence && !/^[A-Z0-9]+$/.test(token)) continue;
    let importance = null;
    for (const { line, importance: imp } of lines)
      if (countMatches(line, token, true) && (importance === null || RANK[imp] < RANK[importance]))
        importance = imp;
    found.set(id, {
      id,
      term: token,
      category: 'other',
      variants: [],
      caseSensitive: true,
      count,
      importance: importance ?? 'mentioned',
      source: 'candidate',
      matchedForms: [token],
    });
  }

  return [...found.values()]
    .sort(
      (a, b) =>
        RANK[a.importance] - RANK[b.importance] ||
        (a.source === 'candidate') - (b.source === 'candidate') ||
        b.count - a.count ||
        a.term.localeCompare(b.term),
    )
    .slice(0, MAX_TERMS);
}

/** A user-added term: uses the dictionary's variants when it's a known term. */
export function customTerm(text) {
  const entry = findDictionaryEntry(text);
  if (entry)
    return {
      id: termId(entry.term),
      term: entry.term,
      category: entry.category,
      variants: entry.variants,
      caseSensitive: Boolean(entry.caseSensitive),
      count: 0,
      importance: 'required',
      source: 'user',
      matchedForms: [],
    };
  const term = String(text).trim().slice(0, 80);
  return {
    id: termId(term),
    term,
    category: 'other',
    variants: [],
    caseSensitive: false,
    count: 0,
    importance: 'required',
    source: 'user',
    matchedForms: [],
  };
}
