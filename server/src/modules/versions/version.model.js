import mongoose from 'mongoose';
import { PATTERN_IDS } from '@resumeos/shared/templates/patterns.js';

export const MAX_VERSIONS_PER_RESUME = 100;

// Saved versions are immutable: there is no update path. They can only be deleted.
const versionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    parentVersionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    restoredFromVersionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    versionNumber: { type: Number, required: true },
    kind: { type: String, enum: ['manual', 'auto', 'restore'], default: 'manual' },
    name: { type: String, required: true, maxlength: 120 },
    changeNote: { type: String, default: '', maxlength: 1000 },
    templateId: { type: String, required: true },
    templateVersion: { type: String, required: true },
    pageSize: { type: String, enum: ['A4', 'Letter'], required: true },
    accentColor: { type: String, default: null },
    // Decorative page background; 'none' for plain. One of PATTERN_IDS.
    backgroundPattern: { type: String, enum: PATTERN_IDS, default: 'none' },
    snapshot: {
      content: { type: mongoose.Schema.Types.Mixed, required: true },
      layout: { type: mongoose.Schema.Types.Mixed, required: true },
      baselines: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    contentHash: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    sourceJobDescriptionId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);

versionSchema.index({ userId: 1, resumeId: 1, versionNumber: -1 });
versionSchema.index({ resumeId: 1, versionNumber: 1 }, { unique: true });

export const ResumeVersion =
  mongoose.models.ResumeVersion ?? mongoose.model('ResumeVersion', versionSchema);
