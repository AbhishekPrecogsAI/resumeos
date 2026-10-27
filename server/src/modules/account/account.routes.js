import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { route } from '../../utils/asyncRoute.js';
import { HttpError } from '../../utils/HttpError.js';
import { User, publicUser } from '../users/user.model.js';
import { updateAccountBody, deleteAccountBody } from '../auth/auth.schemas.js';

export function accountRouter({ auth, sessions, userData, limits, logger }) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', (req, res) => res.json({ user: publicUser(req.auth.user) }));

  router.patch(
    '/',
    validate({ body: updateAccountBody }),
    route(async (req, res) => {
      const { displayName, preferences } = req.valid.body;
      const set = {};
      if (displayName !== undefined) set.displayName = displayName;
      for (const [k, v] of Object.entries(preferences ?? {})) set[`preferences.${k}`] = v;
      const user = await User.findByIdAndUpdate(
        req.auth.user._id,
        { $set: set },
        { new: true, runValidators: true },
      );
      res.json({ user: publicUser(user) });
    }),
  );

  router.get(
    '/export',
    limits.sensitive,
    route(async (req, res) => {
      const data = await userData.exportAll(req.auth.user._id);
      const stamp = new Date().toISOString().slice(0, 10);
      res.set('content-disposition', `attachment; filename="resumeos-export-${stamp}.json"`);
      res.set('cache-control', 'no-store');
      res.json({
        format: 'resumeos-export',
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        ...data,
      });
    }),
  );

  router.delete(
    '/',
    limits.sensitive,
    validate({ body: deleteAccountBody }),
    route(async (req, res) => {
      const userId = req.auth.user._id;
      if (!(await auth.verifyCurrentPassword(userId, req.valid.body.password))) {
        throw new HttpError(400, 'VALIDATION_FAILED', 'Some fields need attention.', {
          fields: [{ location: 'body', path: 'password', message: 'Password is incorrect.' }],
        });
      }
      const deleted = await userData.deleteAll(userId);
      sessions.clearCookie(res);
      logger.info('account deleted', { requestId: req.id });
      res.json({ deleted });
    }),
  );

  return router;
}
