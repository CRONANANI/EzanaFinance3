import { NextResponse } from 'next/server';
import { getEarningsEvents } from '@/lib/fmp/upcoming-events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/inside-capitol/earnings-watch?limit=3
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(10, Math.max(1, Number(searchParams.get('limit') || 3)));

    const baseUrl = new URL(request.url);
    const tradesRes = await fetch(`${baseUrl.origin}/api/fmp/congress-latest?raw=1&limit=400`);
    if (!tradesRes.ok) return NextResponse.json({ alerts: [] });
    const tradesData = await tradesRes.json();
    const trades = tradesData.trades || [];

    let earningsByTicker = new Map();
    try {
      const earnings = await getEarningsEvents();
      for (const e of earnings || []) {
        const ticker = String(e.symbol || '').toUpperCase();
        if (ticker && e.date) earningsByTicker.set(ticker, e.date);
      }
    } catch {
      /* FMP optional */
    }

    const alerts = [];
    for (const trade of trades) {
      const ticker = (trade.ticker || trade.symbol || '').toUpperCase();
      if (!ticker) continue;
      const earningDateRaw = earningsByTicker.get(ticker);
      if (!earningDateRaw) continue;

      const tradeDate = new Date(trade.transactionDate || trade.disclosureDate || 0);
      const earnDate = new Date(String(earningDateRaw).split(' ')[0]);
      if (Number.isNaN(tradeDate.getTime()) || Number.isNaN(earnDate.getTime())) continue;

      const daysBefore = Math.floor((earnDate.getTime() - tradeDate.getTime()) / 86400000);

      if (daysBefore > 0 && daysBefore <= 14) {
        const member = trade.name || trade.representative || 'Unknown';
        const typeStr = String(trade.type || '').toLowerCase();
        const side = typeStr.includes('purchase') || typeStr.includes('buy') ? 'bought' : 'sold';
        alerts.push({
          ticker,
          earnDate: earnDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          slug: member.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          member,
          side,
          range: trade.amount || '—',
          when: relativeTime(tradeDate),
          warn: `Traded ${daysBefore} day${daysBefore === 1 ? '' : 's'} before earnings`,
        });
      }
    }

    return NextResponse.json({ alerts: alerts.slice(0, limit) });
  } catch (e) {
    console.error('[earnings-watch]', e);
    return NextResponse.json({ alerts: [] });
  }
}

function relativeTime(date) {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'} ago`;
}
