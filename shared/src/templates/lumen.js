import { renderResume } from './base.js';

export const LUMEN = {
  id: 'lumen',
  version: '1.0.0',
  name: 'Lumen',
  style: 'Modern single column with photo, icons and pill headings',
  columns: 1,
  fonts: ['Manrope'],
  accent: { default: '#5b2a6e' },
  photo: true,
  docxFont: 'Arial',
  bestFor:
    'A modern look that stays one column, so it reads cleanly anywhere: startups, product teams, and applications where a photo is expected.',
  tradeOffs:
    'Large name with an optional round photo on the right, contact details with icons, pill-shaped section headings, a timeline for roles and projects, and skill chips. It uses a little more vertical space than Clarity.',
  parsingNotes:
    'One column in reading order. Icons and decoration are drawn shapes, not text, and photos are ignored by applicant tracking systems; our pdf.js export tests confirm the text extracts in order.',
};

const FONT_STACK = "'Manrope', 'Helvetica Neue', Arial, sans-serif";

const css = (
  page,
  fontStack,
) => `/* Decoration is painted with backgrounds, never positioned elements: positioned text is painted
   (and therefore extracted) after the rest of the page, which breaks reading order. */
@page { size: ${page.size}; margin: 13mm 15mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${fontStack}; font-size: 9.5pt; line-height: 1.5; color: #1b2030; background: #fff; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; padding: 13mm 15mm; } }
a { color: inherit; text-decoration: none; }
header { display: grid; grid-template-columns: minmax(0, 1fr); column-gap: 14pt; align-items: center; padding-bottom: 12pt; margin-bottom: 4pt; border-bottom: 1pt solid var(--rail); background: linear-gradient(to right, #fff 45%, rgba(255,255,255,0.4) 100%), radial-gradient(var(--rail) 1.1pt, transparent 1.3pt) 0 0 / 9pt 9pt; }
header.with-photo { grid-template-columns: minmax(0, 1fr) auto; }
.photo { grid-column: 2; grid-row: 1 / span 3; width: 27mm; height: 27mm; border-radius: 50%; object-fit: cover; border: 3pt solid var(--soft); }
h1 { grid-column: 1; font-size: 28pt; font-weight: 800; line-height: 1.02; margin: 0; letter-spacing: -0.03em; color: #121725; }
.headline { grid-column: 1; font-size: 11.5pt; font-weight: 700; margin: 4pt 0 9pt; color: var(--accent); }
.contact { grid-column: 1; display: flex; flex-wrap: wrap; gap: 4pt 14pt; margin: 0; font-size: 8.5pt; color: #2d3446; }
.ci { display: inline-flex; align-items: center; gap: 5pt; }
.ico { width: 10.5pt; height: 10.5pt; flex: none; color: var(--accent); }
.contact .sep { display: none; }
section { margin-top: 13pt; }
h2 { display: inline-block; font-size: 9pt; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--deep); background: var(--soft); border-radius: 9pt; padding: 2.5pt 10pt; margin: 0 0 8pt; break-after: avoid; }
.entry { margin-bottom: 9pt; break-inside: avoid; }
section[data-section="experience"] .entry, section[data-section="projects"] .entry { padding: 0 0 2pt 17pt; background: radial-gradient(circle at 5pt 7.5pt, var(--accent) 0 3.3pt, transparent 3.5pt) no-repeat, linear-gradient(var(--rail), var(--rail)) 4.4pt 0 / 1.25pt 100% no-repeat; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 700; color: #121725; }
.entry-title .meta { display: block; font-size: 8.5pt; color: #5d6474; }
.dates { flex: none; font-size: 8.5pt; font-weight: 600; color: #4a5162; white-space: nowrap; font-variant-numeric: tabular-nums; }
p { margin: 2pt 0 0; }
.summary { margin: 0; font-size: 9.8pt; }
.tech, .links { font-size: 8.5pt; color: #4a5162; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 2pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 5pt 12pt; align-items: baseline; }
.skills div { display: contents; }
.skills dt { font-size: 8.6pt; font-weight: 700; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 3pt 3pt 0; padding: 1.5pt 7pt; border-radius: 5pt; background: var(--soft); color: var(--deep); font-size: 8.3pt; font-weight: 600; }
`;

export function renderLumen(
  content,
  layout = {},
  {
    pageSize = 'A4',
    fontCss = '',
    fontStack = FONT_STACK,
    editable = false,
    accentColor = null,
    pattern = 'none',
    photo = null,
  } = {},
) {
  return renderResume(content, layout, {
    editable,
    pageSize,
    fontCss,
    fontStack,
    css,
    skillChips: true,
    contactIcons: true,
    photo,
    defaultAccent: LUMEN.accent.default,
    accentColor,
    pattern,
  });
}
