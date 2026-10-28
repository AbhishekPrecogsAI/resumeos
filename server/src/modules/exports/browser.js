import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

export function findChrome(explicit) {
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`CHROME_PATH does not exist: ${explicit}`);
    return explicit;
  }
  return CANDIDATES.find((p) => existsSync(p)) ?? null;
}

/**
 * One shared headless browser, launched on first use, with a small concurrency limit so a burst
 * of exports can't exhaust memory. Each render gets a fresh, isolated context.
 */
export function createBrowserPool({ chromePath, maxConcurrent = 2, logger }) {
  let browserPromise = null;
  let active = 0;
  const waiting = [];

  async function getBrowser() {
    if (!browserPromise) {
      const executablePath = findChrome(chromePath);
      if (!executablePath)
        throw Object.assign(new Error('No Chrome or Chromium installation found.'), {
          code: 'NO_BROWSER',
        });
      browserPromise = chromium
        .launch({
          executablePath,
          headless: true,
          args: ['--disable-gpu', '--no-first-run', '--disable-extensions'],
        })
        .then((b) => {
          b.on('disconnected', () => {
            logger?.warn('pdf browser disconnected');
            browserPromise = null;
          });
          return b;
        });
      browserPromise.catch(() => {
        browserPromise = null;
      });
    }
    return browserPromise;
  }

  async function acquire() {
    if (active < maxConcurrent) {
      active += 1;
      return;
    }
    await new Promise((resolve) => waiting.push(resolve));
    active += 1;
  }

  function release() {
    active -= 1;
    waiting.shift()?.();
  }

  return {
    async withPage(fn) {
      await acquire();
      let context;
      try {
        const browser = await getBrowser();
        // Resume HTML contains no scripts; disable JS and block all network access anyway.
        context = await browser.newContext({ javaScriptEnabled: false, offline: true });
        const page = await context.newPage();
        await page.route('**/*', (route) =>
          route.request().url().startsWith('data:') ? route.continue() : route.abort(),
        );
        return await fn(page);
      } finally {
        await context?.close().catch(() => {});
        release();
      }
    },
    async close() {
      const b = await browserPromise?.catch(() => null);
      browserPromise = null;
      await b?.close().catch(() => {});
    },
  };
}
