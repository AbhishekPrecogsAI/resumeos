import { resolveSectionOrder, SECTION_KEYS, notYetAdded } from './resumeModel.js';

/**
 * Where a section sits on a template: 'full' (spanning both columns above them), 'side' or
 * 'main'. Single-column templates put everything in 'main'.
 */
export function sectionColumn(template, layout, key) {
  if (!template?.sideSections) return 'main';
  const placed = layout?.placement?.[key];
  if (placed === 'side' || placed === 'main') return placed;
  if (template.fullWidthSections?.includes(key)) return 'full';
  return template.sideSections.includes(key) ? 'side' : 'main';
}

/** Visible sections, in order, grouped by column. */
export function sectionColumns(template, content, layout) {
  const hidden = new Set(layout?.hiddenSections ?? []);
  const out = { full: [], side: [], main: [] };
  for (const key of resolveSectionOrder(content, layout)) {
    if (hidden.has(key) || notYetAdded(content, layout, key)) continue;
    out[sectionColumn(template, layout, key)].push(key);
  }
  return out;
}

/**
 * Move a section one place up or down among the visible sections of its own column, so the
 * arrows do what the page shows. Returns the layout unchanged at either end.
 */
export function moveSection(template, content, layout, key, direction) {
  const column = sectionColumns(template, content, layout)[sectionColumn(template, layout, key)];
  const i = column.indexOf(key);
  const neighbour = column[i + direction];
  if (i < 0 || !neighbour) return layout;
  const order = resolveSectionOrder(content, layout);
  const a = order.indexOf(key);
  const b = order.indexOf(neighbour);
  [order[a], order[b]] = [order[b], order[a]];
  return { ...layout, sectionOrder: order };
}

/** Put a section in a column; choosing the template's own choice removes the override. */
export function placeSection(template, layout, key, column) {
  const placement = { ...layout?.placement };
  const templateChoice = template.fullWidthSections?.includes(key)
    ? 'full'
    : template.sideSections?.includes(key)
      ? 'side'
      : 'main';
  if (column === templateChoice) delete placement[key];
  else placement[key] = column;
  const next = { ...layout, placement };
  if (!Object.keys(placement).length) delete next.placement;
  return next;
}

export function hideSection(layout, key) {
  const hidden = new Set(layout?.hiddenSections ?? []);
  hidden.add(key);
  return { ...layout, hiddenSections: [...hidden] };
}

export function showSection(layout, key) {
  return { ...layout, hiddenSections: (layout?.hiddenSections ?? []).filter((k) => k !== key) };
}

/** The sidebar side a resume uses: its own choice, or the template's. */
export const sidebarSide = (template, layout) =>
  layout?.sidebarSide === 'left' || layout?.sidebarSide === 'right'
    ? layout.sidebarSide
    : template?.sidebarSide;

/**
 * Ready-made arrangements. Each sets the order of the built-in sections (custom sections keep
 * their place after them) and, on two-column templates, which column some sections use. Hidden
 * sections stay hidden.
 */
export const LAYOUT_PRESETS = [
  {
    id: 'experience',
    name: 'Experience first',
    description: 'The usual order for working professionals.',
    order: [
      'summary',
      'experience',
      'projects',
      'skills',
      'education',
      'certifications',
      'languages',
      'interests',
    ],
    placement: {},
  },
  {
    id: 'skills',
    name: 'Skills first',
    description: 'Lead with what you can do: career changers and technical roles.',
    order: [
      'summary',
      'skills',
      'experience',
      'projects',
      'education',
      'certifications',
      'languages',
      'interests',
    ],
    placement: { skills: 'main' },
  },
  {
    id: 'education',
    name: 'Education first',
    description: 'For students and recent graduates.',
    order: [
      'summary',
      'education',
      'projects',
      'experience',
      'skills',
      'certifications',
      'languages',
      'interests',
    ],
    placement: { education: 'main' },
  },
  {
    id: 'compact',
    name: 'Compact sidebar',
    description: 'Only skills, languages and interests beside the main column.',
    order: [
      'summary',
      'experience',
      'projects',
      'education',
      'certifications',
      'skills',
      'languages',
      'interests',
    ],
    placement: { education: 'main', certifications: 'main' },
    twoColumnOnly: true,
  },
];

export const presetsFor = (template) =>
  LAYOUT_PRESETS.filter((p) => !p.twoColumnOnly || template?.sideSections);

export function applyPreset(template, content, layout, presetId) {
  const preset = LAYOUT_PRESETS.find((p) => p.id === presetId);
  if (!preset) return layout;
  const custom = resolveSectionOrder(content, layout).filter((k) => !SECTION_KEYS.includes(k));
  const next = { ...layout, sectionOrder: [...preset.order, ...custom] };
  if (template?.sideSections) {
    let placed = { ...next, placement: undefined };
    for (const [key, column] of Object.entries(preset.placement))
      placed = placeSection(template, placed, key, column);
    if (!placed.placement) delete placed.placement;
    return placed;
  }
  return next;
}

const samePlacement = (a = {}, b = {}) =>
  JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/** Which preset a layout matches, if any (for showing the current choice). */
export function matchingPreset(template, content, layout) {
  return (
    presetsFor(template).find((p) => {
      const applied = applyPreset(template, content, layout, p.id);
      return (
        JSON.stringify(resolveSectionOrder(content, applied)) ===
          JSON.stringify(resolveSectionOrder(content, layout)) &&
        samePlacement(applied.placement, layout.placement)
      );
    })?.id ?? null
  );
}
