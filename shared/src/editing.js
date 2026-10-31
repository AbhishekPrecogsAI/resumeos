import { newId } from './ids.js';
import { ID_PREFIX, LANGUAGE_LEVEL_IDS } from './resumeModel.js';

/*
 * Pure edits for the on-page editor. Paths come from the editable renderer and use entry ids:
 *   "summary" | "headline" | "contact:email"
 *   "experience:exp_1:title" | "experience:exp_1:bullets:b_2:text"
 *   "custom:sec_1:title" | "custom:sec_1:itm_1:title" | "custom:sec_1:itm_1:bullets:b_1:text"
 *   "skills:sk_1:name" | "skillcat:sk_1,sk_2" (a category heading, named by the skills it groups)
 * Entry keys are the same without the field: "experience:exp_1", "custom:sec_1:itm_1".
 * Every function returns new content and never mutates its input.
 */

const LIST_ENTRY_SECTIONS = [
  'experience',
  'projects',
  'education',
  'certifications',
  'languages',
  'interests',
];

export const BLANK_ENTRY = {
  experience: () => ({
    id: newId(ID_PREFIX.experience),
    company: '',
    title: '',
    location: '',
    employmentType: '',
    startDate: '',
    endDate: '',
    current: false,
    bullets: [],
  }),
  projects: () => ({
    id: newId(ID_PREFIX.projects),
    name: '',
    description: '',
    url: '',
    repositoryUrl: '',
    technologies: [],
    startDate: '',
    endDate: '',
    current: false,
    bullets: [],
  }),
  education: () => ({
    id: newId(ID_PREFIX.education),
    institution: '',
    degree: '',
    field: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    notes: '',
  }),
  certifications: () => ({
    id: newId(ID_PREFIX.certifications),
    name: '',
    issuer: '',
    issuedDate: '',
    expiresDate: '',
    url: '',
  }),
  languages: () => ({ id: newId(ID_PREFIX.languages), name: '', level: '' }),
  interests: () => ({ id: newId(ID_PREFIX.interests), name: '' }),
  custom: () => ({
    id: newId(ID_PREFIX.customItem),
    title: '',
    subtitle: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
    bullets: [],
  }),
};

const FIRST_FIELD = {
  experience: 'title',
  projects: 'name',
  education: 'degree',
  certifications: 'name',
  languages: 'name',
  interests: 'name',
  custom: 'title',
};

/** Resolve an entry key to { list, index, base, kind } within a cloned content object. */
function locateEntry(content, key) {
  const parts = key.split(':');
  if (parts[0] === 'custom') {
    const section = (content.customSections ?? []).find((s) => s.id === parts[1]);
    if (!section) return null;
    const index = section.items.findIndex((i) => i.id === parts[2]);
    return index < 0 ? null : { list: section.items, index, kind: 'custom' };
  }
  if (!LIST_ENTRY_SECTIONS.includes(parts[0])) return null;
  const list = content[parts[0]] ?? [];
  const index = list.findIndex((x) => x.id === parts[1]);
  return index < 0 ? null : { list, index, kind: parts[0] };
}

const clone = (content) => structuredClone(content);

/** Split a field path into its entry key and the field inside the entry. */
export function splitPath(path) {
  const parts = path.split(':');
  if (parts[0] === 'custom') {
    if (parts.length === 3 && parts[2] === 'title')
      return { entryKey: null, sectionId: parts[1], field: ['title'] };
    return { entryKey: parts.slice(0, 3).join(':'), field: parts.slice(3) };
  }
  if (LIST_ENTRY_SECTIONS.includes(parts[0]))
    return { entryKey: parts.slice(0, 2).join(':'), field: parts.slice(2) };
  return { entryKey: null, field: parts };
}

