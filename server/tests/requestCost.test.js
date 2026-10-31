import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  buildApp,
  connectTestDb,
  dropTestDb,
  clearCollections,
  makeEnv,
  registerUser,
} from './helpers.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';

// On a serverless host every database operation is a network round trip, so the number per
// request is what decides how fast the app feels. These budgets keep it from creeping up.
const app = buildApp({ env: makeEnv({ RATE_LIMIT_STORE: 'mongo', RATE_LIMIT_DISABLED: '' }) });

beforeAll(connectTestDb);
afterAll(async () => {
  mongoose.set('debug', false);
  await dropTestDb();
});
beforeEach(clearCollections);

async function countOps(fn) {
  const ops = [];
  mongoose.set('debug', (collection, method) => ops.push(`${collection}.${method}`));
  try {
    const res = await fn();
    return { res, ops };
  } finally {
    mongoose.set('debug', false);
  }
}

describe('database round trips per request', () => {
  it('resolves a signed-in session in one query, with no password hash', async () => {
    const { client } = await registerUser(app);
    const { res, ops } = await countOps(() => client.get('/api/v1/auth/me'));
    expect(res.status).toBe(200);
    expect(ops).toEqual(['sessions.aggregate']);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);
  });

  it('keeps everyday reads to two round trips: the session and the data', async () => {
    const { client } = await registerUser(app);
    await client.put('/api/v1/profile').set('if-match', '0').send({ content: sampleResume });
    const resume = (await client.post('/api/v1/resumes').send({ title: 'R' })).body.resume;
    for (const path of ['/api/v1/profile', '/api/v1/resumes', `/api/v1/resumes/${resume.id}`]) {
      const { res, ops } = await countOps(() => client.get(path));
      expect([path, res.status]).toEqual([path, 200]);
      expect([path, ops.length <= 3, ops]).toEqual([path, true, ops]);
      expect(ops[0]).toBe('sessions.aggregate');
    }
  });

  it('a revoked session stops working at once', async () => {
    const { client } = await registerUser(app);
    await client.post('/api/v1/auth/logout').send({});
    expect((await client.get('/api/v1/auth/me')).status).toBe(401);
  });
});
