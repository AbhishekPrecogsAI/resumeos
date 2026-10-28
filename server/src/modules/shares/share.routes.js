import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { route } from '../../utils/asyncRoute.js';
import { EXPIRY_DAYS, publicShare } from './share.service.js';
import { ShareLink } from './share.model.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id.');
const resumeParams = z.strictObject({ resumeId: objectId });
const shareParams = z.strictObject({ resumeId: objectId, shareId: objectId });
const tokenParams = z.strictObject({ token: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/) });

const label = z.string().trim().max(60, 'Use at most 60 characters.');
// null never expires; otherwise one of the offered lengths, counted from now.
const expiresInDays = z.union([
  z.null(),
  z
    .number()
    .int()
    .refine((d) => EXPIRY_DAYS.includes(d), `Choose ${EXPIRY_DAYS.join(', ')} days or never.`),
]);
const createBody = z.strictObject({
  label: label.optional(),
  versionId: z.union([objectId, z.null()]).optional(),
  allowDownload: z.boolean().optional(),
  hideContactDetails: z.boolean().optional(),
  expiresInDays: expiresInDays.optional(),
});
const patchBody = z
  .strictObject({
    label: label.optional(),
    allowDownload: z.boolean().optional(),
    hideContactDetails: z.boolean().optional(),
    enabled: z.boolean().optional(),
    expiresInDays: expiresInDays.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update.');

/** Owner routes, under /resumes/:resumeId/shares. */
export function shareRouter({ shares }) {
  const router = Router({ mergeParams: true });
  router.use(requireAuth);
  router.get(
    '/',
    validate({ params: resumeParams }),
    route(async (req, res) =>
      res.json({ shares: await shares.list(req.auth.user._id, req.valid.params.resumeId) }),
    ),
  );
  router.post(
    '/',
    validate({ params: resumeParams, body: createBody }),
    route(async (req, res) =>
      res.status(201).json({
        share: await shares.create(req.auth.user._id, req.valid.params.resumeId, req.valid.body),
      }),
    ),
  );
  router.patch(
    '/:shareId',
    validate({ params: shareParams, body: patchBody }),
    route(async (req, res) => {
      const { resumeId, shareId } = req.valid.params;
      res.json({
        share: await shares.update(req.auth.user._id, resumeId, shareId, req.valid.body),
      });
    }),
  );
  router.delete(
    '/:shareId',
    validate({ params: shareParams }),
    route(async (req, res) => {
      const { resumeId, shareId } = req.valid.params;
      await shares.remove(req.auth.user._id, resumeId, shareId);
      res.status(204).end();
    }),
  );
  return router;
}

/** Public routes for people opening a link, under /shared. No session needed or used. */
export function sharedRouter({ shares, limits }) {
  const router = Router();
  router.use((req, res, next) => {
    // Shared resumes are personal: keep them out of search engines and caches.
    res.set({ 'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer' });
    next();
  });
  router.get(
    '/:token',
    validate({ params: tokenParams }),
    route(async (req, res) => res.json({ resume: await shares.view(req.valid.params.token) })),
  );
  router.get(
    '/:token/pdf',
    limits.export,
    validate({ params: tokenParams }),
    route(async (req, res) => {
      const file = await shares.pdf(req.valid.params.token);
      res.set({
        'content-type': 'application/pdf',
        'content-length': String(file.buffer.length),
        'content-disposition': file.disposition,
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      });
      res.end(file.buffer);
    }),
  );
  return router;
}

export function registerShareData(registry) {
  registry.register({
    name: 'shareLinks',
    exportFor: async (userId) =>
      (await ShareLink.find({ userId }).sort({ createdAt: 1 }).lean()).map((d) => publicShare(d)),
    deleteFor: async (userId) => (await ShareLink.deleteMany({ userId })).deletedCount,
  });
}
