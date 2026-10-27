import { test, expect } from '@playwright/test';
import { expectNoAxeViolations } from './helpers.js';

// Audit the template document itself, the same HTML the preview iframe and PDF export use.
test('Clarity template document is accessible and has no scripts', async ({ page }) => {
  await page.goto('/templates');
  const html = await page
    .locator('iframe[title*="Clarity template preview"]')
    .getAttribute('srcdoc');
  expect(html).not.toMatch(/<script/i);
  await page.setContent(html);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mira Okafor-Lindqvist');
  const headings = await page.getByRole('heading', { level: 2 }).allTextContents();
  expect(headings).toEqual([
    'Summary',
    'Experience',
    'Projects',
    'Skills',
    'Education',
    'Certifications',
  ]);
  await expectNoAxeViolations(page);
});
