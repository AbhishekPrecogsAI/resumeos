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
