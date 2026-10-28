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

| Template       | Layout                                                                                            | Photo | Accent default         |
| -------------- | ------------------------------------------------------------------------------------------------- | ----- | ---------------------- |
| Clarity 1.0.0  | Single column, serif; the safest for applicant tracking systems                                   | No    | None (black by design) |
| Orbit 1.0.0    | Modern: tinted header card, two-column contact grid with icons, timeline, right column with chips | Yes   | #1f4fb4                |
| Vertex 1.0.0   | Modern: bold colour sidebar, Outfit headings, icon badges, timeline                               | Yes   | #0f6e66                |
| Lumen 1.0.0    | Modern single column: large name, icons, pill headings, timeline, chips                           | Yes   | #5b2a6e                |
| Ledger 1.0.0   | Sans-serif, headings in a margin column; identical markup to Clarity                              | No    | #1f4e5f                |
| Horizon 1.0.0  | Single column, timeline rail, skill chips, contact pills with icons                               | No    | #0f6e66                |
| Cadence 1.0.0  | Single column, dates in a left column with an accent rule                                         | No    | #1f4fb4                |
| Sable 1.0.0    | Compact single column (9pt), contact block on the right, two-column skills                        | No    | #8a1f3d                |
| Meridian 1.0.0 | Full-height dark left sidebar with icons                                                          | No    | #17323f                |
| Atelier 1.0.0  | Colour header band, serif headings, tinted right sidebar (first in the document)                  | No    | #23304a                |
| Prism 1.0.0    | Accent stripe, light tinted left sidebar                                                          | No    | #5b2a6e                |
| Atlas 1.0.0    | Charcoal left sidebar with photo; icon badges on every heading                                    | Yes   | #1f6fb4                |
| Beacon 1.0.0   | Minimal single column: name beside a contact grid, icon headings, outlined skill tags             | No    | #1f6f8b                |
| Harbor 1.0.0   | Full-width colour header with photo; tinted right column runs the full page                       | Yes   | #174a5c                |
| Summit 1.0.0   | Serif name beside a photo, full-width charcoal contact bar, ruled icon headings                   | Yes   | #8a1f3d                |
| Tide 1.0.0     | Colour header with a wave edge (background image), full-width summary, two columns                | Yes   | #1f4fb4                |
| Circuit 1.0.0  | Single column; contact panel beside the name; two-tone heading rules                              | No    | #23304a                |
| Pulse 1.0.0    | Full-height charcoal right column that also holds the contact details; photo header               | Yes   | #0f6e66                |
| Keystone 1.0.0 | Charcoal header block with ringed photo and accent edge; icon badge headings                      | Yes   | #b45309                |

All nineteen are original designs. No competitor's templates were copied. The last eight take
common layout ideas (dark sidebars, header bands, contact bars, heading icons) and give them
their own colours, type, shapes and proportions.

**Heading icons.** `headingIcons: true` puts a small drawn icon inside each section `<h2>`, one
per section type and one for custom sections. Icons are SVG paths with `aria-hidden`, so headings
still extract as just their words, and the export checks find them as before.

**Languages and interests.** Two list sections next to skills (`content.languages`:
`{ id, name, level }`, `content.interests`: `{ id, name }`). A language's level is one of
Native, Fluent, Professional, Conversational or Basic, or none. It always prints as a word, so
applicant tracking systems read it. Templates with an accent also draw five dots, as an inline
SVG with no text that stays sharp in PDFs. CSS gradient dots were tried first; Chrome rasterises
them in PDFs and they looked blurry. Interests print as chips where a template uses chips for
skills, otherwise as a comma-separated line. Their styles are added only when a resume shows
either section, so other output is unchanged. Job matching counts languages; interests are left
out because they'd produce false matches.

**Skill levels.** A skill can have an optional `level` from 1 to 5 (Beginner to Expert), with
no default, so skills saved earlier keep their exact shape and profile sync isn't disturbed. On
templates with an accent, once any skill has a level, each skill group renders as rows of name
and meter. Atlas, Pulse, Circuit and Keystone draw bars; the others draw dots. Meters are inline
SVG with no text, so extracted text is identical with or without levels (tested across all
templates), and applicant tracking systems read only the skill names. Clarity and DOCX don't
show levels. The rows are spans, not divs, because templates style `.skills div` (Beacon even
sets `display: contents`). Rows and languages flow into columns where there's room. Meters take
the accent on white pages and the text colour in coloured sidebars.

**Sections added later.** Languages and Interests aren't in the saved section order of resumes
created before them. The page editor hides them there while they're empty; the Layout dialog
offers **Add to page**. New resumes include them in their order. Previews and exports are
unaffected, since empty sections never print.

