// Owner push notifications (Nov 23 2026): ntfy calls for a new trial and a waitlist sign-up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { notifyOwner, notifyTrialStarted, notifyWaitlistJoined } =
  await import('../src/lib/notify/owner-push.js');

function capture() {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, ...init });
    return { ok: true, status: 200 };
  };
  return calls;
}

test('no topic: does nothing', async () => {
  delete process.env.OWNER_NTFY_TOPIC;
  const calls = capture();
  assert.equal(await notifyOwner({ title: 'x', message: 'y' }), false);
  assert.equal(calls.length, 0);
});

test('trial and waitlist messages', async () => {
  process.env.OWNER_NTFY_TOPIC = 'ezana-test-topic';
  const calls = capture();
  await notifyTrialStarted({
    email: 'a@b.com',
    name: 'Ana Lee',
    plan: 'advanced',
    billing: 'quarterly',
  });
  await notifyWaitlistJoined({
    name: 'Zoë Tremblay',
    email: 'z@c.com',
    role: 'Student',
    organization: 'McGill',
    plan: 'starter',
    billing: 'yearly',
  });
  assert.equal(calls[0].url, 'https://ntfy.sh/ezana-test-topic');
  assert.equal(calls[0].headers.Title, 'New Advanced free trial');
  assert.match(calls[0].body, /a@b\.com\nQuarterly billing/);
  assert.equal(calls[1].headers.Title, 'New waitlist sign-up');
  assert.match(calls[1].body, /^Zoë Tremblay\nz@c\.com\nStudent, McGill\nPlan: starter, Yearly$/);
});

test('a failing ntfy never throws', async () => {
  process.env.OWNER_NTFY_TOPIC = 't';
  globalThis.fetch = async () => {
    throw new Error('network down');
  };
  assert.equal(await notifyOwner({ title: 'x', message: 'y' }), false);
});

test('wired into the Stripe webhook trial path and the waitlist route', () => {
  assert.match(
    readFileSync('src/lib/billing/stripe-webhook.js', 'utf8'),
    /await notifyTrialStarted\(/,
  );
  assert.match(
    readFileSync('src/app/api/waitlist/route.js', 'utf8'),
    /await notifyWaitlistJoined\(/,
  );
});
