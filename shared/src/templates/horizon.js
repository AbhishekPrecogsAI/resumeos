import { renderResume } from './base.js';

export const HORIZON = {
  id: 'horizon',
  version: '1.0.0',
  name: 'Horizon',
  style: 'Single column with a timeline and skill chips',
  columns: 1,
  fonts: ['IBM Plex Sans'],
  accent: { default: '#0f6e66' },
  docxFont: 'Arial',
  bestFor:
    'When you want something more visual than Clarity but still one column: product companies, startups and design-aware teams.',
  tradeOffs:
    'Roles, projects and education hang off a timeline rail, and skills show as chips. It takes slightly more vertical space than Clarity, so long resumes run a little longer.',
  parsingNotes:
    'One column in reading order, like Clarity. The decoration is drawn with CSS, not text or images, so extracted text is unaffected; our pdf.js export tests confirm this.',
};

const FONT_STACK = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";

const css = (
  page,
  fontStack,
) => `/* Decoration is painted with backgrounds, never positioned elements: positioned text is painted
   (and therefore extracted) after the rest of the page, which breaks reading order. */
@page { size: ${page.size}; margin: 13mm 15mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${fontStack}; font-size: 9.75pt; line-height: 1.45; color: #1a2026; background: #fff; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; padding: 13mm 15mm; } }
a { color: inherit; text-decoration: none; }
header { margin-bottom: 12pt; }
h1 { font-size: 26pt; font-weight: 600; line-height: 1.02; margin: 0 0 3pt; letter-spacing: -0.02em; }
.headline { font-size: 11pt; font-weight: 500; margin: 0 0 8pt; color: var(--accent); }
.contact { margin: 0; font-size: 8.5pt; }
.contact .ci { display: inline-flex; align-items: center; gap: 4pt; margin: 0 4pt 4pt 0; padding: 1pt 6pt; border-radius: 9pt; background: var(--soft); color: var(--deep); }
.contact .ico { width: 9.5pt; height: 9.5pt; flex: none; }
.ci { display: inline-flex; align-items: center; gap: 4pt; }
.contact .sep { display: none; }
section { margin-top: 13pt; }
h2 { display: flex; align-items: center; gap: 7pt; font-size: 9.5pt; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--accent); margin: 0 0 7pt; break-after: avoid; }
h2::after { content: ''; flex: 1; border-top: 0.75pt solid var(--rail); }
.entry { margin-bottom: 8pt; break-inside: avoid; }
section[data-section="experience"] .entry, section[data-section="projects"] .entry, section[data-section="education"] .entry { padding: 0 0 2pt 17pt; background: radial-gradient(circle at 5pt 7.5pt, #fff 0 2.1pt, var(--accent) 2.3pt 4pt, transparent 4.2pt) no-repeat, linear-gradient(var(--rail), var(--rail)) 4.4pt 0 / 1.25pt 100% no-repeat; }
.entry-head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 600; }
.entry-title .meta { display: block; font-size: 8.5pt; color: #58626c; }
.dates { flex: none; font-size: 8.5pt; color: var(--accent); font-weight: 500; white-space: nowrap; font-variant-numeric: tabular-nums; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.5pt; color: #3d4650; }
ul { margin: 3pt 0 0; padding-left: 11pt; }
li { margin: 1.5pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 4pt 10pt; align-items: baseline; }
.skills div { display: contents; }
.skills dt { font-size: 8.75pt; font-weight: 600; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 2.5pt 2.5pt 0; padding: 0.75pt 6pt; border-radius: 9pt; background: var(--soft); color: var(--deep); font-size: 8.5pt; }
`;

export function renderHorizon(
  content,
  layout = {},
  { pageSize = 'A4', fontCss = '', fontStack = FONT_STACK, accentColor = null } = {},
) {
  return renderResume(content, layout, {
    pageSize,
    fontCss,
    fontStack,
    css,
    skillChips: true,
    contactItems: true,
    contactIcons: true,
    defaultAccent: HORIZON.accent.default,
    accentColor,
  });
}
