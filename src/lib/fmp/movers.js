/**
 * FMP biggest gainers / losers helpers.
 * Endpoint: /stable/biggest-gainers and /stable/biggest-losers
 */

const FMP_BASE = 'https://financialmodelingprep.com/stable';

export async function getBiggestGainers(limit = 5) {
  const apiKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY;
  if (!apiKey) throw new Error('FMP_API_KEY not set');

  const res = await fetch(`${FMP_BASE}/biggest-gainers?apikey=${encodeURIComponent(apiKey)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`FMP gainers ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.slice(0, limit).map(normalizeMover);
}

export async function getBiggestLosers(limit = 5) {
  const apiKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY;
  if (!apiKey) throw new Error('FMP_API_KEY not set');

  const res = await fetch(`${FMP_BASE}/biggest-losers?apikey=${encodeURIComponent(apiKey)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`FMP losers ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.slice(0, limit).map(normalizeMover);
}

function normalizeMover(m) {
  const pct = Number(m.changesPercentage ?? 0);
  const dollarChange = Number(m.change ?? 0);

  return {
    ticker: m.symbol || '',
    name: m.name || m.companyName || '',
    price: Number(m.price ?? 0),
    change: pct >= 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`,
    dollarChange: dollarChange >= 0 ? `+${dollarChange.toFixed(2)}` : dollarChange.toFixed(2),
    volume: m.volume ? formatVolume(m.volume) : '—',
    positive: pct >= 0,
  };
}

function formatVolume(v) {
  const n = Number(v);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
