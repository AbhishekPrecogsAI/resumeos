import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import {
  buildApp,
  connectTestDb,
  dropTestDb,
  clearCollections,
  makeEnv,
  registerUser,
  agent,
} from './helpers.js';
import { createBrowserPool, findChrome } from '../src/modules/exports/browser.js';
import { renderPdf } from '../src/modules/exports/render.js';
import { validatePdf, parsePdf } from '../src/modules/exports/validate.js';
import { contentDisposition } from '../src/modules/exports/export.service.js';
import { ExportRecord } from '../src/modules/exports/export.model.js';
import { defaultLayout } from '@resumeos/shared/resumeModel.js';
import { TEMPLATES } from '@resumeos/shared/templates/index.js';
import { FIXTURES } from './fixtures/resumes.js';

const hasChrome = Boolean(findChrome(process.env.CHROME_PATH));
const silent = { info() {}, warn() {}, error() {} };
let pool;
let dir;
let app;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'resumeos-exports-'));
  pool = createBrowserPool({ chromePath: process.env.CHROME_PATH, logger: silent });
  app = buildApp({ env: makeEnv({ EXPORT_TEMP_DIR: dir }), pdfPool: pool });
  await connectTestDb();
});
afterAll(async () => {
  await pool.close();
  await dropTestDb();
  await rm(dir, { recursive: true, force: true });
});
beforeEach(async () => {
  await clearCollections();
  for (const name of await readdir(dir)) await rm(join(dir, name));
});

const render = (content, opts = {}) =>
  renderPdf(pool, {
    content,
    layout: opts.layout ?? defaultLayout(content),
    templateId: 'clarity',
    pageSize: opts.pageSize ?? 'A4',
    timeoutMs: 30_000,
  });

async function userWithResume(content = FIXTURES.sample) {
  const u = await registerUser(app);
  await u.client.put('/api/v1/profile').set('if-match', '0').send({ content });
  const resume = (await u.client.post('/api/v1/resumes').send({ title: 'Backend roles' })).body
    .resume;
  return { ...u, resume };
}

