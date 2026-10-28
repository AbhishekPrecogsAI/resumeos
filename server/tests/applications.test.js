import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp, connectTestDb, dropTestDb, clearCollections, registerUser } from './helpers.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';

const app = buildApp();
beforeAll(connectTestDb);
afterAll(dropTestDb);
beforeEach(clearCollections);

async function setup() {
  const u = await registerUser(app);
  await u.client.put('/api/v1/profile').set('if-match', '0').send({ content: sampleResume });
  const resume = (await u.client.post('/api/v1/resumes').send({ title: 'Backend' })).body.resume;
  const version = (
    await u.client
      .post(`/api/v1/resumes/${resume.id}/versions`)
      .send({ name: 'Sent to Example Co' })
  ).body.version;
  const job = (
    await u.client
      .post('/api/v1/jobs')
      .send({
        title: 'Platform Engineer',
        company: 'Example Co',
        descriptionText: 'Requirements: Node.js, Kubernetes and PostgreSQL.',
      })
  ).body.job;
  return { ...u, resume, version, job };
}

describe('applications API', () => {
  it('records which resume version and job were used, with labels', async () => {
    const { client, resume, version, job } = await setup();
    const res = await client
      .post('/api/v1/applications')
      .send({
        company: 'Example Co',
        role: 'Platform Engineer',
        status: 'applied',
        appliedAt: '2026-10-20',
        nextFollowUpAt: '2026-10-27',
        jobDescriptionId: job.id,
        resumeId: resume.id,
        resumeVersionId: version.id,
        notes: 'Referred by a former colleague.',
      });
    expect(res.status).toBe(201);
    expect(res.body.application).toMatchObject({
      status: 'applied',
      resumeLabel: 'Backend, v1: Sent to Example Co',
      jobLabel: 'Platform Engineer at Example Co',
      resumeVersionId: version.id,
    });
  });

  it('lists, filters by status, updates and deletes', async () => {
    const { client } = await setup();
    const a = (await client.post('/api/v1/applications').send({ company: 'A', role: 'SRE' })).body
      .application;
    await client
      .post('/api/v1/applications')
      .send({ company: 'B', role: 'SRE', status: 'applied' });
    expect(a.status).toBe('planned');
    expect((await client.get('/api/v1/applications')).body.total).toBe(2);
    expect(
      (await client.get('/api/v1/applications?status=applied')).body.items.map((x) => x.company),
    ).toEqual(['B']);
    const moved = await client
      .patch(`/api/v1/applications/${a.id}`)
      .send({ status: 'interviewing', notes: 'Onsite next week' });
    expect(moved.body.application).toMatchObject({
      status: 'interviewing',
      notes: 'Onsite next week',
      company: 'A',
    });
    expect((await client.delete(`/api/v1/applications/${a.id}`)).status).toBe(204);
    expect((await client.get(`/api/v1/applications/${a.id}`)).status).toBe(404);
  });

  it('lists follow-ups that are due for open applications only', async () => {
    const { client } = await setup();
    await client
      .post('/api/v1/applications')
      .send({ company: 'Due', role: 'R', status: 'applied', nextFollowUpAt: '2026-10-25' });
    await client
      .post('/api/v1/applications')
      .send({ company: 'Later', role: 'R', status: 'applied', nextFollowUpAt: '2026-11-30' });
    await client
      .post('/api/v1/applications')
      .send({ company: 'Closed', role: 'R', status: 'rejected', nextFollowUpAt: '2026-10-01' });
    await client
      .post('/api/v1/applications')
      .send({ company: 'None', role: 'R', status: 'applied' });
    const due = (await client.get('/api/v1/applications/due?today=2026-10-28')).body.items;
    expect(due.map((x) => x.company)).toEqual(['Due']);
  });

  it('validates dates, statuses and ownership of links', async () => {
    const owner = await setup();
    const { client } = owner;
    expect(
      (
        await client
          .post('/api/v1/applications')
          .send({ company: 'A', role: 'R', appliedAt: '2026-02-30' })
      ).status,
    ).toBe(400);
    expect(
      (
        await client
          .post('/api/v1/applications')
          .send({ company: 'A', role: 'R', status: 'ghosted' })
      ).status,
    ).toBe(400);
    expect(
      (
        await client
          .post('/api/v1/applications')
          .send({ company: 'A', role: 'R', resumeVersionId: owner.version.id })
      ).status,
    ).toBe(400);
    const other = await setup();
    const res = await client
      .post('/api/v1/applications')
      .send({ company: 'A', role: 'R', resumeId: other.resume.id });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields[0].path).toBe('resumeId');
    expect(
      (
        await client
          .post('/api/v1/applications')
          .send({ company: 'A', role: 'R', jobDescriptionId: other.job.id })
      ).status,
    ).toBe(400);
    expect(
      (
        await client
          .post('/api/v1/applications')
          .send({
            company: 'A',
            role: 'R',
            resumeId: owner.resume.id,
            resumeVersionId: other.version.id,
          })
      ).status,
    ).toBe(400);
  });

  it('keeps history labels when the linked version, job or resume is deleted', async () => {
    const { client, resume, version, job } = await setup();
    const a = (
      await client
        .post('/api/v1/applications')
        .send({
          company: 'Example Co',
          role: 'Platform',
          resumeId: resume.id,
          resumeVersionId: version.id,
          jobDescriptionId: job.id,
        })
    ).body.application;
    await client.delete(`/api/v1/resumes/${resume.id}/versions/${version.id}`);
    await client.delete(`/api/v1/jobs/${job.id}`);
    let after = (await client.get(`/api/v1/applications/${a.id}`)).body.application;
    expect(after).toMatchObject({
      resumeVersionId: null,
      jobDescriptionId: null,
      resumeLabel: 'Backend, v1: Sent to Example Co',
      jobLabel: 'Platform Engineer at Example Co',
    });
    await client.delete(`/api/v1/resumes/${resume.id}`);
    after = (await client.get(`/api/v1/applications/${a.id}`)).body.application;
    expect(after).toMatchObject({ resumeId: null, resumeLabel: 'Backend, v1: Sent to Example Co' });
  });

  it('is private, exported, and deleted with the account', async () => {
    const owner = await setup();
    const a = (await owner.client.post('/api/v1/applications').send({ company: 'A', role: 'R' }))
      .body.application;
    const { client: other } = await registerUser(app);
    expect((await other.get(`/api/v1/applications/${a.id}`)).status).toBe(404);
    expect(
      (await other.patch(`/api/v1/applications/${a.id}`).send({ status: 'offer' })).status,
    ).toBe(404);
    expect((await other.delete(`/api/v1/applications/${a.id}`)).status).toBe(404);
    expect((await other.get('/api/v1/applications')).body.total).toBe(0);
    expect((await owner.client.get('/api/v1/account/export')).body.applications).toHaveLength(1);
    const del = await owner.client
      .delete('/api/v1/account')
      .send({ password: owner.credentials.password, confirmation: 'DELETE' });
    expect(del.body.deleted.applications).toBe(1);
  });
});
