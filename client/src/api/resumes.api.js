import { apiFetch } from './client.js';

const base = '/api/v1/resumes';
const enc = encodeURIComponent;

export const resumesApi = {
  list: ({ page = 1, limit = 20, includeArchived = false } = {}) =>
    apiFetch(`${base}?page=${page}&limit=${limit}&includeArchived=${includeArchived}`),
  create: (body) => apiFetch(base, { method: 'POST', body }).then((r) => r.resume),
  get: (id, { signal } = {}) => apiFetch(`${base}/${enc(id)}`, { signal }).then((r) => r.resume),
  update: (id, body) =>
    apiFetch(`${base}/${enc(id)}`, { method: 'PATCH', body }).then((r) => r.resume),
  saveDraft: (id, revision, draft) =>
    apiFetch(`${base}/${enc(id)}/draft`, {
      method: 'PUT',
      body: draft,
      headers: { 'if-match': `"${revision}"` },
    }).then((r) => r.resume),
  duplicate: (id, body = {}) =>
    apiFetch(`${base}/${enc(id)}/duplicate`, { method: 'POST', body }).then((r) => r.resume),
  remove: (id) => apiFetch(`${base}/${enc(id)}`, { method: 'DELETE' }),
};
