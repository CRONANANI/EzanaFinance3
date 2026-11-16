import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

import { getAdminClient, getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import {
  mapMemberToWeightRole,
  getEffectiveWeights,
  computeCalibration,
  tierLabel,
} from '@/lib/org-rating-engine';
import { historyIsDated, isFacultyAdvisor, ratingHistory } from '@/lib/org-recognition-model';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function percentileOf(value, population) {
  const arr = population.filter((v) => typeof v === 'number');
  if (arr.length <= 1) return null;
  const below = arr.filter((v) => v < value).length;
  return Math.round((below / (arr.length - 1)) * 100);
}

/* GET /api/org/recognition/scorecard/[memberId]
   One member's scorecard: rating, tier, percentiles, rating history (rebuilt
   from the deltas in date order, with `history_dated` saying whether the
   dates can be trusted), role-weighted categories (pending where there are
   no inputs), scored pitches with the change each made, calibration
   (declared conviction 1 to 5 against the share of those pitches that beat
   the market) and badges and awards with their giver. Real rows only.
   Visibility is unchanged: any active member of the council may open any
   scorecard (an open decision for the owner). */
export const GET = withApiGuard(
  async (_request, _user, context) => {
    const supabase = getUserClient();
    const viewer = await getCurrentOrgMember(supabase);
    if (!viewer) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { memberId } = context?.params ?? {};
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
          .select('id, delta, reason, pitch_id, metadata, created_at')
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

    // ── Rating history (real changes only, dated when the dates are trusted) ──
    const history = ratingHistory(txAll || []);
    const historyDated = historyIsDated(txAll || []);

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
            'id, ticker, company_name, sector, conviction_level, time_horizon, decision, decision_at, created_at',
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
          // Days held: from the council's decision to the latest outcome reading.
          const holdDays =
            p.decision_at && h?.computed_at
              ? Math.max(
                  0,
                  Math.round((new Date(h.computed_at) - new Date(p.decision_at)) / 86400000),
                )
              : null;
          return {
            pitch_id: t.pitch_id,
            ticker: p.ticker,
            company_name: p.company_name,
            sector: p.sector,
            benchmark_return_pct:
              h?.benchmark_return_pct != null ? Number(h.benchmark_return_pct) : null,
            return_pct: h?.return_pct != null ? Number(h.return_pct) : null,
            hold_days: holdDays,
            // Excess return over the broad market benchmark (not the sector).
            excess_return_pct: h?.alpha_pct != null ? Number(h.alpha_pct) : null,
            scored_on: t.metadata?.scored_on || null,
            conviction_level: p.conviction_level, // null ⇒ pending in UI
            delta_rating: deltaByPitch.get(t.pitch_id) ?? 0,
            state: h?.current_state || null,
          };
        })
        .filter(Boolean)
        .sort((a, b) => (b.delta_rating || 0) - (a.delta_rating || 0));

      // Calibration series for the chart: honest-null when no conviction exists.
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
    const { data: recRows } = await supabase
      .from('org_recognition')
      .select(
        'id, badge_type, title, reason, period, is_award, auto_generated, pitch_id, awarded_by, created_at',
      )
      .eq('org_id', orgId)
      .eq('recipient_id', target.user_id)
      .order('created_at', { ascending: false });
    const giverIds = [...new Set((recRows || []).map((r) => r.awarded_by).filter(Boolean))];
    const recPitchIds = [...new Set((recRows || []).map((r) => r.pitch_id).filter(Boolean))];
    const [{ data: givers }, { data: recPitches }, { data: team }] = await Promise.all([
      giverIds.length
        ? supabase
            .from('org_members')
            .select('user_id, display_name')
            .eq('org_id', orgId)
            .in('user_id', giverIds)
        : Promise.resolve({ data: [] }),
      recPitchIds.length
        ? supabase.from('org_pitches').select('id, ticker').in('id', recPitchIds)
        : Promise.resolve({ data: [] }),
      target.team_id
        ? supabase.from('org_teams').select('id, name').eq('id', target.team_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const giverName = new Map((givers || []).map((g) => [g.user_id, g.display_name]));
    const tickerOf = new Map((recPitches || []).map((p) => [p.id, p.ticker]));
    const recognitions = (recRows || []).map((r) => ({
      ...r,
      awarded_by_name: r.auto_generated ? null : giverName.get(r.awarded_by) || null,
      pitch_ticker: r.pitch_id ? tickerOf.get(r.pitch_id) || null : null,
    }));

    return NextResponse.json({
      member: {
        member_id: target.id,
        user_id: target.user_id,
        name: target.display_name || 'Member',
        role: target.role,
        sub_role: target.sub_role || null,
        weight_role: weightRole,
        team_name: team?.name || null,
        is_advisor: isFacultyAdvisor(target),
      },
      rating: {
        value: rating,
        tier,
        tier_label: tierLabel(tier),
        rated_thesis_count: ratedThesisCount,
        is_provisional: isProvisional,
        has_rating: !!ratingRow,
      },
      history,
      history_dated: historyDated,
      percentiles: { org: orgPercentile, all_funds: allFundsPercentile },
      categories,
      receipts,
      calibration_series: calibrationSeries,
      recognitions,
    });
  },
  { requireAuth: true },
);
