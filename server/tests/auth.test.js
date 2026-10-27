import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import {
  buildApp,
  connectTestDb,
  dropTestDb,
  clearCollections,
  agent,
  registerUser,
  makeEnv,
  ORIGIN,
} from './helpers.js';
import { User } from '../src/modules/users/user.model.js';
import { Session } from '../src/modules/auth/session.model.js';

const app = buildApp();

beforeAll(connectTestDb);
afterAll(dropTestDb);
beforeEach(clearCollections);

describe('register', () => {
  it('creates a user, sets a secure session cookie and never returns the hash', async () => {
    const { res, user } = await registerUser(app, {
      email: '  Zoë.Ångström@Example.com ',
      displayName: 'Zoë Ångström',
    });
    expect(user.email).toBe('zoë.ångström@example.com');
    expect(user.displayName).toBe('Zoë Ångström');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^resumeos_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    const stored = await User.findOne({}).select('+passwordHash').lean();
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('stores only a hash of the session token', async () => {
    const { res } = await registerUser(app);
    const token = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
    const session = await Session.findOne({}).lean();
    expect(session.tokenHash).not.toBe(token);
    expect(JSON.stringify(session)).not.toContain(token);
  });

  it('rejects invalid input with field errors', async () => {
    const res = await agent(app)
      .post('/api/v1/auth/register')
      .send({ email: 'nope', password: 'short', displayName: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    const paths = res.body.error.details.fields.map((f) => f.path).sort();
    expect(paths).toEqual(['displayName', 'email', 'password']);
  });

  it('rejects unexpected fields', async () => {
    const res = await agent(app).post('/api/v1/auth/register').send({
      email: 'a@example.com',
      password: 'long enough pw',
      displayName: 'A',
      accountStatus: 'active',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email regardless of case', async () => {
    await registerUser(app, { email: 'dup@example.com' });
    const res = await agent(app)
      .post('/api/v1/auth/register')
      .send({ email: 'DUP@example.com', password: 'another long pw', displayName: 'B' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });
});

describe('login and logout', () => {
  it('logs in with correct credentials and reads /me', async () => {
    await registerUser(app, { email: 'login@example.com' });
    const client = agent(app);
    const res = await client
      .post('/api/v1/auth/login')
      .send({ email: 'Login@Example.com', password: 'correct horse battery' });
    expect(res.status).toBe(200);
    const me = await client.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('login@example.com');
  });

  it('returns the same generic error for wrong password and unknown email', async () => {
    await registerUser(app, { email: 'known@example.com' });
    const wrong = await agent(app)
      .post('/api/v1/auth/login')
      .send({ email: 'known@example.com', password: 'wrong password!' });
    const unknown = await agent(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong password!' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects NoSQL operator payloads', async () => {
    await registerUser(app, { email: 'victim@example.com' });
    const res = await agent(app)
      .post('/api/v1/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
  });

  it('logout revokes the session server-side', async () => {
    const { client, res } = await registerUser(app);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    expect((await client.post('/api/v1/auth/logout')).status).toBe(204);
    const replay = await request(app).get('/api/v1/auth/me').set('cookie', cookie);
    expect(replay.status).toBe(401);
    expect(await Session.countDocuments()).toBe(0);
  });

  it('/me without a session is 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('ignores a forged session cookie', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('cookie', 'resumeos_session=forged-token-value-that-is-long-enough');
    expect(res.status).toBe(401);
  });

  it('rejects an expired session', async () => {
    const { client } = await registerUser(app);
    await Session.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    expect((await client.get('/api/v1/auth/me')).status).toBe(401);
  });
});

describe('csrf protection', () => {
  it('rejects state-changing requests without a trusted origin', async () => {
    const body = { email: 'c@example.com', password: 'long enough pw', displayName: 'C' };
    const none = await request(app).post('/api/v1/auth/register').send(body);
    expect(none.status).toBe(403);
    expect(none.body.error.code).toBe('CSRF_REJECTED');
    const evil = await request(app)
      .post('/api/v1/auth/register')
      .set('origin', 'https://evil.example')
      .send(body);
    expect(evil.status).toBe(403);
    const ok = await request(app).post('/api/v1/auth/register').set('origin', ORIGIN).send(body);
    expect(ok.status).toBe(201);
  });
});

describe('sessions and password change', () => {
  it('change password revokes other sessions and keeps this one', async () => {
    const { client: first, credentials } = await registerUser(app);
    const second = agent(app);
    await second
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    const res = await first
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: credentials.password, newPassword: 'a brand new passphrase' });
    expect(res.status).toBe(200);
    expect((await first.get('/api/v1/auth/me')).status).toBe(200);
    expect((await second.get('/api/v1/auth/me')).status).toBe(401);
    const oldLogin = await agent(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    expect(oldLogin.status).toBe(401);
  });

  it('change password requires the current password', async () => {
    const { client } = await registerUser(app);
    const res = await client
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: 'not my password', newPassword: 'a brand new passphrase' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields[0].path).toBe('currentPassword');
  });

  it('lists sessions and revokes others', async () => {
    const { client, credentials } = await registerUser(app);
    await agent(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    const list = await client.get('/api/v1/auth/sessions');
    expect(list.body.items).toHaveLength(2);
    expect(list.body.items.filter((s) => s.current)).toHaveLength(1);
    const revoked = await client.post('/api/v1/auth/sessions/revoke-others');
    expect(revoked.body.revoked).toBe(1);
    expect((await client.get('/api/v1/auth/sessions')).body.items).toHaveLength(1);
  });

  it("cannot revoke another user's session", async () => {
    await registerUser(app);
    const victimSession = await Session.findOne({}).lean();
    const { client: attacker } = await registerUser(app);
    const res = await attacker.delete(`/api/v1/auth/sessions/${victimSession._id}`);
    expect(res.status).toBe(404);
    expect(await Session.findById(victimSession._id)).not.toBeNull();
  });

  it('rejects malformed ids', async () => {
    const { client } = await registerUser(app);
    expect((await client.delete('/api/v1/auth/sessions/not-an-id')).status).toBe(400);
  });
});

describe('password reset', () => {
  it('is explicitly unavailable', async () => {
    const res = await agent(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'a@example.com' });
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('PASSWORD_RESET_UNAVAILABLE');
  });
});

describe('rate limiting', () => {
  it('limits repeated login attempts', async () => {
    const limited = buildApp({ env: makeEnv({ RATE_LIMIT_DISABLED: 'false' }) });
    let last;
    for (let i = 0; i < 11; i += 1) {
      last = await request(limited)
        .post('/api/v1/auth/login')
        .set('origin', ORIGIN)
        .send({ email: 'x@example.com', password: 'whatever pw' });
    }
    expect(last.status).toBe(429);
    expect(last.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('database', () => {
  it('uses an isolated test database', () => {
    expect(mongoose.connection.name).toMatch(/^resumeos_test_/);
  });
});
