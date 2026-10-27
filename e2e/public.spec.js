import { test, expect } from '@playwright/test';
import { VIEWPORTS, expectNoHorizontalOverflow, expectNoAxeViolations } from './helpers.js';

const ROUTES = [
  '/',
  '/features',
  '/templates',
  '/pricing',
  '/security',
  '/privacy',
  '/terms',
  '/nope-404',
];

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`public site at ${name} width`, () => {
    test.use({ viewport });
    for (const route of ROUTES) {
      test(`${route} has a heading, no overflow, no axe violations`, async ({ page }) => {
        await page.goto(route);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoHorizontalOverflow(page);
        await expectNoAxeViolations(page);
      });
    }
  });
}

test('dark theme passes contrast checks on the landing page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Dark theme' }).first().click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expectNoAxeViolations(page);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('skip link is the first tab stop and moves focus to main', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('keyboard focus is visibly outlined', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  expect(outline).not.toBe('none');
});

test('mobile menu opens, navigates and closes', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Open menu' });
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await page.locator('#mobile-nav').getByRole('link', { name: 'Templates' }).click();
  await expect(page).toHaveURL(/\/templates$/);
  await expect(page.locator('#mobile-nav')).toHaveCount(0);
});

test('redline sample toggles change markers', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Mentored two interns')).toBeVisible();
  await page.getByRole('button', { name: 'Hide changes' }).click();
  await expect(page.getByText('Mentored two interns')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show changes' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('template preview renders sample text and switches page size', async ({ page }) => {
  await page.goto('/templates');
  const frame = page.frameLocator('iframe[title*="Clarity template preview"]');
  await expect(frame.getByRole('heading', { name: 'Mira Okafor-Lindqvist' })).toBeVisible();
  await page.getByText('US Letter').click();
  await expect(page.locator('iframe[title*="Letter"]')).toBeVisible();
});

test('pages make no third-party requests', async ({ page }) => {
  const external = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol.startsWith('http'))
      external.push(req.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});
