// @ts-check
/**
 * Org journeys (QA Phase 8.4).
 *
 * Executive (E2E_ORG_EXEC_EMAIL / E2E_ORG_EXEC_PASSWORD): create an invite;
 *   the response carries a copyable link. The invite goes to
 *   E2E_ORG_INVITE_EMAIL (an inbox you own on the org's domain: creating an
 *   invite may send a real email) and is revoked at the end.
 * Analyst (E2E_ORG_ANALYST_EMAIL / E2E_ORG_ANALYST_PASSWORD): open the
 *   assignment board, submit an assignment that targets them through a
 *   cohort/team/role (not assigned_to) → 201 (ORG-4); /partner-dashboard
 *   sends them away.
 *
 * E2E_ORG_SIGNIN_PATH overrides the sign-in page (default /auth/org-login).
 * Each block skips without its env vars. Every test fails on console errors
 * or /api/ 5xx.
 */
const { test, expect } = require('@playwright/test');
const { watchPage, signIn, api } = require('./helpers');

const signInPath = process.env.E2E_ORG_SIGNIN_PATH || '/auth/org-login';

test.describe('org executive', () => {
  const email = process.env.E2E_ORG_EXEC_EMAIL;
  const password = process.env.E2E_ORG_EXEC_PASSWORD;
  const inviteEmail = process.env.E2E_ORG_INVITE_EMAIL;
  test.skip(
    !email || !password || !inviteEmail,
    'set E2E_ORG_EXEC_EMAIL, E2E_ORG_EXEC_PASSWORD and E2E_ORG_INVITE_EMAIL',
  );
  test.describe.configure({ timeout: 60_000 });
  watchPage(test);

  test('creating an invite returns a link', async ({ page }) => {
    await signIn(page, { email, password, next: '/org-team-hub', path: signInPath });
    const { status, body } = await api(page, 'POST', '/api/org/invites', {
      email: inviteEmail,
      role: 'analyst',
    });
    expect(status, JSON.stringify(body)).toBe(201);
    const invite = body?.invite;
    expect(invite?.id).toBeTruthy();
    const link = body?.link || body?.inviteUrl || invite?.link || null;
    if (link) {
      expect(String(link)).toMatch(/invite=/);
    } else {
      /* The client builds the link from the token. */
      expect(String(invite?.token || '')).not.toHaveLength(0);
    }

    /* Clean up: revoke it. */
    const del = await api(page, 'DELETE', `/api/org/invites/${invite.id}`);
    expect(del.status).toBeLessThan(300);
  });
});

test.describe('org analyst', () => {
  const email = process.env.E2E_ORG_ANALYST_EMAIL;
  const password = process.env.E2E_ORG_ANALYST_PASSWORD;
  test.skip(!email || !password, 'set E2E_ORG_ANALYST_EMAIL and E2E_ORG_ANALYST_PASSWORD');
  test.describe.configure({ timeout: 60_000 });
  watchPage(test);

  test.beforeEach(async ({ page }) => {
    await signIn(page, { email, password, next: '/org-team-hub', path: signInPath });
  });

  test('assignment board loads and a group-targeted assignment can be submitted', async ({
    page,
  }) => {
    await page.goto('/org-team-hub/assignments');
    await expect(page).toHaveURL(/\/org-team-hub\/assignments/);

    const { status, body } = await api(page, 'GET', '/api/org/assignments');
    expect(status).toBe(200);
    const me = body?.viewer?.userId;
    const target = (body?.assignments || []).find(
      (a) =>
        a.mine &&
        !a.archived &&
        a.assigned_to !== me &&
        (a.assignee_targets || []).some((t) =>
          ['cohort', 'team', 'role', 'tier'].includes(t.target_type),
        ),
    );
    test.skip(!target, 'the analyst has no open cohort/team/role-targeted assignment to submit');

    const sub = await api(page, 'POST', `/api/org/assignments/${target.id}/submissions`, {
      note: `E2E submission ${new Date().toISOString()}`,
    });
    expect(sub.status, JSON.stringify(sub.body)).toBe(201);
  });

  test('/partner-dashboard redirects an analyst away', async ({ page }) => {
    await page.goto('/partner-dashboard');
    await expect(page).not.toHaveURL(/\/partner-dashboard/);
  });
});
