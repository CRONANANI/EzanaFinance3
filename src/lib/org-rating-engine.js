/**
 * Ezana Rating engine — a NEW, per-ORG-MEMBER rating engine.
 *
 * ⚠️ SEPARATION: this is NOT the platform-wide, per-USER ELO. It never reads or
 * writes user_elo / elo_transactions / ELO_TIERS / src/lib/elo.js. It owns only
 * the org rating tables: org_member_rating, org_rating_transactions,
 * org_rating_categories, org_rating_weights. (user_elo may be *read* as one input
 * signal for the "learning" category — never written.)
 *
 * Identity: a member is keyed by org_members.id (matches org_pitches.analyst_member_id),
 * so ratings join naturally to resolved theses.
 *
 * HONEST-EMPTY: every score is computed from real rows only. A member with no
 * resolved theses stays PROVISIONAL with the default 1250 and no fabricated
 * history. A category with no inputs is left UNwritten (rendered "pending"),
 * never invented as a 0. Calibration in particular needs persisted
 * conviction_level; until pitches carry it, calibration is pending everywhere.
 */

// ── Tiers (the design's bands; distinct from ELO_TIERS) ─────────────────────
export const EZANA_TIERS = [
  { name: 'legend', label: 'Legend', minRating: 4500 },
  { name: 'cio', label: 'CIO', minRating: 4000 },
  { name: 'portfolio_mgr', label: 'Portfolio Manager', minRating: 3500 },
  { name: 'senior_analyst', label: 'Senior Analyst', minRating: 3000 },
  { name: 'analyst', label: 'Analyst', minRating: 2500 },
  { name: 'junior_analyst', label: 'Junior Analyst', minRating: 2000 },
  { name: 'trainee', label: 'Trainee', minRating: 1250 },
  { name: 'unranked', label: 'Unranked', minRating: 0 },
];

export const BASE_RATING = 1250;
export const PROVISIONAL_THRESHOLD = 10; // < 10 rated theses ⇒ provisional

/** Tier name for a rating. Members with zero rated theses are 'unranked'. */
export function tierForRating(rating, ratedThesisCount = 1) {
  if (!ratedThesisCount || ratedThesisCount <= 0) return 'unranked';
  const r = Math.round(Number(rating) || 0);
  return (EZANA_TIERS.find((t) => r >= t.minRating) || EZANA_TIERS[EZANA_TIERS.length - 1]).name;
}

export function tierLabel(name) {
  return EZANA_TIERS.find((t) => t.name === name)?.label || 'Unranked';
}

// ── Role mapping: org_members.role/sub_role → weight role ───────────────────
// Weight roles are: analyst | quant_trader | portfolio_manager | vp.
export function mapMemberToWeightRole(role, subRole) {
  const s = (subRole || '').toLowerCase();
  if (s.includes('quant')) return 'quant_trader';
  switch (role) {
    case 'executive':
      return 'vp';
    case 'portfolio_manager':
      return 'portfolio_manager';
    case 'analyst':
    default:
      return 'analyst';
  }
}

// ── Delta / score helpers ───────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const num = (v) => (v == null || v === '' ? null : Number(v));

/** Per-thesis rating delta from realized excess return (alpha vs sector). */
const ALPHA_FACTOR = 18;
export function thesisDelta(alphaPct, { convictionLevel = null } = {}) {
  const a = num(alphaPct);
  if (a == null) return 0;
  let delta = clamp(a, -25, 40) * ALPHA_FACTOR;
  // Calibration alignment bonus — ONLY when a real conviction was declared.
  // (Strong outcomes score better when they were *intended*; weak/negative
  //  outcomes on high conviction are penalized harder.) No conviction ⇒ no bonus.
  if (convictionLevel != null) {
    const conv = clamp(Number(convictionLevel), 1, 5);
    const aligned = (a >= 0 ? 1 : -1) * (conv - 3); // +/- up to 2
    delta += aligned * 8;
  }
  return Math.round(delta);
}

