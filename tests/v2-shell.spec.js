const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const screenshotDir = path.join(process.cwd(), 'artifacts', 'v2-shell');
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

async function openPreview(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto('http://127.0.0.1:3000/ui-foundation-preview', { waitUntil: 'networkidle' });
}

test.describe('Bounce 2.0 authenticated shell', () => {
  test('desktop uses persistent grouped navigation and member identity', async ({ page }) => {
    await page.route('**/api/member-portraits', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ portraits: [] }) });
    });
    await assertNoPageErrors(page, async () => {
      await openPreview(page, 1440, 900);
      const shell = page.locator('main[data-v2-shell="true"]');
      const sidebar = page.getByRole('complementary', { name: 'Bounce navigation' });
      const nav = page.getByRole('navigation', { name: 'League navigation' });
      await expect(shell).toHaveCount(1);
      await expect(sidebar).toBeVisible();
      await expect(nav.getByText('LEAGUE', { exact: true })).toBeVisible();
      await expect(nav.getByText('EXPLORE', { exact: true })).toBeVisible();
      await expect(nav.locator('[data-nav-id="table"] .uiFoundationNavLabel')).toHaveText('Stat Centre');
      await expect(nav.locator('[data-nav-id="table"] .uiFoundationNavHelper')).toHaveText('League Table');
      await expect(sidebar.locator('.uiFoundationSidebarPortrait')).toBeVisible();
      await expect(sidebar.locator('.mobileSidebarPortraitInitials')).toHaveText('PM');
      await expect(nav.locator('[data-nav-id="admin"]')).toHaveCount(0);
      await page.getByRole('button', { name: 'Show admin nav' }).click();
      await expect(nav.getByText('MANAGE', { exact: true })).toBeVisible();
      await expect(nav.locator('[data-nav-id="admin"]')).toBeVisible();
      await nav.locator('[data-nav-id="table"]').click();
      await expect(page.getByText('table', { exact: true })).toBeVisible();
      await page.screenshot({ path: path.join(screenshotDir, 'desktop-1440x900.png'), fullPage: true });
    });
  });

  test('narrow phone uses top context, bottom primary nav and drawer', async ({ page }) => {
    await page.route('**/api/member-portraits', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ portraits: [] }) });
    });
    await assertNoPageErrors(page, async () => {
      await openPreview(page, 390, 844);
      const sidebar = page.getByRole('complementary', { name: 'Bounce navigation' });
      const bottom = page.getByRole('navigation', { name: 'Primary navigation' });
      const open = page.getByRole('button', { name: 'Open navigation' });
      await expect(open).toBeVisible();
      await expect(bottom).toBeVisible();
      await expect(bottom.locator('[data-nav-id="dashboard"]')).toBeVisible();
      await expect(bottom.locator('[data-nav-id="pick"]')).toBeVisible();
      await expect(bottom.locator('[data-nav-id="table"]')).toBeVisible();
      await expect(bottom.locator('[data-nav-id="results"]')).toBeVisible();
      await expect(bottom.getByRole('button', { name: 'Open more navigation' })).toBeVisible();
      const closedBox = await sidebar.boundingBox();
      expect(closedBox).not.toBeNull();
      expect(closedBox.x + closedBox.width).toBeLessThanOrEqual(1);
      await open.click();
      await waitForDrawerOpen(sidebar);
      await expect(page.getByRole('button', { name: 'Close navigation' }).first()).toBeVisible();
      await expect(sidebar.locator('.mobileSidebarPortraitInitials')).toHaveText('PM');
      await page.screenshot({ path: path.join(screenshotDir, 'phone-390x844-drawer.png'), fullPage: true });
      await page.getByRole('button', { name: 'Close navigation' }).last().click();
      await expect(open).toBeVisible();
    });
  });

  test('narrow phone renders a matched portrait', async ({ page }) => {
    const portraitUrl = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2272%22 height=%2272%22%3E%3Crect width=%2272%22 height=%2272%22 fill=%22%23742034%22/%3E%3C/svg%3E';
    await page.route('**/api/member-portraits', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ portraits: [{ id: 'preview', displayName: 'Preview Member', portraitUrl }] }),
      });
    });
    await assertNoPageErrors(page, async () => {
      await openPreview(page, 390, 844);
      await page.getByRole('button', { name: 'Open navigation' }).click();
      const sidebar = page.getByRole('complementary', { name: 'Bounce navigation' });
      await waitForDrawerOpen(sidebar);
      await expect(sidebar.locator('.mobileSidebarPortraitImage')).toHaveAttribute('src', portraitUrl);
      await expect(sidebar.locator('.mobileSidebarPortraitInitials')).toHaveCount(0);
    });
  });

  test('iPad portrait keeps mobile navigation and safe main geometry', async ({ page }) => {
    await assertNoPageErrors(page, async () => {
      await openPreview(page, 820, 1180);
      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
      const main = page.locator('.uiFoundationMain');
      const mainBox = await main.boundingBox();
      expect(mainBox).not.toBeNull();
      expect(mainBox.x).toBeGreaterThanOrEqual(0);
      expect(mainBox.width).toBeLessThanOrEqual(820);
    });
  });

  test('iPad landscape uses the compact persistent sidebar', async ({ page }) => {
    await assertNoPageErrors(page, async () => {
      await openPreview(page, 1180, 820);
      const sidebar = page.getByRole('complementary', { name: 'Bounce navigation' });
      const main = page.locator('.uiFoundationMain');
      await expect(sidebar).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeHidden();
      const sideBox = await sidebar.boundingBox();
      const mainBox = await main.boundingBox();
      expect(sideBox).not.toBeNull();
      expect(mainBox).not.toBeNull();
      expect(sideBox.x).toBeGreaterThanOrEqual(-1);
      expect(sideBox.width).toBeGreaterThanOrEqual(200);
      expect(sideBox.width).toBeLessThanOrEqual(220);
      expect(mainBox.x).toBeGreaterThanOrEqual(200);
    });
  });
});
