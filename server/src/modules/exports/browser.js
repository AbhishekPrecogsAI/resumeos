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
 * Where to find Chrome and how to start it. On serverless hosts (Vercel) there's no system
 * Chrome; @sparticuz/chromium ships a build made for those environments and unpacks it to /tmp.
 */
async function launchOptions(chromePath, serverless) {
  if (serverless) {
    const { default: serverlessChromium } = await import('@sparticuz/chromium');
    return {
      executablePath: await serverlessChromium.executablePath(),
      // --single-process makes Chromium exit when its last page closes, and the pool closes a
      // page after every render, so every other render would find the browser gone.
      args: serverlessChromium.args.filter((arg) => arg !== '--single-process'),
    };
  }
  const executablePath = findChrome(chromePath);
  if (!executablePath)
    throw Object.assign(new Error('No Chrome or Chromium installation found.'), {
      code: 'NO_BROWSER',
    });
  return { executablePath, args: ['--disable-gpu', '--no-first-run', '--disable-extensions'] };
}

/**
 * One shared headless browser, launched on first use, with a small concurrency limit so a burst
 * of exports can't exhaust memory. Each render gets a fresh, isolated context.
 */
export function createBrowserPool({ chromePath, maxConcurrent = 2, logger, serverless = false }) {
  let browserPromise = null;
  let active = 0;
  const waiting = [];

  async function getBrowser() {
    if (!browserPromise) {
      browserPromise = launchOptions(chromePath, serverless)
        .then(({ executablePath, args }) =>
          chromium.launch({ executablePath, headless: true, args }),
        )
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

  async function render(fn) {
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
    }
  }

  return {
    async withPage(fn) {
      await acquire();
      try {
        try {
          return await render(fn);
        } catch (err) {
          // The browser can be gone by the time a render starts (crashed, or frozen and resumed
          // on a serverless host). Start a fresh one and try once more.
          if (!/has been closed|Target closed|disconnected/i.test(err?.message ?? '')) throw err;
          logger?.warn('pdf browser was closed; retrying with a new one');
          browserPromise = null;
          return await render(fn);
        }
      } finally {
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
