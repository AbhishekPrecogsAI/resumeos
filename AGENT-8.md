# ResumeOS --- Product & Engineering Agent Guide

> **Mission:** Build a polished, trustworthy, developer-first resume
> platform that is dramatically more useful than a template-only resume
> builder. The product should aim to outperform established builders
> through excellent UX, structured career data, version control,
> measurable document quality checks, transparent job matching, and
> reliable exports.
>
> **Important:** "100x better than NovoResume" is an ambition, not a
> factual claim or a guarantee. Do not copy competitors' branding,
> templates, copy, or proprietary behavior. Research the market,
> identify measurable gaps, and validate differentiation with users.
>
> **Stack:** React (JavaScript, not TypeScript) + Tailwind CSS +
> Express.js + MongoDB. **AI policy:** No AI is required for the core
> product. Prefer deterministic, explainable rules. Do not add AI APIs
> unless the product owner explicitly approves a future scope change.
> **Working style:** Build one phase at a time. Run tests and verify the
> UI/API before moving to the next phase. At the end of each phase,
> summarize what changed, tests run, results, known issues, and ask the
> owner a few short review questions before starting the next phase.

------------------------------------------------------------------------

## 1. Product vision

Build **ResumeOS**, a career-data workspace where a user maintains a
trustworthy master profile and generates multiple job-specific resumes
from it.

A resume is not just a document. It is a versioned output generated from
structured career data.

### Core product promise

1.  **Write once, tailor safely:** Maintain a master career profile and
    create job-specific resume versions without losing the source of
    truth.
2.  **Every change is visible:** Compare versions, inspect changes, name
    snapshots, and restore prior versions.
3.  **Quality checks are honest:** Explain concrete formatting,
    consistency, completeness, and keyword-coverage issues. Never
    promise ATS acceptance or invent a universal ATS score.
4.  **Evidence-linked experience:** Let users link claims, skills, and
    achievements to projects or evidence they provide.
5.  **Reliable exports:** Generate clean PDF and DOCX documents from
    structured content and validate the exported result.
6.  **Privacy first:** Give users control over their personal data,
    export, and account deletion.

### Target users

Initial niche: software engineers, backend developers, full-stack
developers, DevOps engineers, SREs, QA engineers, and technical leads.
Design the data model so the product can later support other
professions.

### Product principles

-   Trust over hype.
-   No fabricated claims, metrics, skills, dates, or qualifications.
-   Explain every score and recommendation.
-   Keep editing fast, predictable, and keyboard-friendly.
-   Design mobile-responsive experiences, but optimize the main editor
    for desktop.
-   Do not gate the user's ability to download their own completed
    resume behind a payment.
-   Never claim that a resume is guaranteed to pass an ATS.
-   Protect personally identifiable information and resume data.
-   Do not scrape competitor websites or copy their proprietary
    templates.
-   Use real user research and measured outcomes rather than unsupported
    "100x better" claims.

------------------------------------------------------------------------

## 2. Product differentiators

### 2.1 Career source of truth

Users create a master profile containing: - Contact details and
professional links - Summary / headline - Work experience - Projects -
Skills and proficiency/context - Education - Certifications -
Publications, awards, volunteering, and custom sections - User-provided
achievement evidence and notes - Employment dates and location/work
arrangement where applicable

Each section should have stable IDs. Resume versions should reference or
snapshot this structured data so changes can be tracked safely.

### 2.2 Git-like resume versioning

-   Master profile
-   Named resume versions
-   Branch a version for a job or target role
-   Save named snapshots
-   Compare two versions at field/section level
-   Show added, removed, and modified content
-   Restore a prior version by creating a new revision rather than
    deleting history
-   Track creation time and optional change note
-   Keep version history immutable except for retention/deletion rules
    clearly communicated to users
-   Avoid confusing Git terminology in the UI unless a user enables
    "advanced mode"

### 2.3 Evidence-linked claims

Allow users to link a resume bullet to a project, work item, portfolio
URL, or private note. Evidence is user-supplied; the app must not imply
that a link has been independently verified unless a real verification
process exists.

Examples: - Claim: "Reduced API latency by 30%" - Evidence: user-added
benchmark report or project note - Status: "Evidence attached" / "No
evidence attached" - The app must not validate the truth of a claim
merely because evidence exists.

### 2.4 Deterministic quality checks

Provide separate, explainable categories rather than one misleading "ATS
score": - **Document integrity:** file opens, text exists, links are
validly formatted, content is not clipped - **Structure:** expected
headings, section order, reading order, text extraction -
**Consistency:** date formats, overlapping dates, repeated bullets,
inconsistent role/company strings - **Completeness:** optional fields
that are missing, empty sections, absent contact links - **Job
relevance:** exact/normalized skill and keyword coverage against a
user-provided job description - **Readability:** long bullets, repeated
verbs, excessive length, unusual punctuation, inconsistent bullet
style - **Claims and evidence:** measurable claims without a linked
source, clearly presented as a reminder, not a truth judgment

Every issue must show: - Severity: info, warning, error - Explanation -
Where it was detected - Suggested fix - Whether the fix is automatic or
user-controlled - A "why this matters" explanation when appropriate

Never state "ATS compatibility: 98%" unless the methodology is defined,
tested, and accurately described. Prefer transparent counts and coverage
such as "12 of 18 job-description terms found in your resume text."

### 2.5 Job-specific tailoring

-   Paste or type a job description
-   Parse it with deterministic heuristics and allow users to edit
    extracted terms
