import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mammoth from 'mammoth';
import {
  buildApp,
  connectTestDb,
  dropTestDb,
  clearCollections,
  makeEnv,
  registerUser,
} from './helpers.js';
import { renderDocx } from '../src/modules/exports/docx.js';
import { validateDocx } from '../src/modules/exports/validateDocx.js';
import { TEMPLATES } from '@resumeos/shared/templates/index.js';
import { docxReferenceHtml } from '../src/modules/exports/docx.js';
import { defaultLayout } from '@resumeos/shared/resumeModel.js';
import { FIXTURES } from './fixtures/resumes.js';

const build = async (content, opts = {}) => {
  const layout = opts.layout ?? defaultLayout(content);
  const templateId = opts.templateId ?? 'clarity';
  const pageSize = opts.pageSize ?? 'A4';
  const buffer = await renderDocx({ content, layout, templateId, pageSize });
  return { buffer, html: docxReferenceHtml(content, layout, pageSize) };
};

describe('DOCX rendering and validation', () => {
  it.each(Object.keys(FIXTURES))('%s passes every content check', async (name) => {
    const out = await build(FIXTURES[name]);
    const v = await validateDocx(out.buffer, out);
    expect(v.checks.filter((c) => c.result !== 'pass')).toEqual([]);
    expect(v.status).toBe('passed');
    expect(v.method).toMatch(/aren't measured for DOCX/);
  });

  it('uses real headings and bullet lists, in layout order', async () => {
    const content = FIXTURES.sample;
    const layout = {
      ...defaultLayout(content),
      sectionOrder: ['skills', 'experience', 'summary', 'projects', 'education', 'certifications'],
      hiddenItems: ['exp_2'],
    };
    const { buffer } = await build(content, { layout });
    const { value: html } = await mammoth.convertToHtml({ buffer });
    expect([...html.matchAll(/<h1>(.*?)<\/h1>/g)].map((m) => m[1])).toEqual([
      'Skills',
      'Experience',
      'Summary',
      'Projects',
      'Education',
      'Certifications',
    ]);
    expect(html).toContain('<li>Led migration of the shipment-tracking API');
    expect(html).not.toContain('Tallyhouse');
  });

  it('keeps links clickable and Unicode intact', async () => {
    const { buffer } = await build(FIXTURES.unicodeAndLong);
    const { value: html } = await mammoth.convertToHtml({ buffer });
    expect(html).toContain('href="mailto:zoe@example.com"');
    expect(html).toContain('Zoë Ångström-Nguyễn 李小龍');
  });

  it('sets the page size', async () => {
    const JSZip = (await import('jszip')).default;
    for (const [size, w] of [
      ['A4', '11906'],
      ['Letter', '12240'],
    ]) {
      const { buffer } = await build(FIXTURES.sample, { pageSize: size });
      const xml = await (await JSZip.loadAsync(buffer)).file('word/document.xml').async('string');
      expect(xml).toContain(`w:w="${w}"`);
    }
  });

  it('works for every template', async () => {
    for (const t of TEMPLATES) {
      const out = await build(FIXTURES.sample, { templateId: t.id });
      expect((await validateDocx(out.buffer, out)).status).toBe('passed');
    }
  });

  it('fails validation for a non-DOCX file and for content mismatches', async () => {
    expect((await validateDocx(Buffer.from('nope'), { html: '' })).status).toBe('failed');
    const out = await build(FIXTURES.minimal);
    const v = await validateDocx(out.buffer, { html: '<h1>Someone Else</h1>' });
    expect(v.checks.find((c) => c.id === 'EXPECTED_TEXT').result).toBe('fail');
  });
});

describe('DOCX export API', () => {
  let dir;
  let app;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'resumeos-docx-'));
    app = buildApp({ env: makeEnv({ EXPORT_TEMP_DIR: dir }) });
    await connectTestDb();
  });
  afterAll(async () => {
    await dropTestDb();
    await rm(dir, { recursive: true, force: true });
  });
  beforeEach(clearCollections);

  it('exports, validates and downloads a DOCX without needing Chrome', async () => {
    const u = await registerUser(app);
    await u.client.put('/api/v1/profile').set('if-match', '0').send({ content: FIXTURES.sample });
    const resume = (
      await u.client.post('/api/v1/resumes').send({ title: 'Backend', pageSize: 'Letter' })
    ).body.resume;
    const res = await u.client.post(`/api/v1/resumes/${resume.id}/export`).send({ format: 'docx' });
    expect(res.status).toBe(201);
    expect(res.body.export).toMatchObject({
      format: 'docx',
      pageSize: 'Letter',
      pageCount: null,
      downloadAvailable: true,
    });
    expect(res.body.export.validation.status).toBe('passed');
    expect((await readdir(dir))[0]).toMatch(/\.docx$/);

    const dl = await u.client
      .get(`/api/v1/exports/${res.body.export.id}/download`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(dl.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(dl.headers['content-disposition']).toMatch(
      /filename="Mira-Okafor-Lindqvist-resume\.docx"/,
    );
    expect(dl.body.subarray(0, 2).toString()).toBe('PK');

    await u.client.delete(`/api/v1/exports/${res.body.export.id}`);
    expect(await readdir(dir)).toEqual([]);
  });
});
