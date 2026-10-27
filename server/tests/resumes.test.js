import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp, connectTestDb, dropTestDb, clearCollections, registerUser } from './helpers.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { compareWithProfile } from '@resumeos/shared/sync.js';

const app = buildApp();
beforeAll(connectTestDb);
afterAll(dropTestDb);
beforeEach(clearCollections);

async function userWithProfile() {
  const u = await registerUser(app);
  const content = {
    ...sampleResume,
    evidenceItems: [{ id: 'ev_1', title: 'Private note', kind: 'note', note: 'secret details' }],
  };
  await u.client.put('/api/v1/profile').set('if-match', '0').send({ content });
  return u;
}

const create = (client, body = { title: 'Platform roles' }) =>
  client.post('/api/v1/resumes').send(body);
const saveDraft = (client, id, revision, draft) =>
  client.put(`/api/v1/resumes/${id}/draft`).set('if-match', String(revision)).send(draft);

describe('resumes', () => {
  it('creates a resume from the profile without private evidence', async () => {
    const { client } = await userWithProfile();
    const res = await create(client, {
      title: 'Platform roles',
      targetRole: 'Platform Engineer',
      pageSize: 'Letter',
    });
    expect(res.status).toBe(201);
    const { resume } = res.body;
    expect(resume).toMatchObject({
      title: 'Platform roles',
      targetRole: 'Platform Engineer',
      templateId: 'clarity',
      pageSize: 'Letter',
      draftRevision: 1,
    });
    expect(resume.draft.content.experience.map((e) => e.id)).toEqual(
      sampleResume.experience.map((e) => e.id),
    );
    expect(resume.draft.content.evidenceItems).toBeUndefined();
    expect(JSON.stringify(resume)).not.toContain('secret details');
    expect(resume.draft.layout.sectionOrder[0]).toBe('summary');
  });

  it('starts in sync with the profile', async () => {
    const { client } = await userWithProfile();
    const { resume } = (await create(client)).body;
    const profile = (await client.get('/api/v1/profile')).body.profile.content;
    expect(compareWithProfile(resume.draft.content, profile, resume.draft.baselines)).toEqual([]);
  });

  it('works with no profile saved yet', async () => {
    const { client } = await registerUser(app);
    const res = await create(client);
    expect(res.status).toBe(201);
    expect(res.body.resume.draft.content.experience).toEqual([]);
  });

  it('editing a resume never changes the profile', async () => {
    const { client } = await userWithProfile();
    const { resume } = (await create(client)).body;
    const draft = structuredClone(resume.draft);
    draft.content.experience[0].title = 'Staff Engineer';
    const saved = await saveDraft(client, resume.id, 1, draft);
    expect(saved.status).toBe(200);
    expect(saved.body.resume.draftRevision).toBe(2);
    const profile = (await client.get('/api/v1/profile')).body.profile.content;
    expect(profile.experience[0].title).toBe(sampleResume.experience[0].title);
  });

  it('rejects stale draft saves', async () => {
    const { client } = await userWithProfile();
    const { resume } = (await create(client)).body;
    await saveDraft(client, resume.id, 1, resume.draft);
    const stale = await saveDraft(client, resume.id, 1, resume.draft);
    expect(stale.status).toBe(409);
    expect(stale.body.error.details.currentRevision).toBe(2);
  });

  it('validates draft content and layout', async () => {
    const { client } = await userWithProfile();
    const { resume } = (await create(client)).body;
    const bad = await saveDraft(client, resume.id, 1, {
      content: { ...resume.draft.content, summary: 42 },
      layout: { sectionOrder: ['summary', 'nonsense'], hiddenSections: [], hiddenItems: [] },
    });
    expect(bad.status).toBe(400);
    const paths = bad.body.error.details.fields.map((f) => f.path);
    expect(paths).toEqual(expect.arrayContaining(['content.summary', 'layout.sectionOrder.1']));
  });

  it('lists, paginates, renames, archives, duplicates and deletes', async () => {
    const { client } = await userWithProfile();
    const a = (await create(client, { title: 'A' })).body.resume;
    await create(client, { title: 'B' });
    await create(client, { title: 'C' });
    const page1 = await client.get('/api/v1/resumes?limit=2');
    expect(page1.body).toMatchObject({ total: 3, page: 1, limit: 2 });
    expect(page1.body.items.map((r) => r.title)).toEqual(['C', 'B']);
    expect(page1.body.items[0].draft).toBeUndefined();

    const renamed = await client
      .patch(`/api/v1/resumes/${a.id}`)
      .send({ title: 'A renamed', archived: true });
    expect(renamed.body.resume).toMatchObject({ title: 'A renamed', archived: true });
    expect((await client.get('/api/v1/resumes')).body.total).toBe(2);
    expect((await client.get('/api/v1/resumes?includeArchived=true')).body.total).toBe(3);

    const copy = await client.post(`/api/v1/resumes/${a.id}/duplicate`).send({});
    expect(copy.status).toBe(201);
    expect(copy.body.resume.title).toBe('A renamed (copy)');
    expect(copy.body.resume.draft).toEqual(renamed.body.resume.draft);

    expect((await client.delete(`/api/v1/resumes/${a.id}`)).status).toBe(204);
    expect((await client.get(`/api/v1/resumes/${a.id}`)).status).toBe(404);
  });

  it('rejects unknown templates and blank titles', async () => {
    const { client } = await registerUser(app);
    expect((await create(client, { title: 'X', templateId: 'fancy' })).status).toBe(400);
    expect((await create(client, { title: '   ' })).status).toBe(400);
  });

  it("denies access to another user's resume", async () => {
    const owner = await userWithProfile();
    const { resume } = (await create(owner.client)).body;
    const { client: other } = await registerUser(app);
    expect((await other.get(`/api/v1/resumes/${resume.id}`)).status).toBe(404);
    expect(
      (await other.patch(`/api/v1/resumes/${resume.id}`).send({ title: 'Mine now' })).status,
    ).toBe(404);
    expect((await saveDraft(other, resume.id, 1, resume.draft)).status).toBe(404);
    expect((await other.post(`/api/v1/resumes/${resume.id}/duplicate`).send({})).status).toBe(404);
    expect((await other.delete(`/api/v1/resumes/${resume.id}`)).status).toBe(404);
    expect((await other.get('/api/v1/resumes')).body.total).toBe(0);
    expect((await owner.client.get(`/api/v1/resumes/${resume.id}`)).body.resume.title).toBe(
      'Platform roles',
    );
  });

  it('is exported and deleted with the account', async () => {
    const { client, credentials } = await userWithProfile();
    await create(client);
    const exported = await client.get('/api/v1/account/export');
    expect(exported.body.resumes).toHaveLength(1);
    const del = await client
      .delete('/api/v1/account')
      .send({ password: credentials.password, confirmation: 'DELETE' });
    expect(del.body.deleted).toMatchObject({ resumes: 1, profile: 1, account: 1 });
  });
});
