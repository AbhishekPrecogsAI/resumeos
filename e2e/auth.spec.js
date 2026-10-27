import { test, expect } from '@playwright/test';
import {
  VIEWPORTS,
  expectNoAxeViolations,
  expectNoHorizontalOverflow,
  register,
  signOut,
  uniqueEmail,
  PASSWORD,
} from './helpers.js';

test('register, sign out, reject wrong password, sign back in', async ({ page }) => {
  const account = await register(page);
  await expect(page.getByRole('heading', { name: 'Welcome, Mira' })).toBeVisible();

  await signOut(page);
  await page.goto('/app/settings/security');
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fsettings%2Fsecurity$/);

  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel(/^Password/).fill('not the password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();

  await page.getByLabel(/^Password/).fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/app\/settings\/security$/);
  await expect(page.getByText('This device')).toBeVisible();
});

test('registration works with the keyboard alone', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Your name').focus();
  await page.keyboard.type('Zoë Ångström');
  await page.keyboard.press('Tab');
  await page.keyboard.type(uniqueEmail('kbd'));
  await page.keyboard.press('Tab');
  await page.keyboard.type(PASSWORD);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Welcome, Zoë' })).toBeVisible();
});

test('duplicate email shows a field error', async ({ page }) => {
  const { email } = await register(page);
  await signOut(page);
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Someone');
  await page.getByLabel('Email').fill(email.toUpperCase());
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(/already exists/)).toBeVisible();
});

test('settings: rename, change password, manage sessions', async ({ page, browser }) => {
  const account = await register(page);

  // A second device signed in to the same account.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto('/login');
  await otherPage.getByLabel('Email').fill(account.email);
  await otherPage.getByLabel(/^Password/).fill(account.password);
  await otherPage.getByRole('button', { name: 'Sign in' }).click();
  await otherPage.waitForURL('**/app');

  await page.goto('/app/settings/profile');
  await page.getByLabel('Display name').fill('Mira O.');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByText('Name saved')).toBeVisible();
  await expect(page.getByRole('button', { name: /Account menu for Mira O\./ })).toBeVisible();

  await page.goto('/app/settings/security');
  await expect(page.getByRole('button', { name: /^Sign out Chrome/ })).toHaveCount(1);
  await page.getByLabel(/^Current password/).fill(account.password);
  await page.getByLabel(/^New password/).fill('an entirely new passphrase');
  await page.getByLabel(/^Confirm new password/).fill('an entirely new passphrase');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Password changed')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Sign out Chrome/ })).toHaveCount(0);

  // The other device is now signed out.
  await otherPage.goto('/app/settings/profile');
  await expect(otherPage).toHaveURL(/\/login/);
  await other.close();
});

test('delete account removes access', async ({ page }) => {
  const account = await register(page);
  await page.goto('/app/settings/privacy');

  // Dialog: Escape closes it and focus returns to the opener.
  const opener = page.getByRole('button', { name: 'Delete account…' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Delete your account?' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  await dialog.getByLabel(/^Password/).fill(account.password);
  await dialog.getByLabel('Type DELETE to confirm').fill('delete');
  await dialog.getByRole('button', { name: 'Delete account permanently' }).click();
  await expect(dialog.getByText('Type DELETE in capital letters to confirm.')).toBeVisible();

  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await dialog.getByRole('button', { name: 'Delete account permanently' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Account deleted')).toBeVisible();

  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel(/^Password/).fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
});

test('data export downloads JSON without secrets', async ({ page }) => {
  const account = await register(page);
  await page.goto('/app/settings/privacy');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download JSON export/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^resumeos-export-\d{4}-\d{2}-\d{2}\.json$/);
  const text = await (
    await download.createReadStream()
  )
    .toArray()
    .then((chunks) => Buffer.concat(chunks).toString());
  const data = JSON.parse(text);
  expect(data.account.email).toBe(account.email);
  expect(text).not.toMatch(/passwordHash|tokenHash|argon2/);
});

test('password reset page is honest about being unavailable', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot your password?' }).click();
  await expect(page.getByText("Password reset by email isn't available yet")).toBeVisible();
});

const PRIVATE_PAGES = [
  '/app',
  '/app/settings/profile',
  '/app/settings/security',
  '/app/settings/privacy',
];

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`auth and app pages are accessible at ${name} width`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const path of ['/login', '/register', '/forgot-password']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoAxeViolations(page);
    }
    await register(page);
    for (const path of PRIVATE_PAGES) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoAxeViolations(page);
    }
  });
}

test('app pages pass contrast checks in dark mode', async ({ page }) => {
  await register(page);
  await page.goto('/app/settings/profile');
  await page.getByLabel('Theme').selectOption('dark');
  await expect(page.getByText('Theme saved')).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/dark/);
  for (const path of PRIVATE_PAGES) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoAxeViolations(page);
  }
});

test('mobile navigation drawer opens and navigates', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await register(page);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.locator('#app-drawer').getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/app\/settings\/profile$/);
  await expect(page.locator('#app-drawer')).toHaveCount(0);
});
