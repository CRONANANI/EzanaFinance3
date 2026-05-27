/**
 * Map mock data to shapes the am2 components expect.
 * TODO: wire to /api/alternative-markets when ready.
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
    positive: delta >= 0,
    sparkline: synthesizeSparkline(stat.price, delta),
    accent,
    mood: stat.id === 'fg' ? extractMood(stat.price) : null,
  };
}

function extractMood(priceStr) {
  const parts = String(priceStr).split(/[—–-]/);
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
    chg7d: row.chg7d != null ? parseFloat(row.chg7d) : signed * 1.4 + Math.sin(rank) * 0.5,
    mcap: row.mcap || '—',
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
      if (!sym || !s.price) continue;
      items.push({ symbol: sym, price: s.price, ch: delta });
    }
  }
  return items.slice(0, 16);
}

export function deriveOHLC(currentPriceStr, sparkline) {
  const current = parseFloat(String(currentPriceStr).replace(/[$,]/g, '')) || 0;
  if (!sparkline || sparkline.length === 0) {
    return { h: current, l: current, o: current, v: '—' };
  }
  return {
    h: Math.max(...sparkline),
    l: Math.min(...sparkline),
    o: sparkline[0],
    v: estimateVolume(current),
  };
}

function estimateVolume(price) {
  if (price > 10000) return '28.4B';
  if (price > 100) return '12.6B';
  return '4.8B';
}

export function formatLargeNumber(n) {
  if (n == null) return '—';
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
