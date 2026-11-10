/**
 * Smart Watchlist engine (Nov 2026), server only.
 *
 * For each enabled rule it gathers candidates for the rule's asset class,
 * keeps the ones that match (smart-rules.js), adds the best new matches to
 * the list (user_watchlist_items, added_by = 'smart'), records each add in
 * smart_watchlist_events, and drops one notification into
 * user_notifications (type 'watchlist', so it shows under the Watchlist
 * filter of the notifications panel).
 *
 * Candidate sources (all existing):
 *   stocks         the market screener (US, actively trading, non-ETF), plus
 *                  tickers traded by members of Congress when the rule asks
 *                  about congressional trades; quotes from the batch quote
 *   bond ETFs,     the fixed universes in asset-classes.js; quotes from the
 *   crypto,        batch quote (commodity futures from the commodity quote)
 *   commodities
 *   politicians    congress_members in office, with their congress_trades
 *
 * Every query runs on the service-role client and is scoped to the rule's
 * owner. Called by /api/cron/smart-watchlists (hourly) and by the smart
 * watchlist API (create, edit, Run now, preview).
 */
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { fetchFmpBatchQuotes } from '@/lib/trading/server-quote';
import {
  fetchCommodityQuotes,
  getAlphaVantageApiKey,
  isCommoditySymbol,
} from '@/lib/alpha-vantage';
import { mapSector } from '@/lib/research/sectorMap';
import { FIXED_UNIVERSE, displayTicker } from '@/lib/watchlist/asset-classes';
import {
  PER_RUN_CAP,
  describeRule,
  isDue,
  pickAdds,
  screenerParams,
  screenerSectors,
} from '@/lib/watchlist/smart-rules';

const FMP_STABLE = 'https://financialmodelingprep.com/stable';
const DAY = 86400000;

/** Per-run cache so many rules share one screener call, one quote call, one trades read. */
export function createRunContext() {
  return { screener: new Map(), quotes: new Map(), trades: new Map(), members: null };
}

const finite = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
const sideOf = (type) =>
  type === 'purchase' ? 'buy' : type === 'sale' || type === 'sale_partial' ? 'sell' : null;

/* ------------------------------------------------------------------ */
/* Market data                                                         */
/* ------------------------------------------------------------------ */

/** { SYMBOL: { price, changePct } } for any mix of equities, ETFs, crypto pairs and futures. */
export async function getQuotes(symbols, ctx = createRunContext()) {
  const want = [...new Set(symbols.filter(Boolean).map((s) => String(s).toUpperCase()))];
  const missing = want.filter((s) => !ctx.quotes.has(s));
  const commodities = missing.filter((s) => isCommoditySymbol(s));
  const rest = missing.filter((s) => !isCommoditySymbol(s));
  if (rest.length) {
    const fmp = await fetchFmpBatchQuotes(rest);
    for (const s of rest) {
      const q = fmp[s];
      ctx.quotes.set(
        s,
        q ? { price: finite(q.price), changePct: finite(q.changesPercentage) } : null,
      );
    }
  }
  if (commodities.length) {
    let cq = {};
    if (getAlphaVantageApiKey()) {
      try {
        cq = (await fetchCommodityQuotes(commodities)) || {};
      } catch {
        cq = {};
      }
    }
    for (const s of commodities) {
      const q = cq[s];
      ctx.quotes.set(s, q ? { price: finite(q.price), changePct: finite(q.changePercent) } : null);
    }
  }
  return Object.fromEntries(want.map((s) => [s, ctx.quotes.get(s) || null]));
}

