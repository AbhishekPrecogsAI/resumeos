import { rateLimit } from 'express-rate-limit';

const MESSAGE = {
  error: { code: 'RATE_LIMITED', message: 'Too many attempts. Wait a few minutes and try again.' },
};

export function createLimiter({ windowMs, limit, disabled = false, keyGenerator }) {
  if (disabled) return (req, res, next) => next();
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: MESSAGE,
    ...(keyGenerator ? { keyGenerator } : {}),
  });
}

export function rateLimits(env) {
  const disabled = env.RATE_LIMIT_DISABLED;
  return {
    api: createLimiter({ windowMs: 60_000, limit: 300, disabled }),
    login: createLimiter({ windowMs: 15 * 60_000, limit: 10, disabled }),
    register: createLimiter({ windowMs: 60 * 60_000, limit: 10, disabled }),
    sensitive: createLimiter({ windowMs: 15 * 60_000, limit: 10, disabled }),
    // PDF rendering is CPU-heavy.
    export: createLimiter({ windowMs: 5 * 60_000, limit: 20, disabled }),
  };
}
