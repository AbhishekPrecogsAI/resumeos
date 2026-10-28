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
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { createBrowserPool, findChrome } from '../src/modules/exports/browser.js';

const hasChrome = Boolean(findChrome(process.env.CHROME_PATH));

let dir;
let app;
let pool;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'resumeos-pattern-'));
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

async function setup() {
  const u = await registerUser(app);
  await u.client.put('/api/v1/profile').set('if-match', '0').send({ content: sampleResume });
  const resume = (
    await u.client.post('/api/v1/resumes').send({ title: 'Backend', templateId: 'orbit' })
  ).body.resume;
  return { ...u, resume, base: `/api/v1/resumes/${resume.id}` };
}

describe('resume background pattern', () => {
  it('defaults to none, accepts known patterns and rejects anything else', async () => {
    const { client, base, resume } = await setup();
    expect(resume.backgroundPattern).toBe('none');
    const ok = await client.patch(base).send({ backgroundPattern: 'network' });
    expect(ok.body.resume.backgroundPattern).toBe('network');
    expect((await client.patch(base).send({ backgroundPattern: 'sparkles' })).status).toBe(400);
    expect((await client.patch(base).send({ backgroundPattern: { $ne: null } })).status).toBe(400);
    expect((await client.get(base)).body.resume.backgroundPattern).toBe('network');

    const created = await client
      .post('/api/v1/resumes')
      .send({ title: 'Waves', templateId: 'lumen', backgroundPattern: 'waves' });
    expect(created.body.resume.backgroundPattern).toBe('waves');
  });

  it('is captured by versions, restored, compared and copied by branching', async () => {
    const { client, base } = await setup();
    await client.patch(base).send({ backgroundPattern: 'dots' });
    const v1 = (await client.post(`${base}/versions`).send({ name: 'Dots' })).body.version;
    expect(v1.backgroundPattern).toBe('dots');
    expect((await client.get(`${base}/versions`)).body.draftMatchesCurrent).toBe(true);
    await client.patch(base).send({ backgroundPattern: 'grid' });
    expect((await client.get(`${base}/versions`)).body.draftMatchesCurrent).toBe(false);

    const cmp = (await client.get(`${base}/compare?left=${v1.id}&right=draft`)).body.diff;
    expect(cmp.template).toEqual([{ field: 'backgroundPattern', before: 'dots', after: 'grid' }]);

    const restored = await client.post(`${base}/versions/${v1.id}/restore`).send({});
    expect(restored.body.resume.backgroundPattern).toBe('dots');
    const branch = (await client.post(`${base}/duplicate`).send({ fromVersionId: v1.id })).body
      .resume;
    expect(branch.backgroundPattern).toBe('dots');
  });

  it.skipIf(!hasChrome)(
    'is drawn in the PDF without affecting the export checks',
    async () => {
      const { client, base } = await setup();
      await client.patch(base).send({ backgroundPattern: 'network', accentColor: '#245b34' });
      const ex = (await client.post(`${base}/export`).send({ format: 'pdf' })).body.export;
      expect(ex).toMatchObject({ backgroundPattern: 'network', templateId: 'orbit' });
      expect(ex.validation.status).toBe('passed');
    },
    60_000,
  );
});
