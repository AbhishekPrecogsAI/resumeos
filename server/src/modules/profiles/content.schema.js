import { z } from 'zod';
import { ID_PATTERN } from '@resumeos/shared/ids.js';
import { LIMITS } from '@resumeos/shared/limits.js';
import { SECTION_KEYS } from '@resumeos/shared/resumeModel.js';

// User text is stored exactly as typed: no trimming or rewriting. Only types and sizes are enforced.
const text = (max) => z.string().max(max, `Use at most ${max} characters.`).default('');
const id = z.string().regex(ID_PATTERN, 'Invalid id.');
const month = z
  .string()
  .regex(/^(\d{4}(-(0[1-9]|1[0-2]))?)?$/, 'Use YYYY or YYYY-MM.')
  .default('');
const url = z
  .string()
  .max(LIMITS.url)
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Enter a full web address starting with https://')
  .default('');
const email = z
  .string()
  .max(254)
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address.')
  .default('');
const ids = (max) => z.array(id).max(max).default([]);
const list = (schema, max = LIMITS.entriesPerSection) =>
  z
    .array(schema)
    .max(max, `At most ${max} entries.`)
    .default([])
    .superRefine((items, ctx) => {
      const seen = new Set();
      items.forEach((item, index) => {
        if (seen.has(item.id))
          ctx.addIssue({ code: 'custom', path: [index, 'id'], message: 'Duplicate id.' });
        seen.add(item.id);
      });
    });

export const bulletSchema = z.strictObject({
  id,
  text: text(LIMITS.bullet),
  evidenceIds: ids(LIMITS.evidencePerBullet),
});
const bullets = list(bulletSchema, LIMITS.bulletsPerEntry);

const dated = {
  startDate: month,
  endDate: month,
  current: z.boolean().default(false),
};

export const contactSchema = z.strictObject({
  name: text(LIMITS.shortText),
  email,
  phone: text(50),
  location: text(LIMITS.shortText),
  website: url,
  linkedin: url,
  github: url,
  portfolio: url,
});

export const SECTION_SCHEMAS = {
  experience: z.strictObject({
    id,
    company: text(LIMITS.shortText),
    title: text(LIMITS.shortText),
    location: text(LIMITS.shortText),
    employmentType: text(60),
    ...dated,
    bullets,
  }),
  projects: z.strictObject({
    id,
    name: text(LIMITS.shortText),
    description: text(LIMITS.description),
    url,
    repositoryUrl: url,
    technologies: z.array(z.string().max(80)).max(LIMITS.technologies).default([]),
    ...dated,
    bullets,
  }),
  skills: z.strictObject({
    id,
    name: text(80),
    category: text(80),
    context: text(LIMITS.shortText),
    evidenceIds: ids(LIMITS.evidencePerBullet),
  }),
  education: z.strictObject({
    id,
    institution: text(LIMITS.shortText),
    degree: text(LIMITS.shortText),
    field: text(LIMITS.shortText),
    location: text(LIMITS.shortText),
    ...dated,
    notes: text(LIMITS.description),
  }),
  certifications: z.strictObject({
    id,
    name: text(LIMITS.shortText),
    issuer: text(LIMITS.shortText),
    issuedDate: month,
    expiresDate: month,
    url,
  }),
  customSections: z.strictObject({
    id,
    title: text(LIMITS.shortText),
    items: list(
      z.strictObject({
        id,
        title: text(LIMITS.shortText),
        subtitle: text(LIMITS.shortText),
        ...dated,
        description: text(LIMITS.description),
        bullets,
      }),
    ),
  }),
  evidenceItems: z.strictObject({
    id,
    title: text(LIMITS.shortText),
    kind: z.enum(['link', 'note']).default('link'),
    url,
    note: text(LIMITS.description),
    relatedIds: ids(50),
  }),
};

const SECTION_LIMITS = {
  skills: LIMITS.skills,
  customSections: LIMITS.customSections,
  evidenceItems: LIMITS.evidenceItems,
};

const contentShape = {
  contact: contactSchema.default(() => contactSchema.parse({})),
  headline: text(LIMITS.headline),
  summary: text(LIMITS.summary),
};
for (const [section, schema] of Object.entries(SECTION_SCHEMAS)) {
  if (section !== 'evidenceItems') contentShape[section] = list(schema, SECTION_LIMITS[section]);
}

/** Resume content: everything that can appear on a resume. */
export const resumeContentSchema = z.strictObject(contentShape);

/** Profile content: resume content plus private evidence items. */
export const profileContentSchema = z.strictObject({
  ...contentShape,
  evidenceItems: list(SECTION_SCHEMAS.evidenceItems, LIMITS.evidenceItems),
});

export const PROFILE_SECTIONS = Object.keys(SECTION_SCHEMAS);

const sectionKey = z
  .string()
  .refine(
    (k) => SECTION_KEYS.includes(k) || /^custom:[a-z]{1,6}_[A-Za-z0-9_-]{1,40}$/.test(k),
    'Unknown section.',
  );
export const layoutSchema = z.strictObject({
  sectionOrder: z.array(sectionKey).max(30).default([]),
  hiddenSections: z.array(sectionKey).max(30).default([]),
  hiddenItems: z.array(id).max(1000).default([]),
  // Show the profile photo on templates that support one. Off by default.
  showPhoto: z.boolean().default(false),
});

export const baselinesSchema = z
  .record(z.string().max(100), z.string().regex(/^[0-9a-f]{16}$/))
  .default({})
  .refine((v) => Object.keys(v).length <= 2000, 'Too many baselines.');

/** Remove evidence links that point at evidence items which no longer exist. */
export function pruneEvidenceRefs(content, evidenceItems = content.evidenceItems ?? []) {
  const valid = new Set(evidenceItems.map((e) => e.id));
  const prune = (entry) => {
    if (entry.evidenceIds) entry.evidenceIds = entry.evidenceIds.filter((x) => valid.has(x));
    for (const b of entry.bullets ?? [])
      b.evidenceIds = (b.evidenceIds ?? []).filter((x) => valid.has(x));
  };
  for (const section of ['experience', 'projects', 'skills'])
    (content[section] ?? []).forEach(prune);
  for (const s of content.customSections ?? []) (s.items ?? []).forEach(prune);
  return content;
}
