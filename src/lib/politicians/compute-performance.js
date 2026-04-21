/**
 * Politician performance pipeline.
 *
 * Responsibilities:
 *   1. Ingest raw senate + house disclosures from FMP into
 *      `congressional_trades` (normalized, with midpoint position size).
 *   2. For each (politician, year), simulate each buy against historical
 *      prices — entry on the transaction date, exit on the earlier of a
 *      matching same-year sell or the year-end boundary — and aggregate
 *      estimated P&L into `politician_annual_performance`.
 *
 * Everything here is *estimated* because congressional disclosures only
 * report amount ranges and do not match buys to specific sells. The UI
 * carries a visible methodology disclosure. Do not claim these numbers as
 * actual portfolio returns.
 */

import { createServerSupabaseClient } from '@/lib/supabase-service-role';
import {
  fetchChamberTrades,
  fetchHistoricalPriceOnDate,
} from './fmp-client';
import {
  parseAmountRange,
  normalizePoliticianId,
  normalizeTransactionType,
  normalizeParty,
} from './amount-range';

const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = 2016;

/**
 * Top-level entry. Ingests the requested years, then recomputes their
 * aggregated per-politician performance rows.
 *
 * @param {{ years?: number[] }} [opts]
 * @returns {Promise<{ ingested: number, years: number[] }>}
 */
export async function computeAllPoliticianPerformance(opts) {
  const years = opts?.years ?? rangeInclusive(START_YEAR, CURRENT_YEAR);
  let ingested = 0;

  for (const year of years) {
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;

    for (const chamber of ['senate', 'house']) {
      let page = 0;
      let pageCount = 0;
      while (pageCount < 50) {
        let trades = [];
        try {
          trades = await fetchChamberTrades(chamber, from, to, page);
        } catch (err) {
          console.error(`[compute] fetch ${chamber} ${year} page=${page}`, err);
          break;
        }
        if (!trades || trades.length === 0) break;

        await persistTrades(trades, chamber, year);
        ingested += trades.length;

        if (trades.length < 100) break;
        page += 1;
        pageCount += 1;
        await sleep(200);
      }
    }

    await computeYearPerformance(year);
  }

  return { ingested, years };
}

/**
 * Normalize + upsert a batch of raw FMP trade rows for a single chamber/year.
 *
 * @param {any[]} trades
 * @param {'senate' | 'house'} chamber
 * @param {number} year
 */