-   Compare terms against the master profile and selected resume
-   Distinguish "present in resume," "present in profile but omitted,"
    and "not found in your supplied profile"
-   Never claim that a skill is absent from the user's real experience;
    only say it was not found in their saved profile
-   Suggest reordering/reusing existing content
-   Require user approval for every content change
-   Keep a record of the job description and resume version used for an
    application, subject to privacy controls

### 2.6 Export quality and reproducibility

-   PDF export
-   DOCX export
-   Print preview
-   Export history with timestamp, template version, and resume revision
-   Verify extracted text and expected section order after export
-   Detect overflow/clipping and page-break issues where technically
    possible
-   Use stable layout templates and font handling
-   Never say export validation passed unless an actual test was run
-   Offer a plain, single-column ATS-oriented template and more visual
    templates with clear trade-offs

------------------------------------------------------------------------

## 3. Scope and non-goals

### MVP must include

1.  Authentication and account management
2.  Master career profile CRUD
3.  Resume editor with live preview
4.  At least one excellent single-column template
5.  PDF export
6.  Resume versions and snapshots
7.  Basic deterministic quality checks
8.  Job description keyword comparison
9.  Responsive, accessible UI
10. Unit, integration, and end-to-end tests
11. Secure user-scoped API access
12. README, environment sample, and local development setup

### Post-MVP

-   DOCX export
-   More templates and theme controls
-   Richer side-by-side version comparison
-   Evidence graph visualization
-   Application tracker
-   Import from existing PDF/DOCX
-   Advanced export validation
-   Team or coach collaboration
-   Optional paid plans and billing
-   Optional AI features only after explicit product-owner approval

### Do not build in MVP

-   A microservices architecture
-   Kubernetes deployment
-   A mandatory AI integration
-   Unverified "ATS pass rate" or hiring predictions
-   Auto-application or automatic job submissions
-   Scraping job sites without permission
-   Social feeds, follower counts, or irrelevant gamification
-   A template marketplace before product-market fit
-   Payment processing before core workflow validation

------------------------------------------------------------------------

## 4. User journeys

### Journey A: New user creates a resume

1.  User lands on a clear value proposition page.
2.  User creates an account or starts a clearly scoped demo.
3.  Onboarding asks their target role and experience level only when
    useful.
4.  User creates/imports a profile manually.
5.  User fills work history, projects, skills, education, and links.
6.  User chooses a template.
7.  User edits content while seeing a live preview.
8.  User runs quality checks and sees actionable findings.
9.  User exports a PDF.
10. App shows export validation results and allows a download.

### Journey B: Tailor resume for a role

1.  User pastes a job description.
2.  App extracts candidate keywords and skills using deterministic
    parsing.
3.  User edits the extracted list.
4.  App compares terms with the master profile and current resume.
5.  User creates a named version for that role.
6.  App recommends relevant saved content that is not currently
    included.
7.  User approves/rejects every change.
8.  User runs checks, exports, and records the version for the
    application.

### Journey C: Compare and restore versions

1.  User opens Resume Versions.
2.  Selects two versions.
3.  App displays added, removed, and modified sections.
4.  User can inspect changes.
5.  User can restore an earlier state as a new version.
6.  Existing history is preserved unless the user explicitly deletes
    data under a clear retention policy.

### Journey D: Delete account

1.  User opens Settings → Privacy.
2.  App explains which profile data, resume versions, exports, and job
    descriptions will be deleted.
3.  User confirms.
4.  Server deletes user-scoped data and revokes sessions.
5.  UI shows a truthful completion result only after server success.
6.  Any legally required retention must be explained; do not silently
    retain content.

------------------------------------------------------------------------

## 5. Information architecture and routes

Use React Router. Route guards must protect private pages.

### Public routes

-   `/` --- Landing page
-   `/features` --- Product features
-   `/templates` --- Template gallery
-   `/pricing` --- Pricing, even if initially free
-   `/security` --- Privacy/security explanation
-   `/login`
-   `/register`
-   `/forgot-password`
-   `/reset-password/:token`
-   `/privacy`
-   `/terms`

### Authenticated routes

-   `/app` --- Dashboard
-   `/app/profile` --- Master profile
-   `/app/resumes` --- Resume list
-   `/app/resumes/new` --- Create resume
-   `/app/resumes/:resumeId/edit` --- Editor
-   `/app/resumes/:resumeId/versions` --- Version history
-   `/app/resumes/:resumeId/compare/:leftVersionId/:rightVersionId` ---
    Compare versions
-   `/app/jobs` --- Job descriptions and saved targets
-   `/app/jobs/new` --- Add job description
-   `/app/jobs/:jobId` --- Job match report
-   `/app/applications` --- Lightweight application tracker (post-MVP
    unless needed)
-   `/app/settings/profile`
-   `/app/settings/security`
-   `/app/settings/privacy`

Use meaningful loading, empty, error, and success states for every
route.

------------------------------------------------------------------------

## 6. UI/UX design system

### Visual direction

Build a premium, modern SaaS interface: precise typography, generous
whitespace, strong hierarchy, neutral backgrounds, one restrained accent
color, polished dark/light themes, subtle borders, and purposeful
animation.

Avoid: - Excessive gradients and glow effects - Overly dense dashboard
cards - Fake metrics or fabricated testimonials - Excessive rounded
pills everywhere - Decorative charts with no decision value -
Low-contrast gray text - Modal dialogs for every minor action - UI that
resembles a generic admin template

### Global layout

