export const words = (s) =>
  String(s ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
export const normalizeForCompare = (s) =>
  String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%$.+]+/gu, ' ')
    .trim();
/** Looser comparison for duplicates: also ignores sentence punctuation. */
export const normalizeLoose = (s) =>
  normalizeForCompare(s)
    .replace(/[.!?,;:]+(\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export const excerpt = (s, max = 90) => {
  const t = String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};
export const firstWord = (s) => normalizeForCompare(s).split(' ')[0] ?? '';

// A measurable claim: a percentage, a multiplier, money, a duration/latency figure or any
// number of two or more digits. Deliberately broad; the finding is a reminder, not a verdict.
const METRIC_RE =
  /(\d+(?:[.,]\d+)?\s?%|\b\d+(?:\.\d+)?x\b|[$€£]\s?\d|\b\d+(?:\.\d+)?\s?(?:ms|s|sec|seconds|minutes|hours|days|k|m|mb|gb|tb|rps|qps)\b|\b\d{2,}\b)/i;
export const hasMetric = (s) => METRIC_RE.test(String(s ?? ''));