const scoreFromAlpha = (meanAlpha) => clamp(50 + meanAlpha * 2.5, 0, 100);
const scoreFromCount = (n, target) => (n <= 0 ? null : clamp((n / target) * 100, 0, 100));
const scoreFromElo = (rating) => (rating == null ? null : clamp(rating / 50, 0, 100));

// ── Weights ─────────────────────────────────────────────────────────────────
/**
 * Resolve the effective weight set for a role in an org: platform defaults
 * (org_id IS NULL) overlaid by any per-org overrides. Returns a Map<category, weight>.
 */
export async function getEffectiveWeights(db, orgId, weightRole) {
  const { data } = await db
    .from('org_rating_weights')
    .select('org_id, role, category, weight')
    .eq('role', weightRole)
    .or(`org_id.is.null,org_id.eq.${orgId}`);
  const map = new Map();
  // platform defaults first, org overrides win.
  for (const r of (data || []).filter((r) => r.org_id == null))
    map.set(r.category, Number(r.weight));
  for (const r of (data || []).filter((r) => r.org_id === orgId))
    map.set(r.category, Number(r.weight));
  return map;
}

// ── Category computation from REAL rows only ────────────────────────────────
/**
 * Compute the categories we can back with real data. Returns
 * { category: score } for computable categories ONLY. Categories with no inputs
 * are omitted (the API/UI renders them "pending" — never a fabricated 0).
 */
