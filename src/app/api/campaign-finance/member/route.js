import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { CF_CYCLES, CF_DEFAULT_CYCLE, getCampaignFinanceMember } from '@/lib/campaign-finance/load';

/**
 * GET /api/campaign-finance/member?bioguideId=X000000&cycle=2026
 *
 * One member's detail for the research drawer and the per-member card views:
 * contribution sizes, top donor states, spending by purpose and outside groups.
 * Aggregates only; no individual donors. `member: null` when there is no record.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BIOGUIDE = /^[A-Z][0-9]{6}$/;

export async function GET(request) {
  const rl = await checkRateLimit(`cf:member:${getClientIp(request)}`, { limit: 120 });
  if (!rl.success) return rateLimitResponse(rl);
  const sp = new URL(request.url).searchParams;
  const id = String(sp.get('bioguideId') || '')
    .trim()
    .toUpperCase();
  if (!BIOGUIDE.test(id)) {
    return NextResponse.json(
      { ok: false, error: 'A valid member ID is required.' },
      { status: 400 },
    );
  }
  const raw = Number(sp.get('cycle')) || CF_DEFAULT_CYCLE;
  const cycle = CF_CYCLES.includes(raw) ? raw : CF_DEFAULT_CYCLE;
  const member = await getCampaignFinanceMember(id, cycle);
  return NextResponse.json(
    { ok: true, cycle, member },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}