**The sample fits one page.** Gallery thumbnails show page one, so a test renders the sample
in every template and requires one page. Adding three languages and three interests once
pushed four templates to two pages unnoticed; the sample now has two languages and no
interests, and tests use their own fuller data.

**Design settings.** Stored in the resume layout, so versions, compare, share links and exports
all carry them. They're optional, and a layout that never set them keeps the same shape and hash.

| Setting     | Values                                                        | How it renders                                                           |
| ----------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `font`      | Inter, Manrope, IBM Plex Sans, Source Serif 4, Lora; or unset | Replaces the body font stack; display fonts for names stay               |
| `fontScale` | 0.8–1.2                                                       | `html { zoom }`, which Chrome applies to PDFs; screen width divided back |
| `spacing`   | `compact`, `normal`, `relaxed`                                | Line height and section, entry and bullet gaps, after the template CSS   |
| `placement` | `{ sectionKey: 'main' \| 'side' }`                            | Moves sections between columns on sidebar templates                      |

Templates with a sidebar list their default sidebar sections in `sideSections`, and Orbit and
Tide list `fullWidthSections`, so the editor can show each section's default column. The
sidebar always comes first in the document whatever is placed in it. The renderer clamps and
ignores invalid values as well as the API rejecting them, because previews render unsaved
drafts. DOCX uses the chosen font's closest Word font (Arial or Georgia).

**Fit to one page.** `POST /resumes/:id/fit-one-page` renders the saved draft as real PDFs:
first compact spacing, then 95%, 90% and 85% text, never larger than the resume already has. It
returns the first settings whose PDF is one page, or says nothing fits. It saves nothing; the
editor applies the result as an ordinary, undoable edit. Each request can render five PDFs, so it
has its own rate limit (10 per 5 minutes), results are cached by everything that changes the
PDF (draft revision, template and version, page size, accent, background, photo), and each
person can run one measurement at a time; a repeat of the same one shares it. An earlier version estimated pages in
the browser, but a comparison against PDFs showed 4 wrong answers in 30, all saying "fits" when
it didn't, because page breaks inside entries push content onto the next page. The preview's
page count is still an estimate, labelled as one.

**Zoom and measurement.** With `zoom` on the root, Chrome reports `scrollHeight` before zoom,
so the preview multiplies by the computed zoom (`client/src/lib/measurePages.js`).

**Reading order rule: no positioned text.** Chrome paints positioned elements (`position`,
`transform`, `opacity`, `z-index`) in a later pass, and PDF text follows paint order. So any text
inside one extracts after the rest of the page. An earlier Horizon release positioned its
timeline entries, and its extracted text read "EXPERIENCE, PROJECTS, SKILLS…" with every entry
after the headings. All decoration (timeline rails and dots, dot patterns, stripes) is now
painted with `background-image` on the element itself.

Two checks guard against this:

- The export check walks headings and every bullet in document order through the extracted
  text, so a bullet that drifts from its heading fails.
- A template test rejects positioning, transforms, opacity and z-index in any template.

A separate test rejects hiding `.sep` outside the contact line, because hidden separators run
words together in extracted text ("EngineerNorthwind").

**Contact icons** are generic line icons drawn with SVG paths, not brand logos and not text, so
they add nothing to extracted text.

**Photos.** One optional profile photo per user (`ProfilePhoto`):

- The browser crops and re-encodes it to a 400×400 JPEG, which drops EXIF/GPS data.
- The server checks the real file signature (JPEG/PNG only), size (≤ 300 KB) and dimensions
  (64–2000 px).
- A resume shows it only with `layout.showPhoto` and a template that supports photos. It's
  embedded as a data URL, so rendering stays offline.
- The renderer accepts only base64 JPEG/PNG data URLs in the `<img>`.
- The photo isn't part of versions (it belongs to the profile), and DOCX exports don't include it.

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

**Background patterns.** Templates with an accent take an optional page background
(`resume.backgroundPattern`: `none`, `network`, `dots`, `grid`, `diagonal` or `waves`;
`shared/src/templates/patterns.js`). Each pattern is a small SVG tile, tinted from the accent and
drawn as a CSS `background` layer on `html`. It contains no text, no links and nothing
positioned, so it can't change extracted text or reading order. Sidebar templates pass their
sidebar gradient as the base layer, so the pattern sits over it. Mark opacity is capped at
`PATTERN_MAX_OPACITY` (0.16), and a test checks that body and muted text stay ≥ 4.5:1 on the
darkest mark for every swatch. The network tile uses a fixed-seed generator, so it's identical
on every render. The pattern is saved, compared, restored and branched with versions and recorded
on exports, like the accent. Clarity and DOCX ignore it.

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
