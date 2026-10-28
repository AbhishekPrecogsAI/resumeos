import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { route } from '../../utils/asyncRoute.js';
import { jobService } from './job.service.js';
import { createBody, patchBody, matchBody, analyzeBody, objectId } from './job.schemas.js';

const idParams = z.strictObject({ jobId: objectId });
const listQuery = z.strictObject({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function jobRouter() {
  const router = Router();
  router.use(requireAuth);

  // Stateless: nothing from this request is stored.
  router.post(
    '/analyze',
    validate({ body: analyzeBody }),
    route(async (req, res) =>
      res.json(await jobService.analyze(req.auth.user._id, req.valid.body)),
    ),
  );

  router.get(
    '/',
    validate({ query: listQuery }),
    route(async (req, res) => res.json(await jobService.list(req.auth.user._id, req.valid.query))),
  );
  router.post(
    '/',
    validate({ body: createBody }),
    route(async (req, res) =>
      res.status(201).json({ job: await jobService.create(req.auth.user._id, req.valid.body) }),
    ),
  );
  router.get(
    '/:jobId',
    validate({ params: idParams }),
    route(async (req, res) =>
      res.json({ job: await jobService.get(req.auth.user._id, req.valid.params.jobId) }),
    ),
  );
  router.patch(
    '/:jobId',
    validate({ params: idParams, body: patchBody }),
    route(async (req, res) =>
      res.json({
        job: await jobService.update(req.auth.user._id, req.valid.params.jobId, req.valid.body),
      }),
    ),
  );
  router.delete(
    '/:jobId',
    validate({ params: idParams }),
    route(async (req, res) => {
      await jobService.remove(req.auth.user._id, req.valid.params.jobId);
      res.status(204).end();
    }),
  );
  router.post(
    '/:jobId/extract-terms',
    validate({ params: idParams }),
    route(async (req, res) =>
      res.json({ job: await jobService.reextract(req.auth.user._id, req.valid.params.jobId) }),
    ),
  );
  router.post(
    '/:jobId/match-resume',
    validate({ params: idParams, body: matchBody }),
    route(async (req, res) =>
      res.json(await jobService.match(req.auth.user._id, req.valid.params.jobId, req.valid.body)),
    ),
  );

  return router;
}
