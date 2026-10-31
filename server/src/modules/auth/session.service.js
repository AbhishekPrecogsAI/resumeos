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
      // Session and user in one round trip: this runs on every signed-in request, and on
      // serverless hosts each database round trip is a network hop.
      const [found] = await Session.aggregate([
        { $match: { tokenHash: hashToken(token) } },
        { $limit: 1 },
        {
          $lookup: {
            from: User.collection.name,
            localField: 'userId',
            foreignField: '_id',
            as: 'users',
            // The password hash never leaves the database on this path.
            pipeline: [{ $project: { passwordHash: 0 } }],
          },
        },
      ]);
      if (!found || found.expiresAt <= new Date()) return null;
      const { users, ...session } = found;
      const user = users[0];
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
