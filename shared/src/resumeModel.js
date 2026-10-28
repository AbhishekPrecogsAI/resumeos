// Canonical shape of resume content. The master profile and resume drafts both use it.
export const SECTION_KEYS = [
  'summary',
  'experience',
  'projects',
  'skills',
  'education',
  'certifications',
  'languages',
  'interests',
];

export const SECTION_TITLES = {
  summary: 'Summary',
  experience: 'Experience',
  projects: 'Projects',
  skills: 'Skills',
  education: 'Education',
  certifications: 'Certifications',
  languages: 'Languages',
  interests: 'Interests',
};

/**
 * Sections added after launch. Resumes saved before them don't list them in their section
 * order; the page editor shows them there only once they have content or the user adds them,
 * so older resumes don't suddenly show empty placeholders.
 */
export const LATER_SECTIONS = ['languages', 'interests'];

/** A later section the resume hasn't taken up yet: not in its saved order and empty. */
export const notYetAdded = (content, layout, key) =>
  LATER_SECTIONS.includes(key) &&
  !(layout?.sectionOrder ?? []).includes(key) &&
  !(content?.[key] ?? []).length;

/** List sections whose entries carry stable ids. */
export const LIST_SECTIONS = [
  'experience',
  'projects',
  'skills',
  'education',
  'certifications',
  'languages',
  'interests',
  'customSections',
];

export const ID_PREFIX = {
  experience: 'exp',
  projects: 'prj',
  skills: 'sk',
  education: 'edu',
  certifications: 'cert',
  languages: 'lang',
  interests: 'int',
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
    languages: [],
    interests: [],
    customSections: [],
  };
}

/**
 * Language proficiency, strongest first. `dots` is how many of five dots templates fill; the
 * label is always printed as text too, so applicant tracking systems read the level.
 */
export const LANGUAGE_LEVELS = [
  { id: 'native', label: 'Native', dots: 5 },
  { id: 'fluent', label: 'Fluent', dots: 4 },
  { id: 'professional', label: 'Professional', dots: 3 },
  { id: 'conversational', label: 'Conversational', dots: 2 },
  { id: 'basic', label: 'Basic', dots: 1 },
];
export const LANGUAGE_LEVEL_IDS = LANGUAGE_LEVELS.map((l) => l.id);
export const languageLevel = (id) => LANGUAGE_LEVELS.find((l) => l.id === id) ?? null;

/**
 * Optional skill level, 1–5. Shown only as a drawn meter on templates with an accent; the skill
 * name is what applicant tracking systems read, so the level adds no text.
 */
export const SKILL_LEVELS = [
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Intermediate' },
  { value: 3, label: 'Proficient' },
  { value: 4, label: 'Advanced' },
  { value: 5, label: 'Expert' },
];
export const skillLevel = (value) => SKILL_LEVELS.find((l) => l.value === value) ?? null;

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
