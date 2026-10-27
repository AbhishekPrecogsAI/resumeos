import { vi } from 'vitest';

/** Route-based fetch mock: handlers keyed by "METHOD /path" return [status, body]. */
export function mockApi(handlers) {
  const calls = [];
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    const path = String(url);
    calls.push({ method, path, body: init.body ? JSON.parse(init.body) : undefined });
    const handler = handlers[`${method} ${path}`];
    const [status, body] = handler
      ? typeof handler === 'function'
        ? handler(init)
        : handler
      : [404, { error: { code: 'NOT_FOUND', message: 'Not mocked' } }];
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  });
  return { spy, calls };
}

export const SIGNED_OUT = {
  'GET /api/v1/auth/me': [
    401,
    { error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } },
  ],
};

export const TEST_USER = {
  id: 'u1',
  email: 'mira@example.com',
  displayName: 'Mira Okafor',
  emailVerified: false,
  preferences: { theme: 'system', locale: 'en-US', pageSize: 'A4' },
};

export const SIGNED_IN = { 'GET /api/v1/auth/me': [200, { user: TEST_USER }] };
