import { apiFetch } from './client.js';

const base = '/api/v1/applications';
const enc = encodeURIComponent;

export const applicationsApi = {
  list: ({ status, limit = 100 } = {}) =>
    apiFetch(`${base}?limit=${limit}${status ? `&status=${enc(status)}` : ''}`),
  due: (today) => apiFetch(`${base}/due?today=${enc(today)}`).then((r) => r.items),
  create: (body) => apiFetch(base, { method: 'POST', body }).then((r) => r.application),
  update: (id, body) =>
    apiFetch(`${base}/${enc(id)}`, { method: 'PATCH', body }).then((r) => r.application),
  remove: (id) => apiFetch(`${base}/${enc(id)}`, { method: 'DELETE' }),
};

export const APPLICATIONS_KEY = ['applications'];

/** Today's date in the user's own timezone, as YYYY-MM-DD. */
export function localToday(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Format a date-only string without timezone shifts. */
export function formatDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return '';
  const [y, m, d] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export const STATUSES = [
  { value: 'planned', label: 'Planned', tone: 'neutral' },
  { value: 'applied', label: 'Applied', tone: 'accent' },
  { value: 'interviewing', label: 'Interviewing', tone: 'warn' },
  { value: 'offer', label: 'Offer', tone: 'added' },
  { value: 'rejected', label: 'Rejected', tone: 'removed' },
  { value: 'withdrawn', label: 'Withdrawn', tone: 'neutral' },
];
export const STATUS_BY_VALUE = Object.fromEntries(STATUSES.map((s) => [s.value, s]));
export const OPEN_STATUSES = new Set(['planned', 'applied', 'interviewing']);
