const { test, expect } = require('@playwright/test');

// Exercise the real Next.js page. Only the browser's admin API responses are
// simulated; these tests use no credentials, CMS data or payment services.
const session = (authenticated) => ({
  authenticated,
  permissions: authenticated ? ['dashboard', 'moderation'] : [],
  expiresAt: authenticated ? Date.now() + 3600000 : null,
});
const dashboard = { ok: true, owners: [], boats: [], experiences: [], moderationEvents: [] };

async function mockSession(page, initiallyAuthenticated = true) {
  let authenticated = initiallyAuthenticated;
  await page.route('**/api/admin/session', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      authenticated = true;
      return route.fulfill({ json: { ok: true } });
    }
    if (method === 'DELETE') authenticated = false;
    return route.fulfill({ json: session(authenticated) });
  });
}

test('failed dashboard load stops and manual retry recovers', async ({ page }) => {
  await mockSession(page);
  let requests = 0;
  let healthy = false;
  await page.route('**/api/admin/dashboard', (route) => {
    requests += 1;
    return route.fulfill(healthy
      ? { json: dashboard }
      : { status: 502, json: { ok: false, code: 'dashboard_api_unavailable' } });
  });
  await page.goto('/ru/admin');
  await expect(page.locator('main').getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Маршруты', exact: true }).click();
  // Observe longer than the ~500 ms repeat interval of the reported incident.
  await page.waitForTimeout(1200);
  expect(requests).toBe(1);
  await expect(page.locator('main').getByRole('alert')).toBeVisible();
  const retry = page.getByRole('button', { name: 'Обновить данные', exact: true });
  await expect(retry).toBeEnabled();
  healthy = true;
  await retry.click();
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  await expect(retry).toBeEnabled();
  expect(requests).toBe(2);
});

for (const failure of ['forbidden', 'invalid-json', 'network']) {
  test(`${failure} does not start an automatic retry loop`, async ({ page }) => {
    await mockSession(page);
    let requests = 0;
    await page.route('**/api/admin/dashboard', (route) => {
      requests += 1;
      if (failure === 'network') return route.abort('failed');
      if (failure === 'invalid-json') return route.fulfill({ body: '<html>unavailable</html>' });
      return route.fulfill({ status: 403, json: { ok: false, code: 'missing_dashboard_permission' } });
    });
    await page.goto('/en/admin');
    await expect(page.locator('main').getByRole('alert')).toBeVisible();
    await page.waitForTimeout(1200);
    expect(requests).toBe(1);
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  });
}

test('login loads once and an expired session can log in again', async ({ page }) => {
  await mockSession(page, false);
  let requests = 0;
  await page.route('**/api/admin/dashboard', (route) => {
    requests += 1;
    return route.fulfill(requests === 1
      ? { status: 401, json: { ok: false, code: 'session_expired' } }
      : { json: dashboard });
  });
  await page.goto('/ru/admin');
  await page.getByLabel('Пароль администратора', { exact: true }).fill('test-only-password');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('истекла');
  expect(requests).toBe(1);
  await page.getByLabel('Пароль администратора', { exact: true }).fill('test-only-password');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Выйти', exact: true })).toBeVisible();
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  await page.waitForTimeout(600);
  expect(requests).toBe(2);
});

test('failed manual refresh keeps the last loaded data', async ({ page }) => {
  await mockSession(page);
  let requests = 0;
  await page.route('**/api/admin/dashboard', (route) => {
    requests += 1;
    return route.fulfill(requests === 1
      ? { json: { ...dashboard, owners: [{ profile_id: 7, verification_status: 'under_review' }] } }
      : { status: 502, json: { ok: false, code: 'dashboard_api_unavailable' } });
  });
  await page.goto('/ru/admin');
  const metric = page.locator('article.metric').filter({ hasText: 'Владельцы ожидают проверки' });
  await expect(metric.locator('strong')).toHaveText('1');
  await page.getByRole('button', { name: 'Обновить данные', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toBeVisible();
  await expect(metric.locator('strong')).toHaveText('1');
  await page.waitForTimeout(600);
  expect(requests).toBe(2);
});

test('logout discards a late dashboard response and next login starts fresh', async ({ page }) => {
  await mockSession(page);
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  let requests = 0;
  await page.route('**/api/admin/dashboard', async (route) => {
    requests += 1;
    if (requests === 1) {
      await pending;
      await route.fulfill({ status: 502, json: { ok: false, code: 'stale_request_error' } }).catch(() => {});
      return;
    }
    await route.fulfill({ json: dashboard });
  });
  await page.goto('/ru/admin');
  await expect.poll(() => requests).toBe(1);
  await expect(page.getByRole('button', { name: 'Обновить данные', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeVisible();
  release();
  await page.waitForTimeout(600);
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  await page.getByLabel('Пароль администратора', { exact: true }).fill('test-only-password');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.locator('article.metric').first()).toBeVisible();
  expect(requests).toBe(2);
});
