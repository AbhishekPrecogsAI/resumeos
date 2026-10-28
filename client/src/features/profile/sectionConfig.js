import { newId } from '@resumeos/shared/ids.js';
import { ID_PREFIX, LANGUAGE_LEVELS, languageLevel } from '@resumeos/shared/resumeModel.js';
import { safeHref } from '@resumeos/shared/escape.js';

const urlError = (v) =>
  v && !safeHref(v) ? 'Enter a full web address starting with https://' : null;
const notCurrent = (e) => Boolean(e.current);
const join = (...parts) => parts.filter((p) => p && String(p).trim()).join(', ');

export const CONTACT_FIELDS = [
  { key: 'name', label: 'Full name', autoComplete: 'name' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { key: 'phone', label: 'Phone', optional: true, autoComplete: 'tel' },
  {
    key: 'location',
    label: 'Location',
    optional: true,
    hint: 'For example "Berlin, Germany (remote)".',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    type: 'url',
    optional: true,
    placeholder: 'https://www.linkedin.com/in/…',
    validate: urlError,
  },
  {
    key: 'github',
    label: 'GitHub',
    type: 'url',
    optional: true,
    placeholder: 'https://github.com/…',
    validate: urlError,
  },
  { key: 'website', label: 'Website', type: 'url', optional: true, validate: urlError },
  { key: 'portfolio', label: 'Portfolio', type: 'url', optional: true, validate: urlError },
];

const dateFields = [
  { key: 'startDate', label: 'Start date', type: 'month' },
  { key: 'endDate', label: 'End date', type: 'month', disabledWhen: notCurrent },
  { key: 'current', label: 'I currently work here', type: 'checkbox' },
];

export const SECTIONS = {
  experience: {
    title: 'Experience',
    noun: 'role',
    addLabel: 'Add role',
    emptyText: 'No roles yet. Add your most recent job first.',
    describe: (e) => join(e.title, e.company),
    newItem: () => ({
      id: newId(ID_PREFIX.experience),
      company: '',
      title: '',
      location: '',
      employmentType: '',
      startDate: '',
      endDate: '',
      current: false,
      bullets: [],
    }),
    fields: [
      { key: 'title', label: 'Job title' },
      { key: 'company', label: 'Company' },
      { key: 'location', label: 'Location', optional: true },
      {
        key: 'employmentType',
        label: 'Employment type',
        optional: true,
        hint: 'Full-time, contract, part-time…',
      },
      ...dateFields,
      { key: 'bullets', label: 'What you did', type: 'bullets' },
    ],
  },
  projects: {
    title: 'Projects',
    noun: 'project',
    emptyText: 'No projects yet. Side projects, open source and notable work projects all count.',
    describe: (p) => p.name,
    newItem: () => ({
      id: newId(ID_PREFIX.projects),
      name: '',
      description: '',
      url: '',
      repositoryUrl: '',
      technologies: [],
      startDate: '',
      endDate: '',
      current: false,
      bullets: [],
    }),
    fields: [
      { key: 'name', label: 'Project name' },
      { key: 'technologies', label: 'Technologies', type: 'tags', optional: true },
      { key: 'description', label: 'Description', type: 'textarea', optional: true, rows: 2 },
      { key: 'url', label: 'Project URL', type: 'url', optional: true, validate: urlError },
      {
        key: 'repositoryUrl',
        label: 'Repository URL',
        type: 'url',
        optional: true,
        validate: urlError,
      },
      { key: 'startDate', label: 'Start date', type: 'month', optional: true },
      {
        key: 'endDate',
        label: 'End date',
        type: 'month',
        optional: true,
        disabledWhen: notCurrent,
      },
      { key: 'current', label: 'Ongoing', type: 'checkbox' },
      { key: 'bullets', label: 'Highlights', type: 'bullets' },
    ],
  },
  education: {
    title: 'Education',
    noun: 'education entry',
    addLabel: 'Add education',
    emptyText: 'No education added.',
    describe: (e) => join(e.degree, e.institution),
    newItem: () => ({
      id: newId(ID_PREFIX.education),
      institution: '',
      degree: '',
      field: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      notes: '',
    }),
    fields: [
      { key: 'institution', label: 'Institution' },
      { key: 'degree', label: 'Degree or qualification', optional: true },
      { key: 'field', label: 'Field of study', optional: true },
      { key: 'location', label: 'Location', optional: true },
      { key: 'startDate', label: 'Start date', type: 'month', optional: true },
      {
        key: 'endDate',
        label: 'End date',
        type: 'month',
        optional: true,
        disabledWhen: notCurrent,
      },
      { key: 'current', label: 'Currently studying', type: 'checkbox' },
      {
        key: 'notes',
        label: 'Notes',
        type: 'textarea',
        optional: true,
        rows: 2,
        hint: 'Honours, thesis, relevant coursework.',
      },
    ],
  },
  certifications: {
    title: 'Certifications',
    noun: 'certification',
    emptyText: 'No certifications added.',
    describe: (c) => join(c.name, c.issuer),
    newItem: () => ({
      id: newId(ID_PREFIX.certifications),
      name: '',
      issuer: '',
      issuedDate: '',
      expiresDate: '',
      url: '',
    }),
    fields: [
      { key: 'name', label: 'Certification' },
      { key: 'issuer', label: 'Issuer', optional: true },
      { key: 'issuedDate', label: 'Issued', type: 'month', optional: true },
      { key: 'expiresDate', label: 'Expires', type: 'month', optional: true },
      {
        key: 'url',
        label: 'Verification URL',
        type: 'url',
        optional: true,
        wide: true,
        validate: urlError,
      },
    ],
  },
  languages: {
    title: 'Languages',
    noun: 'language',
    addLabel: 'Add language',
    emptyText: 'No languages added. Include the ones you can work in.',
    describe: (l) => join(l.name, languageLevel(l.level)?.label),
    newItem: () => ({ id: newId(ID_PREFIX.languages), name: '', level: '' }),
    fields: [
      { key: 'name', label: 'Language' },
      {
        key: 'level',
        label: 'Level',
        type: 'select',
        optional: true,
        hint: 'Shown as a word, and as dots on templates with an accent colour.',
        options: [
          { value: '', label: 'Don’t show a level' },
          ...LANGUAGE_LEVELS.map((l) => ({ value: l.id, label: l.label })),
        ],
      },
    ],
  },
  interests: {
    title: 'Interests',
    noun: 'interest',
    addLabel: 'Add interest',
    emptyText: 'No interests added. A few specific ones give interviewers something to ask about.',
    describe: (i) => i.name,
    newItem: () => ({ id: newId(ID_PREFIX.interests), name: '' }),
    fields: [{ key: 'name', label: 'Interest', hint: 'For example "Trail running".' }],
  },
  evidenceItems: {
    title: 'Evidence',
    noun: 'evidence item',
    emptyText:
      'No evidence yet. Add links or private notes that back up specific claims, like a benchmark report or a merged PR.',
    describe: (e) => e.title,
    newItem: () => ({
      id: newId(ID_PREFIX.evidenceItems),
      title: '',
      kind: 'link',
      url: '',
      note: '',
      relatedIds: [],
    }),
    fields: [
      { key: 'title', label: 'Title', hint: 'For example "Latency benchmark, March 2024".' },
      {
        key: 'kind',
        label: 'Type',
        type: 'select',
        options: [
          { value: 'link', label: 'Link' },
          { value: 'note', label: 'Private note' },
        ],
      },
      { key: 'url', label: 'URL', type: 'url', optional: true, wide: true, validate: urlError },
      {
        key: 'note',
        label: 'Note',
        type: 'textarea',
        optional: true,
        hint: 'Private. Never shown on a resume.',
      },
      { key: 'relatedIds', label: 'Related roles and projects', type: 'related', optional: true },
    ],
  },
};

export const CUSTOM_ITEM_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'subtitle', label: 'Subtitle', optional: true, hint: 'Organisation, venue or publisher.' },
  { key: 'startDate', label: 'Start date', type: 'month', optional: true },
  { key: 'endDate', label: 'End date', type: 'month', optional: true, disabledWhen: notCurrent },
  { key: 'current', label: 'Ongoing', type: 'checkbox' },
  { key: 'description', label: 'Description', type: 'textarea', optional: true, rows: 2 },
  { key: 'bullets', label: 'Details', type: 'bullets' },
];

export const newCustomSection = () => ({
  id: newId(ID_PREFIX.customSections),
  title: '',
  items: [],
});
export const newCustomItem = () => ({
  id: newId(ID_PREFIX.customItem),
  title: '',
  subtitle: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
  bullets: [],
});
