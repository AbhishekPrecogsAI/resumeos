import { z } from 'zod';
import { MAX_JOB_DESCRIPTION_CHARS, MAX_TERMS } from '@resumeos/shared/jobs/extract.js';

export const objectId = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id.');

export const descriptionText = z
  .string({ error: 'Paste the job description.' })
  .min(20, 'Paste the full job description (at least a few sentences).')
  .max(
    MAX_JOB_DESCRIPTION_CHARS,
    `Job descriptions can be at most ${MAX_JOB_DESCRIPTION_CHARS.toLocaleString('en-US')} characters. Trim boilerplate like benefits or legal text.`,
  );

const shortString = z.string().max(80);

export const termSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]{1,60}$/),
  term: z.string().trim().min(1).max(80),
  category: z.string().max(40).default('other'),
  variants: z.array(shortString).max(20).default([]),
  caseSensitive: z.boolean().default(false),
  count: z.number().int().min(0).max(10_000).default(0),
  importance: z.enum(['required', 'preferred', 'mentioned']).default('required'),
  source: z.enum(['dictionary', 'candidate', 'user']).default('user'),
  matchedForms: z.array(shortString).max(20).default([]),
});

export const termsSchema = z
  .array(termSchema)
  .max(MAX_TERMS, `At most ${MAX_TERMS} terms.`)
  .superRefine((list, ctx) => {
    const seen = new Set();
    list.forEach((t, i) => {
      if (seen.has(t.id))
        ctx.addIssue({ code: 'custom', path: [i, 'id'], message: `"${t.term}" is listed twice.` });
      seen.add(t.id);
    });
  });

export const createBody = z.strictObject({
  title: z.string().trim().min(1, 'Add the job title.').max(160),
  company: z.string().trim().max(160).optional(),
  descriptionText,
});

export const patchBody = z
  .strictObject({
    title: z.string().trim().min(1, 'Add the job title.').max(160).optional(),
    company: z.string().trim().max(160).optional(),
    descriptionText: descriptionText.optional(),
    terms: termsSchema.optional(),
    resetTerms: z.literal(true).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update.');

export const matchBody = z.strictObject({
  resumeId: objectId,
  versionId: objectId.optional(),
});

export const analyzeBody = z.strictObject({
  descriptionText,
  terms: termsSchema.optional(),
  resumeId: objectId.optional(),
});
