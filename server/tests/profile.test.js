import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp, connectTestDb, dropTestDb, clearCollections, registerUser } from './helpers.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';

const app = buildApp();
beforeAll(connectTestDb);
afterAll(dropTestDb);
beforeEach(clearCollections);

const put = (client, revision, content) =>
  client.put('/api/v1/profile').set('if-match', `"${revision}"`).send({ content });

describe('profile', () => {
  it('returns an empty profile at revision 0 before the first save', async () => {
    const { client } = await registerUser(app);
    const res = await client.get('/api/v1/profile');
    expect(res.status).toBe(200);
    expect(res.body.profile.revision).toBe(0);
    expect(res.body.profile.content.experience).toEqual([]);
    expect(res.body.profile.content.contact.name).toBe('');
  });

  it('saves full content and bumps the revision', async () => {
    const { client } = await registerUser(app);
    const first = await put(client, 0, sampleResume);
    expect(first.status).toBe(200);
    expect(first.body.profile.revision).toBe(1);
    expect(first.headers.etag).toBe('"1"');
    const second = await put(client, 1, { ...sampleResume, headline: 'Platform engineer' });
    expect(second.body.profile.revision).toBe(2);
    const read = await client.get('/api/v1/profile');
    expect(read.body.profile.content.headline).toBe('Platform engineer');
    expect(read.body.profile.content.experience[0].bullets[0].id).toBe(
      sampleResume.experience[0].bullets[0].id,
    );
  });

  it('preserves text exactly, including whitespace and Unicode', async () => {
    const { client } = await registerUser(app);
    const content = {
      contact: { name: '  Zoë Ångström-Nguyễn 李  ' },
      summary: 'Line one\n\n  indented — “quoted” & <b>',
    };
    const res = await put(client, 0, content);
    expect(res.body.profile.content.contact.name).toBe('  Zoë Ångström-Nguyễn 李  ');
    expect(res.body.profile.content.summary).toBe('Line one\n\n  indented — “quoted” & <b>');
  });

  it('rejects a stale revision with 409 and the current revision', async () => {
    const { client } = await registerUser(app);
    await put(client, 0, sampleResume);
    await put(client, 1, sampleResume);
    const stale = await put(client, 1, { ...sampleResume, headline: 'Lost update?' });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('STALE_REVISION');
    expect(stale.body.error.details.currentRevision).toBe(2);
    expect((await client.get('/api/v1/profile')).body.profile.content.headline).toBe(
      sampleResume.headline,
    );
  });

  it('rejects a second "first save" from another tab', async () => {
    const { client } = await registerUser(app);
    await put(client, 0, sampleResume);
    const again = await put(client, 0, sampleResume);
    expect(again.status).toBe(409);
  });

  it('requires If-Match', async () => {
    const { client } = await registerUser(app);
    const res = await client.put('/api/v1/profile').send({ content: {} });
    expect(res.status).toBe(428);
  });

  it('validates content with field paths', async () => {
    const { client } = await registerUser(app);
    const res = await put(client, 0, {
      contact: { website: 'javascript:alert(1)', email: 'not-an-email' },
      experience: [{ id: 'exp_1', startDate: '2023-13', bullets: [] }],
      unknownSection: [],
    });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.fields.map((f) => f.path);
    expect(paths).toEqual(
      expect.arrayContaining(['contact.website', 'contact.email', 'experience.0.startDate']),
    );
  });

  it('rejects duplicate entry ids and operator-shaped values', async () => {
    const { client } = await registerUser(app);
    const dup = await put(client, 0, {
      skills: [
        { id: 'sk_1', name: 'Go' },
        { id: 'sk_1', name: 'Rust' },
      ],
    });
    expect(dup.status).toBe(400);
    const op = await put(client, 0, { contact: { name: { $gt: '' } } });
    expect(op.status).toBe(400);
  });

  it('enforces size limits', async () => {
    const { client } = await registerUser(app);
    const res = await put(client, 0, { summary: 'x'.repeat(3001) });
    expect(res.status).toBe(400);
  });

  it('adds, updates and deletes entries with revision checks', async () => {
    const { client } = await registerUser(app);
    const added = await client
      .post('/api/v1/profile/experience')
      .set('if-match', '0')
      .send({ entry: { company: 'Northwind', title: 'Engineer', startDate: '2022-03' } });
    expect(added.status).toBe(201);
    const entryId = added.body.entry.id;
    expect(entryId).toMatch(/^exp_/);
    expect(added.body.entry.bullets).toEqual([]);

    const patched = await client
      .patch(`/api/v1/profile/experience/${entryId}`)
      .set('if-match', '1')
      .send({ changes: { title: 'Senior Engineer', current: true } });
    expect(patched.status).toBe(200);
    expect(patched.body.entry).toMatchObject({
      id: entryId,
      title: 'Senior Engineer',
      company: 'Northwind',
      current: true,
    });

    const stale = await client.delete(`/api/v1/profile/experience/${entryId}`).set('if-match', '1');
    expect(stale.status).toBe(409);
    const removed = await client
      .delete(`/api/v1/profile/experience/${entryId}`)
      .set('if-match', '2');
    expect(removed.status).toBe(200);
    expect(removed.body.profile.content.experience).toEqual([]);
    const missing = await client
      .delete(`/api/v1/profile/experience/${entryId}`)
      .set('if-match', '3');
    expect(missing.status).toBe(404);
  });

  it('rejects unknown sections and id changes', async () => {
    const { client } = await registerUser(app);
    expect(
      (await client.post('/api/v1/profile/hobbies').set('if-match', '0').send({ entry: {} }))
        .status,
    ).toBe(400);
    const added = await client
      .post('/api/v1/profile/skills')
      .set('if-match', '0')
      .send({ entry: { name: 'Go' } });
    const res = await client
      .patch(`/api/v1/profile/skills/${added.body.entry.id}`)
      .set('if-match', '1')
      .send({ changes: { id: 'sk_other' } });
    expect(res.status).toBe(400);
  });

  it('removes evidence links when the evidence item is deleted', async () => {
    const { client } = await registerUser(app);
    const content = {
      evidenceItems: [
        { id: 'ev_1', title: 'Benchmark', kind: 'link', url: 'https://example.com/bench' },
      ],
      experience: [
        {
          id: 'exp_1',
          bullets: [{ id: 'b_1', text: 'Cut latency 30%', evidenceIds: ['ev_1', 'ev_missing'] }],
        },
      ],
    };
    const saved = await put(client, 0, content);
    expect(saved.body.profile.content.experience[0].bullets[0].evidenceIds).toEqual(['ev_1']);
    const deleted = await client.delete('/api/v1/profile/evidenceItems/ev_1').set('if-match', '1');
    expect(deleted.body.profile.content.experience[0].bullets[0].evidenceIds).toEqual([]);
  });

  it('is isolated per user and included in export and deletion', async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    await put(a.client, 0, sampleResume);
    expect((await b.client.get('/api/v1/profile')).body.profile.revision).toBe(0);
    const exported = await a.client.get('/api/v1/account/export');
    expect(exported.body.profile.content.contact.name).toBe(sampleResume.contact.name);
    const del = await a.client
      .delete('/api/v1/account')
      .send({ password: a.credentials.password, confirmation: 'DELETE' });
    expect(del.body.deleted.profile).toBe(1);
  });

  it('requires authentication', async () => {
    const { agent } = await import('./helpers.js');
    expect((await agent(app).get('/api/v1/profile')).status).toBe(401);
  });
});
