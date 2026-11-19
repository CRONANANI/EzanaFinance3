/**
 * Invite gate for Google and GitHub sign-in (Nov 2026). Sign-up is
 * invite-only, so a provider sign-in must never become a way round the
 * waitlist.
 *
 *   npm run test:oauth-gate
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyOAuthAccount } from '../src/lib/auth/oauth-gate.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const SOON = new Date(Date.now() + 86400000).toISOString();
const PAST = new Date(Date.now() - 86400000).toISOString();

/* A stand-in for the service-role client: just the calls the gate makes. */
function fakeAdmin({ user, profile = null, joined = [], invites = [] }) {
  return {
    auth: { admin: { getUserById: async () => ({ data: { user }, error: null }) } },
    from(table) {
      const q = { filters: {} };
      const api = {
        select: () => api,
        eq: (k, v) => ((q.filters[k] = v), api),
        limit: async () => {
          if (table !== 'waitlist') return { data: [] };
          if ('joined_user_id' in q.filters) return { data: joined };
          return {
            data: invites.filter(
              (r) => r.email === q.filters.email && r.status === q.filters.status,
            ),
          };
        },
        maybeSingle: async () => ({ data: table === 'profiles' ? profile : null }),
      };
      return api;
    },
  };
}
const oauthUser = (over = {}) => ({
  id: 'u1',
  email: 'Ada@Example.com',
  email_confirmed_at: PAST,
  app_metadata: { providers: ['google'] },
  identities: [{ provider: 'google' }],
  ...over,
});
const state = async (cfg) => (await classifyOAuthAccount(fakeAdmin(cfg), 'u1')).state;

test('an established account passes', async () => {
  assert.equal(await state({ user: oauthUser(), profile: { email_verified: true } }), 'verified');
  assert.equal(await state({ user: oauthUser(), joined: [{ id: 'w1' }] }), 'verified');
});

test('an unverified password account keeps its old path', async () => {
  const user = oauthUser({ app_metadata: { providers: ['email', 'google'] } });
  assert.equal(await state({ user, profile: { email_verified: false } }), 'legacy');
});

test('a provider-only account with a live approved invite may finish', async () => {
  const invites = [
    { id: 'w1', email: 'ada@example.com', status: 'approved', invite_expires_at: SOON },
  ];
  assert.equal(await state({ user: oauthUser(), invites }), 'invited');
});

test('no invite, an expired one, a pending one or an unproven email is refused', async () => {
  const row = (over) => [
    { id: 'w1', email: 'ada@example.com', status: 'approved', invite_expires_at: SOON, ...over },
  ];
  assert.equal(await state({ user: oauthUser() }), 'uninvited');
  assert.equal(
    await state({ user: oauthUser(), invites: row({ invite_expires_at: PAST }) }),
    'uninvited',
  );
  assert.equal(
    await state({ user: oauthUser(), invites: row({ status: 'pending' }) }),
    'uninvited',
  );
  assert.equal(
    await state({ user: oauthUser(), invites: row({ email: 'someone@else.com' }) }),
    'uninvited',
  );
  assert.equal(
    await state({ user: oauthUser({ email_confirmed_at: null }), invites: row({}) }),
    'uninvited',
  );
});

test('the gate is wired where an account could otherwise get in', () => {
  const cb = read('src/app/auth/callback/AuthCallbackClient.js');
  assert.match(cb, /\/api\/auth\/oauth-complete/);
  assert.match(cb, /uninvited[\s\S]{0,120}signOut/);
  const send = read('src/app/api/auth/send-verification/route.js');
  assert.match(send, /classifyOAuthAccount/);
  assert.match(send, /state === 'uninvited' \|\| state === 'invited'/);
  const route = read('src/app/api/auth/oauth-complete/route.js');
  assert.match(route, /requireUser\(request\)/);
  assert.match(route, /isTrue\(body\?\.ageConfirmed\)/);
  assert.doesNotMatch(route, /Math\.random/);
});

test('provider buttons only render for a provider that is switched on', () => {
  const b = read('src/components/auth/OAuthButtons.jsx');
  assert.match(b, /enabled\?\.\[p\.id\] === true/);
  assert.match(b, /redirectTo: `\$\{window\.location\.origin\}\/auth\/callback`/);
});
