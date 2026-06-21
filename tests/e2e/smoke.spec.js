const { test, expect } = require('@playwright/test');

test('homepage navigation works', async ({ page }) => {
  await page.goto('http://localhost:3000/ru');

  await expect(page.getByRole('link', { name: 'Sharmar' })).toBeVisible();

  await expect(page.getByRole('link', { name: 'EN', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'RU', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ME', exact: true })).toBeVisible();

  await page.getByRole('link', { name: /смотреть яхты/i }).click();
  await expect(page).toHaveURL(/\/ru\/boats/);

  await page.goto('http://localhost:3000/ru');

  await page.getByRole('link', { name: /вход владельца/i }).click();
  await expect(page).toHaveURL(/\/ru\/owner-login/);
});
