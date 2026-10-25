#!/usr/bin/env node
/* QA PLAT-1 regression: with a Supabase client and a rate limiter that never
   answer, the middleware still returns well inside 2s, never hanging the
   request the way production did (58 kills at the platform's 25s limit).
   Usage: npm run test:middleware */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./middleware-test-loader.mjs', import.meta.url);
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://stub.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'stub';

const { NextRequest } = await import('next/server');
const { middleware } = await import('../src/middleware.js');

async function timed(url) {
  const t0 = Date.now();
  const res = await middleware(new NextRequest(url));
  return { res, ms: Date.now() - t0 };
}

test('a protected page answers in under 2s and sends the visitor to sign in', async () => {
  const { res, ms } = await timed('https://ezana.world/home');
  assert.ok(ms < 2000, `took ${ms}ms`);
  assert.ok([302, 307].includes(res.status), `status ${res.status}`);
  const loc = new URL(res.headers.get('location'));
  assert.equal(loc.pathname, '/auth/signin');
  assert.equal(loc.searchParams.get('redirect'), '/home');
  assert.equal(loc.searchParams.get('reason'), 'timeout');
});

test('an API route answers in under 2s and passes through to the route', async () => {
  const { res, ms } = await timed('https://ezana.world/api/watchlists');
  assert.ok(ms < 2000, `took ${ms}ms`);
  assert.ok(res.status < 300, `status ${res.status}`);
});

test('a partner page sends a signed-out visitor to the partner sign-in card (PAR-9)', async () => {
  const { res, ms } = await timed('https://ezana.world/partner-home');
  assert.ok(ms < 2000, `took ${ms}ms`);
  assert.equal(new URL(res.headers.get('location')).pathname, '/auth/partner/signin');
});

/* QA RET-15: API calls from an aal1 session are refused when MFA is enforced
   and the user has a verified factor. */
const { mfaRequired } = await import('../src/lib/api-guard.js');
const jwt = (claims) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;
const req = (claims) =>
  new NextRequest('https://ezana.world/api/watchlists', {
    headers: { authorization: `Bearer ${jwt(claims)}` },
  });
const withFactor = { id: 'u', factors: [{ status: 'verified' }] };

test('mfa: aal1 + verified factor + MFA_ENFORCED=true -> required', async () => {
  process.env.MFA_ENFORCED = 'true';
  assert.equal(await mfaRequired(req({ aal: 'aal1' }), withFactor), true);
  assert.equal(await mfaRequired(req({ aal: 'aal2' }), withFactor), false);
  assert.equal(await mfaRequired(req({ aal: 'aal1' }), { id: 'u', factors: [] }), false);
});

test('mfa: off unless MFA_ENFORCED is exactly "true"', async () => {
  delete process.env.MFA_ENFORCED;
  assert.equal(await mfaRequired(req({ aal: 'aal1' }), withFactor), false);
});
