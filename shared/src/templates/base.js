import { escapeHtml as e, safeHref, displayUrl } from '../escape.js';
import { accentPalette, accentProblem } from './color.js';
import { patternLayer } from './patterns.js';
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

/*
 * Editable mode (the on-page editor). Every field is wrapped in a span carrying a stable path
 * made of entry ids, e.g. "experience:exp_1:title" or "experience:exp_1:bullets:b_3:text".
 * Empty fields render with a placeholder. When `ctx.editable` is false, every helper returns
 * exactly what the plain renderer always produced, so exports are unaffected.
 */
const ph = (text) => e(text);
function ed(ctx, path, value, placeholder, tag = 'span', attrs = '') {
  return `<${tag} data-edit="${e(path)}" data-ph="${ph(placeholder)}"${attrs}>${e(value ?? '')}</${tag}>`;
}

function bullets(list, ctx = {}, base = '') {
  if (ctx.editable) {
    const items = list ?? [];
    if (!items.length) return '';
    return `<ul>${items
      .map(
        (b) =>
          `<li data-bullet="${e(`${base}:bullets:${b.id}`)}">${ed(ctx, `${base}:bullets:${b.id}:text`, bulletText(b), 'Describe what you did and what changed')}</li>`,
      )
      .join('')}</ul>`;
  }
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

/** Editable entry head: every part is its own field; dates open a picker. */
function entryHeadEditable(ctx, base, { title, org, meta = [], dates, datesKey }) {
  const parts = [`<strong>${ed(ctx, `${base}:${title.key}`, title.value, title.ph)}</strong>`];
  if (org) parts.push(`<span>${ed(ctx, `${base}:${org.key}`, org.value, org.ph)}</span>`);
  const metaHtml = meta.length
    ? `<span class="meta">${meta.map((m) => ed(ctx, `${base}:${m.key}`, m.value, m.ph)).join('<span class="sep"> / </span>')}</span>`
    : '';
  return `<div class="entry-head"><div class="entry-title">${parts.join('<span class="sep">, </span>')}${metaHtml}</div><div class="dates" data-dates="${e(datesKey)}" role="button" tabindex="0">${e(dates || 'Add dates')}</div></div>`;
}

const article = (ctx, key, inner) =>
  ctx.editable
    ? `<article class="entry" data-entry="${e(key)}">${inner}</article>`
    : `<article class="entry">${inner}</article>`;

const renderers = {
  summary: (c, hidden, ctx = {}) =>
    ctx.editable
      ? ed(
          ctx,
          'summary',
          c.summary,
          'Two to four sentences about who you are and what you do best',
          'p',
          ' class="summary"',
        )
      : c.summary?.trim()
        ? `<p class="summary">${e(c.summary)}</p>`
        : '',

  experience: (c, hidden, ctx = {}) =>
    visibleItems(c.experience, hidden)
      .map((x) => {
        const base = `experience:${x.id}`;
        const dates = formatRange(x.startDate, x.endDate, { current: x.current });
        if (ctx.editable) {
          return article(
            ctx,
            base,
            `${entryHeadEditable(ctx, base, {
              title: { key: 'title', value: x.title, ph: 'Job title' },
              org: { key: 'company', value: x.company, ph: 'Company' },
              meta: [
                { key: 'location', value: x.location, ph: 'Location' },
                { key: 'employmentType', value: x.employmentType, ph: 'Type' },
              ],
              dates,
              datesKey: base,
            })}${bullets(x.bullets, ctx, base)}`,
          );
        }
        return `<article class="entry">${entryHead({
          title: x.title,
          org: x.company,
          meta: [x.location, x.employmentType].filter(Boolean).join(' / '),
          dates,
        })}${bullets(x.bullets)}</article>`;
      })
      .join(''),

  projects: (c, hidden, ctx = {}) =>
    visibleItems(c.projects, hidden)
      .map((p) => {
        const base = `projects:${p.id}`;
        const dates = formatRange(p.startDate, p.endDate, { current: p.current });
        if (ctx.editable) {
          return article(
            ctx,
            base,
            `${entryHeadEditable(ctx, base, { title: { key: 'name', value: p.name, ph: 'Project name' }, dates, datesKey: base })}${ed(
              ctx,
              `${base}:description`,
              p.description,
              'What it is and why it matters',
              'p',
            )}${ed(ctx, `${base}:technologies`, (p.technologies ?? []).join(', '), 'Technologies, comma separated', 'p', ' class="tech"')}<p class="links">${ed(
              ctx,
              `${base}:url`,
              p.url,
              'Project URL',
            )}<span class="sep"> | </span>${ed(ctx, `${base}:repositoryUrl`, p.repositoryUrl, 'Repository URL')}</p>${bullets(p.bullets, ctx, base)}`,
          );
        }
        const links = [p.url && link(p.url), p.repositoryUrl && link(p.repositoryUrl)]
          .filter(Boolean)
          .join('<span class="sep"> | </span>');
        const tech = (p.technologies ?? []).filter(Boolean).join(', ');
        return `<article class="entry">${entryHead({
          title: p.name,
          dates,
        })}${p.description ? `<p>${e(p.description)}</p>` : ''}${
          tech ? `<p class="tech">${e(tech)}</p>` : ''
        }${links ? `<p class="links">${links}</p>` : ''}${bullets(p.bullets)}</article>`;
      })
      .join(''),

  skills: (c, hidden, opts = {}) => {
    const groups = new Map();
    for (const s of visibleItems(c.skills, hidden)) {
      if (!opts.editable && !s.name?.trim()) continue;
      const key = s.category?.trim() || 'Skills';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(opts.editable ? s : s.name.trim());
    }
    if (!groups.size) return '';
    // No skill has a category: list them without a group label, which would only repeat the
    // section heading ("Skills" under "Skills").
    const uncategorised =
      groups.size === 1 &&
      groups.has('Skills') &&
      !visibleItems(c.skills, hidden).some((s) => s.category?.trim());
    if (opts.editable) {
      const skill = (s) =>
        ed(
          opts,
          `skills:${s.id}:name`,
          s.name,
          'Skill',
          'span',
          opts.skillChips ? ' class="chip"' : '',
        );
      return `<dl class="skills${opts.skillChips ? ' chips' : ''}" data-entry="skills">${[...groups]
        .map(
          ([cat, list]) =>
            `<div data-skill-group="${e(cat)}"><dt>${ed(opts, `skillcat:${encodeURIComponent(cat)}`, uncategorised ? '' : cat, 'Category (optional)')}</dt><dd>${list
              .map(skill)
              .join(opts.skillChips ? ' ' : '<span class="sep">, </span>')}</dd></div>`,
        )
        .join('')}</dl>`;
    }
    if (uncategorised) {
      const names = groups.get('Skills');
      return opts.skillChips
        ? `<p class="skills-list">${names.map((n) => `<span class="chip">${e(n)}</span>`).join(' ')}</p>`
        : `<p class="skills-list">${e(names.join(', '))}</p>`;
    }
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

  education: (c, hidden, ctx = {}) =>
    visibleItems(c.education, hidden)
      .map((x) => {
        const base = `education:${x.id}`;
        const dates = formatRange(x.startDate, x.endDate, { current: x.current });
        if (ctx.editable) {
          return article(
            ctx,
            base,
            `${entryHeadEditable(ctx, base, {
              title: { key: 'degree', value: x.degree, ph: 'Degree' },
              org: { key: 'institution', value: x.institution, ph: 'School or university' },
              meta: [
                { key: 'field', value: x.field, ph: 'Field of study' },
                { key: 'location', value: x.location, ph: 'Location' },
              ],
              dates,
              datesKey: base,
            })}${ed(ctx, `${base}:notes`, x.notes, 'Honours, thesis or relevant coursework', 'p')}`,
          );
        }
        return `<article class="entry">${entryHead({
          title: [x.degree, x.field].filter(Boolean).join(', '),
          org: x.institution,
          meta: x.location,
          dates,
        })}${x.notes ? `<p>${e(x.notes)}</p>` : ''}</article>`;
      })
      .join(''),

  certifications: (c, hidden, ctx = {}) =>
    visibleItems(c.certifications, hidden)
      .map((x) => {
        const base = `certifications:${x.id}`;
        const dates = formatRange(x.issuedDate, x.expiresDate);
        if (ctx.editable) {
          return article(
            ctx,
            base,
            `${entryHeadEditable(ctx, base, {
              title: { key: 'name', value: x.name, ph: 'Certification' },
              org: { key: 'issuer', value: x.issuer, ph: 'Issuer' },
              dates,
              datesKey: base,
            })}<p class="links">${ed(ctx, `${base}:url`, x.url, 'Verification URL')}</p>`,
          );
        }
        return `<article class="entry">${entryHead({
          title: x.name,
          org: x.issuer,
          dates,
        })}${x.url ? `<p class="links">${link(x.url)}</p>` : ''}</article>`;
      })
      .join(''),
};

function renderCustom(section, hidden, ctx = {}) {
  return visibleItems(section.items, hidden)
    .map((x) => {
      const base = `custom:${section.id}:${x.id}`;
      const dates = formatRange(x.startDate, x.endDate, { current: x.current });
      if (ctx.editable) {
        return article(
          ctx,
          base,
          `${entryHeadEditable(ctx, base, {
            title: { key: 'title', value: x.title, ph: 'Title' },
            org: { key: 'subtitle', value: x.subtitle, ph: 'Organisation' },
            dates,
            datesKey: base,
          })}${ed(ctx, `${base}:description`, x.description, 'Description', 'p')}${bullets(x.bullets, ctx, base)}`,
        );
      }
      return `<article class="entry">${entryHead({
        title: x.title,
        org: x.subtitle,
        dates,
      })}${x.description ? `<p>${e(x.description)}</p>` : ''}${bullets(x.bullets)}</article>`;
    })
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
// Section heading icons, same rules: generic shapes drawn with paths, no text.
const SECTION_ICON_PATHS = {
  summary:
    '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/>',
  experience:
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12.5h18"/>',
  projects: '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5"/>',
  skills:
    '<path d="M14.5 5.5a4 4 0 0 0-5.3 5.3L3.5 16.5a1.8 1.8 0 0 0 2.5 2.5l5.7-5.7a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.4-.5-.5-2.4z"/>',
  education:
    '<path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v5c1.6 1.6 3.4 2.4 5.5 2.4s3.9-.8 5.5-2.4v-5M21.5 9v5.5"/>',
  certifications: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.3L7 21l5-2.7 5 2.7-1.5-7.7"/>',
  custom: '<path d="M6.5 3.5h11a1 1 0 0 1 1 1V21L12 16.5 5.5 21V4.5a1 1 0 0 1 1-1z"/>',
};
const sectionIcon = (key) =>
  `<svg class="h-ico" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SECTION_ICON_PATHS[key.startsWith('custom:') ? 'custom' : key]}</svg>`;

const icon = (kind) =>
  `<svg class="ico" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[kind]}</svg>`;

const CONTACT_PLACEHOLDERS = {
  location: 'City, Country',
  email: 'Email',
  phone: 'Phone',
  website: 'Website',
  linkedin: 'LinkedIn URL',
  github: 'GitHub URL',
  portfolio: 'Portfolio URL',
};

function contactLine(
  contact,
  { contactItems = false, contactIcons = false, editable = false } = {},
) {
  if (editable) {
    // Show the common fields even when empty (as placeholders); show the rest only when filled.
    const kinds = [
      'location',
      'email',
      'phone',
      'linkedin',
      'github',
      'website',
      'portfolio',
    ].filter((k) => ['location', 'email', 'phone', 'linkedin'].includes(k) || contact[k]);
    const parts = kinds.map((kind) => [
      kind,
      ed({ editable }, `contact:${kind}`, contact[kind], CONTACT_PLACEHOLDERS[kind]),
    ]);
    const items = contactIcons
      ? parts.map(
          ([kind, html]) => `<span class="ci ci-${kind}">${icon(kind)}<span>${html}</span></span>`,
        )
      : contactItems
        ? parts.map(([, html]) => `<span class="ci">${html}</span>`)
        : parts.map(([, html]) => html);
    return items.join('<span class="sep"> | </span>');
  }
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
const ADD_LABEL = {
  summary: 'a summary',
  experience: 'a role',
  projects: 'a project',
  skills: 'skills',
  education: 'education',
  certifications: 'a certification',
};

// Editor-only styles: field highlights, placeholders and click targets. Never in exports.
const EDITABLE_CSS = `
[data-edit] { outline: none; border-radius: 2px; cursor: text; transition: background-color 0.12s; min-width: 1ch; }
[data-edit]:hover { background-color: rgba(46, 63, 184, 0.07); }
[data-edit]:focus { background-color: rgba(46, 63, 184, 0.1); box-shadow: 0 0 0 1.5px rgba(46, 63, 184, 0.55); }
[data-edit]:empty::before { content: attr(data-ph); color: #9aa1ab; font-weight: 400; font-style: italic; }
p[data-edit]:empty, h2[data-edit]:empty { min-height: 1.2em; }
.dates[data-dates] { cursor: pointer; border-radius: 2px; }
.dates[data-dates]:hover { background-color: rgba(46, 63, 184, 0.07); }
.ed-empty { margin: 2pt 0 0; color: #7a828d; font-style: italic; cursor: pointer; }
.ed-empty:hover { color: #2e3fb8; }
[data-entry].ed-active { outline: 1.5px dashed rgba(46, 63, 184, 0.45); outline-offset: 3pt; border-radius: 3pt; }
a { pointer-events: none; }
`;

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

/**
 * Background pattern layered over the template's own page background (e.g. a sidebar band).
 * Only for templates with an accent; the body is made transparent so the pattern shows behind
 * text on every page, including margins.
 */
function patternCss(defaultAccent, accentColor, pattern, pageBackground) {
  if (!defaultAccent || !pattern || pattern === 'none') return '';
  const accent = accentColor && !accentProblem(accentColor) ? accentColor : defaultAccent;
  const layer = patternLayer(pattern, accentPalette(accent).accent);
  if (!layer) return '';
  return `\nhtml { background: ${layer}, ${pageBackground}; }\nbody { background: transparent; }\n`;
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
    // Draw an icon before each section heading (inside the h2, so headings still extract alone).
    headingIcons = false,
    photo = null,
    fullWidth = [],
    editable = false,
    pattern = 'none',
    pageBackground = '#fff',
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
        body = renderCustom(section, hiddenItems, { editable });
      } else {
        title = SECTION_TITLES[key];
        body = renderers[key](content, hiddenItems, { skillChips, editable });
      }
      if (editable) {
        // The editor shows every visible section, with an invitation to add when it's empty.
        const heading = key.startsWith('custom:')
          ? headingIcons
            ? `<h2>${sectionIcon(key)}${ed({ editable }, `${key}:title`, title, 'Section title')}</h2>`
            : ed({ editable }, `${key}:title`, title, 'Section title', 'h2')
          : `<h2>${headingIcons ? sectionIcon(key) : ''}${e(title)}</h2>`;
        const empty = body
          ? ''
          : `<p class="ed-empty" data-add="${e(key)}" role="button" tabindex="0">+ Add ${e(key.startsWith('custom:') ? 'an entry' : (ADD_LABEL[key] ?? 'an entry'))}</p>`;
        return {
          key,
          html: `<section data-section="${e(key)}">${heading}${body}${empty}</section>`,
        };
      }
      return body
        ? {
            key,
            html: `<section data-section="${e(key)}"><h2>${headingIcons ? sectionIcon(key) : ''}${e(title)}</h2>${body}</section>`,
          }
        : null;
    })
    .filter(Boolean);

  const photoTag = isPhotoDataUrl(photo) ? `<img class="photo" src="${photo}" alt="">\n` : '';
  const header = `<header${photoTag ? ' class="with-photo"' : ''}>
${photoTag}${editable ? ed({ editable }, 'contact:name', contact.name, 'Your name', 'h1') : `<h1>${e(contact.name || '')}</h1>`}
${editable ? ed({ editable }, 'headline', content.headline, 'Your headline, e.g. Backend engineer', 'p', ' class="headline"') : content.headline ? `<p class="headline">${e(content.headline)}</p>` : ''}
<p class="contact">${contactLine(contact, { contactItems, contactIcons, editable })}</p>
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
${accentVars(defaultAccent, accentColor)}${css(page, fontStack)}${patternCss(defaultAccent, accentColor, pattern, pageBackground)}${editable ? EDITABLE_CSS : ''}</style></head>
<body${sidebar ? ' class="has-sidebar"' : ''}>
${body}
</body></html>`;
}