-   Public site: top navigation, clear headline, product demonstration,
    feature proof, pricing, FAQ, footer.
-   Authenticated app: compact left sidebar, top command/search area,
    content workspace.
-   Resume editor: three-column layout on wide screens:
    -   Left: section navigator and content controls
    -   Center: structured form/editor
    -   Right: live resume preview
-   On smaller screens: editor and preview become tabs or a toggle; no
    horizontal overflow.
-   Autosave state must be visible: "Saving...", "Saved", or "Couldn't
    save --- Retry".
-   Warn users before navigating away only when unsaved changes exist.

### Accessibility requirements

-   Semantic HTML and correct labels
-   Keyboard navigation and visible focus states
-   No color-only meaning
-   Accessible dialog focus handling
-   Reduced-motion support
-   Sufficient color contrast
-   Screen-reader announcements for save/export status
-   Buttons with explicit accessible names
-   Inputs with useful validation messages
-   Never make drag-and-drop the only way to reorder sections

### Required design states

For every major screen, implement: - Initial loading - Empty state with
a useful next action - Normal state - Validation error - Network/server
error - Permission/access denied - Success confirmation - Narrow/mobile
layout - Keyboard/focus behavior

------------------------------------------------------------------------

## 7. UI screen specifications

### 7.1 Landing page

Sections: 1. Hero with a concise value proposition and real product
preview 2. Interactive or static example of resume version comparison 3.
Master profile → tailored versions → validated export workflow 4.
Quality checks with example findings 5. Template previews 6.
Privacy/security principles 7. Pricing or free-plan explanation 8. FAQ
9. Footer with terms, privacy, contact, and status links

Rules: - Do not use fabricated customer logos, user counts, reviews, or
hiring outcomes. - Use sample/demo data clearly labeled as sample. -
CTA: "Build your resume" and secondary "Explore the demo." - Keep page
performance high and images optimized.

### 7.2 Dashboard

Display: - Welcome header - Continue editing card - Master profile
completion checklist, with clearly defined completion rules - Recent
resumes and last modified times - Recent exports - Recent job targets -
Quick actions: New resume, Add experience, Compare versions - Helpful
empty state for first-time users

Do not invent success rates, application statistics, or hiring
probability.

### 7.3 Master profile

Sections: - Contact details - Headline and summary - Experience -
Projects - Skills - Education - Certifications - Additional sections

Behavior: - Add/edit/delete with confirmation where destructive - Stable
IDs for all records - Reorder sections and entries - Inline validation -
Draft changes and explicit save/autosave behavior - Warn when changing
master data will affect derived resumes; never silently overwrite
customized content - Allow user to decide whether a master change is
propagated into each version

### 7.4 Resume editor

Layout: - Left section navigation - Main content form - Live preview -
Toolbar for undo/redo where supported, save state, version name,
template, preview, export - Keyboard shortcuts with discoverable help -
Drag-and-drop reordering plus accessible move-up/down controls -
Autosave with debouncing and retry handling - Undo/redo for editor
changes where feasible - Section visibility toggles - Optional
per-resume content overrides

Editor requirements: - Avoid one giant unstructured textarea for all
content. - Support bullets with predictable formatting. - Show
character/line length hints as advisory, not universal rules. - Keep
preview synchronized with saved editor state. - Preserve Unicode,
accented names, symbols, and international date formats. - Never
silently trim or rewrite user text. - Warn about potentially overflowing
content before export.

### 7.5 Template gallery

Each template card shows: - Real preview - Template name and style -
One-column or multi-column layout - Best-use context and known
trade-offs - Accessibility and parsing notes based on testing - "Preview
with my data" - "Use template"

MVP: one excellent single-column template plus one visually distinct
template only if the first is stable. Do not sacrifice export quality
for quantity.

### 7.6 Quality report

Group findings: - Errors that can break the document - Warnings about
structure or consistency - Job-description coverage - Suggestions for
human review

Each finding must include: - Severity - Exact affected section/text -
Explanation - Suggested action - "Fix" action only when a deterministic,
reversible fix is possible - Dismiss/ignore option with rationale where
appropriate

Do not overstate the reliability of ATS parsing. Show the checks that
were actually performed.

### 7.7 Job-description comparison

-   Paste job description
-   Parse common terms, technical skills, role phrases, and repeated
    words using a documented deterministic method
-   Let user edit/remove extracted terms
-   Show exact matches and normalized matches separately
-   Highlight relevant content already in the master profile but omitted
    from this resume
-   Show "not found in your saved profile" for absent terms
-   Do not recommend adding skills without user confirmation
-   Avoid misleading keyword stuffing advice
-   Save the job description only with user consent

### 7.8 Version history

-   Timeline/list of named versions
-   Role/job label
-   Created date
-   Change note
-   Source resume/version
-   Exported status
-   Compare action
-   Restore action that creates a new revision
-   Delete action with clear warning if supported

### 7.9 Version comparison

Compare at section and field level: - Added content - Removed content -
Modified content - Reordered content - Template changes separately from
content changes

Use clear diff colors plus text labels/icons; do not rely on color
alone. Allow side-by-side and unified diff views.

### 7.10 Export flow

-   Choose PDF or DOCX when supported
-   Choose page size (A4 and Letter)
-   Show template and version being exported
-   Render a preview
-   Generate document on the server or through a reliable controlled
    process
-   Validate output where possible
-   Report warnings honestly
-   Download file
-   Record export metadata
-   Never log full resume content or file contents

### 7.11 Settings and privacy

