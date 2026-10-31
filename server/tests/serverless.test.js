import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import request from 'supertest';
import picomatch from 'picomatch';
import {
  buildApp,
  connectTestDb,
  dropTestDb,
  clearCollections,
  makeEnv,
  registerUser,
} from './helpers.js';
import { loadEnv } from '../src/config/env.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { fontFiles, TEMPLATE_FONTS } from '@resumeos/shared/templates/fonts.js';
import { ExportFile } from '../src/modules/exports/storage.js';
import { ExportRecord } from '../src/modules/exports/export.model.js';
import { MongoRateLimitStore, RateLimitCounter } from '../src/middleware/rateLimitStore.js';
import { contentSecurityPolicy, inlineScriptHashes } from '../src/middleware/clientApp.js';

const ROOT = join(import.meta.dirname, '..', '..');
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));

beforeAll(connectTestDb);
afterAll(dropTestDb);
beforeEach(clearCollections);

describe('serverless defaults', () => {
  // Raw settings, as the process environment would provide them.
  const base = {
    MONGODB_URI: 'mongodb://127.0.0.1:27017/x',
    CLIENT_ORIGIN: 'http://localhost:5173',
    SESSION_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    APP_BASE_URL: 'http://localhost:5173',
  };
  it('a long-running server keeps disk, memory and the system Chrome', () => {
    const env = loadEnv({ ...base });
    expect(env).toMatchObject({
      EXPORT_STORAGE: 'disk',
      RATE_LIMIT_STORE: 'memory',
      SERVERLESS_CHROMIUM: false,
    });
  });
  it('on Vercel, files and counters go to MongoDB and PDFs use serverless Chromium', () => {
    const env = loadEnv({ ...base, VERCEL: '1' });
    expect(env).toMatchObject({
      EXPORT_STORAGE: 'mongo',
      RATE_LIMIT_STORE: 'mongo',
      SERVERLESS_CHROMIUM: true,
    });
    // Each can still be set explicitly.
    expect(loadEnv({ ...base, VERCEL: '1', EXPORT_STORAGE: 'disk' }).EXPORT_STORAGE).toBe('disk');
  });
});

