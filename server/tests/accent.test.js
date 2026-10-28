import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import {
  buildApp,
  connectTestDb,
  dropTestDb,
  clearCollections,
  makeEnv,
  registerUser,
} from './helpers.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { renderDocx } from '../src/modules/exports/docx.js';
import { defaultLayout } from '@resumeos/shared/resumeModel.js';

let dir;
let app;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'resumeos-accent-'));
  app = buildApp({ env: makeEnv({ EXPORT_TEMP_DIR: dir }) });
  await connectTestDb();
});
afterAll(async () => {
  await dropTestDb();
  await rm(dir, { recursive: true, force: true });
});
beforeEach(clearCollections);

async function setup() {
  const u = await registerUser(app);
  await u.client.put('/api/v1/profile').set('if-match', '0').send({ content: sampleResume });
  const resume = (
    await u.client.post('/api/v1/resumes').send({ title: 'Backend', templateId: 'meridian' })
  ).body.resume;
  return { ...u, resume, base: `/api/v1/resumes/${resume.id}` };
}

describe('resume accent colour', () => {
  it('stores a readable accent, rejects unreadable ones, and resets to the default', async () => {
    const { client, base, resume } = await setup();
    expect(resume.accentColor).toBeNull();
    const ok = await client.patch(base).send({ accentColor: '#8a1f3d' });
    expect(ok.body.resume.accentColor).toBe('#8a1f3d');
    const light = await client.patch(base).send({ accentColor: '#ffee00' });
    expect(light.status).toBe(400);
    expect(light.body.error.details.fields[0].message).toMatch(/too light/);
    expect((await client.patch(base).send({ accentColor: 'red' })).status).toBe(400);
    expect((await client.patch(base).send({ accentColor: { $ne: null } })).status).toBe(400);
    expect(
      (await client.patch(base).send({ accentColor: null })).body.resume.accentColor,
    ).toBeNull();
  });

  it('is captured by versions, restored, compared and copied by branching', async () => {
    const { client, base } = await setup();
    await client.patch(base).send({ accentColor: '#245b34' });
    const v1 = (await client.post(`${base}/versions`).send({ name: 'Green' })).body.version;
    expect(v1.accentColor).toBe('#245b34');
    await client.patch(base).send({ accentColor: '#5b2a6e' });
    expect((await client.get(`${base}/versions`)).body.draftMatchesCurrent).toBe(false);

    const cmp = (await client.get(`${base}/compare?left=${v1.id}&right=draft`)).body.diff;
    expect(cmp.template).toEqual([{ field: 'accentColor', before: '#245b34', after: '#5b2a6e' }]);

    const restored = await client.post(`${base}/versions/${v1.id}/restore`).send({});
    expect(restored.body.resume.accentColor).toBe('#245b34');
    const branch = (await client.post(`${base}/duplicate`).send({ fromVersionId: v1.id })).body
      .resume;
    expect(branch.accentColor).toBe('#245b34');
  });

  it('is recorded on exports and colours DOCX headings', async () => {
    const { client, base } = await setup();
    await client.patch(base).send({ accentColor: '#8a1f3d' });
    const ex = (await client.post(`${base}/export`).send({ format: 'docx' })).body.export;
    expect(ex).toMatchObject({ accentColor: '#8a1f3d', templateId: 'meridian' });
    expect(ex.validation.status).toBe('passed');

    const docx = await renderDocx({
      content: sampleResume,
      layout: defaultLayout(sampleResume),
      templateId: 'meridian',
      pageSize: 'A4',
      accentColor: '#8a1f3d',
    });
    const styles = await (await JSZip.loadAsync(docx)).file('word/styles.xml').async('string');
    expect(styles).toContain('w:color w:val="8A1F3D"');
    const plain = await renderDocx({
      content: sampleResume,
      layout: defaultLayout(sampleResume),
      templateId: 'clarity',
      pageSize: 'A4',
      accentColor: '#8a1f3d',
    });
    expect(
      await (await JSZip.loadAsync(plain)).file('word/styles.xml').async('string'),
    ).not.toContain('8A1F3D');
  });
});
