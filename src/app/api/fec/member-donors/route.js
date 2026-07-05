import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import {
  hasFecKey,
  createFecBudget,
  getCandidateCommittees,
  scheduleAByEmployer,
  scheduleAByOccupation,
} from '@/lib/fec/client';
import { normalizeByEmployer, normalizeByOccupation } from '@/lib/fec/normalize';
import { resolveFecCandidateId } from '@/lib/fec/join';

/**
 * GET /api/fec/member-donors?bioguideId=&cycle=  — top employers & occupations
 * funding a member (Schedule A by_employer / by_occupation). Supabase-first
 * (fec_candidate_donors cache); live FEC fallback; honest empty. NO mock data.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'FEC (api.open.fec.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`fec:member-donors:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const bioguideId = (searchParams.get('bioguideId') || '').trim();
  const cycle = Number(searchParams.get('cycle')) || 2026;
  if (!bioguideId)
    return NextResponse.json({ ok: false, error: 'bioguideId required' }, { status: 400 });

  const empty = { ok: true, source: SOURCE, cycle, byEmployer: [], byOccupation: [] };

  if (supaConfigured()) {
    try {
      const admin = getAdminClient();
      const { data } = await admin
        .from('fec_candidate_donors')
        .select('by_employer,by_occupation')
        .eq('bioguide_id', bioguideId)
        .eq('cycle', cycle)
        .maybeSingle();
      if (data && (data.by_employer?.length || data.by_occupation?.length)) {
        return NextResponse.json({
          ok: true,
          source: SOURCE,
          cycle,
          byEmployer: data.by_employer || [],
          byOccupation: data.by_occupation || [],
        });
      }
    } catch {
      /* fall through */
    }
  }

  if (!hasFecKey()) return NextResponse.json(empty);
  try {
    const budget = createFecBudget(12);
    const { candidateId } = await resolveFecCandidateId(bioguideId, { cycle, budget });
    if (!candidateId) return NextResponse.json(empty);
    const commRes = await getCandidateCommittees(candidateId, { cycle }, { budget });
    const committee = (commRes?.data?.results || []).map((c) => c.committee_id).filter(Boolean)[0];
    if (!committee) return NextResponse.json(empty);
    const [empRes, occRes] = await Promise.all([
      scheduleAByEmployer(committee, { cycle }, { budget }),
      scheduleAByOccupation(committee, { cycle }, { budget }),
    ]);
    return NextResponse.json({
      ok: true,
      source: SOURCE,
      cycle,
      byEmployer: normalizeByEmployer(empRes?.data?.results || []),
      byOccupation: normalizeByOccupation(occRes?.data?.results || []),
    });
  } catch {
    return NextResponse.json(empty);
  }
}
