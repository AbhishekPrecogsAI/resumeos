import { apiFetch } from './client.js';

const base = (resumeId) => `/api/v1/resumes/${encodeURIComponent(resumeId)}`;

export const versionsApi = {
  list: (resumeId, { page = 1, limit = 50 } = {}) =>
    apiFetch(`${base(resumeId)}/versions?page=${page}&limit=${limit}`),
  create: (resumeId, body) =>
    apiFetch(`${base(resumeId)}/versions`, { method: 'POST', body }).then((r) => r.version),
  restore: (resumeId, versionId) =>
    apiFetch(`${base(resumeId)}/versions/${encodeURIComponent(versionId)}/restore`, {
      method: 'POST',
      body: {},
    }),
  remove: (resumeId, versionId) =>
    apiFetch(`${base(resumeId)}/versions/${encodeURIComponent(versionId)}`, { method: 'DELETE' }),
  compare: (resumeId, left, right) =>
    apiFetch(
      `${base(resumeId)}/compare?left=${encodeURIComponent(left)}&right=${encodeURIComponent(right)}`,
    ),
};

export const versionsKey = (resumeId) => ['versions', resumeId];
