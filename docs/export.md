# PDF export

## Rendering engine: headless Chrome

Two options were considered:

| Option                                   | For                                                                                                                                                 | Against                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **HTML/CSS in headless Chrome** (chosen) | Same renderer as the live preview, so they can't drift apart; real text; complex scripts and Unicode handled by Chrome's shaping; tagged PDF output | Needs a Chrome/Chromium binary on the server; heavier per render                              |
| PDF layout library (PDFKit and similar)  | Light, no browser                                                                                                                                   | A second implementation of every template; manual line breaking, pagination and font fallback |

The proof of concept rendered the edge-case fixtures (`server/tests/fixtures/resumes.js`)
correctly: Unicode names (Vietnamese, Chinese, Scandinavian), long unbroken URLs, a
company name over 100 characters, 60 skills, and a nine-role resume running to several pages.

**Setup:** the server uses `playwright-core` with an installed Chrome; it downloads no browser.
It auto-detects common install paths, or you can set `CHROME_PATH`. Without Chrome, exports
return `503 EXPORT_UNAVAILABLE`, and everything else keeps working.

## Isolation

- Each render uses a fresh browser context with JavaScript disabled and the network blocked;
  only `data:` URLs load.
- Template fonts (Source Serif 4: Latin, Latin Extended, Vietnamese) are embedded as data URIs,
  so output doesn't depend on the server's installed fonts.
- At most 2 renders run concurrently; each has a timeout (`EXPORT_TIMEOUT_MS`, default 20s,
  returning `504 EXPORT_TIMEOUT`).
- Exports are rate-limited to 20 per 5 minutes.

## What is checked after every export

The generated file is reopened with pdf.js (`server/src/modules/exports/validate.js`). Every
check is stored with the export record and shown to the user, passes included:

| Check                       | Fails or warns when                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `FILE_VALID`                | The file is empty or lacks a PDF header (fail)                                             |
| `PARSES`                    | pdf.js can't open it (fail)                                                                |
| `EXPORTED_TEXT_EMPTY`       | No text can be extracted (fail)                                                            |
| `EXPECTED_TEXT`             | Name, any visible section heading, or any bullet is missing from the extracted text (fail) |
| `EXPORT_TEXT_ORDER_WARNING` | Headings don't extract in layout order (warn)                                              |
| `DUPLICATE_SECTION`         | A heading appears on more than one line (warn)                                             |
| `PLACEHOLDER_TEXT`          | `undefined`, `[object Object]` or `lorem ipsum` appears and isn't in your own text (fail)  |
| `LINKS_PRESERVED`           | An `http(s)` or `mailto` link in the resume isn't a clickable link in the PDF (warn)       |
| `POSSIBLE_CONTENT_OVERFLOW` | Laid-out content extends past the printable width (warn)                                   |

Text comparison ignores whitespace and case and applies NFKC normalisation, so ligatures and
CSS uppercase headings compare correctly. Lines are rebuilt from text runs, with a space
inserted at visible gaps, as common extractors do.

A failed export is recorded but not offered for download.

## Files and records

- Files are written to `EXPORT_TEMP_DIR` (mode 0600) under random names and expire after
  `EXPORT_TTL_MINUTES` (default 60). A sweeper runs every 10 minutes. It deletes expired files
  and keeps their metadata records as export history, and it also removes untracked files
  older than the retention period.
- Downloads check ownership and expiry before touching the file. An expired file returns
  `410 EXPORT_EXPIRED`.
- Each record stores the resume's draft revision, a content hash, the template id and version,
  page size, page count, size, duration and the validation summary. It never stores resume text.
- `Idempotency-Key` on `POST /resumes/:id/export` makes retries return the original export.
- Deleting an export, its resume or the account deletes the files and records.

## Known limitations

- The checks test this file with pdf.js. They can't predict how any particular applicant
  tracking system parses it, and the UI says so.
- The page count in the live preview is an estimate from screen layout; the exported page count
  is exact.
- The overflow check looks at horizontal overflow. Content cut at page breaks is not detected;
  the template avoids splitting entries across pages (`break-inside: avoid`).
