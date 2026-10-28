import { Router } from 'express';
import { z } from 'zod';
import { runQualityChecks } from '@resumeos/shared/quality/engine.js';
import { RULES_BY_ID } from '@resumeos/shared/quality/rules.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { route } from '../../utils/asyncRoute.js';
import { HttpError } from '../../utils/HttpError.js';
import { Resume } from '../resumes/resume.model.js';

export const MAX_DISMISSALS = 500;

const objectId = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id.');
const findingKey = z.string().regex(/^[A-Z_]{3,60}:[0-9a-f]{16}$/, 'Invalid finding key.');
const resumeParams = z.strictObject({ resumeId: objectId });
const dismissBody = z.strictObject({
  key: findingKey,
  reason: z.string().max(300, 'Use at most 300 characters.').optional(),
});

const notFound = () => new HttpError(404, 'NOT_FOUND', "That resume doesn't exist or isn't yours.");

/** POST /resumes/:id/quality-check runs on the saved draft; dismissals live on the resume. */
export function qualityRouter() {
  const router = Router({ mergeParams: true });
  router.use(requireAuth);

  router.post(
    '/quality-check',
    validate({ params: resumeParams }),
    route(async (req, res) => {
      const resume = await Resume.findOne(
        { _id: req.valid.params.resumeId, userId: req.auth.user._id },
        { draft: 1, draftRevision: 1, qualityDismissals: 1 },
      ).lean();
      if (!resume) throw notFound();
      const report = runQualityChecks(resume.draft.content, resume.draft.layout, {
        dismissals: resume.qualityDismissals ?? [],
      });
      res.json({ report, draftRevision: resume.draftRevision });
    }),
  );

  router.get(
    '/quality-dismissals',
    validate({ params: resumeParams }),
    route(async (req, res) => {
      const resume = await Resume.findOne(
        { _id: req.valid.params.resumeId, userId: req.auth.user._id },
        { qualityDismissals: 1 },
      ).lean();
      if (!resume) throw notFound();
      res.json({ items: resume.qualityDismissals ?? [] });
    }),
  );

  router.post(
    '/quality-dismissals',
    validate({ params: resumeParams, body: dismissBody }),
    route(async (req, res) => {
      const { key, reason = '' } = req.valid.body;
      const ruleId = key.split(':')[0];
      if (!RULES_BY_ID[ruleId])
        throw new HttpError(400, 'VALIDATION_FAILED', 'Some fields need attention.', {
          fields: [{ location: 'body', path: 'key', message: 'Unknown rule.' }],
        });
      const filter = { _id: req.valid.params.resumeId, userId: req.auth.user._id };
      const resume = await Resume.findOne(filter, { qualityDismissals: 1 }).lean();
      if (!resume) throw notFound();
      const rest = (resume.qualityDismissals ?? []).filter((d) => d.key !== key);
      if (rest.length >= MAX_DISMISSALS)
        throw new HttpError(
          409,
          'LIMIT_REACHED',
          `You can dismiss up to ${MAX_DISMISSALS} findings per resume. Restore some first.`,
        );
      const items = [...rest, { key, ruleId, reason, dismissedAt: new Date() }];
      await Resume.updateOne(filter, { $set: { qualityDismissals: items } });
      res.status(201).json({ items });
    }),
  );

  router.delete(
    '/quality-dismissals/:key',
    validate({ params: z.strictObject({ resumeId: objectId, key: findingKey }) }),
    route(async (req, res) => {
      const filter = { _id: req.valid.params.resumeId, userId: req.auth.user._id };
      const resume = await Resume.findOne(filter, { qualityDismissals: 1 }).lean();
      if (!resume) throw notFound();
      const items = (resume.qualityDismissals ?? []).filter((d) => d.key !== req.valid.params.key);
      await Resume.updateOne(filter, { $set: { qualityDismissals: items } });
      res.json({ items });
    }),
  );

  return router;
}
