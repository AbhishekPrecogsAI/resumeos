# Deployment

ResumeOS is one Node.js process serving the API and the built web app from the same origin,
behind a TLS-terminating reverse proxy, backed by MongoDB.

## Requirements

- Node.js 22 LTS (≥ 22.12)
- MongoDB 7+. Use a replica set or a managed service such as Atlas for durability and backups.
- Google Chrome or Chromium on the server host, for PDF export. DOCX export and everything
  else work without it, and PDF export returns `503 EXPORT_UNAVAILABLE` if it's missing.
- A reverse proxy (nginx, Caddy, a cloud load balancer) that terminates HTTPS and sets
  `X-Forwarded-Proto`. The app trusts exactly one proxy hop in production.

## Build and run

```bash
npm ci
npm run build                       # builds client/dist
cd server
NODE_ENV=production \
PORT=5000 \
MONGODB_URI='mongodb+srv://…/resumeos' \
APP_BASE_URL='https://resumeos.example.com' \
CLIENT_ORIGIN='https://resumeos.example.com' \
SESSION_SECRET="$(cat /run/secrets/resumeos_session_secret)" \
CLIENT_DIST_DIR=../client/dist \
EXPORT_TEMP_DIR=/var/lib/resumeos/exports \
node src/server.js
```

At startup the server refuses to run in production if:

- `SESSION_SECRET` is the placeholder;
- `APP_BASE_URL` or any `CLIENT_ORIGIN` isn't `https://`;
- `RATE_LIMIT_DISABLED` is set.

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Store it in your platform's secret manager, never in the repository or an image.

## What production mode enables

- **HTTPS only:** plain-HTTP GET/HEAD redirect with `308`; other methods get `403
HTTPS_REQUIRED`. `/health/*` is exempt for internal probes.
- **Headers:** HSTS (1 year, includeSubDomains), `X-Content-Type-Options`, Referrer-Policy,
  and a strict Content-Security-Policy:
  - `script-src 'self'` plus the SHA-256 of the inline theme script, computed from
    `index.html` at startup, with no `unsafe-inline` for scripts;
  - `frame-ancestors 'none'`, `object-src 'none'`;
  - styles allow `'unsafe-inline'` for React style attributes and the template's own styles.
- **Cookies:** `Secure`, `HttpOnly` and `SameSite=Lax`.
- **Caching:** hashed assets under `/assets` get `max-age=1y, immutable`; `index.html` gets
  `no-cache`, so deploys take effect on the next page load.

## Health and monitoring

- `GET /health/live`: the process is up. Use it for liveness.
- `GET /health/ready`: `503` while MongoDB is disconnected. Use it for readiness and
  load-balancer checks.
- Logs are JSON lines on stdout/stderr: `time`, `level`, `msg`, `requestId`, `method`, full
  `path` without the query string, `status` and `durationMs`. Request bodies, cookies, tokens,
  resume text and error messages are never logged; unhandled errors log name, code and stack
  frames. Every response carries `x-request-id` for correlating user reports.
- Watch the 5xx rate, p95 `durationMs` for `/api/v1/resumes/*/export` (PDF rendering is the
  heaviest path), `/health/ready` failures and process restarts.

## Scaling notes

- Rate limits use in-memory counters, so they are per process. If you run more than one
  instance, put a shared store behind `express-rate-limit` or rate-limit at the proxy.
- Export files live on local disk for up to `EXPORT_TTL_MINUTES` (default 60), so downloads
  must reach the instance that created them. Use a single instance or sticky sessions, or move
  exports to shared private storage before scaling out.
- PDF rendering runs at most 2 concurrent renders per process. Each takes roughly 0.1–0.5s on
  the test machine.

## Backups and retention

- Back up MongoDB with your provider's automated snapshots or `mongodump`. Encrypt backups and
  restrict access; they contain personal data.
- **Backups and deletion:** deleting an account removes the data from the live database
  immediately, but it persists in backups until they expire. Pick a backup retention period,
  for example 30 days, and publish it on the Privacy page before launch (there's a placeholder
  line for it).
- Test a restore at least once before launch, and then periodically.
- Export files are temporary, never backed up, and swept every 10 minutes.

## Releasing and rolling back

1. Run `npm test`, `npm run lint` and `npm run build`. Optionally run `npm run test:e2e` against
   a staging environment with Chrome.
2. Deploy the new build alongside the old one if possible, and switch traffic once
   `/health/ready` passes.
3. **Rollback:** redeploy the previous build. Every release so far is backwards-compatible at
   the data level: new fields have defaults, and no migration rewrites existing documents.
   `CareerProfile.schemaVersion` exists so a future breaking change can be migrated lazily.
4. Mongoose creates missing indexes at startup. Check index builds on large collections
   before switching traffic.

## Shutdown

`SIGTERM`/`SIGINT` stop accepting connections, finish in-flight requests, close the PDF browser
and the MongoDB connection, and exit. Shutdown is forced after 10 seconds.
