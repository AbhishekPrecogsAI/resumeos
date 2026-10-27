import { apiFetch } from './client.js';

const base = '/api/v1/account';

export const accountApi = {
  update: (body) => apiFetch(base, { method: 'PATCH', body }),
  exportData: () => apiFetch(`${base}/export`),
  remove: (body) => apiFetch(base, { method: 'DELETE', body }),
};
