import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import {
  mapMemberToWeightRole,
  getEffectiveWeights,
  computeCalibration,
  tierLabel,
} from '@/lib/org-rating-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function percentileOf(value, population) {
  const arr = population.filter((v) => typeof v === 'number');
  if (arr.length <= 1) return null;
  const below = arr.filter((v) => v < value).length;
  return Math.round((below / (arr.length - 1)) * 100);
}

/* GET /api/org/recognition/scorecard/[memberId]
   The résumé artifact: hero, sparkline, percentiles, role-weighted categories
   (pending where no inputs), resolved-thesis receipts (ΔRating from real tx),
   calibration series, badges & awards. All from real rows — honest-empty. */
export const GET = withApiGuard(
  async (_request, { params }) => {
    const supabase = createServerSupabase();
    const viewer = await getCurrentOrgMember(supabase);
    if (!viewer) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { memberId } = await params;
    const orgId = viewer.org_id;

    const { data: target } = await supabase
      .from('org_members')
      .select('id, user_id, display_name, role, sub_role, team_id')
      .eq('org_id', orgId)
      .eq('id', memberId)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const weightRole = mapMemberToWeightRole(target.role, target.sub_role);

    const [{ data: ratingRow }, { data: orgRatings }, { data: txAll }, { data: catRows }, weights] =
      await Promise.all([
        supabase
          .from('org_member_rating')
          .select('*')
          .eq('org_id', orgId)
          .eq('member_id', memberId)
          .maybeSingle(),
        supabase
          .from('org_member_rating')
          .select('member_id, rating, rated_thesis_count')
          .eq('org_id', orgId),
        supabase
          .from('org_rating_transactions')
          .select('id, delta, rating_after, reason, pitch_id, metadata, created_at')
          .eq('org_id', orgId)
          .eq('member_id', memberId)
          .order('created_at', { ascending: true }),
        supabase
          .from('org_rating_categories')
          .select('category, score, weight, computed_at')
          .eq('org_id', orgId)
          .eq('member_id', memberId),
        getEffectiveWeights(supabase, orgId, weightRole),
      ]);

    const rating = ratingRow ? Number(ratingRow.rating) : 1250;
    const ratedThesisCount = ratingRow ? ratingRow.rated_thesis_count : 0;
    const isProvisional = ratingRow ? ratingRow.is_provisional : true;
    const tier = ratingRow ? ratingRow.tier : 'unranked';

    // ── Rating-history sparkline (real transactions only) ─────────────────────
    const sparkline = (txAll || []).map((t) => ({
      t: t.created_at,
      rating: Number(t.rating_after),
      delta: Number(t.delta),
      reason: t.reason,
    }));

    // ── Percentiles ───────────────────────────────────────────────────────────
    const orgPop = (orgRatings || [])
      .filter((r) => r.rated_thesis_count > 0)
      .map((r) => Number(r.rating));
    const orgPercentile = ratedThesisCount > 0 ? percentileOf(rating, orgPop) : null;

    let allFundsPercentile = null;
    if (ratedThesisCount > 0) {
      try {
        const admin = getAdminClient();
        const { data: allPop } = await admin
          .from('org_member_rating')
          .select('rating')
          .gt('rated_thesis_count', 0);
        allFundsPercentile = percentileOf(
          rating,
          (allPop || []).map((r) => Number(r.rating)),
        );
      } catch {
        /* best-effort; leave null */
      }
    }

    // ── Role-weighted 6 categories: merge weight set with computed scores ─────
    // Every category in the role's weight set is shown; score is null (pending)
    // when we have no real inputs for it. NEVER fabricated.
    const catByName = new Map((catRows || []).map((c) => [c.category, c]));
    const categories = [...weights.entries()]
      .map(([category, weight]) => {
        const c = catByName.get(category);
        return {
          category,
          weight: Number(weight),
          score: c ? Number(c.score) : null, // null ⇒ pending
          computed_at: c?.computed_at || null,
        };
      })
      .sort((a, b) => b.weight - a.weight);

    // ── Resolved-thesis receipts (real; ΔRating from tx.pitch_id) ─────────────
    const thesisTx = (txAll || []).filter((t) => t.reason === 'thesis_resolved' && t.pitch_id);
    const pitchIds = thesisTx.map((t) => t.pitch_id);
    let receipts = [];
    let calibrationSeries = null;
    if (pitchIds.length > 0) {
      const [{ data: pitches }, { data: hindsight }] = await Promise.all([
        supabase
          .from('org_pitches')
          .select(
            'id, ticker, company_name, sector, conviction_level, time_horizon, decision_at, created_at',
          )
          .in('id', pitchIds),
        supabase
          .from('org_pitch_hindsight')
          .select(
            'pitch_id, alpha_pct, return_pct, benchmark_return_pct, current_state, computed_at',
          )
          .in('pitch_id', pitchIds),
      ]);
      const pitchById = new Map((pitches || []).map((p) => [p.id, p]));
      const hsById = new Map((hindsight || []).map((h) => [h.pitch_id, h]));
      const deltaByPitch = new Map(thesisTx.map((t) => [t.pitch_id, Number(t.delta)]));

      receipts = thesisTx
        .map((t) => {
          const p = pitchById.get(t.pitch_id);
          const h = hsById.get(t.pitch_id);
          if (!p) return null;
          const resolvedAt = h?.computed_at || p.decision_at || p.created_at;
          const holdDays =
            p.created_at && resolvedAt
              ? Math.max(0, Math.round((new Date(resolvedAt) - new Date(p.created_at)) / 86400000))
              : null;
          return {
            pitch_id: t.pitch_id,
            ticker: p.ticker,
            company_name: p.company_name,
            sector: p.sector,
            benchmark_return_pct:
              h?.benchmark_return_pct != null ? Number(h.benchmark_return_pct) : null,
            hold_days: holdDays,
            excess_vs_sector: h?.alpha_pct != null ? Number(h.alpha_pct) : null, // alpha = excess
            conviction_level: p.conviction_level, // null ⇒ pending in UI
            delta_rating: deltaByPitch.get(t.pitch_id) ?? 0,
            state: h?.current_state || null,
          };
        })
        .filter(Boolean)
        .sort((a, b) => (b.delta_rating || 0) - (a.delta_rating || 0));

      // Calibration series for the chart — honest-null when no conviction exists.
      const resolvedForCal = thesisTx
        .map((t) => {
          const p = pitchById.get(t.pitch_id);
          const h = hsById.get(t.pitch_id);
          if (!p) return null;
          return {
            conviction_level: p.conviction_level,
            alpha_pct: h?.alpha_pct,
            return_pct: h?.return_pct,
          };
        })
        .filter(Boolean);
      const cal = computeCalibration(resolvedForCal);
      calibrationSeries = cal ? cal.series : null;
    }

    // ── Badges & awards ───────────────────────────────────────────────────────
    const { data: recognitions } = await supabase
      .from('org_recognition')
      .select(
        'id, badge_type, title, reason, period, is_award, auto_generated, pitch_id, created_at',
      )
      .eq('org_id', orgId)
      .eq('recipient_id', target.user_id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      member: {
        member_id: target.id,
        user_id: target.user_id,
        name: target.display_name || 'Member',
        role: target.role,
        weight_role: weightRole,
      },
      rating: {
        value: rating,
        tier,
        tier_label: tierLabel(tier),
        rated_thesis_count: ratedThesisCount,
        is_provisional: isProvisional,
        has_rating: !!ratingRow,
      },
      sparkline,
      percentiles: { org: orgPercentile, all_funds: allFundsPercentile },
      categories,
      receipts,
      calibration_series: calibrationSeries,
      badges: (recognitions || []).filter((r) => !r.is_award),
      awards: (recognitions || []).filter((r) => r.is_award),
    });
  },
  { requireAuth: true },
);
