import mongoose from 'mongoose';

export const MAX_JOBS_PER_USER = 200;

// Stored only when the user explicitly saves a job description. `userTerms` holds the user's
// edited term list; null means "use the extracted terms".
const jobSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 160 },
    company: { type: String, default: '', maxlength: 160 },
    descriptionText: { type: String, required: true },
    extractedTerms: { type: [mongoose.Schema.Types.Mixed], default: [] },
    userTerms: { type: [mongoose.Schema.Types.Mixed], default: null },
  },
  { timestamps: true },
);

jobSchema.index({ userId: 1, updatedAt: -1 });

export const JobDescription =
  mongoose.models.JobDescription ?? mongoose.model('JobDescription', jobSchema);
