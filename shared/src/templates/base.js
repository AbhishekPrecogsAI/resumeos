import { escapeHtml as e, safeHref, displayUrl } from '../escape.js';
import { accentPalette, accentProblem } from './color.js';
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

// Generic line icons (no brand marks), drawn with paths only so they add no extractable text.
const ICON_PATHS = {
  location:
    '<path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
  website:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  linkedin:
    '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M5.8 16.5c.8-1.6 2-2.2 3.2-2.2s2.4.6 3.2 2.2M14.5 10h4M14.5 13.5h3"/>',
  github: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/>',
  portfolio:
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/>',
};
const icon = (kind) =>
  `<svg class="ico" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[kind]}</svg>`;

function contactLine(contact, { contactItems = false, contactIcons = false } = {}) {
  const parts = [
    ['location', contact.location && e(contact.location)],
    ['email', contact.email && link(`mailto:${contact.email}`, contact.email)],
    ['phone', contact.phone && e(contact.phone)],
    ['website', contact.website && link(contact.website)],
    ['linkedin', contact.linkedin && link(contact.linkedin)],
    ['github', contact.github && link(contact.github)],
    ['portfolio', contact.portfolio && link(contact.portfolio)],
  ].filter(([, html]) => html);
  // contactItems wraps each part so templates can stack or style them; icons imply items.
  const items = contactIcons
    ? parts.map(
        ([kind, html]) => `<span class="ci ci-${kind}">${icon(kind)}<span>${html}</span></span>`,
      )
    : contactItems
      ? parts.map(([, html]) => `<span class="ci">${html}</span>`)
      : parts.map(([, html]) => html);
  return items.join('<span class="sep"> | </span>');
}

// Only small base64 JPEG/PNG data URLs are ever placed in an <img>; anything else is dropped.
const PHOTO_URL = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/;
export const isPhotoDataUrl = (value) =>
  typeof value === 'string' && value.length < 700_000 && PHOTO_URL.test(value);

/**
 * Shared resume markup. Templates differ only in CSS, so every template has the same reading
 * order and the same text for export validation. All user text is escaped; no scripts.
 * `css(page, fontStack)` returns the template's stylesheet.
 */
/**
 * CSS custom properties for templates that support an accent colour. An invalid or too-light
 * accent falls back to the template default, so a bad value can never make text unreadable.
 */
function accentVars(defaultAccent, accentColor) {
  if (!defaultAccent) return '';
  const chosen = accentColor && !accentProblem(accentColor) ? accentColor : defaultAccent;
  const p = accentPalette(chosen);
  return `:root { --accent: ${p.accent}; --soft: ${p.soft}; --rail: ${p.rail}; --on-dark: ${p.onDark}; --deep: ${p.deep}; }\n`;
}

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
    defaultAccent = null,
    accentColor = null,
    contactIcons = false,
    photo = null,
    fullWidth = [],
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

  const photoTag = isPhotoDataUrl(photo) ? `<img class="photo" src="${photo}" alt="">\n` : '';
  const header = `<header${photoTag ? ' class="with-photo"' : ''}>
${photoTag}<h1>${e(contact.name || '')}</h1>
${content.headline ? `<p class="headline">${e(content.headline)}</p>` : ''}
<p class="contact">${contactLine(contact, { contactItems, contactIcons })}</p>
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
    // Sections listed in `fullWidth` (e.g. the summary) span both columns, above them.
    const wide = new Set(fullWidth);
    const above = sections
      .filter((s) => wide.has(s.key))
      .map((s) => s.html)
      .join('');
    const side = sections
      .filter((s) => inSide.has(s.key))
      .map((s) => s.html)
      .join('');
    const main = sections
      .filter((s) => !inSide.has(s.key) && !wide.has(s.key))
      .map((s) => s.html)
      .join('');
    const aside = `<aside class="sidebar">${sidebar.header === 'sidebar' ? header : ''}${side}</aside>`;
    body = `${sidebar.header === 'sidebar' ? '' : header}\n${above ? `<div class="full">${above}</div>` : ''}<div class="columns sidebar-${sidebar.side}">${aside}<main class="main">${main}</main></div>`;
  }

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(contact.name || 'Resume')}</title>
<style>
${fontCss}
${accentVars(defaultAccent, accentColor)}${css(page, fontStack)}</style></head>
<body${sidebar ? ' class="has-sidebar"' : ''}>
${body}
</body></html>`;
}
