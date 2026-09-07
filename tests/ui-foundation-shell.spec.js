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

async function assertCanonicalNavLabels(nav) {
  const table = nav.locator('[data-nav-id="table"]');
  const results = nav.locator('[data-nav-id="results"]');
  await expect(table.locator('.uiFoundationNavLabel')).toHaveText('Stat Centre');
  await expect(table.locator('.uiFoundationNavHelper')).toHaveText('League Table');
  await expect(results.locator('.uiFoundationNavLabel')).toHaveText('Results');
  await expect(results.locator('.uiFoundationNavHelper')).toHaveText('All picks');
}

async function assertSemanticMobileNav(page) {
  const nav = page.getByRole('navigation', { name: 'League navigation' });
  await expect(nav.getByText('QUICK ACCESS', { exact: true })).toBeVisible();
  await expect(nav.getByText('MORE', { exact: true })).toBeVisible();
  await assertCanonicalNavLabels(nav);
}

async function openDrawerAt(page, width, height, screenshotName) {
  await page.setViewportSize({ width, height });
  await page.goto('http://127.0.0.1:3000/ui-foundation-preview', { waitUntil: 'networkidle' });
  const openMenu = page.getByRole('button', { name: 'Open menu' });
  const sidebar = page.locator('main > aside');
  await expect(openMenu).toBeVisible();
  await openMenu.click();
  await waitForDrawerOpen(sidebar);
  await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
  await expect(sidebar.getByRole('button', { name: /Make My Pick/ })).toBeVisible();
  await assertSemanticMobileNav(page);
  await page.screenshot({ path: path.join(screenshotDir, screenshotName), fullPage: true });
  return sidebar;
}

test.describe('UI foundation shell candidate', () => {
  test('desktop preserves sidebar navigation, canonical labels and shell-level sibling ownership', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await assertNoPageErrors(page, async () => {
      await page.goto('http://127.0.0.1:3000/ui-foundation-preview', { waitUntil: 'networkidle' });
      const shell = page.locator('main[data-ui-foundation-shell="declarative"]');
      const nav = page.getByRole('navigation', { name: 'League navigation' });
      const adminNav = nav.getByRole('button', { name: /Admin/ });
      await expect(shell).toHaveCount(1);
      await expect(shell.locator(':scope > section')).toHaveCount(1);
      await expect(shell.locator(':scope > [data-ui-foundation-shell-layer="after-content"]')).toHaveCount(1);
      await expect(nav).toBeVisible();
      await expect(nav.getByRole('button', { name: /Dashboard/ })).toBeVisible();
      await assertCanonicalNavLabels(nav);
      await expect(nav.getByText('QUICK ACCESS', { exact: true })).toBeHidden();
      await expect(nav.getByText('MORE', { exact: true })).toBeHidden();
      await expect(nav.locator('[data-nav-id="table"] .uiFoundationNavHelper')).toBeHidden();
      await expect(nav.locator('[data-nav-id="results"] .uiFoundationNavHelper')).toBeHidden();
      await expect(page.locator('.uiFoundationSidebarPortrait')).toBeHidden();
      await expect(adminNav).toHaveCount(0);
      await page.getByRole('button', { name: 'Show admin nav' }).click();
      await expect(adminNav).toBeVisible();
      await nav.locator('[data-nav-id="table"]').click();
      await expect(page.getByText('table', { exact: true })).toBeVisible();
      await page.screenshot({ path: path.join(screenshotDir, 'desktop-1440x900.png'), fullPage: true });
    });
  });

  test('narrow phone opens and closes the drawer with initials fallback', async ({ page }) => {
    await page.route('**/api/member-portraits', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ portraits: [] }) });
    });
    await assertNoPageErrors(page, async () => {
      const sidebar = await openDrawerAt(page, 390, 844, 'phone-390x844-drawer.png');
      const portrait = sidebar.locator('.uiFoundationSidebarPortrait');
      await expect(portrait).toBeVisible();
      await expect(portrait.locator('.mobileSidebarPortraitInitials')).toHaveText('PM');
      const scrim = page.getByRole('button', { name: 'Close menu' });
      const scrimBox = await scrim.boundingBox();
      expect(scrimBox).not.toBeNull();
      await page.mouse.click(scrimBox.x + scrimBox.width - 8, scrimBox.y + scrimBox.height / 2);
      await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
    });
  });

  test('narrow phone renders the matched member portrait when available', async ({ page }) => {
    const portraitUrl = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2272%22 height=%2272%22%3E%3Crect width=%2272%22 height=%2272%22 fill=%22%23742034%22/%3E%3C/svg%3E';
    await page.route('**/api/member-portraits', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ portraits: [{ id: 'preview', displayName: 'Preview Member', portraitUrl }] }),
      });
    });
    await assertNoPageErrors(page, async () => {
      const sidebar = await openDrawerAt(page, 390, 844, 'phone-390x844-portrait.png');
      const portrait = sidebar.locator('.uiFoundationSidebarPortrait');
      await expect(portrait).toBeVisible();
      await expect(portrait.locator('.mobileSidebarPortraitImage')).toHaveAttribute('src', portraitUrl);
      await expect(portrait.locator('.mobileSidebarPortraitInitials')).toHaveCount(0);
    });
  });

  test('large phone keeps the full drawer within the viewport', async ({ page }) => {
    await assertNoPageErrors(page, async () => {
      const sidebar = await openDrawerAt(page, 430, 932, 'phone-430x932-drawer.png');
      const box = await sidebar.boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.width).toBeLessThan(430);
    });
  });

  test('iPad portrait uses the mobile drawer without desktop sidebar offset', async ({ page }) => {
    await assertNoPageErrors(page, async () => {
      const sidebar = await openDrawerAt(page, 820, 1180, 'ipad-portrait-820x1180-drawer.png');
      const box = await sidebar.boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.width).toBeGreaterThanOrEqual(300);
      expect(box.width).toBeLessThanOrEqual(340);
      const main = page.locator('main > section').first();
      const mainBox = await main.boundingBox();
      expect(mainBox).not.toBeNull();
      expect(mainBox.x).toBeGreaterThanOrEqual(0);
    });
  });

  test('iPad landscape keeps the semantic sidebar as an off-canvas drawer', async ({ page }) => {
    await assertNoPageErrors(page, async () => {
      const sidebar = await openDrawerAt(page, 1180, 820, 'ipad-landscape-1180x820-drawer.png');
      const box = await sidebar.boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThanOrEqual(330);
      expect(box.width).toBeLessThanOrEqual(350);
    });
  });
});