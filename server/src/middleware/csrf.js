import { HttpError } from '../utils/HttpError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originOf(req) {
  const origin = req.get('origin');
  if (origin) return origin;
  const referer = req.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Cookie sessions + SameSite=Lax already block most cross-site writes; this adds an explicit
 * Origin/Referer allowlist check on every state-changing request as defense in depth.
 */
export function csrfProtection(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = originOf(req);
    if (!origin || !allowed.has(origin)) {
      return next(
        new HttpError(403, 'CSRF_REJECTED', 'This request came from an untrusted origin.'),
      );
    }
    next();
  };
}
