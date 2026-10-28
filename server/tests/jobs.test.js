import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp, connectTestDb, dropTestDb, clearCollections, registerUser } from './helpers.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { JobDescription } from '../src/modules/jobs/job.model.js';

const app = buildApp();
beforeAll(connectTestDb);
afterAll(dropTestDb);
beforeEach(clearCollections);

const JD = `Platform Engineer (sample)

Requirements:
- Node.js and Go services
- Kubernetes on AWS
- PostgreSQL

Nice to have:
- Kafka, Elixir`;

async function setup() {
  const u = await registerUser(app);
  await u.client.put('/api/v1/profile').set('if-match', '0').send({ content: sampleResume });
  const resume = (await u.client.post('/api/v1/resumes').send({ title: 'Backend' })).body.resume;
  return { ...u, resume };
}

describe('jobs API', () => {
  it('analyzes without storing anything', async () => {
    const { client, resume } = await setup();
    const res = await client
      .post('/api/v1/jobs/analyze')
      .send({ descriptionText: JD, resumeId: resume.id });
    expect(res.status).toBe(200);
    expect(res.body.terms.map((t) => t.term)).toEqual(
      expect.arrayContaining([
        'Node.js',
        'Go',
        'Kubernetes',
        'AWS',
        'PostgreSQL',
        'Kafka',
        'Elixir',
      ]),
    );
    const byTerm = Object.fromEntries(res.body.report.results.map((r) => [r.term.term, r]));
    expect(byTerm['Node.js'].status).toBe('in-resume');
    expect(byTerm.Elixir.status).toBe('not-found');
    expect(res.body.report.counts.total).toBe(res.body.terms.length);
    expect(await JobDescription.countDocuments()).toBe(0);
  });

  it('saves, lists, edits terms, resets and deletes', async () => {
    const { client } = await setup();
    const created = await client
      .post('/api/v1/jobs')
      .send({ title: 'Platform Engineer', company: 'Example Co', descriptionText: JD });
    expect(created.status).toBe(201);
    const job = created.body.job;
    expect(job.termsEdited).toBe(false);
    expect((await client.get('/api/v1/jobs')).body.items[0]).toMatchObject({
      id: job.id,
      title: 'Platform Engineer',
      termCount: job.terms.length,
    });
    expect((await client.get('/api/v1/jobs')).body.items[0].descriptionText).toBeUndefined();

    const edited = job.terms
      .filter((t) => t.term !== 'Elixir')
      .concat([{ id: 'temporal', term: 'Temporal', source: 'user', importance: 'preferred' }]);
    const patched = await client.patch(`/api/v1/jobs/${job.id}`).send({ terms: edited });
    expect(patched.status).toBe(200);
    expect(patched.body.job.termsEdited).toBe(true);
    expect(patched.body.job.terms.map((t) => t.term)).toContain('Temporal');
    expect(patched.body.job.terms.map((t) => t.term)).not.toContain('Elixir');
    expect(patched.body.job.extractedTerms.map((t) => t.term)).toContain('Elixir');

    const reextracted = await client.post(`/api/v1/jobs/${job.id}/extract-terms`).send({});
    expect(reextracted.body.job.termsEdited).toBe(true);

    const reset = await client.patch(`/api/v1/jobs/${job.id}`).send({ resetTerms: true });
    expect(reset.body.job.terms.map((t) => t.term)).toContain('Elixir');
    expect((await client.delete(`/api/v1/jobs/${job.id}`)).status).toBe(204);
    expect((await client.get(`/api/v1/jobs/${job.id}`)).status).toBe(404);
  });

  it('matches a saved job against a draft or a saved version', async () => {
    const { client, resume } = await setup();
    const job = (await client.post('/api/v1/jobs').send({ title: 'Platform', descriptionText: JD }))
      .body.job;
    const v1 = (
      await client.post(`/api/v1/resumes/${resume.id}/versions`).send({ name: 'General' })
    ).body.version;
    const draft = structuredClone(resume.draft);
    // Kubernetes appears in skills, experience and the CKAD certification; hide all of them.
    draft.layout.hiddenSections = ['skills', 'experience', 'projects', 'certifications'];
    await client.put(`/api/v1/resumes/${resume.id}/draft`).set('if-match', '1').send(draft);

    const vsDraft = (
      await client.post(`/api/v1/jobs/${job.id}/match-resume`).send({ resumeId: resume.id })
    ).body;
    const vsVersion = (
      await client
        .post(`/api/v1/jobs/${job.id}/match-resume`)
        .send({ resumeId: resume.id, versionId: v1.id })
    ).body;
    const status = (body, term) => body.report.results.find((r) => r.term.term === term).status;
    expect(vsDraft.source.label).toBe('Current draft');
    expect(status(vsDraft, 'Kubernetes')).toBe('in-profile');
    expect(
      vsDraft.report.results.find((r) => r.term.term === 'Kubernetes').suggestions[0].type,
    ).toBe('showSection');
    expect(vsVersion.source.label).toBe('v1: General');
    expect(status(vsVersion, 'Kubernetes')).toBe('in-resume');
  });

  it('rejects oversized and empty descriptions and bad term lists', async () => {
    const { client } = await setup();
    const big = await client
      .post('/api/v1/jobs/analyze')
      .send({ descriptionText: 'x'.repeat(20_001) });
    expect(big.status).toBe(400);
    expect(big.body.error.details.fields[0].message).toMatch(/at most 20,000 characters/);
    expect(
      (await client.post('/api/v1/jobs').send({ title: 'X', descriptionText: 'short' })).status,
    ).toBe(400);
    const job = (await client.post('/api/v1/jobs').send({ title: 'X', descriptionText: JD })).body
      .job;
    const dup = await client.patch(`/api/v1/jobs/${job.id}`).send({
      terms: [
        { id: 'go', term: 'Go' },
        { id: 'go', term: 'Go' },
      ],
    });
    expect(dup.status).toBe(400);
    expect(
      (
        await client
          .patch(`/api/v1/jobs/${job.id}`)
          .send({ terms: [{ id: 'x', term: 'x', $where: '1' }] })
      ).status,
    ).toBe(400);
  });

  it('links a resume to a job only if the job is yours, and unlinks on delete', async () => {
    const owner = await setup();
    const job = (
      await owner.client.post('/api/v1/jobs').send({ title: 'Platform', descriptionText: JD })
    ).body.job;
    const linked = await owner.client
      .patch(`/api/v1/resumes/${owner.resume.id}`)
      .send({ jobId: job.id });
    expect(linked.body.resume.jobId).toBe(job.id);
    const other = await setup();
    expect(
      (await other.client.patch(`/api/v1/resumes/${other.resume.id}`).send({ jobId: job.id }))
        .status,
    ).toBe(400);
    await owner.client.delete(`/api/v1/jobs/${job.id}`);
    expect(
      (await owner.client.get(`/api/v1/resumes/${owner.resume.id}`)).body.resume.jobId,
    ).toBeNull();
  });

  it('is private, exported and deleted with the account', async () => {
    const owner = await setup();
    const job = (
      await owner.client.post('/api/v1/jobs').send({ title: 'Platform', descriptionText: JD })
    ).body.job;
    const other = await setup();
    expect((await other.client.get(`/api/v1/jobs/${job.id}`)).status).toBe(404);
    expect((await other.client.patch(`/api/v1/jobs/${job.id}`).send({ title: 'x' })).status).toBe(
      404,
    );
    expect(
      (
        await other.client
          .post(`/api/v1/jobs/${job.id}/match-resume`)
          .send({ resumeId: other.resume.id })
      ).status,
    ).toBe(404);
    expect(
      (
        await other.client
          .post(`/api/v1/jobs/${job.id}/match-resume`)
          .send({ resumeId: owner.resume.id })
      ).status,
    ).toBe(404);
    expect(
      (
        await other.client
          .post('/api/v1/jobs/analyze')
          .send({ descriptionText: JD, resumeId: owner.resume.id })
      ).status,
    ).toBe(404);
    expect((await other.client.get('/api/v1/jobs')).body.total).toBe(0);

    const exported = (await owner.client.get('/api/v1/account/export')).body;
    expect(exported.jobDescriptions[0].descriptionText).toBe(JD);
    const del = await owner.client
      .delete('/api/v1/account')
      .send({ password: owner.credentials.password, confirmation: 'DELETE' });
    expect(del.body.deleted.jobDescriptions).toBe(1);
  });
});
