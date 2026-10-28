import { renderResume } from './base.js';

export const CADENCE = {
  id: 'cadence',
  version: '1.0.0',
  name: 'Cadence',
  style: 'Dates in a left column, accent headings',
  columns: 1,
  fonts: ['IBM Plex Sans'],
  accent: { default: '#1f4fb4' },
  docxFont: 'Arial',
  bestFor:
    'Steady career progressions, where seeing when each role happened at a glance helps the story.',
  tradeOffs:
    'Dates sit in a narrow left column beside each entry, with a thin accent rule, so the text column is slightly narrower than Clarity and long resumes run a little longer.',
  parsingNotes:
    "One column in reading order. Each entry's title comes before its dates in the document, as in Clarity, so extractors read title, then dates; our pdf.js export tests confirm it.",
};

const FONT_STACK = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const GUTTER = '27mm';

const css = (page, fontStack) => `@page { size: ${page.size}; margin: 14mm 15mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${fontStack}; font-size: 9.75pt; line-height: 1.45; color: #1b1f26; background: #fff; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; padding: 14mm 15mm; } }
a { color: inherit; text-decoration: none; }
header { margin-bottom: 12pt; padding-left: calc(${GUTTER} + 5mm); }
h1 { font-size: 24pt; font-weight: 600; line-height: 1.05; margin: 0 0 3pt; letter-spacing: -0.015em; }
.headline { font-size: 11pt; font-weight: 500; margin: 0 0 5pt; color: var(--accent); }
.contact { margin: 0; font-size: 8.75pt; color: #3c4450; }
.sep { color: #9aa1ab; }
section { margin-top: 12pt; }
h2 { font-size: 9.75pt; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); margin: 0 0 7pt calc(${GUTTER} + 5mm); padding-bottom: 2.5pt; border-bottom: 0.75pt solid var(--rail); break-after: avoid; }
section > :not(h2):not(.entry) { margin-left: calc(${GUTTER} + 5mm); }
.entry { display: grid; grid-template-columns: ${GUTTER} minmax(0, 1fr); column-gap: 5mm; margin-bottom: 8pt; break-inside: avoid; }
.entry > * { grid-column: 2; }
.entry-head { display: contents; }
.entry-title { grid-column: 2; grid-row: 1; min-width: 0; }
.entry-title strong { font-weight: 600; }
.entry-title .meta { display: block; font-size: 8.5pt; color: #59616d; }
.dates { grid-column: 1; grid-row: 1 / span 40; align-self: stretch; padding: 1pt 4mm 0 0; border-right: 1.25pt solid var(--rail); text-align: right; font-size: 8.5pt; font-weight: 500; color: var(--accent); font-variant-numeric: tabular-nums; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.5pt; color: #3c4450; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 1.5pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 3pt 10pt; }
.skills div { display: contents; }
.skills dt { font-weight: 600; color: var(--deep); }
.skills dd { margin: 0; }
`;

export function renderCadence(
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
    defaultAccent: CADENCE.accent.default,
    accentColor,
    pattern,
  });
}