async function persistTrades(trades, chamber, year) {
  const supabase = createServerSupabaseClient();

  const rows = trades
    .map((t) => {
      const symbol = (t.ticker || t.symbol || '').toString().toUpperCase().trim();
      if (!symbol || symbol === '--' || symbol.length > 8) return null;

      const txDate = (t.transactionDate || '').toString().slice(0, 10);
      if (!txDate || !txDate.startsWith(String(year))) return null;

      const { min, max, midpoint } = parseAmountRange(t.amount ?? '');
      if (midpoint === 0) return null;

      const politicianId = normalizePoliticianId(t.firstName, t.lastName);
      if (!politicianId) return null;

      const politicianName = `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim();
      const state = extractState(t.office, t.district, t.state);
      const party = normalizeParty(t.party);

      return {
        politician_id: politicianId,
        politician_name: politicianName,
        chamber,
        party,
        state,
        symbol,
        transaction_type: t.type ?? '',
        transaction_date: txDate,
        disclosure_date: (t.dateRecieved || t.disclosureDate || '')
          .toString()
          .slice(0, 10) || null,
        amount_min: min,
        amount_max: max,
        amount_midpoint: midpoint,
        raw: t,
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return;

  for (const chunk of chunked(rows, 500)) {
    const { error } = await supabase
      .from('congressional_trades')
      .upsert(chunk, {
        onConflict: 'politician_id,symbol,transaction_date,transaction_type',
      });
    if (error) {
      console.error('[persistTrades] upsert error', error);
    }
  }
}

/**
 * For each politician with trades in `year`, simulate their buys and write
 * the aggregate row to `politician_annual_performance`.
 *
 * @param {number} year
 */
async function computeYearPerformance(year) {
  const supabase = createServerSupabaseClient();

  const { data: trades, error } = await supabase
    .from('congressional_trades')
    .select('*')
    .gte('transaction_date', `${year}-01-01`)
    .lte('transaction_date', `${year}-12-31`)
    .order('transaction_date', { ascending: true });

  if (error || !trades) {
    console.error('[computeYearPerformance] load', error);
    return;
  }

  const byPolitician = new Map();
  for (const t of trades) {
    if (!byPolitician.has(t.politician_id)) byPolitician.set(t.politician_id, []);
    byPolitician.get(t.politician_id).push(t);
  }

  const rows = [];

  for (const [politicianId, pTrades] of byPolitician) {
    const result = await simulatePoliticianYear(pTrades, year);
    if (result.numTrades === 0) continue;

    const first = pTrades[0];
    rows.push({
      politician_id: politicianId,
      politician_name: first.politician_name,
      chamber: first.chamber,
      party: first.party,
      year,
      num_trades: result.numTrades,
      total_volume_estimated: result.totalVolume,
      estimated_pnl: result.totalPnl,
      estimated_return_pct:
        result.totalVolume > 0 ? (result.totalPnl / result.totalVolume) * 100 : 0,
      biggest_winner_symbol: result.biggestWinnerSymbol,
      biggest_winner_pnl: result.biggestWinnerPnl,
      computed_at: new Date().toISOString(),
    });
  }

  if (rows.length === 0) return;

  for (const chunk of chunked(rows, 200)) {
    const { error: upErr } = await supabase
      .from('politician_annual_performance')
      .upsert(chunk, { onConflict: 'politician_id,year' });
    if (upErr) console.error('[performance upsert]', upErr);
  }
}

/**
 * Simulate one politician's year: for each buy, price the position at entry
 * and at the earlier of (a) a matching same-symbol sell within the year or
 * (b) December 31 of that year. Sell-only transactions without a prior buy
 * are skipped — we don't have cost basis, so honestly we can't estimate
 * P&L. This mirrors how Quiver / Capitol Trades / Unusual Whales label the
 * same metric.
 *
 * @param {any[]} trades
 * @param {number} year
 */
async function simulatePoliticianYear(trades, year) {
  const bySymbol = new Map();
  for (const t of trades) {
    if (!bySymbol.has(t.symbol)) bySymbol.set(t.symbol, []);
    bySymbol.get(t.symbol).push(t);
  }

  let totalPnl = 0;
  let totalVolume = 0;
  let numTrades = 0;
  let biggestWinnerSymbol = null;
  let biggestWinnerPnl = 0;

  for (const [symbol, symTrades] of bySymbol) {
    symTrades.sort((a, b) =>
      a.transaction_date.localeCompare(b.transaction_date)
    );

    for (const trade of symTrades) {
      const txType = normalizeTransactionType(trade.transaction_type);
      if (txType !== 'buy') continue;

      const size = Number(trade.amount_midpoint) || 0;
      if (size === 0) continue;

      const laterSell = symTrades.find(
        (s) =>
          normalizeTransactionType(s.transaction_type) === 'sell' &&
          s.transaction_date > trade.transaction_date
      );
      const exitDate = laterSell?.transaction_date ?? `${year}-12-31`;

      const [entryPrice, exitPrice] = await Promise.all([
        fetchHistoricalPriceOnDate(symbol, trade.transaction_date),
        fetchHistoricalPriceOnDate(symbol, exitDate),
      ]);

      if (!entryPrice || !exitPrice || entryPrice <= 0) continue;

      const returnPct = exitPrice / entryPrice - 1;
      const pnl = size * returnPct;

      // Guardrail: per-trade return beyond ±500% is almost certainly a
      // data glitch (ticker split, FMP bad bar, etc.). Skip so one broken
      // row can't produce a $500B "winner".
      if (Math.abs(returnPct) > 5) continue;

      totalPnl += pnl;
      totalVolume += size;
      numTrades += 1;

      if (pnl > biggestWinnerPnl) {
        biggestWinnerPnl = pnl;
        biggestWinnerSymbol = symbol;
      }
    }
  }

  return {
    totalPnl,
    totalVolume,
    numTrades,
    biggestWinnerSymbol,
    biggestWinnerPnl,
  };
}

function extractState(office, district, state) {
  const direct = (state || '').toString().toUpperCase().slice(0, 2);
  if (/^[A-Z]{2}$/.test(direct)) return direct;
  const fromDistrict = String(district || '').match(/\b([A-Z]{2})\b/);
  if (fromDistrict) return fromDistrict[1];
  const tail = String(office || '').toUpperCase().match(/\b([A-Z]{2})\b/);
  if (tail) return tail[1];
  return null;
}

function rangeInclusive(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

function* chunked(arr, size) {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
