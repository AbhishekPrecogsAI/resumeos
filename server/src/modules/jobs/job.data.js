import { JobDescription } from './job.model.js';
import { jobDetail } from './job.service.js';

export function registerJobData(registry) {
  registry.register({
    name: 'jobDescriptions',
    exportFor: async (userId) => (await JobDescription.find({ userId }).lean()).map(jobDetail),
    deleteFor: async (userId) => (await JobDescription.deleteMany({ userId })).deletedCount,
  });
}
