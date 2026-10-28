import { bulletText } from '../resumeModel.js';

/**
 * Deterministic fixes. Each returns new content and never touches anything outside the finding's
 * target. They run only when the user clicks "Fix", through the editor so Undo reverses them.
 */
function entryList(content, fix) {
  if (fix.customSectionId)
    return content.customSections.find((s) => s.id === fix.customSectionId)?.items ?? [];
  return content[fix.section] ?? [];
}

function forEachBullet(content, fn) {
  const visit = (entries) =>
    entries.forEach((e) => (e.bullets ?? []).forEach((b, i, arr) => fn(b, i, arr, e)));
  ['experience', 'projects'].forEach((k) => visit(content[k] ?? []));
  (content.customSections ?? []).forEach((s) => visit(s.items ?? []));
}

export function applyFix(content, fix) {
  const next = structuredClone(content);
  switch (fix.type) {
    case 'removeBullet': {
      const entry = entryList(next, fix).find((e) => e.id === fix.entryId);
      if (entry) entry.bullets = entry.bullets.filter((b) => b.id !== fix.bulletId);
      return next;
    }
    case 'normalizeSpacing': {
      const entry = entryList(next, fix).find((e) => e.id === fix.entryId);
      const bullet = entry?.bullets.find((b) => b.id === fix.bulletId);
      if (bullet) bullet.text = bulletText(bullet).replace(/\s+/g, ' ').trim();
      return next;
    }
    case 'clearEndDate': {
      const entry = entryList(next, fix).find((e) => e.id === fix.entryId);
      if (entry) entry.endDate = '';
      return next;
    }
    case 'setTrailingPeriods': {
      const ids = new Set(fix.bulletIds);
      forEachBullet(next, (b) => {
        if (!ids.has(b.id) || !b.text.trim()) return;
        const trimmed = b.text.replace(/\s+$/, '');
        if (fix.mode === 'add' && !/[.!?]$/.test(trimmed)) b.text = `${trimmed}.`;
        if (fix.mode === 'remove' && /\.$/.test(trimmed) && !/\.\.$/.test(trimmed))
          b.text = trimmed.slice(0, -1);
      });
      return next;
    }
    default:
      throw new Error(`Unknown fix type: ${fix.type}`);
  }
}
