import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  buildApp,
  connectTestDb,
  dropTestDb,
  clearCollections,
  agent,
  registerUser,
} from './helpers.js';
import { User } from '../src/modules/users/user.model.js';
import { Session } from '../src/modules/auth/session.model.js';

const app = buildApp();

beforeAll(connectTestDb);
afterAll(dropTestDb);
beforeEach(clearCollections);

describe('account', () => {
  it('updates display name and preferences', async () => {
    const { client } = await registerUser(app);
    const res = await client
      .patch('/api/v1/account')
      .send({ displayName: 'Mira O.', preferences: { theme: 'dark', pageSize: 'Letter' } });
    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe('Mira O.');
    expect(res.body.user.preferences).toMatchObject({ theme: 'dark', pageSize: 'Letter' });
  });

  it('rejects attempts to change protected fields', async () => {
    const { client } = await registerUser(app);
    expect((await client.patch('/api/v1/account').send({ email: 'new@example.com' })).status).toBe(
      400,
    );
    expect(
      (await client.patch('/api/v1/account').send({ preferences: { theme: 'neon' } })).status,
    ).toBe(400);
    expect((await client.patch('/api/v1/account').send({})).status).toBe(400);
  });

  it('exports account data without secrets', async () => {
    const { client, credentials } = await registerUser(app);
    const res = await client.get('/api/v1/account/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="resumeos-export-/);
    expect(res.body.account.email).toBe(credentials.email);
    expect(res.body.sessions).toHaveLength(1);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|tokenHash|argon2/);
  });

  it('requires the password and typed confirmation to delete', async () => {
    const { client, credentials } = await registerUser(app);
    expect(
      (
        await client
          .delete('/api/v1/account')
          .send({ password: credentials.password, confirmation: 'delete' })
      ).status,
    ).toBe(400);
    const wrong = await client
      .delete('/api/v1/account')
      .send({ password: 'wrong password', confirmation: 'DELETE' });
    expect(wrong.status).toBe(400);
    expect(await User.countDocuments()).toBe(1);
  });

  it('deletes the user and every session, then rejects the old cookie', async () => {
    const { client, credentials } = await registerUser(app);
    await agent(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    const other = await registerUser(app);
    const res = await client
      .delete('/api/v1/account')
      .send({ password: credentials.password, confirmation: 'DELETE' });
    expect(res.status).toBe(200);
    expect(res.body.deleted).toEqual({ account: 1, sessions: 2 });
    expect(await User.countDocuments({ email: credentials.email })).toBe(0);
    expect((await client.get('/api/v1/auth/me')).status).toBe(401);
    // Other users are untouched.
    expect((await other.client.get('/api/v1/auth/me')).status).toBe(200);
    expect(await Session.countDocuments()).toBe(1);
  });

  it('requires authentication', async () => {
    expect((await agent(app).get('/api/v1/account')).status).toBe(401);
    expect((await agent(app).get('/api/v1/account/export')).status).toBe(401);
  });
});