describe('export files stored in MongoDB', () => {
  const app = buildApp({ env: makeEnv({ EXPORT_STORAGE: 'mongo' }) });

  it('stores, serves and deletes files with no local disk, and expires them', async () => {
    const u = await registerUser(app);
    await u.client.put('/api/v1/profile').set('if-match', '0').send({ content: sampleResume });
    const resume = (await u.client.post('/api/v1/resumes').send({ title: 'R' })).body.resume;
    const ex = (await u.client.post(`/api/v1/resumes/${resume.id}/export`).send({ format: 'docx' }))
      .body.export;
    expect(ex.downloadAvailable).toBe(true);

    const record = await ExportRecord.findById(ex.id).lean();
    const file = await ExportFile.findById(record.fileStorageKey).lean();
    expect(file.format).toBe('docx');
    // MongoDB's TTL index removes the file at the same moment the record says it expires.
    expect(file.expiresAt.getTime()).toBe(new Date(record.expiresAt).getTime());
    const indexes = await ExportFile.collection.indexes();
    expect(indexes.find((i) => i.key.expiresAt)?.expireAfterSeconds).toBe(0);
    // The file holds no owner; the record does, so account deletion finds it through records.
    expect(file).not.toHaveProperty('userId');

    const download = await u.client
      .get(`/api/v1/exports/${ex.id}/download`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(download.status).toBe(200);
    expect(download.body.subarray(0, 2).toString()).toBe('PK'); // a .docx is a zip
    expect(Number(download.headers['content-length'])).toBe(download.body.length);

    expect((await u.client.delete(`/api/v1/exports/${ex.id}`)).status).toBe(204);
    expect(await ExportFile.countDocuments()).toBe(0);
  });

  it('deleting the account deletes its export files', async () => {
    const u = await registerUser(app);
    await u.client.put('/api/v1/profile').set('if-match', '0').send({ content: sampleResume });
    const resume = (await u.client.post('/api/v1/resumes').send({ title: 'R' })).body.resume;
    await u.client.post(`/api/v1/resumes/${resume.id}/export`).send({ format: 'docx' });
    expect(await ExportFile.countDocuments()).toBe(1);
    const del = await u.client
      .delete('/api/v1/account')
      .send({ password: u.credentials.password, confirmation: 'DELETE' });
    expect(del.status).toBe(200);
    expect(await ExportFile.countDocuments()).toBe(0);
  });
});

describe('rate limits counted in MongoDB', () => {
  it('counts across calls, restarts after the window, and resets on request', async () => {
    const store = new MongoRateLimitStore('test');
    store.init({ windowMs: 60_000 });
    expect((await store.increment('1.2.3.4')).totalHits).toBe(1);
    expect((await store.increment('1.2.3.4')).totalHits).toBe(2);
    // A second instance (another serverless invocation) sees the same count.
    const other = new MongoRateLimitStore('test');
    other.init({ windowMs: 60_000 });
    const third = await other.increment('1.2.3.4');
    expect(third.totalHits).toBe(3);
    expect(third.resetTime.getTime()).toBeGreaterThan(Date.now() + 50_000);
    await store.decrement('1.2.3.4');
    expect((await store.increment('1.2.3.4')).totalHits).toBe(3);

    await RateLimitCounter.updateOne({ _id: 'test:1.2.3.4' }, { $set: { resetAt: new Date(0) } });
    expect((await store.increment('1.2.3.4')).totalHits).toBe(1);
    await store.resetKey('1.2.3.4');
    expect(await RateLimitCounter.countDocuments()).toBe(0);
    // Separate limiters never share counters.
    const login = new MongoRateLimitStore('login');
    login.init({ windowMs: 60_000 });
    await login.increment('1.2.3.4');
    expect((await store.increment('1.2.3.4')).totalHits).toBe(1);
  });

  it('blocks sign-in attempts past the limit, with the counter in MongoDB', async () => {
    const app = buildApp({ env: makeEnv({ RATE_LIMIT_STORE: 'mongo', RATE_LIMIT_DISABLED: '' }) });
    const statuses = [];
    for (let i = 0; i < 11; i += 1)
      statuses.push(
        (
          await request(app)
            .post('/api/v1/auth/login')
            .set('origin', 'http://localhost:5173')
            .send({ email: 'nobody@example.com', password: 'wrong-password-123' })
        ).status,
      );
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect(await RateLimitCounter.countDocuments({ _id: /^login:/ })).toBe(1);
  });
});

describe('Vercel entry point', () => {
  it('serves the API through the exported handler', async () => {
    const env = makeEnv({ VERCEL: '1', LOG_LEVEL: 'error' });
    const saved = { ...process.env };
    Object.assign(process.env, env);
    try {
      const { default: handler } = await import('../../api/index.js');
      const server = createServer(handler);
      expect((await request(server).get('/health/live')).status).toBe(200);
      expect((await request(server).get('/health/ready')).status).toBe(200);
      expect((await request(server).get('/api/v1/meta')).body).toHaveProperty('version');
      const reg = await request(server)
        .post('/api/v1/auth/register')
        .set('origin', 'http://localhost:5173')
        .send({
          email: 'vercel@example.com',
          password: 'a long enough password',
          displayName: 'V',
        });
      expect(reg.status).toBe(201);
    } finally {
      process.env = saved;
    }
  });
});

describe('vercel.json', () => {
  it('sends the same Content-Security-Policy the server would, for the built index.html', () => {
    const html = readFileSync(join(ROOT, 'client', 'index.html'), 'utf8');
    const { directives } = contentSecurityPolicy(inlineScriptHashes(html));
    const expected = Object.entries(directives)
      .map(
        ([k, v]) =>
          `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}${v.length ? ` ${v.join(' ')}` : ''}`,
      )
      .join('; ');
    const page = vercel.headers.find((h) => h.source === '/((?!api/|health/).*)');
    expect(page.headers.find((h) => h.key === 'Content-Security-Policy').value).toBe(expected);
  });

  it('routes the API and health checks to the function and everything else to the app', () => {
    expect(vercel.rewrites).toEqual([
      { source: '/api/(.*)', destination: '/api' },
      { source: '/health/(.*)', destination: '/api' },
      { source: '/(.*)', destination: '/index.html' },
    ]);
    expect(existsSync(join(ROOT, 'api', 'index.js'))).toBe(true);
  });

  it('bundles every file the function reads at runtime', () => {
    const glob = vercel.functions['api/index.js'].includeFiles;
    const included = picomatch(glob);
    const require = createRequire(import.meta.url);
    const rel = (abs) => abs.slice(ROOT.length + 1);
    const needed = [
      ...Object.keys(TEMPLATE_FONTS).flatMap((family) => {
        const pkgJson = require.resolve(`${TEMPLATE_FONTS[family].package}/package.json`);
        return [
          rel(pkgJson),
          ...fontFiles(family).map((f) => rel(join(pkgJson, '..', 'files', f.file))),
        ];
      }),
      'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      'node_modules/@sparticuz/chromium/bin/chromium.br',
    ];
    for (const file of needed) {
      expect([file, existsSync(join(ROOT, file))]).toEqual([file, true]);
      expect([file, included(file)]).toEqual([file, true]);
    }
  });
});
