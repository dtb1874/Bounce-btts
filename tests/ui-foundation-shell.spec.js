const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const screenshotDir = path.join(process.cwd(), 'artifacts', 'ui-foundation-shell');
fs.mkdirSync(screenshotDir, { recursive: true });

async function assertNoPageErrors(page, run) {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await run();
  expect(pageErrors, `Unexpected browser errors: ${pageErrors.join(' | ')}`).toEqual([]);
}

async function waitForDrawerOpen(sidebar) {
  await expect.poll(async () => {
    const box = await sidebar.boundingBox();
    return box?.x ?? -9999;
  }, { timeout: 3000 }).toBeGreaterThanOrEqual(-1);
}

test.describe('UI foundation shell candidate', () => {
  test('desktop preserves sidebar navigation and role visibility', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await assertNoPageErrors(page, async () => {
      await page.goto('http://127.0.0.1:3000/ui-foundation-preview', { waitUntil: 'networkidle' });
      const nav = page.getByRole('navigation', { name: 'League navigation' });
      await expect(nav).toBeVisible();
      await expect(nav.getByRole('button', { name: 'Dashboard' })).toBeVisible();
      await expect(nav.getByRole('button', { name: 'Admin', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'Show admin nav' }).click();
      await expect(nav.getByRole('button', { name: 'Admin', exact: true })).toBeVisible();
      await nav.getByRole('button', { name: 'League Table' }).click();
      await expect(page.getByText('table', { exact: true })).toBeVisible();
      await page.screenshot({ path: path.join(screenshotDir, 'desktop-1440x900.png'), fullPage: true });
    });
  });

  test('narrow phone opens and closes the drawer through the existing mobile contract', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoPageErrors(page, async () => {
      await page.goto('http://127.0.0.1:3000/ui-foundation-preview', { waitUntil: 'networkidle' });
      const openMenu = page.getByRole('button', { name: 'Open menu' });
      const sidebar = page.locator('main > aside');
      await expect(openMenu).toBeVisible();
      await openMenu.click();
      await waitForDrawerOpen(sidebar);
      await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
      await expect(sidebar.getByRole('button', { name: 'Make My Pick' })).toBeVisible();
      await page.screenshot({ path: path.join(screenshotDir, 'phone-390x844-drawer.png'), fullPage: true });

      const scrim = page.getByRole('button', { name: 'Close menu' });
      const scrimBox = await scrim.boundingBox();
      expect(scrimBox).not.toBeNull();
      await page.mouse.click(scrimBox.x + scrimBox.width - 8, scrimBox.y + scrimBox.height / 2);
      await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
    });
  });

  test('iPad landscape keeps the sidebar as an off-canvas drawer', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 });
    await assertNoPageErrors(page, async () => {
      await page.goto('http://127.0.0.1:3000/ui-foundation-preview', { waitUntil: 'networkidle' });
      const openMenu = page.getByRole('button', { name: 'Open menu' });
      const sidebar = page.locator('main > aside');
      await expect(openMenu).toBeVisible();
      await openMenu.click();
      await waitForDrawerOpen(sidebar);
      const box = await sidebar.boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThanOrEqual(330);
      expect(box.width).toBeLessThanOrEqual(350);
      await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
      await page.screenshot({ path: path.join(screenshotDir, 'ipad-landscape-1180x820-drawer.png'), fullPage: true });
    });
  });
});
