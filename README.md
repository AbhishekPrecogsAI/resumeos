# ResumeOS

A career-data workspace: maintain one trustworthy master profile and generate versioned,
job-specific resumes from it, with deterministic quality checks and reliable exports.

**Status:** Release candidate 1 (Phases 0–10). See [`docs/release-checklist.md`](docs/release-checklist.md) for verified results and the blockers before public launch.
The full product spec is in [`AGENT-8.md`](AGENT-8.md); scope is in
[`docs/product-requirements.md`](docs/product-requirements.md); UI tokens and components are in
[`docs/design-system.md`](docs/design-system.md); security model in [`docs/security.md`](docs/security.md); export design and checks in [`docs/export.md`](docs/export.md); versions in [`docs/versioning.md`](docs/versioning.md); quality rules in [`docs/quality.md`](docs/quality.md); job matching in [`docs/jobs.md`](docs/jobs.md); applications in [`docs/applications.md`](docs/applications.md); share links in [`docs/sharing.md`](docs/sharing.md); deployment in [`docs/deployment.md`](docs/deployment.md); tests in [`docs/test-plan.md`](docs/test-plan.md).

## Stack

| Part   | Tech                                                                          |
| ------ | ----------------------------------------------------------------------------- |
| Client | React 19 (JavaScript), Vite 8, Tailwind CSS 4, React Router 7, TanStack Query |
| Shared | `shared/`: pure JS used by client and server (resume model, templates, dates) |
| Server | Node.js 22, Express 5, Mongoose 9, Zod (env validation), Helmet, CORS         |
| Tests  | Vitest, Supertest, Testing Library (jsdom), Playwright + axe-core             |
| Tools  | npm workspaces, ESLint 9 (flat config), Prettier                              |

## Requirements

- Node.js **≥ 22.12** (`.nvmrc` pins 22) and npm ≥ 10
- MongoDB **7+**, either native `mongod` or via Docker Compose
- Google Chrome or Chromium, for PDF export (auto-detected, or set `CHROME_PATH`)

## Setup

