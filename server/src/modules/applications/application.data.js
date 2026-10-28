import { ApplicationRecord } from './application.model.js';
import { publicApplication } from './application.service.js';

export function registerApplicationData(registry) {
  registry.register({
    name: 'applications',
    exportFor: async (userId) =>
      (await ApplicationRecord.find({ userId }).lean()).map(publicApplication),
    deleteFor: async (userId) => (await ApplicationRecord.deleteMany({ userId })).deletedCount,
  });
}
