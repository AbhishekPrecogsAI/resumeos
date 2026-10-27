// Canonical shape of resume content. The master profile and resume drafts both use it.
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

/** List sections whose entries carry stable ids. */
export const LIST_SECTIONS = [
  'experience',
  'projects',
  'skills',
  'education',
  'certifications',
  'customSections',
];

export const ID_PREFIX = {
  experience: 'exp',
  projects: 'prj',
  skills: 'sk',
  education: 'edu',
  certifications: 'cert',
  customSections: 'sec',
  customItem: 'itm',
  evidenceItems: 'ev',
  bullet: 'b',
};

export function emptyContact() {
  return {
    name: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    portfolio: '',
  };
}

export function emptyContent() {
  return {
    contact: emptyContact(),
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

/** Bullets are { id, text, evidenceIds }; plain strings are accepted for convenience. */
export function bulletText(bullet) {
  return typeof bullet === 'string' ? bullet : (bullet?.text ?? '');
}

export function sectionTitle(content, key) {
  if (key.startsWith('custom:')) {
    return (
      (content.customSections ?? []).find((s) => `custom:${s.id}` === key)?.title ||
      'Untitled section'
    );
  }
  return SECTION_TITLES[key] ?? key;
}
