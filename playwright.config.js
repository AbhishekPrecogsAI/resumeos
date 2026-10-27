import { defineConfig, devices } from '@playwright/test';

// E2E runs isolated servers on their own ports and database, separate from `npm run dev`.
const API_PORT = 5100;
const CLIENT_PORT = 5174;

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: [
    {
      command: 'node src/server.js',
      cwd: 'server',
      url: `http://localhost:${API_PORT}/health/ready`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        MONGODB_URI: process.env.E2E_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/resumeos_e2e',
        CLIENT_ORIGIN: `http://localhost:${CLIENT_PORT}`,
        APP_BASE_URL: `http://localhost:${CLIENT_PORT}`,
        SESSION_SECRET: 'e2e-only-secret-not-for-production-use-0123456789',
        LOG_LEVEL: 'warn',
        RATE_LIMIT_DISABLED: 'true',
      },
    },
    {
      command: `npx vite --port ${CLIENT_PORT} --strictPort`,
      cwd: 'client',
      url: `http://localhost:${CLIENT_PORT}`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
