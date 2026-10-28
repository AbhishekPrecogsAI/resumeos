import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { route } from '../../utils/asyncRoute.js';
import { APPLICATION_STATUSES } from './application.model.js';
import { applicationService } from './application.service.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id.');
const isoDate = z
  .string()
  .regex(/^(\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))?$/, 'Use a date like 2026-03-14.')
  .refine(
    (v) =>
      !v ||
      (!Number.isNaN(Date.parse(`${v}T00:00:00Z`)) &&
        new Date(`${v}T00:00:00Z`).toISOString().startsWith(v)),
    'That date does not exist.',
  );
const fields = {
  company: z.string().trim().min(1, 'Add the company.').max(160),
  role: z.string().trim().min(1, 'Add the role.').max(160),
  status: z.enum(APPLICATION_STATUSES),
  appliedAt: isoDate,
  nextFollowUpAt: isoDate,
  notes: z.string().max(4000, 'Use at most 4000 characters.'),
  jobDescriptionId: objectId.nullable(),
  resumeId: objectId.nullable(),
  resumeVersionId: objectId.nullable(),
};
const createBody = z.strictObject({
  company: fields.company,
  role: fields.role,
  status: fields.status.default('planned'),
  appliedAt: fields.appliedAt.optional(),
  nextFollowUpAt: fields.nextFollowUpAt.optional(),
  notes: fields.notes.optional(),
  jobDescriptionId: fields.jobDescriptionId.optional(),
  resumeId: fields.resumeId.optional(),
  resumeVersionId: fields.resumeVersionId.optional(),
});
const patchBody = z
  .strictObject(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.optional()])))
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update.');
const listQuery = z.strictObject({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(APPLICATION_STATUSES).optional(),
});
const idParams = z.strictObject({ applicationId: objectId });

export function applicationRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get(
    '/',
    validate({ query: listQuery }),
    route(async (req, res) =>
      res.json(await applicationService.list(req.auth.user._id, req.valid.query)),
    ),
  );
  router.get(
    '/due',
    validate({ query: z.strictObject({ today: fields.appliedAt.refine(Boolean, 'Required.') }) }),
    route(async (req, res) =>
      res.json({ items: await applicationService.due(req.auth.user._id, req.valid.query.today) }),
    ),
  );
  router.post(
    '/',
    validate({ body: createBody }),
    route(async (req, res) =>
      res
        .status(201)
        .json({ application: await applicationService.create(req.auth.user._id, req.valid.body) }),
    ),
  );
  router.get(
    '/:applicationId',
    validate({ params: idParams }),
    route(async (req, res) =>
      res.json({
        application: await applicationService.get(
          req.auth.user._id,
          req.valid.params.applicationId,
        ),
      }),
    ),
  );
  router.patch(
    '/:applicationId',
    validate({ params: idParams, body: patchBody }),
    route(async (req, res) =>
      res.json({
        application: await applicationService.update(
          req.auth.user._id,
          req.valid.params.applicationId,
          req.valid.body,
        ),
      }),
    ),
  );
  router.delete(
    '/:applicationId',
    validate({ params: idParams }),
    route(async (req, res) => {
      await applicationService.remove(req.auth.user._id, req.valid.params.applicationId);
      res.status(204).end();
    }),
  );
  return router;
}
