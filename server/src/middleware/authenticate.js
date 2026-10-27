import { parseCookies } from '../utils/cookies.js';
import { HttpError } from '../utils/HttpError.js';

/** Attach req.auth = { user, session } when a valid session cookie is present. */
export function loadSession(sessions) {
  return async (req, res, next) => {
    try {
      const token = parseCookies(req.headers.cookie)[sessions.cookieName];
      req.auth = token ? await sessions.resolve(token) : null;
      if (token && !req.auth) sessions.clearCookie(res);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireAuth(req, res, next) {
  if (!req.auth) return next(new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.'));
  next();
}
