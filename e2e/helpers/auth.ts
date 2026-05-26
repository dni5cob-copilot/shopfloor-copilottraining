import { Page } from '@playwright/test';

/** Removes all sf_* keys from localStorage and reloads to a fresh seeded state */
export async function resetApp(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('sf_'))
      .forEach(k => localStorage.removeItem(k));
  });
  await page.reload();
}

/** Submits the login form with the given username and password */
export async function login(page: Page, username: string, password: string): Promise<void> {
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Logs in as manager (admin / admin123) */
export async function loginAsManager(page: Page): Promise<void> {
  await login(page, 'admin', 'admin123');
}

/** Logs in as read-only viewer (viewer / viewer123) */
export async function loginAsViewer(page: Page): Promise<void> {
  await login(page, 'viewer', 'viewer123');
}

/** Clicks a tab by its visible label */
export async function goToTab(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name, exact: true }).click();
}

/** Returns the first seeded work order id from localStorage */
export async function firstWorkOrderId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const rows = JSON.parse(localStorage.getItem('sf_work_orders') || '[]');
    return rows.find((r: { deleted_at: string | null }) => !r.deleted_at)?.id ?? '';
  });
}
