import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import '../src/config/database.js';

export const ORIGIN = 'http://localhost:5173';
const BASE_URI = process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27017';

export function makeEnv(overrides = {}) {
  return loadEnv({
    NODE_ENV: 'test',
    MONGODB_URI: `${BASE_URI}/resumeos_test`,
    CLIENT_ORIGIN: ORIGIN,
    SESSION_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    APP_BASE_URL: ORIGIN,
    RATE_LIMIT_DISABLED: 'true',
    ...overrides,
  });
}

export const testEnv = makeEnv();
export const silentLogger = { debug() {}, info() {}, warn() {}, error() {} };

export function buildApp({ isDbReady = () => true, env = testEnv } = {}) {
  return createApp({ env, logger: silentLogger, isDbReady });
}

/** Connect to a fresh, uniquely named database for this test file. */
export async function connectTestDb() {
  const name = `resumeos_test_${randomBytes(4).toString('hex')}`;
  await mongoose.connect(`${BASE_URI}/${name}`, { serverSelectionTimeoutMS: 3000 });
  await mongoose.connection.syncIndexes();
  return name;
}

export async function dropTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

export async function clearCollections() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

/** An agent that keeps cookies and sends the trusted Origin, like the browser client. */
export function agent(app) {
  const a = request.agent(app);
  const wrap = (method) => (url) => a[method](url).set('origin', ORIGIN);
  return {
    get: wrap('get'),
    post: wrap('post'),
    patch: wrap('patch'),
    put: wrap('put'),
    delete: wrap('delete'),
    raw: a,
  };
}

let counter = 0;
export async function registerUser(app, overrides = {}) {
  const client = agent(app);
  counter += 1;
  const body = {
    email: `user${counter}_${randomBytes(3).toString('hex')}@example.com`,
    password: 'correct horse battery',
    displayName: 'Test User',
    ...overrides,
  };
  const res = await client.post('/api/v1/auth/register').send(body);
  if (res.status !== 201)
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { client, user: res.body.user, credentials: body, res };
}
