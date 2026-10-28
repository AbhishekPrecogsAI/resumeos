import { renderResume } from './base.js';

export const HORIZON = {
  id: 'horizon',
  version: '1.0.0',
  name: 'Horizon',
  style: 'Single column with a timeline and skill chips',
  columns: 1,
  fonts: ['IBM Plex Sans'],
  docxFont: 'Arial',
  bestFor:
    'When you want something more visual than Clarity but still one column: product companies, startups and design-aware teams.',
  tradeOffs:
    'Roles, projects and education hang off a timeline rail, and skills show as chips. It takes slightly more vertical space than Clarity, so long resumes run a little longer.',
  parsingNotes:
    'One column in reading order, like Clarity. The decoration is drawn with CSS, not text or images, so extracted text is unaffected; our pdf.js export tests confirm this.',
};

const FONT_STACK = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
const ACCENT = '#0f6e66';
const SOFT = '#e7f3f1';
const RAIL = '#b9dcd7';

const css = (page, fontStack) => `@page { size: ${page.size}; margin: 13mm 15mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${fontStack}; font-size: 9.75pt; line-height: 1.45; color: #1a2026; background: #fff; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; padding: 13mm 15mm; } }
a { color: inherit; text-decoration: none; }
header { margin-bottom: 12pt; }
h1 { font-size: 26pt; font-weight: 600; line-height: 1.02; margin: 0 0 3pt; letter-spacing: -0.02em; }
.headline { font-size: 11pt; font-weight: 500; margin: 0 0 8pt; color: ${ACCENT}; }
.contact { margin: 0; font-size: 8.5pt; }
.contact .ci { display: inline-block; margin: 0 4pt 4pt 0; padding: 1pt 6pt; border-radius: 9pt; background: ${SOFT}; color: #134e48; }
.contact .sep { display: none; }
section { margin-top: 13pt; }
h2 { display: flex; align-items: center; gap: 7pt; font-size: 9.5pt; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: ${ACCENT}; margin: 0 0 7pt; break-after: avoid; }
h2::after { content: ''; flex: 1; border-top: 0.75pt solid ${RAIL}; }
.entry { margin-bottom: 8pt; break-inside: avoid; }
section[data-section="experience"] .entry, section[data-section="projects"] .entry, section[data-section="education"] .entry { position: relative; margin-left: 4pt; padding-left: 13pt; padding-bottom: 2pt; border-left: 1.25pt solid ${RAIL}; }
section[data-section="experience"] .entry::before, section[data-section="projects"] .entry::before, section[data-section="education"] .entry::before { content: ''; position: absolute; left: -4.6pt; top: 3.2pt; width: 8pt; height: 8pt; border-radius: 50%; background: #fff; border: 2pt solid ${ACCENT}; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 600; }
.entry-title .meta { display: block; font-size: 8.5pt; color: #58626c; }
.dates { flex: none; font-size: 8.5pt; color: ${ACCENT}; font-weight: 500; white-space: nowrap; font-variant-numeric: tabular-nums; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.5pt; color: #3d4650; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 1.5pt 0; padding-left: 1pt; }
li::marker { color: ${ACCENT}; }
.skills { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 4pt 10pt; align-items: baseline; }
.skills div { display: contents; }
.skills dt { font-size: 8.75pt; font-weight: 600; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 2.5pt 2.5pt 0; padding: 0.75pt 6pt; border-radius: 9pt; background: ${SOFT}; color: #134e48; font-size: 8.5pt; }
`;

export function renderHorizon(
  content,
  layout = {},
  { pageSize = 'A4', fontCss = '', fontStack = FONT_STACK } = {},
) {
  return renderResume(content, layout, {
    pageSize,
    fontCss,
    fontStack,
    css,
    skillChips: true,
    contactItems: true,
  });
}
