/**
 * GET /api/politicians/ticker-activity?symbol=X — "who in Congress traded X?"
 *
 * Fans out to FMP senate-trades?symbol=X + house-trades?symbol=X (paged, capped),
 * normalizes + enriches every row, groups by member, and attaches an INFERRED
 * position status per member. Cached per-symbol (~12 min) to stay quota-friendly.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { normalizeFmpTrade } from '@/lib/politicians/normalize-trade';
import { enrichTrade } from '@/lib/politicians/member-directory';
import { inferPositionStatus } from '@/lib/politicians/position-status';

export const dynamic = 'force-dynamic';

const BASE = 'https://financialmodelingprep.com/stable';
const getFmpKey = () => process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
const MAX_ROWS = 500;
const CACHE_TTL = 12 * 60 * 1000;

// Per-symbol in-memory cache (best-effort; per-lambda).
const cache = new Map();

async function fetchSymbol(chamber, symbol, key) {
  const endpoint = chamber === 'Senate' ? 'senate-trades' : 'house-trades';
  const out = [];
  for (let page = 0; page < 5; page++) {
    try {
      const url = `${BASE}/${endpoint}?symbol=${encodeURIComponent(symbol)}&page=${page}&limit=100&apikey=${encodeURIComponent(key)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) break;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;
      out.push(...data.map((r) => enrichTrade(normalizeFmpTrade(r, chamber))));
      if (out.length >= MAX_ROWS || data.length < 100) break;
    } catch {
      break;
    }
  }
  return out;
}

export async function GET(request) {
  const rl = await checkRateLimit(`pol:ticker:${getClientIp(request)}`, {
    interval: 60000,
    limit: 40,
  });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const symbol = String(searchParams.get('symbol') || '')
    .toUpperCase()
    .trim();
  if (!/^[A-Z.\-]{1,6}$/.test(symbol)) {
    return NextResponse.json(
      { ok: false, error: 'Enter a valid ticker (1–6 letters).' },
      { status: 400 },
    );
  }

  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return NextResponse.json(cached.payload);
  }

  const key = getFmpKey();
  if (!key) {
    return NextResponse.json(
      { ok: false, error: 'Live congressional data source is not configured.' },
      { status: 503 },
    );
  }

  const [senate, house] = await Promise.all([
    fetchSymbol('Senate', symbol, key),
    fetchSymbol('House', symbol, key),
  ]);
  const all = [...senate, ...house].filter((t) => t.name && t.name !== 'Unknown');

  // group by member (bioguideId, fallback name)
  const groups = new Map();
  for (const t of all) {
    const key2 = t.bioguideId || `name:${t.name}`;
    if (!groups.has(key2)) {
      groups.set(key2, {
        member: {
          bioguideId: t.bioguideId,
          name: t.name,
          party: t.party,
          chamber: t.chamber,
          state: t.state,
        },
        trades: [],
      });
    }
    groups.get(key2).trades.push(t);
  }

  const members = [...groups.values()]
    .map((g) => {
      const trades = g.trades.sort((a, b) =>
        String(a.tradedAt || '').localeCompare(String(b.tradedAt || '')),
      );
      return {
        ...g,
        position: inferPositionStatus(trades),
        lastActivity: trades[trades.length - 1]?.tradedAt || '',
      };
    })
    .sort((a, b) => String(b.lastActivity).localeCompare(String(a.lastActivity)));

  const payload = { ok: true, symbol, count: members.length, members };
  cache.set(symbol, { at: Date.now(), payload });
  return NextResponse.json(payload);
}
