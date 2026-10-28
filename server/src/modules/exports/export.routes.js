import { Router } from 'express';
import { z } from 'zod';
import { pipeline } from 'node:stream/promises';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { route } from '../../utils/asyncRoute.js';
import { HttpError } from '../../utils/HttpError.js';
import { FORMATS } from './export.service.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id.');
const createBody = z.strictObject({
  format: z.string().default('pdf'),
  pageSize: z.enum(['A4', 'Letter']).optional(),
});
const listQuery = z.strictObject({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  resumeId: objectId.optional(),
});

function idempotencyKey(req) {
  const key = req.get('idempotency-key');
  if (key === undefined) return undefined;
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(key))
    throw new HttpError(
      400,
      'INVALID_IDEMPOTENCY_KEY',
      'Idempotency-Key must be 8–100 letters, digits, - or _.',
    );
  return key;
}

/** POST /resumes/:resumeId/export lives here too so all export logic stays in one module. */
export function exportRouters({ exportsService, limits }) {
  const resumeExport = Router({ mergeParams: true });
  resumeExport.post(
    '/',
    requireAuth,
    limits.export,
    validate({ params: z.strictObject({ resumeId: objectId }), body: createBody }),
    route(async (req, res) => {
      const { format, pageSize } = req.valid.body;
      if (!Object.hasOwn(FORMATS, format)) {
        throw new HttpError(
          400,
          'UNSUPPORTED_FORMAT',
          `Export format "${String(format).slice(0, 20)}" isn't supported. Supported: ${Object.keys(FORMATS).join(', ')}.`,
        );
      }
      const { record, reused } = await exportsService.create(
        req.auth.user._id,
        req.valid.params.resumeId,
        { format, pageSize, idempotencyKey: idempotencyKey(req) },
      );
      res.status(reused ? 200 : 201).json({ export: record, reused });
    }),
  );

  // POST /resumes/:resumeId/fit-one-page: measure real PDFs; returns settings, saves nothing.
  const resumeFit = Router({ mergeParams: true });
  resumeFit.post(
    '/',
    requireAuth,
    limits.export,
    validate({ params: z.strictObject({ resumeId: objectId }), body: z.strictObject({}) }),
    route(async (req, res) =>
      res.json(await exportsService.fitOnePage(req.auth.user._id, req.valid.params.resumeId)),
    ),
  );

  const exportsRouter = Router();
  exportsRouter.use(requireAuth);
  exportsRouter.get(
    '/',
    validate({ query: listQuery }),
    route(async (req, res) =>
      res.json(await exportsService.list(req.auth.user._id, req.valid.query)),
    ),
  );
  exportsRouter.get(
    '/:exportId',
    validate({ params: z.strictObject({ exportId: objectId }) }),
    route(async (req, res) =>
      res.json({ export: await exportsService.get(req.auth.user._id, req.valid.params.exportId) }),
    ),
  );
  exportsRouter.get(
    '/:exportId/download',
    validate({ params: z.strictObject({ exportId: objectId }) }),
    route(async (req, res) => {
      const file = await exportsService.openDownload(req.auth.user._id, req.valid.params.exportId);
      res.set({
        'content-type': file.mime,
        'content-length': String(file.size),
        'content-disposition': file.disposition,
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      });
      await pipeline(file.stream, res);
    }),
  );
  exportsRouter.delete(
    '/:exportId',
    validate({ params: z.strictObject({ exportId: objectId }) }),
    route(async (req, res) => {
      await exportsService.remove(req.auth.user._id, req.valid.params.exportId);
      res.status(204).end();
    }),
  );

  return { resumeExport, resumeFit, exportsRouter };
}
