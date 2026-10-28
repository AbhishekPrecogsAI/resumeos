import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildApp,
  connectTestDb,
  dropTestDb,
  clearCollections,
  makeEnv,
  registerUser,
} from './helpers.js';
import { createBrowserPool, findChrome } from '../src/modules/exports/browser.js';
import { inspectImage } from '../src/modules/photos/photo.service.js';
import { ProfilePhoto } from '../src/modules/photos/photo.model.js';
import { SAMPLE_PHOTO } from '@resumeos/shared/sample/samplePhoto.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const hasChrome = Boolean(findChrome(process.env.CHROME_PATH));
let dir;
let app;
let pool;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'resumeos-photo-'));
  pool = createBrowserPool({
    chromePath: process.env.CHROME_PATH,
    logger: { info() {}, warn() {}, error() {} },
  });
  app = buildApp({ env: makeEnv({ EXPORT_TEMP_DIR: dir }), pdfPool: pool });
  await connectTestDb();
});
afterAll(async () => {
  await pool.close();
  await dropTestDb();
  await rm(dir, { recursive: true, force: true });
});
beforeEach(clearCollections);

const PNG_BYTES = Buffer.from(SAMPLE_PHOTO.split(',')[1], 'base64');

describe('photo validation', () => {
  it('reads real dimensions from PNG and rejects non-images', () => {
    expect(inspectImage(PNG_BYTES)).toEqual({ mime: 'image/png', width: 160, height: 160 });
    expect(inspectImage(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
  });
});

describe('profile photo API', () => {
  it('uploads, reads, replaces and deletes a photo', async () => {
    const { client } = await registerUser(app);
    expect((await client.get('/api/v1/profile/photo')).body.photo).toBeNull();
    const put = await client.put('/api/v1/profile/photo').send({ dataUrl: SAMPLE_PHOTO });
    expect(put.status).toBe(200);
    expect(put.body.photo).toMatchObject({ width: 160, height: 160, dataUrl: SAMPLE_PHOTO });
    await client.put('/api/v1/profile/photo').send({ dataUrl: SAMPLE_PHOTO });
    expect(await ProfilePhoto.countDocuments()).toBe(1);
    expect((await client.delete('/api/v1/profile/photo')).status).toBe(204);
    expect((await client.get('/api/v1/profile/photo')).body.photo).toBeNull();
  });

  it('rejects disguised, non-image, oversized and tiny uploads', async () => {
    const { client } = await registerUser(app);
    const svg = `data:image/png;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>').toString('base64')}`;
    expect((await client.put('/api/v1/profile/photo').send({ dataUrl: svg })).status).toBe(400);
    expect(
      (
        await client
          .put('/api/v1/profile/photo')
          .send({ dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' })
      ).status,
    ).toBe(400);
    expect(
      (
        await client
          .put('/api/v1/profile/photo')
          .send({ dataUrl: SAMPLE_PHOTO.replace('image/png', 'image/jpeg') })
      ).status,
    ).toBe(400);
    const big = `data:image/png;base64,${Buffer.concat([PNG_BYTES, Buffer.alloc(320 * 1024)]).toString('base64')}`;
    expect((await client.put('/api/v1/profile/photo').send({ dataUrl: big })).status).toBe(400);
    const tiny = Buffer.from(PNG_BYTES);
    tiny.writeUInt32BE(20, 16);
    tiny.writeUInt32BE(20, 20);
    expect(
      (
        await client
          .put('/api/v1/profile/photo')
          .send({ dataUrl: `data:image/png;base64,${tiny.toString('base64')}` })
      ).status,
    ).toBe(400);
  });

  it('is private, exported and deleted with the account', async () => {
    const owner = await registerUser(app);
    await owner.client.put('/api/v1/profile/photo').send({ dataUrl: SAMPLE_PHOTO });
    const other = await registerUser(app);
    expect((await other.client.get('/api/v1/profile/photo')).body.photo).toBeNull();
    expect((await owner.client.get('/api/v1/account/export')).body.profilePhoto.dataUrl).toBe(
      SAMPLE_PHOTO,
    );
    const del = await owner.client
      .delete('/api/v1/account')
      .send({ password: owner.credentials.password, confirmation: 'DELETE' });
    expect(del.body.deleted.profilePhoto).toBe(1);
    expect(await ProfilePhoto.countDocuments()).toBe(0);
  });
});

describe.skipIf(!hasChrome)('photo in exports', () => {
  async function imageCount(buffer) {
    const task = getDocument({ data: new Uint8Array(buffer), verbosity: 0 });
    const page = await (await task.promise).getPage(1);
    const ops = await page.getOperatorList();
    await task.destroy();
    // 85 = paintImageXObject in pdf.js's OPS table.
    return ops.fnArray.filter((op) => op === 85).length;
  }

  it('embeds the photo only when the resume opts in and the template supports it', async () => {
    const { client } = await registerUser(app);
    await client.put('/api/v1/profile').set('if-match', '0').send({ content: sampleResume });
    await client.put('/api/v1/profile/photo').send({ dataUrl: SAMPLE_PHOTO });
    const resume = (await client.post('/api/v1/resumes').send({ title: 'R', templateId: 'orbit' }))
      .body.resume;
    const base = `/api/v1/resumes/${resume.id}`;
    const download = async () => {
      const ex = (await client.post(`${base}/export`).send({})).body.export;
      expect(ex.validation.status).toBe('passed');
      return (
        await client
          .get(`/api/v1/exports/${ex.id}/download`)
          .buffer(true)
          .parse((r, cb) => {
            const chunks = [];
            r.on('data', (c) => chunks.push(c));
            r.on('end', () => cb(null, Buffer.concat(chunks)));
          })
      ).body;
    };
    expect(await imageCount(await download())).toBe(0);
    const draft = structuredClone(resume.draft);
    draft.layout.showPhoto = true;
    await client.put(`${base}/draft`).set('if-match', '1').send(draft);
    expect(await imageCount(await download())).toBe(1);
    await client.patch(base).send({ templateId: 'clarity' });
    expect(await imageCount(await download())).toBe(0);
  });
});