describe.skipIf(!hasChrome)('PDF rendering and validation', () => {
  it('renders the sample resume and passes every check', async () => {
    const out = await render(FIXTURES.sample);
    const v = await validatePdf(out.buffer, out);
    expect(v.checks.filter((c) => c.result !== 'pass')).toEqual([]);
    expect(v.status).toBe('passed');
    expect(v.pageCount).toBe(1);
  });

  it('extracts sections in layout order', async () => {
    const content = FIXTURES.sample;
    const layout = {
      ...defaultLayout(content),
      sectionOrder: ['skills', 'experience', 'summary', 'projects', 'education', 'certifications'],
    };
    const out = await render(content, { layout });
    const v = await validatePdf(out.buffer, out);
    expect(v.checks.find((c) => c.id === 'EXPORT_TEXT_ORDER_WARNING')).toMatchObject({
      result: 'pass',
      detail:
        'Skills → Experience → Summary → Projects → Education → Certifications → Languages → Interests, with every bullet under its heading.',
    });
  });

  it('preserves Unicode text and keeps links clickable', async () => {
    const out = await render(FIXTURES.unicodeAndLong);
    const parsed = await parsePdf(out.buffer);
    const text = parsed.lines
      .map((l) => l.text)
      .join(' ')
      .normalize('NFKC');
    expect(text).toContain('Zoë Ångström-Nguyễn');
    expect(text).toContain('São Paulo');
    expect(text).toContain('“curly quotes”');
    expect(parsed.links).toEqual(
      expect.arrayContaining([
        'mailto:zoe@example.com',
        'https://github.com/example-with-a-really-long-handle-that-keeps-going-and-going',
      ]),
    );
    const v = await validatePdf(out.buffer, out);
    expect(v.checks.find((c) => c.id === 'EXPECTED_TEXT').result).toBe('pass');
    // Long unbroken URLs wrap rather than running off the page.
    expect(v.checks.find((c) => c.id === 'POSSIBLE_CONTENT_OVERFLOW').result).toBe('pass');
  });

  it('handles a profile with only a name', async () => {
    const out = await render(FIXTURES.minimal);
    const v = await validatePdf(out.buffer, out);
    expect(v.status).toBe('passed');
    expect((await parsePdf(out.buffer)).lines.map((l) => l.text)).toEqual(['Sam Lee']);
  });

  it('paginates long resumes without losing content', async () => {
    const out = await render(FIXTURES.multiPage);
    const v = await validatePdf(out.buffer, out);
    expect(v.pageCount).toBeGreaterThanOrEqual(2);
    expect(v.checks.find((c) => c.id === 'EXPECTED_TEXT').result).toBe('pass');
  });

  it('respects Letter page size', async () => {
    const out = await render(FIXTURES.sample, { pageSize: 'Letter' });
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = getDocument({ data: new Uint8Array(out.buffer), verbosity: 0 });
    const { width, height } = (await (await task.promise).getPage(1)).getViewport({ scale: 1 });
    expect([Math.round(width), Math.round(height)]).toEqual([612, 792]);
    await task.destroy();
  });

  it('fails validation for a non-PDF file and for missing text', async () => {
    const bad = await validatePdf(Buffer.from('not a pdf'), { html: '', overflow: null });
    expect(bad.status).toBe('failed');
    const out = await render(FIXTURES.minimal);
    const mismatched = await validatePdf(out.buffer, {
      html: '<h1>Someone Else</h1>',
      overflow: null,
    });
    expect(mismatched.checks.find((c) => c.id === 'EXPECTED_TEXT')).toMatchObject({
      result: 'fail',
    });
  });

  it.each(TEMPLATES.map((t) => t.id))(
    '%s passes every export check on every fixture',
    async (templateId) => {
      for (const [name, content] of Object.entries(FIXTURES)) {
        for (const pageSize of ['A4', 'Letter']) {
          const out = await renderPdf(pool, {
            content,
            layout: defaultLayout(content),
            templateId,
            pageSize,
            timeoutMs: 30_000,
          });
          const v = await validatePdf(out.buffer, out);
          expect([name, pageSize, v.checks.filter((c) => c.result !== 'pass')]).toEqual([
            name,
            pageSize,
            [],
          ]);
          if (name === 'sample') {
            // Whitespace-insensitive checks can't see words run together; check a real line.
            const text = (await parsePdf(out.buffer)).lines.map((l) => l.text).join('\n');
            expect([
              templateId,
              text.includes('Senior Backend Engineer, Northwind Freight'),
            ]).toEqual([templateId, true]);
          }
        }
      }
    },
  );

  it('layout regression: sample text lines are stable', async () => {
    const out = await render(FIXTURES.sample);
    const { lines } = await parsePdf(out.buffer);
    // Baseline depends on the Chrome version and the bundled font; update deliberately with `vitest -u`.
    expect(lines.map((l) => `${l.page}: ${l.text}`)).toMatchSnapshot();
  });
});

