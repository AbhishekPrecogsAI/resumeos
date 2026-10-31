import { renderResume } from './base.js';

export const HARBOR = {
  id: 'harbor',
  version: '1.0.0',
  name: 'Harbor',
  style: 'Colour header band with photo and a tinted side column',
  columns: 2,
  // Sections shown in the sidebar unless the resume moves them.
  sideSections: ['skills', 'education', 'certifications', 'languages', 'interests'],
  // Default sidebar side; a resume can flip it (layout.sidebarSide).
  sidebarSide: 'right',
  fonts: ['Outfit', 'Manrope'],
  accent: { default: '#174a5c' },
  photo: true,
  docxFont: 'Arial',
  bestFor:
    'Hybrid resumes that give skills and experience equal weight: client-facing, creative and people-focused roles.',
  tradeOffs:
    'A full-width colour band holds an optional photo, your name and contact details. Experience and projects fill the wide left column; skills, education and certifications sit in a tinted column on the right that runs the full page. Headings carry icons. Two columns are riskier with applicant tracking systems; use Clarity when applying through one.',
  parsingNotes:
    'The header comes first, then the right column as a block, then the main column. Icons are drawn shapes, not text. Photos are ignored by applicant tracking systems.',
};

const FONT_STACK = "'Manrope', 'Helvetica Neue', Arial, sans-serif";
const DISPLAY = "'Outfit', 'Manrope', sans-serif";
const SIDE_W = '64mm';
const PAGE_BG = `linear-gradient(to left, var(--soft) 0, var(--soft) ${SIDE_W}, #fff ${SIDE_W})`;

const css = (
  page,
  fontStack,
) => `/* Decoration is painted with backgrounds, never positioned elements: positioned text is painted
   (and therefore extracted) after the rest of the page, which breaks reading order. */
/* Full-bleed page; column padding repeats on every page via box-decoration-break. */
@page { size: ${page.size}; margin: 0; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: ${PAGE_BG}; }
body { margin: 0; font-family: ${fontStack}; font-size: 9.3pt; line-height: 1.5; color: #1b2128; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; } }
a { color: inherit; text-decoration: none; }
header { display: grid; grid-template-columns: minmax(0, 1fr); column-gap: 14pt; align-items: center; padding: 11mm 12mm 9mm; background: var(--accent); color: #fff; }
header.with-photo { grid-template-columns: auto minmax(0, 1fr); }
.photo { grid-row: 1 / span 3; width: 30mm; height: 30mm; border-radius: 50%; object-fit: cover; border: 2.5pt solid #fff; }
h1 { font-family: ${DISPLAY}; font-size: 26pt; font-weight: 700; line-height: 1.04; margin: 0; letter-spacing: -0.01em; }
.headline { font-size: 10.5pt; font-weight: 600; margin: 3pt 0 8pt; color: var(--on-dark); }
.contact { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3pt 12pt; margin: 0; font-size: 8.3pt; }
.ci { display: flex; align-items: center; gap: 5pt; min-width: 0; }
.ci > span { min-width: 0; overflow-wrap: anywhere; }
.ico { width: 10pt; height: 10pt; flex: none; color: var(--on-dark); }
.contact .sep { display: none; }
.main, .sidebar { -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.columns { display: grid; grid-template-columns: minmax(0, 1fr) ${SIDE_W}; align-items: start; }
.columns .sidebar { grid-column: 2; grid-row: 1; padding: 9mm 8mm 9mm 7mm; }
.columns .main { grid-column: 1; grid-row: 1; padding: 9mm 9mm 9mm 12mm; }
section { margin-top: 13pt; }
.main section:first-child, .sidebar section:first-child { margin-top: 0; }
h2 { display: flex; align-items: center; gap: 7pt; font-family: ${DISPLAY}; font-size: 12.5pt; font-weight: 600; color: #11161c; margin: 0 0 8pt; break-after: avoid; }
.h-ico { width: 18pt; height: 18pt; flex: none; padding: 3.5pt; border-radius: 4pt; background: var(--accent); color: #fff; }
.main h2::after { content: ''; flex: 1; border-top: 0.75pt solid var(--rail); }
.entry { margin-bottom: 9pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 700; color: #11161c; }
.entry-title .meta { display: block; font-size: 8.3pt; color: #59616c; }
.dates { flex: none; font-size: 8.3pt; font-weight: 600; color: var(--accent); white-space: nowrap; font-variant-numeric: tabular-nums; }
.sidebar .entry-head { display: block; }
.sidebar .dates { display: block; white-space: normal; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.3pt; color: #49515c; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 2pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; }
.skills div { margin-bottom: 7pt; }
.skills dt { font-size: 8.3pt; font-weight: 700; color: #2c333c; margin-bottom: 3pt; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 3pt 4pt 0; padding: 1.5pt 6pt; border-radius: 3pt; background: #fff; border: 0.75pt solid var(--rail); color: var(--deep); font-size: 8.1pt; font-weight: 600; }
`;

export function renderHarbor(
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
    sidebar: { keys: HARBOR.sideSections, width: SIDE_W, side: HARBOR.sidebarSide, header: 'top' },
    skillChips: true,
    contactIcons: true,
    headingIcons: true,
    photo,
    defaultAccent: HARBOR.accent.default,
    accentColor,
    pattern,
    pageBackground: PAGE_BG,
  });
}