-   Profile settings
-   Password and sessions
-   Export personal data
-   Delete account
-   Theme preferences
-   Notification preferences
-   Data retention explanation
-   Consent controls for any future analytics or integrations

------------------------------------------------------------------------

## 8. Frontend stack and conventions

Use: - React with JavaScript (no TypeScript) - Vite - Tailwind CSS -
React Router - TanStack Query or a consistent equivalent for server
state - React Hook Form only if it reduces form complexity - Zod or
another runtime validator if helpful; JavaScript remains the language -
A lightweight state manager only if component state/context becomes
insufficient - Lucide React icons - A toast system with accessible
announcements - A small, consistent component library built in the repo

Conventions: - Functional components and hooks - Keep components focused
and reusable - Separate API clients from UI - Centralize route
definitions and auth handling - Centralize theme tokens - Avoid huge
monolithic components - Avoid unnecessary dependencies - No hard-coded
API URLs in components - No secrets in the frontend - Do not store
access tokens in localStorage if an HttpOnly cookie session can be used
safely - Never use `dangerouslySetInnerHTML` for untrusted resume/job
text - Escape user-supplied content and sanitize rich text if rich text
is introduced

Suggested structure:

``` text
client/
  src/
    app/
      App.jsx
      router.jsx
      providers.jsx
    api/
      client.js
      auth.api.js
      profile.api.js
      resumes.api.js
      jobs.api.js
      exports.api.js
    components/
      ui/
      layout/
      forms/
      editor/
      preview/
      versioning/
      quality/
    features/
      auth/
      dashboard/
      profile/
      resumes/
      jobs/
      settings/
    hooks/
    lib/
      validators.js
      formatters.js
      diff.js
    styles/
      index.css
    main.jsx
```

------------------------------------------------------------------------

## 9. Backend stack and conventions

Use: - Node.js LTS - Express.js - MongoDB with Mongoose - Cookie-based
auth where practical - Server-side input validation - Central error
middleware - Structured logging with request IDs - Rate limiting -
Security headers - CORS allowlist - API version prefix, such as
`/api/v1`

Conventions: - Controllers should stay thin - Business rules belong in
services - Data access belongs in models/repositories as appropriate -
Validate every request at the boundary - Never trust user IDs supplied
in request bodies for authorization - Derive user identity from the
authenticated session - Scope every query to the authenticated user or
an explicitly authorized resource - Use consistent errors with safe
public messages - Do not expose stack traces in production - Avoid
logging personal resume content, tokens, passwords, or reset links -
Implement graceful shutdown and health endpoints

Suggested structure:

``` text
server/
  src/
    app.js
    server.js
    config/
      env.js
      database.js
    middleware/
      authenticate.js
      validate.js
      rateLimit.js
      requestId.js
      errorHandler.js
    modules/
      auth/
      users/
      profiles/
      resumes/
      versions/
      jobs/
      quality/
      exports/
    services/
    utils/
    tests/
```

------------------------------------------------------------------------

## 10. MongoDB data model

Use Mongoose schemas with timestamps, validation, indexes, and explicit
ownership.

### User

-   `_id`
-   `email` (normalized, unique)
-   `passwordHash` (never store plaintext)
-   `displayName`
-   `emailVerifiedAt` (optional)
-   `createdAt`, `updatedAt`
-   `lastLoginAt`
-   `accountStatus`
-   `preferences` (theme, locale, page size)
-   `sessionVersion` or equivalent revocation mechanism

### CareerProfile

-   `_id`
-   `userId`
-   `schemaVersion`
-   `contact`: name, email, phone (optional), location (optional),
    website, LinkedIn, GitHub, portfolio
-   `headline`
-   `summary`
-   `experience[]`: stable `id`, company, title, location, employment
    type, start date, end date/current flag, bullets\[\], order
-   `projects[]`: stable `id`, name, description, URL, repository URL,
    technologies\[\], dates (optional), bullets\[\]
-   `skills[]`: stable `id`, name, category, context/proficiency
    (optional), evidenceRefs\[\]
-   `education[]`
-   `certifications[]`
-   `customSections[]`
-   `evidenceItems[]`: stable ID, title, type, URL or private note,
    related record IDs, user-provided verification status only
-   `createdAt`, `updatedAt`

### Resume

-   `_id`
-   `userId`
-   `title`
-   `targetRole`
-   `jobId` (optional)
-   `sourceProfileId`
-   `currentVersionId`
-   `createdAt`, `updatedAt`
-   `archivedAt` (optional)

### ResumeVersion

-   `_id`
-   `userId`
-   `resumeId`
-   `parentVersionId` (optional)
-   `versionNumber`
-   `name`
-   `changeNote`
-   `templateId`
-   `templateVersion`
-   `contentSnapshot` or normalized content representation
-   `overrides` (optional)
-   `createdAt`
-   `createdBy`
-   `sourceJobDescriptionId` (optional)
-   `contentHash` (optional)

Treat saved versions as immutable snapshots. Editing should create a new
version or an explicit draft revision. Define retention limits and
deletion behavior to avoid unlimited unbounded document growth.

### JobDescription

-   `_id`
-   `userId`
-   `title`
-   `company` (optional)
-   `descriptionText`
-   `extractedTerms[]`
-   `userEditedTerms[]` (optional)
-   `createdAt`, `updatedAt`

### ExportRecord

-   `_id`
-   `userId`
-   `resumeId`
-   `resumeVersionId`
-   `format`
-   `templateId`
-   `templateVersion`
-   `pageSize`
-   `validationSummary`
-   `createdAt`
-   `fileStorageKey` (only if temporary/persistent storage is actually
    implemented)
