import { test, expect } from '@playwright/test';
import { resetApp, loginAsManager, goToTab } from './helpers/auth';

test.describe('TC-WO: Work Orders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await resetApp(page);
    await loginAsManager(page);
    await goToTab(page, 'Work Orders');
  });

  test('TC-WO01: create work order with valid product and quantity', async ({ page }) => {
    await page.getByRole('button', { name: '+ New' }).first().click();
    await page.getByLabel('Product').fill('Test Widget');
    await page.getByLabel('Quantity').fill('25');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Test Widget')).toBeVisible();
    await expect(page.getByText('Work order created')).toBeVisible();
  });

  test('TC-WO02: saving with blank product shows inline field error', async ({ page }) => {
    await page.getByRole('button', { name: '+ New' }).first().click();
    await page.getByLabel('Quantity').fill('10');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Product is required')).toBeVisible();
    await expect(page.getByText('Work order created')).not.toBeVisible();
  });

  test('TC-WO03: saving with quantity zero shows inline field error', async ({ page }) => {
    await page.getByRole('button', { name: '+ New' }).first().click();
    await page.getByLabel('Product').fill('Widget');
    await page.getByLabel('Quantity').fill('0');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Quantity must be ≥ 1')).toBeVisible();
  });

  test('TC-WO04: editing a work order updates its status in the table', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByLabel('Status').selectOption('complete');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Work order updated')).toBeVisible();
    await expect(page.getByText('complete').first()).toBeVisible();
  });

  test('TC-WO05: confirming delete removes the row from the table', async ({ page }) => {
    const rowsBefore = await page.getByRole('row').count();
    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByRole('row')).toHaveCount(rowsBefore - 1);
    await expect(page.getByText('Deleted')).toBeVisible();
  });

  test('TC-WO06: cancelling delete keeps the row in the table', async ({ page }) => {
    const rowsBefore = await page.getByRole('row').count();
    page.once('dialog', d => d.dismiss());
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByRole('row')).toHaveCount(rowsBefore);
  });

  test('TC-WO07: XSS in product name is escaped and not executed', async ({ page }) => {
    let alertFired = false;
    page.on('dialog', async dialog => { alertFired = true; await dialog.dismiss(); });
    await page.getByRole('button', { name: '+ New' }).first().click();
    await page.getByLabel('Product').fill('<img src=x onerror=alert(1)>');
    await page.getByLabel('Quantity').fill('1');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
    expect(alertFired).toBe(false);
  });

  test('TC-DS02: saved work order persists after page reload', async ({ page }) => {
    await page.getByRole('button', { name: '+ New' }).first().click();
    await page.getByLabel('Product').fill('Persisted Part');
    await page.getByLabel('Quantity').fill('5');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.reload();
    await goToTab(page, 'Work Orders');
    await expect(page.getByText('Persisted Part')).toBeVisible();
  });
});
