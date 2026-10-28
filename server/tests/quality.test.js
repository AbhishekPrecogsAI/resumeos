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
  return { ...u, resume, base: `/api/v1/resumes/${resume.id}` };
}

describe('quality API', () => {
  it('runs every rule on the saved draft and reports counts without a score', async () => {
    const { client, base } = await setup();
    const res = await client.post(`${base}/quality-check`).send({});
    expect(res.status).toBe(200);
    const { report } = res.body;
    expect(report.rulesRun.length).toBeGreaterThan(10);
    expect(report.counts.total).toBe(report.findings.length);
    // The sample's metric bullets have no evidence attached.
    expect(report.findings.some((f) => f.ruleId === 'CLAIM_WITHOUT_LINKED_EVIDENCE')).toBe(true);
    expect(JSON.stringify(report)).not.toMatch(/"score"/i);
  });

  it('dismisses and restores findings with an optional reason', async () => {
    const { client, base } = await setup();
    const [first] = (await client.post(`${base}/quality-check`).send({})).body.report.findings;
    const dismissed = await client
      .post(`${base}/quality-dismissals`)
      .send({ key: first.key, reason: 'Figure is public' });
    expect(dismissed.status).toBe(201);
    expect(dismissed.body.items).toEqual([
      expect.objectContaining({ key: first.key, ruleId: first.ruleId, reason: 'Figure is public' }),
    ]);
    const after = (await client.post(`${base}/quality-check`).send({})).body.report;
    expect(after.findings.find((f) => f.key === first.key)).toBeUndefined();
    expect(after.dismissed.find((f) => f.key === first.key).dismissal.reason).toBe(
      'Figure is public',
    );
    expect((await client.get(base)).body.resume.qualityDismissals).toHaveLength(1);
    const restored = await client.delete(
      `${base}/quality-dismissals/${encodeURIComponent(first.key)}`,
    );
    expect(restored.body.items).toEqual([]);
  });

  it('dismissing twice keeps one entry', async () => {
    const { client, base } = await setup();
    const [first] = (await client.post(`${base}/quality-check`).send({})).body.report.findings;
    await client.post(`${base}/quality-dismissals`).send({ key: first.key });
    const again = await client
      .post(`${base}/quality-dismissals`)
      .send({ key: first.key, reason: 'updated' });
    expect(again.body.items).toHaveLength(1);
    expect(again.body.items[0].reason).toBe('updated');
  });

  it('validates keys and rejects unknown rules', async () => {
    const { client, base } = await setup();
    expect((await client.post(`${base}/quality-dismissals`).send({ key: 'nonsense' })).status).toBe(
      400,
    );
    expect(
      (
        await client
          .post(`${base}/quality-dismissals`)
          .send({ key: 'MADE_UP_RULE:0123456789abcdef' })
      ).status,
    ).toBe(400);
    expect(
      (await client.post(`${base}/quality-dismissals`).send({ key: { $ne: null } })).status,
    ).toBe(400);
  });

  it('is private to the owner', async () => {
    const owner = await setup();
    const { client: other } = await registerUser(app);
    expect((await other.post(`${owner.base}/quality-check`).send({})).status).toBe(404);
    expect((await other.get(`${owner.base}/quality-dismissals`)).status).toBe(404);
    expect(
      (
        await other
          .post(`${owner.base}/quality-dismissals`)
          .send({ key: 'DUPLICATE_BULLET:0123456789abcdef' })
      ).status,
    ).toBe(404);
  });
});
