import { renderResume } from './base.js';

export const LEDGER = {
  id: 'ledger',
  version: '1.0.0',
  name: 'Ledger',
  style: 'Sans-serif, headings in a margin column',
  columns: 2,
  fonts: ['IBM Plex Sans'],
  accent: { default: '#1f4e5f' },
  docxFont: 'Arial',
  bestFor:
    'Roles where a person reads the resume first, such as referrals, networking and direct email to a hiring manager.',
  tradeOffs:
    'Section headings sit in a narrow left column, which looks more designed but uses less width for content, so long resumes run longer. Some older applicant tracking systems mishandle any multi-column layout; use Clarity when you apply through one.',
  parsingNotes:
    "Same reading order as Clarity: each heading comes before its content in the document, and our export tests confirm pdf.js extracts sections in order. It's still a visual two-column layout, so parsers we haven't tested may differ.",
};

const FONT_STACK = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";

const css = (page, fontStack) => `@page { size: ${page.size}; margin: 13mm 15mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${fontStack}; font-size: 9.75pt; line-height: 1.42; color: #1b1f24; background: #fff; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; padding: 13mm 15mm; } }
a { color: inherit; text-decoration: none; }
header { padding-bottom: 8pt; margin-bottom: 12pt; border-bottom: 2pt solid var(--accent); }
h1 { font-size: 22pt; font-weight: 600; line-height: 1.05; margin: 0 0 3pt; letter-spacing: -0.015em; color: var(--accent); }
.headline { font-size: 11pt; font-weight: 500; margin: 0 0 4pt; color: #2b3138; }
.contact { font-size: 8.75pt; color: #3a4149; margin: 0; }
.sep { color: #8a929b; }
section { display: grid; grid-template-columns: 30mm minmax(0, 1fr); column-gap: 6mm; margin-top: 10pt; }
section > :not(h2) { grid-column: 2; }
h2 { grid-column: 1; grid-row: 1 / span 999; font-size: 8.75pt; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); margin: 1pt 0 0; break-after: avoid; }
.entry { margin-bottom: 7pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 600; }
.entry-title .meta { display: block; font-size: 8.75pt; color: #56606b; }
.dates { flex: none; font-size: 8.75pt; color: #3a4149; white-space: nowrap; font-variant-numeric: tabular-nums; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.75pt; color: #3a4149; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 1.5pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 2pt 9pt; }
.skills div { display: contents; }
.skills dt { font-weight: 600; }
.skills dd { margin: 0; }
`;

export function renderLedger(
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
    defaultAccent: LEDGER.accent.default,
    accentColor,
  });
}
