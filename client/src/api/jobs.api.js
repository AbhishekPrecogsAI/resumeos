import { apiFetch } from './client.js';

const base = '/api/v1/jobs';
const enc = encodeURIComponent;

export const jobsApi = {
  list: ({ page = 1, limit = 20 } = {}) => apiFetch(`${base}?page=${page}&limit=${limit}`),
  create: (body) => apiFetch(base, { method: 'POST', body }).then((r) => r.job),
  get: (id) => apiFetch(`${base}/${enc(id)}`).then((r) => r.job),
  update: (id, body) =>
    apiFetch(`${base}/${enc(id)}`, { method: 'PATCH', body }).then((r) => r.job),
  remove: (id) => apiFetch(`${base}/${enc(id)}`, { method: 'DELETE' }),
};

export const JOBS_KEY = ['jobs'];
export const jobKey = (id) => ['job', id];
