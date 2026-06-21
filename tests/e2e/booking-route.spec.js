const { test, expect } = require('@playwright/test');

test('Budva route booking reaches payment page', async ({ page }) => {
  await page.goto('/ru/boats/uuuuu-1781974634255');

  await page.getByRole('button', { name: /^16:00/i }).click();
  await page.getByRole('button', { name: /Budva 6 часа · 500 EUR/i }).click();

  await page.getByRole('link', { name: /запросить/i }).click();

  await expect(page).toHaveURL(/\/ru\/request/);
  await expect(page.getByText('Маршрут')).toBeVisible();
  await expect(page.getByText('Budva').first()).toBeVisible();
  await expect(page.getByText('€575.00')).toHaveCount(2);

  await page.locator('input').nth(0).fill('Playwright Route Test');
  await page.locator('input').nth(1).fill('+38267000000');
  await page.locator('input').nth(2).fill('playwright-route@sharmar.local');

  await page.getByRole('button', { name: /перейти к бронированию/i }).click();

  await expect(page).toHaveURL(/\/ru\/payments\//, { timeout: 15000 });
});
