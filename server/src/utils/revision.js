import { HttpError } from './HttpError.js';

/** Read the expected revision from `If-Match: "3"` (quotes and W/ prefix optional). */
export function expectedRevision(req) {
  const header = req.get('if-match');
  if (!header) {
    throw new HttpError(
      428,
      'REVISION_REQUIRED',
      'Send the If-Match header with the revision you last loaded.',
    );
  }
  const match = /^(?:W\/)?"?(\d{1,9})"?$/.exec(header.trim());
  if (!match)
    throw new HttpError(400, 'INVALID_REVISION', 'If-Match must contain a revision number.');
  return Number(match[1]);
}

export function setRevisionHeader(res, revision) {
  res.set('etag', `"${revision}"`);
}

export function staleRevision(current) {
  return new HttpError(
    409,
    'STALE_REVISION',
    'This was changed somewhere else since you loaded it. Reload to see the latest version, then reapply your edits.',
    { currentRevision: current },
  );
}
