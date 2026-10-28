import { escapeHtml as e, safeHref, displayUrl } from '../escape.js';
import { formatRange } from '../dates.js';
import { SECTION_TITLES, resolveSectionOrder, bulletText } from '../resumeModel.js';

export const PAGE = {
  A4: { size: 'A4', width: '210mm', minHeight: '297mm' },
  Letter: { size: 'letter', width: '8.5in', minHeight: '11in' },
};

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

  skills: (c, hidden, opts = {}) => {
    const groups = new Map();
    for (const s of visibleItems(c.skills, hidden)) {
      if (!s.name?.trim()) continue;
      const key = s.category?.trim() || 'Skills';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s.name.trim());
    }
    if (!groups.size) return '';
    if (opts.skillChips) {
      // Chips are separate elements with real spaces between them, so extracted text stays readable.
      return `<dl class="skills chips">${[...groups]
        .map(
          ([cat, names]) =>
            `<div><dt>${e(cat)}</dt><dd>${names.map((n) => `<span class="chip">${e(n)}</span>`).join(' ')}</dd></div>`,
        )
        .join('')}</dl>`;
    }
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

function contactLine(contact, { contactItems = false } = {}) {
  const parts = [
    contact.location && e(contact.location),
    contact.email && link(`mailto:${contact.email}`, contact.email),
    contact.phone && e(contact.phone),
    contact.website && link(contact.website),
    contact.linkedin && link(contact.linkedin),
    contact.github && link(contact.github),
    contact.portfolio && link(contact.portfolio),
  ].filter(Boolean);
  // contactItems wraps each part so templates can stack them or add icons-free styling.
  return (contactItems ? parts.map((p) => `<span class="ci">${p}</span>`) : parts).join(
    '<span class="sep"> | </span>',
  );
}

/**
 * Shared resume markup. Templates differ only in CSS, so every template has the same reading
 * order and the same text for export validation. All user text is escaped; no scripts.
 * `css(page, fontStack)` returns the template's stylesheet.
 */
export function renderResume(
  content,
  layout = {},
  {
    pageSize = 'A4',
    fontCss = '',
    fontStack,
    css,
    sidebar = null,
    skillChips = false,
    contactItems = false,
  },
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
        body = renderers[key](content, hiddenItems, { skillChips });
      }
      return body
        ? { key, html: `<section data-section="${e(key)}"><h2>${e(title)}</h2>${body}</section>` }
        : null;
    })
    .filter(Boolean);

  const header = `<header>
<h1>${e(contact.name || '')}</h1>
${content.headline ? `<p class="headline">${e(content.headline)}</p>` : ''}
<p class="contact">${contactLine(contact, { contactItems })}</p>
</header>`;

  let body;
  if (!sidebar) {
    body = `${header}\n${sections.map((s) => s.html).join('')}`;
  } else {
    // Two columns. The sidebar always comes first in the document, even when it's displayed on
    // the right (CSS grid placement). The sidebar usually ends on page 1 while the main column
    // continues, so this order lets extractors read the whole sidebar, then the whole main
    // column, on any number of pages, instead of interleaving the columns page by page.
    const inSide = new Set(sidebar.keys);
    const side = sections
      .filter((s) => inSide.has(s.key))
      .map((s) => s.html)
      .join('');
    const main = sections
      .filter((s) => !inSide.has(s.key))
      .map((s) => s.html)
      .join('');
    const aside = `<aside class="sidebar">${sidebar.header === 'sidebar' ? header : ''}${side}</aside>`;
    body = `${sidebar.header === 'sidebar' ? '' : header}\n<div class="columns sidebar-${sidebar.side}">${aside}<main class="main">${main}</main></div>`;
  }

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(contact.name || 'Resume')}</title>
<style>
${fontCss}
${css(page, fontStack)}</style></head>
<body${sidebar ? ' class="has-sidebar"' : ''}>
${body}
</body></html>`;
}
