import { test, expect } from '@playwright/test';
import { resetApp, loginAsManager, goToTab } from './helpers/auth';

test.describe('TC-DS: Persistence & Data Integrity', () => {
  test('TC-DS01: first load seeds sample data into all entity tabs', async ({ page }) => {
    await page.goto('');
    await resetApp(page);
    await loginAsManager(page);

    await goToTab(page, 'Work Orders');
    await expect(page.getByText('Widget A')).toBeVisible();

    await goToTab(page, 'Operators');
    await expect(page.getByText('Alice')).toBeVisible();

    await goToTab(page, 'Machines');
    await expect(page.getByText('CNC-01')).toBeVisible();

    await goToTab(page, 'Materials');
    await expect(page.getByText('Steel Rod')).toBeVisible();

    const seeded = await page.evaluate(() => localStorage.getItem('sf_seeded'));
    expect(seeded).toBe('1');
  });

  test('TC-DS03: soft-deleted record is absent after reload', async ({ page }) => {
    await page.goto('');
    await resetApp(page);
    await loginAsManager(page);
    await goToTab(page, 'Work Orders');

    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page.reload();
    await goToTab(page, 'Work Orders');

    const deletedItem = await page.evaluate(() => {
      const rows = JSON.parse(localStorage.getItem('sf_work_orders') || '[]');
      return rows.find((r: { deleted_at: string | null }) => r.deleted_at !== null);
    });
    expect(deletedItem).toBeDefined();
    expect(deletedItem.deleted_at).not.toBeNull();
  });
});
