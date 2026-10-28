import mongoose from 'mongoose';

export const APPLICATION_STATUSES = [
  'planned',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
];
export const MAX_APPLICATIONS_PER_USER = 1000;

// Links keep a snapshot label so the history still reads correctly after a resume, version or job
// is deleted (the id is then cleared).
const applicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: String, required: true, maxlength: 160 },
    role: { type: String, required: true, maxlength: 160 },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'planned' },
    appliedAt: { type: String, default: '' }, // YYYY-MM-DD, date only
    nextFollowUpAt: { type: String, default: '' }, // YYYY-MM-DD, date only
    notes: { type: String, default: '', maxlength: 4000 },
    jobDescriptionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    jobLabel: { type: String, default: '', maxlength: 200 },
    resumeId: { type: mongoose.Schema.Types.ObjectId, default: null },
    resumeVersionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    resumeLabel: { type: String, default: '', maxlength: 260 },
  },
  { timestamps: true },
);

applicationSchema.index({ userId: 1, updatedAt: -1 });
applicationSchema.index({ userId: 1, nextFollowUpAt: 1 });

export const ApplicationRecord =
  mongoose.models.ApplicationRecord ?? mongoose.model('ApplicationRecord', applicationSchema);
