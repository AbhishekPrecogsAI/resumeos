import { bulletText, resolveSectionOrder, sectionTitle } from '../resumeModel.js';
import { matchKind } from './match.js';

const ENTRY_SECTIONS = ['experience', 'projects', 'education', 'certifications'];
const label = (section, e) =>
  ({
    experience: [e.title, e.company].filter(Boolean).join(', '),
    projects: e.name,
    education: [e.degree, e.institution].filter(Boolean).join(', '),
    certifications: e.name,
  })[section] ||
  e.title ||
  'Untitled entry';

function entryText(e) {
  return [
    e.title,
    e.company,
    e.name,
    e.degree,
    e.field,
    e.institution,
    e.issuer,
    e.subtitle,
    e.description,
    e.notes,
    (e.technologies ?? []).join(', '),
    ...(e.bullets ?? []).map(bulletText),
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Searchable text blocks with locations. For a resume, `visibleOnly` excludes hidden sections and
 * entries, because only printed text counts as "in this resume". The profile is searched in full
 * (except private evidence notes, which never appear on a resume).
 */
export function textBlocks(content, layout, { visibleOnly }) {
  const hiddenSections = new Set(visibleOnly ? (layout?.hiddenSections ?? []) : []);
  const hiddenItems = new Set(visibleOnly ? (layout?.hiddenItems ?? []) : []);
  const order = resolveSectionOrder(content, layout ?? {}).filter((k) => !hiddenSections.has(k));
  const blocks = [];
  if (content.headline)
    blocks.push({ section: 'summary', id: null, location: 'Headline', text: content.headline });
  if (order.includes('summary') && content.summary)
    blocks.push({ section: 'summary', id: null, location: 'Summary', text: content.summary });
  if (order.includes('skills')) {
    for (const s of content.skills ?? [])
      if (!hiddenItems.has(s.id) && s.name)
        blocks.push({
          section: 'skills',
          id: s.id,
          location: `Skills: ${s.name}`,
          text: [s.name, s.context].filter(Boolean).join(' '),
        });
  }
  for (const section of ENTRY_SECTIONS) {
    if (!order.includes(section)) continue;
    for (const e of content[section] ?? [])
      if (!hiddenItems.has(e.id))
        blocks.push({
          section,
          id: e.id,
          location: `${sectionTitle(content, section)}: ${label(section, e)}`,
          text: entryText(e),
        });
  }
  for (const s of content.customSections ?? []) {
    if (!order.includes(`custom:${s.id}`)) continue;
    for (const e of s.items ?? [])
      if (!hiddenItems.has(e.id))
        blocks.push({
          section: `custom:${s.id}`,
          id: e.id,
          customSectionId: s.id,
          location: `${s.title || 'Custom section'}: ${e.title || 'Untitled entry'}`,
          text: entryText(e),
        });
  }
  return blocks;
}

function locate(blocks, term) {
  const hits = [];
  for (const b of blocks) {
    const kind = matchKind(b.text, term);
    if (kind) hits.push({ ...b, kind, text: undefined });
  }
  return hits;
}

/** Which approvable change would bring a profile match onto this resume, if any. */
function suggestionFor(hit, resume) {
  const { content, layout } = resume;
  const hiddenSections = new Set(layout?.hiddenSections ?? []);
  const hiddenItems = new Set(layout?.hiddenItems ?? []);
  if (hit.section === 'summary') return null; // Wording differs from the profile; no safe automatic change.
  const sectionKey = hit.section;
  if (hiddenSections.has(sectionKey))
    return {
      type: 'showSection',
      section: sectionKey,
      label: `Show the ${sectionTitle(content, sectionKey)} section`,
    };
  if (!hit.id) return null;
  const inResume = hit.customSectionId
    ? (content.customSections ?? [])
        .find((s) => s.id === hit.customSectionId)
        ?.items?.some((i) => i.id === hit.id)
    : (content[sectionKey] ?? []).some((e) => e.id === hit.id);
  if (inResume && hiddenItems.has(hit.id))
    return { type: 'showItem', section: sectionKey, id: hit.id, label: `Show "${hit.location}"` };
  if (!inResume && !hit.customSectionId)
    return {
      type: 'addFromProfile',
      section: sectionKey,
      id: hit.id,
      label: `Add "${hit.location}" from your profile`,
    };
  return null;
}

/**
 * Compare terms with a resume (visible text only) and the master profile.
 * Status per term:
 *   'in-resume'         found in printed resume text (match: 'exact' or 'normalized')
 *   'in-profile'        found in your profile but not on this resume, with suggestions
 *   'not-found'         not found in your saved profile — which says nothing about your real experience
 */
export function coverage(terms, resume, profile) {
  const resumeBlocks = textBlocks(resume.content, resume.layout, { visibleOnly: true });
  const profileBlocks = textBlocks(profile, null, { visibleOnly: false });
  const results = terms.map((term) => {
    const inResume = locate(resumeBlocks, term);
    if (inResume.length) {
      const match = inResume.some((h) => h.kind === 'exact') ? 'exact' : 'normalized';
      return {
        term,
        status: 'in-resume',
        match,
        resumeLocations: inResume.map((h) => h.location),
        profileLocations: [],
        suggestions: [],
      };
    }
    const inProfile = locate(profileBlocks, term);
    if (inProfile.length) {
      const seen = new Set();
      const suggestions = inProfile
        .map((h) => suggestionFor(h, resume))
        .filter(
          (s) =>
            s &&
            !seen.has(`${s.type}:${s.section}:${s.id}`) &&
            seen.add(`${s.type}:${s.section}:${s.id}`),
        );
      return {
        term,
        status: 'in-profile',
        match: inProfile.some((h) => h.kind === 'exact') ? 'exact' : 'normalized',
        resumeLocations: [],
        profileLocations: inProfile.map((h) => h.location),
        suggestions,
      };
    }
    return {
      term,
      status: 'not-found',
      match: null,
      resumeLocations: [],
      profileLocations: [],
      suggestions: [],
    };
  });

  const inResume = results.filter((r) => r.status === 'in-resume');
  return {
    results,
    counts: {
      total: results.length,
      inResume: inResume.length,
      exact: inResume.filter((r) => r.match === 'exact').length,
      normalized: inResume.filter((r) => r.match === 'normalized').length,
      inProfile: results.filter((r) => r.status === 'in-profile').length,
      notFound: results.filter((r) => r.status === 'not-found').length,
    },
    method:
      'Whole-word matching of each term against the text that prints on this resume, then against your full profile. "Exact" means the term itself appears; "normalized" means a listed variant (e.g. NodeJS for Node.js) or the same letters ignoring spaces, dots and hyphens. Hidden content and private evidence notes are not counted as on the resume.',
  };
}
