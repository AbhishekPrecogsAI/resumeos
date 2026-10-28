import { renderResume } from './base.js';

export const BEACON = {
  id: 'beacon',
  version: '1.0.0',
  name: 'Beacon',
  style: 'Minimal single column with icon headings and skill tags',
  columns: 1,
  fonts: ['IBM Plex Sans'],
  accent: { default: '#1f6f8b' },
  photo: false,
  docxFont: 'Arial',
  bestFor:
    'Conservative industries and online applications: a quiet, modern page that reads cleanly in applicant tracking systems.',
  tradeOffs:
    'One column in your section order. Your name sits beside a two-column contact grid; headings have a small icon and a hairline rule; skills are outlined tags. No photo. Low on decoration, so it prints well in black and white.',
  parsingNotes:
    'Single column in layout order, so text extracts in the same order you read it. Icons are drawn shapes, not text.',
};

const FONT_STACK = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";

const css = (page, fontStack) => `@page { size: ${page.size}; margin: 14mm 16mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${fontStack}; font-size: 9.6pt; line-height: 1.48; color: #1d2228; background: #fff; overflow-wrap: break-word; }
@media screen { body { width: ${page.width}; min-height: ${page.minHeight}; padding: 14mm 16mm; } }
a { color: inherit; text-decoration: none; }
header { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.95fr); column-gap: 16pt; align-items: end; padding-bottom: 10pt; border-bottom: 1.5pt solid var(--accent); }
h1 { grid-column: 1; font-size: 24pt; font-weight: 600; line-height: 1.08; margin: 0; letter-spacing: -0.01em; color: #12161b; }
.headline { grid-column: 1; font-size: 10.5pt; font-weight: 500; margin: 3pt 0 0; color: var(--accent); }
.contact { grid-column: 2; grid-row: 1 / span 2; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3pt 10pt; margin: 0; font-size: 8.4pt; color: #39414b; }
.ci { display: flex; align-items: center; gap: 5pt; min-width: 0; }
.ci > span { min-width: 0; overflow-wrap: anywhere; }
.ico { width: 9.5pt; height: 9.5pt; flex: none; color: var(--accent); }
.contact .sep { display: none; }
section { margin-top: 13pt; }
h2 { display: flex; align-items: center; gap: 6pt; font-size: 10pt; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #12161b; margin: 0 0 7pt; break-after: avoid; }
h2::after { content: ''; flex: 1; border-top: 0.75pt solid #cfd5dc; }
.h-ico { width: 12pt; height: 12pt; flex: none; color: var(--accent); }
.entry { margin-bottom: 8pt; break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; gap: 12pt; align-items: baseline; }
.entry-title { min-width: 0; }
.entry-title strong { font-weight: 600; color: #12161b; }
.entry-title .meta { display: block; font-size: 8.5pt; color: #59626d; }
.dates { flex: none; font-size: 8.5pt; color: #39414b; white-space: nowrap; font-variant-numeric: tabular-nums; }
p { margin: 2pt 0 0; }
.summary { margin: 0; }
.tech, .links { font-size: 8.5pt; color: #4a525c; }
ul { margin: 3pt 0 0; padding-left: 12pt; }
li { margin: 1.5pt 0; padding-left: 1pt; }
li::marker { color: var(--accent); }
.skills { margin: 0; display: grid; grid-template-columns: 30mm minmax(0, 1fr); gap: 4pt 10pt; }
.skills div { display: contents; }
.skills dt { font-size: 8.5pt; font-weight: 600; color: #39414b; padding-top: 1.5pt; }
.skills dd { margin: 0; }
.chip { display: inline-block; margin: 0 3pt 3pt 0; padding: 0.5pt 6pt; border-radius: 3pt; border: 0.75pt solid var(--rail); color: var(--deep); font-size: 8.3pt; }
`;

export function renderBeacon(
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
    defaultAccent: BEACON.accent.default,
    accentColor,
    pattern,
  });
}
