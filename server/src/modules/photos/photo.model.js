import mongoose from 'mongoose';

// One optional profile photo per user, stored apart from profile content so autosave payloads
// stay small. Resumes show it only when their layout opts in and the template supports photos.
const photoSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mime: { type: String, enum: ['image/jpeg', 'image/png'], required: true },
    data: { type: Buffer, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { timestamps: true },
);

photoSchema.index({ userId: 1 }, { unique: true });

export const ProfilePhoto =
  mongoose.models.ProfilePhoto ?? mongoose.model('ProfilePhoto', photoSchema);
