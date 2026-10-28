import mongoose from 'mongoose';
import { PATTERN_IDS } from '@resumeos/shared/templates/patterns.js';

// Metadata about each export. The file itself is temporary (see expiresAt); the record stays as
// history until the user deletes it, the resume, or their account.
const exportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    resumeTitle: { type: String, maxlength: 120, default: '' },
    resumeVersionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    draftRevision: { type: Number, required: true },
    contentHash: { type: String, required: true },
    format: { type: String, enum: ['pdf', 'docx'], required: true },
    templateId: { type: String, required: true },
    templateVersion: { type: String, required: true },
    pageSize: { type: String, enum: ['A4', 'Letter'], required: true },
    accentColor: { type: String, default: null },
    // Decorative page background; 'none' for plain. One of PATTERN_IDS.
    backgroundPattern: { type: String, enum: PATTERN_IDS, default: 'none' },
    pageCount: { type: Number, default: null },
    byteSize: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    validationSummary: { type: mongoose.Schema.Types.Mixed, required: true },
    fileStorageKey: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    fileDeletedAt: { type: Date, default: null },
    idempotencyKey: { type: String, default: null, maxlength: 100 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

exportSchema.index({ userId: 1, createdAt: -1 });
exportSchema.index({ userId: 1, resumeId: 1, createdAt: -1 });
exportSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);
exportSchema.index({ expiresAt: 1, fileDeletedAt: 1 });

export const ExportRecord =
  mongoose.models.ExportRecord ?? mongoose.model('ExportRecord', exportSchema);
