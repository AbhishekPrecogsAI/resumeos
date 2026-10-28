import { ResumeVersion } from './version.model.js';
import { versionSummary } from './version.service.js';

export function registerVersionData(registry) {
  registry.register({
    name: 'resumeVersions',
    exportFor: async (userId) =>
      (await ResumeVersion.find({ userId }).sort({ resumeId: 1, versionNumber: 1 }).lean()).map(
        (v) => ({ ...versionSummary(v), snapshot: v.snapshot }),
      ),
    deleteFor: async (userId) => (await ResumeVersion.deleteMany({ userId })).deletedCount,
  });
}
