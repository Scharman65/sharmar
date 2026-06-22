const { test } = require('@playwright/test');

test('debug Budva booking submit network', async ({ page }) => {
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/hold') || url.includes('/api/request') || url.includes('/api/payments/intent')) {
      let body = '';
      try {
        body = await response.text();
      } catch {}
      console.log('\n===== RESPONSE =====');
      console.log(response.status(), url);
      console.log(body.slice(0, 1000));
    }
  });

  await page.goto('/ru/boats/uuuuu-1781974634255');

  await page.getByRole('button', { name: /^16:00/i }).click();
  await page.getByRole('button', { name: /Budva 6 часа · 500 EUR/i }).click();
  await page.getByRole('link', { name: /запросить/i }).click();

  await page.waitForURL(/\/ru\/request/);

  await page.locator('input').nth(0).fill('Playwright Route Test');
  await page.locator('input').nth(1).fill('+38267000000');
  await page.locator('input').nth(2).fill('playwright-route@sharmar.local');

  await page.getByRole('button', { name: /перейти к бронированию/i }).click();

  await page.waitForTimeout(5000);

  console.log('\n===== CURRENT URL =====');
  console.log(page.url());

  console.log('\n===== PAGE TEXT AFTER SUBMIT =====');
  console.log(await page.locator('body').innerText());
});
