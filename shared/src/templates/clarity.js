import { renderResume } from './base.js';

export const CLARITY = {
  id: 'clarity',
  version: '1.0.0',
  name: 'Clarity',
  style: 'Plain, single column',
  columns: 1,
  fonts: ['Source Serif 4'],
  accent: null, // Deliberately plain black: the safest choice for applicant tracking systems.
  docxFont: 'Georgia',
  bestFor:
    'Applications submitted through applicant tracking systems, and any role where a reader skims.',
  tradeOffs:
    'Deliberately restrained: no sidebar, icons, photo or skill bars. Long profiles run to a second page rather than shrinking text.',
  parsingNotes:
    'One column of real, selectable text with standard headings. In our export tests, text extracted with pdf.js keeps sections in reading order and links stay clickable. Each export is re-checked and the results are shown before download.',
};

const FONT_STACK = "'Source Serif 4', 'Charter', 'Georgia', 'Times New Roman', serif";

const css = (page, fontStack) => `@page { size: ${page.size}; margin: 14mm 16mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${fontStack}; font-size: 10.5pt; line-height: 1.38; color: #16181d; background: #fff; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; padding: 14mm 16mm; } }
a { color: inherit; text-decoration: none; }
header { margin-bottom: 10pt; }
h1 { font-size: 21pt; font-weight: 600; line-height: 1.1; margin: 0 0 2pt; letter-spacing: -0.01em; }
.headline { font-size: 11.5pt; margin: 0 0 5pt; color: #2c3038; }
.contact { font-size: 9.5pt; color: #2c3038; margin: 0; }
.sep { color: #6b7280; }
section { margin-top: 11pt; }
h2 { font-size: 10.5pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 5pt; padding-bottom: 2pt; border-bottom: 0.75pt solid #9aa1ab; break-after: avoid; }
.entry { margin-bottom: 7pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 12pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title .meta { display: block; font-size: 9.5pt; color: #4b5260; }
.dates { flex: none; font-size: 9.5pt; color: #2c3038; white-space: nowrap; font-variant-numeric: tabular-nums; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 9.5pt; color: #2c3038; }
ul { margin: 3pt 0 0; padding-left: 13pt; }
li { margin: 1.5pt 0; padding-left: 1pt; }
.skills { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 2pt 10pt; }
.skills div { display: contents; }
.skills dt { font-weight: 600; }
.skills dd { margin: 0; }
`;

export function renderClarity(
  content,
  layout = {},
  { pageSize = 'A4', fontCss = '', fontStack = FONT_STACK } = {},
) {
  return renderResume(content, layout, { pageSize, fontCss, fontStack, css });
}
