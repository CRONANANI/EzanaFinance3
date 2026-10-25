/**
 * Current mock-portfolio holdings as CSV, derived from the mock trade log
 * (GET /api/mock-trades). QA RET-21.
 *
 * Holdings use the average-cost method: a buy adds shares and cost; a sell
 * removes shares at the running average cost. Positions that net to zero are
 * dropped. Values are cost-based: the trade log has no live prices.
 */

const EPS = 1e-9;

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  // Neutralise spreadsheet formula injection and quote when needed.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function round(n, dp) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** @param {Array<{ticker, quantity, price, trade_type, created_at}>} trades */
export function mockHoldingsFromTrades(trades) {
  const sorted = [...(trades || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const book = new Map();
  for (const t of sorted) {
    const ticker = String(t.ticker || '').toUpperCase();
    const qty = Number(t.quantity);
    const price = Number(t.price);
    if (!ticker || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price)) continue;
    const pos = book.get(ticker) || { ticker, shares: 0, cost: 0, lastTradeAt: null };
    if (t.trade_type === 'sell') {
      const avg = pos.shares > EPS ? pos.cost / pos.shares : 0;
      const sold = Math.min(qty, pos.shares);
      pos.shares -= sold;
      pos.cost -= avg * sold;
    } else {
      pos.shares += qty;
      pos.cost += qty * price;
    }
    if (pos.shares <= EPS) {
      pos.shares = 0;
      pos.cost = 0;
    }
    pos.lastTradeAt = t.created_at || pos.lastTradeAt;
    book.set(ticker, pos);
  }
  return [...book.values()]
    .filter((p) => p.shares > EPS)
    .sort((a, b) => b.cost - a.cost)
    .map((p) => ({
      ticker: p.ticker,
      shares: round(p.shares, 6),
      averageCost: round(p.cost / p.shares, 4),
      costBasis: round(p.cost, 2),
      lastTradeAt: p.lastTradeAt,
    }));
}

export function buildMockPortfolioCsv(trades) {
  const header = ['Ticker', 'Shares', 'Average Cost', 'Cost Basis', 'Last Trade'];
  const rows = mockHoldingsFromTrades(trades).map((h) => [
    h.ticker,
    h.shares,
    h.averageCost.toFixed(4),
    h.costBasis.toFixed(2),
    h.lastTradeAt ? new Date(h.lastTradeAt).toISOString() : '',
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
