// Employment dates are stored as date-only strings ("YYYY" or "YYYY-MM") to avoid timezone shifts.
const MONTH_RE = /^(\d{4})(?:-(0[1-9]|1[0-2]))?$/;

export function parseMonth(value) {
  const match = MONTH_RE.exec(String(value ?? ''));
  if (!match) return null;
  return { year: Number(match[1]), month: match[2] ? Number(match[2]) : null };
}

export function isValidMonth(value) {
  return parseMonth(value) !== null;
}

/** Compare two date-only strings. Year-only values sort as January. */
export function compareMonths(a, b) {
  const pa = parseMonth(a);
  const pb = parseMonth(b);
  if (!pa || !pb) return 0;
  return pa.year * 12 + (pa.month ?? 1) - (pb.year * 12 + (pb.month ?? 1));
}

export function formatMonth(value, locale = 'en-US') {
  const parsed = parseMonth(value);
  if (!parsed) return '';
  if (!parsed.month) return String(parsed.year);
  // Construct in UTC and format in UTC so no local timezone can shift the month.
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, 1));
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatRange(
  start,
  end,
  { current = false, locale = 'en-US', presentLabel = 'Present' } = {},
) {
  const from = formatMonth(start, locale);
  const to = current ? presentLabel : formatMonth(end, locale);
  if (from && to) return `${from} – ${to}`;
  return from || to || '';
}
