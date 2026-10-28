import { renderResume } from './base.js';

export const MERIDIAN = {
  id: 'meridian',
  version: '1.0.0',
  name: 'Meridian',
  style: 'Dark sidebar, two columns',
  columns: 2,
  fonts: ['IBM Plex Sans'],
  accent: { default: '#17323f' },
  docxFont: 'Arial',
  bestFor:
    'Portfolio links, networking, referrals and direct emails, where a person reads it first and a strong look helps you stand out.',
  tradeOffs:
    'Name, contact, skills, education and certifications sit in a full-height dark sidebar; experience and projects get the wider column. Those sidebar sections always stay in the sidebar, whatever order you choose. The dark band uses more ink if printed. Multi-column layouts are riskier with applicant tracking systems; prefer Clarity when applying through one.',
  parsingNotes:
    "The sidebar comes first in the document, so extractors read it as a block, then the main column, rather than mixing lines. Our pdf.js export tests confirm every section extracts in that order. Parsers we haven't tested may still read two columns differently.",
};

const FONT_STACK = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const SIDE_W = '70mm';

const css = (
  page,
  fontStack,
) => `/* Full-bleed page; column padding repeats on every page via box-decoration-break. */
@page { size: ${page.size}; margin: 0; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: linear-gradient(to right, var(--accent) 0, var(--accent) ${SIDE_W}, #fff ${SIDE_W}); }
body { margin: 0; font-family: ${fontStack}; font-size: 9.5pt; line-height: 1.42; color: #1b1f24; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; } }
a { color: inherit; text-decoration: none; }
.main, .sidebar { -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.columns { display: grid; grid-template-columns: ${SIDE_W} minmax(0, 1fr); align-items: start; }
.sidebar { padding: 14mm 7mm 8mm 9mm; color: #e3ecef; }
.main { padding: 14mm 12mm 8mm 9mm; }
header { margin-bottom: 9pt; }
h1 { font-size: 21pt; font-weight: 600; line-height: 1.08; margin: 0 0 4pt; color: #fff; letter-spacing: -0.01em; }
.headline { font-size: 10pt; font-weight: 500; margin: 0 0 9pt; color: var(--on-dark); }
.contact { margin: 0; font-size: 8.5pt; color: #d5e1e5; }
.contact .ci { display: block; margin-bottom: 2.5pt; overflow-wrap: anywhere; }
.contact .ico { width: 9.5pt; height: 9.5pt; flex: none; }
.ci { display: inline-flex; align-items: center; gap: 4pt; }
.contact .sep { display: none; }
section { margin-top: 12pt; }
.main section:first-child { margin-top: 0; }
h2 { font-size: 9pt; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 6pt; break-after: avoid; }
.main h2 { color: var(--accent); padding-bottom: 3pt; border-bottom: 1.25pt solid var(--accent); }
.sidebar h2 { color: var(--on-dark); padding-bottom: 3pt; border-bottom: 0.75pt solid rgba(255,255,255,0.22); }
.entry { margin-bottom: 8pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 600; }
.entry-title .meta { display: block; font-size: 8.5pt; color: #56606b; }
.dates { flex: none; font-size: 8.5pt; color: #3a4149; white-space: nowrap; font-variant-numeric: tabular-nums; }
.sidebar .entry-head { display: block; }
.sidebar .entry-title strong { color: #fff; }
.sidebar .entry-title .meta, .sidebar .dates { display: block; color: #b9cad0; white-space: normal; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.5pt; color: #3a4149; }
.sidebar .links { color: #d5e1e5; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 1.5pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; }
.skills div { margin-bottom: 6pt; }
.skills dt { font-size: 8.5pt; font-weight: 600; color: #fff; margin-bottom: 3pt; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 2.5pt 3pt 0; padding: 1pt 5pt; border-radius: 3pt; background: rgba(255,255,255,0.12); color: #eef4f6; font-size: 8.25pt; }
.main .chip { background: var(--soft); color: var(--deep); }
`;

export function renderMeridian(
  content,
  layout = {},
  {
    pageSize = 'A4',
    fontCss = '',
    fontStack = FONT_STACK,
    editable = false,
    accentColor = null,
  } = {},
) {
  return renderResume(content, layout, {
    editable,
    pageSize,
    fontCss,
    fontStack,
    css,
    sidebar: { keys: ['skills', 'education', 'certifications'], side: 'left', header: 'sidebar' },
    skillChips: true,
    contactItems: true,
    contactIcons: true,
    defaultAccent: MERIDIAN.accent.default,
    accentColor,
  });
}