- The layout regression test (`exports.test.js` snapshot) compares extracted text lines, not
  pixels. It depends on the Chrome version and bundled font; update it deliberately with
  `npx vitest -u` after reviewing the diff.

## DOCX export

- Built with the `docx` library from the same content, visibility and section order as the PDF
  (`server/src/modules/exports/docx.js`).
- Plain, reflowable Word structure: a Title-style name, Heading 1 section headings, real
  bullet lists, dates right-aligned with a tab stop, and clickable hyperlinks. No tables or text
  boxes. Page size and margins match the PDF.
- Fonts aren't embedded. Each template names a common system font for DOCX (Clarity: Georgia,
  Ledger: Arial), so the Word file looks simpler than the PDF. The editor says so.
- **Validation** (`validateDocx.js`): the file is reopened with mammoth, and the same content
  checks as PDF run against the template's HTML render: text present, every heading and bullet
  found, section order, no duplicate headings, no placeholders, links preserved. Page count and
  overflow aren't measured because Word reflows text, and the validation method says so.
- Needs no browser, so DOCX works even when Chrome isn't installed.

## Templates

Templates share one markup renderer (`shared/src/templates/base.js`). Single-column templates
differ only in CSS. Sidebar templates also ask the renderer to place Skills, Education and
Certifications in a sidebar. Tests enforce that every template contains exactly the same words.

| Template       | Layout                                                                           | Accent default         |
| -------------- | -------------------------------------------------------------------------------- | ---------------------- |
| Clarity 1.0.0  | Single column, serif; the safest for applicant tracking systems                  | None (black by design) |
| Ledger 1.0.0   | Sans-serif, headings in a margin column; identical markup to Clarity             | #1f4e5f                |
| Horizon 1.0.0  | Single column, timeline rail, skill chips, contact pills                         | #0f6e66                |
| Cadence 1.0.0  | Single column, dates in a left column with an accent rule                        | #1f4fb4                |
| Sable 1.0.0    | Compact single column (9pt), contact block on the right, two-column skills       | #8a1f3d                |
| Meridian 1.0.0 | Full-height dark left sidebar                                                    | #17323f                |
| Atelier 1.0.0  | Colour header band, serif headings, tinted right sidebar (first in the document) | #23304a                |
| Prism 1.0.0    | Accent stripe, light tinted left sidebar                                         | #5b2a6e                |

All eight are original designs. No competitor's templates were copied.

**Accent colours.** Every template except Clarity takes an accent (`resume.accentColor`; `null`
means the template's default). Accents are restricted to readable colours: eight
contrast-checked swatches, or a custom hex that must reach ≥ 4.5:1 against white
(`shared/src/templates/color.js`). Templates never use arbitrary colours. They read CSS
variables derived from the accent:

- `--soft`: a light tint for panels and chips;
- `--rail`: a mid tint for lines;
- `--on-dark`: light text on accent backgrounds, ≥ 4.5:1;
- `--deep`: a dark shade for text on `--soft`, ≥ 4.5:1.

Tests check these ratios for every swatch and for 300 generated colours. An invalid or too-light
value can't reach the page: the renderer falls back to the template default, so it can't inject
CSS either. The accent is saved in versions, appears as a "Template and page settings" change in
comparisons, is restored and branched with versions, is recorded on exports, and colours the
name and headings in DOCX.

**Reading order in sidebar templates.** The sidebar always comes first in the document. It
usually ends on page 1 while the main column continues, so this order lets extractors read the
whole sidebar, then the whole main column, on any number of pages. With the sidebar last,
extraction interleaved the columns page by page; the export checks caught this during
development.

**Text extraction model.** Lines are rebuilt in pdf.js content-stream order, not by grouping
text at the same height across the page, which merged side-by-side columns. The Clarity snapshot
was updated for this: right-aligned dates now extract after the title-and-location block, which
is how pdf.js reads them.

**Tested:** every template passes every PDF export check on every fixture (sample, Unicode and
long text, minimal, nine-role multi-page) at both A4 and US Letter.

**DOCX** is single-column in layout order for every template and is validated against the
single-column reference render.
