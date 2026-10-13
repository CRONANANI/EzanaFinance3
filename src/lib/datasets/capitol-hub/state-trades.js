/**
 * Capitol Watch hub: trades by state. SERVER ONLY. One read per window
 * (1 year, 3 years, all time) through hub_capitol_state_members; until that
 * function is applied the loader aggregates the rows itself, so deploy order
 * cannot break the card. Cached 15 minutes under `hubs`.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { configured, timed } from '@/lib/datasets/hub-data';
import { STATE_WINDOWS } from './state-windows';

const CACHE = { revalidate: 900, tags: ['hubs'] };

const num = (v) => (v == null ? 0 : Number(v) || 0);

/* Fallback when the SQL function is missing: the raw rows for the window,
   grouped here. 15k rows for three years; all time is 54k, read in pages. */
async function aggregateRows(admin, days) {
  const PAGE = 1000;
  const by = new Map();
  for (let from = 0; ; from += PAGE) {
    let q = admin
      .from('congress_trades_enriched')
      .select('state, bioguide_id, member_name, party, chamber, type, amount_mid, transaction_date')
      .not('state', 'is', null)
      .not('bioguide_id', 'is', null)
      .order('transaction_date', { ascending: false })
      .range(from, from + PAGE - 1);
    if (days) {
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      q = q.gte('transaction_date', since);
    }
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await timed(q);
    if (error) throw new Error(error.message);
    for (const r of data || []) {
      const k = `${r.state}|${r.bioguide_id}`;
      const m =
        by.get(k) ||
        by
          .set(k, {
            state: r.state,
            bioguide_id: r.bioguide_id,
            member_name: r.member_name,
            party: r.party,
            chamber: r.chamber,
            trades: 0,
            volume: 0,
            buys: 0,
            sells: 0,
            last_trade: null,
          })
          .get(k);
      m.trades += 1;
      m.volume += num(r.amount_mid);
      if (r.type === 'purchase') m.buys += 1;
      else if (r.type === 'sale' || r.type === 'sale_partial') m.sells += 1;
      if (!m.last_trade || r.transaction_date > m.last_trade) m.last_trade = r.transaction_date;
    }
    if (!data || data.length < PAGE) break;
  }
  return [...by.values()];
}

async function memberRows(days) {
  const admin = getAdminClient();
  const rpc = await timed(admin.rpc('hub_capitol_state_members', { p_days: days }));
  if (!rpc.error) return rpc.data || [];
  return aggregateRows(admin, days);
}

/* Members shaped for the card, then states rolled up from them. */
export function shapeStateTrades(rows) {
  return shape(rows);
}

function shape(rows) {
  const members = rows
    .map((r) => ({
      id: r.bioguide_id,
      name: r.member_name,
      party: r.party || null,
      chamber: r.chamber || null,
      state: r.state,
      trades: num(r.trades),
      volume: num(r.volume),
      buys: num(r.buys),
      sells: num(r.sells),
      last: r.last_trade || null,
    }))
    .sort((a, b) => b.trades - a.trades || b.volume - a.volume);
  const states = new Map();
  for (const m of members) {
    const s =
      states.get(m.state) ||
      states
        .set(m.state, { id: m.state, trades: 0, members: 0, volume: 0, d: 0, r: 0, i: 0 })
        .get(m.state);
    s.trades += m.trades;
    s.members += 1;
    s.volume += m.volume;
    if (m.party === 'D') s.d += m.trades;
    else if (m.party === 'R') s.r += m.trades;
    else s.i += m.trades;
  }
  const list = [...states.values()].sort((a, b) => b.trades - a.trades);
  return {
    states: list,
    members,
    totals: {
      trades: list.reduce((n, s) => n + s.trades, 0),
      members: members.length,
      volume: list.reduce((n, s) => n + s.volume, 0),
      states: list.length,
    },
  };
}

async function loadAll() {
  if (!configured()) return { windows: {}, empty: true };
  const loaded = await Promise.all(STATE_WINDOWS.map((w) => memberRows(w.days)));
  const windows = Object.fromEntries(STATE_WINDOWS.map((w, i) => [w.key, shape(loaded[i])]));
  const empty = !Object.values(windows).some((w) => w.members.length);
  return { windows, empty };
}
const cached = unstable_cache(loadAll, ['capitol-state-trades-v1'], CACHE);

/** { windows: { '1y'|'3y'|'all': { states, members, totals } }, empty } | { error }. */
export async function getStateTrades() {
  try {
    return await cached();
  } catch (e) {
    console.error('[capitol-hub] state trades', e?.message || e);
    return { windows: {}, error: true };
  }
}
