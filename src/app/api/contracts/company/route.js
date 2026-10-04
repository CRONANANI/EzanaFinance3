import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * GET /api/contracts/company?ticker=LMT&since=2021-10-03
 *
 * The company card behind a clickable EzanaQL result row: the awards that
 * resolved to this ticker in the window, and the members of Congress who
 * still hold the stock, with their purchase dates for the price chart. One
 * RPC (contractor_company_card, migration 20261004100000). Public data,
 * rate-limited per IP, cached 15 minutes at the edge.
 *
 * `since` is the query's own date window when the result carried one, so the
 * card's "contracts in this window" is the window the visitor asked for.
 * Without it the card covers everything on file.
 */
export const dynamic = 'force-dynamic';

const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request) {
  const rl = await checkRateLimit(`contracts:company:${getClientIp(request)}`, {
    interval: 60000,
    limit: 40,
  });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const ticker = String(searchParams.get('ticker') || '')
    .trim()
    .toUpperCase();
  const sinceRaw = String(searchParams.get('since') || '').trim();
  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json({ ok: false, error: 'A ticker is required.' }, { status: 400 });
  }
  const since = DATE_RE.test(sinceRaw) ? sinceRaw : null;

  const admin = getAdminClient();
  const { data, error } = await admin.rpc('contractor_company_card', {
    p_ticker: ticker,
    p_since: since,
    p_limit: 25,
  });
  if (error) {
    // PGRST202 / 42883: the RPC is not in the database (its migration has not
    // been run). Say so in the log, where the fix is, instead of failing
    // silently behind the generic message.
    const missing = error.code === 'PGRST202' || error.code === '42883';
    console.error(
      missing
        ? '[contracts/company] contractor_company_card() does not exist: run supabase/migrations/20261004100000_contractor_company_card.sql'
        : `[contracts/company] contractor_company_card(${ticker}) failed: ${error.code || ''} ${error.message || error}`,
    );
    return NextResponse.json(
      { ok: false, error: 'Company details are unavailable right now.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.json(
    { ok: true, card: data },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
  );
}
