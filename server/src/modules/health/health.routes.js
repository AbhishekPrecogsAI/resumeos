import { Router } from 'express';
import mongoose from 'mongoose';

export function healthRouter({ isDbReady }) {
  const router = Router();

  router.get('/live', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/ready', async (req, res) => {
    const database = isDbReady() ? 'up' : 'down';
    const ready = database === 'up';
    // One database round trip, timed, so the distance to MongoDB is visible from outside:
    // `Server-Timing: db;dur=…` (a few ms when the app and the database share a region).
    if (ready) {
      const started = performance.now();
      try {
        await mongoose.connection.db.admin().ping();
        const region = process.env.VERCEL_REGION ? `;desc="${process.env.VERCEL_REGION}"` : '';
        res.set('server-timing', `db;dur=${(performance.now() - started).toFixed(1)}${region}`);
      } catch {
        // Readiness is the connection state; a failed ping just isn't timed.
      }
    }
    res
      .status(ready ? 200 : 503)
      .json({ status: ready ? 'ok' : 'unavailable', checks: { database } });
  });

  return router;
}
