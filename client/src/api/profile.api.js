import { apiFetch } from './client.js';

export const profileApi = {
  get: ({ signal } = {}) => apiFetch('/api/v1/profile', { signal }).then((r) => r.profile),
  replace: (revision, content) =>
    apiFetch('/api/v1/profile', {
      method: 'PUT',
      body: { content },
      headers: { 'if-match': `"${revision}"` },
    }).then((r) => r.profile),
};
