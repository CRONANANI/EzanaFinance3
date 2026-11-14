/**
 * Mock Trading theses, server side (Nov 14 2026): the handlers behind
 * /api/mock-theses, PATCH /api/mock-trades/[id], the thesis stamp on a new
 * trade and the thesis fields on the trade log, driven with the in-memory
 * Supabase stand-in. Imported by scripts/check-mock-trading.mjs, so it runs
 * under  npm run test:mock-trading
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockSupabase } from './lib/mock-supabase.mjs';
import {
  createThesis,
  deleteThesis,
  getActiveThesisId,
  listTheses,
  updateThesis,
  updateTradeNote,
} from '../src/lib/trading/mock-theses-server.js';
import { executeMockTrade, freshPortfolio } from '../src/lib/trading/mock-portfolio.js';
import { listMockTrades } from '../src/lib/trading/mock-trades.js';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '33333333-3333-4333-8333-333333333333';
const SECTORS = ['Technology', 'Energy', 'Healthcare'];
const opts = { sectors: SECTORS };
let n = 0;
const uuid = () => `aaaaaaaa-aaaa-4aaa-8aaa-${String(++n).padStart(12, '0')}`;

const db = (seed = {}) =>
  createMockSupabase({
    unique: { mock_trades: [['user_id', 'client_request_id']], mock_portfolios: [['user_id']] },
    seed,
  });
/* The stand-in makes ids like "id-1"; give theses real uuids, as Postgres does. */
const create = async (client, userId, body) => {
  const r = await createThesis(client, userId, body, opts);
  if (r.status === 201) {
    const row = client.rows('mock_theses').find((t) => t.id === r.body.thesis.id);
    const id = uuid();
    row.id = id;
    r.body.thesis.id = id;
  }
  return r;
};

test('theses: the first is active, names are unique ignoring case, three at most', async () => {
  const c = db();
  const a = await create(c, ME, { name: 'AI Growth', sector_focus: ['technology'] });
  assert.equal(a.status, 201);
  assert.equal(a.body.thesis.is_active, true, 'the first thesis is activated');
  assert.deepEqual(a.body.thesis.sector_focus, ['Technology']);
  const dup = await create(c, ME, { name: '  ai   growth ' });
  assert.equal(dup.status, 409);
  assert.match(dup.body.error, /already have a thesis with that name/);
  const b = await create(c, ME, { name: 'Dividends' });
  assert.equal(b.body.thesis.is_active, false, 'later theses start inactive');
  await create(c, ME, { name: 'Macro' });
  const fourth = await create(c, ME, { name: 'One more' });
  assert.equal(fourth.status, 409);
  assert.match(fourth.body.error, /up to 3 theses/);
  assert.equal((await create(c, OTHER, { name: 'AI Growth' })).status, 201, 'per user');
  const bad = await create(c, ME, { name: 'X', is_active: true });
  assert.equal(bad.status, 400, 'a client flag is an unknown field');
  const list = await listTheses(c, ME);
  assert.equal(list.body.theses.length, 3);
  assert.equal(list.body.activeId, a.body.thesis.id);
});

test('theses: activate switches the one active row; edits validate; others get 404', async () => {
  const c = db();
  const a = (await create(c, ME, { name: 'A' })).body.thesis;
  const b = (await create(c, ME, { name: 'B' })).body.thesis;
  const r = await updateThesis(c, ME, b.id, { activate: true }, opts);
  assert.equal(r.status, 200);
  assert.equal(r.body.activeId, b.id);
  assert.equal(c.rows('mock_theses').filter((t) => t.user_id === ME && t.is_active).length, 1);
  assert.equal(await getActiveThesisId(c, ME), b.id);
  assert.equal(
    (await updateThesis(c, ME, b.id, { activate: true, name: 'Z' }, opts)).status,
    400,
    'activate goes alone',
  );
  const edit = await updateThesis(c, ME, a.id, { max_single_name_pct: '12.34' }, opts);
  assert.equal(edit.status, 200);
  assert.equal(edit.body.thesis.max_single_name_pct, 12.3);
  assert.equal((await updateThesis(c, ME, a.id, { name: 'b' }, opts)).status, 409);
  assert.equal((await updateThesis(c, ME, a.id, { sector_focus: ['Crypto'] }, opts)).status, 400);
  assert.equal((await updateThesis(c, OTHER, a.id, { name: 'Mine' }, opts)).status, 404);
  assert.equal((await updateThesis(c, OTHER, a.id, { activate: true }, opts)).status, 404);
  assert.equal((await updateThesis(c, ME, 'not-a-uuid', { name: 'Q' }, opts)).status, 404);
});

test('theses: deleting the active one activates the oldest left; others get 404', async () => {
  const c = db();
  const a = (await create(c, ME, { name: 'A' })).body.thesis;
  const b = (await create(c, ME, { name: 'B' })).body.thesis;
  assert.equal((await deleteThesis(c, OTHER, a.id)).status, 404);
  const r = await deleteThesis(c, ME, a.id);
  assert.equal(r.status, 200);
  assert.equal(r.body.activeId, b.id);
  const last = await deleteThesis(c, ME, b.id);
  assert.deepEqual(last.body, { theses: [], activeId: null });
});

test('trades: the server stamps the active thesis and keeps the note; the log names it', async () => {
  const c = db({
    mock_portfolios: [
      { user_id: ME, portfolio: freshPortfolio(10_000), updated_at: '2026-11-01T00:00:00.000Z' },
    ],
  });
  const t = (await create(c, ME, { name: 'AI Growth' })).body.thesis;
  const deps = { getQuote: async () => ({ price: 100 }), getActiveThesisId };
  const r = await executeMockTrade(
    c,
    ME,
    {
      ticker: 'NVDA',
      side: 'buy',
      amount: 1000,
      thesis_note: '  Adding on   the pullback ',
      thesis_id: 'spoofed',
    },
    deps,
  );
  assert.equal(r.status, 200);
  const [row] = c.rows('mock_trades');
  assert.equal(row.thesis_id, t.id, 'the server stamps the active thesis');
  assert.equal(row.thesis_note, 'Adding on the pullback');
  const long = await executeMockTrade(
    c,
    ME,
    { ticker: 'NVDA', side: 'buy', amount: 10, thesis_note: 'n'.repeat(281) },
    deps,
  );
  assert.equal(long.status, 400);
  assert.equal(c.rows('mock_trades').length, 1, 'a bad note logs nothing');

  const list = await listMockTrades(c, ME);
  assert.equal(list.body.trades[0].thesis_name, 'AI Growth');
  assert.equal(list.body.trades[0].thesis_note, 'Adding on the pullback');
});

test('trade note: { thesis_note } only, empty clears, 404 for another user', async () => {
  const id = uuid();
  const c = db({
    mock_trades: [{ id, user_id: ME, ticker: 'NVDA', thesis_note: 'old' }],
  });
  assert.equal((await updateTradeNote(c, OTHER, id, { thesis_note: 'x' })).status, 404);
  assert.equal((await updateTradeNote(c, ME, id, { thesis_note: 'x', price: 1 })).status, 400);
  assert.equal((await updateTradeNote(c, ME, id, { thesis_note: 'n'.repeat(281) })).status, 400);
  const r = await updateTradeNote(c, ME, id, { thesis_note: ' New  note ' });
  assert.equal(r.status, 200);
  assert.equal(c.rows('mock_trades')[0].thesis_note, 'New note');
  await updateTradeNote(c, ME, id, { thesis_note: '' });
  assert.equal(c.rows('mock_trades')[0].thesis_note, null, 'an empty note clears it');
});
