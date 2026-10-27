import { User } from '../users/user.model.js';
import { Session } from './session.model.js';
import { hashPassword, verifyPassword, verifyAgainstDummy } from './password.js';
import { HttpError } from '../../utils/HttpError.js';

const INVALID_CREDENTIALS = new HttpError(
  401,
  'INVALID_CREDENTIALS',
  'Email or password is incorrect.',
);

export function createAuthService({ sessions }) {
  return {
    async register({ email, password, displayName }, meta) {
      const passwordHash = await hashPassword(password);
      let user;
      try {
        user = await User.create({ email, passwordHash, displayName });
      } catch (err) {
        if (err?.code === 11000) {
          // Without email verification this reveals that the address is registered; registration
          // is rate-limited to bound enumeration. Documented in docs/security.md.
          throw new HttpError(
            409,
            'EMAIL_TAKEN',
            'An account with this email already exists. Sign in instead.',
          );
        }
        throw err;
      }
      user.lastLoginAt = new Date();
      await user.save();
      const created = await sessions.create(user, meta);
      return { user, ...created };
    },

    async login({ email, password }, meta) {
      const user = await User.findOne({ email }).select('+passwordHash');
      if (!user) {
        await verifyAgainstDummy(password);
        throw INVALID_CREDENTIALS;
      }
      const ok = await verifyPassword(user.passwordHash, password);
      if (!ok || user.accountStatus !== 'active') throw INVALID_CREDENTIALS;
      user.lastLoginAt = new Date();
      await user.save();
      const created = await sessions.create(user, meta);
      return { user, ...created };
    },

    async changePassword(auth, { currentPassword, newPassword }) {
      const user = await User.findById(auth.user._id).select('+passwordHash');
      if (!(await verifyPassword(user.passwordHash, currentPassword))) {
        throw new HttpError(400, 'VALIDATION_FAILED', 'Some fields need attention.', {
          fields: [
            {
              location: 'body',
              path: 'currentPassword',
              message: 'Current password is incorrect.',
            },
          ],
        });
      }
      user.passwordHash = await hashPassword(newPassword);
      // Invalidate every session, then issue a fresh one for this device.
      user.sessionVersion += 1;
      await user.save();
      await sessions.revokeAllForUser(user._id);
      return sessions.create(user, { userAgent: auth.session.userAgent });
    },

    async verifyCurrentPassword(userId, password) {
      const user = await User.findById(userId).select('+passwordHash');
      return Boolean(user) && verifyPassword(user.passwordHash, password);
    },

    listSessions(userId) {
      return Session.find({ userId }).sort({ lastSeenAt: -1 }).limit(100).lean();
    },
  };
}
