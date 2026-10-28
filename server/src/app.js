import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestId } from './middleware/requestId.js';
import { requireHttps } from './middleware/https.js';
import { clientApp, contentSecurityPolicy } from './middleware/clientApp.js';
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
import { profileRouter } from './modules/profiles/profile.routes.js';
import { registerProfileData } from './modules/profiles/profile.data.js';
import { resumeRouter } from './modules/resumes/resume.routes.js';
import { registerResumeData } from './modules/resumes/resume.data.js';
import { resumeService } from './modules/resumes/resume.service.js';
import { exportRouters } from './modules/exports/export.routes.js';
import { createExportService } from './modules/exports/export.service.js';
import { registerExportData } from './modules/exports/export.data.js';
import { createBrowserPool } from './modules/exports/browser.js';
import { versionRouters } from './modules/versions/version.routes.js';
import { versionService } from './modules/versions/version.service.js';
import { registerVersionData } from './modules/versions/version.data.js';
import { qualityRouter } from './modules/quality/quality.routes.js';
import { photoRouter, registerPhotoData } from './modules/photos/photo.routes.js';
import { jobRouter } from './modules/jobs/job.routes.js';
import { registerJobData } from './modules/jobs/job.data.js';
import { applicationRouter } from './modules/applications/application.routes.js';
import { registerApplicationData } from './modules/applications/application.data.js';
import { applicationService } from './modules/applications/application.service.js';
import { shareRouter, sharedRouter, registerShareData } from './modules/shares/share.routes.js';
import { createShareService } from './modules/shares/share.service.js';

export function createApp({ env, logger, isDbReady, version = '0.0.0', pdfPool }) {
  const app = express();
  const limits = rateLimits(env);
  const sessions = createSessionService(env);
  const auth = createAuthService({ sessions });
  const userData = createUserDataRegistry();
  registerUserData(userData);
  registerProfileData(userData);
  registerPhotoData(userData);
  registerResumeData(userData);
  registerVersionData(userData);
  registerJobData(userData);
  registerApplicationData(userData);
  registerShareData(userData);
  const pool = pdfPool ?? createBrowserPool({ chromePath: env.CHROME_PATH, logger });
  const exportsService = createExportService({ env, pool, logger });
  registerExportData(userData, exportsService);
  const shares = createShareService({ env, pool, logger });
  resumeService.deleteHooks = [
    (userId, resumeId) => exportsService.removeForResume(userId, resumeId),
    (userId, resumeId) => versionService.removeForResume(userId, resumeId),
    (userId, resumeId) => applicationService.unlinkResume(userId, resumeId),
    (userId, resumeId) => shares.removeForResume(userId, resumeId),
  ];
  const { versions, compare } = versionRouters();
  const { resumeExport, exportsRouter } = exportRouters({ exportsService, limits });

  app.disable('x-powered-by');
  app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);

  app.use(requestId());
  app.use(requestLogger(logger));
  if (env.NODE_ENV === 'production') app.use(requireHttps());
  const client = env.CLIENT_DIST_DIR ? clientApp(env.CLIENT_DIST_DIR) : null;
  app.use(helmet({ contentSecurityPolicy: contentSecurityPolicy(client?.scriptHashes) }));
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
  // Large enough for a full profile or resume draft; content limits are enforced by schemas.
  api.use(express.json({ limit: '1mb' }));
  api.use((req, res, next) => {
    res.set('cache-control', 'no-store');
    next();
  });
  api.use(loadSession(sessions));
  // Every API router is mounted through here so tests can inventory routes (see routes.test.js).
  const routeManifest = [];
  const mount = (prefix, router) => {
    routeManifest.push({ prefix, router });
    api.use(prefix, router);
  };
  mount('/meta', metaRouter({ version }));
  mount('/auth', authRouter({ auth, sessions, limits }));
  mount('/account', accountRouter({ auth, sessions, userData, limits, logger }));
  mount('/profile/photo', photoRouter());
  mount('/profile', profileRouter());
  mount('/resumes/:resumeId/export', resumeExport);
  mount('/resumes/:resumeId/versions', versions);
  mount('/resumes/:resumeId/compare', compare);
  mount('/resumes/:resumeId/shares', shareRouter({ shares }));
  mount('/resumes/:resumeId', qualityRouter());
  mount('/jobs', jobRouter());
  mount('/applications', applicationRouter());
  mount('/resumes', resumeRouter());
  mount('/exports', exportsRouter);
  mount('/shared', sharedRouter({ shares, limits }));
  app.use('/api/v1', api);

  if (client) app.use(client.router);

  app.use(notFoundHandler());
  app.use(errorHandler(logger, { exposeDetails: env.NODE_ENV === 'development' }));

  app.locals.routeManifest = routeManifest;
  app.locals.pdfPool = pool;
  app.locals.exportsService = exportsService;
  return app;
}
