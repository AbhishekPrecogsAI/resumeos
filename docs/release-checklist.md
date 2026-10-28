# Release checklist: release candidate 1

Run on 2026-10-28 against commit range up to Phase 10 (Node 22.12, MongoDB 7 local, system
Chrome).

## Verified

| Area                                      | Result                                                                                                                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit and integration tests                | **399 passed**: shared 86, server 191 (real MongoDB, real Chrome for PDF), client 122                                                                                                                                                                         |
| Lint (incl. `jsx-a11y` recommended rules) | Clean. One reviewed exception: dialog backdrop click (Escape and close button are the keyboard equivalents)                                                                                                                                                   |
| Formatting                                | Clean                                                                                                                                                                                                                                                         |
| Production build                          | Succeeds; `client/dist` is 2.0 MB including fonts, with 66 lazy-loaded JS chunks                                                                                                                                                                              |
| Dependency audit (all / production)       | 0 vulnerabilities / 0 vulnerabilities. `pdfjs-dist` was pinned to ≥ 6.2.108 for GHSA-hq66-cqwq-w95j                                                                                                                                                           |
| Authorization                             | Route inventory: all 50 non-public API routes return 401 anonymously; every route with parameters or a body validates input; all state-changing routes reject foreign origins (403). Cross-user access tests in every module return 404                       |
| Account deletion                          | Privacy test: after deletion, no document in any collection references the user; export files are removed; other users are untouched                                                                                                                          |
| Data export                               | Includes account, sessions, profile (with evidence), resumes, versions, exports metadata, job descriptions and applications; excludes password hashes and session tokens                                                                                      |
| Production mode                           | Manually checked over HTTP against the built app: 308 to HTTPS, SPA served, CSP with pinned script hash and no `unsafe-inline` scripts, HSTS, immutable assets, `Secure; HttpOnly; SameSite=Lax` cookie, JSON 404s, full request paths in logs with no bodies |
| Contrast                                  | Every text pairing ≥ 4.5:1 and control borders ≥ 3:1 in light and dark themes (computed in tests)                                                                                                                                                             |

## Fixed during this review

- **Control borders (inputs, secondary buttons) were about 1.6:1 against their background**,
  failing WCAG 1.4.11's 3:1. Darkened to #858e9b (light) and #69727f (dark).
- **Request logs recorded router-relative paths** (`/ready` instead of `/health/ready`). They now
  log the full path without the query string.
- **Error logs included error messages**, which can embed user-submitted values. They now
  record name, code and stack frames only.
- **Missing static assets returned 500**; they now return 404.
- **The Security page overclaimed** that registration doesn't reveal whether an email is
  registered. Corrected to describe the actual trade-off.
- Outdated public copy (single template, "features ship phase by phase") updated.

## Not verified by me

- **Browser end-to-end and axe runs** (`npm run test:e2e`). Specs exist for public pages, auth
  journeys and a sweep of every app screen at 375, 768 and 1280px in light and dark themes,
  plus reduced motion. They were last run in Phase 1; the product owner is doing browser
  testing.
- **Screen-reader passes** with NVDA, JAWS or VoiceOver. These need manual testing.
- **User testing:** none conducted. See `docs/user-test-plan.md`.
- **Load testing:** not done. PDF rendering is limited to 2 concurrent renders per process.
- The file-export timeout path (`504`) exists in code but isn't exercised by a test.

## Blockers before a public launch

1. **Legal review** of the Privacy and Terms pages, which are marked as drafts.
2. **A security contact address** published on the Security page.
3. **Email delivery**, for password reset (currently `501` and labelled as unavailable) and
   for email verification.
4. **The backup retention period** chosen, implemented and stated on the Privacy page.
5. **For more than one server instance:** a shared rate-limit store, and shared private storage
   for export files (see `docs/deployment.md`).

## Accepted, documented limitations

- Registration reveals whether an email is already registered (rate-limited; `docs/security.md`).
- Job matching is lexical and dictionary-based (`docs/jobs.md`).
- Quality rules have documented false positives and are dismissible (`docs/quality.md`).
- The DOCX export uses a system font and doesn't report page count (`docs/export.md`).
- Ledger is a visual two-column layout; extraction order is verified with pdf.js only.
- The preview's page count is an estimate; the exported PDF page count is exact.
