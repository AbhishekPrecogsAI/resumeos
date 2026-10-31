import { renderResume } from './base.js';

export const ATLAS = {
  id: 'atlas',
  version: '1.0.0',
  name: 'Atlas',
  style: 'Charcoal sidebar with photo and icon headings',
  columns: 2,
  // Sections shown in the sidebar unless the resume moves them.
  sideSections: ['skills', 'education', 'certifications', 'languages', 'interests'],
  // Default sidebar side; a resume can flip it (layout.sidebarSide).
  sidebarSide: 'left',
  fonts: ['Manrope'],
  accent: { default: '#1f6fb4' },
  photo: true,
  docxFont: 'Arial',
  bestFor:
    'Career changers and recent graduates who want skills and education seen first, next to a compact work history.',
  tradeOffs:
    'A full-height charcoal sidebar holds an optional photo, your name, contact details, skills, education and certifications; those always stay in the sidebar. Every heading carries a small icon in your accent colour. Two columns are riskier with applicant tracking systems; use Clarity when applying through one.',
  parsingNotes:
    'The sidebar comes first in the document, so extractors read it as a block, then the main column. Heading and contact icons are drawn shapes, not text. Photos are ignored by applicant tracking systems.',
};

const FONT_STACK = "'Manrope', 'Helvetica Neue', Arial, sans-serif";
const SIDE_W = '66mm';
const INK = '#1f2630';

const css = (
  page,
  fontStack,
) => `/* Decoration is painted with backgrounds, never positioned elements: positioned text is painted
   (and therefore extracted) after the rest of the page, which breaks reading order. */
/* Full-bleed page; column padding repeats on every page via box-decoration-break. */
@page { size: ${page.size}; margin: 0; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: linear-gradient(to right, ${INK} 0, ${INK} ${SIDE_W}, #fff ${SIDE_W}); }
body { margin: 0; font-family: ${fontStack}; font-size: 9.3pt; line-height: 1.5; color: #1c222b; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; } }
a { color: inherit; text-decoration: none; }
.main, .sidebar { -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.columns { display: grid; grid-template-columns: ${SIDE_W} minmax(0, 1fr); align-items: start; }
.sidebar { padding: 12mm 7mm 9mm 8mm; color: #d9dee6; background: linear-gradient(var(--accent), var(--accent)) 0 0 / 100% 3mm no-repeat; }
.main { padding: 13mm 12mm 9mm 9mm; }
header { margin-bottom: 4pt; }
.photo { display: block; width: 32mm; height: 32mm; margin: 0 0 10pt; border-radius: 50%; object-fit: cover; border: 2.5pt solid var(--accent); }
h1 { font-size: 21pt; font-weight: 800; line-height: 1.08; margin: 0; letter-spacing: -0.015em; color: #fff; }
.headline { font-size: 9.8pt; font-weight: 600; margin: 4pt 0 10pt; color: #aeb8c6; }
.contact { margin: 0; font-size: 8.3pt; }
.ci { display: flex; align-items: center; gap: 6pt; margin-bottom: 4pt; min-width: 0; }
.ci > span { min-width: 0; overflow-wrap: anywhere; }
.ico { width: 10pt; height: 10pt; flex: none; color: #fff; }
.contact .sep { display: none; }
section { margin-top: 13pt; }
.main section:first-child { margin-top: 0; }
h2 { display: flex; align-items: center; gap: 7pt; font-size: 10pt; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 8pt; break-after: avoid; }
.h-ico { width: 17pt; height: 17pt; flex: none; padding: 3.5pt; border-radius: 50%; }
.main h2 { color: #161b22; padding-bottom: 5pt; border-bottom: 0.75pt solid #d5dae2; }
.main .h-ico { background: var(--accent); color: #fff; }
.sidebar h2 { color: #fff; }
.sidebar .h-ico { background: rgba(255,255,255,0.1); color: #fff; }
.entry { margin-bottom: 9pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 700; color: #161b22; }
.entry-title .meta { display: block; font-size: 8.3pt; font-style: italic; color: #5a6270; }
.dates { flex: none; font-size: 8.3pt; color: #4a525f; white-space: nowrap; font-variant-numeric: tabular-nums; }
.sidebar .entry-head { display: block; }
.sidebar .entry-title strong { color: #fff; }
.sidebar .entry-title .meta, .sidebar .dates { display: block; color: #aeb8c6; white-space: normal; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.3pt; color: #4a525f; }
.sidebar .links { color: #c6ced9; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 2pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; }
.skills div { margin-bottom: 7pt; }
.skills dt { font-size: 8.3pt; font-weight: 700; margin-bottom: 4pt; color: #fff; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 3pt 4pt 0; padding: 1.5pt 6pt; border-radius: 3pt; border: 0.75pt solid rgba(255,255,255,0.35); color: #fff; font-size: 8.1pt; font-weight: 600; }
.main .chip { border-color: var(--rail); color: var(--deep); }
`;

export function renderAtlas(
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
      keys: ATLAS.sideSections,
      width: SIDE_W,
      side: ATLAS.sidebarSide,
      header: 'sidebar',
    },
    skillChips: true,
    contactIcons: true,
    headingIcons: true,
    levelStyle: 'bar',
    photo,
    defaultAccent: ATLAS.accent.default,
    accentColor,
    pattern,
    pageBackground: `linear-gradient(to right, ${INK} 0, ${INK} ${SIDE_W}, #fff ${SIDE_W})`,
  });
}
