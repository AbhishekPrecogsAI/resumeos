import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimits } from './middleware/rateLimit.js';
import { csrfProtection } from './middleware/csrf.js';
import { loadSession } from './middleware/authenticate.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { metaRouter } from './modules/meta.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { accountRouter } from './modules/account/account.routes.js';
import { createSessionService } from './modules/auth/session.service.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createUserDataRegistry } from './services/userData.js';
import { registerUserData } from './modules/users/user.data.js';

export function createApp({ env, logger, isDbReady, version = '0.0.0' }) {
  const app = express();
  const limits = rateLimits(env);
  const sessions = createSessionService(env);
  const auth = createAuthService({ sessions });
  const userData = createUserDataRegistry();
  registerUserData(userData);

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

  app.use('/health', healthRouter({ isDbReady }));

  const api = express.Router();
  api.use(limits.api);
  api.use(csrfProtection([...env.CLIENT_ORIGIN, new URL(env.APP_BASE_URL).origin]));
  api.use(express.json({ limit: '256kb' }));
  api.use((req, res, next) => {
    res.set('cache-control', 'no-store');
    next();
  });
  api.use(loadSession(sessions));
  api.use('/meta', metaRouter({ version }));
  api.use('/auth', authRouter({ auth, sessions, limits }));
  api.use('/account', accountRouter({ auth, sessions, userData, limits, logger }));
  app.use('/api/v1', api);

  app.use(notFoundHandler());
  app.use(errorHandler(logger, { exposeDetails: env.NODE_ENV === 'development' }));

  return app;
}
