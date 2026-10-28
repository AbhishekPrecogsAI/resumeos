import { mix } from './color.js';

/**
 * Optional page background patterns. Each is a small SVG tile, tinted from the accent and drawn
 * at low opacity, used as a CSS background layer: no positioned elements, no text, so reading
 * order and text extraction are unaffected. Tiles are deterministic (no randomness at render).
 */
export const PATTERNS = [
  { id: 'none', name: 'None' },
  { id: 'network', name: 'Network' },
  { id: 'dots', name: 'Dots' },
  { id: 'grid', name: 'Grid' },
  { id: 'diagonal', name: 'Diagonal lines' },
  { id: 'waves', name: 'Waves' },
];
export const PATTERN_IDS = PATTERNS.map((p) => p.id);

// Maximum opacity of any pattern mark. Kept low enough that text stays ≥ 4.5:1 (see tests).
export const PATTERN_MAX_OPACITY = 0.16;

/** Small deterministic PRNG so the network tile is identical on every render. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function networkTile(color) {
  const size = 320;
  const rand = seeded(20241028);
  const nodes = Array.from({ length: 16 }, () => ({
    x: 10 + rand() * (size - 20),
    y: 10 + rand() * (size - 20),
    r: 2 + rand() * 3.5,
  }));
  const lines = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (d < 110)
        lines.push(
          `<line x1="${nodes[i].x.toFixed(1)}" y1="${nodes[i].y.toFixed(1)}" x2="${nodes[j].x.toFixed(1)}" y2="${nodes[j].y.toFixed(1)}"/>`,
        );
    }
  }
  const circles = nodes
    .map((n) => `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r.toFixed(1)}"/>`)
    .join('');
  return {
    size,
    svg: `<g stroke="${color}" stroke-opacity="0.11" stroke-width="0.9">${lines.join('')}</g><g fill="${color}" fill-opacity="${PATTERN_MAX_OPACITY}">${circles}</g>`,
  };
}

const TILES = {
  network: networkTile,
  dots: (color) => ({
    size: 14,
    svg: `<circle cx="7" cy="7" r="1.2" fill="${color}" fill-opacity="${PATTERN_MAX_OPACITY}"/>`,
  }),
  grid: (color) => ({
    size: 22,
    svg: `<path d="M22 0H0V22" fill="none" stroke="${color}" stroke-opacity="0.1" stroke-width="0.8"/>`,
  }),
  diagonal: (color) => ({
    size: 12,
    svg: `<path d="M-3 3l6-6M0 12L12 0M9 15l6-6" stroke="${color}" stroke-opacity="0.1" stroke-width="0.8"/>`,
  }),
  waves: (color) => ({
    size: 120,
    svg: `<g fill="none" stroke="${color}" stroke-opacity="0.12" stroke-width="1">${[
      15, 45, 75, 105,
    ]
      .map(
        (y) =>
          `<path d="M0 ${y} C 20 ${y - 10}, 40 ${y - 10}, 60 ${y} S 100 ${y + 10}, 120 ${y}"/>`,
      )
      .join('')}</g>`,
  }),
};

/** CSS background layer for a pattern, or null for none/unknown. */
export function patternLayer(id, accent) {
  const tile = TILES[id];
  if (!tile) return null;
  const color = mix(accent, '#000000', 0.15);
  const { size, svg } = tile(color);
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${svg}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(doc)}") 0 0 / ${size}px ${size}px repeat`;
}
