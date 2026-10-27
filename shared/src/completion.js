import { bulletText } from './resumeModel.js';

/**
 * Profile completion checklist. Each rule is explicit so the UI can show exactly what's missing;
 * there is no hidden weighting.
 */
export const COMPLETION_RULES = [
  {
    id: 'name',
    label: 'Add your name',
    anchor: 'contact',
    test: (c) => Boolean(c.contact?.name?.trim()),
  },
  {
    id: 'email',
    label: 'Add a contact email',
    anchor: 'contact',
    test: (c) => Boolean(c.contact?.email?.trim()),
  },
  {
    id: 'link',
    label: 'Add at least one professional link',
    anchor: 'contact',
    test: (c) => ['website', 'linkedin', 'github', 'portfolio'].some((k) => c.contact?.[k]?.trim()),
  },
  {
    id: 'headline',
    label: 'Write a headline',
    anchor: 'summary',
    test: (c) => Boolean(c.headline?.trim()),
  },
  {
    id: 'summary',
    label: 'Write a summary',
    anchor: 'summary',
    test: (c) => Boolean(c.summary?.trim()),
  },
  {
    id: 'experience',
    label: 'Add a role with title, company and start date',
    anchor: 'experience',
    test: (c) =>
      (c.experience ?? []).some((e) => e.title?.trim() && e.company?.trim() && e.startDate),
  },
  {
    id: 'bullets',
    label: 'Describe what you did in at least one role',
    anchor: 'experience',
    test: (c) =>
      (c.experience ?? []).some((e) => (e.bullets ?? []).some((b) => bulletText(b).trim())),
  },
  {
    id: 'skills',
    label: 'List at least three skills',
    anchor: 'skills',
    test: (c) => (c.skills ?? []).filter((s) => s.name?.trim()).length >= 3,
  },
  {
    id: 'education',
    label: 'Add education or a certification',
    anchor: 'education',
    test: (c) =>
      (c.education ?? []).some((e) => e.institution?.trim()) ||
      (c.certifications ?? []).some((x) => x.name?.trim()),
  },
];

export function profileCompletion(content) {
  const items = COMPLETION_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    anchor: rule.anchor,
    done: rule.test(content ?? {}),
  }));
  return { items, done: items.filter((i) => i.done).length, total: items.length };
}
