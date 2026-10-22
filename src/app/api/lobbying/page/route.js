/**
 * GET /api/lobbying/page?view=<view>&<filters>
 *
 * The Lobbying Activity page's read model: one cache-only aggregate per card,
 * backed by the lobbying_page_* SQL functions (migrations
 * 20261021120000_lobbying_page_aggregates.sql and
 * 20261022010000_lobbying_page_facts.sql) through
 * src/lib/lobbying/page-read.js, which the page's server render shares.
 * Filters are parsed by the
 * same page-model.js the page uses, and each view reads only the filters its
 * card applies (FILTERS_APPLY), so server and client always agree.
 *
 * views
 *   pulse      { now, prior }            Influence Pulse, current and same period last year
 *   issues     { total, issues[] }       every issue area with filing counts (chips + landscape)
 *   leaders    { totalSpend, rows[] }    ?by=client|firm
 *   pressure   { total, issues, entities, cells }   filing counts only, never dollars
 *   rhythm     [{ year, quarter, filings, spend }]
 *   door       { filings, doorFilings, lobbyists, firms[] }
 *   lens       [{ ticker, company, verified, spend, filings, topIssue }]
 *   filings    { count, rows[] }         ?mode=public|largest|recent&page=
 *   entity     drawer / company modal    ?kind=client|firm|ticker&value=
 *   members    LD-203 totals and rankings ?types=feca,he,...
 *
 * Shape: { ok, source, view, data } (data null when the store is not
 * configured). Errors are 503 so a card can show its own Retry. Public,
 * rate limited, cached 15 minutes per view and filter set. No mock data.
 */
import { NextResponse } from 'next/server';
import { isServerSupabaseConfigured } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { LOBBYING_SOURCE, LOBBYING_VIEWS, argsFor, readView } from '@/lib/lobbying/page-read';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/* A cold aggregate can take several seconds under ingest load; the database
   allows service_role 30s (see 20261021190000_service_role_timeout.sql). */
export const maxDuration = 60;

export async function GET(request) {
  const rl = await checkRateLimit(`lobbying:page:${getClientIp(request)}`, { limit: 240 });
  if (!rl.success) return rateLimitResponse(rl);

  const sp = new URL(request.url).searchParams;
  const view = sp.get('view');
  if (!LOBBYING_VIEWS.includes(view)) {
    return NextResponse.json({ ok: false, error: 'Unknown view' }, { status: 400 });
  }
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ ok: true, source: LOBBYING_SOURCE, view, data: null });
  }

  const now = Date.now();
  const args = argsFor(view, sp, now);
  if (!args) return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });

  try {
    const data = await readView(view, args);
    return NextResponse.json(
      { ok: true, source: LOBBYING_SOURCE, view, data },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } },
    );
  } catch (err) {
    console.error('[lobbying/page]', view, err?.message);
    return NextResponse.json(
      { ok: false, source: LOBBYING_SOURCE, view, error: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
