const { test } = require('@playwright/test');

test('list visible links', async ({ page }) => {
  await page.goto('http://localhost:3000/ru');

  const links = await page.locator('a').evaluateAll(nodes =>
    nodes
      .map(node => (node.textContent || '').trim())
      .filter(Boolean)
  );

  console.log('\n===== VISIBLE LINKS =====');
  console.log(links);
});