export async function computeCategories(db, orgId, member, resolvedTheses) {
  const scores = {};
  const userId = member.user_id;

  // alpha_vs_sector / portfolio_alpha / strategy_pnl ← realized excess return.
  const alphas = resolvedTheses.map((t) => num(t.alpha_pct)).filter((a) => a != null);
  if (alphas.length > 0) {
    const mean = alphas.reduce((s, a) => s + a, 0) / alphas.length;
    const s = scoreFromAlpha(mean);
    scores.alpha_vs_sector = s;
    scores.portfolio_alpha = s;
    scores.strategy_pnl = s;
  }

  // research_output / research_oversight ← authored research notes.
  const { count: noteCount } = await db
    .from('org_research_notes')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('author_id', userId);
  const rout = scoreFromCount(noteCount || 0, 8);
  if (rout != null) {
    scores.research_output = rout;
    scores.research_oversight = rout;
  }

  // task_efficiency ← assignment submissions delivered.
  const { count: subCount } = await db
    .from('org_assignment_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('submitted_by', userId);
  const taskScore = scoreFromCount(subCount || 0, 6);
  if (taskScore != null) scores.task_efficiency = taskScore;

  // engagement ← research notes + recognition received (real participation signal).
  const { count: recogCount } = await db
    .from('org_recognition')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('recipient_id', userId);
  const engSignal = (noteCount || 0) + (recogCount || 0);
  const engScore = scoreFromCount(engSignal, 10);
  if (engScore != null) scores.engagement = engScore;

  // learning ← platform user_elo (READ-ONLY input signal; never written).
  try {
    const { data: elo } = await db
      .from('user_elo')
      .select('current_rating')
      .eq('user_id', userId)
      .maybeSingle();
    const ls = scoreFromElo(elo ? Number(elo.current_rating) : null);
    if (ls != null) scores.learning = ls;
  } catch {
    /* user_elo read is best-effort; leave learning pending on failure */
  }

  // calibration ← declared conviction vs realized hit rate. HONEST-EMPTY:
  // requires persisted conviction_level. Omitted (pending) until pitches carry it.
  const cal = computeCalibration(resolvedTheses);
  if (cal != null) scores.calibration = cal.score;

  // Everything else (execution_quality, backtest_research, risk_management,
  // allocation_discipline, leadership, team_uplift) has no reliable source yet →
  // left pending on purpose.
  return scores;
}

/**
 * Calibration: declared conviction (1–5) vs realized hit rate. Returns null when
 * NO resolved thesis carries a conviction — never fabricates a score.
 * Also returns the per-conviction series for the calibration chart.
 */
export function computeCalibration(resolvedTheses) {
  const withConv = resolvedTheses.filter((t) => t.conviction_level != null);
  if (withConv.length === 0) return null;
  const buckets = new Map(); // conviction 1..5 → { hits, total }
  for (const t of withConv) {
    const c = clamp(Number(t.conviction_level), 1, 5);
    const b = buckets.get(c) || { hits: 0, total: 0 };
    b.total += 1;
    const metric = num(t.alpha_pct) ?? num(t.return_pct);
    if (metric != null && metric > 0) b.hits += 1;
    buckets.set(c, b);
  }
  const series = [];
  let calErr = 0;
  let n = 0;
  for (const [conviction, b] of [...buckets.entries()].sort((a, z) => a[0] - z[0])) {
    const hitRate = b.hits / b.total;
    const ideal = conviction / 5; // diagonal ideal-calibration line
    series.push({ conviction, hitRate, ideal, total: b.total });
    calErr += Math.abs(hitRate - ideal) * b.total;
    n += b.total;
  }
  const meanErr = n > 0 ? calErr / n : 1;
  const score = clamp((1 - meanErr) * 100, 0, 100);
  return { score, series };
}

// ── The core: recompute one member's rating from real resolved theses ───────
/**
 * Recompute a member's Ezana Rating from real org_pitch_hindsight rows.
 * Idempotent: rebuilds the member's thesis_resolved transactions, upserts the
 * rating + role-weighted categories. Preserves decay/admin transactions.
 *
 * @param {*} db          Supabase client (RLS-scoped server client or admin).
 * @param {string} orgId
 * @param {object} member org_members row ({ id, user_id, role, sub_role }).
 * @returns {Promise<{ rating, tier, ratedThesisCount, isProvisional }>}
 */
export async function recomputeMemberRating(db, orgId, member) {
  const memberId = member.id;

  // Resolved theses = this member's accepted pitches that have hindsight.
  const { data: pitches } = await db
    .from('org_pitches')
    .select(
      'id, ticker, company_name, sector, conviction_level, decision, decision_at, created_at, time_horizon',
    )
    .eq('org_id', orgId)
    .eq('analyst_member_id', memberId);
  const pitchIds = (pitches || []).map((p) => p.id);
  const pitchById = new Map((pitches || []).map((p) => [p.id, p]));

  let hindsight = [];
  if (pitchIds.length > 0) {
    const { data: hs } = await db
      .from('org_pitch_hindsight')
      .select('pitch_id, alpha_pct, return_pct, benchmark_return_pct, current_state, computed_at')
      .in('pitch_id', pitchIds);
    hindsight = hs || [];
  }

  // Join into "resolved theses" (real receipts).
  const resolved = hindsight
    .map((h) => {
      const p = pitchById.get(h.pitch_id);
      if (!p) return null;
      return {
        pitch_id: h.pitch_id,
        ticker: p.ticker,
        company_name: p.company_name,
        sector: p.sector,
        conviction_level: p.conviction_level,
        time_horizon: p.time_horizon,
        alpha_pct: h.alpha_pct,
        return_pct: h.return_pct,
        benchmark_return_pct: h.benchmark_return_pct,
        current_state: h.current_state,
        resolved_at: h.computed_at || p.decision_at || p.created_at,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.resolved_at) - new Date(b.resolved_at));

  // Preserve non-thesis deltas (decay / admin) in the running total.
  const { data: otherTx } = await db
    .from('org_rating_transactions')
    .select('delta, reason')
    .eq('org_id', orgId)
    .eq('member_id', memberId)
    .neq('reason', 'thesis_resolved');
  const preservedDelta = (otherTx || []).reduce((s, t) => s + Number(t.delta || 0), 0);

  // Rebuild thesis_resolved transactions from scratch (idempotent).
  await db
    .from('org_rating_transactions')
    .delete()
    .eq('org_id', orgId)
    .eq('member_id', memberId)
    .eq('reason', 'thesis_resolved');

  let running = BASE_RATING;
  const txRows = [];
  for (const t of resolved) {
    const delta = thesisDelta(t.alpha_pct, { convictionLevel: t.conviction_level });
    running += delta;
    txRows.push({
      org_id: orgId,
      member_id: memberId,
      delta,
      rating_after: running,
      reason: 'thesis_resolved',
      pitch_id: t.pitch_id,
      metadata: {
        ticker: t.ticker,
        alpha_pct: t.alpha_pct == null ? null : Number(t.alpha_pct),
        conviction_level: t.conviction_level,
      },
    });
  }
  if (txRows.length > 0) {
    await db.from('org_rating_transactions').insert(txRows);
  }

  const rating = Math.round(running + preservedDelta);
  const ratedThesisCount = resolved.length;
  const isProvisional = ratedThesisCount < PROVISIONAL_THRESHOLD;
  const tier = tierForRating(rating, ratedThesisCount);

  // Upsert the member rating row.
  await db.from('org_member_rating').upsert(
    {
      org_id: orgId,
      member_id: memberId,
      rating,
      tier,
      rated_thesis_count: ratedThesisCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,member_id' },
  );

  // Role-weighted categories (real scores only; pending ones omitted).
  const weightRole = mapMemberToWeightRole(member.role, member.sub_role);
  const weights = await getEffectiveWeights(db, orgId, weightRole);
  const scores = await computeCategories(db, orgId, member, resolved);
  const catRows = [];
  for (const [category, score] of Object.entries(scores)) {
    const weight = weights.get(category);
    if (weight == null) continue; // only store categories in this member's role set
    catRows.push({
      org_id: orgId,
      member_id: memberId,
      category,
      score: Math.round(score * 100) / 100,
      weight,
      computed_at: new Date().toISOString(),
    });
  }
  // Clear stale category rows first so a category that loses its inputs reverts
  // to pending (unwritten) instead of showing a stale score.
  await db.from('org_rating_categories').delete().eq('org_id', orgId).eq('member_id', memberId);
  if (catRows.length > 0) {
    await db.from('org_rating_categories').insert(catRows);
  }

  return { rating, tier, ratedThesisCount, isProvisional, categoriesComputed: catRows.length };
}

/**
 * Recompute every active member of an org. Manager-triggered.
 * @returns {Promise<Array>} per-member results.
 */
export async function recomputeOrg(db, orgId) {
  const { data: members } = await db
    .from('org_members')
    .select('id, user_id, role, sub_role, display_name')
    .eq('org_id', orgId)
    .eq('is_active', true);
  const results = [];
  for (const m of members || []) {
    // eslint-disable-next-line no-await-in-loop
    const r = await recomputeMemberRating(db, orgId, m);
    results.push({ member_id: m.id, display_name: m.display_name, ...r });
  }
  return results;
}

// ── Decay (org-scoped; mirrors the ELO decay *pattern*, separate tables) ────
export const DECAY_FLOOR = BASE_RATING;
export const DECAY_AMOUNT = 25;
export const DECAY_IDLE_DAYS = 30;

/**
 * Apply an inactivity decay to a member whose rating hasn't moved in
 * DECAY_IDLE_DAYS. Floored at DECAY_FLOOR. Writes a 'decay' transaction.
 * Returns the applied delta (0 if none).
 */
export async function applyDecay(db, orgId, memberId, currentRating) {
  const target = Math.max(DECAY_FLOOR, currentRating - DECAY_AMOUNT);
  const delta = Math.round(target - currentRating);
  if (delta === 0) return 0;
  await db.from('org_rating_transactions').insert({
    org_id: orgId,
    member_id: memberId,
    delta,
    rating_after: target,
    reason: 'decay',
    metadata: { idle_days: DECAY_IDLE_DAYS },
  });
  await db
    .from('org_member_rating')
    .update({ rating: target, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('member_id', memberId);
  return delta;
}