describe.skipIf(!hasChrome)('export API', () => {
  it('exports, records metadata, and downloads the PDF', async () => {
    const { client, resume } = await userWithResume();
    const res = await client.post(`/api/v1/resumes/${resume.id}/export`).send({ format: 'pdf' });
    expect(res.status).toBe(201);
    const ex = res.body.export;
    expect(ex).toMatchObject({
      resumeId: resume.id,
      format: 'pdf',
      templateId: 'clarity',
      templateVersion: '1.0.0',
      pageSize: 'A4',
      draftRevision: 1,
      pageCount: 1,
      downloadAvailable: true,
    });
    expect(ex.validation.status).toBe('passed');
    expect(ex.contentHash).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(ex)).not.toContain('fileStorageKey');

    const dl = await client
      .get(`/api/v1/exports/${ex.id}/download`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(dl.status).toBe(200);
    expect(dl.headers['content-type']).toBe('application/pdf');
    expect(dl.headers['content-disposition']).toMatch(
      /^attachment; filename="Mira-Okafor-Lindqvist-resume\.pdf"/,
    );
    expect(dl.body.subarray(0, 5).toString()).toBe('%PDF-');

    const list = await client.get(`/api/v1/exports?resumeId=${resume.id}`);
    expect(list.body.total).toBe(1);
  });

  it('exports the saved draft revision, with an optional page size', async () => {
    const { client, resume } = await userWithResume();
    const draft = structuredClone(resume.draft);
    draft.content.summary = 'Updated summary for export.';
    await client.put(`/api/v1/resumes/${resume.id}/draft`).set('if-match', '1').send(draft);
    const res = await client
      .post(`/api/v1/resumes/${resume.id}/export`)
      .send({ pageSize: 'Letter' });
    expect(res.body.export).toMatchObject({ draftRevision: 2, pageSize: 'Letter' });
  });

  it('links an export to a saved version only when the draft matches it', async () => {
    const { client, resume } = await userWithResume();
    const base = `/api/v1/resumes/${resume.id}`;
    const v1 = (await client.post(`${base}/versions`).send({ name: 'General' })).body.version;
    const matched = (await client.post(`${base}/export`).send({})).body.export;
    expect(matched.resumeVersionId).toBe(v1.id);
    const draft = structuredClone(resume.draft);
    draft.content.headline = 'Unsaved change';
    await client.put(`${base}/draft`).set('if-match', '1').send(draft);
    const unmatched = (await client.post(`${base}/export`).send({})).body.export;
    expect(unmatched.resumeVersionId).toBeNull();
    const versions = (await client.get(`${base}/versions`)).body.items;
    expect(versions[0]).toMatchObject({ id: v1.id, exported: true });
  });

  it('reuses the export for a repeated idempotency key', async () => {
    const { client, resume } = await userWithResume();
    const first = await client
      .post(`/api/v1/resumes/${resume.id}/export`)
      .set('idempotency-key', 'retry-key-123')
      .send({});
    const second = await client
      .post(`/api/v1/resumes/${resume.id}/export`)
      .set('idempotency-key', 'retry-key-123')
      .send({});
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.reused).toBe(true);
    expect(second.body.export.id).toBe(first.body.export.id);
    expect(await ExportRecord.countDocuments()).toBe(1);
  });

  it('rejects unsupported formats and bad idempotency keys', async () => {
    const { client, resume } = await userWithResume();
    const odt = await client.post(`/api/v1/resumes/${resume.id}/export`).send({ format: 'odt' });
    expect(odt.status).toBe(400);
    expect(odt.body.error.code).toBe('UNSUPPORTED_FORMAT');
    expect(
      (await client.post(`/api/v1/resumes/${resume.id}/export`).send({ format: 'constructor' }))
        .status,
    ).toBe(400);
    expect(
      (
        await client
          .post(`/api/v1/resumes/${resume.id}/export`)
          .set('idempotency-key', 'x')
          .send({})
      ).status,
    ).toBe(400);
  });

  it('blocks other users from exporting, reading or downloading', async () => {
    const owner = await userWithResume();
    const ex = (await owner.client.post(`/api/v1/resumes/${owner.resume.id}/export`).send({})).body
      .export;
    const { client: other } = await registerUser(app);
    expect((await other.post(`/api/v1/resumes/${owner.resume.id}/export`).send({})).status).toBe(
      404,
    );
    expect((await other.get(`/api/v1/exports/${ex.id}`)).status).toBe(404);
    expect((await other.get(`/api/v1/exports/${ex.id}/download`)).status).toBe(404);
    expect((await other.delete(`/api/v1/exports/${ex.id}`)).status).toBe(404);
    expect((await other.get('/api/v1/exports')).body.total).toBe(0);
    expect((await agent(app).get(`/api/v1/exports/${ex.id}/download`)).status).toBe(401);
  });

  it('refuses expired downloads and sweeps expired files but keeps history', async () => {
    const { client, resume } = await userWithResume();
    const ex = (await client.post(`/api/v1/resumes/${resume.id}/export`).send({})).body.export;
    await ExportRecord.updateOne({ _id: ex.id }, { expiresAt: new Date(Date.now() - 1000) });
    const dl = await client.get(`/api/v1/exports/${ex.id}/download`);
    expect(dl.status).toBe(410);
    expect(await app.locals.exportsService.sweepExpired()).toBe(1);
    expect(await readdir(dir)).toEqual([]);
    const after = await client.get(`/api/v1/exports/${ex.id}`);
    expect(after.body.export.downloadAvailable).toBe(false);
  });

  it('deleting the export, the resume or the account removes files and records', async () => {
    const { client, resume, credentials } = await userWithResume();
    const a = (await client.post(`/api/v1/resumes/${resume.id}/export`).send({})).body.export;
    expect((await client.delete(`/api/v1/exports/${a.id}`)).status).toBe(204);
    await client.post(`/api/v1/resumes/${resume.id}/export`).send({});
    await client.delete(`/api/v1/resumes/${resume.id}`);
    expect(await ExportRecord.countDocuments()).toBe(0);
    const second = (await client.post('/api/v1/resumes').send({ title: 'Another' })).body.resume;
    await client.post(`/api/v1/resumes/${second.id}/export`).send({});
    const del = await client
      .delete('/api/v1/account')
      .send({ password: credentials.password, confirmation: 'DELETE' });
    expect(del.body.deleted.exports).toBe(1);
    expect(await readdir(dir)).toEqual([]);
  });
});

