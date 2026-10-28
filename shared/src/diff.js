import { bulletText, LIST_SECTIONS, resolveSectionOrder, sectionTitle } from './resumeModel.js';
import { stableStringify } from './hash.js';

/**
 * Field- and section-level comparison of two resume states ({ content, layout, templateId, pageSize }).
 * Entries are matched by stable id, so renames show as "modified" and moves as "reordered".
 * Template/page settings are reported separately from content.
 */

const MAX_WORD_DIFF_TOKENS = 600;
const same = (a, b) => stableStringify(a) === stableStringify(b);

/** Word-level diff via LCS. Falls back to whole replace for very long texts. */
export function wordDiff(before = '', after = '') {
  if (before === after) return [{ type: 'same', text: before }];
  const a = before.split(/(\s+)/).filter((t) => t !== '');
  const b = after.split(/(\s+)/).filter((t) => t !== '');
  if (a.length + b.length > MAX_WORD_DIFF_TOKENS) {
    return [
      ...(before ? [{ type: 'del', text: before }] : []),
      ...(after ? [{ type: 'add', text: after }] : []),
    ];
  }
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  const push = (type, text) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push('same', a[i]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('del', a[i]);
      i += 1;
    } else {
      push('add', b[j]);
      j += 1;
    }
  }
  while (i < a.length) push('del', a[i++]);
  while (j < b.length) push('add', b[j++]);
  return out;
}

/** Ids whose relative position changed: those outside a longest increasing subsequence. */
function movedIds(leftIds, rightIds) {
  const common = rightIds.filter((id) => leftIds.includes(id));
  const positions = common.map((id) => leftIds.indexOf(id));
  const tails = [];
  const prev = new Array(positions.length).fill(-1);
  const tailIdx = [];
  positions.forEach((p, i) => {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < p) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = p;
    tailIdx[lo] = i;
    prev[i] = lo > 0 ? tailIdx[lo - 1] : -1;
  });
  const keep = new Set();
  for (let k = tailIdx[tails.length - 1] ?? -1; k >= 0; k = prev[k]) keep.add(common[k]);
  return new Set(common.filter((id) => !keep.has(id)));
}

const TEXT_FIELDS = new Set(['summary', 'headline', 'description', 'notes', 'text']);

function fieldChanges(before = {}, after = {}, skip = ['id', 'bullets', 'items']) {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (k) => !skip.includes(k),
  );
  const changes = [];
  for (const key of keys) {
    if (same(before[key], after[key])) continue;
    const change = { field: key, before: before[key] ?? null, after: after[key] ?? null };
    if (
      TEXT_FIELDS.has(key) &&
      typeof change.before === 'string' &&
      typeof change.after === 'string'
    ) {
      change.words = wordDiff(change.before, change.after);
    }
    changes.push(change);
  }
  return changes;
}

function diffBullets(before = [], after = []) {
  const beforeById = new Map(before.map((b) => [b.id, b]));
  const afterById = new Map(after.map((b) => [b.id, b]));
  const moved = movedIds(
    before.map((b) => b.id),
    after.map((b) => b.id),
  );
  const out = [];
  for (const b of after) {
    const old = beforeById.get(b.id);
    if (!old) out.push({ id: b.id, status: 'added', after: bulletText(b) });
    else if (bulletText(old) !== bulletText(b))
      out.push({
        id: b.id,
        status: 'modified',
        before: bulletText(old),
        after: bulletText(b),
        words: wordDiff(bulletText(old), bulletText(b)),
        moved: moved.has(b.id),
      });
    else if (moved.has(b.id)) out.push({ id: b.id, status: 'reordered', after: bulletText(b) });
    else if (!same(old.evidenceIds ?? [], b.evidenceIds ?? []))
      out.push({
        id: b.id,
        status: 'modified',
        before: bulletText(old),
        after: bulletText(b),
        evidenceChanged: true,
      });
  }
  for (const b of before)
    if (!afterById.has(b.id)) out.push({ id: b.id, status: 'removed', before: bulletText(b) });
  return out;
}

function entryLabel(entry) {
  if (!entry) return '';
  return (
    [entry.title, entry.company].filter(Boolean).join(', ') ||
    entry.name ||
    entry.institution ||
    entry.title ||
    'Untitled entry'
  );
}

function diffEntries(before = [], after = [], { nested } = {}) {
  const beforeById = new Map(before.map((e) => [e.id, e]));
  const afterById = new Map(after.map((e) => [e.id, e]));
  const moved = movedIds(
    before.map((e) => e.id),
    after.map((e) => e.id),
  );
  const entries = [];
  for (const e of after) {
    const old = beforeById.get(e.id);
    if (!old) {
      entries.push({ id: e.id, label: entryLabel(e), status: 'added', after: e });
      continue;
    }
    const fields = fieldChanges(old, e);
    const bullets = diffBullets(old.bullets, e.bullets);
    const items = nested ? diffEntries(old.items, e.items) : [];
    const modified = fields.length || bullets.length || items.length;
    if (modified || moved.has(e.id)) {
      entries.push({
        id: e.id,
        label: entryLabel(e),
        status: modified ? 'modified' : 'reordered',
        moved: moved.has(e.id),
        fields,
        bullets,
        items,
      });
    }
  }
  for (const e of before)
    if (!afterById.has(e.id))
      entries.push({ id: e.id, label: entryLabel(e), status: 'removed', before: e });
  return entries;
}

function statusOf(changes) {
  if (!changes.length) return 'unchanged';
  return 'modified';
}

