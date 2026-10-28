import { renderResume } from './base.js';

export const VERTEX = {
  id: 'vertex',
  version: '1.0.0',
  name: 'Vertex',
  style: 'Bold colour sidebar with photo and icons',
  columns: 2,
  fonts: ['Outfit', 'Manrope'],
  accent: { default: '#0f6e66' },
  photo: true,
  docxFont: 'Arial',
  bestFor:
    'Standing out in a stack of PDFs: networking, referrals, portfolio links and roles where design sense matters.',
  tradeOffs:
    'A full-height colour sidebar holds an optional round photo, your name, contact details with icons, skill chips, education and certifications; those always stay in the sidebar. The coloured band uses more ink if printed. Two columns are riskier with applicant tracking systems; use Clarity when applying through one.',
  parsingNotes:
    'The sidebar comes first in the document, so extractors read it as a block, then the main column. Our pdf.js export tests confirm this, including on multi-page resumes. Icons are drawn shapes, not text; photos are ignored by applicant tracking systems.',
};

const FONT_STACK = "'Manrope', 'Helvetica Neue', Arial, sans-serif";
const DISPLAY = "'Outfit', 'Manrope', sans-serif";
const SIDE_W = '68mm';

const css = (
  page,
  fontStack,
) => `/* Decoration is painted with backgrounds, never positioned elements: positioned text is painted
   (and therefore extracted) after the rest of the page, which breaks reading order. */
/* Full-bleed page; column padding repeats on every page via box-decoration-break. */
@page { size: ${page.size}; margin: 0; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: linear-gradient(to right, var(--accent) 0, var(--accent) ${SIDE_W}, #fff ${SIDE_W}); }
body { margin: 0; font-family: ${fontStack}; font-size: 9.4pt; line-height: 1.5; color: #1b2029; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; } }
a { color: inherit; text-decoration: none; }
.main, .sidebar { -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.columns { display: grid; grid-template-columns: ${SIDE_W} minmax(0, 1fr); align-items: start; }
.sidebar { padding: 13mm 7mm 9mm 8mm; color: #fff; background: repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 2pt, transparent 2pt 9pt) 0 0 / 100% 46mm no-repeat; }
.main { padding: 13mm 12mm 9mm 10mm; }
header { text-align: left; margin-bottom: 12pt; }
.photo { display: block; width: 30mm; height: 30mm; margin: 0 0 10pt; border-radius: 50%; object-fit: cover; border: 3pt solid rgba(255,255,255,0.9); }
h1 { font-family: ${DISPLAY}; font-size: 23pt; font-weight: 700; line-height: 1.05; margin: 0; letter-spacing: -0.01em; color: #fff; }
.headline { font-size: 10pt; font-weight: 600; margin: 4pt 0 11pt; color: var(--on-dark); }
.contact { margin: 0; font-size: 8.4pt; }
.ci { display: flex; align-items: center; gap: 6pt; margin-bottom: 5pt; min-width: 0; }
.ci > span { min-width: 0; overflow-wrap: anywhere; }
.ico { width: 15pt; height: 15pt; flex: none; padding: 3pt; border-radius: 50%; background: rgba(255,255,255,0.16); color: #fff; }
.contact .sep { display: none; }
section { margin-top: 14pt; }
.main section:first-child { margin-top: 0; }
h2 { display: flex; align-items: center; gap: 7pt; font-family: ${DISPLAY}; font-size: 13pt; font-weight: 600; margin: 0 0 8pt; break-after: avoid; }
.main h2 { color: #141922; }
.main h2::before { content: ''; width: 8pt; height: 8pt; flex: none; background: var(--accent); clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); }
.main h2::after { content: ''; flex: 1; border-top: 0.75pt solid var(--rail); }
.sidebar h2 { font-size: 11.5pt; color: #fff; padding-bottom: 4pt; border-bottom: 1pt solid rgba(255,255,255,0.3); }
.entry { margin-bottom: 9pt; break-inside: avoid; }
.main .entry { padding: 0 0 2pt 16pt; background: radial-gradient(circle at 5pt 7.5pt, var(--accent) 0 3.3pt, transparent 3.5pt) no-repeat, linear-gradient(var(--rail), var(--rail)) 4.4pt 0 / 1.25pt 100% no-repeat; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 700; }
.entry-title .meta { display: block; font-size: 8.4pt; color: #5c6371; }
.dates { flex: none; font-size: 8.4pt; font-weight: 600; color: var(--accent); white-space: nowrap; font-variant-numeric: tabular-nums; }
.sidebar .entry-head { display: block; }
.sidebar .entry-title strong { color: #fff; }
.sidebar .entry-title .meta, .sidebar .dates { display: block; color: var(--on-dark); white-space: normal; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.4pt; color: #4a515e; }
.sidebar .links { color: var(--on-dark); }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 2pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; }
.skills div { margin-bottom: 7pt; }
.skills dt { font-size: 8.4pt; font-weight: 700; margin-bottom: 4pt; color: #fff; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 3pt 4pt 0; padding: 1.5pt 7pt; border-radius: 9pt; background: rgba(255,255,255,0.16); color: #fff; font-size: 8.2pt; font-weight: 600; }
`;

export function renderVertex(
  content,
  layout = {},
  { pageSize = 'A4', fontCss = '', fontStack = FONT_STACK, accentColor = null, photo = null } = {},
) {
  return renderResume(content, layout, {
    pageSize,
    fontCss,
    fontStack,
    css,
    sidebar: { keys: ['skills', 'education', 'certifications'], side: 'left', header: 'sidebar' },
    skillChips: true,
    contactIcons: true,
    photo,
    defaultAccent: VERTEX.accent.default,
    accentColor,
  });
}