-   `expiresAt` (optional)

### ApplicationRecord (post-MVP)

-   `_id`
-   `userId`
-   `jobDescriptionId`
-   `resumeVersionId`
-   `status`
-   `appliedAt`
-   `notes`
-   `nextFollowUpAt` (optional)
-   `createdAt`, `updatedAt`

### Data modeling requirements

-   Add compound indexes for user-owned resources,
    e.g. `{ userId: 1, updatedAt: -1 }`.
-   Add unique indexes where appropriate, including normalized user
    email.
-   Avoid giant unbounded embedded arrays; choose embedded vs referenced
    collections deliberately.
-   Use optimistic concurrency or revision checks for autosave
    collisions.
-   Use MongoDB transactions only when the deployment supports them and
    the operation genuinely needs atomic multi-document changes.
-   Store date-only employment values consistently; avoid timezone
    shifting for month/year values.
-   Validate URLs and normalize skill strings without destroying the
    user's original display text.
-   Add schema migration/version strategy from the start.

------------------------------------------------------------------------

## 11. API design

All endpoints use `/api/v1`. Return JSON and consistent errors. Add
pagination to collection endpoints.

### Auth

-   `POST /auth/register`
-   `POST /auth/login`
-   `POST /auth/logout`
-   `POST /auth/refresh` only if using refresh-token architecture
-   `GET /auth/me`
-   `POST /auth/forgot-password`
-   `POST /auth/reset-password`
-   `POST /auth/verify-email` when email verification is implemented

### Profile

-   `GET /profile`
-   `PUT /profile`
-   `PATCH /profile`
-   `POST /profile/experience`
-   `PATCH /profile/experience/:entryId`
-   `DELETE /profile/experience/:entryId`
-   Equivalent endpoints for projects, skills, education, certifications
    and custom sections as appropriate
-   `POST /profile/export`
-   `DELETE /profile` only with explicit confirmation and defined
    deletion semantics

### Resumes

-   `GET /resumes`
-   `POST /resumes`
-   `GET /resumes/:resumeId`
-   `PATCH /resumes/:resumeId`
-   `DELETE /resumes/:resumeId`
-   `POST /resumes/:resumeId/duplicate`
-   `POST /resumes/:resumeId/versions`
-   `GET /resumes/:resumeId/versions`
-   `GET /resumes/:resumeId/versions/:versionId`
-   `POST /resumes/:resumeId/versions/:versionId/restore`
-   `GET /resumes/:resumeId/compare?left=...&right=...`
-   `POST /resumes/:resumeId/quality-check`
-   `POST /resumes/:resumeId/export`

### Job descriptions and matching

-   `GET /jobs`
-   `POST /jobs`
-   `GET /jobs/:jobId`
-   `PATCH /jobs/:jobId`
-   `DELETE /jobs/:jobId`
-   `POST /jobs/:jobId/extract-terms`
-   `POST /jobs/:jobId/match-resume` with selected resume/version IDs

### Exports

-   `GET /exports`
-   `GET /exports/:exportId`
-   `GET /exports/:exportId/download` only after ownership and expiry
    checks
-   `DELETE /exports/:exportId`

### System

-   `GET /health/live`
-   `GET /health/ready`
-   `GET /api/v1/meta` for supported features/template versions if
    useful

API rules: - Validate path IDs and payloads. - Enforce ownership on
every operation. - Use idempotency keys for export creation if retries
could duplicate expensive work. - Use request size limits, especially
for pasted job descriptions and imported documents. - Do not return
password hashes, session secrets, private storage keys, or internal
stack traces. - Define stable pagination and sorting contracts. - Return
`409 Conflict` for stale revision writes and explain how to
reload/merge.

------------------------------------------------------------------------

## 12. Security and privacy requirements

This application stores career and contact information. Treat it as
sensitive.

-   Use Argon2id or bcrypt with appropriate cost settings for password
    hashing.
-   Prefer secure, HttpOnly, SameSite cookies over exposing long-lived
    tokens to JavaScript.
-   If cookie auth is used, implement CSRF protection where required.
-   Enforce HTTPS in production.
-   Configure CORS with explicit trusted origins; never use wildcard
    credentials.
-   Add Helmet or equivalent security headers.
-   Rate-limit login, password reset, registration, export, and
    expensive endpoints.
-   Use generic login/reset responses to reduce account enumeration.
-   Validate and normalize inputs.
-   Sanitize rendered user content; avoid HTML injection.
-   Prevent NoSQL injection by validating object shapes and rejecting
    unexpected operators.
-   Ensure all resource access checks are ownership-scoped.
-   Use secure, expiring password-reset tokens stored hashed.
-   Rotate/revoke sessions after password changes and logout.
-   Do not store secrets in source control.
-   Keep `.env` files out of Git; provide `.env.example` with
    placeholders only.
-   Avoid storing exported files permanently unless necessary; if
    stored, use private storage and short-lived download authorization.
-   Do not log resume text, passwords, cookies, tokens, or sensitive job
    data.
-   Provide export and account deletion flows.
-   Document backup, retention, and deletion policies.
-   Add dependency and vulnerability checks.
-   Keep analytics privacy-conscious and disclose what is collected.

------------------------------------------------------------------------

## 13. Resume rendering and file export

### PDF

Choose a rendering approach only after a proof of concept: - HTML/CSS
rendered through a controlled headless browser, or - A dedicated PDF
layout library.

