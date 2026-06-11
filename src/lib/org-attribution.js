/**
 * Org fund attribution engine (Phase 4). All math is server-side. Every helper
 * takes an already-authenticated supabase client + the caller's org_id, and
 * degrades gracefully when hindsight/portfolio data is missing (no NaN, no
 * divide-by-zero — missing outcomes are simply excluded from averages).
 */

const num = (v) => (v == null ? null : Number(v));
const finite = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

async function getTeamIds(supabase, orgId) {
  const { data: teams } = await supabase.from('org_teams').select('id').eq('org_id', orgId);
  return (teams || []).map((t) => t.id);
}

async function getPortfolio(supabase, orgId) {
  const teamIds = await getTeamIds(supabase, orgId);
  if (teamIds.length === 0) return [];
  const { data } = await supabase
    .from('org_team_portfolios')
    .select('ticker_symbol, shares, avg_cost, current_value, sector')
    .in('team_id', teamIds);
  return data || [];
}

/** Org pitches joined with hindsight, keyed for reuse across helpers. */
async function getPitchesWithHindsight(supabase, orgId) {
  const { data: pitches } = await supabase
    .from('org_pitches')
    .select('id, ticker, company_name, analyst_member_id, decision, stage, status')
    .eq('org_id', orgId);
  const pitchIds = (pitches || []).map((p) => p.id);
  let hindsight = [];
  if (pitchIds.length > 0) {
    const { data } = await supabase
      .from('org_pitch_hindsight')
      .select('pitch_id, return_pct, benchmark_return_pct, alpha_pct, current_state')
      .in('pitch_id', pitchIds);
    hindsight = data || [];
  }
  const hByPitch = new Map(hindsight.map((h) => [h.pitch_id, h]));
  return { pitches: pitches || [], hByPitch };
}

async function getMemberMap(supabase, orgId) {
  const { data } = await supabase
    .from('org_members')
    .select('id, user_id, display_name, role, sub_role, is_active, team_id')
    .eq('org_id', orgId);
  return data || [];
}

/** Fund value, cost, return, benchmark (hindsight proxy) and alpha. */
export async function computeFundPerformance(supabase, orgId) {
  const positions = await getPortfolio(supabase, orgId);
  let totalValue = 0;
  let totalCost = 0;
  for (const p of positions) {
    const val = finite(p.current_value) ?? 0;
    const cost = (finite(p.shares) ?? 0) * (finite(p.avg_cost) ?? 0);
    totalValue += val;
    totalCost += cost;
  }
  const returnPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : null;

  // Benchmark proxy: the average benchmark return recorded against the fund's
  // pitches over the same period (avoids an external SPY round trip).
  const { hByPitch } = await getPitchesWithHindsight(supabase, orgId);
  const benchmarks = [...hByPitch.values()].map((h) => finite(h.benchmark_return_pct)).filter((n) => n != null);
  const benchmarkPct = avg(benchmarks);
  const alphaPct = returnPct != null && benchmarkPct != null ? returnPct - benchmarkPct : null;

  return {
    total_value: totalValue,
    total_cost: totalCost,
    return_pct: returnPct,
    benchmark_return_pct: benchmarkPct,
    alpha_pct: alphaPct,
    positions: positions.length,
  };
}

/** Contribution per analyst from the pitches they authored. */
export async function attributionByAnalyst(supabase, orgId) {
  const members = await getMemberMap(supabase, orgId);
  const byId = new Map(members.map((m) => [m.id, m]));
  const { pitches, hByPitch } = await getPitchesWithHindsight(supabase, orgId);

  const agg = new Map(); // member_id -> { returns:[], alphas:[], count }
  for (const p of pitches) {
    if (!p.analyst_member_id) continue;
    const a = agg.get(p.analyst_member_id) || { returns: [], alphas: [], count: 0 };
    a.count += 1;
    const h = hByPitch.get(p.id);
    if (h) {
      const r = finite(h.return_pct);
      const al = finite(h.alpha_pct);
      if (r != null) a.returns.push(r);
      if (al != null) a.alphas.push(al);
    }
    agg.set(p.analyst_member_id, a);
  }

  return [...agg.entries()]
    .map(([memberId, a]) => ({
      member_id: memberId,
      name: byId.get(memberId)?.display_name || 'Analyst',
      role: byId.get(memberId)?.role || null,
      pitches: a.count,
      avg_return: avg(a.returns),
      avg_alpha: avg(a.alphas),
      total_alpha: a.alphas.length ? a.alphas.reduce((x, y) => x + y, 0) : null,
    }))
    .sort((x, y) => (y.total_alpha ?? -Infinity) - (x.total_alpha ?? -Infinity));
}

