import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getQuarterCoverage } from '@/lib/lobbying/coverage';

/**
 * GET /api/lobbying/ingest-status?years=  — operational readout of the lobbying
 * ETL: per (year, quarter) cached row count, backfill % complete, phase, and
 * last-run status/delta/reason. Powers the subtle "data health" footer on the
 * lobbying page. Supabase-first (reads the cursor + counts); honest empty. NO
 * mock data.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'Senate LDA (lda.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`lobbying:ingest-status:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const years = (searchParams.get('years') || '')
    .split(',')
    .map((y) => Number(y.trim()))
    .filter((y) => Number.isFinite(y) && y > 2000);
  const targetYears = years.length ? years : [2025, 2024, 2026];

  const empty = { ok: true, source: SOURCE, updatedAt: null, quarters: [] };
  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const admin = getAdminClient();
    const { quarters, updatedAt } = await getQuarterCoverage(admin, targetYears);
    return NextResponse.json({ ok: true, source: SOURCE, updatedAt, quarters });
  } catch {
    return NextResponse.json(empty);
  }
}
