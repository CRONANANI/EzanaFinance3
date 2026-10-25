// @ts-check
/**
 * Shared helpers for the journey specs (QA Phase 8.4).
 *
 *   watchPage(test)   every test in the file collects console errors and
 *                     /api/ responses with status >= 500, and fails on any.
 *                     E2E_CONSOLE_IGNORE (a regex) can exempt known noise.
 *   signIn(page, …)   the standard /auth/signin form, then waits to leave it.
 */
const { expect } = require('@playwright/test');

const IGNORE = process.env.E2E_CONSOLE_IGNORE ? new RegExp(process.env.E2E_CONSOLE_IGNORE) : null;

function watchPage(test) {
  /** @type {WeakMap<import('@playwright/test').Page, string[]>} */
  const problems = new WeakMap();

  test.beforeEach(async ({ page }) => {
    const list = [];
    problems.set(page, list);
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (IGNORE && IGNORE.test(text)) return;
      list.push(`console: ${text}`);
    });
    page.on('pageerror', (err) => list.push(`pageerror: ${err.message}`));
    page.on('response', (res) => {
      const url = res.url();
      if (url.includes('/api/') && res.status() >= 500) {
        list.push(`api ${res.status()}: ${res.request().method()} ${url}`);
      }
    });
  });

  test.afterEach(async ({ page }) => {
    const list = problems.get(page) || [];
    expect(list, `console errors / failed /api/ calls:\n${list.join('\n')}`).toEqual([]);
  });
}

/**
 * Sign in through /auth/signin. `path` defaults to the retail form; partner
 * and org accounts can pass their own sign-in page.
 */
async function signIn(page, { email, password, next = '/home', path = '/auth/signin' }) {
  await page.goto(`${path}?redirect=${encodeURIComponent(next)}`);
  await page.getByLabel(/email/i).first().fill(email);
  await page
    .getByLabel(/password/i)
    .first()
    .fill(password);
  await page
    .getByRole('button', { name: /sign in|log in/i })
    .first()
    .click();
  await expect(page).not.toHaveURL(/\/auth\/(signin|login)/, { timeout: 15_000 });
}

/** JSON from an API call made with the page's cookies. */
async function api(page, method, url, data) {
  const res = await page.request.fetch(url, {
    method,
    data,
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status(), body };
}

/** A 1x1 PNG, for upload steps. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

module.exports = { watchPage, signIn, api, TINY_PNG };
