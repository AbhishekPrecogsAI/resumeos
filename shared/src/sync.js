import { contentHash } from './hash.js';
import { LIST_SECTIONS } from './resumeModel.js';

/**
 * Profile ↔ resume synchronisation.
 *
 * A resume copies profile entries under the same ids and records `baselines[key] = hash` of
 * the profile entry it copied. Comparing three hashes tells us what happened since:
 *   profile hash ≠ baseline → the profile changed upstream
 *   resume hash  ≠ baseline → the resume was customised locally
 * Nothing is ever applied automatically; the user chooses per entry.
 */

// Fields compared for sync. Excludes nothing today; kept explicit for future per-resume-only fields.
const entryFingerprint = (entry) => contentHash(entry ?? null);

export const SINGLE_KEYS = ['contact', 'headline', 'summary'];

export function baselineKey(section, id) {
  return id ? `${section}:${id}` : section;
}

/** Baselines for a freshly copied resume. */
export function buildBaselines(profile) {
  const out = {};
  for (const key of SINGLE_KEYS) out[key] = entryFingerprint(profile[key]);
  for (const section of LIST_SECTIONS) {
    for (const entry of profile[section] ?? [])
      out[baselineKey(section, entry.id)] = entryFingerprint(entry);
  }
  return out;
}

/**
 * Per-entry sync status. Returns a list of { section, id, key, status, profileEntry, resumeEntry }:
 *   'profile-updated'  profile changed, resume not customised → safe to pull
 *   'conflict'         both changed → user must choose
 *   'customised'       only the resume changed (informational)
 *   'not-in-resume'    profile entry the resume doesn't include
 *   'removed-from-profile'  resume entry no longer in the profile
 * Entries with no differences are omitted.
 */
export function compareWithProfile(resume, profile, baselines = {}) {
  const out = [];
  const classify = (key, section, id, profileEntry, resumeEntry) => {
    const base = baselines[key];
    const p = entryFingerprint(profileEntry);
    const r = entryFingerprint(resumeEntry);
    if (p === r) return;
    if (base === undefined) {
      // Added locally or copied before baselines existed: treat as customised.
      out.push({ section, id, key, status: 'customised', profileEntry, resumeEntry });
      return;
    }
    const profileChanged = p !== base;
    const resumeChanged = r !== base;
    const status =
      profileChanged && resumeChanged
        ? 'conflict'
        : profileChanged
          ? 'profile-updated'
          : 'customised';
    out.push({ section, id, key, status, profileEntry, resumeEntry });
  };

  for (const key of SINGLE_KEYS) classify(key, key, null, profile[key], resume[key]);

  for (const section of LIST_SECTIONS) {
    const resumeById = new Map((resume[section] ?? []).map((e) => [e.id, e]));
    const profileById = new Map((profile[section] ?? []).map((e) => [e.id, e]));
    for (const [id, profileEntry] of profileById) {
      const key = baselineKey(section, id);
      if (!resumeById.has(id)) {
        // A matching baseline means the user already chose to leave this version out (or removed it here).
        if (baselines[key] !== entryFingerprint(profileEntry)) {
          out.push({ section, id, key, status: 'not-in-resume', profileEntry, resumeEntry: null });
        }
      } else classify(key, section, id, profileEntry, resumeById.get(id));
    }
    for (const [id, resumeEntry] of resumeById) {
      if (!profileById.has(id) && baselines[baselineKey(section, id)] !== undefined) {
        out.push({
          section,
          id,
          key: baselineKey(section, id),
          status: 'removed-from-profile',
          profileEntry: null,
          resumeEntry,
        });
      }
    }
  }
  return out;
}

/** Apply the profile version of one entry to resume content (returns new content + baselines). */
export function pullFromProfile(resume, profile, baselines, { section, id }) {
  const content = structuredClone(resume);
  const nextBaselines = { ...baselines };
  if (!id) {
    content[section] = structuredClone(profile[section]);
    nextBaselines[section] = entryFingerprint(profile[section]);
    return { content, baselines: nextBaselines };
  }
  const profileEntry = (profile[section] ?? []).find((e) => e.id === id);
  if (!profileEntry) return { content, baselines: nextBaselines };
  const list = content[section] ?? [];
  const index = list.findIndex((e) => e.id === id);
  if (index >= 0) list[index] = structuredClone(profileEntry);
  else list.push(structuredClone(profileEntry));
  content[section] = list;
  nextBaselines[baselineKey(section, id)] = entryFingerprint(profileEntry);
  return { content, baselines: nextBaselines };
}

/**
 * Keep the resume as it is but acknowledge the current profile state, dismissing the notice.
 * For entries deleted from the profile, the baseline is dropped so the resume copy stands alone.
 */
export function acknowledgeProfile(baselines, profile, { section, id }) {
  const next = { ...baselines };
  const key = baselineKey(section, id);
  const entry = id ? (profile[section] ?? []).find((e) => e.id === id) : profile[section];
  if (id && !entry) delete next[key];
  else next[key] = entryFingerprint(entry ?? null);
  return next;
}
