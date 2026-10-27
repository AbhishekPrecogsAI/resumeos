import { User, publicUser } from './user.model.js';
import { Session } from '../auth/session.model.js';

export function registerUserData(registry) {
  registry.register({
    name: 'account',
    exportFor: async (userId) => {
      const user = await User.findById(userId);
      return user ? publicUser(user) : null;
    },
    deleteFor: async (userId) => (await User.deleteOne({ _id: userId })).deletedCount,
  });
  registry.register({
    name: 'sessions',
    exportFor: async (userId) =>
      (await Session.find({ userId }).lean()).map((s) => ({
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        userAgent: s.userAgent,
      })),
    deleteFor: async (userId) => (await Session.deleteMany({ userId })).deletedCount,
  });
}
