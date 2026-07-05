import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { hasFecKey, createFecBudget } from '@/lib/fec/client';
import { buildMemberFinance } from '@/lib/fec/member-finance';

/**
 * GET /api/fec/member-finance?bioguideId=&cycle=  — one member's campaign-finance
 * snapshot: totals + size buckets + top donor states. Supabase-first (cache
 * written by /api/cron/ingest-fec); live FEC fallback on cache miss; honest
 * empty ({ finance: null }) when the member has no FEC filings. Source + cycle
 * are always labeled. NO mock data.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'FEC (api.open.fec.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`fec:member-finance:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const bioguideId = (searchParams.get('bioguideId') || '').trim();
  const cycle = Number(searchParams.get('cycle')) || 2026;
  if (!bioguideId) {
    return NextResponse.json({ ok: false, error: 'bioguideId required' }, { status: 400 });
  }

  const empty = { ok: true, source: SOURCE, cycle, finance: null };

  // Supabase-first
  if (supaConfigured()) {
    try {
      const admin = getAdminClient();
      const { data } = await admin
        .from('fec_candidate_totals')
        .select('*')
        .eq('bioguide_id', bioguideId)
        .eq('cycle', cycle)
        .maybeSingle();
      if (data) {
        return NextResponse.json({
          ok: true,
          source: SOURCE,
          cycle,
          finance: {
            bioguideId,
            candidateId: data.candidate_id,
            name: data.name,
            party: data.party,
            office: data.office,
            state: data.state,
            raised: Number(data.receipts) || 0,
            spent: Number(data.disbursements) || 0,
            cashOnHand: Number(data.cash_on_hand_end_period) || 0,
            individualItemized: Number(data.individual_itemized_contributions) || 0,
            pac: Number(data.other_political_committee_contributions) || 0,
            debts: Number(data.debts_owed_by_committee) || 0,
            hasRaisedFunds: !!data.has_raised_funds,
            coverageEnd: data.coverage_end_date,
            sizeBuckets: data.size_buckets || [],
            topStates: data.top_states || [],
          },
        });
      }
    } catch {
      /* fall through to live */
    }
  }

  // Live fallback (only if the key is present; otherwise honest empty)
  if (!hasFecKey()) return NextResponse.json(empty);
  try {
    const fin = await buildMemberFinance(bioguideId, {
      cycle,
      budget: createFecBudget(20),
      deep: false,
    });
    if (!fin) return NextResponse.json(empty);
    return NextResponse.json({ ok: true, source: SOURCE, cycle, finance: fin });
  } catch {
    return NextResponse.json(empty);
  }
}
