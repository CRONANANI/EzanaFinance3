// @ts-check
/**
 * Playwright end-to-end specs (e2e/). They run against an already-running
 * server: E2E_BASE_URL (default http://localhost:3000), e.g. after
 * `npm run build && npm start`, or a Vercel preview URL.
 *   npm run test:e2e
 * Signed-in specs need E2E_EMAIL and E2E_PASSWORD for a verified test account
 * and skip without them.
 */
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
