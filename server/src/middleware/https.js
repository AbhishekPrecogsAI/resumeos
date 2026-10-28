/**
 * Production only: require HTTPS (as seen by the TLS-terminating proxy, via `trust proxy`).
 * GET/HEAD redirect; other methods are refused so credentials never travel in clear text twice.
 * Health checks are exempt so internal load-balancer probes over HTTP keep working.
 */
export function requireHttps() {
  return (req, res, next) => {
    if (req.secure || req.path.startsWith('/health/')) return next();
    if (req.method === 'GET' || req.method === 'HEAD') {
      return res.redirect(308, `https://${req.get('host')}${req.originalUrl}`);
    }
    res
      .status(403)
      .json({ error: { code: 'HTTPS_REQUIRED', message: 'Use HTTPS.', requestId: req.id } });
  };
}
