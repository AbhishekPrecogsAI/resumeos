import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { buildApp, connectTestDb, dropTestDb, makeEnv, registerUser, agent } from './helpers.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';

let dir;
let app;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'resumeos-privacy-'));
  app = buildApp({ env: makeEnv({ EXPORT_TEMP_DIR: dir }) });
  await connectTestDb();
});
afterAll(async () => {
  await dropTestDb();
  await rm(dir, { recursive: true, force: true });
});

/** Create one of everything a user can store. */
async function populate(u) {
  const c = u.client;
  await c
    .put('/api/v1/profile')
    .set('if-match', '0')
    .send({
      content: {
        ...sampleResume,
        evidenceItems: [{ id: 'ev_1', title: 'Private benchmark', kind: 'note', note: 'secret' }],
      },
    });
  const resume = (await c.post('/api/v1/resumes').send({ title: 'Everything' })).body.resume;
  const version = (await c.post(`/api/v1/resumes/${resume.id}/versions`).send({ name: 'v' })).body
    .version;
  expect(
    (await c.post(`/api/v1/resumes/${resume.id}/export`).send({ format: 'docx' })).status,
  ).toBe(201);
  const report = (await c.post(`/api/v1/resumes/${resume.id}/quality-check`).send({})).body.report;
  await c
    .post(`/api/v1/resumes/${resume.id}/quality-dismissals`)
    .send({ key: report.findings[0].key, reason: 'x' });
  const job = (
    await c.post('/api/v1/jobs').send({
      title: 'Platform',
      descriptionText: 'Requirements: Node.js and Kubernetes experience.',
    })
  ).body.job;
  await c.post('/api/v1/applications').send({
    company: 'X',
    role: 'Y',
    jobDescriptionId: job.id,
    resumeId: resume.id,
    resumeVersionId: version.id,
  });
  expect(
    (await c.post(`/api/v1/resumes/${resume.id}/shares`).send({ allowDownload: true })).status,
  ).toBe(201);
  await agent(app)
    .post('/api/v1/auth/login')
    .send({ email: u.credentials.email, password: u.credentials.password });
}

async function documentsReferencing(userId) {
  const id = new mongoose.Types.ObjectId(userId);
  const hits = {};
  for (const coll of await mongoose.connection.db.collections()) {
    const n = await coll.countDocuments({ $or: [{ userId: id }, { _id: id }, { createdBy: id }] });
    if (n) hits[coll.collectionName] = n;
  }
  return hits;
}

describe('account deletion is complete', () => {
  it('leaves no document referencing the user in any collection, and no files', async () => {
    const victim = await registerUser(app);
    const bystander = await registerUser(app);
    await populate(victim);
    await populate(bystander);

    const before = await documentsReferencing(victim.user.id);
    // Every kind of record exists before deletion, so the check below is meaningful.
    expect(Object.keys(before).sort()).toEqual(
      [
        'applicationrecords',
        'careerprofiles',
        'exportrecords',
        'jobdescriptions',
        'resumes',
        'resumeversions',
        'sessions',
        'sharelinks',
        'users',
      ].sort(),
    );

    const exported = (await victim.client.get('/api/v1/account/export')).body;
    expect(Object.keys(exported)).toEqual(
      expect.arrayContaining([
        'account',
        'sessions',
        'profile',
        'resumes',
        'resumeVersions',
        'exports',
        'jobDescriptions',
        'applications',
        'shareLinks',
      ]),
    );

    const del = await victim.client
      .delete('/api/v1/account')
      .send({ password: victim.credentials.password, confirmation: 'DELETE' });
    expect(del.status).toBe(200);
    expect(await documentsReferencing(victim.user.id)).toEqual({});

    // The other user's data is untouched, including their export file.
    expect(Object.keys(await documentsReferencing(bystander.user.id)).length).toBe(9);
    expect(await readdir(dir)).toHaveLength(1);
  });
});
