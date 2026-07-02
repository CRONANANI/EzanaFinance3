/**
 * GET /api/politicians/trades — the canonical, enriched STOCK Act firehose.
 *
 * Fans out to FMP senate-trades + house-trades (no symbol = latest firehose),
 * normalizes every row via normalizeFmpTrade + enrichTrade, merges both
 * chambers, sorts by filedAt desc. The page binds ONLY these canonical fields —
 * no raw-FMP parsing in components. Query: ?page=0&limit=200.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { normalizeFmpTrade } from '@/lib/politicians/normalize-trade';
import { enrichTrade } from '@/lib/politicians/member-directory';

export const dynamic = 'force-dynamic';

const BASE = 'https://financialmodelingprep.com/stable';
const getFmpKey = () => process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';

async function fetchChamber(chamber, key, page) {
  const endpoint = chamber === 'Senate' ? 'senate-trades' : 'house-trades';
  try {
    const url = `${BASE}/${endpoint}?page=${page}&apikey=${encodeURIComponent(key)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map((r) => enrichTrade(normalizeFmpTrade(r, chamber))) : [];
  } catch {
    return [];
  }
}

export async function GET(request) {
  const rl = await checkRateLimit(`pol:trades:${getClientIp(request)}`, {
    interval: 60000,
    limit: 60,
  });
  if (!rl.success) return rateLimitResponse(rl);

  const key = getFmpKey();
  if (!key) {
    return NextResponse.json(
      { ok: false, error: 'Live congressional data source is not configured.' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(0, Number(searchParams.get('page')) || 0);
  const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit')) || 200));

  const [senate, house] = await Promise.all([
    fetchChamber('Senate', key, page),
    fetchChamber('House', key, page),
  ]);

  const merged = [...senate, ...house]
    .filter((t) => t.name && t.name !== 'Unknown')
    .sort((a, b) => String(b.filedAt || '').localeCompare(String(a.filedAt || '')))
    .slice(0, limit);

  if (merged.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Live congressional data is temporarily unavailable — try again shortly.',
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, trades: merged });
}
