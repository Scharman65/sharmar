const { test, expect } = require('@playwright/test');

test('boats catalog and boat page work', async ({ page }) => {
  await page.goto('/ru/boats');

  await expect(page).toHaveURL(/\/ru\/boats/);
  await expect(page.getByRole('link', { name: /uuuuu/i })).toBeVisible();

  await page.getByRole('link', { name: /uuuuu/i }).first().click();

  await expect(page).toHaveURL(/\/ru\/boats\/uuuuu-1781974634255/);
  await expect(page.getByText(/Тип поездки/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Budva 6 часа · 500 EUR/i })).toBeVisible();
});
