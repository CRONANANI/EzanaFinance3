/**
 * The realized returns job (Nov 21 2026). SERVER ONLY. Run by
 * /api/cron/politician-realized-returns, hourly.
 *
 *   1. Read every listed purchase and sale (congress_trades) and match each purchase to the
 *      member's next sale of the same asset (realizedPairs).
 *   2. Price the realized trades not priced yet, newest purchases first, ticker by ticker,
 *      until the time budget runs out: one close series per ticker covers all its trades.
 *      Each is stored once in politician_realized_trades ('no_price' when no feed had the
 *      ticker; retried after a week).
 *   3. Rebuild politician_realized_returns for every Tracker period from the stored trades.
 *
 * Incremental by design: the first runs work through the backlog (about 3,700 tickers since
 * 2014); after that a run only prices the new realized trades.
 */
import { getAdminClient } from '@/lib/supabase';
import { getDailyBars } from '@/lib/prices/daily-bars';
import { PERIODS } from './tracker-model';
import { realizedPairs, closeOnOrAfter, memberRealized, windowStartDays } from './realized-returns';

const PAGE = 1000;
const CONCURRENCY = 8;
const RETRY_NO_PRICE_DAYS = 7;

async function readAll(admin, table, columns, build = (q) => q) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(admin.from(table).select(columns))
      .order(table === 'congress_trades' ? 'id' : 'purchase_id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export async function runRealizedReturnsJob({ budgetMs = 230_000, now = new Date() } = {}) {
  const started = Date.now();
  const admin = getAdminClient();
  if (!admin) throw new Error('no admin client');

  const trades = await readAll(
    admin,
    'congress_trades',
    'id, bioguide_id, type, transaction_date, amount_min, amount_mid, ticker, asset_name',
    (q) => q.in('type', ['purchase', 'sale', 'sale_partial']).not('ticker', 'is', null),
  );
  const pairs = realizedPairs(trades).filter((p) => p.id != null && p.bioguide);

  const stored = await readAll(
    admin,
    'politician_realized_trades',
    'purchase_id, sell_date, status, priced_at',
  );
  const have = new Map(stored.map((r) => [Number(r.purchase_id), r]));
  const retryBefore = new Date(now.getTime() - RETRY_NO_PRICE_DAYS * 86400000).toISOString();
  const pending = pairs.filter((p) => {
    const r = have.get(Number(p.id));
    if (!r) return true;
    if (String(r.sell_date).slice(0, 10) !== p.sellDate) return true;
    return r.status === 'no_price' && String(r.priced_at) < retryBefore;
  });

  /* Ticker by ticker, the ticker with the newest pending purchase first. */
  const byTicker = new Map();
  for (const p of pending) {
    if (!byTicker.has(p.ticker)) byTicker.set(p.ticker, []);
    byTicker.get(p.ticker).push(p);
  }
  const queue = [...byTicker.entries()].sort((a, b) => {
    const na = a[1].reduce((m, p) => (p.buyDate > m ? p.buyDate : m), '');
    const nb = b[1].reduce((m, p) => (p.buyDate > m ? p.buyDate : m), '');
    return na < nb ? 1 : na > nb ? -1 : 0;
  });

  let pricedTickers = 0;
  const rowsOut = [];
  const worker = async () => {
    while (queue.length && Date.now() - started < budgetMs) {
      const [ticker, list] = queue.shift();
      const first = list.reduce((m, p) => (p.buyDate < m ? p.buyDate : m), list[0].buyDate);
      let candles = [];
      try {
        candles = (await getDailyBars(ticker, first)).candles || [];
      } catch {
        candles = [];
      }
      pricedTickers += 1;
      for (const p of list) {
        const b = candles.length ? closeOnOrAfter(candles, p.buyDate) : null;
        const s = candles.length ? closeOnOrAfter(candles, p.sellDate) : null;
        const ok = b && s && b.close > 0 && s.close > 0;
        rowsOut.push({
          purchase_id: p.id,
          bioguide_id: p.bioguide,
          ticker,
          buy_date: p.buyDate,
          sell_date: p.sellDate,
          weight: p.weight,
          buy_close: ok ? b.close : null,
          sell_close: ok ? s.close : null,
          pct: ok ? (s.close / b.close - 1) * 100 : null,
          status: ok ? 'ok' : 'no_price',
          priced_at: new Date().toISOString(),
        });
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  for (let i = 0; i < rowsOut.length; i += 500) {
    const { error } = await admin
      .from('politician_realized_trades')
      .upsert(rowsOut.slice(i, i + 500), { onConflict: 'purchase_id' });
    if (error) throw new Error(`upsert trades: ${error.message}`);
  }

  /* Rebuild the per-period figures from every priced realized trade. */
  const priced = await readAll(
    admin,
    'politician_realized_trades',
    'purchase_id, bioguide_id, ticker, buy_date, sell_date, weight, pct',
    (q) => q.eq('status', 'ok'),
  );
  const rows = priced.map((r) => ({
    bioguide: r.bioguide_id,
    ticker: r.ticker,
    buyDate: String(r.buy_date).slice(0, 10),
    sellDate: String(r.sell_date).slice(0, 10),
    weight: Number(r.weight) || 1001,
    pct: Number(r.pct),
  }));
  const computedAt = new Date().toISOString();
  const summary = {};
  for (const period of PERIODS) {
    const from = windowStartDays(period.days, now);
    const inWindow = from ? rows.filter((r) => r.buyDate >= from) : rows;
    const byMember = memberRealized(inWindow);
    const upserts = Object.entries(byMember).map(([id, v]) => ({
      bioguide_id: id,
      period: period.value,
      pct: v.pct == null ? null : Math.round(v.pct * 100) / 100,
      trades: v.trades,
      wins: v.wins,
      amount: Math.round(v.amount),
      computed_at: computedAt,
    }));
    const del = await admin.from('politician_realized_returns').delete().eq('period', period.value);
    if (del.error) throw new Error(`clear ${period.value}: ${del.error.message}`);
    for (let i = 0; i < upserts.length; i += 500) {
      const { error } = await admin
        .from('politician_realized_returns')
        .upsert(upserts.slice(i, i + 500), { onConflict: 'bioguide_id,period' });
      if (error) throw new Error(`upsert ${period.value}: ${error.message}`);
    }
    summary[period.value] = upserts.length;
  }

  return {
    pairs: pairs.length,
    pending: pending.length,
    pricedTickers,
    tickersLeft: queue.length,
    stored: rowsOut.length,
    members: summary,
    ms: Date.now() - started,
  };
}