/** Screener rows for one parameter set: [{ ticker, name, sector, marketCap, price }]. */
async function screen(params, ctx) {
  const key = JSON.stringify(params);
  if (ctx.screener.has(key)) return ctx.screener.get(key);
  const apikey = process.env.FMP_API_KEY || '';
  let rows = [];
  if (apikey) {
    try {
      const qs = new URLSearchParams({ ...params, apikey });
      const res = await fetchWithTimeout(
        `${FMP_STABLE}/company-screener?${qs}`,
        { cache: 'no-store' },
        10000,
      );
      const data = res.ok ? await res.json() : [];
      rows = (Array.isArray(data) ? data : [])
        .filter((r) => r?.symbol)
        .map((r) => ({
          ticker: String(r.symbol).toUpperCase(),
          name: r.companyName || r.name || String(r.symbol),
          sector: r.sector || null,
          marketCap: finite(r.marketCap),
          price: finite(r.price),
        }));
    } catch {
      rows = [];
    }
  }
  ctx.screener.set(key, rows);
  return rows;
}

/** Congress trades since `sinceDays` ago with each member's party: [{ bioguide, date, side, ticker, amount, party, chamber }]. */
async function congressTrades(admin, sinceDays, ctx) {
  const days = Math.min(365, Math.max(1, sinceDays));
  if (ctx.trades.has(days)) return ctx.trades.get(days);
  const members = await congressMembers(admin, ctx);
  const since = ymd(Date.now() - days * DAY);
  const out = [];
  const PAGE = 5000;
  for (let from = 0; from < 40000; from += PAGE) {
    const { data, error } = await admin
      .from('congress_trades')
      .select('bioguide_id, transaction_date, type, ticker, amount_max, amount_mid')
      .gte('transaction_date', since)
      .order('transaction_date', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data || []) {
      const side = sideOf(r.type);
      if (!side) continue;
      const m = members.get(r.bioguide_id);
      out.push({
        bioguide: r.bioguide_id,
        member: r.bioguide_id,
        date: String(r.transaction_date).slice(0, 10),
        side,
        ticker: r.ticker ? String(r.ticker).toUpperCase() : null,
        amount: finite(r.amount_max) ?? finite(r.amount_mid),
        party: m?.party || null,
        chamber: m?.chamber || null,
      });
    }
    if (!data || data.length < PAGE) break;
  }
  ctx.trades.set(days, out);
  return out;
}

async function congressMembers(admin, ctx) {
  if (ctx.members) return ctx.members;
  const { data, error } = await admin
    .from('congress_members')
    .select('bioguide_id, full_name, first_name, last_name, chamber, party, state, in_office');
  if (error) throw error;
  ctx.members = new Map(
    (data || []).map((m) => [
      m.bioguide_id,
      {
        bioguide: m.bioguide_id,
        name: m.full_name || [m.first_name, m.last_name].filter(Boolean).join(' '),
        chamber: m.chamber ? String(m.chamber).toLowerCase() : null,
        party: m.party || null,
        state: m.state || null,
        inOffice: m.in_office !== false,
      },
    ]),
  );
  return ctx.members;
}

const tradeDays = (rule, types) =>
  Math.max(0, ...rule.conditions.filter((c) => types.includes(c.type)).map((c) => c.days || 0));

/* ------------------------------------------------------------------ */
/* Candidates per class                                                */
/* ------------------------------------------------------------------ */

export async function loadCandidates(admin, rule, ctx = createRunContext()) {
  if (rule.asset_class === 'politician') return politicianCandidates(admin, rule, ctx);
  if (rule.asset_class === 'stock') return stockCandidates(admin, rule, ctx);
  return fixedCandidates(rule.asset_class, ctx);
}

async function fixedCandidates(assetClass, ctx) {
  const universe = FIXED_UNIVERSE[assetClass] || [];
  const quotes = await getQuotes(
    universe.map((u) => u.ticker),
    ctx,
  );
  return universe.map((u) => ({
    type: assetClass,
    ticker: u.ticker,
    name: u.name,
    sector: null,
    marketCap: null,
    price: quotes[u.ticker]?.price ?? null,
    changePct: quotes[u.ticker]?.changePct ?? null,
    trades: [],
  }));
}