export function diffResumes(left, right) {
  const lc = left.content;
  const rc = right.content;
  const sections = [];

  const contact = fieldChanges(lc.contact, rc.contact, []);
  sections.push({
    key: 'contact',
    title: 'Header and contact',
    status: statusOf(contact),
    fields: contact,
    entries: [],
  });

  const summaryFields = [
    ...fieldChanges({ headline: lc.headline }, { headline: rc.headline }),
    ...fieldChanges({ summary: lc.summary }, { summary: rc.summary }),
  ];
  sections.push({
    key: 'summary',
    title: 'Summary',
    status: statusOf(summaryFields),
    fields: summaryFields,
    entries: [],
  });

  for (const key of LIST_SECTIONS.filter((k) => k !== 'customSections')) {
    const entries = diffEntries(lc[key], rc[key]);
    sections.push({
      key,
      title: sectionTitle(rc, key),
      status: statusOf(entries),
      fields: [],
      entries,
    });
  }

  const leftCustom = new Map((lc.customSections ?? []).map((s) => [s.id, s]));
  const rightCustom = new Map((rc.customSections ?? []).map((s) => [s.id, s]));
  for (const [id, s] of rightCustom) {
    const old = leftCustom.get(id);
    if (!old) {
      sections.push({
        key: `custom:${id}`,
        title: s.title || 'Untitled section',
        status: 'added',
        fields: [],
        entries: (s.items ?? []).map((e) => ({
          id: e.id,
          label: entryLabel(e),
          status: 'added',
          after: e,
        })),
      });
    } else {
      const fields = fieldChanges(old, s);
      const entries = diffEntries(old.items, s.items);
      sections.push({
        key: `custom:${id}`,
        title: s.title || 'Untitled section',
        status: fields.length || entries.length ? 'modified' : 'unchanged',
        fields,
        entries,
      });
    }
  }
  for (const [id, s] of leftCustom) {
    if (!rightCustom.has(id)) {
      sections.push({
        key: `custom:${id}`,
        title: s.title || 'Untitled section',
        status: 'removed',
        fields: [],
        entries: (s.items ?? []).map((e) => ({
          id: e.id,
          label: entryLabel(e),
          status: 'removed',
          before: e,
        })),
      });
    }
  }

  // Layout: order and visibility, reported separately from content.
  const leftOrder = resolveSectionOrder(lc, left.layout);
  const rightOrder = resolveSectionOrder(rc, right.layout);
  const commonLeft = leftOrder.filter((k) => rightOrder.includes(k));
  const commonRight = rightOrder.filter((k) => leftOrder.includes(k));
  const leftHidden = new Set(left.layout?.hiddenSections ?? []);
  const rightHidden = new Set(right.layout?.hiddenSections ?? []);
  const visibility = [...new Set([...leftHidden, ...rightHidden])]
    .filter(
      (k) =>
        leftHidden.has(k) !== rightHidden.has(k) &&
        (leftOrder.includes(k) || rightOrder.includes(k)),
    )
    .map((k) => ({
      section: k,
      title: sectionTitle(rightOrder.includes(k) ? rc : lc, k),
      before: leftHidden.has(k) ? 'hidden' : 'shown',
      after: rightHidden.has(k) ? 'hidden' : 'shown',
    }));
  const leftHiddenItems = new Set(left.layout?.hiddenItems ?? []);
  const rightHiddenItems = new Set(right.layout?.hiddenItems ?? []);
  const itemsHidden = [...rightHiddenItems].filter((id) => !leftHiddenItems.has(id)).length;
  const itemsShown = [...leftHiddenItems].filter((id) => !rightHiddenItems.has(id)).length;
  const layout = {
    orderChanged: !same(commonLeft, commonRight),
    beforeOrder: leftOrder.map((k) => sectionTitle(lc, k)),
    afterOrder: rightOrder.map((k) => sectionTitle(rc, k)),
    visibility,
    itemsHidden,
    itemsShown,
  };

  const template = [];
  if (left.templateId !== right.templateId)
    template.push({ field: 'templateId', before: left.templateId, after: right.templateId });
  if (left.pageSize !== right.pageSize)
    template.push({ field: 'pageSize', before: left.pageSize, after: right.pageSize });
  if ((left.accentColor ?? null) !== (right.accentColor ?? null))
    template.push({
      field: 'accentColor',
      before: left.accentColor ?? null,
      after: right.accentColor ?? null,
    });
  if ((left.backgroundPattern ?? 'none') !== (right.backgroundPattern ?? 'none'))
    template.push({
      field: 'backgroundPattern',
      before: left.backgroundPattern ?? 'none',
      after: right.backgroundPattern ?? 'none',
    });

  const summary = { added: 0, removed: 0, modified: 0, reordered: 0 };
  const count = (entries) => {
    for (const e of entries) {
      if (e.status === 'added') summary.added += 1;
      else if (e.status === 'removed') summary.removed += 1;
      else if (e.status === 'reordered') summary.reordered += 1;
      else if (e.status === 'modified') summary.modified += 1;
    }
  };
  for (const s of sections) {
    if (s.status === 'added' && s.key.startsWith('custom:')) summary.added += 1;
    else if (s.status === 'removed' && s.key.startsWith('custom:')) summary.removed += 1;
    summary.modified += s.fields.length;
    count(s.entries);
  }
  const identical =
    !summary.added &&
    !summary.removed &&
    !summary.modified &&
    !summary.reordered &&
    !layout.orderChanged &&
    !visibility.length &&
    !itemsHidden &&
    !itemsShown &&
    !template.length;

  return { identical, summary, sections, layout, template };
}
