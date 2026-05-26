import { test, expect, Page } from '@playwright/test';
import { resetApp, loginAsManager, goToTab } from './helpers/auth';

/** Opens the Allocate form after navigating to the Allocations tab */
async function openAllocForm(page: Page): Promise<void> {
  await goToTab(page, 'Allocations');
  await page.getByRole('button', { name: '+ Allocate' }).click();
}

/** Allocates the first idle machine to the first work order */
async function allocateFirstMachine(page: Page): Promise<void> {
  await openAllocForm(page);
  const woSelect  = page.getByLabel('Work Order');
  const mcSelect  = page.getByLabel('Machine (optional)');
  await woSelect.selectOption({ index: 1 });
  await mcSelect.selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Allocate' }).click();
  await expect(page.getByText('Resource allocated')).toBeVisible();
}

test.describe('TC-AL: Allocations & Business Rules', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await resetApp(page);
    await loginAsManager(page);
  });

  test('TC-AL01: allocating idle machine sets it to running status', async ({ page }) => {
    await allocateFirstMachine(page);
    await goToTab(page, 'Machines');
    await expect(page.getByText('running').first()).toBeVisible();
  });

  test('TC-AL02: allocating operator creates allocation row with operator name', async ({ page }) => {
    await openAllocForm(page);
    await page.getByLabel('Work Order').selectOption({ index: 1 });
    await page.getByLabel('Operator (optional)').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Allocate' }).click();
    await expect(page.getByText('Resource allocated')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Alice' }).or(
      page.getByRole('row').filter({ hasText: 'Bob' })
    ).first()).toBeVisible();
  });

  test('TC-AL03: allocating material reserves qty and reduces available', async ({ page }) => {
    await openAllocForm(page);
    await page.getByLabel('Work Order').selectOption({ index: 1 });
    await page.getByLabel('Material (optional)').selectOption({ index: 1 });
    await page.getByLabel('Qty Used').fill('50');
    await page.getByRole('button', { name: 'Allocate' }).click();
    await expect(page.getByText('Resource allocated')).toBeVisible();
    await goToTab(page, 'Materials');
    await expect(page.getByText('50')).toBeVisible();
  });

  test('TC-AL04: double-booking same machine is blocked with toast', async ({ page }) => {
    await allocateFirstMachine(page);
    await openAllocForm(page);
    await page.getByLabel('Work Order').selectOption({ index: 1 });
    await page.getByLabel('Machine (optional)').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Allocate' }).click();
    await expect(page.getByText('Machine already allocated to an active work order')).toBeVisible();
  });

  test('TC-AL05: double-booking same operator is blocked with toast', async ({ page }) => {
    await openAllocForm(page);
    await page.getByLabel('Work Order').selectOption({ index: 1 });
    await page.getByLabel('Operator (optional)').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Allocate' }).click();
    await expect(page.getByText('Resource allocated')).toBeVisible();

    await openAllocForm(page);
    await page.getByLabel('Work Order').selectOption({ index: 2 });
    await page.getByLabel('Operator (optional)').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Allocate' }).click();
    await expect(page.getByText('Operator already allocated to an active work order')).toBeVisible();
  });

  test('TC-AL06: requesting more qty than available stock is blocked', async ({ page }) => {
    await openAllocForm(page);
    await page.getByLabel('Work Order').selectOption({ index: 1 });
    await page.getByLabel('Material (optional)').selectOption({ index: 1 });
    await page.getByLabel('Qty Used').fill('999999');
    await page.getByRole('button', { name: 'Allocate' }).click();
    await expect(page.getByText('Insufficient stock')).toBeVisible();
  });

  test('TC-AL10: submitting allocation with no resource selected is blocked', async ({ page }) => {
    await openAllocForm(page);
    await page.getByLabel('Work Order').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Allocate' }).click();
    await expect(page.getByText('Select at least one resource')).toBeVisible();
  });

  test('TC-AL07: deallocating releases machine to idle and restores material stock', async ({ page }) => {
    await openAllocForm(page);
    await page.getByLabel('Work Order').selectOption({ index: 1 });
    await page.getByLabel('Machine (optional)').selectOption({ index: 1 });
    await page.getByLabel('Material (optional)').selectOption({ index: 1 });
    await page.getByLabel('Qty Used').fill('10');
    await page.getByRole('button', { name: 'Allocate' }).click();
    await expect(page.getByText('Resource allocated')).toBeVisible();

    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Deallocate' }).first().click();
    await expect(page.getByText('Deallocated')).toBeVisible();

    await goToTab(page, 'Machines');
    await expect(page.getByText('running')).not.toBeVisible();
  });

  test('TC-AL08: deallocation fires idle alert banner with machine name', async ({ page }) => {
    await allocateFirstMachine(page);
    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Deallocate' }).first().click();
    await expect(page.locator('#idle-banner')).toBeVisible();
    await expect(page.locator('#idle-banner')).toContainText('became idle');
  });

  test('TC-AL09: dismissing idle alert hides the banner', async ({ page }) => {
    await allocateFirstMachine(page);
    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Deallocate' }).first().click();
    await expect(page.locator('#idle-banner')).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.locator('#idle-banner')).toBeHidden();
  });

  test('TC-DS04: idle alert persists after page reload', async ({ page }) => {
    await allocateFirstMachine(page);
    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Deallocate' }).first().click();
    await page.reload();
    await expect(page.locator('#idle-banner')).toBeVisible();
  });
});
