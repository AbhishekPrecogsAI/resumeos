import mongoose from 'mongoose';

export const MAX_SHARES_PER_RESUME = 20;

/**
 * A public, read-only link to one resume. The token in the URL is the only credential, so it's
 * long and random, and the owner can turn a link off or delete it at any time.
 */
const shareLinkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true },
    token: { type: String, required: true },
    label: { type: String, default: '', maxlength: 60 },
    // null shares the resume as it is now and keeps up with edits; otherwise a saved version.
    versionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResumeVersion', default: null },
    allowDownload: { type: Boolean, default: false },
    hideContactDetails: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    viewCount: { type: Number, default: 0 },
    lastViewedAt: { type: Date, default: null },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
shareLinkSchema.index({ token: 1 }, { unique: true });
shareLinkSchema.index({ userId: 1, resumeId: 1, createdAt: -1 });

export const ShareLink = mongoose.model('ShareLink', shareLinkSchema);