async function stockCandidates(admin, rule, ctx) {
  const base = screenerParams(rule);
  const byTicker = new Map();
  for (const sector of screenerSectors(rule)) {
    const params = sector ? { ...base, sector: mapSector(sector)?.fmp || sector } : base;
    for (const r of await screen(params, ctx))
      if (!byTicker.has(r.ticker)) byTicker.set(r.ticker, r);
  }

  const days = tradeDays(rule, ['congress_traded']);
  const tradesByTicker = new Map();
  if (days > 0) {
    for (const t of await congressTrades(admin, days, ctx)) {
      if (!t.ticker) continue;
      if (!tradesByTicker.has(t.ticker)) tradesByTicker.set(t.ticker, []);
      tradesByTicker.get(t.ticker).push(t);
    }
    /* With 'all', a congressional condition narrows the universe to traded tickers. */
    const onlyTraded = rule.match === 'all';
    if (onlyTraded) {
      for (const k of [...byTicker.keys()]) if (!tradesByTicker.has(k)) byTicker.delete(k);
    }
    for (const tk of tradesByTicker.keys()) {
      if (!byTicker.has(tk) && /^[A-Z][A-Z.]{0,5}$/.test(tk)) {
        byTicker.set(tk, { ticker: tk, name: tk, sector: null, marketCap: null, price: null });
      }
    }
  }

  const list = [...byTicker.values()].slice(0, 800);
  const quotes = await getQuotes(
    list.map((r) => r.ticker),
    ctx,
  );
  return list.map((r) => ({
    type: 'stock',
    ticker: r.ticker,
    name: r.name,
    sector: r.sector,
    marketCap: r.marketCap,
    price: quotes[r.ticker]?.price ?? r.price ?? null,
    changePct: quotes[r.ticker]?.changePct ?? null,
    trades: tradesByTicker.get(r.ticker) || [],
  }));
}

async function politicianCandidates(admin, rule, ctx) {
  const members = await congressMembers(admin, ctx);
  const days = tradeDays(rule, ['trade_activity', 'traded_ticker', 'trade_size']);
  const tradesBy = new Map();
  if (days > 0) {
    for (const t of await congressTrades(admin, days, ctx)) {
      if (!tradesBy.has(t.bioguide)) tradesBy.set(t.bioguide, []);
      tradesBy.get(t.bioguide).push(t);
    }
  }
  return [...members.values()]
    .filter((m) => m.inOffice)
    .map((m) => ({
      type: 'politician',
      ticker: m.bioguide,
      name: m.name,
      party: m.party,
      chamber: m.chamber,
      state: m.state,
      trades: tradesBy.get(m.bioguide) || [],
    }));
}

/* ------------------------------------------------------------------ */
/* Preview and run                                                     */
/* ------------------------------------------------------------------ */

/** Matches a rule would add right now, without writing anything. */
export async function previewRule(
  admin,
  rule,
  { existing = new Set(), ctx = createRunContext() } = {},
) {
  const candidates = await loadCandidates(admin, rule, ctx);
  const matches = pickAdds(candidates, rule, { existing, room: PER_RUN_CAP });
  return {
    candidates: candidates.length,
    matches: matches.map((m) => ({
      type: m.type,
      ticker: m.ticker,
      display: displayTicker(m.ticker),
      name: m.name,
      price: m.price ?? null,
      changePct: m.changePct ?? null,
      reason: m.reason,
    })),
  };
}

const itemLabel = (m) => (m.type === 'politician' ? m.name : displayTicker(m.ticker));

/**
 * Run one rule: add new matches, log them, notify. `rule` is a row of
 * smart_watchlist_rules. Returns { added: [...], skipped?: string }.
 */
