// Vercel entry point: the whole API as one serverless function. vercel.json routes /api/* and
// /health/* here; the web app itself is static files served by Vercel's CDN.
// No export sweep here: on Vercel export files live in MongoDB, which deletes them when they
// expire (TTL index), and downloads check expiry themselves.
import { createRequire } from 'node:module';
import { loadEnv } from '../server/src/config/env.js';
import { connectDatabase, isDatabaseReady } from '../server/src/config/database.js';
import { createApp } from '../server/src/app.js';
import { createLogger } from '../server/src/utils/logger.js';

const { version } = createRequire(import.meta.url)('../server/package.json');
const logger = createLogger({ level: process.env.LOG_LEVEL ?? 'info' });

let app;
let startupError;
try {
  app = createApp({ env: loadEnv(), logger, isDbReady: isDatabaseReady, version });
} catch (err) {
  // Reported on every request (without details) instead of crashing the function silently.
  startupError = err;
  logger.error(err.message);
}

// One connection per warm instance, shared by every request it serves.
let connecting;
function ensureDatabase() {
  if (isDatabaseReady()) return Promise.resolve();
  connecting ??= connectDatabase(process.env.MONGODB_URI, logger).catch((err) => {
    connecting = undefined;
    throw err;
  });
  return connecting;
}

export default async function handler(req, res) {
  if (startupError) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: { code: 'MISCONFIGURED', message: 'The server is misconfigured. Check its logs.' },
      }),
    );
    return;
  }
  // Liveness doesn't need the database; everything else waits for the connection.
  if (!req.url.startsWith('/health/live')) {
    try {
      await ensureDatabase();
    } catch {
      // Fall through: /health/ready reports 503 and API routes fail with their usual errors.
    }
  }
  return app(req, res);
}