Test font availability, page breaks, links, margins, Unicode, line
wrapping, and clipping.

### DOCX

Use a library that supports structured paragraphs, headings, lists,
links, styles, page settings, and tables only where appropriate. Test
the resulting document by reopening it with a parser and inspecting
extracted text. Avoid complex layouts that are likely to parse poorly.

### Export acceptance checks

-   File exists and is non-empty.
-   Correct MIME type and extension.
-   Can be opened by a parser.
-   Contains expected user text.
-   Section order is correct.
-   No placeholder text remains.
-   No accidental duplicate sections.
-   Links are preserved where supported.
-   No known clipping or overflow in the tested template.
-   Export corresponds to the intended resume version.
-   Export record stores exact version/template metadata.

Create visual regression tests for template output. Use sample data that
includes long company names, long bullets, Unicode names, missing
optional fields, many skills, multiple pages, and edge-case dates.

------------------------------------------------------------------------

## 14. Quality-check engine

Keep it deterministic, testable, and explainable. Each check should be a
pure function where possible.

Suggested check identifiers: - `EMPTY_REQUIRED_SECTION` -
`INVALID_OR_MISSING_CONTACT_LINK` - `DATE_ORDER_INVALID` -
`DATE_OVERLAP_REVIEW` - `INCONSISTENT_DATE_FORMAT` -
`DUPLICATE_BULLET` - `VERY_LONG_BULLET` - `EMPTY_BULLET` -
`REPEATED_PHRASE` - `MISSING_SECTION_HEADING` - `EXPORTED_TEXT_EMPTY` -
`EXPORT_TEXT_ORDER_WARNING` - `POSSIBLE_CONTENT_OVERFLOW` -
`JOB_TERM_FOUND` - `JOB_TERM_MISSING_FROM_RESUME` -
`JOB_TERM_IN_PROFILE_NOT_RESUME` - `CLAIM_WITHOUT_LINKED_EVIDENCE` -
`LINK_FORMAT_INVALID`

For every rule: - Include unit tests for positive and negative cases. -
Document false-positive limitations. - Do not automatically change user
content without approval. - Allow dismissing a warning without changing
the document. - Keep scoring categories separate and explain the
methodology.

### Job-description matching

Use: - Lowercasing and Unicode normalization - Tokenization -
Configurable phrase matching - Carefully normalized variants where
justified (e.g. `Node.js` and `NodeJS`) - A dictionary of known synonyms
that is explicit and editable - Exact-match and normalized-match
reporting separately

Do not use a simplistic word count as a hiring-probability prediction.
Do not recommend keyword stuffing.

------------------------------------------------------------------------

## 15. Testing strategy

### Frontend unit tests

-   Validation functions
-   Date formatting
-   Version diff logic
-   Keyword normalization
-   Quality-rule logic
-   Form serialization
-   Resume preview rendering

### Backend unit tests

-   Auth services
-   Ownership authorization
-   Version snapshot creation
-   Restore creates a new version
-   Quality engine
-   Job-term extraction
-   Export metadata
-   Input validation

### Integration tests

-   Register/login/logout
-   Create/read/update/delete profile entries
-   Create resume and versions
-   Compare and restore versions
-   Run quality check
-   Save job description and compare terms
-   Export PDF and verify content
-   Reject cross-user access
-   Handle stale revision conflicts
-   Delete account and verify data deletion

### End-to-end tests

Use Playwright or equivalent: 1. Register a test user. 2. Create a
career profile. 3. Create a resume. 4. Edit and reorder sections. 5.
Save a named version. 6. Create a job-specific branch/version. 7.
Compare versions. 8. Run checks. 9. Export PDF. 10. Verify the download
and extracted text. 11. Test mobile viewport and keyboard navigation.
12. Log out and confirm private routes are protected.

### Required negative tests

-   Invalid input
-   Expired/reset token reuse
-   Unauthorized access to another user's resume
-   Oversized job description
-   Unsupported export format
-   Broken export process
-   Duplicate submission/retry
-   Stale autosave
-   Empty profile
-   Missing optional fields
-   Long content overflow
-   Malicious text payload
-   Database unavailable
-   File export timeout

Do not claim tests passed unless the command was actually run and the
result inspected.

------------------------------------------------------------------------

## 16. Performance and reliability

-   Lazy-load large routes and heavy editor code.
-   Debounce autosave and handle retries safely.
-   Use revision numbers/ETags to prevent silent overwrites.
-   Paginate resumes, versions, and exports.
-   Add indexes based on actual query patterns.
-   Cache only where invalidation is understood.
-   Keep resume rendering deterministic.
-   Add request IDs and structured logs.
-   Track latency and error rates without logging private content.
-   Add timeouts and clear errors for export generation.
-   Clean up temporary files and expired exports.
-   Make background jobs optional until export load warrants them.
-   Avoid adding Redis, queues, or microservices before measured need.

------------------------------------------------------------------------

## 17. Suggested repository layout

``` text
resumeos/
  client/
    src/
      app/
      api/
      components/
      features/
      hooks/
      lib/
      styles/
      main.jsx
    public/
    tests/
    package.json
    vite.config.js
  server/
    src/
      config/
      middleware/
      modules/
      services/
      utils/
      app.js
      server.js
    tests/
    package.json
  docs/
    product-requirements.md
    architecture.md
    api.md
    security.md
    test-plan.md
  .env.example
  .gitignore
  package.json
  README.md
  AGENT.md
```

