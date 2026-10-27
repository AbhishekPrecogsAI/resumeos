import { rateLimit } from 'express-rate-limit';

export function apiRateLimit({ windowMs = 60_000, limit = 300 } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } },
  });
}