describe.skipIf(!hasChrome)('orphan sweep', () => {
  it('removes untracked files only after the retention period', async () => {
    const { writeFile, utimes } = await import('node:fs/promises');
    const old = join(dir, 'orphanoldfile123.pdf');
    const fresh = join(dir, 'orphanfreshfile1.pdf');
    await writeFile(old, '%PDF-');
    await writeFile(fresh, '%PDF-');
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000);
    await utimes(old, twoHoursAgo, twoHoursAgo);
    expect(await app.locals.exportsService.sweepOrphans()).toBe(1);
    expect(await readdir(dir)).toEqual(['orphanfreshfile1.pdf']);
  });
});

describe('contentDisposition', () => {
  it('produces a safe ASCII name and a UTF-8 variant', () => {
    expect(contentDisposition('Zoë Ångström resume')).toBe(
      `attachment; filename="Zoe-Angstrom-resume.pdf"; filename*=UTF-8''Zo%C3%AB-%C3%85ngstr%C3%B6m-resume.pdf`,
    );
    expect(contentDisposition('a"\r\nb/c')).not.toMatch(/[\r\n"]{2}|\/|\\/);
  });

  it('never yields an empty filename', () => {
    expect(contentDisposition('李小龍')).toMatch(/^attachment; filename="resume\.pdf"/);
  });
});

describe('export endpoints without a browser', () => {
  it('fail cleanly when Chrome is unavailable', async () => {
    const broken = {
      withPage: async () => {
        throw Object.assign(new Error('nope'), { code: 'NO_BROWSER' });
      },
      close: async () => {},
    };
    const noBrowserApp = buildApp({ env: makeEnv({ EXPORT_TEMP_DIR: dir }), pdfPool: broken });
    const u = await registerUser(noBrowserApp);
    const resume = (await u.client.post('/api/v1/resumes').send({ title: 'X' })).body.resume;
    const res = await u.client.post(`/api/v1/resumes/${resume.id}/export`).send({});
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('EXPORT_UNAVAILABLE');
    expect(await ExportRecord.countDocuments()).toBe(0);
    void request;
  });
});
