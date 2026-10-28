import { Router } from 'express';

export function metaRouter({ version }) {
  const router = Router();
  // Lists only features that actually exist. Extend as phases land.
  router.get('/', (req, res) => {
    res.json({
      name: 'ResumeOS API',
      version,
      apiVersion: 'v1',
      features: [
        'auth',
        'account',
        'profile',
        'resumes',
        'export:pdf',
        'versions',
        'quality',
        'jobs',
      ],
    });
  });
  return router;
}
