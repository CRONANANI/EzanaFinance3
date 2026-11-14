/**
 * GET /api/help-center/institutions
 *
 * The whole supported-institution directory in one cacheable response, for
 * the Help Center's "Supported Banks and Brokerages" page. The page filters
 * it in the browser, so a search costs no request at all: nothing to rate
 * limit per keystroke, and the result appears as the visitor types.
 *
 * Shape: { total, featured: [{ name, caps, logo }], all: [[name, caps], ...] }
 *   featured  the institutions that have a logo (the wall shown before a search)
 *   all       every institution, as compact pairs; caps is a bit field,
 *             see CAP_HOLDINGS and CAP_BANKING in institution-search.js
 *
 * Source is public.institution_registry (service role only), the same table
 * the Add Portfolio window reads. Only display fields leave the server: no
 * provider ids or slugs.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { buildDirectory } from '@/lib/help-center/institution-search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 1000; // the data API returns at most this many rows per request
const MAX_ROWS = 20000;
const MEMO_TTL_MS = 6 * 60 * 60 * 1000;

let memo = null;

const EMPTY = { total: 0, featured: [], all: [] };
const NO_STORE = { 'Cache-Control': 'no-store' };
/* Same list for every visitor and it changes a few times a week at most, so
   the CDN answers nearly all requests. */
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' };

async function loadRows() {
  const admin = getAdminClient();
  const rows = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from('institution_registry')
      .select('display_name, logo_url, square_logo_url, snaptrade_slug, plaid_products')
      .eq('enabled', true)
      .eq('maintenance_mode', false)
      .order('display_name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

export const GET = withApiGuard(
  async () => {
    if (memo && Date.now() - memo.at < MEMO_TTL_MS) {
      return NextResponse.json(memo.body, { headers: CACHE_HEADERS });
    }
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(EMPTY, { status: 503, headers: NO_STORE });
    }
    let body;
    try {
      body = buildDirectory(await loadRows());
    } catch (e) {
      console.error('[help-center/institutions] load failed:', e?.message);
      return NextResponse.json(EMPTY, { status: 503, headers: NO_STORE });
    }
    /* An empty directory is never cached: it means the registry has not been
       filled yet, and caching it would hide the fix for hours. */
    if (body.total === 0) return NextResponse.json(body, { headers: NO_STORE });
    memo = { at: Date.now(), body };
    return NextResponse.json(body, { headers: CACHE_HEADERS });
  },
  { requireAuth: false },
);
