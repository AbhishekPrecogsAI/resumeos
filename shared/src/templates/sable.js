import { renderResume } from './base.js';

export const SABLE = {
  id: 'sable',
  version: '1.0.0',
  name: 'Sable',
  style: 'Compact, fits more on one page',
  columns: 1,
  fonts: ['IBM Plex Sans'],
  accent: { default: '#8a1f3d' },
  docxFont: 'Arial',
  bestFor:
    'Experienced engineers who need a lot on one page, and roles where reviewers expect a single page.',
  tradeOffs:
    'Smaller type (9pt) and tighter spacing fit noticeably more per page than Clarity, but it is denser to read. Skills sit in two columns. Check the preview at 100% before sending.',
  parsingNotes:
    'One column in reading order; the right-aligned contact block comes after the name in the document. Our pdf.js export tests confirm sections extract in order.',
};

const FONT_STACK = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";

const css = (page, fontStack) => `@page { size: ${page.size}; margin: 11mm 13mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${fontStack}; font-size: 9pt; line-height: 1.33; color: #1a1d23; background: #fff; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; padding: 11mm 13mm; } }
a { color: inherit; text-decoration: none; }
header { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 12pt; align-items: end; padding-bottom: 6pt; margin-bottom: 4pt; border-bottom: 2pt solid var(--accent); }
h1 { grid-column: 1; font-size: 20pt; font-weight: 600; line-height: 1.05; margin: 0; letter-spacing: -0.015em; color: var(--accent); }
.headline { grid-column: 1; font-size: 10pt; font-weight: 500; margin: 2pt 0 0; color: #3a404a; }
.contact { grid-column: 2; grid-row: 1 / span 2; margin: 0; font-size: 8pt; color: #3a404a; text-align: right; }
.contact .ci { display: block; }
.contact .sep { display: none; }
section { margin-top: 8pt; }
h2 { font-size: 8.5pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); margin: 0 0 4pt; padding-left: 5pt; border-left: 3pt solid var(--accent); line-height: 1.2; break-after: avoid; }
.entry { margin-bottom: 5pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 8pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 600; }
.entry-title .meta { display: inline; font-size: 8pt; color: #5a616c; }
.entry-title .meta::before { content: ' | '; color: #a3a9b2; }
.dates { flex: none; font-size: 8pt; color: #3a404a; white-space: nowrap; font-variant-numeric: tabular-nums; }
p { margin: 1.5pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8pt; color: #3a404a; }
ul { margin: 2pt 0 0; padding-left: 10pt; }
li { margin: 0.75pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2pt 16pt; }
.skills div { break-inside: avoid; }
.skills dt { display: inline; font-weight: 600; color: var(--deep); }
.skills dt::after { content: ': '; }
.skills dd { display: inline; margin: 0; }
`;

export function renderSable(
  content,
  layout = {},
  { pageSize = 'A4', fontCss = '', fontStack = FONT_STACK, accentColor = null } = {},
) {
  return renderResume(content, layout, {
    pageSize,
    fontCss,
    fontStack,
    css,
    contactItems: true,
    defaultAccent: SABLE.accent.default,
    accentColor,
  });
}
