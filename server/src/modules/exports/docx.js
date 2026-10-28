import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from 'docx';
import { formatRange } from '@resumeos/shared/dates.js';
import { safeHref, displayUrl } from '@resumeos/shared/escape.js';
import { SECTION_TITLES, resolveSectionOrder, bulletText } from '@resumeos/shared/resumeModel.js';
import { getTemplate } from '@resumeos/shared/templates/index.js';
import { renderClarity } from '@resumeos/shared/templates/clarity.js';

/** DOCX is single-column in layout order for every template, so validate against that render. */
export const docxReferenceHtml = (content, layout, pageSize) =>
  renderClarity(content, layout, { pageSize });

// Page geometry in twentieths of a point (twips). Margins match the PDF template (14mm × 16mm).
const PAGE = { A4: { width: 11906, height: 16838 }, Letter: { width: 12240, height: 15840 } };
const MARGIN = { top: 794, bottom: 794, left: 907, right: 907 };
const MUTED = '4B5260';

const run = (text, opts = {}) => new TextRun({ text, ...opts });

function link(url, text) {
  const href = safeHref(url);
  const label = text ?? displayUrl(url);
  return href
    ? new ExternalHyperlink({ link: href, children: [run(label, { style: 'Hyperlink' })] })
    : run(label);
}

function joinRuns(parts, sep) {
  return parts.flatMap((p, i) => (i ? [run(sep, { color: MUTED }), p] : [p]));
}

function visible(items, hidden) {
  return (items ?? []).filter((x) => !hidden.has(x.id));
}

/**
 * One entry: title and organisation on the left, dates right-aligned on the same line via a tab
 * stop, then meta, text and bullets. Real paragraphs and list numbering, no tables, so Word
 * reflows it and parsers read it in order.
 */
function entry(
  { title, org, meta, dates, paragraphs = [], links = [], bullets = [] },
  contentWidth,
) {
  const head = [
    title && run(title, { bold: true }),
    title && org && run(', '),
    org && run(org),
  ].filter(Boolean);
  const out = [
    new Paragraph({
      keepNext: true,
      spacing: { before: 100 },
      tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
      children: [...head, ...(dates ? [run(`\t${dates}`, { size: 19 })] : [])],
    }),
  ];
  if (meta)
    out.push(new Paragraph({ keepNext: true, children: [run(meta, { size: 19, color: MUTED })] }));
  for (const p of paragraphs)
    out.push(new Paragraph({ children: [run(p.text, p.small ? { size: 19 } : {})] }));
  if (links.length)
    out.push(
      new Paragraph({
        children: joinRuns(
          links.map((l) => link(l)),
          ' | ',
        ),
      }),
    );
  for (const b of bullets)
    out.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [run(b)] }));
  return out;
}

const textBullets = (list) => (list ?? []).map(bulletText).filter((t) => t.trim());

