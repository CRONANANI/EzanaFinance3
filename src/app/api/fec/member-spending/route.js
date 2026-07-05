import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import {
  hasFecKey,
  createFecBudget,
  getCandidateCommittees,
  scheduleBByPurpose,
} from '@/lib/fec/client';
import { normalizeByPurpose } from '@/lib/fec/normalize';
import { resolveFecCandidateId } from '@/lib/fec/join';

/**
 * GET /api/fec/member-spending?bioguideId=&cycle=  — how a member's campaign
 * spends, by purpose (Schedule B by_purpose). Supabase-first (reads the
 * spending_by_purpose column of fec_candidate_outside, written by the cron);
 * live FEC fallback; honest empty. NO mock data.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'FEC (api.open.fec.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`fec:member-spending:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const bioguideId = (searchParams.get('bioguideId') || '').trim();
  const cycle = Number(searchParams.get('cycle')) || 2026;
  if (!bioguideId)
    return NextResponse.json({ ok: false, error: 'bioguideId required' }, { status: 400 });

  const empty = { ok: true, source: SOURCE, cycle, byPurpose: [] };

  if (supaConfigured()) {
    try {
      const admin = getAdminClient();
      const { data } = await admin
        .from('fec_candidate_outside')
        .select('spending_by_purpose')
        .eq('bioguide_id', bioguideId)
        .eq('cycle', cycle)
        .maybeSingle();
      if (data?.spending_by_purpose?.length) {
        return NextResponse.json({
          ok: true,
          source: SOURCE,
          cycle,
          byPurpose: data.spending_by_purpose,
        });
      }
    } catch {
      /* fall through */
    }
  }

  if (!hasFecKey()) return NextResponse.json(empty);
  try {
    const budget = createFecBudget(10);
    const { candidateId } = await resolveFecCandidateId(bioguideId, { cycle, budget });
    if (!candidateId) return NextResponse.json(empty);
    const commRes = await getCandidateCommittees(candidateId, { cycle }, { budget });
    const committee = (commRes?.data?.results || []).map((c) => c.committee_id).filter(Boolean)[0];
    if (!committee) return NextResponse.json(empty);
    const purposeRes = await scheduleBByPurpose(committee, { cycle }, { budget });
    return NextResponse.json({
      ok: true,
      source: SOURCE,
      cycle,
      byPurpose: normalizeByPurpose(purposeRes?.data?.results || []),
    });
  } catch {
    return NextResponse.json(empty);
  }
}
