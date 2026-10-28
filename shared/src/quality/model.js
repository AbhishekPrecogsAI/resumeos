import { bulletText, sectionTitle, resolveSectionOrder } from '../resumeModel.js';
import { contentHash } from '../hash.js';

export const SEVERITIES = ['error', 'warning', 'info'];
export const CATEGORIES = {
  integrity: 'Document integrity',
  structure: 'Structure',
  consistency: 'Consistency',
  completeness: 'Completeness',
  readability: 'Readability',
  claims: 'Claims and evidence',
};

const LIST_KEYS = ['experience', 'projects', 'education', 'certifications'];
const LABEL = {
  experience: (e) => [e.title, e.company].filter(Boolean).join(', '),
  projects: (p) => p.name,
  education: (e) => [e.degree, e.institution].filter(Boolean).join(', '),
  certifications: (c) => c.name,
  custom: (i) => i.title,
};

/**
 * Flatten the visible resume into entries and bullets with human-readable locations, so every
 * rule reports positions the same way. Hidden sections and entries are excluded: checks look at
 * what will actually print.
 */
export function visibleModel(content, layout = {}) {
  const hiddenSections = new Set(layout.hiddenSections ?? []);
  const hiddenItems = new Set(layout.hiddenItems ?? []);
  const order = resolveSectionOrder(content, layout).filter((k) => !hiddenSections.has(k));
  const entries = [];
  for (const key of order) {
    if (LIST_KEYS.includes(key)) {
      (content[key] ?? []).forEach((entry, index) => {
        if (hiddenItems.has(entry.id)) return;
        entries.push({
          section: key,
          sectionTitle: sectionTitle(content, key),
          entry,
          index,
          label: LABEL[key](entry) || `entry ${index + 1}`,
        });
      });
    } else if (key.startsWith('custom:')) {
      const section = (content.customSections ?? []).find((s) => `custom:${s.id}` === key);
      (section?.items ?? []).forEach((entry, index) => {
        if (hiddenItems.has(entry.id)) return;
        entries.push({
          section: key,
          sectionTitle: section.title || 'Untitled section',
          entry,
          index,
          label: LABEL.custom(entry) || `entry ${index + 1}`,
          customSectionId: section.id,
        });
      });
    }
  }
  const bullets = entries.flatMap((e) =>
    (e.entry.bullets ?? []).map((b, i) => ({
      ...e,
      bullet: b,
      bulletIndex: i,
      text: bulletText(b),
    })),
  );
  const skills = order.includes('skills')
    ? (content.skills ?? []).filter((s) => !hiddenItems.has(s.id))
    : [];
  return { order, entries, bullets, skills, showSummary: order.includes('summary') };
}

export function entryLocation(e) {
  return `${e.sectionTitle}: ${e.label}`;
}

export function bulletLocation(b) {
  return `${entryLocation(b)}, bullet ${b.bulletIndex + 1}`;
}

/**
 * Build a finding. `key` must be stable for the same issue on the same text, so a dismissal
 * survives unrelated edits but the finding returns if the flagged text changes.
 */
export function finding(
  rule,
  {
    severity = rule.severity,
    location,
    section,
    entryId = null,
    bulletId = null,
    field = null,
    excerpt: ex = '',
    message,
    suggestion,
    fix = null,
    keyParts = [],
  },
) {
  return {
    ruleId: rule.id,
    category: rule.category,
    severity,
    title: rule.title,
    location,
    section,
    entryId,
    bulletId,
    field,
    excerpt: ex,
    message,
    whyItMatters: rule.whyItMatters,
    suggestion,
    fix,
    key: `${rule.id}:${contentHash([section, entryId, bulletId, field, ...keyParts])}`,
  };
}
