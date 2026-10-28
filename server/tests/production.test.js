import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { buildApp, makeEnv } from './helpers.js';
import { loadEnv } from '../src/config/env.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

const THEME_SCRIPT = "(function(){document.documentElement.classList.add('x')})();";
const ORIGIN = 'https://resumeos.example';
let dist;
let app;

beforeAll(async () => {
  dist = await mkdtemp(join(tmpdir(), 'resumeos-dist-'));
  await mkdir(join(dist, 'assets'));
  await writeFile(
    join(dist, 'index.html'),
    `<!doctype html><html><head><script>${THEME_SCRIPT}</script></head><body><div id="root"></div><script type="module" src="/assets/app-abc.js"></script></body></html>`,
  );
  await writeFile(join(dist, 'assets', 'app-abc.js'), 'console.log(1)');
  app = buildApp({
    env: makeEnv({
      NODE_ENV: 'production',
      CLIENT_ORIGIN: ORIGIN,
      APP_BASE_URL: ORIGIN,
      RATE_LIMIT_DISABLED: 'false',
      SESSION_SECRET: 'a-real-production-secret-that-is-long-enough-1234',
      CLIENT_DIST_DIR: dist,
    }),
  });
});
afterAll(() => rm(dist, { recursive: true, force: true }));

const https = (r) => r.set('x-forwarded-proto', 'https');

describe('production configuration', () => {
  it('redirects plain HTTP reads and refuses plain HTTP writes, except health checks', async () => {
    const get = await request(app).get('/app/resumes').set('host', 'resumeos.example');
    expect(get.status).toBe(308);
    expect(get.headers.location).toBe('https://resumeos.example/app/resumes');
    const post = await request(app).post('/api/v1/auth/login').set('origin', ORIGIN).send({});
    expect(post.status).toBe(403);
    expect(post.body.error.code).toBe('HTTPS_REQUIRED');
    expect((await request(app).get('/health/live')).status).toBe(200);
  });

  it('serves the SPA with a strict CSP that pins the inline theme script by hash', async () => {
    const res = await https(request(app).get('/app/resumes/123/edit'));
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="root">');
    expect(res.headers['cache-control']).toBe('no-cache');
    const csp = res.headers['content-security-policy'];
    const hash = createHash('sha256').update(THEME_SCRIPT).digest('base64');
    expect(csp).toContain(`script-src 'self' 'sha256-${hash}'`);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
  });

  it('caches hashed assets for a year and 404s missing ones', async () => {
    const asset = await https(request(app).get('/assets/app-abc.js'));
    expect(asset.status).toBe(200);
    expect(asset.headers['cache-control']).toMatch(/max-age=31536000.*immutable/);
    expect((await https(request(app).get('/assets/missing.js'))).status).toBe(404);
  });

  it('keeps API 404s as JSON rather than the SPA', async () => {
    const res = await https(request(app).get('/api/v1/nope'));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('marks session cookies Secure', async () => {
    const res = await https(request(app).post('/api/v1/auth/login').set('origin', ORIGIN)).send({
      email: 'x@example.com',
      password: 'whatever',
    });
    // Login fails without a database user, but any Set-Cookie in production must be Secure.
    for (const c of res.headers['set-cookie'] ?? []) expect(c).toMatch(/Secure/);
  });
});

describe('production environment validation', () => {
  const base = {
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb://db/resumeos',
    SESSION_SECRET: 'a-real-production-secret-that-is-long-enough-1234',
    CLIENT_ORIGIN: ORIGIN,
    APP_BASE_URL: ORIGIN,
  };
  it('accepts a sound production config', () => {
    expect(() => loadEnv(base)).not.toThrow();
  });
  it.each([
    ['http app URL', { APP_BASE_URL: 'http://resumeos.example' }, /APP_BASE_URL/],
    ['http client origin', { CLIENT_ORIGIN: 'http://resumeos.example' }, /CLIENT_ORIGIN/],
    ['disabled rate limits', { RATE_LIMIT_DISABLED: 'true' }, /RATE_LIMIT_DISABLED/],
    ['placeholder secret', { SESSION_SECRET: 'replace-with-a-long-random-secret' }, /placeholder/],
  ])('rejects %s', (_name, overrides, pattern) => {
    expect(() => loadEnv({ ...base, ...overrides })).toThrow(pattern);
  });
});

describe('error logging', () => {
  it('never logs error messages, which may contain user input', () => {
    const logged = [];
    const handler = errorHandler({ error: (msg, fields) => logged.push({ msg, ...fields }) });
    const err = new Error('Cast to ObjectId failed for value "secret resume text"');
    const res = { status: () => res, json: () => res };
    handler(err, { id: 'req-1' }, res, () => {});
    expect(JSON.stringify(logged)).not.toContain('secret resume text');
    expect(logged[0]).toMatchObject({ name: 'Error', requestId: 'req-1' });
  });
});
