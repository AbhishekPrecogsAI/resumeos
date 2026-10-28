import mongoose from 'mongoose';
import { PATTERN_IDS } from '@resumeos/shared/templates/patterns.js';

export const MAX_RESUMES_PER_USER = 100;

// The draft is the working copy the editor autosaves (revision-checked). Immutable named
// versions are a separate collection (added with version history).
const resumeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 120 },
    targetRole: { type: String, default: '', maxlength: 120 },
    jobId: { type: mongoose.Schema.Types.ObjectId, default: null },
    sourceProfileId: { type: mongoose.Schema.Types.ObjectId, default: null },
    currentVersionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Monotonic per-resume counter for version numbers (never reused, even after deletion).
    versionCounter: { type: Number, default: 0 },
    branchedFrom: {
      resumeId: { type: mongoose.Schema.Types.ObjectId, default: null },
      versionId: { type: mongoose.Schema.Types.ObjectId, default: null },
      versionNumber: { type: Number, default: null },
    },
    templateId: { type: String, required: true },
    pageSize: { type: String, enum: ['A4', 'Letter'], default: 'A4' },
    // Template accent colour; null means the template's default. Validated for contrast.
    accentColor: { type: String, default: null },
    // Decorative page background; 'none' for plain. One of PATTERN_IDS.
    backgroundPattern: { type: String, enum: PATTERN_IDS, default: 'none' },
    draft: {
      content: { type: mongoose.Schema.Types.Mixed, required: true },
      layout: { type: mongoose.Schema.Types.Mixed, required: true },
      // Profile-entry fingerprints at copy/sync time; see shared/src/sync.js.
      baselines: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    draftRevision: { type: Number, default: 1 },
    archivedAt: { type: Date, default: null },
    // Quality findings the user chose to dismiss, keyed by finding key (see shared/src/quality).
    qualityDismissals: {
      type: [{ _id: false, key: String, ruleId: String, reason: String, dismissedAt: Date }],
      default: [],
    },
  },
  { timestamps: true, minimize: false },
);

resumeSchema.index({ userId: 1, updatedAt: -1 });

export const Resume = mongoose.models.Resume ?? mongoose.model('Resume', resumeSchema);