/** Sector weight + contribution to fund return. */
export async function attributionBySector(supabase, orgId) {
  const positions = await getPortfolio(supabase, orgId);
  const totalValue = positions.reduce((s, p) => s + (finite(p.current_value) ?? 0), 0);
  const totalCost = positions.reduce((s, p) => s + (finite(p.shares) ?? 0) * (finite(p.avg_cost) ?? 0), 0);

  const bySector = new Map();
  for (const p of positions) {
    const sector = p.sector || 'Unclassified';
    const val = finite(p.current_value) ?? 0;
    const cost = (finite(p.shares) ?? 0) * (finite(p.avg_cost) ?? 0);
    const s = bySector.get(sector) || { value: 0, cost: 0, positions: 0 };
    s.value += val;
    s.cost += cost;
    s.positions += 1;
    bySector.set(sector, s);
  }

  return [...bySector.entries()]
    .map(([sector, s]) => ({
      sector,
      value: s.value,
      positions: s.positions,
      weight_pct: totalValue > 0 ? (s.value / totalValue) * 100 : 0,
      // Contribution to total return = sector P&L / total cost basis.
      contribution_pct: totalCost > 0 ? ((s.value - s.cost) / totalCost) * 100 : null,
    }))
    .sort((a, b) => b.value - a.value);
}

/** Per-pitch return / alpha / state for accepted pitches with outcomes. */
export async function attributionByPitch(supabase, orgId) {
  const members = await getMemberMap(supabase, orgId);
  const byId = new Map(members.map((m) => [m.id, m]));
  const { pitches, hByPitch } = await getPitchesWithHindsight(supabase, orgId);

  return pitches
    .map((p) => {
      const h = hByPitch.get(p.id);
      return {
        pitch_id: p.id,
        ticker: p.ticker,
        company_name: p.company_name,
        analyst: byId.get(p.analyst_member_id)?.display_name || '—',
        decision: p.decision || p.stage || p.status || null,
        return_pct: h ? finite(h.return_pct) : null,
        alpha_pct: h ? finite(h.alpha_pct) : null,
        current_state: h?.current_state || null,
        has_outcome: !!h,
      };
    })
    .sort((a, b) => (b.alpha_pct ?? -Infinity) - (a.alpha_pct ?? -Infinity));
}

/** One analyst's scorecard. `memberId` is an org_members.id. */
export async function analystScorecard(supabase, orgId, memberId) {
  const members = await getMemberMap(supabase, orgId);
  const member = members.find((m) => m.id === memberId);
  if (!member) return null;

  const { pitches, hByPitch } = await getPitchesWithHindsight(supabase, orgId);
  const mine = pitches.filter((p) => p.analyst_member_id === memberId);

  const calls = mine.map((p) => {
    const h = hByPitch.get(p.id);
    return {
      ticker: p.ticker,
      company_name: p.company_name,
      return_pct: h ? finite(h.return_pct) : null,
      alpha_pct: h ? finite(h.alpha_pct) : null,
      current_state: h?.current_state || null,
      has_outcome: !!h,
    };
  });

  const withOutcome = calls.filter((c) => c.has_outcome);
  const hits = withOutcome.filter((c) => (c.alpha_pct ?? 0) > 0).length;
  const hitRate = withOutcome.length ? (hits / withOutcome.length) * 100 : null;
  const avgReturn = avg(withOutcome.map((c) => c.return_pct).filter((n) => n != null));
  const avgAlpha = avg(withOutcome.map((c) => c.alpha_pct).filter((n) => n != null));

  // Participation: committee votes cast + research notes authored.
  const { count: voteCount } = await supabase
    .from('org_pitch_votes')
    .select('id', { count: 'exact', head: true })
    .eq('voter_member_id', memberId);

  const { count: noteCount } = await supabase
    .from('org_research_notes')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('author_id', member.user_id);

  return {
    member_id: member.id,
    name: member.display_name,
    role: member.role,
    sub_role: member.sub_role,
    pitch_count: mine.length,
    outcomes: withOutcome.length,
    hit_rate: hitRate,
    avg_return: avgReturn,
    avg_alpha: avgAlpha,
    votes_participated: voteCount || 0,
    notes_authored: noteCount || 0,
    calls,
  };
}
