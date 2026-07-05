import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import {
  hasFecKey,
  createFecBudget,
  scheduleEByCandidate,
  communicationCostsByCandidate,
} from '@/lib/fec/client';
import { normalizeScheduleE, sumCommunicationCosts } from '@/lib/fec/normalize';
import { resolveFecCandidateId } from '@/lib/fec/join';

/**
 * GET /api/fec/outside-money?bioguideId=&cycle=  — independent expenditures FOR
 * and AGAINST a member (Schedule E) + communication costs. Supabase-first
 * (fec_candidate_outside cache); live FEC fallback; honest empty. NO mock data.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'FEC (api.open.fec.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`fec:outside-money:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const bioguideId = (searchParams.get('bioguideId') || '').trim();
  const cycle = Number(searchParams.get('cycle')) || 2026;
  if (!bioguideId)
    return NextResponse.json({ ok: false, error: 'bioguideId required' }, { status: 400 });

  const empty = {
    ok: true,
    source: SOURCE,
    cycle,
    outside: { supportTotal: 0, opposeTotal: 0, net: 0, communicationCost: 0, byCommittee: [] },
  };

  if (supaConfigured()) {
    try {
      const admin = getAdminClient();
      const { data } = await admin
        .from('fec_candidate_outside')
        .select('support_total,oppose_total,communication_cost,by_committee')
        .eq('bioguide_id', bioguideId)
        .eq('cycle', cycle)
        .maybeSingle();
      if (data) {
        const support = Number(data.support_total) || 0;
        const oppose = Number(data.oppose_total) || 0;
        return NextResponse.json({
          ok: true,
          source: SOURCE,
          cycle,
          outside: {
            supportTotal: support,
            opposeTotal: oppose,
            net: support - oppose,
            communicationCost: Number(data.communication_cost) || 0,
            byCommittee: data.by_committee || [],
          },
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
    const [seRes, ccRes] = await Promise.all([
      scheduleEByCandidate(candidateId, { cycle }, { budget }),
      communicationCostsByCandidate(candidateId, { cycle }, { budget }),
    ]);
    const se = normalizeScheduleE(seRes?.data?.results || []);
    return NextResponse.json({
      ok: true,
      source: SOURCE,
      cycle,
      outside: {
        supportTotal: se.supportTotal,
        opposeTotal: se.opposeTotal,
        net: se.supportTotal - se.opposeTotal,
        communicationCost: sumCommunicationCosts(ccRes?.data?.results || []),
        byCommittee: se.byCommittee,
      },
    });
  } catch {
    return NextResponse.json(empty);
  }
}
