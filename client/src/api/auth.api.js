import { apiFetch } from './client.js';

const base = '/api/v1/auth';

export const authApi = {
  me: ({ signal } = {}) => apiFetch(`${base}/me`, { signal }),
  register: (body) => apiFetch(`${base}/register`, { method: 'POST', body }),
  login: (body) => apiFetch(`${base}/login`, { method: 'POST', body }),
  logout: () => apiFetch(`${base}/logout`, { method: 'POST' }),
  changePassword: (body) => apiFetch(`${base}/change-password`, { method: 'POST', body }),
  sessions: () => apiFetch(`${base}/sessions`),
  revokeSession: (id) =>
    apiFetch(`${base}/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  revokeOtherSessions: () => apiFetch(`${base}/sessions/revoke-others`, { method: 'POST' }),
  forgotPassword: (body) => apiFetch(`${base}/forgot-password`, { method: 'POST', body }),
};
