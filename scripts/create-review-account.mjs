#!/usr/bin/env node
/**
 * Create or reset the App Store / Google Play review account. Run LOCALLY:
 *
 *   REVIEW_ACCOUNT_PASSWORD='<strong password>' node scripts/create-review-account.mjs
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * The password comes only from the environment and is never written anywhere.
 *
 * Result: appreview@ezana.world, email verified, past the waitlist (marked
 * joined), onboarding complete, community terms accepted, a paper portfolio
 * with a few positions and trades, and two watchlists. Running it again
 * resets the password and the sample data to the same state.
 *
 * Positions are recorded at fixed cost prices for the reviewer to see; the
 * app prices them live like any paper portfolio.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnv('.env.local');

const EMAIL = 'appreview@ezana.world';
const password = process.env.REVIEW_ACCOUNT_PASSWORD;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (!password || password.length < 12) {
  console.error('Set REVIEW_ACCOUNT_PASSWORD (at least 12 characters) in the environment.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function findUser(email) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 1000) return null;
  }
  return null;
}

const must = (label, { error }) => {
  if (error) throw new Error(`${label}: ${error.message}`);
};

const POSITIONS = [
  { symbol: 'AAPL', name: 'Apple Inc.', qty: 40, avgCost: 210 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', qty: 20, avgCost: 420 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', qty: 30, avgCost: 120 },
  { symbol: 'LMT', name: 'Lockheed Martin Corporation', qty: 10, avgCost: 460 },
];
const WATCHLISTS = [
  { label: 'Big tech', tickers: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'] },
  { label: 'Defense contractors', tickers: ['LMT', 'RTX', 'NOC', 'GD'] },
];

async function main() {
  let user = await findUser(EMAIL);
  if (user) {
    must(
      'update user',
      await db.auth.admin.updateUserById(user.id, { password, email_confirm: true }),
    );
    console.log('Reset existing review account', user.id);
  } else {
    const r = await db.auth.admin.createUser({
      email: EMAIL,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'App Review',
        first_name: 'App',
        last_name: 'Review',
        username: 'appreview',
      },
    });
    must('create user', r);
    user = r.data.user;
    console.log('Created review account', user.id);
  }
  const now = new Date().toISOString();

  must(
    'profile',
    await db.from('profiles').upsert(
      {
        id: user.id,
        username: 'appreview',
        full_name: 'App Review',
        email_verified: true,
        onboarding_completed: true,
        community_terms_accepted_at: now,
        updated_at: now,
      },
      { onConflict: 'id' },
    ),
  );

  // Past the waitlist: a joined entry tied to this user.
  const { data: wl } = await db.from('waitlist').select('id').eq('email', EMAIL).maybeSingle();
  const wlRow = {
    email: EMAIL,
    full_name: 'App Review',
    status: 'joined',
    approved_at: now,
    approved_by: 'create-review-account',
    joined_at: now,
    joined_user_id: user.id,
    invite_token_hash: null,
  };
  must(
    'waitlist',
    wl
      ? await db.from('waitlist').update(wlRow).eq('id', wl.id)
      : await db.from('waitlist').insert(wlRow),
  );

  // Paper portfolio.
  const positions = {};
  const history = [];
  let invested = 0;
  const day = 86400000;
  POSITIONS.forEach((p, i) => {
    const ts = new Date(Date.now() - (POSITIONS.length - i) * 7 * day).toISOString();
    positions[p.symbol] = {
      symbol: p.symbol,
      name: p.name,
      type: 'stock',
      qty: p.qty,
      avgCost: p.avgCost,
      currentPrice: p.avgCost,
      openedAt: ts,
    };
    const total = p.qty * p.avgCost;
    invested += total;
    history.unshift({
      id: i + 1,
      side: 'buy',
      symbol: p.symbol,
      qty: p.qty,
      price: p.avgCost,
      total,
      ts,
    });
  });
  const portfolio = {
    cash: 100_000 - invested,
    positions,
    history,
    startingCash: 100_000,
  };
  must('clear trades', await db.from('mock_trades').delete().eq('user_id', user.id));
  must(
    'trades',
    await db.from('mock_trades').insert(
      history.map((h) => ({
        user_id: user.id,
        ticker: h.symbol,
        quantity: h.qty,
        price: h.price,
        trade_type: 'buy',
        total_amount: h.total,
        created_at: h.ts,
      })),
    ),
  );
  must(
    'portfolio',
    await db
      .from('mock_portfolios')
      .upsert({ user_id: user.id, portfolio, updated_at: now }, { onConflict: 'user_id' }),
  );

  // Two watchlists.
  must(
    'clear watchlist items',
    await db.from('user_watchlist_items').delete().eq('user_id', user.id),
  );
  must('clear watchlists', await db.from('user_watchlists').delete().eq('user_id', user.id));
  for (const [i, wlDef] of WATCHLISTS.entries()) {
    const r = await db
      .from('user_watchlists')
      .insert({ user_id: user.id, label: wlDef.label, sort_order: i })
      .select('id')
      .single();
    must(`watchlist ${wlDef.label}`, r);
    must(
      `watchlist items ${wlDef.label}`,
      await db.from('user_watchlist_items').insert(
        wlDef.tickers.map((ticker) => ({
          list_id: r.data.id,
          user_id: user.id,
          type: 'stock',
          ticker,
        })),
      ),
    );
  }

  console.log(`Ready: ${EMAIL} (password from REVIEW_ACCOUNT_PASSWORD).`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
