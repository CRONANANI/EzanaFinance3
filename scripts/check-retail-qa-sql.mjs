#!/usr/bin/env node
/* QA remediation (Retail-B): the Retail-B migrations against a real local
   Postgres (scripts/lib/pg-harness.mjs). Loads a stub of the live objects the
   migrations touch, with the live pre-migration policies, then checks:
   idempotency, community-images owner-folder writes, the private documents
   bucket, owner-SELECT-only gamification tables, and quoted_post_id.
   Skips when no Postgres binaries are installed (CI).
   Usage: node --no-warnings --test scripts/check-retail-qa-sql.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { startPg } from './lib/pg-harness.mjs';
import { RETAIL_STUB } from './lib/retail-qa-stub.mjs';

const MIG_DIR = new URL('../supabase/migrations/', import.meta.url).pathname;
const MIGRATIONS = [
  '20261026110000_storage_buckets_community_documents.sql',
  '20261026130000_server_only_gamification_writes.sql',
  '20261026131000_community_quoted_post.sql',
].map((f) => path.join(MIG_DIR, f));

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';

let pg = null;
test.before(async () => {
  pg = await startPg({ migrations: MIGRATIONS, extraSchema: RETAIL_STUB });
});
test.after(() => pg?.stop());

const skip = (t) => {
  if (!pg) t.skip('no local Postgres');
  return !pg;
};

/* Run `stmt` as authenticated user `uid`; returns { ok, err }. */
function asUser(uid, stmt) {
  try {
    const out = pg.sql(
      `begin; set local role authenticated;
       set local request.jwt.claims = '{"sub":"${uid}","role":"authenticated"}';
       ${stmt}; commit;`,
    );
    return { ok: true, out };
  } catch (e) {
    return { ok: false, err: String(e.stderr || e.message) };
  }
}

test('Retail-B migrations apply twice (idempotent)', (t) => {
  if (skip(t)) return;
  for (const m of MIGRATIONS) pg.file(m);
});

test('community-images: owner folder insert only; documents bucket has no user access', (t) => {
  if (skip(t)) return;
  const b = pg.sql(`select id || ':' || public from storage.buckets order by id`);
  assert.match(b, /community-images:t/);
  assert.match(b, /documents:f/);
  assert.ok(
    asUser(
      U1,
      `insert into storage.objects (bucket_id, name) values ('community-images', '${U1}/1-a.png')`,
    ).ok,
  );
  assert.ok(
    !asUser(
      U1,
      `insert into storage.objects (bucket_id, name) values ('community-images', '${U2}/1-a.png')`,
    ).ok,
  );
  assert.ok(
    !asUser(
      U1,
      `insert into storage.objects (bucket_id, name) values ('community-images', 'community/${U1}/1.png')`,
    ).ok,
  );
  assert.ok(
    !asUser(
      U1,
      `insert into storage.objects (bucket_id, name) values ('documents', '${U1}/id.pdf')`,
    ).ok,
  );
});

test('gamification tables: owner can read but not write', (t) => {
  if (skip(t)) return;
  pg.sql(`insert into auth.users (id) values ('${U1}') on conflict do nothing;
          insert into public.mock_portfolios (user_id, portfolio) values ('${U1}', '{"cash":1}')
            on conflict (user_id) do nothing;`);
  const read = asUser(U1, `select count(*) from public.mock_portfolios where user_id = '${U1}'`);
  assert.ok(read.ok);
  assert.match(read.out, /1/);
  for (const stmt of [
    `update public.mock_portfolios set portfolio = '{"cash":1e12}' where user_id = '${U1}'`,
    `insert into public.mock_trades (user_id, ticker, quantity, price, trade_type) values ('${U1}', 'AAPL', 1, 0.01, 'buy')`,
    `insert into public.user_course_progress (user_id, course_id, status, quiz_passed) values ('${U1}', 'x', 'completed', true)`,
    `insert into public.user_learning_badges (user_id, badge_key) values ('${U1}', 'stocks_level_expert')`,
  ]) {
    const r = asUser(U1, stmt);
    // An UPDATE with no visible-for-update rows succeeds with 0 rows; check the value instead.
    if (stmt.startsWith('update')) continue;
    assert.ok(!r.ok, stmt);
  }
  assert.equal(
    pg.sql(`select portfolio->>'cash' from public.mock_portfolios where user_id = '${U1}'`),
    '1',
  );
});

test('community_posts.quoted_post_id references a post and nulls on delete', (t) => {
  if (skip(t)) return;
  const out = pg.sql(`
    insert into public.community_posts (id, user_id, content)
      values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '${U1}', 'original');
    insert into public.community_posts (id, user_id, content, quoted_post_id)
      values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '${U1}', 'quote', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    delete from public.community_posts where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    select coalesce(quoted_post_id::text, 'null') from public.community_posts
      where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';`);
  assert.equal(out, 'null');
});
