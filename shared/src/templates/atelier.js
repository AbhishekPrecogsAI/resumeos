import { renderResume } from './base.js';

export const ATELIER = {
  id: 'atelier',
  version: '1.0.0',
  name: 'Atelier',
  style: 'Colour header band, serif headings, right sidebar',
  columns: 2,
  fonts: ['IBM Plex Sans', 'Source Serif 4'],
  accent: { default: '#23304a' },
  docxFont: 'Georgia',
  bestFor:
    'Senior and lead roles, consultancy and agency applications, and anywhere a polished, editorial look suits the role.',
  tradeOffs:
    'A full-width colour band holds your name and contact details. Skills, education and certifications sit in a tinted right column and stay there whatever order you choose. The band only appears on the first page. Multi-column layouts are riskier with applicant tracking systems; prefer Clarity when applying through one.',
  parsingNotes:
    "The sidebar comes before the main column in the document, even though it's shown on the right, so extractors read it as one block on every page. Our pdf.js export tests confirm sections extract in that order, including on multi-page resumes. Parsers we haven't tested may read two columns differently.",
};

const FONT_STACK = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const SERIF = "'Source Serif 4', Georgia, serif";
const SIDE_W = '64mm';

const css = (
  page,
  fontStack,
) => `/* Full-bleed page; column padding repeats on every page via box-decoration-break. */
@page { size: ${page.size}; margin: 0; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: linear-gradient(to left, var(--soft) 0, var(--soft) ${SIDE_W}, #fff ${SIDE_W}); }
body { margin: 0; font-family: ${fontStack}; font-size: 9.5pt; line-height: 1.45; color: #1d222b; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; } }
a { color: inherit; text-decoration: none; }
header { background: var(--accent); color: #fff; padding: 13mm 14mm 9mm; }
h1 { font-family: ${SERIF}; font-size: 27pt; font-weight: 600; line-height: 1.05; margin: 0 0 4pt; letter-spacing: -0.01em; }
.headline { font-size: 10.5pt; margin: 0 0 7pt; color: var(--on-dark); }
.contact { margin: 0; font-size: 8.5pt; color: #e4e9f2; }
.contact .sep { color: var(--on-dark); }
.main, .sidebar { -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.columns { display: grid; grid-template-columns: minmax(0, 1fr) ${SIDE_W}; align-items: start; }
.columns .sidebar { grid-column: 2; grid-row: 1; }
.columns .main { grid-column: 1; grid-row: 1; }
.main { padding: 9mm 9mm 8mm 14mm; }
.sidebar { padding: 9mm 11mm 8mm 8mm; }
section { margin-top: 12pt; }
.main section:first-child, .sidebar section:first-child { margin-top: 0; }
h2 { font-family: ${SERIF}; font-size: 12.5pt; font-weight: 600; color: var(--accent); margin: 0 0 5pt; padding-bottom: 2pt; border-bottom: 0.75pt solid var(--rail); break-after: avoid; }
.entry { margin-bottom: 8pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 600; }
.entry-title .meta { display: block; font-size: 8.5pt; color: #5a6475; }
.dates { flex: none; font-size: 8.5pt; color: #46505f; white-space: nowrap; font-variant-numeric: tabular-nums; }
.sidebar .entry-head { display: block; }
.sidebar .dates { display: block; white-space: normal; }
p { margin: 2pt 0 0; }
.summary { margin: 0; font-size: 10pt; }
.tech, .links { font-size: 8.5pt; color: #46505f; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 1.5pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; }
.skills div { margin-bottom: 6pt; }
.skills dt { font-size: 8.5pt; font-weight: 600; color: var(--accent); margin-bottom: 3pt; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 2.5pt 3pt 0; padding: 0.75pt 5pt; border: 0.75pt solid var(--rail); border-radius: 9pt; background: #fff; font-size: 8.25pt; color: var(--deep); }
`;

export function renderAtelier(
  content,
  layout = {},
  { pageSize = 'A4', fontCss = '', fontStack = FONT_STACK, accentColor = null } = {},
) {
  return renderResume(content, layout, {
    pageSize,
    fontCss,
    fontStack,
    css,
    sidebar: { keys: ['skills', 'education', 'certifications'], side: 'right', header: 'top' },
    skillChips: true,
    defaultAccent: ATELIER.accent.default,
    accentColor,
  });
}
