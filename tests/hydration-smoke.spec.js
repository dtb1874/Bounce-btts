const { test, expect } = require('@playwright/test');

test('login page hydrates and remains interactive after refresh', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'BOUNCE' })).toBeVisible();

  const username = page.getByLabel('Username');
  const password = page.getByLabel('Password');

  await username.fill('hydration-check');
  await password.fill('not-a-real-password');
  await expect(username).toHaveValue('hydration-check');
  await expect(password).toHaveValue('not-a-real-password');

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'BOUNCE' })).toBeVisible();

  await username.fill('after-refresh');
  await expect(username).toHaveValue('after-refresh');

  expect(pageErrors, `Unexpected browser errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
