import { renderResume } from './base.js';

export const KEYSTONE = {
  id: 'keystone',
  version: '1.0.0',
  name: 'Keystone',
  style: 'Dark header block with ringed photo and two columns',
  columns: 2,
  // Sections shown in the sidebar unless the resume moves them.
  sideSections: ['skills', 'education', 'certifications', 'languages', 'interests'],
  // Default sidebar side; a resume can flip it (layout.sidebarSide).
  sidebarSide: 'right',
  fonts: ['Manrope'],
  accent: { default: '#b45309' },
  photo: true,
  docxFont: 'Arial',
  bestFor:
    'Combining a strong work history with plenty of skills, projects and credentials: marketing, operations and generalist roles.',
  tradeOffs:
    'A charcoal header block holds your name, headline, contact details and an optional photo with an accent ring. Below, two columns: experience and projects on the left; skills, education and certifications on the right. Headings carry icons. The header uses more ink if printed. Two columns are riskier with applicant tracking systems; use Clarity when applying through one.',
  parsingNotes:
    'The header comes first, then the right column as a block, then the left. Icons are drawn shapes, not text. Photos are ignored by applicant tracking systems.',
};

const FONT_STACK = "'Manrope', 'Helvetica Neue', Arial, sans-serif";
const INK = '#1e242c';

const css = (
  page,
  fontStack,
) => `/* Decoration is painted with backgrounds, never positioned elements: positioned text is painted
   (and therefore extracted) after the rest of the page, which breaks reading order. */
/* Full-bleed page; column padding repeats on every page via box-decoration-break. */
@page { size: ${page.size}; margin: 0; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
body { margin: 0; font-family: ${fontStack}; font-size: 9.3pt; line-height: 1.5; color: #1b2028; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; } }
a { color: inherit; text-decoration: none; }
header { display: grid; grid-template-columns: minmax(0, 1fr); column-gap: 16pt; align-items: center; padding: 11mm 13mm 10mm; background: linear-gradient(var(--accent), var(--accent)) 0 100% / 100% 2.5mm no-repeat, ${INK}; color: #fff; }
header.with-photo { grid-template-columns: minmax(0, 1fr) auto; }
.photo { grid-column: 2; grid-row: 1 / span 3; width: 31mm; height: 31mm; border-radius: 50%; object-fit: cover; border: 2.5pt solid ${INK}; box-shadow: 0 0 0 2.5pt var(--accent); }
h1 { grid-column: 1; font-size: 25pt; font-weight: 800; line-height: 1.04; margin: 0; letter-spacing: -0.02em; }
.headline { grid-column: 1; font-size: 10.5pt; font-weight: 600; margin: 3pt 0 9pt; color: #c9d0da; }
.contact { grid-column: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3.5pt 14pt; margin: 0; font-size: 8.3pt; color: #e8ebf0; }
.ci { display: flex; align-items: center; gap: 6pt; min-width: 0; }
.ci > span { min-width: 0; overflow-wrap: anywhere; }
.ico { width: 10pt; height: 10pt; flex: none; color: #fff; }
.contact .sep { display: none; }
.main, .sidebar { -webkit-box-decoration-break: clone; box-decoration-break: clone; padding: 11mm 0 9mm; }
.columns { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); column-gap: 9mm; align-items: start; margin-top: -3mm; padding: 0 13mm; }
.columns .sidebar { grid-column: 2; grid-row: 1; }
.columns .main { grid-column: 1; grid-row: 1; }
section { margin-top: 13pt; }
.main section:first-child, .sidebar section:first-child { margin-top: 0; }
h2 { display: flex; align-items: center; gap: 7pt; font-size: 10.5pt; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: #13171d; margin: 0 0 8pt; break-after: avoid; }
.h-ico { width: 17pt; height: 17pt; flex: none; padding: 3.5pt; border-radius: 50%; background: ${INK}; color: #fff; box-shadow: 0 0 0 1.25pt #fff, 0 0 0 2.25pt var(--accent); }
h2::after { content: ''; flex: 1; border-top: 0.75pt solid #d3d8df; }
.entry { margin-bottom: 9pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 700; color: #13171d; }
.entry-title .meta { display: block; font-size: 8.3pt; color: #5a616d; }
.dates { flex: none; font-size: 8.3pt; font-weight: 600; color: var(--accent); white-space: nowrap; font-variant-numeric: tabular-nums; }
.sidebar .entry-head { display: block; }
.sidebar .dates { display: block; white-space: normal; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.3pt; color: #4a515d; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 2pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; }
.skills div { margin-bottom: 7pt; }
.skills dt { font-size: 8.3pt; font-weight: 700; color: #2b313a; margin-bottom: 3pt; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 3pt 4pt 0; padding: 1.5pt 7pt; border-radius: 3pt; background: var(--soft); color: var(--deep); font-size: 8.1pt; font-weight: 600; }
`;

export function renderKeystone(
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
    sidebar: {
      keys: KEYSTONE.sideSections,
      width: 'minmax(0, 1fr)',
      mainWidth: 'minmax(0, 1.6fr)',
      side: KEYSTONE.sidebarSide,
      header: 'top',
    },
    skillChips: true,
    contactIcons: true,
    headingIcons: true,
    levelStyle: 'bar',
    photo,
    defaultAccent: KEYSTONE.accent.default,
    accentColor,
    pattern,
  });
}
