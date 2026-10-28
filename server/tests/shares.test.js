import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
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
} from './helpers.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { createBrowserPool, findChrome } from '../src/modules/exports/browser.js';
import { ShareLink } from '../src/modules/shares/share.model.js';
import { parsePdf } from '../src/modules/exports/validate.js';

const hasChrome = Boolean(findChrome(process.env.CHROME_PATH));
let dir;
let app;
let pool;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'resumeos-share-'));
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
    await u.client
      .post('/api/v1/resumes')
      .send({ title: 'Stripe application (private)', templateId: 'orbit' })
  ).body.resume;
  return { ...u, resume, base: `/api/v1/resumes/${resume.id}` };
}

// Anonymous: no cookies, no session.
const anon = () => request(app);
const tokenOf = (share) => share.path.slice('/r/'.length);

describe('share links: owner side', () => {
  it('creates, lists, updates and deletes links with the chosen options', async () => {
    const { client, base } = await setup();
    const created = await client.post(base + '/shares').send({
      label: 'Recruiter at Acme',
      allowDownload: true,
      hideContactDetails: true,
      expiresInDays: 30,
    });
    expect(created.status).toBe(201);
    const share = created.body.share;
    expect(share).toMatchObject({
      label: 'Recruiter at Acme',
      allowDownload: true,
      hideContactDetails: true,
      enabled: true,
      versionId: null,
      viewCount: 0,
    });
    expect(share.path).toMatch(/^\/r\/[A-Za-z0-9_-]{24}$/);
    const days = (new Date(share.expiresAt) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);

    expect((await client.get(base + '/shares')).body.shares.map((s) => s.id)).toEqual([share.id]);

    const off = await client
      .patch(`${base}/shares/${share.id}`)
      .send({ enabled: false, expiresInDays: null });
    expect(off.body.share).toMatchObject({ enabled: false, expiresAt: null });

    expect((await client.delete(`${base}/shares/${share.id}`)).status).toBe(204);
    expect((await client.get(base + '/shares')).body.shares).toEqual([]);
  });

  it('rejects bad options and other people’s resumes and links', async () => {
    const { client, base } = await setup();
    const bad = async (body) => (await client.post(base + '/shares').send(body)).status;
    expect(await bad({ expiresInDays: 5 })).toBe(400);
    expect(await bad({ allowDownload: 'yes' })).toBe(400);
    expect(await bad({ token: 'chosen-by-me-aaaaaaaaaaaa' })).toBe(400);
    expect(await bad({ versionId: '0123456789abcdef01234567' })).toBe(400);

    const share = (await client.post(base + '/shares').send({})).body.share;
    const other = await registerUser(app);
    expect((await other.client.get(base + '/shares')).status).toBe(404);
    expect((await other.client.post(base + '/shares').send({})).status).toBe(404);
    expect(
      (await other.client.patch(`${base}/shares/${share.id}`).send({ enabled: false })).status,
    ).toBe(404);
    expect((await other.client.delete(`${base}/shares/${share.id}`)).status).toBe(404);
  });

  it('removes a resume’s links when the resume is deleted', async () => {
    const { client, base } = await setup();
    const share = (await client.post(base + '/shares').send({})).body.share;
    expect((await client.delete(base)).status).toBe(204);
    expect(await ShareLink.countDocuments()).toBe(0);
    expect((await anon().get(`/api/v1/shared/${tokenOf(share)}`)).status).toBe(404);
  });
});

