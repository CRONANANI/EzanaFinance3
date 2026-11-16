import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { currentQuarter, parseQuarter, pickAutoAwards } from '@/lib/org-recognition-model';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

/* POST /api/org/recognition/auto: derive Best Call and Most Accurate from
   pitch outcomes for ONE quarter. Manager-only. Idempotent per period.

   Only accepted pitches scored inside the quarter count (scored = 30 days
   after the decision, the day the pitch enters the rating), so one pitch
   cannot win every quarter. Best Call needs a positive excess return. Most
   Accurate needs at least three scored pitches in the quarter, so one lucky
   pitch cannot win it. The rules live in pickAutoAwards. */
export const POST = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      /* defaults below */
    }
    const period = body?.period ? String(body.period).slice(0, 40).toUpperCase() : currentQuarter();
    const range = parseQuarter(period);
    if (!range) {
      return NextResponse.json(
        { error: 'Period must be a quarter, for example 2026-Q2.' },
        { status: 400 },
      );
    }

    // Pitches for this org, with their analyst (author) member id.
    const { data: pitches } = await supabase
      .from('org_pitches')
      .select('id, analyst_member_id, ticker, company_name, decision, decision_at')
      .eq('org_id', member.org_id);
    const ids = (pitches || []).map((p) => p.id);
    const { data: outcomes } = ids.length
      ? await supabase
          .from('org_pitch_hindsight')
          .select('pitch_id, alpha_pct, return_pct')
          .in('pitch_id', ids)
      : { data: [] };
    const {
      best,
      accurate: mostAccurate,
      scored,
    } = pickAutoAwards({
      pitches: pitches || [],
      outcomes: outcomes || [],
      range,
    });
    if (scored === 0) {
      return NextResponse.json({
        awarded: [],
        period,
        message: `No pitches were scored in ${period}.`,
      });
    }

    // Resolve analyst member ids -> user ids (recognition recipients).
    const { data: members } = await supabase
      .from('org_members')
      .select('id, user_id, display_name')
      .eq('org_id', member.org_id)
      .eq('is_active', true);
    const userByMemberId = new Map((members || []).map((m) => [m.id, m]));

    // Existing auto badges for this period (idempotency: skip duplicates).
    const { data: existing } = await supabase
      .from('org_recognition')
      .select('badge_type')
      .eq('org_id', member.org_id)
      .eq('period', period)
      .eq('auto_generated', true);
    const have = new Set((existing || []).map((e) => e.badge_type));

    const toInsert = [];

    if (best?.pitch?.analyst_member_id && !have.has('best_call')) {
      const recip = userByMemberId.get(best.pitch.analyst_member_id);
      if (recip) {
        toInsert.push({
          org_id: member.org_id,
          recipient_id: recip.user_id,
          awarded_by: member.user_id,
          badge_type: 'best_call',
          title: `Best Call: ${best.pitch.ticker || best.pitch.company_name || 'Pitch'}`,
          reason: `Highest excess return over the market in ${period}: ${best.alpha >= 0 ? '+' : ''}${best.alpha.toFixed(1)}% on ${best.pitch.company_name || best.pitch.ticker}.`,
          period,
          pitch_id: best.pitch.id,
          auto_generated: true,
        });
      }
    }

    if (mostAccurate && !have.has('most_accurate')) {
      const recip = userByMemberId.get(mostAccurate.memberId);
      if (recip) {
        toInsert.push({
          org_id: member.org_id,
          recipient_id: recip.user_id,
          awarded_by: member.user_id,
          badge_type: 'most_accurate',
          title: 'Most Accurate Analyst',
          reason: `${mostAccurate.hits} of ${mostAccurate.total} pitches scored in ${period} beat the market (${Math.round(mostAccurate.rate * 100)}% hit rate).`,
          period,
          auto_generated: true,
        });
      }
    }

    if (toInsert.length === 0) {
      return NextResponse.json({
        awarded: [],
        period,
        message: `Nothing new to award for ${period}: already awarded, or no pitch qualifies.`,
      });
    }

    const { data, error } = await supabase.from('org_recognition').insert(toInsert).select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ awarded: data, period });
  },
  { requireAuth: true },
);
