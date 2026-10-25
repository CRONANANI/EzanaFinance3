#!/usr/bin/env node
/* QA RET-13: the brokerage open-account gate is computed server-side, not
   read from the browser-written profiles.checklist_completed flag.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-checklist-gate.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockSupabase } from './lib/mock-supabase.mjs';
import { checklistGate, doneTaskIds, gateMessage, TASK_IDS } from '@/lib/trading/checklist-gate';

const U = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const allDone = Object.fromEntries(TASK_IDS.map((id) => [id, true]));
const evidence = {
  user_watchlist_items: [{ id: 'w1', user_id: U }],
  mock_trades: [{ id: 't1', user_id: U }],
  user_course_progress: [{ id: 'c1', user_id: U, reading_complete: true, status: 'completed' }],
};

test('the flag alone does not open the gate', async () => {
  const db = createMockSupabase({
    seed: { profiles: [{ id: U, checklist_completed: true, checklist_progress: {} }] },
  });
  const g = await checklistGate(db, U);
  assert.equal(g.ok, false);
  assert.equal(g.missing.length, TASK_IDS.length);
});

test('unknown keys and non-true values do not count', () => {
  const forged = { ...Object.fromEntries(TASK_IDS.map((id) => [id, 'yes'])), extra_1: true };
  assert.deepEqual(doneTaskIds(forged), []);
  assert.deepEqual(doneTaskIds([true, true]), []);
});

test('every task marked done but no records behind them: still closed', async () => {
  const db = createMockSupabase({
    seed: { profiles: [{ id: U, checklist_progress: allDone }] },
  });
  const g = await checklistGate(db, U);
  assert.equal(g.ok, false);
  assert.deepEqual(g.missing.sort(), ['action_2', 'learning_1', 'learning_3', 'watchlist_1']);
  assert.match(gateMessage(g.missing), /^Complete these checklist tasks first: .+ and 1 more$/);
});

test('every task done and backed by records: open', async () => {
  const db = createMockSupabase({
    seed: { profiles: [{ id: U, checklist_progress: allDone }], ...evidence },
  });
  assert.deepEqual(await checklistGate(db, U), { ok: true, missing: [] });
});

test("another user's records do not count", async () => {
  const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const db = createMockSupabase({
    seed: {
      profiles: [{ id: U, checklist_progress: allDone }],
      user_watchlist_items: [{ id: 'w1', user_id: other }],
      mock_trades: [{ id: 't1', user_id: U }],
      user_course_progress: [{ id: 'c1', user_id: U, status: 'completed' }],
    },
  });
  assert.deepEqual(await checklistGate(db, U), { ok: false, missing: ['watchlist_1'] });
});
