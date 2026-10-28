# Test plan

| Layer        | Tool                                    | Command              | Covers                                                                                                                                                                                               |
| ------------ | --------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared logic | Vitest                                  | `npm test -w shared` | Templates (escaping, order, visibility, Unicode, identical markup across templates), dates, sync, diff, completion, quality rules (positive and negative case per rule), job extraction and coverage |
| Server       | Vitest + Supertest + real MongoDB       | `npm test -w server` | Every API module, plus the cross-cutting suites below                                                                                                                                                |
| Client       | Vitest + Testing Library (jsdom)        | `npm test -w client` | Components, forms, autosave, guards, pages with a mocked API, contrast of theme tokens                                                                                                               |
| End to end   | Playwright + axe-core, installed Chrome | `npm run test:e2e`   | Journeys and accessibility at 375, 768 and 1280px in a real browser                                                                                                                                  |

Server tests create a randomly named database per file and drop it afterwards. They need MongoDB
on `127.0.0.1:27017` (override with `TEST_MONGODB_URI`). PDF tests use the installed Chrome
and are skipped if none is found. DOCX tests need nothing extra.

## Cross-cutting suites

- `server/tests/routes.test.js`: walks the real router. Every API route except the explicit
  public list returns `401` anonymously; every route with parameters or a body runs a
  validator; every state-changing route rejects foreign origins with `403`.
- `server/tests/privacy.test.js`: creates one of every record type, deletes the account, and
  scans every collection for documents referencing the user, expecting none. The other
  user's data and export files are untouched.
- `server/tests/production.test.js`: HTTPS redirect and refusal, CSP script hash, HSTS,
  asset caching, JSON 404s, Secure cookies, production env validation, and error logs that
  exclude messages.
- `server/tests/exports.test.js`, `docx.test.js`: edge-case fixtures (Unicode, long text,
  minimal, multi-page) through PDF and DOCX with validation, plus a text-layout regression
  snapshot.
- `client/tests/contrast.test.js`: WCAG contrast for every text pairing (≥ 4.5:1) and control
  boundary (≥ 3:1) in light and dark themes.
- Static accessibility: `eslint-plugin-jsx-a11y` (recommended rules) runs in `npm run lint`.

## Required negative cases (where they're tested)

| Case                                    | Test                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------- |
| Invalid input                           | Every module's tests; `routes.test.js`                                    |
| Reset token reuse                       | Not applicable: password reset is unavailable (`501`)                     |
| Another user's resume                   | `resumes`, `versions`, `exports`, `quality`, `jobs`, `applications` tests |
| Oversized job description               | `jobs.test.js` (20,001 characters → 400)                                  |
| Unsupported export format               | `exports.test.js`                                                         |
| Broken export process                   | `exports.test.js` (no browser → 503, no record)                           |
| Duplicate submission / retry            | Idempotency key test in `exports.test.js`                                 |
| Stale autosave                          | `profile.test.js`, `resumes.test.js`, client `autosave.test.jsx`          |
| Empty profile / missing optional fields | `resumes.test.js`, `FIXTURES.minimal`                                     |
| Long content overflow                   | `FIXTURES.unicodeAndLong`, `FIXTURES.multiPage`                           |
| Malicious text payload                  | Template escaping tests; NoSQL operator tests                             |
| Database unavailable                    | `health.test.js` (ready → 503)                                            |
| File export timeout                     | `render.js` timeout path (`504 EXPORT_TIMEOUT`); not exercised by a test  |
