import { renderResume } from './base.js';

export const SUMMIT = {
  id: 'summit',
  version: '1.0.0',
  name: 'Summit',
  style: 'Classic header with photo and a dark contact bar',
  columns: 2,
  // Sections shown in the sidebar unless the resume moves them.
  sideSections: ['skills', 'education', 'certifications', 'languages', 'interests'],
  // Default sidebar side; a resume can flip it (layout.sidebarSide).
  sidebarSide: 'right',
  fonts: ['Source Serif 4', 'IBM Plex Sans'],
  accent: { default: '#8a1f3d' },
  photo: true,
  docxFont: 'Georgia',
  bestFor:
    'Experienced professionals in established industries who want a traditional feel with a modern finish.',
  tradeOffs:
    'A serif name beside an optional photo, with your contact details in a full-width charcoal bar below. Experience and projects take the wide left column; skills, education and certifications stay on the right. Headings carry icons and an accent rule. Two columns are riskier with applicant tracking systems; use Clarity when applying through one.',
  parsingNotes:
    'The right column comes first in the document, so extractors read each column as a block. Icons are drawn shapes, not text. Photos are ignored by applicant tracking systems.',
};

const FONT_STACK = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const SERIF = "'Source Serif 4', Georgia, serif";
const SIDE_W = '60mm';

const css = (page, fontStack) => `@page { size: ${page.size}; margin: 12mm 13mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${fontStack}; font-size: 9.4pt; line-height: 1.48; color: #1d2127; background: #fff; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; padding: 12mm 13mm; } }
a { color: inherit; text-decoration: none; }
header { display: grid; grid-template-columns: minmax(0, 1fr); column-gap: 14pt; align-items: end; }
header.with-photo { grid-template-columns: auto minmax(0, 1fr); }
.photo { grid-row: 1 / span 2; width: 27mm; height: 27mm; margin-bottom: 9pt; border-radius: 4pt; object-fit: cover; }
h1 { font-family: ${SERIF}; font-size: 27pt; font-weight: 700; line-height: 1.05; margin: 0; color: #15181d; }
.headline { font-size: 10.5pt; font-weight: 600; letter-spacing: 0.04em; margin: 4pt 0 9pt; color: var(--accent); }
.contact { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 4pt 16pt; margin: 0; padding: 7pt 12pt; border-radius: 3pt; background: #20252c; color: #eef0f3; font-size: 8.3pt; }
.ci { display: inline-flex; align-items: center; gap: 5pt; min-width: 0; }
.ci > span { min-width: 0; overflow-wrap: anywhere; }
.ico { width: 10pt; height: 10pt; flex: none; color: #fff; }
.contact .sep { display: none; }
.columns { display: grid; grid-template-columns: minmax(0, 1fr) ${SIDE_W}; column-gap: 9mm; align-items: start; }
.columns .sidebar { grid-column: 2; grid-row: 1; }
.columns .main { grid-column: 1; grid-row: 1; }
section { margin-top: 13pt; }
h2 { display: flex; align-items: center; gap: 6pt; font-family: ${SERIF}; font-size: 12.5pt; font-weight: 700; color: #15181d; margin: 0 0 7pt; padding-bottom: 4pt; border-bottom: 1.5pt solid var(--accent); break-after: avoid; }
.h-ico { width: 13pt; height: 13pt; flex: none; color: var(--accent); }
.entry { margin-bottom: 9pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 600; color: #15181d; }
.entry-title .meta { display: block; font-size: 8.4pt; font-style: italic; color: #5a626c; }
.dates { flex: none; font-size: 8.4pt; color: #3b424b; white-space: nowrap; font-variant-numeric: tabular-nums; }
.sidebar .entry-head { display: block; }
.sidebar .dates { display: block; white-space: normal; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.4pt; color: #49505a; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 2pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; }
.skills div { margin-bottom: 7pt; }
.skills dt { font-size: 8.4pt; font-weight: 600; color: #2b3139; margin-bottom: 3pt; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 3pt 4pt 0; padding: 1pt 6pt; border-radius: 2pt; background: var(--soft); color: var(--deep); font-size: 8.2pt; }
`;

export function renderSummit(
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
    sidebar: { keys: SUMMIT.sideSections, width: SIDE_W, side: SUMMIT.sidebarSide, header: 'top' },
    skillChips: true,
    contactIcons: true,
    headingIcons: true,
    photo,
    defaultAccent: SUMMIT.accent.default,
    accentColor,
    pattern,
  });
}
