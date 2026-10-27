// Canonical shape of resume content. Profile and resume versions both use it.
export const SECTION_KEYS = [
  'summary',
  'experience',
  'projects',
  'skills',
  'education',
  'certifications',
];

export const SECTION_TITLES = {
  summary: 'Summary',
  experience: 'Experience',
  projects: 'Projects',
  skills: 'Skills',
  education: 'Education',
  certifications: 'Certifications',
};

export function emptyContent() {
  return {
    contact: {
      name: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
      github: '',
      portfolio: '',
    },
    headline: '',
    summary: '',
    experience: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
    customSections: [],
  };
}

export function defaultLayout(content = emptyContent()) {
  return {
    sectionOrder: [...SECTION_KEYS, ...(content.customSections ?? []).map((s) => `custom:${s.id}`)],
    hiddenSections: [],
    hiddenItems: [],
  };
}

/** Section order with any sections missing from a stored layout appended, unknown keys dropped. */
export function resolveSectionOrder(content, layout) {
  const valid = new Set([
    ...SECTION_KEYS,
    ...(content.customSections ?? []).map((s) => `custom:${s.id}`),
  ]);
  const ordered = (layout?.sectionOrder ?? []).filter((key) => valid.has(key));
  for (const key of valid) if (!ordered.includes(key)) ordered.push(key);
  return ordered;
}
