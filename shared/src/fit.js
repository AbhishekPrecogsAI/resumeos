// Gentlest first: tighten spacing, then step the text size down. Never below 85%.
export const FIT_STEPS = [
  { spacing: 'compact', fontScale: 1 },
  { spacing: 'compact', fontScale: 0.95 },
  { spacing: 'compact', fontScale: 0.9 },
  { spacing: 'compact', fontScale: 0.85 },
];

/**
 * Find the gentlest spacing and text size that fits a resume on one page. `countPages(layout)`
 * resolves to the page count for a layout (the server renders the real PDF). Resolves to
 * { alreadyFits, layout, pages }: `layout` is the first step that fits, or null when even the
 * smallest step doesn't (then `pages` is the count at that step).
 */
export async function fitToOnePage(layout, countPages) {
  let pages = await countPages(layout);
  if (pages <= 1) return { alreadyFits: true, layout, pages };
  for (const step of FIT_STEPS) {
    // Never make text bigger than the resume already has.
    const next = {
      ...layout,
      spacing: step.spacing,
      fontScale: Math.min(step.fontScale, layout.fontScale ?? 1),
    };
    pages = await countPages(next);
    if (pages <= 1) return { alreadyFits: false, layout: next, pages };
  }
  return { alreadyFits: false, layout: null, pages };
}
