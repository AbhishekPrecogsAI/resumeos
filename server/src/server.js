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

// Delete expired export files every 10 minutes; records stay as export history.
const sweeper = setInterval(() => {
  app.locals.exportsService
    .sweepExpired()
    .catch((err) => logger.error('export sweep failed', { message: err.message }));
}, 10 * 60_000);
sweeper.unref();

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
  clearInterval(sweeper);
  server.close(async () => {
    await app.locals.pdfPool.close();
    await disconnectDatabase().catch(() => {});
    clearTimeout(force);
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
