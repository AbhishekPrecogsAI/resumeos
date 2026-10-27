import { createRequire } from 'node:module';
import { loadEnv } from './config/env.js';
import { connectDatabase, disconnectDatabase, isDatabaseReady } from './config/database.js';
import { createApp } from './app.js';
import { createLogger } from './utils/logger.js';

const { version } = createRequire(import.meta.url)('../package.json');
const logger = createLogger({ level: process.env.LOG_LEVEL ?? 'info' });

let env;
try {
  env = loadEnv();
} catch (err) {
  logger.error(err.message);
  process.exit(1);
}

const app = createApp({ env, logger, isDbReady: isDatabaseReady, version });
const server = app.listen(env.PORT, () => logger.info('server listening', { port: env.PORT }));

// Start serving immediately so /health/live works; /health/ready reports the DB state.
connectDatabase(env.MONGODB_URI, logger).catch((err) => {
  logger.error('mongodb initial connection failed', { message: err.message });
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('shutting down', { signal });
  const force = setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    await disconnectDatabase().catch(() => {});
    clearTimeout(force);
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
