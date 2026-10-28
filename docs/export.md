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

Templates share one markup renderer (`shared/src/templates/base.js`) and differ only in CSS.
Every template therefore has identical reading order and text, which a shared test enforces.

| Template      | Layout                                       | Notes                                                                                                                                                                                              |
| ------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clarity 1.0.0 | Single column, serif                         | The default; best for applicant tracking systems.                                                                                                                                                  |
| Ledger 1.0.0  | Sans-serif, headings in a 30mm margin column | Each heading precedes its content in the document; PDF tests confirm extraction order on all fixtures. It's still a visual two-column layout, so untested parsers may differ, as the gallery says. |

Ledger was added after Clarity passed every export check across the edge-case fixtures. The
refactor to a shared renderer was verified byte-for-byte against Clarity's previous output, and
the Clarity text-layout snapshot is unchanged.
