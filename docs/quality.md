# Quality checks

Deterministic rules in `shared/src/quality/`. The editor runs them live on the draft; the
server runs the same code at `POST /api/v1/resumes/:id/quality-check`.

## Principles

- **What prints is what's checked.** Hidden sections and entries are skipped.
- **No composite score.** Results are counts by severity and category, plus the full list of
  rules that ran. Passing every check says nothing about how a particular applicant tracking
  system will parse the resume, and the UI says so.
- **Every finding explains itself:** severity, category, exact location, excerpt, what was
  found, why it matters and a suggested action.
- **Fixes are opt-in and reversible.** A fix is offered only when it's deterministic: removing
  an empty or duplicate bullet, tidying spacing, clearing an end date on a current role, or
  matching the majority bullet punctuation. It runs only when clicked, through the editor's
  history, so Undo reverses it. Nothing rewrites wording.
- **Dismissals** are stored per resume (`qualityDismissals`, at most 500) with an optional
  reason. A finding's key combines the rule, its location ids and the flagged text, so a dismissed
  finding comes back if that text changes.
- Severity: **error** means the document is broken or self-contradictory, **warning** is likely
  worth fixing, and **info** is a suggestion for your judgement. Several rules report a lower
  severity for milder cases.

## Rules

| Rule                              | Category            | Default severity | Checks                                                                                              | Known limitations / false positives                                                                               |
| --------------------------------- | ------------------- | ---------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `EMPTY_REQUIRED_SECTION`          | Completeness        | error            | The header has a name.                                                                              | Only checks that the name field isn’t blank.                                                                      |
| `INVALID_OR_MISSING_CONTACT_LINK` | Completeness        | warning          | The header includes an email address or at least one link.                                          | Doesn't verify that the address or link actually works.                                                           |
| `LINK_FORMAT_INVALID`             | Document integrity  | warning          | Links are full web addresses with a domain.                                                         | Checks the format only; it never visits the link.                                                                 |
| `DATE_ORDER_INVALID`              | Consistency         | error            | End dates come after start dates; start dates aren’t in the future; current roles have no end date. | Year-only dates are compared at year precision.                                                                   |
| `MISSING_DATE`                    | Completeness        | warning          | Every visible role has a start date.                                                                | Only checks roles in Experience.                                                                                  |
| `DATE_OVERLAP_REVIEW`             | Consistency         | info             | Flags roles whose dates overlap by more than a month.                                               | Can't know whether overlapping roles were part-time or concurrent by design. Dismiss if it's accurate.            |
| `INCONSISTENT_DATE_FORMAT`        | Consistency         | info             | Dates are either all month-and-year or all year-only.                                               | Considers start and end dates of visible entries with dates.                                                      |
| `INCONSISTENT_ROLE_STRING`        | Consistency         | info             | A company or institution is spelled the same way everywhere.                                        | Only catches differences in case, spacing and punctuation.                                                        |
| `EMPTY_BULLET`                    | Readability         | info             | No bullet is blank.                                                                                 | None known.                                                                                                       |
| `DUPLICATE_BULLET`                | Readability         | warning          | No bullet appears twice, ignoring case and punctuation.                                             | Near-duplicates with different wording are not detected.                                                          |
| `VERY_LONG_BULLET`                | Readability         | warning          | Bullets are under 40 words and 300 characters.                                                      | A length threshold, not a judgment of quality. Some dense technical bullets are fine.                             |
| `REPEATED_PHRASE`                 | Readability         | info             | No single word starts four or more bullets.                                                         | Looks only at the first word; varied phrasing after it is not considered.                                         |
| `INCONSISTENT_BULLET_STYLE`       | Readability         | info             | Bullets either all end with a full stop or none do.                                                 | Only looks at the final character of each bullet.                                                                 |
| `UNUSUAL_PUNCTUATION`             | Readability         | info             | No double spaces, leading or trailing spaces, or repeated punctuation like "!!" in bullets.         | Doesn't check spelling or grammar.                                                                                |
| `MISSING_SECTION_HEADING`         | Structure           | warning          | Custom sections that have entries also have a title.                                                | Applies to custom sections; built-in sections always have headings.                                               |
| `POSSIBLE_CONTENT_OVERFLOW`       | Document integrity  | info             | No word or address longer than 60 characters.                                                       | Export checks measure actual overflow; this is an early warning.                                                  |
| `EXCESSIVE_LENGTH`                | Structure           | info             | Visible text stays under about 1100 words (roughly two pages).                                      | Word count only. Senior or academic roles can justify more; the export reports the exact page count.              |
| `CLAIM_WITHOUT_LINKED_EVIDENCE`   | Claims and evidence | info             | Bullets with numbers, percentages or amounts have evidence linked from your profile.                | Any number of two or more digits counts, so years and team sizes are flagged too. Dismiss where it doesn’t apply. |

Export-time checks (text extraction, section order, link preservation and measured overflow) run on
the generated PDF; see `docs/export.md`. Job-description coverage arrives in the next phase.
