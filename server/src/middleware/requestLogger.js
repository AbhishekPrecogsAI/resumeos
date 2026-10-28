// Logs method, path (no query string), status and latency only — never bodies.
export function requestLogger(logger) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      logger.info('request', {
        requestId: req.id,
        method: req.method,
        // originalUrl keeps the mount prefix; the query string is dropped (it may hold identifiers).
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
      });
    });
    next();
  };
}
