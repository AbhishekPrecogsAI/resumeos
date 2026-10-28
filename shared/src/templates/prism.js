import { renderResume } from './base.js';

export const PRISM = {
  id: 'prism',
  version: '1.0.0',
  name: 'Prism',
  style: 'Accent stripe, light tinted sidebar',
  columns: 2,
  fonts: ['IBM Plex Sans'],
  accent: { default: '#5b2a6e' },
  docxFont: 'Arial',
  bestFor:
    'Creative-leaning engineering roles (frontend, developer relations, design systems) where a bit of colour fits, but you want a lighter look than Meridian.',
  tradeOffs:
    'A thin accent stripe across the top and a lightly tinted left sidebar with skills, education and certifications; those always stay in the sidebar, whatever order you choose. Multi-column layouts are riskier with applicant tracking systems; prefer Clarity when applying through one.',
  parsingNotes:
    "Header first, then the sidebar, then the main column, so extractors read each column as a block on every page. Our pdf.js export tests confirm this. Parsers we haven't tested may read two columns differently.",
};

const FONT_STACK = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const SIDE_W = '64mm';

const css = (
  page,
  fontStack,
) => `/* Full-bleed page; column padding repeats on every page via box-decoration-break. */
@page { size: ${page.size}; margin: 0; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: linear-gradient(to right, var(--soft) 0, var(--soft) ${SIDE_W}, #fff ${SIDE_W}); }
body { margin: 0; font-family: ${fontStack}; font-size: 9.5pt; line-height: 1.44; color: #1b1e25; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; } }
a { color: inherit; text-decoration: none; }
header { background: #fff; border-top: 5mm solid var(--accent); padding: 9mm 14mm 7mm 10mm; border-bottom: 0.75pt solid var(--rail); }
h1 { font-size: 23pt; font-weight: 600; line-height: 1.05; margin: 0 0 3pt; letter-spacing: -0.015em; color: var(--accent); }
.headline { font-size: 10.5pt; font-weight: 500; margin: 0 0 5pt; color: #3a3f4b; }
.contact { margin: 0; font-size: 8.5pt; color: #3a3f4b; }
.ico { width: 9.5pt; height: 9.5pt; flex: none; }
.ci { display: inline-flex; align-items: center; gap: 4pt; }
.contact .sep { color: var(--rail); }
.main, .sidebar { -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.columns { display: grid; grid-template-columns: ${SIDE_W} minmax(0, 1fr); align-items: start; }
.sidebar { padding: 8mm 7mm 8mm 10mm; }
.main { padding: 8mm 14mm 8mm 9mm; }
section { margin-top: 12pt; }
.main section:first-child, .sidebar section:first-child { margin-top: 0; }
h2 { display: flex; align-items: center; gap: 5pt; font-size: 9.25pt; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--accent); margin: 0 0 6pt; break-after: avoid; }
h2::before { content: ''; width: 6pt; height: 6pt; border-radius: 1.5pt; background: var(--accent); flex: none; }
.entry { margin-bottom: 8pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 600; }
.entry-title .meta { display: block; font-size: 8.5pt; color: #5a5f6b; }
.dates { flex: none; font-size: 8.5pt; color: var(--deep); white-space: nowrap; font-variant-numeric: tabular-nums; }
.sidebar .entry-head { display: block; }
.sidebar .dates { display: block; white-space: normal; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.5pt; color: #3a3f4b; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 1.5pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; }
.skills div { margin-bottom: 6pt; }
.skills dt { font-size: 8.5pt; font-weight: 600; color: var(--deep); margin-bottom: 3pt; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 2.5pt 3pt 0; padding: 0.75pt 5pt; border: 0.75pt solid var(--rail); border-radius: 3pt; background: #fff; color: var(--deep); font-size: 8.25pt; }
`;

export function renderPrism(
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
    sidebar: { keys: ['skills', 'education', 'certifications'], side: 'left', header: 'top' },
    skillChips: true,
    contactIcons: true,
    defaultAccent: PRISM.accent.default,
    accentColor,
  });
}
