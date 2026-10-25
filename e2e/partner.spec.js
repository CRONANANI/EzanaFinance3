// @ts-check
/**
 * Partner journey (QA Phase 8.4): sign in → /partner-home → Settings,
 * Payouts → /partner-dashboard shows no hardcoded numbers (the old demo
 * "$12,450") → /org-team-hub sends a partner away.
 *
 * Needs E2E_PARTNER_EMAIL / E2E_PARTNER_PASSWORD (an active partner test
 * account); E2E_PARTNER_SIGNIN_PATH overrides the sign-in page (default
 * /auth/partner/signin). Skips without them. Read-only. Every test fails on
 * console errors or /api/ 5xx.
 */
const { test, expect } = require('@playwright/test');
const { watchPage, signIn } = require('./helpers');

const email = process.env.E2E_PARTNER_EMAIL;
const password = process.env.E2E_PARTNER_PASSWORD;
const signInPath = process.env.E2E_PARTNER_SIGNIN_PATH || '/auth/partner/signin';

/* Demo figures that must never render (PAR-5/7/12). */
const FAKE_NUMBERS = ['$12,450', '$2,340.00'];

test.describe('partner journey', () => {
  test.skip(
    !email || !password,
    'set E2E_PARTNER_EMAIL and E2E_PARTNER_PASSWORD for an active partner account',
  );
  test.describe.configure({ timeout: 60_000 });
  watchPage(test);

  test.beforeEach(async ({ page }) => {
    await signIn(page, { email, password, next: '/partner-home', path: signInPath });
  });

  test('partner home loads', async ({ page }) => {
    await page.goto('/partner-home');
    await expect(page).toHaveURL(/\/partner-home/);
    await expect(page.locator('main, body').first()).toBeVisible();
  });

  test('settings payouts panel loads', async ({ page }) => {
    await page.goto('/settings?tab=payouts');
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByText(/payout/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('partner dashboard shows no hardcoded numbers', async ({ page }) => {
    await page.goto('/partner-dashboard');
    await expect(page).toHaveURL(/\/partner-dashboard/);
    await page.waitForLoadState('networkidle');
    const text = await page.locator('body').innerText();
    for (const fake of FAKE_NUMBERS) expect(text).not.toContain(fake);
  });

  test('/org-team-hub redirects a partner away', async ({ page }) => {
    await page.goto('/org-team-hub');
    await expect(page).not.toHaveURL(/\/org-team-hub/);
  });
});
