import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { canonicalEntity } from '@/lib/lobbying/normalize';

/**
 * GET /api/lobbying/summary?year=  — the stat-strip numbers for a year: total
 * reported lobbying spend, distinct active registrants (firms), distinct active
 * clients (orgs), and filing count. Reads the lobbying_filings cache
 * (Supabase-first, cache-only aggregate). Honest zeros pre-ingestion. NO mock.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'Senate LDA (lda.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`lobbying:summary:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year')) || 2025;

  const empty = {
    ok: true,
    source: SOURCE,
    year,
    totalSpend: 0,
    registrants: 0,
    clients: 0,
    filings: 0,
  };
  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('lobbying_filings')
      .select('registrant_name,client_name,amount,synced_at')
      .eq('filing_year', year)
      .limit(8000);
    if (error || !Array.isArray(data) || !data.length) return NextResponse.json(empty);

    const registrants = new Set();
    const clients = new Set();
    let totalSpend = 0;
    let syncedAt = null;
    for (const r of data) {
      // count DISTINCT canonical entities so spelling variants don't inflate
      if (r.registrant_name) registrants.add(canonicalEntity(r.registrant_name).key);
      if (r.client_name) clients.add(canonicalEntity(r.client_name).key);
      totalSpend += Number(r.amount) || 0;
      if (r.synced_at && (!syncedAt || r.synced_at > syncedAt)) syncedAt = r.synced_at;
    }
    return NextResponse.json({
      ok: true,
      source: SOURCE,
      origin: 'cache',
      syncedAt,
      year,
      totalSpend,
      registrants: registrants.size,
      clients: clients.size,
      filings: data.length,
    });
  } catch {
    return NextResponse.json(empty);
  }
}
