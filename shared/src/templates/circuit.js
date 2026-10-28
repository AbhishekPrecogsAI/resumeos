import { renderResume } from './base.js';

export const CIRCUIT = {
  id: 'circuit',
  version: '1.0.0',
  name: 'Circuit',
  style: 'Single column with a contact panel and two-tone rules',
  columns: 1,
  fonts: ['IBM Plex Sans'],
  accent: { default: '#23304a' },
  photo: false,
  docxFont: 'Arial',
  bestFor:
    'Engineering, IT and data roles: a dense, technical single column that still looks designed.',
  tradeOffs:
    'Your name and headline sit left of a colour panel with stacked contact details and icons. Sections follow in one column in your order, each under a two-tone rule; skills are tags. No photo. Single column keeps it friendly to applicant tracking systems.',
  parsingNotes:
    'Single column in layout order. The contact panel is part of the header, which comes first, so contact details extract right after your name. Icons are drawn shapes, not text.',
};

const FONT_STACK = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const PANEL_W = '62mm';

const css = (page, fontStack) => `@page { size: ${page.size}; margin: 12mm 14mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${fontStack}; font-size: 9.4pt; line-height: 1.46; color: #1c2127; background: #fff; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; padding: 12mm 14mm; } }
a { color: inherit; text-decoration: none; }
header { display: grid; grid-template-columns: minmax(0, 1fr) ${PANEL_W}; column-gap: 12pt; align-items: center; margin-bottom: 4pt; }
h1 { grid-column: 1; grid-row: 1; align-self: end; font-size: 25pt; font-weight: 600; line-height: 1.06; margin: 0; letter-spacing: -0.01em; color: #121519; }
.headline { grid-column: 1; grid-row: 2; align-self: start; font-size: 10.5pt; font-weight: 600; margin: 4pt 0 0; color: var(--accent); }
.contact { grid-column: 2; grid-row: 1 / span 2; margin: 0; padding: 9pt 11pt; border-radius: 4pt; background: var(--accent); color: #fff; font-size: 8.2pt; }
.ci { display: flex; align-items: center; gap: 6pt; margin: 1.5pt 0; min-width: 0; }
.ci > span { min-width: 0; overflow-wrap: anywhere; }
.ico { width: 13pt; height: 13pt; flex: none; padding: 2pt; border-radius: 3pt; background: rgba(255,255,255,0.14); color: #fff; }
.contact .sep { display: none; }
section { margin-top: 12pt; }
h2 { display: flex; align-items: center; gap: 6pt; font-size: 10.5pt; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #121519; margin: 0 0 7pt; padding-bottom: 5pt; break-after: avoid;
  background: linear-gradient(var(--accent), var(--accent)) 0 100% / 34% 2pt no-repeat, linear-gradient(var(--rail), var(--rail)) 0 100% / 100% 2pt no-repeat; }
.h-ico { width: 13pt; height: 13pt; flex: none; color: var(--accent); }
.entry { margin-bottom: 8pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 12pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 600; color: #121519; }
.entry-title .meta { display: block; font-size: 8.4pt; color: #57606a; }
.dates { flex: none; font-size: 8.4pt; font-weight: 600; color: var(--accent); white-space: nowrap; font-variant-numeric: tabular-nums; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.4pt; color: #49515b; }
ul { margin: 3pt 0 0; padding-left: 12pt; }
li { margin: 1.5pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; display: grid; grid-template-columns: 34mm minmax(0, 1fr); gap: 4pt 10pt; }
.skills div { display: contents; }
.skills dt { font-size: 8.4pt; font-weight: 600; color: #333a43; padding-top: 1.5pt; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 3pt 3pt 0; padding: 1pt 6pt; border-radius: 2pt; background: var(--soft); color: var(--deep); font-size: 8.2pt; font-weight: 500; }
`;

export function renderCircuit(
  content,
  layout = {},
  {
    pageSize = 'A4',
    fontCss = '',
    fontStack = FONT_STACK,
    editable = false,
    accentColor = null,
    pattern = 'none',
  } = {},
) {
  return renderResume(content, layout, {
    editable,
    pageSize,
    fontCss,
    fontStack,
    css,
    skillChips: true,
    contactIcons: true,
    headingIcons: true,
    levelStyle: 'bar',
    defaultAccent: CIRCUIT.accent.default,
    accentColor,
    pattern,
  });
}
