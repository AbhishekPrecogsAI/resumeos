import { SECTION_KEYS, LIST_SECTIONS } from './resumeModel.js';

// Every list section except custom sections, which are handled separately below.
const ENTRY_SECTIONS = LIST_SECTIONS.filter((k) => k !== 'customSections');

const stripBullets = (bullets) =>
  (bullets ?? []).map((b) => (typeof b === 'string' ? b : { id: b.id, text: b.text ?? '' }));

const stripEntry = (entry) => {
  const { evidenceIds: _evidence, ...rest } = entry;
  return 'bullets' in rest ? { ...rest, bullets: stripBullets(rest.bullets) } : rest;
};

/**
 * What a share link may reveal: only what the page shows. Hidden sections and entries are
 * removed rather than hidden, evidence links are dropped, and email and phone are blanked when
 * the owner asks. The returned layout has nothing left to hide.
 */
export function shareableResume(content, layout = {}, { hideContactDetails = false } = {}) {
  const hiddenSections = new Set(layout.hiddenSections ?? []);
  const hiddenItems = new Set(layout.hiddenItems ?? []);
  const keep = (items) => (items ?? []).filter((x) => !hiddenItems.has(x.id)).map(stripEntry);

  const out = {
    contact: { ...(content.contact ?? {}) },
    headline: content.headline ?? '',
    summary: hiddenSections.has('summary') ? '' : (content.summary ?? ''),
    customSections: (content.customSections ?? [])
      .filter((s) => !hiddenSections.has(`custom:${s.id}`))
      .map((s) => ({ id: s.id, title: s.title, items: keep(s.items) })),
  };
  for (const key of ENTRY_SECTIONS) out[key] = hiddenSections.has(key) ? [] : keep(content[key]);
  if (hideContactDetails) {
    out.contact.email = '';
    out.contact.phone = '';
  }

  const visible = new Set([...SECTION_KEYS, ...out.customSections.map((s) => `custom:${s.id}`)]);
  return {
    content: out,
    layout: {
      ...layout,
      sectionOrder: (layout.sectionOrder ?? []).filter(
        (k) => visible.has(k) && !hiddenSections.has(k),
      ),
      hiddenSections: [...hiddenSections].filter((k) => SECTION_KEYS.includes(k)),
      hiddenItems: [],
    },
  };
}
