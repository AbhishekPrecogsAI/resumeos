import mongoose from 'mongoose';

const preferencesSchema = new mongoose.Schema(
  {
    theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
    locale: { type: String, default: 'en-US', maxlength: 20 },
    pageSize: { type: String, enum: ['A4', 'Letter'], default: 'A4' },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    emailVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    accountStatus: { type: String, enum: ['active', 'disabled'], default: 'active' },
    preferences: { type: preferencesSchema, default: () => ({}) },
    // Bumped on password change; sessions created under an older version are rejected.
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });

export function publicUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    displayName: user.displayName,
    emailVerified: Boolean(user.emailVerifiedAt),
    preferences: {
      theme: user.preferences?.theme ?? 'system',
      locale: user.preferences?.locale ?? 'en-US',
      pageSize: user.preferences?.pageSize ?? 'A4',
    },
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
