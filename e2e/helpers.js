import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 900 },
};

export async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scroll: doc.scrollWidth, client: doc.clientWidth };
  });
  expect(
    overflow.scroll,
    `page is ${overflow.scroll}px wide in a ${overflow.client}px viewport`,
  ).toBeLessThanOrEqual(overflow.client);
}

export async function expectNoAxeViolations(page, { exclude = [] } = {}) {
  // Legacy mode runs axe in-page without opening a helper page; resume preview iframes are
  // excluded here and audited directly as standalone documents (see template.spec.js).
  let builder = new AxeBuilder({ page })
    .setLegacyMode(true)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('iframe');
  for (const selector of exclude) builder = builder.exclude(selector);
  const { violations } = await builder.analyze();
  const summary = violations.map(
    (v) =>
      `${v.id}: ${v.help} (${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 3)
        .join(', ')})`,
  );
  expect(summary).toEqual([]);
}

let seq = 0;
export function uniqueEmail(prefix = 'e2e') {
  seq += 1;
  return `${prefix}.${Date.now()}.${seq}@example.com`;
}

export const PASSWORD = 'correct horse battery staple';

export async function register(
  page,
  { name = 'Mira Okafor', email = uniqueEmail(), password = PASSWORD } = {},
) {
  await page.goto('/register');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/app');
  return { name, email, password };
}

export async function signOut(page) {
  await page.getByRole('button', { name: /Account menu/ }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('**/login');
}