Use consistent naming and keep the repository simple. Do not generate
every module at once; create each module as its phase begins.

------------------------------------------------------------------------

## 18. Environment variables

Provide `.env.example` with placeholders such as:

``` dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/resumeos
CLIENT_ORIGIN=http://localhost:5173
SESSION_SECRET=replace-with-a-long-random-secret
COOKIE_NAME=resumeos_session
APP_BASE_URL=http://localhost:5173
EXPORT_TEMP_DIR=./tmp/exports
```

Requirements: - Validate environment variables at startup. - Never use
placeholder secrets in production. - Keep local `.env` ignored by Git. -
Document how to generate secure secrets. - If the chosen session
architecture needs additional variables, document them. - Do not expose
backend secrets through Vite `VITE_` variables.

------------------------------------------------------------------------

## 19. Local development and delivery

Document: 1. Required Node.js LTS and MongoDB versions. 2. How to
install dependencies. 3. How to configure environment variables. 4. How
to start MongoDB locally or via Docker Compose. 5. How to start client
and server. 6. How to run unit/integration/E2E tests. 7. How to run lint
and formatting checks. 8. How to create a production build. 9. How to
troubleshoot common issues. 10. How to seed clearly labeled demo data.
11. How to reset local development data safely.

Include root scripts where useful: - `npm run dev` - `npm run build` -
`npm run lint` - `npm test` - `npm run test:e2e`

Choose scripts that actually exist; do not document commands that have
not been configured.

------------------------------------------------------------------------

## 20. Phase-by-phase implementation plan

**Do not skip ahead. Complete each phase, run its checks, summarize
results, and wait for product-owner approval before proceeding.**

### Phase 0 --- Discovery and project setup

-   Inspect the repository before changing files.
-   Identify existing code, package manager, conventions, and current
    test status.
-   Write a concise product requirements document.
-   Confirm MVP and non-goals.
-   Scaffold React/Vite/Tailwind and Express/Mongoose.
-   Configure linting, formatting, environment validation, and test
    frameworks.
-   Create health endpoint and minimal client/server connectivity.
-   Add README and `.env.example`.

**Exit criteria:** Both apps start locally; health check works; a basic
smoke test passes; setup documentation is verified.

**Ask owner:** Does the repo run on their machine? Is the proposed MVP
scope approved?

### Phase 1 --- Design system and public site

-   Build typography, spacing, colors, buttons, inputs, dialogs, cards,
    navigation, toasts, and responsive layouts.
-   Build landing page and template gallery using clearly labeled sample
    data.
-   Add empty/loading/error states and accessibility basics.
-   Review at desktop, tablet, and mobile widths.

**Exit criteria:** No horizontal overflow at supported widths; keyboard
focus is visible; core controls have accessible names; production build
succeeds.

**Ask owner:** Does the visual direction feel premium and distinct? What
should change before app screens?

### Phase 2 --- Authentication and account security

-   Implement registration, login, logout, session handling, password
    hashing, and protected routes.
-   Add rate limits and validation.
-   Add generic password reset flow only when a real delivery mechanism
    is configured; otherwise clearly mark it as unimplemented.
-   Add tests for invalid credentials and cross-user access.

**Exit criteria:** Auth flows work; protected routes are guarded on
client and server; secrets are never returned; auth tests pass.

**Ask owner:** Is the account flow acceptable? Confirm privacy and
session expectations.

### Phase 3 --- Master career profile

-   Build structured CRUD for profile sections.
-   Add stable record IDs, validation, ordering, and autosave/retry
    behavior.
-   Add empty states and progress checklist.
-   Ensure users can edit/delete data and export it.
-   Protect against lost updates.

**Exit criteria:** All core profile sections can be created, edited,
reordered and deleted; integration tests pass; stale writes are handled
safely.

**Ask owner:** Are the profile fields sufficient for the target
developer audience?

### Phase 4 --- Resume creation and editor

-   Create resume from master profile.
-   Build structured editor with live preview.
-   Add section visibility and reordering.
-   Support per-version overrides without silently mutating the master
    profile.
-   Add one-column template and print preview.
-   Add keyboard and responsive behavior.

**Exit criteria:** Editing changes preview correctly; saved data
survives refresh; no silent content loss; editor tests pass.

**Ask owner:** Is the editing workflow fast and clear enough?

### Phase 5 --- PDF export and validation

-   Prototype and choose the rendering engine.
-   Build export flow, page-size selection, temporary file handling, and
    download.
-   Reopen/parse generated PDF and verify expected text.
-   Add visual regression fixtures and long-content tests.
-   Record version/template metadata.

**Exit criteria:** Exported PDF opens, has expected content and
ordering, handles edge-case data, and known layout limitations are
documented.

**Ask owner:** Does the downloaded document meet quality expectations?
Approve before adding more templates.

### Phase 6 --- Version control and diff

-   Add immutable snapshots, named versions, change notes, parent
    references, and restore-as-new-version.
-   Implement section-level and field-level diff.
-   Add optimistic concurrency handling.
-   Build version timeline and compare UI.

**Exit criteria:** Users can create, compare and restore versions
without losing history; diff tests pass.

**Ask owner:** Is the version model understandable? Is the diff useful?

### Phase 7 --- Quality engine

-   Implement deterministic rules as isolated functions.
-   Add clear severity, explanations, locations, and fix suggestions.
-   Create the quality report UI.
-   Make auto-fixes reversible and user-approved.
-   Document false positives and limitations.

**Exit criteria:** Each rule has unit tests; results are reproducible;
no unsupported ATS guarantee or misleading composite score exists.

