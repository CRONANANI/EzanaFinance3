/**
 * GET /api/lobbying/feed?ticker=&limit=
 *
 * The most recently posted lobbying reports with reported spend, from our
 * Senate LDA copy (lobbying_filings), newest first. Replaces the Quiver
 * lobbying route: same row shape ({ Client, Registrant, Date, Amount, Ticker,
 * Issue, ... }, see toFeedRow), returned as a bare array.
 *
 * Dollar rule as everywhere else: is_registration = false and amount > 0.
 * ?ticker= restricts to clients mapped to that ticker in
 * lobbying_client_tickers; an unmapped ticker returns [].
 * Public, rate limited by withApiGuard, CDN-cached for ten minutes.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { fetchTickerMap } from '@/lib/lobbying/tickers';
import { cleanTicker, toFeedRow } from '@/lib/lobbying/feed';

export const dynamic = 'force-dynamic';

const CACHE = 'public, max-age=120, s-maxage=600, stale-while-revalidate=1800';
const COLS =
  'uuid, client_name, registrant_name, dt_posted, amount, issues, filing_year, filing_period, document_url';

export const GET = withApiGuard(
  async (request) => {
    const sp = new URL(request.url).searchParams;
    const limit = Math.min(Math.max(Math.floor(Number(sp.get('limit')) || 50), 1), 200);
    const rawTicker = sp.get('ticker');
    const ticker = rawTicker ? cleanTicker(rawTicker) : null;
    if (rawTicker && !ticker) return NextResponse.json([], { headers: { 'Cache-Control': CACHE } });
    if (!isServerSupabaseConfigured()) return NextResponse.json([]);

    const admin = getAdminClient();
    let names = null;
    if (ticker) {
      const { data, error } = await admin
        .from('lobbying_client_tickers')
        .select('client_name')
        .eq('ticker', ticker);
      if (error) {
        console.error('[lobbying/feed] tickers:', error.message);
        return NextResponse.json([], { status: 503, headers: { 'Cache-Control': 'no-store' } });
      }
      names = (data || []).map((r) => r.client_name);
      if (!names.length) return NextResponse.json([], { headers: { 'Cache-Control': CACHE } });
    }

    let q = admin
      .from('lobbying_filings')
      .select(COLS)
      .eq('is_registration', false)
      .gt('amount', 0)
      .not('dt_posted', 'is', null);
    if (names) q = q.in('client_name', names);
    const { data, error } = await q.order('dt_posted', { ascending: false }).limit(limit);
    if (error) {
      console.error('[lobbying/feed]', error.message);
      return NextResponse.json([], { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }

    const rows = data || [];
    const map = await fetchTickerMap(
      admin,
      rows.map((r) => r.client_name),
    );
    const out = rows.map((f) => toFeedRow(f, map.get(String(f.client_name || '').toUpperCase())));
    return NextResponse.json(out, { headers: { 'Cache-Control': CACHE } });
  },
  { requireAuth: false },
);
