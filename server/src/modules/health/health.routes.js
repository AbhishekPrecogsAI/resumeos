import { Router } from 'express';

export function healthRouter({ isDbReady }) {
  const router = Router();

  router.get('/live', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/ready', (req, res) => {
    const database = isDbReady() ? 'up' : 'down';
    const ready = database === 'up';
    res
      .status(ready ? 200 : 503)
      .json({ status: ready ? 'ok' : 'unavailable', checks: { database } });
  });

  return router;
}
