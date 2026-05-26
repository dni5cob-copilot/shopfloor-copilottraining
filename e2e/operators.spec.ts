import { test, expect } from '@playwright/test';
import { resetApp, loginAsManager, goToTab } from './helpers/auth';

test.describe('TC-OP: Operators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await resetApp(page);
    await loginAsManager(page);
    await goToTab(page, 'Operators');
  });

  test('TC-OP01: create operator with name, shift and skills', async ({ page }) => {
    await page.getByRole('button', { name: '+ New' }).first().click();
    await page.getByLabel('Name').fill('Diana');
    await page.getByLabel('Skills (comma-separated)').fill('cnc, welding');
    await page.getByLabel('Shift').selectOption('afternoon');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Diana')).toBeVisible();
    await expect(page.getByText('Operator added')).toBeVisible();
  });

  test('TC-OP02: saving with blank name shows inline field error', async ({ page }) => {
    await page.getByRole('button', { name: '+ New' }).first().click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Name is required')).toBeVisible();
  });

  test('TC-OP03: comma-separated skills are stored and displayed', async ({ page }) => {
    await page.getByRole('button', { name: '+ New' }).first().click();
    await page.getByLabel('Name').fill('Eve');
    await page.getByLabel('Skills (comma-separated)').fill('welding, cnc, painting');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('welding, cnc, painting')).toBeVisible();
  });

  test('TC-OP04: editing operator updates shift in the table', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByLabel('Shift').selectOption('night');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Operator updated')).toBeVisible();
    await expect(page.getByText('night')).toBeVisible();
  });

  test('TC-OP05: confirming delete removes operator row', async ({ page }) => {
    const rowsBefore = await page.getByRole('row').count();
    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByRole('row')).toHaveCount(rowsBefore - 1);
    await expect(page.getByText('Deleted')).toBeVisible();
  });
});
