import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { route } from '../../utils/asyncRoute.js';
import { versionService } from './version.service.js';
import { detail } from '../resumes/resume.service.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id.');
const ref = z.union([z.literal('draft'), objectId]);
const resumeParams = z.strictObject({ resumeId: objectId });
const versionParams = z.strictObject({ resumeId: objectId, versionId: objectId });
const createBody = z.strictObject({
  name: z.string().trim().max(120, 'Use at most 120 characters.').optional(),
  changeNote: z.string().max(1000, 'Use at most 1000 characters.').optional(),
});
const listQuery = z.strictObject({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function versionRouters() {
  const versions = Router({ mergeParams: true });
  versions.use(requireAuth);

  versions.post(
    '/',
    validate({ params: resumeParams, body: createBody }),
    route(async (req, res) =>
      res.status(201).json({
        version: await versionService.create(
          req.auth.user._id,
          req.valid.params.resumeId,
          req.valid.body,
        ),
      }),
    ),
  );
  versions.get(
    '/',
    validate({ params: resumeParams, query: listQuery }),
    route(async (req, res) =>
      res.json(
        await versionService.list(req.auth.user._id, req.valid.params.resumeId, req.valid.query),
      ),
    ),
  );
  versions.get(
    '/:versionId',
    validate({ params: versionParams }),
    route(async (req, res) =>
      res.json({
        version: await versionService.get(
          req.auth.user._id,
          req.valid.params.resumeId,
          req.valid.params.versionId,
        ),
      }),
    ),
  );
  versions.post(
    '/:versionId/restore',
    validate({ params: versionParams }),
    route(async (req, res) => {
      const { resume, restored, autoSaved } = await versionService.restore(
        req.auth.user._id,
        req.valid.params.resumeId,
        req.valid.params.versionId,
      );
      res.set('etag', `"${resume.draftRevision}"`);
      res.status(201).json({ resume: detail(resume), restored, autoSaved });
    }),
  );
  versions.delete(
    '/:versionId',
    validate({ params: versionParams }),
    route(async (req, res) => {
      await versionService.remove(
        req.auth.user._id,
        req.valid.params.resumeId,
        req.valid.params.versionId,
      );
      res.status(204).end();
    }),
  );

  const compare = Router({ mergeParams: true });
  compare.get(
    '/',
    requireAuth,
    validate({ params: resumeParams, query: z.strictObject({ left: ref, right: ref }) }),
    route(async (req, res) =>
      res.json(
        await versionService.compare(
          req.auth.user._id,
          req.valid.params.resumeId,
          req.valid.query.left,
          req.valid.query.right,
        ),
      ),
    ),
  );

  return { versions, compare };
}
