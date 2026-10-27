import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true },
  sessionVersion: { type: Number, required: true },
  userAgent: { type: String, maxlength: 200, default: '' },
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ userId: 1, lastSeenAt: -1 });
// MongoDB removes expired sessions automatically.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.models.Session ?? mongoose.model('Session', sessionSchema);
