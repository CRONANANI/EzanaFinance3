/**
 * Recompute every council's ELO from scratch (idempotent): competition_rating from
 * all pitch_results in date order, fund_rating from council_fund_metrics, blended
 * into current_rating. Appends a reason-tagged transaction per council whose rating
 * moved, and updates council_elo. Service-role client.
 */
import {
  computeCompetitionRatings,
  computeFundRatings,
  blendRating,
  tierForRating,
  WEIGHTS,
} from './model';

export async function recomputeCouncilElo(admin) {
  // Competitions in chronological order, each reduced to {results:[{org_id, rank}]}.
  const { data: comps } = await admin
    .from('pitch_competitions')
    .select('id, created_at')
    .order('created_at', { ascending: true });
  const competitions = [];
  for (const c of comps || []) {
    // eslint-disable-next-line no-await-in-loop
    const { data: results } = await admin
      .from('pitch_results')
      .select('rank, pitch_teams!inner(org_id)')
      .eq('competition_id', c.id);
    const rows = (results || [])
      .map((r) => ({ org_id: r.pitch_teams?.org_id, rank: r.rank }))
      .filter((r) => r.org_id && r.rank != null);
    if (rows.length) competitions.push({ results: rows });
  }

  const { data: metrics } = await admin
    .from('council_fund_metrics')
    .select('org_id, roi_pct, sharpe, max_drawdown_pct, benchmark_alpha_pct');

  const compMap = computeCompetitionRatings(competitions);
  const fundMap = computeFundRatings(metrics || []);

  // Union of orgs that have any signal, plus any already-rated council.
  const { data: existing } = await admin
    .from('council_elo')
    .select('org_id, current_rating, competition_rating, fund_rating, peak_rating');
  const prevByOrg = new Map((existing || []).map((e) => [e.org_id, e]));
  const orgIds = new Set([...compMap.keys(), ...fundMap.keys(), ...prevByOrg.keys()]);

  const base = WEIGHTS.elo.base;
  const fundBase = WEIGHTS.fund.ratingBase;
  let updated = 0;

  for (const orgId of orgIds) {
    const prev = prevByOrg.get(orgId) || { current_rating: base, competition_rating: base, fund_rating: fundBase, peak_rating: base };
    const newComp = compMap.has(orgId) ? compMap.get(orgId) : base;
    const newFund = fundMap.has(orgId) ? fundMap.get(orgId) : fundBase;
    const newCurrent = clamp(blendRating(newComp, newFund));
    const peak = Math.max(prev.peak_rating || newCurrent, newCurrent);

    // eslint-disable-next-line no-await-in-loop
    await admin.from('council_elo').upsert(
      {
        org_id: orgId,
        current_rating: newCurrent,
        competition_rating: clamp(newComp),
        fund_rating: clamp(newFund),
        peak_rating: peak,
        tier: tierForRating(newCurrent),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id' },
    );

    if (newCurrent !== prev.current_rating) {
      const dComp = newComp - (prev.competition_rating ?? base);
      const dFund = newFund - (prev.fund_rating ?? fundBase);
      const component = Math.abs(dComp) >= Math.abs(dFund) ? 'competition' : 'fund';
      // eslint-disable-next-line no-await-in-loop
      await admin.from('council_elo_transactions').insert({
        org_id: orgId,
        delta: newCurrent - prev.current_rating,
        component,
        reason: `Recompute — competition ${clamp(newComp)}, fund ${clamp(newFund)}`,
        metadata: { competition_rating: clamp(newComp), fund_rating: clamp(newFund) },
        rating_before: prev.current_rating,
        rating_after: newCurrent,
      });
      updated += 1;
    }
  }

  return { councils: orgIds.size, updated };
}

function clamp(n) {
  return Math.max(0, Math.min(10000, Math.round(Number(n) || 0)));
}
