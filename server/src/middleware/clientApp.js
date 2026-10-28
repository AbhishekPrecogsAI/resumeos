import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import express from 'express';

/** SHA-256 hashes of inline <script> blocks, for the CSP script-src allowlist. */
export function inlineScriptHashes(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`,
  );
}

export function contentSecurityPolicy(scriptHashes = []) {
  return {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", ...scriptHashes],
      // React style attributes and the resume template's own <style> (inside the preview iframe).
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", 'blob:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  };
}

/**
 * Serve the built client (client/dist) with long-lived caching for hashed assets and no caching
 * for index.html, plus a single-page-app fallback for client routes.
 */
export function clientApp(distDir) {
  const dir = resolve(distDir);
  const indexPath = join(dir, 'index.html');
  if (!existsSync(indexPath))
    throw new Error(`CLIENT_DIST_DIR has no index.html: ${dir}. Run "npm run build" first.`);
  const indexHtml = readFileSync(indexPath, 'utf8');

  const router = express.Router();
  router.use(
    '/assets',
    express.static(join(dir, 'assets'), {
      immutable: true,
      maxAge: '1y',
      index: false,
      fallthrough: false,
    }),
  );
  router.use(express.static(dir, { index: false, maxAge: '1h' }));
  router.get(/^\/(?!api\/|health\/).*/, (req, res) => {
    res.set('cache-control', 'no-cache');
    // Shared resume pages are personal; keep them out of search engines.
    if (req.path.startsWith('/r/')) res.set('x-robots-tag', 'noindex, nofollow');
    res.type('html').send(indexHtml);
  });
  return { router, scriptHashes: inlineScriptHashes(indexHtml) };
}
