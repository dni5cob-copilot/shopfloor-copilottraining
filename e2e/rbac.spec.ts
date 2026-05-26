import { test, expect } from '@playwright/test';
import { resetApp, loginAsViewer, firstWorkOrderId } from './helpers/auth';

test.describe('TC-RB: RBAC — read-only role', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await resetApp(page);
    await loginAsViewer(page);
  });

  test('TC-RB01: no add buttons visible on any tab for viewer', async ({ page }) => {
    await expect(page.getByRole('button', { name: '+ New' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '+ Allocate' })).toHaveCount(0);
  });

  test('TC-RB02: no Edit Delete or Deallocate buttons on any tab for viewer', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Deallocate' })).toHaveCount(0);
  });

  test('TC-RB03: calling delWO directly from console shows read-only toast and does not delete', async ({ page }) => {
    const id = await firstWorkOrderId(page);
    const countBefore = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('sf_work_orders') || '[]')
        .filter((r: { deleted_at: string | null }) => !r.deleted_at).length
    );

    await page.evaluate((woId: string) => {
      (window as unknown as Record<string, (id: string) => void>).delWO(woId);
    }, id);

    await expect(page.getByText('Read-only access — no changes allowed')).toBeVisible();

    const countAfter = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('sf_work_orders') || '[]')
        .filter((r: { deleted_at: string | null }) => !r.deleted_at).length
    );
    expect(countAfter).toBe(countBefore);
  });
});
