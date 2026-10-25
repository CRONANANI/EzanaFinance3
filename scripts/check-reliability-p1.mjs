#!/usr/bin/env node
/* Reliability audit P1: the JS halves of the competition claim and the
   Sonar reservation (the SQL halves run in check-reliability-sql.mjs).
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-reliability-p1.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockSupabase } from './lib/mock-supabase.mjs';
import { scoreCompetition } from '../src/lib/competition-scoring.js';
import { reservePing, completePing, failPing } from '../src/lib/sonar/quota.js';

test('competition: 10 parallel scorers, one claims and scores', async () => {
  const db = createMockSupabase({
    seed: { competitions: [{ id: 'c1', name: 'C', status: 'ended' }] },
    rpc: {
      claim_competition_scoring({ p_id }, { rows }) {
        const c = rows('competitions').find((r) => r.id === p_id);
        if (!c || !['active', 'ended', 'score_failed'].includes(c.status)) return [];
        c.status = 'scoring';
        return [{ ...c }];
      },
    },
  });
  const res = await Promise.all(
    Array.from({ length: 10 }, () => scoreCompetition(db, { id: 'c1', status: 'ended' })),
  );
  assert.equal(res.filter((r) => !r.skipped).length, 1);
  assert.equal(db.rows('competitions')[0].status, 'scored');
});

test('sonar: reservePing maps the RPC result; complete/fail touch only the reserved row', async () => {
  let n = 0;
  const db = createMockSupabase({
    rpc: {
      reserve_sonar_ping({ p_limit }, { rows }) {
        const used = rows('sonar_queries').length;
        if (used >= p_limit) return [{ id: null, reason: 'quota', used }];
        const id = `p${++n}`;
        rows('sonar_queries').push({ id, status: 'reserved' });
        return [{ id, reason: null, used }];
      },
    },
  });
  const out = await Promise.all(
    Array.from({ length: 5 }, () =>
      reservePing(db, { userId: 'u', limit: 2, query: 'q', version: 'regular' }),
    ),
  );
  assert.equal(out.filter((r) => r.ok).length, 2);
  assert.equal(out.find((r) => !r.ok).reason, 'quota');
  const [a, b] = out.filter((r) => r.ok);
  await completePing(db, a, { classification: 'x', datasets_searched: ['d'], grounded: true });
  await failPing(db, b);
  const rows = db.rows('sonar_queries');
  assert.deepEqual(
    rows.map((r) => r.status),
    ['completed'],
  );
});

test('sonar: without the RPC (migration not applied) it falls back to count-then-log', async () => {
  const db = createMockSupabase({ seed: { sonar_queries: [] } });
  const r = await reservePing(db, { userId: 'u', limit: 1, query: 'q', version: 'regular' });
  assert.equal(r.ok, true);
  assert.equal(r.legacy, true);
  await completePing(db, r, { classification: 'c', datasets_searched: [], grounded: false });
  assert.equal(db.rows('sonar_queries').length, 1);
});

test('sonar: a ledger error refuses the ping rather than spending unmetered', async () => {
  const db = createMockSupabase();
  db.rpc = async () => ({ data: null, error: { code: '57014', message: 'timeout' } });
  const r = await reservePing(db, { userId: 'u', limit: 5, query: 'q' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'error');
});
