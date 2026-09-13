const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: 'admin-dashboard-loading.spec.js',
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3105',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm --prefix frontend run dev -- --hostname 127.0.0.1 --port 3105',
    url: 'http://127.0.0.1:3105/ru/admin',
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      NEXT_TELEMETRY_DISABLED: '1',
      STRAPI_URL: 'http://127.0.0.1:1',
      NEXT_PUBLIC_STRAPI_URL: 'http://127.0.0.1:1',
      ADMIN_MODERATION_WRITE_ENABLED: 'false',
      ADMIN_TRANSLATION_WRITE_ENABLED: 'false',
    },
  },
});
