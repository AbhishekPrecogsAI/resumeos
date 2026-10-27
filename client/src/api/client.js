// Single fetch wrapper for the app. Uses same-origin paths; Vite proxies them in dev.
export class ApiError extends Error {
  constructor(status, code, message, { requestId, details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export const UNAUTHORIZED_EVENT = 'resumeos:unauthorized';

export async function apiFetch(path, { method = 'GET', body, signal, headers } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      signal,
      credentials: 'include',
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      "Couldn't reach the server. Check your connection and try again.",
    );
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error;
    if (res.status === 401 && e?.code === 'UNAUTHENTICATED') {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(
      res.status,
      e?.code ?? 'HTTP_ERROR',
      e?.message ?? `Request failed (${res.status}).`,
      {
        requestId: e?.requestId,
        details: e?.details,
      },
    );
  }
  return data;
}

/** Map a VALIDATION_FAILED error to { fieldPath: message }. */
export function fieldErrors(error) {
  const out = {};
  for (const f of error?.details?.fields ?? []) if (f.path && !out[f.path]) out[f.path] = f.message;
  return out;
}