**Ask owner:** Are warnings accurate and actionable rather than noisy?

### Phase 8 --- Job description comparison

-   Add job-description storage with user consent.
-   Extract terms using documented deterministic logic.
-   Allow users to edit extracted terms.
-   Compare terms with selected resume and master profile.
-   Show exact/normalized matches separately.
-   Create a job-specific resume version from selected content.

**Exit criteria:** Matching results are explainable, user-editable, and
never add unconfirmed skills or claims.

**Ask owner:** Does this help tailor a resume without encouraging
keyword stuffing?

### Phase 9 --- DOCX, additional templates, and application tracker

-   Add DOCX export and validate text.
-   Add a second template only after the first template is stable.
-   Add application status tracking and reminders if validated by user
    demand.
-   Keep features modular and tested.

**Exit criteria:** Every added export/template has regression tests; no
existing output quality regresses.

**Ask owner:** Which post-MVP feature offers the most value?

### Phase 10 --- Security, accessibility, and release readiness

-   Review authorization and input validation.
-   Run dependency audit and security checks.
-   Test deletion/export of personal data.
-   Test keyboard navigation, screen-reader labels, contrast, and
    reduced motion.
-   Run full test suite and production build.
-   Add production deployment documentation, monitoring, backups, and
    rollback guidance.
-   Conduct a small user test with target developers.

**Exit criteria:** Critical/high issues are resolved or explicitly
accepted; build and tests are verified; privacy/security documentation
is complete; known limitations are disclosed.

**Ask owner:** Approve release candidate and list remaining blockers.

### Phase 11 --- User validation and monetization

-   Interview target users.
-   Measure profile completion, first export success, quality-check
    usage, repeat editing, and version creation.
-   Test pricing only after users consistently receive value.
-   Add billing only after pricing and product scope are approved.
-   Prioritize roadmap using evidence rather than feature count.

**Exit criteria:** Document actual findings and decisions; do not invent
product-market fit or revenue metrics.

------------------------------------------------------------------------

## 21. Definition of done for every feature

A feature is not done merely because it looks correct.

Every feature must have: - A documented requirement - A clear user
journey - Loading, empty, success, and error states - Client-side
usability validation - Server-side validation where applicable -
Authorization checks - Unit tests for business logic - Integration tests
for API/database behavior - E2E coverage for critical user journeys -
Keyboard/accessibility review - Responsive layout review - Security and
privacy review where relevant - Updated documentation - Actual test
output inspected - Known limitations documented

Do not proceed to the next phase if a critical acceptance criterion is
failing. If blocked, explain the blocker and propose the smallest safe
fix.

------------------------------------------------------------------------

## 22. Agent operating instructions

When working on this repository:

1.  **Inspect first.** Read the current files and package scripts before
    editing. Do not overwrite existing work blindly.
2.  **Plan briefly.** State the files and behavior to change for the
    current phase.
3.  **Work only on the active phase.** Do not scaffold the whole product
    in one giant unreviewable change.
4.  **Use JavaScript.** Do not introduce TypeScript unless the owner
    explicitly changes the stack.
5.  **Use Tailwind consistently.** Avoid scattered inline styles unless
    dynamic styles genuinely require them.
6.  **Keep React components maintainable.** Extract shared UI and
    business logic appropriately.
7.  **Keep Express controllers thin.** Put domain rules in services and
    validate requests at boundaries.
8.  **Enforce authorization server-side.** Never rely on hidden UI
    buttons for access control.
9.  **Preserve user data.** Avoid destructive schema changes and provide
    migrations where necessary.
10. **No fake functionality.** Do not show buttons that do nothing, fake
    progress, fabricated statistics, or mock success in production
    flows.
11. **No fake tests.** Run the relevant commands and report exact
    results. If a test cannot run, state why.
12. **No unsupported claims.** Do not say "ATS-proof," "guaranteed
    interview," or "100x better" as established facts.
13. **No secret leakage.** Do not commit secrets or log sensitive resume
    content.
14. **Keep dependencies justified.** Explain why a new dependency is
    needed and prefer maintained libraries.
15. **Use real sample data.** Clearly label demo content; do not imply
    it belongs to a real customer.
16. **Ask before expanding scope.** Authentication providers, billing,
    AI, external integrations, and major architecture changes require
    approval.
17. **End each phase with a report** using the format below, then ask
    2--4 focused questions before continuing.

### Required phase report

``` text
Phase:
Implemented:
Files changed:
Tests/commands run:
Results:
Manual UI verification:
Security/accessibility notes:
Known issues:
Next phase proposal:
Questions for owner:
```

------------------------------------------------------------------------

## 23. First task for the coding agent

Start with **Phase 0 only**.

-   Inspect the repository and identify what already exists.
-   Do not delete or replace existing files without understanding them.
-   Confirm Node.js and package-manager versions.
-   Create a concise implementation plan and project requirements.
-   Scaffold only the minimal client/server foundation that is missing.
-   Verify client startup, server startup, database connection handling,
    and health endpoint.
-   Add a real test for the health endpoint and a documented smoke-test
    procedure.
-   Update README and `.env.example`.
-   Run the actual build, lint, and test commands that exist.
-   Report results honestly.
-   Ask the product owner for review before beginning Phase 1.

**Final product standard:** ResumeOS should feel fast, coherent,
trustworthy, accessible, and production-minded. Its advantage must come
from execution quality, user trust, and a genuinely better career-data
workflow---not simply a larger list of features.
