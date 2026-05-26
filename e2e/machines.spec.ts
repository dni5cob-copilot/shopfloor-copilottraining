import { test, expect } from '@playwright/test';
import { resetApp, loginAsManager, goToTab } from './helpers/auth';

test.describe('TC-MC: Machines', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await resetApp(page);
    await loginAsManager(page);
    await goToTab(page, 'Machines');
  });

  test('TC-MC01: create machine with valid fields shows idle status chip', async ({ page }) => {
    await page.getByRole('button', { name: '+ New' }).first().click();
    await page.getByLabel('Name').fill('Drill-04');
    await page.getByLabel('Type').fill('Drill');
    await page.getByLabel('Capacity').fill('2');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Machine added')).toBeVisible();
    await expect(page.getByText('Drill-04')).toBeVisible();
    await expect(page.getByText('idle').first()).toBeVisible();
  });

  test('TC-MC02: saving machine without capacity shows inline error', async ({ page }) => {
    await page.getByRole('button', { name: '+ New' }).first().click();
    await page.getByLabel('Name').fill('Drill-04');
    await page.getByLabel('Type').fill('Drill');
    await page.getByLabel('Capacity').fill('0');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Capacity must be ≥ 1')).toBeVisible();
  });

  test('TC-MC03: editing machine updates idle threshold', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByLabel('Idle Threshold (min)').fill('15');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Machine updated')).toBeVisible();
    await expect(page.getByText('15 min')).toBeVisible();
  });

  test('TC-MC05: confirming delete removes machine row', async ({ page }) => {
    const rowsBefore = await page.getByRole('row').count();
    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByRole('row')).toHaveCount(rowsBefore - 1);
    await expect(page.getByText('Deleted')).toBeVisible();
  });
});
