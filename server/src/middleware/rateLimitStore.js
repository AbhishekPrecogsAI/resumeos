import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String },
    hits: { type: Number, required: true },
    resetAt: { type: Date, required: true },
  },
  { versionKey: false },
);
// MongoDB removes counters once their window has ended.
counterSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });
export const RateLimitCounter =
  mongoose.models.RateLimitCounter ?? mongoose.model('RateLimitCounter', counterSchema);

/**
 * express-rate-limit store backed by MongoDB, for hosts where each request may run on a
 * different instance (serverless), so in-memory counters would never add up. One atomic update
 * per request: a window that has ended starts again at 1.
 */
export class MongoRateLimitStore {
  // Counters live in the database, not this process.
  localKeys = false;

  constructor(prefix) {
    this.prefix = prefix;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  async increment(key) {
    const now = new Date();
    const ended = { $lte: [{ $ifNull: ['$resetAt', now] }, now] };
    const doc = await RateLimitCounter.findOneAndUpdate(
      { _id: `${this.prefix}:${key}` },
      [
        {
          $set: {
            hits: { $cond: [ended, 1, { $add: ['$hits', 1] }] },
            resetAt: { $cond: [ended, new Date(now.getTime() + this.windowMs), '$resetAt'] },
          },
        },
      ],
      { upsert: true, returnDocument: 'after', updatePipeline: true },
    ).lean();
    return { totalHits: doc.hits, resetTime: doc.resetAt };
  }

  async decrement(key) {
    await RateLimitCounter.updateOne({ _id: `${this.prefix}:${key}` }, { $inc: { hits: -1 } });
  }

  async resetKey(key) {
    await RateLimitCounter.deleteOne({ _id: `${this.prefix}:${key}` });
  }
}
