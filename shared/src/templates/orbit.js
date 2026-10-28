import { renderResume } from './base.js';

export const ORBIT = {
  id: 'orbit',
  version: '1.0.0',
  name: 'Orbit',
  style: 'Modern header card with photo, icons and two columns',
  columns: 2,
  fonts: ['Manrope'],
  accent: { default: '#1f4fb4' },
  photo: true,
  docxFont: 'Arial',
  bestFor:
    'A modern, friendly look for product companies, startups and direct applications, especially in regions where a photo is expected.',
  tradeOffs:
    'A tinted header card holds an optional round photo, your name and a two-column contact grid with icons. Experience and projects take the wide left column; skills (as chips), education and certifications sit on the right and always stay there. Two columns are riskier with applicant tracking systems; use Clarity when applying through one.',
  parsingNotes:
    "Icons are drawn shapes, not text, so they don't add stray characters. The right column comes first in the document, so extractors read each column as a block; our pdf.js export tests confirm this on multi-page resumes. Photos are ignored by applicant tracking systems.",
};

const FONT_STACK = "'Manrope', 'Helvetica Neue', Arial, sans-serif";
const SIDE_W = '60mm';

const css = (
  page,
  fontStack,
) => `/* Decoration is painted with backgrounds, never positioned elements: positioned text is painted
   (and therefore extracted) after the rest of the page, which breaks reading order. */
@page { size: ${page.size}; margin: 12mm 13mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${fontStack}; font-size: 9.4pt; line-height: 1.5; color: #1c2230; background: #fff; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; padding: 12mm 13mm; } }
a { color: inherit; text-decoration: none; }
header { display: grid; grid-template-columns: 1fr; column-gap: 15pt; align-items: center; padding: 14pt 16pt; border-radius: 10pt; background: linear-gradient(to right, var(--soft) 55%, rgba(255,255,255,0) 95%), radial-gradient(var(--rail) 1.1pt, transparent 1.3pt) 0 0 / 8pt 8pt, var(--soft); }
header.with-photo { grid-template-columns: auto minmax(0, 1fr); }
.photo { grid-row: 1 / span 3; width: 28mm; height: 28mm; border-radius: 50%; object-fit: cover; border: 2.5pt solid #fff; box-shadow: 0 0 0 1.25pt var(--accent); }
h1 { font-size: 25pt; font-weight: 800; line-height: 1.05; margin: 0; letter-spacing: -0.025em; color: #121826; }
.headline { font-size: 11pt; font-weight: 700; margin: 3pt 0 8pt; color: var(--accent); }
.contact { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3pt 12pt; margin: 0; font-size: 8.4pt; color: #2b3242; }
.ci { display: flex; align-items: center; gap: 5pt; min-width: 0; }
.ci > span { min-width: 0; overflow-wrap: anywhere; }
.ico { width: 10pt; height: 10pt; flex: none; color: var(--accent); }
.contact .sep { display: none; }
.full { margin-top: 14pt; }
.columns { display: grid; grid-template-columns: minmax(0, 1fr) ${SIDE_W}; column-gap: 9mm; align-items: start; }
.columns .sidebar { grid-column: 2; grid-row: 1; }
.columns .main { grid-column: 1; grid-row: 1; }
section { margin-top: 14pt; }
h2 { font-size: 10.5pt; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #121826; margin: 0 0 9pt; break-after: avoid; }
h2::after { content: ''; display: block; width: 22pt; height: 3pt; margin-top: 4pt; border-radius: 2pt; background: var(--accent); }
.entry { margin-bottom: 9pt; break-inside: avoid; }
.main .entry { padding: 0 0 2pt 17pt; background: radial-gradient(circle at 5pt 7.5pt, #fff 0 2.1pt, var(--accent) 2.3pt 4pt, transparent 4.2pt) no-repeat, linear-gradient(var(--rail), var(--rail)) 4.4pt 0 / 1.25pt 100% no-repeat; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 700; color: #121826; }
.entry-title .meta { display: block; font-size: 8.4pt; color: #5d6577; }
.dates { flex: none; font-size: 8.4pt; font-weight: 600; color: var(--accent); white-space: nowrap; font-variant-numeric: tabular-nums; }
.sidebar .entry-head { display: block; }
.sidebar .dates { display: block; white-space: normal; }
p { margin: 2pt 0 0; }
.summary { margin: 0; font-size: 9.8pt; color: #2b3242; }
.tech, .links { font-size: 8.4pt; color: #4a5263; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 2pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; }
.skills div { margin-bottom: 7pt; }
.skills dt { font-size: 8.4pt; font-weight: 700; color: #3a4252; margin-bottom: 3pt; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 3pt 4pt 0; padding: 1.5pt 7pt; border-radius: 5pt; background: var(--soft); color: var(--deep); font-size: 8.3pt; font-weight: 600; }
`;

export function renderOrbit(
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
    sidebar: { keys: ['skills', 'education', 'certifications'], side: 'right', header: 'top' },
    fullWidth: ['summary'],
    skillChips: true,
    contactIcons: true,
    photo,
    defaultAccent: ORBIT.accent.default,
    accentColor,
    pattern,
  });
}
