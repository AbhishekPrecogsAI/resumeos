import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { route } from '../../utils/asyncRoute.js';
import { expectedRevision, setRevisionHeader } from '../../utils/revision.js';
import { resumeService } from './resume.service.js';

const idParams = z.strictObject({ resumeId: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id.') });
const title = z
  .string()
  .trim()
  .min(1, 'Give the resume a name.')
  .max(120, 'Use at most 120 characters.');
const targetRole = z.string().max(120, 'Use at most 120 characters.');
const pageSize = z.enum(['A4', 'Letter']);
const templateId = z.string().max(40);

const listQuery = z.strictObject({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  includeArchived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});
const createBody = z.strictObject({
  title,
  targetRole: targetRole.optional(),
  templateId: templateId.optional(),
  pageSize: pageSize.optional(),
});
const patchBody = z
  .strictObject({
    title: title.optional(),
    targetRole: targetRole.optional(),
    templateId: templateId.optional(),
    pageSize: pageSize.optional(),
    archived: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update.');
const draftBody = z.strictObject({
  content: z.unknown(),
  layout: z.unknown(),
  baselines: z.unknown().optional(),
});
const duplicateBody = z.strictObject({ title: title.optional() });

export function resumeRouter() {
  const router = Router();
  router.use(requireAuth);

  const sendDetail = (res, resume, status = 200) => {
    setRevisionHeader(res, resume.draftRevision);
    res.status(status).json({ resume });
  };

  router.get(
    '/',
    validate({ query: listQuery }),
    route(async (req, res) =>
      res.json(await resumeService.list(req.auth.user._id, req.valid.query)),
    ),
  );

  router.post(
    '/',
    validate({ body: createBody }),
    route(async (req, res) =>
      sendDetail(res, await resumeService.create(req.auth.user._id, req.valid.body), 201),
    ),
  );

  router.get(
    '/:resumeId',
    validate({ params: idParams }),
    route(async (req, res) =>
      sendDetail(res, await resumeService.get(req.auth.user._id, req.valid.params.resumeId)),
    ),
  );

  router.patch(
    '/:resumeId',
    validate({ params: idParams, body: patchBody }),
    route(async (req, res) =>
      sendDetail(
        res,
        await resumeService.update(req.auth.user._id, req.valid.params.resumeId, req.valid.body),
      ),
    ),
  );

  router.put(
    '/:resumeId/draft',
    validate({ params: idParams, body: draftBody }),
    route(async (req, res) => {
      const resume = await resumeService.saveDraft(
        req.auth.user._id,
        req.valid.params.resumeId,
        expectedRevision(req),
        req.valid.body,
      );
      sendDetail(res, resume);
    }),
  );

  router.post(
    '/:resumeId/duplicate',
    validate({ params: idParams, body: duplicateBody }),
    route(async (req, res) =>
      sendDetail(
        res,
        await resumeService.duplicate(req.auth.user._id, req.valid.params.resumeId, req.valid.body),
        201,
      ),
    ),
  );

  router.delete(
    '/:resumeId',
    validate({ params: idParams }),
    route(async (req, res) => {
      await resumeService.remove(req.auth.user._id, req.valid.params.resumeId);
      res.status(204).end();
    }),
  );

  return router;
}