export async function runSmartRule(
  admin,
  rule,
  { ctx = createRunContext(), now = Date.now() } = {},
) {
  const stamp = new Date(now).toISOString();
  try {
    const { data: list, error: listErr } = await admin
      .from('user_watchlists')
      .select('id, label, user_id')
      .eq('id', rule.list_id)
      .eq('user_id', rule.user_id)
      .maybeSingle();
    if (listErr) throw listErr;
    if (!list) return { added: [], skipped: 'list_missing' };

    const [{ data: items, error: itemsErr }, { data: events, error: evErr }] = await Promise.all([
      admin
        .from('user_watchlist_items')
        .select('type, ticker, added_by')
        .eq('list_id', list.id)
        .eq('user_id', rule.user_id),
      admin
        .from('smart_watchlist_events')
        .select('item_type, ticker')
        .eq('list_id', list.id)
        .eq('user_id', rule.user_id),
    ]);
    if (itemsErr) throw itemsErr;
    if (evErr) throw evErr;

    const existing = new Set((items || []).map((i) => `${i.type}:${i.ticker}`));
    const seen = new Set((events || []).map((e) => `${e.item_type}:${e.ticker}`));
    const smartCount = (items || []).filter((i) => i.added_by === 'smart').length;
    const room = Math.max(0, rule.max_items - smartCount);

    let adds = [];
    if (room > 0) {
      const candidates = await loadCandidates(admin, rule, ctx);
      adds = pickAdds(candidates, rule, { existing, seen, room, now });
    }

    if (adds.length) {
      const { error: insErr } = await admin.from('user_watchlist_items').upsert(
        adds.map((m) => ({
          list_id: list.id,
          user_id: rule.user_id,
          type: m.type,
          ticker: m.ticker,
          name: m.name || m.ticker,
          sector: m.sector || null,
          metadata:
            m.type === 'politician'
              ? { party: m.party, chamber: m.chamber, state: m.state, source: 'smart' }
              : { source: 'smart' },
          added_by: 'smart',
          added_reason: m.reason,
        })),
        { onConflict: 'list_id,type,ticker', ignoreDuplicates: true },
      );
      if (insErr) throw insErr;

      const { error: logErr } = await admin.from('smart_watchlist_events').upsert(
        adds.map((m) => ({
          user_id: rule.user_id,
          list_id: list.id,
          rule_id: rule.id,
          item_type: m.type,
          ticker: m.ticker,
          name: m.name || m.ticker,
          reason: m.reason,
        })),
        { onConflict: 'list_id,item_type,ticker', ignoreDuplicates: true },
      );
      if (logErr) throw logErr;

      if (rule.notify) {
        const names = adds.slice(0, 5).map(itemLabel);
        const more = adds.length > 5 ? ` and ${adds.length - 5} more` : '';
        const { error: nErr } = await admin.from('user_notifications').insert({
          user_id: rule.user_id,
          type: 'watchlist',
          title: `${list.label}: ${adds.length} new ${adds.length === 1 ? 'match' : 'matches'}`,
          content: `Smart watchlist added ${names.join(', ')}${more}. Rule: ${describeRule(rule)}.`,
          read: false,
        });
        if (nErr) console.error('[smart-watchlist] notification failed:', nErr.message);
      }
    }

    await admin
      .from('smart_watchlist_rules')
      .update({ last_run_at: stamp, last_run_added: adds.length, last_error: null })
      .eq('id', rule.id);

    return {
      added: adds.map((m) => ({ type: m.type, ticker: m.ticker, name: m.name, reason: m.reason })),
    };
  } catch (err) {
    const message = String(err?.message || err).slice(0, 300);
    await admin
      .from('smart_watchlist_rules')
      .update({ last_run_at: stamp, last_error: message })
      .eq('id', rule.id);
    throw err;
  }
}

/** Cron: run every enabled rule that is due, oldest first, sharing one context. */
export async function runDueRules(admin, { limit = 200, now = Date.now() } = {}) {
  const { data, error } = await admin
    .from('smart_watchlist_rules')
    .select('*')
    .eq('enabled', true)
    .order('last_run_at', { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw error;
  const ctx = createRunContext();
  let ran = 0;
  let added = 0;
  let failed = 0;
  for (const rule of (data || []).filter((r) => isDue(r, now))) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const r = await runSmartRule(admin, rule, { ctx, now });
      ran += 1;
      added += r.added.length;
    } catch (err) {
      failed += 1;
      console.error('[smart-watchlist] rule failed', rule.id, err?.message || err);
    }
  }
  return { ran, added, failed };
}
