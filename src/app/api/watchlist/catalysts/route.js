/**
 * GET /api/watchlist/catalysts?type=stock&ticker=AAPL
 * Events that may matter to one watchlist item, from data the app already
 * has (src/lib/watchlist/catalysts.js). Public data, signed-in callers only.
 * { type, ticker, items: [] } when nothing is found; never placeholder rows.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { exceptionResponse } from '@/lib/api-errors';
import { catalystsFor } from '@/lib/watchlist/catalysts';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/* Per-instance cache: the sources move daily, and a row click should not refetch them. */
const TTL_MS = 15 * 60000;
const cache = new Map();

export const GET = withApiGuard(
  async (request) => {
    try {
      const sp = new URL(request.url).searchParams;
      const raw = { type: sp.get('type'), ticker: sp.get('ticker') };
      const key = `${String(raw.type).toLowerCase()}:${String(raw.ticker).toUpperCase()}`;
      const hit = cache.get(key);
      let body = hit && Date.now() - hit.at < TTL_MS ? hit.body : null;
      if (!body) {
        body = await catalystsFor(getAdminClient(), raw);
        if (cache.size > 500) cache.clear();
        cache.set(key, { at: Date.now(), body });
      }
      return NextResponse.json(body, {
        headers: { 'Cache-Control': 'private, max-age=900' },
      });
    } catch (e) {
      if (e?.status === 400) return NextResponse.json({ error: e.message }, { status: 400 });
      return exceptionResponse('watchlist catalysts GET', e);
    }
  },
  { requireAuth: true },
);
