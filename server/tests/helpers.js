import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';

export const testEnv = loadEnv({
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/resumeos_test',
  CLIENT_ORIGIN: 'http://localhost:5173',
  SESSION_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  APP_BASE_URL: 'http://localhost:5173',
});

export const silentLogger = { debug() {}, info() {}, warn() {}, error() {} };

export function buildApp({ isDbReady = () => true } = {}) {
  return createApp({ env: testEnv, logger: silentLogger, isDbReady });
}
