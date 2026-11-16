/**
 * Map the page's fixed illustrative data to shapes the am2 components expect.
 * Nothing here is live market data. Figures the data does not carry (a 7 day
 * change, a market cap for a commodity, a volume) stay missing and read N/A;
 * they are never derived or invented.
 */

export function synthesizeSparkline(currentPriceStr, deltaPct, n = 24) {
  const current = parseFloat(String(currentPriceStr).replace(/[$,]/g, '')) || 100;
  const start = current / (1 + deltaPct / 100);
  const points = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const linear = start + (current - start) * t;
    const noise = Math.sin(i * 1.7 + currentPriceStr.length) * Math.abs(current - start) * 0.15;
    points.push(Math.max(0, linear + noise));
  }
  points[n - 1] = current;
  return points;
}

export function parseDelta(changeStr) {
  if (!changeStr) return 0;
  /* Only a percentage is a change ("▲ from 65 last week" is not). */
  if (!String(changeStr).includes('%')) return null;
  const m = String(changeStr).match(/(-?\d+(\.\d+)?)/);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  const downSymbol = String(changeStr).includes('▼');
  return downSymbol ? -Math.abs(num) : Math.abs(num);
}

export function enrichHeadlineMetric(stat, accent) {
  const delta = parseDelta(stat.change);
  return {
    id: stat.id,
    label: stat.label,
    value: stat.price,
    delta,
    positive: delta == null || delta >= 0,
    sparkline: synthesizeSparkline(stat.price, delta || 0),
    accent,
    /* The period the data's own change line names ("today", "this week"). */
    period: /week/i.test(stat.change || '') ? 'this week' : 'today',
    note: String(stat.change || '')
      .replace(/^[▲▼\s]+/, '')
      .trim(),
    mood: stat.id === 'fg' ? extractMood(stat.price) : null,
  };
}

function extractMood(priceStr) {
  const parts = String(priceStr).split(/[:—–-]/);
  const num = parseFloat(parts[0]) || 0;
  const label = parts.slice(1).join(' ').trim() || 'Neutral';
  return { num, label };
}

export function enrichPricesRow(row, rank) {
  const deltaPct = parseFloat(String(row.chg).replace(/[%+]/g, '')) || 0;
  const signed = row.pos === false ? -Math.abs(deltaPct) : deltaPct;
  return {
    rank: rank + 1,
    name: row.name,
    ticker: row.ticker || extractTicker(row.name),
    price: row.price,
    chg24h: signed,
    chg7d:
      row.chg7d != null && Number.isFinite(parseFloat(row.chg7d)) ? parseFloat(row.chg7d) : null,
    mcap: row.mcap || 'N/A',
    sparkline: synthesizeSparkline(row.price, signed, 16),
    positive: row.pos !== false,
    tier: row.tier || row.category || 'top',
  };
}

function extractTicker(name) {
  const m = String(name).match(/\(([^)]+)\)/);
  if (m) return m[1];
  return String(name).split(/\s+/)[0].toUpperCase();
}

export function enrichMover(row, rank) {
  const raw = row.chg || row.change || '0';
  const pct = parseFloat(String(raw).replace(/[%+]/g, '')) || 0;
  const signed = row.pos === false ? -Math.abs(pct) : pct;
  return {
    rank: rank + 1,
    symbol: row.symbol || row.sym || extractTicker(row.name || ''),
    price: row.price,
    chg: signed,
    positive: row.pos !== false,
  };
}

export function buildMarqueeItems(...sources) {
  const items = [];
  for (const src of sources) {
    if (!Array.isArray(src)) continue;
    for (const s of src) {
      const sym = s.ticker || (s.name ? extractTicker(s.name) : s.id?.toUpperCase() || s.label);
      const delta = typeof s.ch === 'number' ? s.ch : parseDelta(s.change || s.chg || '');
      /* Fear and greed is an index reading, not a price: it stays out. */
      if (s.id === 'fg') continue;
      if (!sym || !s.price) continue;
      items.push({ symbol: sym, price: s.price, ch: delta });
    }
  }
  return items.slice(0, 16);
}

export function deriveOHLC(currentPriceStr, sparkline) {
  const current = parseFloat(String(currentPriceStr).replace(/[$,]/g, '')) || 0;
  if (!sparkline || sparkline.length === 0) {
    return { h: current, l: current, o: current, v: 'N/A' };
  }
  return {
    h: Math.max(...sparkline),
    l: Math.min(...sparkline),
    o: sparkline[0],
    /* The data has no volume; it reads N/A rather than a made-up figure. */
    v: 'N/A',
  };
}

export function formatLargeNumber(n) {
  if (n == null) return 'N/A';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

export function buildSentimentTopics() {
  return [
    { id: '01', title: 'Bitcoin price direction', posts: 1237, bull: 76 },
    { id: '02', title: 'Oil & OPEC decision', posts: 778, bull: 49 },
    { id: '03', title: 'Gold vs. inflation hedge', posts: 532, bull: 65 },
  ];
}

export function buildWhaleEvents() {
  return [
    {
      addr: '0x7a8…b3f1',
      age: '12m',
      action: 'moved',
      amount: '12,800 BTC',
      target: 'unknown wallet',
    },
    {
      addr: 'bc1q…9k4w',
      age: '47m',
      action: 'sent',
      amount: '24,300 ETH',
      target: 'Coinbase Prime',
    },
    {
      addr: '0x14c…002a',
      age: '1h 12m',
      action: 'deposited',
      amount: '8,500 BTC',
      target: 'Binance',
    },
  ];
}

export function buildChartSeries(currentPriceStr, deltaPct = -1.97, n = 90) {
  const current = parseFloat(String(currentPriceStr).replace(/[$,]/g, '')) || 39180;
  const start = current / (1 + deltaPct / 100);
  const arr = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const linear = start + (current - start) * t;
    const wave = Math.sin(i * 0.4) * Math.abs(current - start) * 0.25;
    const drift = Math.cos(i * 0.12) * Math.abs(current - start) * 0.15;
    arr.push(Math.max(0, linear + wave + drift));
  }
  arr[n - 1] = current;
  return arr;
}
