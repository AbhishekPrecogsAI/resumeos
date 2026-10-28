import { test, expect } from '@playwright/test';
import {
  VIEWPORTS,
  expectNoAxeViolations,
  expectNoHorizontalOverflow,
  register,
} from './helpers.js';

// Release-readiness sweep over every authenticated screen. Run with `npm run test:e2e`.
const PAGES = [
  '/app',
  '/app/profile',
  '/app/resumes',
  '/app/resumes/new',
  '/app/jobs',
  '/app/jobs/new',
  '/app/applications',
  '/app/settings/profile',
  '/app/settings/security',
  '/app/settings/privacy',
];

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`app screens have no axe violations or overflow at ${name} width`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await register(page);
    await page.goto('/app/resumes/new');
    await page.getByLabel(/Target role/).fill('Platform Engineer');
    await page.getByRole('button', { name: 'Create resume' }).click();
    await page.waitForURL('**/edit');
    const editor = new URL(page.url()).pathname;
    for (const path of [...PAGES, editor, editor.replace('/edit', '/versions')]) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { level: 1 }).or(page.getByLabel('Resume name')),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoAxeViolations(page);
    }
  });
}

test('reduced motion disables animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const duration = await page.evaluate(() => getComputedStyle(document.body).transitionDuration);
  expect(parseFloat(duration)).toBeLessThan(0.001);
});
