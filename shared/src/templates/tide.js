import { renderResume } from './base.js';

export const TIDE = {
  id: 'tide',
  version: '1.0.0',
  name: 'Tide',
  style: 'Wave-edged colour header with two columns',
  columns: 2,
  // Sections shown in the sidebar unless the resume moves them.
  // Sections spanning both columns above them, unless the resume places them in a column.
  fullWidthSections: ['summary'],
  sideSections: ['skills', 'education', 'certifications', 'languages', 'interests'],
  fonts: ['Manrope'],
  accent: { default: '#1f4fb4' },
  photo: true,
  docxFont: 'Arial',
  bestFor:
    'A friendly, all-purpose resume you can tailor to most roles, with a header that stands out on screen.',
  tradeOffs:
    'A colour header with a wave along its lower edge holds an optional photo, your name, headline and contact details. Your summary runs full width; experience and projects take the left column and skills, education and certifications the right. Two columns are riskier with applicant tracking systems; use Clarity when applying through one.',
  parsingNotes:
    'The wave is a background image, not an element, so it adds nothing to extracted text. The right column comes first in the document, so extractors read each column as a block.',
};

const FONT_STACK = "'Manrope', 'Helvetica Neue', Arial, sans-serif";
const SIDE_W = '62mm';
// White wave drawn over the header's lower edge. Fixed shape; contains no text or links.
const WAVE = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 60" preserveAspectRatio="none"><path d="M0 34 C 130 6, 260 6, 400 30 S 670 58, 800 22 L800 60 L0 60 Z" fill="#ffffff"/><path d="M0 34 C 130 6, 260 6, 400 30 S 670 58, 800 22" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="10" transform="translate(0 -9)"/></svg>',
)}")`;

const css = (
  page,
  fontStack,
) => `/* Decoration is painted with backgrounds, never positioned elements: positioned text is painted
   (and therefore extracted) after the rest of the page, which breaks reading order. */
/* Full-bleed page; column padding repeats on every page via box-decoration-break. */
@page { size: ${page.size}; margin: 0; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
body { margin: 0; font-family: ${fontStack}; font-size: 9.3pt; line-height: 1.5; color: #1b2029; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; } }
a { color: inherit; text-decoration: none; }
header { display: grid; grid-template-columns: minmax(0, 1fr); column-gap: 14pt; align-items: center; padding: 11mm 13mm 17mm; color: #fff; background: ${WAVE} bottom / 100% 13mm no-repeat, var(--accent); }
header.with-photo { grid-template-columns: minmax(0, 1fr) auto; }
.photo { grid-column: 2; grid-row: 1 / span 3; width: 29mm; height: 29mm; border-radius: 50%; object-fit: cover; border: 2.5pt solid #fff; }
h1 { grid-column: 1; font-size: 26pt; font-weight: 800; line-height: 1.04; margin: 0; letter-spacing: -0.02em; }
.headline { grid-column: 1; font-size: 10.5pt; font-weight: 600; margin: 3pt 0 8pt; color: var(--on-dark); }
.contact { grid-column: 1; display: flex; flex-wrap: wrap; gap: 3pt 14pt; margin: 0; font-size: 8.3pt; }
.ci { display: inline-flex; align-items: center; gap: 5pt; min-width: 0; }
.ci > span { min-width: 0; overflow-wrap: anywhere; }
.ico { width: 10pt; height: 10pt; flex: none; color: var(--on-dark); }
.contact .sep { display: none; }
.full, .columns { padding: 0 13mm; }
.full section:first-child { margin-top: 2mm; }
/* Top padding repeats on every page (no page margin); the pull-up keeps page 1 tight under the header. */
.main, .sidebar { -webkit-box-decoration-break: clone; box-decoration-break: clone; padding: 10mm 0 9mm; }
.columns { margin-top: -6mm; display: grid; grid-template-columns: minmax(0, 1fr) ${SIDE_W}; column-gap: 9mm; align-items: start; }
.columns .sidebar { grid-column: 2; grid-row: 1; }
.columns .main { grid-column: 1; grid-row: 1; }
section { margin-top: 13pt; }
h2 { display: flex; align-items: center; gap: 6pt; font-size: 10.5pt; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); margin: 0 0 8pt; break-after: avoid; }
h2::after { content: ''; flex: 1; height: 2pt; border-radius: 1pt; background: var(--soft); }
.h-ico { width: 13pt; height: 13pt; flex: none; color: var(--accent); }
.entry { margin-bottom: 9pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 700; color: #141922; }
.entry-title .meta { display: block; font-size: 8.3pt; color: #5c6371; }
.dates { flex: none; font-size: 8.3pt; color: #3c4350; white-space: nowrap; font-variant-numeric: tabular-nums; }
.sidebar .entry-head { display: block; }
.sidebar .dates { display: block; white-space: normal; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.3pt; color: #4a515e; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 2pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; }
.skills div { margin-bottom: 7pt; }
.skills dt { font-size: 8.3pt; font-weight: 700; color: #2c333e; margin-bottom: 3pt; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 3pt 4pt 0; padding: 1.5pt 7pt; border-radius: 9pt; background: var(--soft); color: var(--deep); font-size: 8.1pt; font-weight: 600; }
`;

export function renderTide(
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
    sidebar: { keys: TIDE.sideSections, side: 'right', header: 'top' },
    fullWidth: TIDE.fullWidthSections,
    skillChips: true,
    contactIcons: true,
    headingIcons: true,
    photo,
    defaultAccent: TIDE.accent.default,
    accentColor,
    pattern,
  });
}
