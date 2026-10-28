export const PAGE_PX = { A4: { w: 794, h: 1123 }, Letter: { w: 816, h: 1056 } };

/**
 * Laid-out height of a rendered resume document in screen pixels. The root's scrollHeight is
 * reported before CSS zoom (used for the text-size setting), so scale it by the zoom.
 */
export function documentHeight(doc) {
  const root = doc.documentElement;
  const zoom = parseFloat(doc.defaultView?.getComputedStyle(root).zoom) || 1;
  return root.scrollHeight * zoom;
}

/** Approximate printed pages for a height. Exact page breaks are checked at export. */
export const pagesFor = (height, pageSize) =>
  Math.max(1, Math.ceil((height - 2) / (PAGE_PX[pageSize] ?? PAGE_PX.A4).h));