export function setField(content, path, text) {
  const next = clone(content);
  const parts = path.split(':');
  if (path === 'summary' || path === 'headline') next[path] = text;
  else if (parts[0] === 'contact') next.contact[parts[1]] = text;
  else if (parts[0] === 'skills') {
    const skill = next.skills.find((s) => s.id === parts[1]);
    if (skill) skill.name = text;
  } else if (parts[0] === 'skillcat') {
    // The heading is identified by its skills, not its name: typing changes the name on every
    // keystroke while the page (and this path) stays as it was until the next re-render.
    const ids = new Set(parts[1].split(','));
    for (const s of next.skills) if (ids.has(s.id)) s.category = text;
  } else {
    const { entryKey, sectionId, field } = splitPath(path);
    if (sectionId) {
      const section = next.customSections.find((s) => s.id === sectionId);
      if (section) section.title = text;
      return next;
    }
    const loc = locateEntry(next, entryKey);
    if (!loc) return content;
    const entry = loc.list[loc.index];
    if (field[0] === 'bullets') {
      const bullet = entry.bullets.find((b) => b.id === field[1]);
      if (bullet) bullet.text = text;
    } else if (field[0] === 'technologies') {
      entry.technologies = text
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    } else {
      entry[field[0]] = text;
    }
  }
  return next;
}

export function getField(content, path) {
  const parts = path.split(':');
  if (path === 'summary' || path === 'headline') return content[path] ?? '';
  if (parts[0] === 'contact') return content.contact?.[parts[1]] ?? '';
  if (parts[0] === 'skills') return content.skills.find((s) => s.id === parts[1])?.name ?? '';
  if (parts[0] === 'skillcat') {
    const ids = new Set(parts[1].split(','));
    return content.skills.find((s) => ids.has(s.id))?.category ?? '';
  }
  const { entryKey, sectionId, field } = splitPath(path);
  if (sectionId) return content.customSections.find((s) => s.id === sectionId)?.title ?? '';
  const loc = locateEntry(content, entryKey);
  if (!loc) return '';
  const entry = loc.list[loc.index];
  if (field[0] === 'bullets') return entry.bullets.find((b) => b.id === field[1])?.text ?? '';
  if (field[0] === 'technologies') return (entry.technologies ?? []).join(', ');
  return entry[field[0]] ?? '';
}

/** Add an empty entry at the end of a section; returns the path to focus. */
export function addEntry(content, sectionKey) {
  const next = clone(content);
  if (sectionKey === 'summary') return { content: next, focus: 'summary' };
  if (sectionKey === 'skills') return addSkill(next, 'Skills');
  if (sectionKey.startsWith('custom:')) {
    const section = next.customSections.find((s) => `custom:${s.id}` === sectionKey);
    const item = BLANK_ENTRY.custom();
    section.items.push(item);
    return { content: next, focus: `custom:${section.id}:${item.id}:title` };
  }
  const entry = BLANK_ENTRY[sectionKey]();
  (next[sectionKey] ??= []).push(entry);
  return { content: next, focus: `${sectionKey}:${entry.id}:${FIRST_FIELD[sectionKey]}` };
}

export function deleteEntry(content, entryKey) {
  const next = clone(content);
  const loc = locateEntry(next, entryKey);
  if (loc) loc.list.splice(loc.index, 1);
  return next;
}

export function moveEntry(content, entryKey, direction) {
  const next = clone(content);
  const loc = locateEntry(next, entryKey);
  if (!loc) return content;
  const to = loc.index + direction;
  if (to < 0 || to >= loc.list.length) return content;
  const [item] = loc.list.splice(loc.index, 1);
  loc.list.splice(to, 0, item);
  return next;
}

/** Insert a bullet after `afterBulletId` (or at the end); returns the path to focus. */
export function addBullet(content, entryKey, afterBulletId = null) {
  const next = clone(content);
  const loc = locateEntry(next, entryKey);
  if (!loc) return { content, focus: null };
  const entry = loc.list[loc.index];
  entry.bullets ??= [];
  if (entry.bullets.length >= 30) return { content, focus: null };
  const bullet = { id: newId(ID_PREFIX.bullet), text: '', evidenceIds: [] };
  const at = afterBulletId
    ? entry.bullets.findIndex((b) => b.id === afterBulletId) + 1
    : entry.bullets.length;
  entry.bullets.splice(at, 0, bullet);
  return { content: next, focus: `${entryKey}:bullets:${bullet.id}:text` };
}

