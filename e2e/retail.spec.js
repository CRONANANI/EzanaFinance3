// @ts-check
/**
 * Retail journey (QA Phase 8.4): sign in → Company Research → add AAPL to a
 * watchlist → /watchlist shows AAPL after a reload → mock buy 1 share and
 * the server prices it (cash falls by about the server price, never by a
 * client-sent price) → a community post with an image shows the image →
 * log out → /home sends you to sign-in.
 *
 * Needs E2E_EMAIL / E2E_PASSWORD (a verified retail test account) and
 * skips without them. Every test fails on console errors or /api/ 5xx.
 * Writes to the test account only (a watchlist item, a mock trade, a post).
 */
const { test, expect } = require('@playwright/test');
const { watchPage, signIn, api, TINY_PNG } = require('./helpers');

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('retail journey', () => {
  test.skip(!email || !password, 'set E2E_EMAIL and E2E_PASSWORD for a verified retail account');
  test.describe.configure({ mode: 'serial', timeout: 90_000 });
  watchPage(test);

  test('Company Research: add AAPL to a watchlist; it persists across a reload', async ({
    page,
  }) => {
    await signIn(page, { email, password, next: '/company-research' });
    await page.goto('/company-research?symbol=AAPL');
    await page
      .getByRole('button', { name: /add to watchlist/i })
      .first()
      .click();

    /* The modal lists the user's real lists (RET-5); pick the first. */
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const listChoice = dialog.getByRole('button').filter({ hasNotText: /create|cancel|close/i });
    await listChoice.first().click();

    await page.goto('/watchlist');
    await page.reload();
    await expect(page.getByText('AAPL', { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    /* And the API agrees, so it is persisted, not local state. */
    const { status, body } = await api(page, 'GET', '/api/watchlists');
    expect(status).toBe(200);
    expect(JSON.stringify(body)).toContain('AAPL');
  });

  test('mock buy of 1 AAPL share is priced by the server', async ({ page }) => {
    await signIn(page, { email, password, next: '/trading/mock' });

    const before = await api(page, 'GET', '/api/mock-portfolio');
    expect(before.status).toBe(200);
    const cashBefore = Number(before.body?.portfolio?.cash);

    /* A forged price: the server must ignore it (RET-10). */
    const buy = await api(page, 'POST', '/api/mock-trades', {
      ticker: 'AAPL',
      quantity: 1,
      trade_type: 'buy',
      price: 0.01,
      client_request_id: `e2e-${Date.now()}`,
    });
    expect(buy.status, JSON.stringify(buy.body)).toBeLessThan(300);

    const trades = await api(page, 'GET', '/api/mock-trades');
    expect(trades.status).toBe(200);
    const list = trades.body?.trades || trades.body?.data || trades.body || [];
    const last = (Array.isArray(list) ? list : []).find((t) => t.ticker === 'AAPL');
    const serverPrice = Number(buy.body?.trade?.price ?? buy.body?.price ?? last?.price);
    expect(serverPrice).toBeGreaterThan(1);

    const after = await api(page, 'GET', '/api/mock-portfolio');
    const cashAfter = Number(after.body?.portfolio?.cash);
    if (Number.isFinite(cashBefore) && Number.isFinite(cashAfter)) {
      const spent = cashBefore - cashAfter;
      expect(Math.abs(spent - serverPrice)).toBeLessThan(serverPrice * 0.02);
    } else {
      throw new Error('mock portfolio has no cash figure before/after the trade');
    }
  });

  test('community post with an image shows the image', async ({ page }) => {
    await signIn(page, { email, password, next: '/community' });
    await page.goto('/community');
    const text = `E2E image post ${Date.now()}`;
    await page.getByPlaceholder(/share a take/i).fill(text);
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'e2e.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });
    await page.getByRole('button', { name: /post take/i }).click();

    const post = page.locator('article, li, div').filter({ hasText: text }).last();
    await expect(post).toBeVisible({ timeout: 20_000 });
    await expect(post.locator('img[src*="community-images"]').first()).toBeVisible();
  });

  test('log out, then /home redirects to sign-in', async ({ page }) => {
    await signIn(page, { email, password, next: '/home' });
    await page.getByRole('button', { name: 'Log out' }).first().click();
    await page.waitForURL((u) => !u.pathname.startsWith('/home'), { timeout: 15_000 });
    await page.goto('/home');
    await expect(page).toHaveURL(/\/auth\/(signin|login)/);
  });
});
