import { test, expect } from '@playwright/test';
import { resetApp, login, loginAsManager, loginAsViewer } from './helpers/auth';

test.describe('TC-A: Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await resetApp(page);
  });

  test('TC-A01: valid manager credentials show dashboard with manager badge', async ({ page }) => {
    await loginAsManager(page);
    await expect(page.getByText('manager')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Work Orders', exact: true })).toBeVisible();
  });

  test('TC-A02: valid supervisor credentials show dashboard with supervisor badge', async ({ page }) => {
    await login(page, 'supervisor', 'super123');
    await expect(page.getByText('supervisor')).toBeVisible();
  });

  test('TC-A03: read-only login hides all add and action buttons', async ({ page }) => {
    await loginAsViewer(page);
    await expect(page.getByRole('button', { name: '+ New' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '+ Allocate' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  });

  test('TC-A04: invalid password shows inline error message', async ({ page }) => {
    await login(page, 'admin', 'wrongpassword');
    await expect(page.getByText('Invalid username or password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('TC-A06: sign out returns to login page and clears session', async ({ page }) => {
    await loginAsManager(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    const role = await page.evaluate(() => localStorage.getItem('sf_role'));
    expect(role).toBeNull();
  });

  test('TC-A07: session is restored automatically after page reload', async ({ page }) => {
    await loginAsManager(page);
    await page.reload();
    await expect(page.getByText('manager')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).not.toBeVisible();
  });
});