describe('share links: viewer side', () => {
  it('shows only what the page shows, without the title or hidden content', async () => {
    const { client, base, resume } = await setup();
    const hiddenEntry = resume.draft.content.experience[1];
    await client
      .put(`${base}/draft`)
      .set('if-match', String(resume.draftRevision))
      .send({
        content: resume.draft.content,
        layout: {
          ...resume.draft.layout,
          hiddenSections: ['certifications'],
          hiddenItems: [hiddenEntry.id],
        },
      });
    await client.patch(base).send({ backgroundPattern: 'dots' });
    const share = (await client.post(base + '/shares').send({ hideContactDetails: true })).body
      .share;

    const res = await anon().get(`/api/v1/shared/${tokenOf(share)}`);
    expect(res.status).toBe(200);
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(res.headers['cache-control']).toBe('no-store');
    const view = res.body.resume;
    expect(view).toMatchObject({
      name: sampleResume.contact.name,
      templateId: 'orbit',
      backgroundPattern: 'dots',
      allowDownload: false,
    });
    const text = JSON.stringify(view);
    expect(text).not.toContain('Stripe application');
    expect(text).not.toContain(hiddenEntry.company);
    expect(text).not.toContain(sampleResume.certifications[0].name);
    expect(text).not.toContain(sampleResume.contact.email);
    expect(text).not.toContain('evidenceIds');
    expect(text).not.toContain('userId');
    expect(view.layout.hiddenItems).toEqual([]);

    const listed = (await client.get(base + '/shares')).body.shares[0];
    expect(listed.viewCount).toBe(1);
    expect(listed.lastViewedAt).toBeTruthy();
  });

  it('follows edits for a live link and stays fixed for a version link', async () => {
    const { client, base, resume } = await setup();
    const version = (await client.post(`${base}/versions`).send({ name: 'Sent to Acme' })).body
      .version;
    const live = (await client.post(base + '/shares').send({})).body.share;
    const pinned = (await client.post(base + '/shares').send({ versionId: version.id })).body.share;
    expect(pinned.versionLabel).toBe('v1: Sent to Acme');

    await client
      .put(`${base}/draft`)
      .set('if-match', String(resume.draftRevision))
      .send({
        content: { ...resume.draft.content, headline: 'Edited after sharing' },
        layout: resume.draft.layout,
      });
    await client.patch(base).send({ templateId: 'lumen' });

    const liveView = (await anon().get(`/api/v1/shared/${tokenOf(live)}`)).body.resume;
    expect(liveView).toMatchObject({ headline: 'Edited after sharing', templateId: 'lumen' });
    const pinnedView = (await anon().get(`/api/v1/shared/${tokenOf(pinned)}`)).body.resume;
    expect(pinnedView.headline).toBe(sampleResume.headline);
    expect(pinnedView.templateId).toBe('orbit');

    await client.delete(`${base}/versions/${version.id}`);
    expect((await anon().get(`/api/v1/shared/${tokenOf(pinned)}`)).status).toBe(404);
    expect(
      (await client.get(base + '/shares')).body.shares.find((s) => s.id === pinned.id)
        .versionMissing,
    ).toBe(true);
  });

  it('turned-off, expired and made-up links show nothing', async () => {
    const { client, base } = await setup();
    const share = (await client.post(base + '/shares').send({ expiresInDays: 7 })).body.share;
    const url = `/api/v1/shared/${tokenOf(share)}`;
    expect((await anon().get(url)).status).toBe(200);

    await client.patch(`${base}/shares/${share.id}`).send({ enabled: false });
    const off = await anon().get(url);
    expect(off.status).toBe(404);
    expect(off.body.error.code).toBe('SHARE_UNAVAILABLE');

    await client.patch(`${base}/shares/${share.id}`).send({ enabled: true });
    await ShareLink.updateOne({ _id: share.id }, { $set: { expiresAt: new Date(Date.now() - 1) } });
    const gone = await anon().get(url);
    expect(gone.status).toBe(410);
    expect(gone.body.error.code).toBe('SHARE_EXPIRED');

    expect((await anon().get('/api/v1/shared/AAAAAAAAAAAAAAAAAAAAAAAA')).status).toBe(404);
    expect((await anon().get('/api/v1/shared/short')).status).toBe(400);
  });

  it('serves a PDF only when downloads are allowed', async () => {
    const { client, base } = await setup();
    const share = (await client.post(base + '/shares').send({})).body.share;
    const pdfUrl = `/api/v1/shared/${tokenOf(share)}/pdf`;
    const denied = await anon().get(pdfUrl);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('DOWNLOAD_NOT_ALLOWED');
  });

  it.skipIf(!hasChrome)(
    'downloads the visible resume as a PDF and counts it',
    async () => {
      const { client, base } = await setup();
      const share = (
        await client.post(base + '/shares').send({ allowDownload: true, hideContactDetails: true })
      ).body.share;
      const res = await anon()
        .get(`/api/v1/shared/${tokenOf(share)}/pdf`)
        .buffer(true)
        .parse((r, cb) => {
          const chunks = [];
          r.on('data', (c) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        });
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/attachment; filename=".+-resume\.pdf"/);
      const { lines } = await parsePdf(res.body);
      const text = lines.map((l) => l.text).join('\n');
      expect(text).toContain(sampleResume.contact.name);
      expect(text).not.toContain(sampleResume.contact.email);
      expect((await client.get(base + '/shares')).body.shares[0].downloadCount).toBe(1);
    },
    60_000,
  );
});
