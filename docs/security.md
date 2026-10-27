# Security

## Authentication

- **Passwords:** Argon2id (19 MiB memory, t=2, p=1, the OWASP baseline). Policy is length only:
  10–128 characters, not only spaces (NIST SP 800-63B). Hashes are `select: false` in the
  schema and never serialised.
- **Sessions:** server-side. Each sign-in creates a `Session` document with an HMAC-SHA256
  (keyed by `SESSION_SECRET`) of a 256-bit random token; only the hash is stored. The raw token
  lives in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production) with a 30-day absolute
  expiry (`SESSION_TTL_DAYS`). A TTL index removes expired sessions.
- **Revocation:** sign-out deletes the session. Changing the password bumps
  `user.sessionVersion` and deletes all sessions, then issues one for the current device. Users
  can list sessions and sign out any or all others.
- **Login responses** are identical for unknown email and wrong password; an unknown email is
  still verified against a dummy hash so timing is similar.
- **Known trade-off:** registration returns `409 EMAIL_TAKEN` for an existing email. Without
  email verification there is no way to avoid this while keeping sign-up usable. Registration
  is rate-limited (10 per hour per IP) to bound enumeration.
- **Password reset** returns `501 PASSWORD_RESET_UNAVAILABLE`; no email delivery is
  configured. It will be built with hashed, single-use, expiring tokens once one is.

## Request protection

- **CSRF:** every non-GET `/api/v1` request must carry an `Origin` (or `Referer`) in the
  allowlist (`CLIENT_ORIGIN` and `APP_BASE_URL`), in addition to SameSite cookies. Bodies are
  JSON-only.
- **CORS:** explicit origin allowlist with credentials; no wildcard.
- **Validation:** every request body, path parameter and query is parsed with strict Zod schemas
  that reject unknown keys, so `{"email": {"$gt": ""}}` fails validation. Mongoose
  `sanitizeFilter` is enabled globally as a second layer; internal operator use is marked with
  `mongoose.trusted()`.
- **Rate limits:** 300 requests per minute per IP on the API; sign-in 10 per 15 minutes;
  registration 10 per hour; password change, export and deletion 10 per 15 minutes.
  `RATE_LIMIT_DISABLED` exists for automated tests and is refused in production.
- **Headers:** Helmet defaults, `x-powered-by` off, `cache-control: no-store` on API responses.
- **Errors:** one JSON shape with a request ID, and no stack traces outside development.

## Authorization

Identity always comes from the session, never from the request body. Queries for user-owned
data always include `userId: req.auth.user._id`. Another user's resource returns 404, not 403,
so its existence isn't revealed.

## Privacy

- Logs record method, path (without the query string), status, latency and request ID, never
  bodies, cookies or tokens.
- **Export:** `GET /api/v1/account/export` returns everything stored for the user as JSON,
  without hashes or tokens.
- **Deletion:** `DELETE /api/v1/account` requires the password and the literal `DELETE`. It
  runs every handler in the user-data registry (`server/src/services/userData.js`), which each
  module registers on creation, so deletion stays complete as features are added. The response
  lists the per-collection counts deleted, and the client reports success only after it.