```bash
npm install
cp .env.example server/.env
# Replace SESSION_SECRET in server/.env with a real secret:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server validates environment variables at startup and exits with a list of problems if
any are invalid. A placeholder `SESSION_SECRET` is rejected when `NODE_ENV=production`.
`server/.env` is gitignored; never commit it. Do not put backend secrets in `VITE_*` variables.

### MongoDB

Native: make sure `mongod` is listening on `127.0.0.1:27017`.
Docker: `docker compose up -d mongo`.

## Scripts (run from the repo root)

| Command                | What it does                                                   |
| ---------------------- | -------------------------------------------------------------- |
| `npm run dev`          | Starts server (`:5000`, watch mode) and client (`:5173`)       |
| `npm run build`        | Production build of the client into `client/dist`              |
| `npm start`            | Starts the server without watch mode                           |
| `npm test`             | Server then client unit/integration tests                      |
| `npm run lint`         | ESLint across the repo                                         |
| `npm run format:check` | Prettier check (`npm run format` to write)                     |
| `npm run smoke`        | Hits the running dev servers and checks health + the dev proxy |

E2E tests use the installed Google Chrome (`channel: 'chrome'`), so no browser download is needed.
They start their own API on `:5100` (database `resumeos_e2e`) and client on `:5174`, so they don't
touch your dev servers or data. They need MongoDB running. Checks include horizontal overflow at
375/768/1280px, axe-core WCAG 2.1 AA scans in light and dark themes, keyboard focus, and no
third-party requests.

In development the Vite dev server proxies `/api` and `/health` to the server, so the client
uses same-origin paths and never hard-codes the API URL.

## Smoke test procedure

1. Ensure MongoDB is running.
2. `npm run dev` in one terminal.
3. `npm run smoke` in another. Expected output:
   ```
   PASS  server /health/live  (200)
   PASS  server /health/ready  (200)
   PASS  client index  (200)
   PASS  client proxy /health/ready  (200)
   ```
4. Open http://localhost:5173. It should read "API and database reachable".
5. Stop MongoDB and click **Recheck**. It should read "API reachable, database unavailable",
   and `GET /health/ready` should return `503`.

## Endpoints so far

| Method | Path                                              | Notes                                             |
| ------ | ------------------------------------------------- | ------------------------------------------------- |
| GET    | `/health/live`, `/health/ready`                   | Liveness; readiness is `503` when MongoDB is down |
| GET    | `/api/v1/meta`                                    | API version and shipped features                  |
| POST   | `/api/v1/auth/register`                           | Creates account and session cookie                |
| POST   | `/api/v1/auth/login`, `/logout`                   | Generic error on bad credentials                  |
| GET    | `/api/v1/auth/me`                                 | Current user, or `401`                            |
| POST   | `/api/v1/auth/change-password`                    | Signs out every other session                     |
| GET    | `/api/v1/auth/sessions`                           | Your active sessions                              |
| DELETE | `/api/v1/auth/sessions/:id`                       | Sign out one session                              |
| POST   | `/api/v1/auth/sessions/revoke-others`             | Sign out all other sessions                       |
| POST   | `/api/v1/auth/forgot-password`, `/reset-password` | `501`: no email service configured                |
| GET    | `/api/v1/account`, PATCH `/api/v1/account`        | Read or update display name and preferences       |
| GET    | `/api/v1/account/export`                          | JSON export of all your data                      |
| DELETE | `/api/v1/account`                                 | Body `{ password, confirmation: "DELETE" }`       |

| GET | `/api/v1/profile` | Profile with `revision` (0 before first save) |
| PUT | `/api/v1/profile` | Replace content; needs `If-Match: "<revision>"` |
| POST | `/api/v1/profile/:section` | Add an entry (`experience`, `skills`, …) |
| PATCH/DELETE | `/api/v1/profile/:section/:entryId` | Update or delete one entry; needs `If-Match` |
| GET/POST | `/api/v1/resumes` | Paginated list (`page`, `limit`, `includeArchived`); create from profile |
| GET/PATCH/DELETE | `/api/v1/resumes/:id` | Read, update metadata (title, template, archive), delete |
| PUT | `/api/v1/resumes/:id/draft` | Autosave draft; needs `If-Match: "<draftRevision>"` |
| POST | `/api/v1/resumes/:id/duplicate` | Copy a resume |

Writes that carry a stale revision get `409 STALE_REVISION` with the current revision; the UI
offers "Load latest version" or "Keep my edits" and never overwrites silently. Resumes copy
profile entries under the same ids and keep per-entry fingerprints, so the editor can show
which entries changed in the profile (logic in `shared/src/sync.js`).

| GET/POST | `/api/v1/resumes/:id/versions` | List versions (with `exported`, `draftMatchesCurrent`); save the draft as a version |
| GET/DELETE | `/api/v1/resumes/:id/versions/:vid` | Read a version (with snapshot) or delete it |
| POST | `/api/v1/resumes/:id/versions/:vid/restore` | Restore as a new version (auto-saves an unsaved draft first) |
| GET | `/api/v1/resumes/:id/compare?left=&right=` | Structured diff; each side is a version id or `draft` |
| POST | `/api/v1/resumes/:id/quality-check` | Run all quality rules on the saved draft |
| GET/POST | `/api/v1/resumes/:id/quality-dismissals` | List or add a dismissal `{ key, reason? }` |
| DELETE | `/api/v1/resumes/:id/quality-dismissals/:key` | Restore a dismissed finding |
| POST | `/api/v1/jobs/analyze` | Extract terms (and coverage with `resumeId`) without storing anything |
| GET/POST | `/api/v1/jobs` | List or save job descriptions |
| GET/PATCH/DELETE | `/api/v1/jobs/:id` | Read, edit (incl. `terms` / `resetTerms`), delete |
| POST | `/api/v1/jobs/:id/extract-terms` | Re-run extraction (keeps the user's edited list) |
| POST | `/api/v1/jobs/:id/match-resume` | `{ resumeId, versionId? }` → coverage report |
| POST | `/api/v1/resumes/:id/export` | `{ format: "pdf" \| "docx", pageSize? }`; optional `Idempotency-Key` |
| GET/POST | `/api/v1/applications` | List (filter `status`) or record an application |
| GET | `/api/v1/applications/due?today=` | Open applications with a follow-up due |
| GET/PATCH/DELETE | `/api/v1/applications/:id` | Read, update, delete |
| GET | `/api/v1/exports`, `/api/v1/exports/:id` | Export history with validation results |
| GET | `/api/v1/exports/:id/download` | The PDF while it hasn't expired (`410` after) |
| DELETE | `/api/v1/exports/:id` | Delete record and file |

State-changing API requests must come from an allowed origin (see `docs/security.md`); the
Vite dev proxy preserves the browser's `Origin`, so this works in development.

Errors use one shape: `{ "error": { "code", "message", "requestId" } }`. Every response
carries an `x-request-id` header. Logs are structured JSON and record method, path, status
and latency only, never request bodies.

## Production

```bash
npm ci && npm run build
cd server && NODE_ENV=production CLIENT_DIST_DIR=../client/dist node src/server.js
```

In production the server also serves the built web app from the same origin. It needs HTTPS
URLs, a real `SESSION_SECRET` and a TLS-terminating proxy. See
[`docs/deployment.md`](docs/deployment.md) for configuration, monitoring, backups and rollback.

## Troubleshooting

- **`Invalid environment configuration`:** the message lists each bad variable; fix `server/.env`.
- **`/health/ready` returns 503:** MongoDB is unreachable at `MONGODB_URI`. The server keeps
  serving and Mongoose keeps retrying in the background.
- **`Port 5173 is in use`:** the client uses `strictPort`; free the port or stop the other Vite.
- **Client shows "Couldn't reach the API":** the server isn't running on `:5000`, or
  `API_PROXY_TARGET` points elsewhere.

- **Changes to `shared/` (templates, rules) don't appear in the browser:** the client's Vite
  config watches `shared/src` explicitly. If an old dev server predates that, restart
  `npm run dev`.

## Resetting local data

Development data lives in the `resumeos` database. To wipe it:
`mongosh resumeos --eval 'db.dropDatabase()'`. Demo-data seeding is not implemented yet.
