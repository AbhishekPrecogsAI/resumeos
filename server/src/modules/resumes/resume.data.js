import { Resume } from './resume.model.js';
import { summary } from './resume.service.js';

export function registerResumeData(registry) {
  registry.register({
    name: 'resumes',
    exportFor: async (userId) =>
      (await Resume.find({ userId }).lean()).map((doc) => ({
        ...summary(doc),
        draft: doc.draft,
        qualityDismissals: doc.qualityDismissals ?? [],
      })),
    deleteFor: async (userId) => (await Resume.deleteMany({ userId })).deletedCount,
  });
}
