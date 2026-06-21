const { test } = require('@playwright/test');

test('debug Budva request page text', async ({ page }) => {
  await page.goto('/ru/boats/uuuuu-1781974634255');

  await page.getByRole('button', { name: /Budva 6 часа · 500 EUR/i }).click();
  await page.getByRole('link', { name: /запросить/i }).click();

  await page.waitForURL(/\/ru\/request/);

  const bodyText = await page.locator('body').innerText();

  console.log('\n===== REQUEST PAGE TEXT =====');
  console.log(bodyText);
});
