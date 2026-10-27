import { createHmac, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { Session } from './session.model.js';
import { User } from '../users/user.model.js';

const TOUCH_INTERVAL_MS = 5 * 60_000;

export function createSessionService(env) {
  const hashToken = (token) =>
    createHmac('sha256', env.SESSION_SECRET).update(token).digest('base64url');
  const ttlMs = env.SESSION_TTL_DAYS * 24 * 60 * 60_000;

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  };

  return {
    cookieName: env.COOKIE_NAME,

    async create(user, { userAgent = '' } = {}) {
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + ttlMs);
      const session = await Session.create({
        userId: user._id,
        tokenHash: hashToken(token),
        sessionVersion: user.sessionVersion,
        userAgent: String(userAgent).slice(0, 200),
        expiresAt,
      });
      return { token, session };
    },

    /** Resolve a cookie token to an active { session, user }, or null. */
    async resolve(token) {
      if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
      const session = await Session.findOne({ tokenHash: hashToken(token) });
      if (!session || session.expiresAt <= new Date()) return null;
      const user = await User.findById(session.userId);
      if (
        !user ||
        user.accountStatus !== 'active' ||
        user.sessionVersion !== session.sessionVersion
      ) {
        await Session.deleteOne({ _id: session._id });
        return null;
      }
      if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
        await Session.updateOne({ _id: session._id }, { lastSeenAt: new Date() });
      }
      return { session, user };
    },

    revoke(sessionId) {
      return Session.deleteOne({ _id: sessionId });
    },

    revokeAllForUser(userId, { exceptSessionId } = {}) {
      const filter = { userId };
      // trusted(): our own operator, exempt from the global sanitizeFilter.
      if (exceptSessionId) filter._id = mongoose.trusted({ $ne: exceptSessionId });
      return Session.deleteMany(filter);
    },

    setCookie(res, token, expiresAt) {
      res.cookie(env.COOKIE_NAME, token, { ...cookieOptions, expires: expiresAt });
    },

    clearCookie(res) {
      res.clearCookie(env.COOKIE_NAME, cookieOptions);
    },
  };
}
