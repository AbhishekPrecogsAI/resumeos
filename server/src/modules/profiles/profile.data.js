import { CareerProfile } from './profile.model.js';

export function registerProfileData(registry) {
  registry.register({
    name: 'profile',
    exportFor: async (userId) => {
      const doc = await CareerProfile.findOne({ userId }).lean();
      return doc
        ? {
            revision: doc.revision,
            schemaVersion: doc.schemaVersion,
            updatedAt: doc.updatedAt,
            content: doc.content,
          }
        : null;
    },
    deleteFor: async (userId) => (await CareerProfile.deleteMany({ userId })).deletedCount,
  });
}
