import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp, connectTestDb, dropTestDb, clearCollections, registerUser } from './helpers.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { ResumeVersion } from '../src/modules/versions/version.model.js';

const app = buildApp();
beforeAll(connectTestDb);
afterAll(dropTestDb);
beforeEach(clearCollections);

async function setup() {
  const u = await registerUser(app);
  await u.client.put('/api/v1/profile').set('if-match', '0').send({ content: sampleResume });
  const resume = (await u.client.post('/api/v1/resumes').send({ title: 'Backend roles' })).body
    .resume;
  const base = `/api/v1/resumes/${resume.id}`;
  let revision = resume.draftRevision;
  const draft = structuredClone(resume.draft);
  const edit = async (fn) => {
    fn(draft);
    const res = await u.client.put(`${base}/draft`).set('if-match', String(revision)).send(draft);
    expect(res.status).toBe(200);
    revision = res.body.resume.draftRevision;
    return res.body.resume;
  };
  const save = async (name, changeNote) =>
    (await u.client.post(`${base}/versions`).send({ name, changeNote })).body.version;
  return { ...u, resume, base, edit, save, draft, rev: () => revision };
}

describe('versions', () => {
  it('saves numbered immutable snapshots with parents', async () => {
    const { client, base, edit, save } = await setup();
    const v1 = await save('General', 'First cut');
    await edit((d) => (d.content.headline = 'Platform engineer'));
    const v2 = await save('Platform');
    expect(v1).toMatchObject({
      versionNumber: 1,
      name: 'General',
      changeNote: 'First cut',
      kind: 'manual',
      parentVersionId: null,
    });
    expect(v2).toMatchObject({ versionNumber: 2, parentVersionId: v1.id });
    const full = (await client.get(`${base}/versions/${v1.id}`)).body.version;
    expect(full.snapshot.content.headline).toBe(sampleResume.headline);
    const list = (await client.get(`${base}/versions`)).body;
    expect(list.items.map((v) => v.versionNumber)).toEqual([2, 1]);
    expect(list).toMatchObject({ total: 2, currentVersionId: v2.id, draftMatchesCurrent: true });
    expect(list.items[0].snapshot).toBeUndefined();
  });

  it('has no way to modify a saved version', async () => {
    const { client, base, save } = await setup();
    const v1 = await save('General');
    expect((await client.patch(`${base}/versions/${v1.id}`).send({ name: 'x' })).status).toBe(404);
    expect((await client.put(`${base}/versions/${v1.id}`).send({ name: 'x' })).status).toBe(404);
  });

  it('defaults the name and reports unsaved draft changes', async () => {
    const { client, base, edit, save } = await setup();
    const v1 = await save();
    expect(v1.name).toBe('Version 1');
    await edit((d) => (d.content.summary = 'Changed'));
    expect((await client.get(`${base}/versions`)).body.draftMatchesCurrent).toBe(false);
  });

  it('restores as a new version and auto-saves unsaved work first', async () => {
    const { client, base, edit, save } = await setup();
    const v1 = await save('General');
    await edit((d) => (d.content.headline = 'Platform engineer'));
    await save('Platform');
    await edit((d) => (d.content.headline = 'Unsaved experiment'));

    const res = await client.post(`${base}/versions/${v1.id}/restore`).send({});
    expect(res.status).toBe(201);
    expect(res.body.autoSaved).toMatchObject({
      versionNumber: 3,
      kind: 'auto',
      name: 'Before restoring v1',
    });
    expect(res.body.restored).toMatchObject({
      versionNumber: 4,
      kind: 'restore',
      restoredFromVersionId: v1.id,
      parentVersionId: res.body.autoSaved.id,
    });
    expect(res.body.resume.draft.content.headline).toBe(sampleResume.headline);

    const auto = (await client.get(`${base}/versions/${res.body.autoSaved.id}`)).body.version;
    expect(auto.snapshot.content.headline).toBe('Unsaved experiment');
    expect((await client.get(`${base}/versions`)).body.total).toBe(4);
  });

  it('does not auto-save when the draft matches the current version', async () => {
    const { client, base, edit, save } = await setup();
    const v1 = await save('General');
    await edit((d) => (d.content.headline = 'Platform engineer'));
    await save('Platform');
    const res = await client.post(`${base}/versions/${v1.id}/restore`).send({});
    expect(res.body.autoSaved).toBeNull();
    expect(res.body.restored.versionNumber).toBe(3);
  });

  it('bumps the draft revision so stale editor tabs get a conflict', async () => {
    const { client, base, save, draft, rev } = await setup();
    const v1 = await save();
    const before = rev();
    await client.post(`${base}/versions/${v1.id}/restore`).send({});
    const stale = await client.put(`${base}/draft`).set('if-match', String(before)).send(draft);
    expect(stale.status).toBe(409);
  });

  it('compares versions and the draft at field level', async () => {
    const { client, base, edit, save } = await setup();
    const v1 = await save('General');
    await edit((d) => {
      d.content.experience[0].title = 'Staff Backend Engineer';
      d.layout.hiddenSections = ['projects'];
    });
    const v2 = await save('Platform');
    const cmp = (await client.get(`${base}/compare?left=${v1.id}&right=${v2.id}`)).body;
    expect(cmp.left).toMatchObject({ type: 'version', kind: 'manual', versionNumber: 1 });
    const exp = cmp.diff.sections.find((s) => s.key === 'experience');
    expect(exp.entries[0]).toMatchObject({
      status: 'modified',
      fields: [expect.objectContaining({ field: 'title', after: 'Staff Backend Engineer' })],
    });
    expect(cmp.diff.layout.visibility).toEqual([
      expect.objectContaining({ section: 'projects', after: 'hidden' }),
    ]);

    await edit((d) => (d.content.headline = 'Draft only'));
    const vsDraft = (await client.get(`${base}/compare?left=${v2.id}&right=draft`)).body;
    expect(vsDraft.right.type).toBe('draft');
    expect(vsDraft.diff.sections.find((s) => s.key === 'summary').fields[0].after).toBe(
      'Draft only',
    );
    expect((await client.get(`${base}/compare?left=nope&right=draft`)).status).toBe(400);
  });

  it('branches a new resume from a saved version', async () => {
    const { client, resume, base, edit, save } = await setup();
    const v1 = await save('General');
    await edit((d) => (d.content.headline = 'Later change'));
    const branch = await client
      .post(`${base}/duplicate`)
      .send({ fromVersionId: v1.id, targetRole: 'SRE' });
    expect(branch.status).toBe(201);
    expect(branch.body.resume).toMatchObject({
      title: 'Backend roles (from v1)',
      targetRole: 'SRE',
      branchedFrom: { resumeId: resume.id, versionId: v1.id, versionNumber: 1 },
    });
    expect(branch.body.resume.draft.content.headline).toBe(sampleResume.headline);
  });

  it('deleting a version moves "current" to the latest remaining one; numbers are never reused', async () => {
    const { client, base, save } = await setup();
    const v1 = await save();
    const v2 = await save();
    expect((await client.delete(`${base}/versions/${v2.id}`)).status).toBe(204);
    expect((await client.get(`${base}/versions`)).body.currentVersionId).toBe(v1.id);
    const v3 = await save();
    expect(v3.versionNumber).toBe(3);
  });

  it('enforces the per-resume version limit', async () => {
    const { client, base, resume, user } = await setup();
    const { Types } = (await import('mongoose')).default;
    const docs = Array.from({ length: 100 }, (_, i) => ({
      userId: new Types.ObjectId(user.id),
      resumeId: new Types.ObjectId(resume.id),
      versionNumber: i + 1,
      name: `v${i + 1}`,
      templateId: 'clarity',
      templateVersion: '1.0.0',
      pageSize: 'A4',
      snapshot: { content: {}, layout: {} },
      contentHash: '0'.repeat(16),
      createdBy: new Types.ObjectId(user.id),
    }));
    await ResumeVersion.insertMany(docs);
    const res = await client.post(`${base}/versions`).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VERSION_LIMIT_REACHED');
  });

  it('is private to the owner', async () => {
    const owner = await setup();
    const v1 = await owner.save();
    const { client: other } = await registerUser(app);
    expect((await other.get(`${owner.base}/versions`)).status).toBe(404);
    expect((await other.post(`${owner.base}/versions`).send({})).status).toBe(404);
    expect((await other.get(`${owner.base}/versions/${v1.id}`)).status).toBe(404);
    expect((await other.post(`${owner.base}/versions/${v1.id}/restore`).send({})).status).toBe(404);
    expect((await other.delete(`${owner.base}/versions/${v1.id}`)).status).toBe(404);
    expect((await other.get(`${owner.base}/compare?left=${v1.id}&right=draft`)).status).toBe(404);
    expect(
      (await other.post(`${owner.base}/duplicate`).send({ fromVersionId: v1.id })).status,
    ).toBe(404);
  });

  it('is removed with its resume and with the account, and included in export', async () => {
    const { client, base, save, credentials } = await setup();
    await save();
    const exported = (await client.get('/api/v1/account/export')).body;
    expect(exported.resumeVersions).toHaveLength(1);
    expect(exported.resumeVersions[0].snapshot.content.contact.name).toBe(
      sampleResume.contact.name,
    );
    await client.delete(base);
    expect(await ResumeVersion.countDocuments()).toBe(0);
    const again = await setup();
    await again.save();
    const del = await again.client
      .delete('/api/v1/account')
      .send({ password: again.credentials.password, confirmation: 'DELETE' });
    expect(del.body.deleted.resumeVersions).toBe(1);
    void credentials;
  });
});