function sectionParagraphs(key, content, hidden, width) {
  switch (key) {
    case 'summary':
      return content.summary?.trim() ? [new Paragraph({ children: [run(content.summary)] })] : [];
    case 'experience':
      return visible(content.experience, hidden).flatMap((x) =>
        entry(
          {
            title: x.title,
            org: x.company,
            meta: [x.location, x.employmentType].filter(Boolean).join(' / '),
            dates: formatRange(x.startDate, x.endDate, { current: x.current }),
            bullets: textBullets(x.bullets),
          },
          width,
        ),
      );
    case 'projects':
      return visible(content.projects, hidden).flatMap((p) =>
        entry(
          {
            title: p.name,
            dates: formatRange(p.startDate, p.endDate, { current: p.current }),
            paragraphs: [
              p.description && { text: p.description },
              (p.technologies ?? []).length && { text: p.technologies.join(', '), small: true },
            ].filter(Boolean),
            links: [p.url, p.repositoryUrl].filter(Boolean),
            bullets: textBullets(p.bullets),
          },
          width,
        ),
      );
    case 'skills': {
      const groups = new Map();
      for (const s of visible(content.skills, hidden)) {
        if (!s.name?.trim()) continue;
        const cat = s.category?.trim() || 'Skills';
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat).push(s.name.trim());
      }
      return [...groups].map(
        ([cat, names]) =>
          new Paragraph({ children: [run(`${cat}: `, { bold: true }), run(names.join(', '))] }),
      );
    }
    case 'education':
      return visible(content.education, hidden).flatMap((x) =>
        entry(
          {
            title: [x.degree, x.field].filter(Boolean).join(', '),
            org: x.institution,
            meta: x.location,
            dates: formatRange(x.startDate, x.endDate, { current: x.current }),
            paragraphs: x.notes ? [{ text: x.notes }] : [],
          },
          width,
        ),
      );
    case 'certifications':
      return visible(content.certifications, hidden).flatMap((x) =>
        entry(
          {
            title: x.name,
            org: x.issuer,
            dates: formatRange(x.issuedDate, x.expiresDate),
            links: x.url ? [x.url] : [],
          },
          width,
        ),
      );
    default: {
      const section = (content.customSections ?? []).find((s) => `custom:${s.id}` === key);
      return visible(section?.items, hidden).flatMap((x) =>
        entry(
          {
            title: x.title,
            org: x.subtitle,
            dates: formatRange(x.startDate, x.endDate, { current: x.current }),
            paragraphs: x.description ? [{ text: x.description }] : [],
            bullets: textBullets(x.bullets),
          },
          width,
        ),
      );
    }
  }
}

/** Build a DOCX with the same content, visibility and order as the HTML/PDF render. */
export async function renderDocx({ content, layout = {}, templateId, pageSize }) {
  const template = getTemplate(templateId);
  const page = PAGE[pageSize] ?? PAGE.A4;
  const width = page.width - MARGIN.left - MARGIN.right;
  const hiddenSections = new Set(layout.hiddenSections ?? []);
  const hidden = new Set(layout.hiddenItems ?? []);
  const contact = content.contact ?? {};

  const contactParts = [
    contact.location && run(contact.location),
    contact.email && link(`mailto:${contact.email}`, contact.email),
    contact.phone && run(contact.phone),
    ...['website', 'linkedin', 'github', 'portfolio'].map((k) => contact[k] && link(contact[k])),
  ].filter(Boolean);

  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [run(contact.name || '')] }),
    ...(content.headline
      ? [new Paragraph({ children: [run(content.headline, { size: 23 })] })]
      : []),
    ...(contactParts.length
      ? [new Paragraph({ spacing: { after: 120 }, children: joinRuns(contactParts, ' | ') })]
      : []),
  ];

  for (const key of resolveSectionOrder(content, layout)) {
    if (hiddenSections.has(key)) continue;
    const body = sectionParagraphs(key, content, hidden, width);
    if (!body.length) continue;
    const title = key.startsWith('custom:')
      ? (content.customSections ?? []).find((s) => `custom:${s.id}` === key)?.title || ''
      : SECTION_TITLES[key];
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, children: [run(title)] }),
      ...body,
    );
  }

  const font = template?.docxFont ?? 'Arial';
  const doc = new Document({
    creator: 'ResumeOS',
    title: contact.name ? `${contact.name} resume` : 'Resume',
    styles: {
      default: {
        document: {
          run: { font, size: 21, color: '16181D' },
          paragraph: { spacing: { after: 40, line: 264 } },
        },
      },
      paragraphStyles: [
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          next: 'Normal',
          run: { font, size: 40, bold: true, color: '16181D' },
          paragraph: { spacing: { after: 40 } },
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font, size: 21, bold: true, allCaps: true, color: '16181D' },
          paragraph: {
            spacing: { before: 220, after: 60 },
            border: { bottom: { style: 'single', size: 6, color: '9AA1AB', space: 2 } },
          },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 260, hanging: 200 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: page.width, height: page.height }, margin: MARGIN } },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
