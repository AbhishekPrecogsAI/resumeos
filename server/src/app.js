import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiRateLimit } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { metaRouter } from './modules/meta.routes.js';

export function createApp({ env, logger, isDbReady, version = '0.0.0' }) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);

  app.use(requestId());
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.CLIENT_ORIGIN.includes(origin)),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '256kb' }));

  app.use('/health', healthRouter({ isDbReady }));

  const api = express.Router();
  api.use(apiRateLimit());
  api.use('/meta', metaRouter({ version }));
  app.use('/api/v1', api);

  app.use(notFoundHandler());
  app.use(errorHandler(logger, { exposeDetails: env.NODE_ENV === 'development' }));

  return app;
}
