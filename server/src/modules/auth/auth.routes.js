import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { route } from '../../utils/asyncRoute.js';
import { HttpError } from '../../utils/HttpError.js';
import { publicUser } from '../users/user.model.js';
import { registerBody, loginBody, changePasswordBody, objectIdParam } from './auth.schemas.js';
import { Session } from './session.model.js';

export function authRouter({ auth, sessions, limits }) {
  const router = Router();
  const meta = (req) => ({ userAgent: req.get('user-agent') ?? '' });

  router.post(
    '/register',
    limits.register,
    validate({ body: registerBody }),
    route(async (req, res) => {
      const { user, token, session } = await auth.register(req.valid.body, meta(req));
      sessions.setCookie(res, token, session.expiresAt);
      res.status(201).json({ user: publicUser(user) });
    }),
  );

  router.post(
    '/login',
    limits.login,
    validate({ body: loginBody }),
    route(async (req, res) => {
      if (req.auth) await sessions.revoke(req.auth.session._id);
      const { user, token, session } = await auth.login(req.valid.body, meta(req));
      sessions.setCookie(res, token, session.expiresAt);
      res.json({ user: publicUser(user) });
    }),
  );

  router.post(
    '/logout',
    route(async (req, res) => {
      if (req.auth) await sessions.revoke(req.auth.session._id);
      sessions.clearCookie(res);
      res.status(204).end();
    }),
  );

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: publicUser(req.auth.user) });
  });

  // No email delivery is configured, so reset is explicitly unavailable rather than faked.
  const resetUnavailable = (req, res, next) =>
    next(
      new HttpError(
        501,
        'PASSWORD_RESET_UNAVAILABLE',
        'Password reset by email is not available yet because no email service is configured.',
      ),
    );
  router.post('/forgot-password', limits.sensitive, resetUnavailable);
  router.post('/reset-password', limits.sensitive, resetUnavailable);

  router.post(
    '/change-password',
    requireAuth,
    limits.sensitive,
    validate({ body: changePasswordBody }),
    route(async (req, res) => {
      const { token, session } = await auth.changePassword(req.auth, req.valid.body);
      sessions.setCookie(res, token, session.expiresAt);
      res.json({ ok: true, message: 'Password changed. Other sessions were signed out.' });
    }),
  );

  router.get(
    '/sessions',
    requireAuth,
    route(async (req, res) => {
      const list = await auth.listSessions(req.auth.user._id);
      res.json({
        items: list.map((s) => ({
          id: String(s._id),
          userAgent: s.userAgent,
          createdAt: s.createdAt,
          lastSeenAt: s.lastSeenAt,
          current: String(s._id) === String(req.auth.session._id),
        })),
      });
    }),
  );

  router.delete(
    '/sessions/:sessionId',
    requireAuth,
    validate({ params: objectIdParam('sessionId') }),
    route(async (req, res) => {
      // Scoped to the signed-in user: another user's session id is simply "not found".
      const result = await Session.deleteOne({
        _id: req.valid.params.sessionId,
        userId: req.auth.user._id,
      });
      if (!result.deletedCount) throw new HttpError(404, 'NOT_FOUND', 'Session not found.');
      if (req.valid.params.sessionId === String(req.auth.session._id)) sessions.clearCookie(res);
      res.status(204).end();
    }),
  );

  router.post(
    '/sessions/revoke-others',
    requireAuth,
    route(async (req, res) => {
      const result = await sessions.revokeAllForUser(req.auth.user._id, {
        exceptSessionId: req.auth.session._id,
      });
      res.json({ revoked: result.deletedCount });
    }),
  );

  return router;
}
