// src/lib/quants/event-sources.js
// SERVER ONLY. Reads disclosure events for the Quant Lab from the platform's
// own tables. Every event is dated by the day it became PUBLIC:
//
//   congress trades    congress_trades.disclosure_date  (not transaction_date)
//   insider trades     sec_insider_transactions.filed_at (not transaction_date)
//
// Rows with no public date are never used: guessing one would let a backtest
// act on information before anyone could have seen it.
import { getUserClient } from '@/lib/supabase';
import { cleanTicker, specEventKinds } from '@/lib/quants/strategy-spec';

const PAGE = 1000;
/** Rows an event study reads at most, newest first. */
const STUDY_PAGES = 10;

/** Datasets the event-study tool offers, and how each maps to a table. */
export const EVENT_DATASETS = {
  congress_buy: { label: 'Congress purchases', source: 'congress', types: ['purchase'] },
  congress_sell: { label: 'Congress sales', source: 'congress', types: ['sale', 'sale_partial'] },
  insider_purchase: { label: 'Insider open-market purchases', source: 'insider', code: 'P' },
  insider_sale: { label: 'Insider open-market sales', source: 'insider', code: 'S' },
};

function baseQuery(supabase, def, from, to) {
  if (def.source === 'congress') {
    return supabase
      .from('congress_trades')
      .select('ticker, disclosure_date, amount_min')
      .in('type', def.types)
      .not('ticker', 'is', null)
      .not('disclosure_date', 'is', null)
      .gte('disclosure_date', from)
      .lte('disclosure_date', to)
      .order('disclosure_date', { ascending: false });
  }
  return supabase
    .from('sec_insider_transactions')
    .select('issuer_ticker, filed_at, value_usd')
    .eq('transaction_code', def.code)
    .eq('table_kind', 'non_derivative')
    .not('issuer_ticker', 'is', null)
    .not('filed_at', 'is', null)
    .gte('filed_at', from)
    .lte('filed_at', to)
    .order('filed_at', { ascending: false });
}

const rowOf = (def, r) =>
  def.source === 'congress'
    ? { ticker: cleanTicker(r.ticker), date: r.disclosure_date, amount: Number(r.amount_min) }
    : { ticker: cleanTicker(r.issuer_ticker), date: r.filed_at, amount: Number(r.value_usd) };

async function readPages(build, maxPages) {
  const rows = [];
  for (let page = 0; page < maxPages; page += 1) {
    const { data, error } = await build().range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/** The earliest public date on record for a dataset, or null. */
export async function datasetStart(supabase, def) {
  try {
    const table = def.source === 'congress' ? 'congress_trades' : 'sec_insider_transactions';
    const column = def.source === 'congress' ? 'disclosure_date' : 'filed_at';
    const { data } = await supabase
      .from(table)
      .select(column)
      .not(column, 'is', null)
      .order(column, { ascending: true })
      .limit(1);
    return data?.[0]?.[column] ? String(data[0][column]).slice(0, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Public dates per kind and ticker for one backtest.
 * Returns { events, notices }:
 *   events   in the shape the engine takes, { kind: { TICKER: ['YYYY-MM-DD'] } }
 *   notices  plain-language warnings for the report, e.g. when the records for
 *            a dataset begin after the backtest does, so the condition could
 *            not have fired in the early part of the window.
 * Both are empty when the spec uses no disclosure condition.
 */
export async function loadRunEvents(spec, config) {
  const kinds = specEventKinds(spec);
  if (!kinds.length) return { events: {}, notices: [] };
  const supabase = getUserClient();
  const notices = [];
  /* The longest condition window is 60 days; load a margin before the start. */
  const from = new Date(Date.parse(config.startDate) - 75 * 86400000).toISOString().slice(0, 10);
  const out = {};
  for (const kind of kinds) {
    const def = EVENT_DATASETS[kind];
    const column = def.source === 'congress' ? 'ticker' : 'issuer_ticker';
    const rows = await readPages(
      () => baseQuery(supabase, def, from, config.endDate).in(column, spec.universe),
      10,
    );
    const byTicker = {};
    for (const raw of rows) {
      const r = rowOf(def, raw);
      if (!r.ticker || !r.date) continue;
      (byTicker[r.ticker] = byTicker[r.ticker] || new Set()).add(String(r.date).slice(0, 10));
    }
    out[kind] = Object.fromEntries(
      Object.entries(byTicker).map(([t, set]) => [t, [...set].sort()]),
    );
    const start = await datasetStart(supabase, def);
    if (start && start > config.startDate) {
      notices.push(
        `${def.label} on record start on ${start}. Before that date this condition could not fire, so the early part of the window tests the strategy without it.`,
      );
    }
  }
  return { events: out, notices };
}

/**
 * The events of one dataset for an event study. Each ticker costs one price
 * download, so only the `maxTickers` tickers with the most events are kept;
 * the rest are counted in `beyondCap`. Also counts the rows that had to be
 * left out for having no public date.
 */
export async function loadStudyEvents(
  dataset,
  { from, to, ticker, minAmount = 0, maxTickers = 120 },
) {
  const def = EVENT_DATASETS[dataset];
  if (!def) throw new Error('Unknown dataset');
  const supabase = getUserClient();
  const column = def.source === 'congress' ? 'ticker' : 'issuer_ticker';
  const rows = await readPages(() => {
    const q = baseQuery(supabase, def, from, to);
    return ticker ? q.eq(column, ticker) : q;
  }, STUDY_PAGES);

  const all = [];
  const seen = new Set();
  const perTicker = new Map();
  let belowMinimum = 0;
  for (const raw of rows) {
    const r = rowOf(def, raw);
    if (!r.ticker || !r.date) continue;
    if (minAmount > 0 && !(r.amount >= minAmount)) {
      belowMinimum += 1;
      continue;
    }
    const date = String(r.date).slice(0, 10);
    const key = `${r.ticker}|${date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    all.push({ ticker: r.ticker, date });
    perTicker.set(r.ticker, (perTicker.get(r.ticker) || 0) + 1);
  }
  /* Keep the tickers with the most events (ties in alphabetical order), so the
     study spans the whole window instead of only its last few weeks. */
  const tickers = new Set(
    [...perTicker.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, maxTickers)
      .map(([t]) => t),
  );
  const events = all.filter((e) => tickers.has(e.ticker));
  const beyondCap = all.length - events.length;

  /* Rows in the window that carry no public date at all. */
  let undated = null;
  try {
    const dateColumn = def.source === 'congress' ? 'disclosure_date' : 'filed_at';
    const eventColumn = 'transaction_date';
    let q = supabase
      .from(def.source === 'congress' ? 'congress_trades' : 'sec_insider_transactions')
      .select(column, { count: 'exact', head: true })
      .is(dateColumn, null)
      .gte(eventColumn, from)
      .lte(eventColumn, to);
    q = def.source === 'congress' ? q.in('type', def.types) : q.eq('transaction_code', def.code);
    if (ticker) q = q.eq(column, ticker);
    const { count } = await q;
    undated = count ?? null;
  } catch {
    undated = null;
  }

  return {
    events,
    recordsStart: await datasetStart(supabase, def),
    tickers: [...tickers],
    rowsRead: rows.length,
    hitReadLimit: rows.length >= STUDY_PAGES * PAGE,
    belowMinimum,
    beyondCap,
    undated,
  };
}
