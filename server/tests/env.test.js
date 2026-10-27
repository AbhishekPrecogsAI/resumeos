import { describe, it, expect } from 'vitest';
import { loadEnv } from '../src/config/env.js';

const base = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/resumeos',
  CLIENT_ORIGIN: 'http://localhost:5173',
  SESSION_SECRET: 'x'.repeat(40),
  APP_BASE_URL: 'http://localhost:5173',
};

describe('loadEnv', () => {
  it('applies defaults and parses origins', () => {
    const env = loadEnv({ ...base, CLIENT_ORIGIN: 'http://a.test, http://b.test' });
    expect(env.PORT).toBe(5000);
    expect(env.CLIENT_ORIGIN).toEqual(['http://a.test', 'http://b.test']);
  });

  it('rejects a missing MongoDB URI', () => {
    expect(() => loadEnv({ ...base, MONGODB_URI: undefined })).toThrow(/MONGODB_URI/);
  });

  it('rejects a short session secret', () => {
    expect(() => loadEnv({ ...base, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
  });

  it('rejects the placeholder secret in production', () => {
    expect(() =>
      loadEnv({
        ...base,
        NODE_ENV: 'production',
        SESSION_SECRET: 'replace-with-a-long-random-secret',
      }),
    ).toThrow(/placeholder/);
  });
});
