/**
 * Trade-replay portfolio value series.
 *
 * Walks the user's mock_trades log day-by-day from their first trade to today,
 * computing portfolio value = cash + Σ(position_qty × close_price_on_that_day).
 */
export async function replayTradesToValueSeries({
  trades,
  currentCash,
  currentValue,
  startingCash,
  portfolioCreatedAt,
  fetchHistoricalPrices,
}) {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  if (sorted.length === 0) {
    const startDate = portfolioCreatedAt
      ? new Date(portfolioCreatedAt)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const startISO = startDate.toISOString().slice(0, 10);
    const endISO = new Date().toISOString().slice(0, 10);
    return {
      points: [
        { at: `${startISO}T16:00:00.000Z`, value: currentValue },
        { at: `${endISO}T16:00:00.000Z`, value: currentValue },
      ],
      startedAt: startDate.toISOString(),
      source: 'trade-replay',
    };
  }

  const firstTradeDate = new Date(sorted[0].created_at);
  const startDate = portfolioCreatedAt
    ? new Date(Math.min(new Date(portfolioCreatedAt).getTime(), firstTradeDate.getTime()))
    : firstTradeDate;
  startDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tickers = [...new Set(sorted.map((t) => t.ticker))];

  let priceData = null;
  let usedTradePrice = false;
  if (typeof fetchHistoricalPrices === 'function') {
    try {
      priceData = await fetchHistoricalPrices(
        tickers,
        startDate.toISOString().slice(0, 10),
        today.toISOString().slice(0, 10),
      );
    } catch {
      priceData = null;
    }
  }
  if (!priceData) {
    usedTradePrice = true;
    priceData = {};
  }

  const totalBuysValue = sorted
    .filter((t) => t.trade_type === 'buy')
    .reduce((s, t) => s + Number(t.total_amount ?? t.quantity * t.price), 0);
  const totalSellsValue = sorted
    .filter((t) => t.trade_type === 'sell')
    .reduce((s, t) => s + Number(t.total_amount ?? t.quantity * t.price), 0);

  // Day-0 cash is the cash on hand at inception, BEFORE any trades. Prefer the
  // portfolio's known starting cash (from the reset / JSONB) — this is the only
  // reliable anchor. Reconstructing it from `currentCash + buys − sells` breaks
  // badly when `currentCash` was derived from a wrong default (e.g. a $10k
  // assumption for a portfolio that was reset to $4.5M), which is what produced
  // the nonsensical multi-million-dollar starting values.
  let day0Cash;
  if (Number.isFinite(startingCash) && startingCash > 0) {
    day0Cash = startingCash;
  } else {
    day0Cash = currentCash + totalBuysValue - totalSellsValue;
    if (!Number.isFinite(day0Cash) || day0Cash < 0) day0Cash = currentCash;
  }

  let runningCash = day0Cash;
  let runningPositions = {};

  const points = [];
  let tradeIdx = 0;
  const cursor = new Date(startDate);

  while (cursor.getTime() <= today.getTime()) {
    const dayISO = cursor.toISOString().slice(0, 10);

    while (tradeIdx < sorted.length) {
      const t = sorted[tradeIdx];
      const tradeDay = t.created_at.slice(0, 10);
      if (tradeDay > dayISO) break;
      const qty = Number(t.quantity);
      const px = Number(t.price);
      const total = Number(t.total_amount ?? qty * px);
      if (t.trade_type === 'buy') {
        runningCash -= total;
        runningPositions[t.ticker] = (runningPositions[t.ticker] || 0) + qty;
      } else {
        runningCash += total;
        runningPositions[t.ticker] = (runningPositions[t.ticker] || 0) - qty;
      }
      tradeIdx += 1;
    }

    let positionsValue = 0;
    for (const [ticker, qty] of Object.entries(runningPositions)) {
      if (qty === 0) continue;
      let closePrice = null;
      if (priceData[ticker]) {
        closePrice = priceData[ticker][dayISO];
        if (closePrice == null) {
          const probe = new Date(cursor);
          for (let back = 1; back <= 5 && closePrice == null; back += 1) {
            probe.setDate(probe.getDate() - 1);
            closePrice = priceData[ticker][probe.toISOString().slice(0, 10)];
          }
        }
      }
      if (closePrice == null) {
        const lastTradeForTicker = sorted
          .filter((t) => t.ticker === ticker && t.created_at.slice(0, 10) <= dayISO)
          .slice(-1)[0];
        closePrice = lastTradeForTicker ? Number(lastTradeForTicker.price) : 0;
      }
      positionsValue += qty * closePrice;
    }

    points.push({
      at: `${dayISO}T16:00:00.000Z`,
      value: Math.max(0, runningCash + positionsValue),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  if (points.length > 0) {
    points[points.length - 1] = {
      ...points[points.length - 1],
      value: currentValue,
    };
  }

  return {
    points,
    startedAt: startDate.toISOString(),
    source: usedTradePrice ? 'trade-replay-tradeprice' : 'trade-replay',
  };
}

// Number of trailing days each preset range covers. Unrecognized ranges
// (including 'CUSTOM') fall through to no clipping, which safely returns the
// full since-inception series.
const RANGE_DAYS = {
  '1D': 1,
  '1W': 7,
  '7D': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  '3Y': 1095,
  '5Y': 1825,
  '10Y': 3650,
};

export function clipPointsToRange(points, range) {
  if (range === 'ALL' || !points || points.length === 0) return points;

  const days = RANGE_DAYS[range];
  if (!days) return points; // unknown range → no clipping (safe)

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);

  return points.filter((p) => new Date(p.at).getTime() >= cutoff.getTime());
}
