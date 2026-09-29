// @ts-check
/**
 * Auth gate: signed-out visitors never reach the app shell or see its nav,
 * every marketing Log in / Sign up goes through /auth/continue to the one
 * auth surface under /auth, and a signed-in visitor gets a chooser instead
 * of a silent drop into the app.
 */
const { test, expect } = require('@playwright/test');

/* The app top nav is the only nav with these entries. */
async function expectNoAppNav(page) {
  await expect(page.getByRole('link', { name: 'Watchlist', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Learning Center', exact: true })).toHaveCount(0);
}

test.describe('signed out', () => {
  test('visiting /sonar redirects to sign-in with the destination, no app nav', async ({
    page,
  }) => {
    await page.goto('/sonar');
    await expect(page).toHaveURL(/\/auth\/signin\?redirect=%2Fsonar/);
    await expectNoAppNav(page);
  });

  test('Sonar overlay "Sign up free" lands on the header\'s sign-up page, no app nav', async ({
    page,
  }) => {
    /* The overlay button's target. */
    await page.goto('/auth/continue?intent=signup&next=/sonar');
    await expect(page).toHaveURL(/\/auth\/signup\?redirect=%2Fsonar/);
    await expectNoAppNav(page);

    /* The same page the header reaches: Login, then Create an account. */
    await page.goto('/auth/continue');
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('a[href^="/auth/signup"]').first()).toBeVisible();
  });

  test('Sonar overlay "Log in" lands on sign-in with the destination', async ({ page }) => {
    await page.goto('/auth/continue?next=/sonar');
    await expect(page).toHaveURL(/\/auth\/signin\?redirect=%2Fsonar/);
    await expectNoAppNav(page);
  });

  test('legacy /signup and /signin forward to the auth pages', async ({ page }) => {
    await page.goto('/signup?next=/sonar');
    await expect(page).toHaveURL(/\/auth\/signup\?redirect=%2Fsonar/);
    await page.goto('/signin?next=/sonar');
    await expect(page).toHaveURL(/\/auth\/signin\?redirect=%2Fsonar/);
  });
});

test.describe('signed in', () => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  test.skip(!email || !password, 'set E2E_EMAIL and E2E_PASSWORD for a verified test account');

  async function signIn(page, next = '/sonar') {
    await page.goto(`/auth/signin?redirect=${encodeURIComponent(next)}`);
    await page.getByLabel(/email/i).first().fill(email);
    await page
      .getByLabel(/password/i)
      .first()
      .fill(password);
    await page
      .getByRole('button', { name: /sign in|log in/i })
      .first()
      .click();
  }

  test('after sign-in with redirect=/sonar the user lands on /sonar', async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/sonar/);
  });

  test('marketing Log in shows the chooser with three options', async ({ page }) => {
    await signIn(page);
    await page.goto('/auth/continue?next=/sonar');
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByRole('link', { name: /continue as/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use a different account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create a new account' })).toBeVisible();
  });

  test('"Use a different account" clears the session and lands on sign-in', async ({ page }) => {
    await signIn(page);
    await page.goto('/auth/continue?next=/sonar');
    await page.getByRole('button', { name: 'Use a different account' }).click();
    await expect(page).toHaveURL(/\/auth\/signin\?redirect=%2Fsonar/);
    await page.goto('/sonar');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
