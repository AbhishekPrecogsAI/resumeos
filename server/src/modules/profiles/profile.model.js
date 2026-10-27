import mongoose from 'mongoose';

export const PROFILE_SCHEMA_VERSION = 1;

// `content` is validated in full by Zod at the API boundary (content.schema.js) before every write,
// so it is stored as a plain object here.
const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    schemaVersion: { type: Number, default: PROFILE_SCHEMA_VERSION },
    revision: { type: Number, default: 0 },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, minimize: false },
);

profileSchema.index({ userId: 1 }, { unique: true });

export const CareerProfile =
  mongoose.models.CareerProfile ?? mongoose.model('CareerProfile', profileSchema);
