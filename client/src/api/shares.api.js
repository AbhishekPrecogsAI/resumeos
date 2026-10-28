import { apiFetch } from './client.js';

const enc = encodeURIComponent;
const base = (resumeId) => `/api/v1/resumes/${enc(resumeId)}/shares`;

export const sharesKey = (resumeId) => ['shares', { resumeId }];

export const sharesApi = {
  list: (resumeId) => apiFetch(base(resumeId)).then((r) => r.shares),
  create: (resumeId, body) =>
    apiFetch(base(resumeId), { method: 'POST', body }).then((r) => r.share),
  update: (resumeId, shareId, body) =>
    apiFetch(`${base(resumeId)}/${enc(shareId)}`, { method: 'PATCH', body }).then((r) => r.share),
  remove: (resumeId, shareId) =>
    apiFetch(`${base(resumeId)}/${enc(shareId)}`, { method: 'DELETE' }),
  // Public: what someone opening the link sees. No session involved.
  view: (token) => apiFetch(`/api/v1/shared/${enc(token)}`).then((r) => r.resume),
  pdfUrl: (token) => `/api/v1/shared/${enc(token)}/pdf`,
};

/** Full link to share, on whatever origin the app is served from. */
export const shareUrl = (share) => `${window.location.origin}${share.path}`;
