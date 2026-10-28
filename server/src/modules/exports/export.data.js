import { ExportRecord } from './export.model.js';
import { publicExport } from './export.service.js';

export function registerExportData(registry, exportsService) {
  registry.register({
    name: 'exports',
    // Metadata only; export files are temporary and not part of the data export.
    exportFor: async (userId) => (await ExportRecord.find({ userId }).lean()).map(publicExport),
    deleteFor: (userId) => exportsService.removeForUser(userId),
  });
}
