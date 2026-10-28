import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { route } from '../../utils/asyncRoute.js';
import { photoService } from './photo.service.js';

const putBody = z.strictObject({ dataUrl: z.string().max(450_000, 'The photo is too large.') });

export function photoRouter() {
  const router = Router();
  router.use(requireAuth);
  router.get(
    '/',
    route(async (req, res) => res.json({ photo: await photoService.get(req.auth.user._id) })),
  );
  router.put(
    '/',
    validate({ body: putBody }),
    route(async (req, res) =>
      res.json({ photo: await photoService.put(req.auth.user._id, req.valid.body.dataUrl) }),
    ),
  );
  router.delete(
    '/',
    route(async (req, res) => {
      await photoService.remove(req.auth.user._id);
      res.status(204).end();
    }),
  );
  return router;
}

export function registerPhotoData(registry) {
  registry.register({
    name: 'profilePhoto',
    exportFor: (userId) => photoService.get(userId),
    deleteFor: (userId) => photoService.remove(userId),
  });
}
