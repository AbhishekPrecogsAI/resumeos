import { renderResume } from './base.js';

export const PULSE = {
  id: 'pulse',
  version: '1.0.0',
  name: 'Pulse',
  style: 'Dark right column with photo header and icons',
  columns: 2,
  // Sections shown in the sidebar unless the resume moves them.
  sideSections: ['skills', 'education', 'certifications', 'languages', 'interests'],
  fonts: ['Outfit', 'Manrope'],
  accent: { default: '#0f6e66' },
  photo: true,
  docxFont: 'Arial',
  bestFor:
    'Tech and product roles where a crisp, contemporary layout helps you get shortlisted from a PDF.',
  tradeOffs:
    'An optional photo and your name open the page; your contact details sit at the top of a full-height charcoal column on the right, which also holds skills, education and certifications. Experience and projects fill the left. Headings carry accent icons. The dark column uses more ink if printed. Two columns are riskier with applicant tracking systems; use Clarity when applying through one.',
  parsingNotes:
    'The header (name, then contact details) comes first, then the right column as a block, then the main column. Icons are drawn shapes, not text. Photos are ignored by applicant tracking systems.',
};

const FONT_STACK = "'Manrope', 'Helvetica Neue', Arial, sans-serif";
const DISPLAY = "'Outfit', 'Manrope', sans-serif";
const SIDE_W = '64mm';
const INK = '#1c232c';
const PAGE_BG = `linear-gradient(to left, ${INK} 0, ${INK} ${SIDE_W}, #fff ${SIDE_W})`;

const css = (
  page,
  fontStack,
) => `/* Decoration is painted with backgrounds, never positioned elements: positioned text is painted
   (and therefore extracted) after the rest of the page, which breaks reading order. */
/* Full-bleed page; column padding repeats on every page via box-decoration-break. */
@page { size: ${page.size}; margin: 0; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: ${PAGE_BG}; }
body { margin: 0; font-family: ${fontStack}; font-size: 9.3pt; line-height: 1.5; color: #1b2029; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; } }
a { color: inherit; text-decoration: none; }
header { display: grid; grid-template-columns: minmax(0, 1fr) ${SIDE_W}; column-gap: 0; align-items: center; padding: 12mm 0 0 12mm; }
header.with-photo { grid-template-columns: auto minmax(0, 1fr) ${SIDE_W}; }
.photo { grid-column: 1; grid-row: 1 / span 2; width: 26mm; height: 26mm; margin-right: 12pt; border-radius: 7pt; object-fit: cover; box-shadow: 0 0 0 2pt #fff, 0 0 0 3.5pt var(--accent); }
h1 { grid-row: 1; align-self: end; font-family: ${DISPLAY}; font-size: 25pt; font-weight: 700; line-height: 1.04; margin: 0; padding-right: 9mm; letter-spacing: -0.01em; color: #12161d; }
.headline { grid-row: 2; align-self: start; font-size: 10.5pt; font-weight: 700; margin: 4pt 0 0; padding-right: 9mm; color: var(--accent); }
header h1, header .headline { grid-column: 1; }
header.with-photo h1, header.with-photo .headline { grid-column: 2; }
.contact { grid-column: -2; grid-row: 1 / span 2; margin: 0; padding: 0 7mm 0 8mm; color: #e4e8ee; font-size: 8.3pt; }
.ci { display: flex; align-items: center; gap: 6pt; margin: 2pt 0; min-width: 0; }
.ci > span { min-width: 0; overflow-wrap: anywhere; }
.ico { width: 14pt; height: 14pt; flex: none; padding: 2.5pt; border-radius: 50%; background: var(--accent); color: #fff; }
.contact .sep { display: none; }
.main, .sidebar { -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.columns { display: grid; grid-template-columns: minmax(0, 1fr) ${SIDE_W}; align-items: start; margin-top: -3mm; }
.columns .sidebar { grid-column: 2; grid-row: 1; padding: 11mm 7mm 9mm 8mm; color: #d5dbe3; }
.columns .main { grid-column: 1; grid-row: 1; padding: 11mm 9mm 9mm 12mm; }
section { margin-top: 13pt; }
.main section:first-child, .sidebar section:first-child { margin-top: 0; }
h2 { display: flex; align-items: center; gap: 7pt; font-family: ${DISPLAY}; font-size: 12.5pt; font-weight: 600; margin: 0 0 8pt; break-after: avoid; }
.h-ico { width: 13pt; height: 13pt; flex: none; color: var(--accent); }
.main h2 { color: #12161d; }
.main h2::after { content: ''; flex: 1; border-top: 1pt dashed var(--rail); }
.sidebar h2 { color: #fff; padding-bottom: 4pt; border-bottom: 0.75pt solid rgba(255,255,255,0.18); }
.sidebar .h-ico { color: #fff; }
.entry { margin-bottom: 9pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 700; color: #12161d; }
.entry-title .meta { display: block; font-size: 8.3pt; color: #5b6270; }
.dates { flex: none; font-size: 8.3pt; font-weight: 600; color: var(--accent); white-space: nowrap; font-variant-numeric: tabular-nums; }
.sidebar .entry-head { display: block; }
.sidebar .entry-title strong { color: #fff; }
.sidebar .entry-title .meta, .sidebar .dates { display: block; color: #aab4c1; white-space: normal; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.3pt; color: #4a515e; }
.sidebar .links { color: #c3cbd6; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 2pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; }
.skills div { margin-bottom: 7pt; }
.skills dt { font-size: 8.3pt; font-weight: 700; color: #fff; margin-bottom: 4pt; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 3pt 4pt 0; padding: 1.5pt 7pt; border-radius: 3pt; background: rgba(255,255,255,0.1); color: #eef1f5; font-size: 8.1pt; font-weight: 600; }
.main .chip { background: var(--soft); color: var(--deep); }
`;

export function renderPulse(
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
    sidebar: { keys: PULSE.sideSections, side: 'right', header: 'top' },
    skillChips: true,
    contactIcons: true,
    headingIcons: true,
    levelStyle: 'bar',
    photo,
    defaultAccent: PULSE.accent.default,
    accentColor,
    pattern,
    pageBackground: PAGE_BG,
  });
}
