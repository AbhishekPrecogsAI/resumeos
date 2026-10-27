# ResumeOS: Product Requirements (concise)

Source of truth for detail: `AGENT-8.md`. This doc records the confirmed scope and the build plan.

## Problem

Resume builders treat a resume as a one-off document. Developers who tailor resumes per role
end up with diverging copies, no history, opaque "ATS scores", and fragile exports.

## Product

A master career profile (structured, stable IDs) from which users generate named, versioned
resumes. Every change is diffable and restorable. Quality checks are deterministic and
explained. Job-description matching reports transparent term coverage. Exports are validated
by reparsing the output.

## Target users

Software, backend, full-stack, DevOps, SRE, QA engineers and tech leads. The data model must
not be profession-specific.

## Principles (non-negotiable)

- No fabricated claims, metrics, testimonials or statistics, in product or marketing.
- No "ATS pass" guarantees or composite ATS percentages; show counts and the checks actually run.
- No AI in the core product without explicit owner approval.
- Users can always download their own resume, export their data, and delete their account.
- Resume/PII content is never logged.

## MVP scope

1. Auth and account management (cookie sessions)
2. Master profile CRUD
3. Resume editor with live preview
4. One excellent single-column template
5. PDF export with post-export validation
6. Versions, snapshots, compare, restore-as-new
7. Deterministic quality checks
8. Job-description keyword comparison
9. Responsive, accessible UI
10. Unit, integration and E2E tests
11. User-scoped API authorization everywhere
12. README, `.env.example`, local setup

## Non-goals for MVP

Microservices, Kubernetes, mandatory AI, ATS pass-rate predictions, auto-apply, job-site
scraping, social features, a template marketplace, payments.

Post-MVP: DOCX, more templates, richer diff, evidence graph, application tracker, import.

## Success measures (to be measured, not assumed)

Profile completion, first successful export, quality-check usage, repeat editing, version
creation. No targets are set until real users are observed.

## Build plan

One phase at a time, each ending with a report and owner review.

| Phase | Focus                            | Exit criteria (short)                                  |
| ----- | -------------------------------- | ------------------------------------------------------ |
| 0     | Foundation                       | Apps start, health works, smoke test passes            |
| 1     | Design system and public site    | No overflow, visible focus, accessible names, builds   |
| 2     | Auth and account security        | Guarded routes client and server, auth tests pass      |
| 3     | Master career profile            | CRUD, reorder, stale-write handling, integration tests |
| 4     | Resume editor and template       | Preview matches edits, survives refresh, no data loss  |
| 5     | PDF export and validation        | Exported PDF reparsed, ordered, edge cases documented  |
| 6     | Versions and diff                | Create/compare/restore without losing history          |
| 7     | Quality engine                   | Each rule unit-tested, reproducible, no fake score     |
| 8     | Job-description comparison       | Explainable, editable, never adds unconfirmed content  |
| 9     | DOCX, second template, tracker   | Regression tests, no output-quality regression         |
| 10    | Security, accessibility, release | Audit clean or accepted, docs complete                 |
| 11    | User validation and monetization | Real findings documented                               |

## Phase 0 decisions

- **npm workspaces** (`client`, `server`) with root scripts; no extra monorepo tooling.
- **ES modules** throughout.
- **Express 5** for native async error propagation.
- **Zod** validates env at startup; it will also validate request bodies at the API boundary.
- **Mongoose `sanitizeFilter`** enabled globally as a NoSQL-injection backstop. Request
  validation remains the primary defense.
- **Server starts before the DB connects** so liveness and readiness are distinct signals.
- **Vite dev proxy** for `/api` and `/health`, keeping the client same-origin. That keeps
  cookie auth in Phase 2 simple (SameSite, no cross-site credentials in dev).
- **Vitest** for both apps, one runner and one assertion style. Playwright arrives with the
  first E2E-worthy journey (Phase 2).
- **No React Router yet.** It is added in Phase 1 with the public routes.

## Open questions for the owner

- Is the MVP scope above approved as-is?
- PDF engine: headless Chromium (Playwright/Puppeteer) gives the best HTML/CSS fidelity, but
  it is a heavy dependency. Proof of concept planned for Phase 5.
- Password reset needs an email delivery mechanism. Is one available, or should reset stay
  explicitly unimplemented in Phase 2?
