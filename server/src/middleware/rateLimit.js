import { rateLimit } from 'express-rate-limit';
import { MongoRateLimitStore } from './rateLimitStore.js';

const MESSAGE = {
  error: { code: 'RATE_LIMITED', message: 'Too many attempts. Wait a few minutes and try again.' },
};

export function createLimiter({ windowMs, limit, disabled = false, keyGenerator, store }) {
  if (disabled) return (req, res, next) => next();
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: MESSAGE,
    ...(keyGenerator ? { keyGenerator } : {}),
    ...(store ? { store } : {}),
  });
}

export function rateLimits(env) {
  const disabled = env.RATE_LIMIT_DISABLED;
  // Shared counters in MongoDB when instances don't share memory (serverless); else in memory.
  const store = (name) =>
    env.RATE_LIMIT_STORE === 'mongo' ? new MongoRateLimitStore(name) : undefined;
  const limiter = (name, windowMs, limit) =>
    createLimiter({ windowMs, limit, disabled, store: store(name) });
  return {
    api: limiter('api', 60_000, 300),
    login: limiter('login', 15 * 60_000, 10),
    register: limiter('register', 60 * 60_000, 10),
    sensitive: limiter('sensitive', 15 * 60_000, 10),
    // PDF rendering is CPU-heavy.
    export: limiter('export', 5 * 60_000, 20),
    // Fit to one page renders up to five PDFs per request (unless cached).
    fit: limiter('fit', 5 * 60_000, 10),
  };
}
