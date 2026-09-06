const { test, expect } = require('@playwright/test');

async function assertNoPageErrors(page, run) {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await run();
  expect(pageErrors, `Unexpected browser errors: ${pageErrors.join(' | ')}`).toEqual([]);
}

test.describe('UI foundation shell candidate', () => {
  test('desktop preserves sidebar navigation and role visibility', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await assertNoPageErrors(page, async () => {
      await page.goto('http://127.0.0.1:3000/ui-foundation-preview', { waitUntil: 'networkidle' });
      await expect(page.getByRole('navigation', { name: 'League navigation' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Admin' })).toHaveCount(0);
      await page.getByRole('button', { name: 'Show admin nav' }).click();
      await expect(page.getByRole('button', { name: 'Admin' })).toBeVisible();
      await page.getByRole('button', { name: 'League Table' }).click();
      await expect(page.getByText('table', { exact: true })).toBeVisible();
    });
  });

  test('narrow phone opens and closes the drawer through the existing mobile contract', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoPageErrors(page, async () => {
      await page.goto('http://127.0.0.1:3000/ui-foundation-preview', { waitUntil: 'networkidle' });
      const openMenu = page.getByRole('button', { name: 'Open menu' });
      await expect(openMenu).toBeVisible();
      await openMenu.click();
      await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Make My Pick' })).toBeVisible();
      await page.getByRole('button', { name: 'Close menu' }).click();
      await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
    });
  });

  test('iPad landscape keeps the sidebar as an off-canvas drawer', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 });
    await assertNoPageErrors(page, async () => {
      await page.goto('http://127.0.0.1:3000/ui-foundation-preview', { waitUntil: 'networkidle' });
      const openMenu = page.getByRole('button', { name: 'Open menu' });
      await expect(openMenu).toBeVisible();
      await openMenu.click();
      const sidebar = page.locator('main > aside');
      await expect(sidebar).toBeVisible();
      const box = await sidebar.boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.width).toBeGreaterThanOrEqual(330);
      expect(box.width).toBeLessThanOrEqual(350);
      await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
    });
  });
});