/** Remove a bullet; focus moves to the previous bullet, or the entry's first field. */
export function removeBullet(content, entryKey, bulletId) {
  const next = clone(content);
  const loc = locateEntry(next, entryKey);
  if (!loc) return { content, focus: null };
  const entry = loc.list[loc.index];
  const i = entry.bullets.findIndex((b) => b.id === bulletId);
  if (i < 0) return { content, focus: null };
  entry.bullets.splice(i, 1);
  const prev = entry.bullets[i - 1];
  return {
    content: next,
    focus: prev ? `${entryKey}:bullets:${prev.id}:text` : `${entryKey}:${FIRST_FIELD[loc.kind]}`,
  };
}

export function addSkill(content, category = 'Skills', afterSkillId = null) {
  const next = clone(content);
  const skill = {
    id: newId(ID_PREFIX.skills),
    name: '',
    category: category === 'Skills' ? '' : category,
    context: '',
    evidenceIds: [],
  };
  const at = afterSkillId
    ? next.skills.findIndex((s) => s.id === afterSkillId) + 1
    : next.skills.length;
  next.skills.splice(at, 0, skill);
  return { content: next, focus: `skills:${skill.id}:name` };
}

export function removeSkill(content, skillId) {
  const next = clone(content);
  const i = next.skills.findIndex((s) => s.id === skillId);
  if (i < 0) return { content, focus: null };
  const [removed] = next.skills.splice(i, 1);
  const prev = next.skills
    .slice(0, i)
    .reverse()
    .find((s) => (s.category || '') === (removed.category || ''));
  return { content: next, focus: prev ? `skills:${prev.id}:name` : null };
}

/** Date fields of an entry, normalised to { start, end, current, hasCurrent }. */
export function getDates(content, entryKey) {
  const loc = locateEntry(content, entryKey);
  if (!loc) return null;
  const x = loc.list[loc.index];
  if (loc.kind === 'certifications')
    return {
      start: x.issuedDate ?? '',
      end: x.expiresDate ?? '',
      current: false,
      hasCurrent: false,
      labels: ['Issued', 'Expires'],
    };
  return {
    start: x.startDate ?? '',
    end: x.endDate ?? '',
    current: Boolean(x.current),
    hasCurrent: true,
    labels: ['Start', 'End'],
  };
}

export function setDates(content, entryKey, { start, end, current }) {
  const next = clone(content);
  const loc = locateEntry(next, entryKey);
  if (!loc) return content;
  const x = loc.list[loc.index];
  if (loc.kind === 'certifications') {
    x.issuedDate = start;
    x.expiresDate = end;
  } else {
    x.startDate = start;
    x.endDate = current ? '' : end;
    x.current = Boolean(current);
  }
  return next;
}

/**
 * Step a level meter on: languages go strongest first then back to none; skills go 1–5 then
 * back to none (no level stored).
 */
export function cycleLevel(content, entryKey) {
  const [section, id] = entryKey.split(':');
  const next = clone(content);
  if (section === 'skills') {
    const skill = (next.skills ?? []).find((s) => s.id === id);
    if (!skill) return content;
    const value = (skill.level ?? 0) + 1;
    if (value > 5) delete skill.level;
    else skill.level = value;
    return next;
  }
  const loc = locateEntry(next, entryKey);
  if (!loc || loc.kind !== 'languages') return content;
  const x = loc.list[loc.index];
  const order = [...LANGUAGE_LEVEL_IDS, ''];
  x.level = order[(order.indexOf(x.level ?? '') + 1) % order.length];
  return next;
}

export function addCustomSection(content, layout, title = '') {
  const nextContent = clone(content);
  const section = { id: newId(ID_PREFIX.customSections), title, items: [BLANK_ENTRY.custom()] };
  nextContent.customSections.push(section);
  return {
    content: nextContent,
    layout: { ...layout, sectionOrder: [...(layout.sectionOrder ?? []), `custom:${section.id}`] },
    focus: `custom:${section.id}:title`,
  };
}
