import { apiFetch } from './client.js';

const enc = encodeURIComponent;

export const exportsApi = {
  create: (resumeId, body, { idempotencyKey } = {}) =>
    apiFetch(`/api/v1/resumes/${enc(resumeId)}/export`, {
      method: 'POST',
      body,
      headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : undefined,
    }).then((r) => r.export),
  list: ({ page = 1, limit = 10, resumeId } = {}) =>
    apiFetch(
      `/api/v1/exports?page=${page}&limit=${limit}${resumeId ? `&resumeId=${enc(resumeId)}` : ''}`,
    ),
  remove: (id) => apiFetch(`/api/v1/exports/${enc(id)}`, { method: 'DELETE' }),
  downloadUrl: (id) => `/api/v1/exports/${enc(id)}/download`,
};
