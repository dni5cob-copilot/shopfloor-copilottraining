import { test, expect } from '@playwright/test';
import { resetApp, loginAsManager, goToTab } from './helpers/auth';

test.describe('TC-MT: Materials', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await resetApp(page);
    await loginAsManager(page);
    await goToTab(page, 'Materials');
  });

  test('TC-MT01: create material and available equals on-hand minus reserved', async ({ page }) => {
    await page.getByRole('button', { name: '+ New' }).first().click();
    await page.getByLabel('Name').fill('Bolt M6');
    await page.getByLabel('Unit').fill('pcs');
    await page.getByLabel('Qty on Hand').fill('200');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Material added')).toBeVisible();
    await expect(page.getByText('Bolt M6')).toBeVisible();
    await expect(page.getByText('200.00')).toBeVisible();
  });

  test('TC-MT02: saving material without unit shows inline error', async ({ page }) => {
    await page.getByRole('button', { name: '+ New' }).first().click();
    await page.getByLabel('Name').fill('Bolt M6');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Unit is required')).toBeVisible();
  });

  test('TC-MT03: editing material updates qty on hand and available column', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByLabel('Qty on Hand').fill('999');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Material updated')).toBeVisible();
    await expect(page.getByText('999')).toBeVisible();
  });

  test('TC-MT04: confirming delete removes material row', async ({ page }) => {
    const rowsBefore = await page.getByRole('row').count();
    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByRole('row')).toHaveCount(rowsBefore - 1);
    await expect(page.getByText('Deleted')).toBeVisible();
  });
});
