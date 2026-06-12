import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';
import { replayTradesToValueSeries, clipPointsToRange } from '@/lib/portfolio-trade-replay';
import { fetchBatchedHistoricalPrices } from '@/lib/fmp-historical-batched';

export const dynamic = 'force-dynamic';

const RANGES = new Set(['1D', '1W', '7D', '1M', '3M', '6M', '1Y', '3Y', '5Y', '10Y', 'ALL']);
const DEFAULT_STARTING_CASH = 10000;

/**
 * GET /api/portfolio/mock-value-series?range=1D|7D|1M|3M|6M|1Y|3Y|5Y|10Y|ALL
 *
 * Returns the user's mock portfolio value over time, sourced primarily from
 * `mock_trades`. `mock_portfolios.portfolio` is a hint for current value only.
 *
 * A custom window can be requested with `?from=<ISO>&to=<ISO>` — when both are
 * present the series is clipped to that explicit date range (the `range` param
 * is ignored). Used by the "Custom" date picker in the unified DateSelector.
 */
export const GET = withApiGuard(
  async (request, user, context) => {
    try {
      const requestedRange = request.nextUrl.searchParams.get('range');
      const range = RANGES.has(requestedRange) ? requestedRange : 'ALL';

      const { data: tradesRaw, error: tradesError } = await supabaseAdmin
        .from('mock_trades')
        .select('ticker, quantity, price, trade_type, total_amount, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (tradesError) {
        console.error('[mock-value-series] mock_trades query failed', tradesError);
      }

      const trades = Array.isArray(tradesRaw) ? tradesRaw : [];

      const { data: portfolioRow } = await supabaseAdmin
        .from('mock_portfolios')
        .select('portfolio, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      const portfolio = portfolioRow?.portfolio || null;

      if (trades.length === 0 && !portfolio) {
        console.info('[mock-value-series] empty state — no trades, no portfolio', {
          user_id: user.id,
        });
        return NextResponse.json({
          range,
          points: [],
          source: 'no-portfolio',
        });
      }

      if (trades.length === 0 && portfolio) {
        const cash = Number(portfolio.cash) || DEFAULT_STARTING_CASH;
        const createdAt = portfolioRow.updated_at || new Date().toISOString();
        const startISO = new Date(createdAt).toISOString().slice(0, 10);
        const endISO = new Date().toISOString().slice(0, 10);
        console.info('[mock-value-series] flat line — has portfolio, no trades', {
          user_id: user.id,
          cash,
        });
        return NextResponse.json({
          range,
          points: [
            { at: `${startISO}T16:00:00.000Z`, value: cash },
            { at: `${endISO}T16:00:00.000Z`, value: cash },
          ],
          source: 'no-trades',
          startedAt: createdAt,
        });
      }

      const currentPositions = derivePositionsFromTrades(trades);
      const currentPrices = await fetchCurrentPrices(Object.keys(currentPositions));

      const currentCash = computeCashFromTrades(trades, DEFAULT_STARTING_CASH);
      const positionsValue = Object.entries(currentPositions).reduce((sum, [ticker, qty]) => {
        const px = Number(currentPrices[ticker] || 0);
        return sum + qty * px;
      }, 0);
      const currentValue = Math.max(0, currentCash + positionsValue);

      let effectiveCurrentValue = currentValue;
      let valueSource = 'derived-from-trades';
      if (positionsValue === 0 && Object.keys(currentPositions).length > 0 && portfolio) {
        const jsonbValue = computeCurrentValueFromJsonb(portfolio);
        if (jsonbValue > 0) {
          effectiveCurrentValue = jsonbValue;
          valueSource = 'jsonb-fallback';
        }
      }

      console.info('[mock-value-series] reconstructing', {
        user_id: user.id,
        trade_count: trades.length,
        open_position_count: Object.keys(currentPositions).length,
        current_cash: currentCash,
        positions_value: positionsValue,
        current_value: effectiveCurrentValue,
        value_source: valueSource,
      });

      const firstTradeAt = trades[0].created_at;
      const portfolioCreatedAt = portfolioRow?.updated_at || firstTradeAt;
      const anchorDate =
        new Date(firstTradeAt) < new Date(portfolioCreatedAt) ? firstTradeAt : portfolioCreatedAt;

      const replay = await replayTradesToValueSeries({
        trades,
        currentCash,
        currentValue: effectiveCurrentValue,
        portfolioCreatedAt: anchorDate,
        fetchHistoricalPrices: fetchBatchedHistoricalPrices,
      });

      // A custom window (?from=&to=) takes precedence over the preset `range`.
      const fromParam = request.nextUrl.searchParams.get('from');
      const toParam = request.nextUrl.searchParams.get('to');
      const fromMs = fromParam ? Date.parse(fromParam) : NaN;
      const toMs = toParam ? Date.parse(toParam) : NaN;
      const isCustom = Number.isFinite(fromMs) && Number.isFinite(toMs);

      const clipped = isCustom
        ? replay.points.filter((p) => {
            const t = new Date(p.at).getTime();
            return t >= fromMs && t <= toMs;
          })
        : clipPointsToRange(replay.points, range);

      const effectiveRange = isCustom ? 'CUSTOM' : range;

      if (clipped.length < 2 && replay.points.length >= 2) {
        return NextResponse.json({
          range: 'ALL',
          requested_range: effectiveRange,
          points: replay.points,
          source: replay.source,
          startedAt: replay.startedAt,
          note: isCustom
            ? 'Not enough history in the selected window — showing all data since portfolio creation'
            : `Less than ${range} of history available — showing all data since portfolio creation`,
        });
      }

      return NextResponse.json({
        range: effectiveRange,
        points: clipped,
        source: replay.source,
        startedAt: replay.startedAt,
      });
    } catch (e) {
      console.error('[mock-value-series] unexpected failure', {
        message: e?.message,
        stack: e?.stack,
      });
      return NextResponse.json({ error: e?.message ?? 'Unknown', points: [] }, { status: 500 });
    }
  },
  { requireAuth: true },
);

function derivePositionsFromTrades(trades) {
  const positions = {};
  for (const t of trades) {
    const qty = Number(t.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const ticker = String(t.ticker || '').toUpperCase();
    if (!ticker) continue;
    positions[ticker] = (positions[ticker] || 0) + (t.trade_type === 'buy' ? qty : -qty);
  }
  for (const ticker of Object.keys(positions)) {
    if (positions[ticker] <= 0) delete positions[ticker];
  }
  return positions;
}

function computeCashFromTrades(trades, startingCash) {
  let cash = startingCash;
  for (const t of trades) {
    const total = Number(t.total_amount ?? Number(t.quantity) * Number(t.price));
    if (!Number.isFinite(total)) continue;
    cash += t.trade_type === 'buy' ? -total : total;
  }
  return Math.max(0, cash);
}

async function fetchCurrentPrices(tickers) {
  if (!tickers || tickers.length === 0) return {};

  const apiKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
  if (!apiKey) {
    console.warn('[mock-value-series] FMP_API_KEY missing — cannot fetch current prices');
    return {};
  }

  try {
    const symbols = tickers.join(',');
    const url = `https://financialmodelingprep.com/stable/batch-quote?symbols=${encodeURIComponent(symbols)}&apikey=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn('[mock-value-series] FMP quote failed', { status: res.status });
      return {};
    }
    const data = await res.json();
    if (!Array.isArray(data)) return {};

    const prices = {};
    for (const row of data) {
      if (row?.symbol && row?.price != null) {
        prices[String(row.symbol).toUpperCase()] = Number(row.price);
      }
    }
    return prices;
  } catch (err) {
    console.warn('[mock-value-series] FMP current-price fetch threw', err?.message);
    return {};
  }
}

function computeCurrentValueFromJsonb(portfolio) {
  if (!portfolio || typeof portfolio !== 'object') return 0;
  const cash = Number(portfolio.cash) || 0;
  const positions = portfolio.positions;
  if (!positions || typeof positions !== 'object') return Math.max(0, cash);

  let positionsValue = 0;
  const entries = Array.isArray(positions) ? positions : Object.values(positions);
  for (const p of entries) {
    const qty = Number(p?.shares ?? p?.qty ?? 0) || 0;
    const px = Number(p?.currentPrice ?? p?.lastPrice ?? p?.avgCost ?? 0) || 0;
    positionsValue += qty * px;
  }
  return Math.max(0, cash + positionsValue);
}
