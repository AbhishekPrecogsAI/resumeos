import { escapeHtml as e, safeHref, displayUrl } from '../escape.js';
import { formatRange } from '../dates.js';
import { SECTION_TITLES, resolveSectionOrder, bulletText } from '../resumeModel.js';

export const CLARITY = {
  id: 'clarity',
  version: '1.0.0',
  name: 'Clarity',
  style: 'Plain, single column',
  columns: 1,
  bestFor:
    'Applications submitted through applicant tracking systems, and any role where a reader skims.',
  tradeOffs:
    'Deliberately restrained: no sidebar, icons, photo or skill bars. Long profiles run to a second page rather than shrinking text.',
  parsingNotes:
    'One column, real text, standard section headings in reading order. Export text-extraction checks arrive with PDF export.',
};

const PAGE = {
  A4: { size: 'A4', width: '210mm', minHeight: '297mm' },
  Letter: { size: 'letter', width: '8.5in', minHeight: '11in' },
};

const DEFAULT_FONT_STACK = "'Source Serif 4', 'Charter', 'Georgia', 'Times New Roman', serif";

function link(url, text) {
  const href = safeHref(url);
  const label = e(text ?? displayUrl(url));
  return href ? `<a href="${e(href)}">${label}</a>` : label;
}

function bullets(list) {
  const items = (list ?? []).map(bulletText).filter((text) => text.trim() !== '');
  if (!items.length) return '';
  return `<ul>${items.map((text) => `<li>${e(text)}</li>`).join('')}</ul>`;
}

function visibleItems(items, hidden) {
  return (items ?? []).filter((item) => !hidden.has(item.id));
}

function entryHead({ title, org, meta, dates }) {
  const left = [title && `<strong>${e(title)}</strong>`, org && `<span>${e(org)}</span>`]
    .filter(Boolean)
    .join('<span class="sep">, </span>');
  return `<div class="entry-head"><div class="entry-title">${left}${
    meta ? `<span class="meta">${e(meta)}</span>` : ''
  }</div>${dates ? `<div class="dates">${e(dates)}</div>` : ''}</div>`;
}

const renderers = {
  summary: (c) => (c.summary?.trim() ? `<p class="summary">${e(c.summary)}</p>` : ''),

  experience: (c, hidden) =>
    visibleItems(c.experience, hidden)
      .map(
        (x) =>
          `<article class="entry">${entryHead({
            title: x.title,
            org: x.company,
            meta: [x.location, x.employmentType].filter(Boolean).join(' / '),
            dates: formatRange(x.startDate, x.endDate, { current: x.current }),
          })}${bullets(x.bullets)}</article>`,
      )
      .join(''),

  projects: (c, hidden) =>
    visibleItems(c.projects, hidden)
      .map((p) => {
        const links = [p.url && link(p.url), p.repositoryUrl && link(p.repositoryUrl)]
          .filter(Boolean)
          .join('<span class="sep"> | </span>');
        const tech = (p.technologies ?? []).filter(Boolean).join(', ');
        return `<article class="entry">${entryHead({
          title: p.name,
          dates: formatRange(p.startDate, p.endDate, { current: p.current }),
        })}${p.description ? `<p>${e(p.description)}</p>` : ''}${
          tech ? `<p class="tech">${e(tech)}</p>` : ''
        }${links ? `<p class="links">${links}</p>` : ''}${bullets(p.bullets)}</article>`;
      })
      .join(''),

  skills: (c, hidden) => {
    const groups = new Map();
    for (const s of visibleItems(c.skills, hidden)) {
      if (!s.name?.trim()) continue;
      const key = s.category?.trim() || 'Skills';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s.name.trim());
    }
    if (!groups.size) return '';
    return `<dl class="skills">${[...groups]
      .map(([cat, names]) => `<div><dt>${e(cat)}</dt><dd>${e(names.join(', '))}</dd></div>`)
      .join('')}</dl>`;
  },

  education: (c, hidden) =>
    visibleItems(c.education, hidden)
      .map(
        (x) =>
          `<article class="entry">${entryHead({
            title: [x.degree, x.field].filter(Boolean).join(', '),
            org: x.institution,
            meta: x.location,
            dates: formatRange(x.startDate, x.endDate, { current: x.current }),
          })}${x.notes ? `<p>${e(x.notes)}</p>` : ''}</article>`,
      )
      .join(''),

  certifications: (c, hidden) =>
    visibleItems(c.certifications, hidden)
      .map(
        (x) =>
          `<article class="entry">${entryHead({
            title: x.name,
            org: x.issuer,
            dates: formatRange(x.issuedDate, x.expiresDate),
          })}${x.url ? `<p class="links">${link(x.url)}</p>` : ''}</article>`,
      )
      .join(''),
};

function renderCustom(section, hidden) {
  return visibleItems(section.items, hidden)
    .map(
      (x) =>
        `<article class="entry">${entryHead({
          title: x.title,
          org: x.subtitle,
          dates: formatRange(x.startDate, x.endDate, { current: x.current }),
        })}${x.description ? `<p>${e(x.description)}</p>` : ''}${bullets(x.bullets)}</article>`,
    )
    .join('');
}

function contactLine(contact) {
  const parts = [
    contact.location && e(contact.location),
    contact.email && link(`mailto:${contact.email}`, contact.email),
    contact.phone && e(contact.phone),
    contact.website && link(contact.website),
    contact.linkedin && link(contact.linkedin),
    contact.github && link(contact.github),
    contact.portfolio && link(contact.portfolio),
  ].filter(Boolean);
  return parts.join('<span class="sep"> | </span>');
}

/**
 * Render resume content to a complete, self-contained HTML document.
 * All user text is escaped; the output contains no scripts.
 */
export function renderClarity(
  content,
  layout = {},
  { pageSize = 'A4', fontCss = '', fontStack = DEFAULT_FONT_STACK } = {},
) {
  const page = PAGE[pageSize] ?? PAGE.A4;
  const hiddenSections = new Set(layout.hiddenSections ?? []);
  const hiddenItems = new Set(layout.hiddenItems ?? []);
  const contact = content.contact ?? {};

  const sections = resolveSectionOrder(content, layout)
    .filter((key) => !hiddenSections.has(key))
    .map((key) => {
      let title;
      let body;
      if (key.startsWith('custom:')) {
        const section = (content.customSections ?? []).find((s) => `custom:${s.id}` === key);
        if (!section) return '';
        title = section.title;
        body = renderCustom(section, hiddenItems);
      } else {
        title = SECTION_TITLES[key];
        body = renderers[key](content, hiddenItems);
      }
      return body ? `<section data-section="${e(key)}"><h2>${e(title)}</h2>${body}</section>` : '';
    })
    .join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(contact.name || 'Resume')}</title>
<style>
${fontCss}
@page { size: ${page.size}; margin: 14mm 16mm; }
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
</style></head>
<body>
<header>
<h1>${e(contact.name || '')}</h1>
${content.headline ? `<p class="headline">${e(content.headline)}</p>` : ''}
<p class="contact">${contactLine(contact)}</p>
</header>
${sections}
</body></html>`;
}
