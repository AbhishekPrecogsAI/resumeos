import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { buildApp, connectTestDb, dropTestDb, ORIGIN } from './helpers.js';

const app = buildApp();
beforeAll(connectTestDb);
afterAll(dropTestDb);

// The only API routes that work without a session.
const PUBLIC = new Set([
  'GET /meta/',
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/logout',
  'POST /auth/forgot-password',
  'POST /auth/reset-password',
]);
// Body-less state changes that take no input, so they need no validator.
const NO_INPUT = new Set([
  'POST /auth/logout',
  'POST /auth/forgot-password',
  'POST /auth/reset-password',
  'POST /auth/sessions/revoke-others',
  'GET /auth/me',
  'GET /account/',
  'GET /meta/',
]);

function inventory() {
  const routes = [];
  for (const { prefix, router } of app.locals.routeManifest) {
    for (const layer of router.stack) {
      if (!layer.route) continue;
      for (const method of Object.keys(layer.route.methods)) {
        const path =
          `${prefix}${layer.route.path === '/' ? '/' : layer.route.path}`.replace(/\/+$/, (m) =>
            m.length ? '/' : '',
          ) || '/';
        routes.push({
          method: method.toUpperCase(),
          path,
          key: `${method.toUpperCase()} ${path}`,
          validated: layer.route.stack.some((s) => s.handle.isValidator),
        });
      }
    }
  }
  return routes;
}

const sample = (path) =>
  path
    .replace(/:key/g, 'DUPLICATE_BULLET:0123456789abcdef')
    .replace(/:[A-Za-z]+/g, '0123456789abcdef01234567');

describe('route inventory', () => {
  const routes = inventory();

  it('finds the whole API', () => {
    expect(routes.length).toBeGreaterThan(50);
  });

  it.each(routes.filter((r) => !PUBLIC.has(r.key)).map((r) => [r.key, r]))(
    '%s rejects anonymous requests',
    async (_key, r) => {
      const res = await request(app)
        [r.method.toLowerCase()](`/api/v1${sample(r.path)}`)
        .set('origin', ORIGIN)
        .send({});
      expect(res.status).toBe(401);
    },
  );

  it('every route with path parameters or a body validates its input', () => {
    const needsValidation = (r) => r.path.includes(':') || r.method !== 'GET';
    const unvalidated = routes.filter(
      (r) => needsValidation(r) && !r.validated && !NO_INPUT.has(r.key),
    );
    expect(unvalidated.map((r) => r.key)).toEqual([]);
  });

  it('the only unvalidated routes are input-free reads or explicitly listed', () => {
    const unvalidated = routes
      .filter((r) => !r.validated)
      .map((r) => r.key)
      .sort();
    expect(unvalidated).toEqual(
      [...NO_INPUT, 'GET /auth/sessions', 'GET /account/export', 'GET /profile/'].sort(),
    );
  });

  it('rejects state-changing requests from other origins before anything else', async () => {
    for (const r of routes.filter((x) => x.method !== 'GET')) {
      const res = await request(app)
        [r.method.toLowerCase()](`/api/v1${sample(r.path)}`)
        .set('origin', 'https://evil.example')
        .send({});
      expect([r.key, res.status]).toEqual([r.key, 403]);
    }
  });
});
