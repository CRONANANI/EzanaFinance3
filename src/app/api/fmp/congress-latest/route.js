import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/stable';

async function fetchLatest(chamber) {
  const endpoint = chamber === 'senate' ? 'senate-trades' : 'house-trades';
  try {
    const url = `${BASE}/${endpoint}?page=0&apikey=${encodeURIComponent(FMP_KEY)}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      console.warn(`[congress-latest] ${endpoint} HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`[congress-latest] ${chamber}:`, err.message);
    return [];
  }
}

function fmtAmount(low, high) {
  if (!low && !high) return null;
  const fmt = (n) => {
    if (n == null) return null;
    const num = Number(n);
    if (!Number.isFinite(num)) return null;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
    return `$${num.toLocaleString()}`;
  };
  const lo = fmt(low);
  const hi = fmt(high);
  if (lo && hi && lo !== hi) return `${lo}–${hi}`;
  return lo || hi || null;
}

export async function GET() {
  if (!FMP_KEY) {
    return NextResponse.json({ trades: [] });
  }

  const [house, senate] = await Promise.all([
    fetchLatest('house'),
    fetchLatest('senate'),
  ]);

  const merged = [...house, ...senate]
    .filter((t) => t.symbol && (t.firstName || t.representative || t.senator))
    .sort((a, b) => {
      const tb = new Date(b.disclosureDate || b.transactionDate || 0).getTime();
      const ta = new Date(a.disclosureDate || a.transactionDate || 0).getTime();
      return tb - ta;
    });

  const seen = new Set();
  const deduped = merged.filter((t) => {
    const name = t.firstName
      ? `${t.firstName} ${t.lastName}`
      : t.representative || t.senator || '';
    const key = `${t.symbol}-${t.transactionDate}-${name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const trades = deduped.slice(0, 8).map((t) => {
    const name = t.firstName
      ? `${t.firstName} ${t.lastName}`
      : t.representative || t.senator || 'Unknown';
    const isBuy =
      String(t.type || t.transactionType || '')
        .toLowerCase()
        .includes('purchase') ||
      String(t.type || t.transactionType || '')
        .toLowerCase()
        .includes('buy');
    const amount = fmtAmount(t.amountLow ?? t.amount, t.amountHigh);
    const chamber = t.senator ? 'Senate' : 'House';
    return {
      name,
      chamber,
      symbol: t.symbol,
      action: isBuy ? 'Bought' : 'Sold',
      positive: isBuy,
      amount: amount ? (isBuy ? `+${amount}` : `-${amount}`) : (isBuy ? 'Buy' : 'Sell'),
      disclosureDate: t.disclosureDate || t.transactionDate || null,
    };
  });

  return NextResponse.json({ trades });
}
