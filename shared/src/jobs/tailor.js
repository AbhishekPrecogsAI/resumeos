import { pullFromProfile } from '../sync.js';

/**
 * Apply user-approved coverage suggestions to a resume draft. Only reuses content that already
 * exists in the profile or the resume; never writes new claims or skills.
 */
export function applySuggestions(draft, profile, suggestions) {
  let { content, layout, baselines } = structuredClone(draft);
  for (const s of suggestions) {
    if (s.type === 'showSection')
      layout = {
        ...layout,
        hiddenSections: (layout.hiddenSections ?? []).filter((k) => k !== s.section),
      };
    else if (s.type === 'showItem')
      layout = { ...layout, hiddenItems: (layout.hiddenItems ?? []).filter((id) => id !== s.id) };
    else if (s.type === 'addFromProfile') {
      const next = pullFromProfile(content, profile, baselines ?? {}, {
        section: s.section,
        id: s.id,
      });
      content = next.content;
      baselines = next.baselines;
    }
  }
  return { content, layout, baselines };
}
