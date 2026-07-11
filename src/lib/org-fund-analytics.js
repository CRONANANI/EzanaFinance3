/**
 * Fund Analytics (redesign `1b`) — server-side computation for the extended
 * `GET /api/org/analytics/fund` payload. Kept separate from `org-attribution.js`
 * so that file stays focused on the original three attributions.
 *
 * HONEST-EMPTY CONTRACT: every function returns `null` / `[]` when the
 * underlying data does not exist. No mock rows, no placeholder figures — a
 * brand-new fund renders empty states, not fabricated numbers.
 *
 * Positions come from `org_team_portfolios` (the same source as
 * `computeFundPerformance`) so weights and contributions reconcile with the
 * headline fund value. Analyst ↔ position linkage does not exist in the schema,
 * so it is derived through `org_pitches.ticker → analyst_member_id`.
 */

const finite = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

/** Resolve a member row to a real display name. NEVER returns 'Analyst'. */
export function resolveMemberName(member) {
  if (!member) return 'Unassigned';
  const dn = (member.display_name || '').trim();
  if (dn) return dn;
  const title = (member.title || '').trim();
  if (title) return title;
  return 'Unassigned';
}

async function getTeams(supabase, orgId) {
  const { data } = await supabase
    .from('org_teams')
    .select('id, name, sector, slug')
    .eq('org_id', orgId);
  return data || [];
}

async function getMembers(supabase, orgId) {
  const { data } = await supabase
    .from('org_members')
    .select('id, user_id, display_name, title, role, sub_role, is_active, team_id')
    .eq('org_id', orgId);
  return data || [];
}

async function getPortfolio(supabase, orgId) {
  const { data: teams } = await supabase.from('org_teams').select('id').eq('org_id', orgId);
  const teamIds = (teams || []).map((t) => t.id);
  if (teamIds.length === 0) return [];
  const { data } = await supabase
    .from('org_team_portfolios')
    .select('team_id, ticker_symbol, shares, avg_cost, current_value, sector')
    .in('team_id', teamIds);
  return (data || []).map((p) => {
    const value = finite(p.current_value) ?? 0;
    const cost = (finite(p.shares) ?? 0) * (finite(p.avg_cost) ?? 0);
    return { ...p, ticker: p.ticker_symbol, value, cost, pl: value - cost };
  });
}

async function getPitches(supabase, orgId) {
  const { data: pitches } = await supabase
    .from('org_pitches')
    .select('id, ticker, company_name, analyst_member_id, team_id, decision, stage, status')
    .eq('org_id', orgId);
  const ids = (pitches || []).map((p) => p.id);
  let hindsight = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from('org_pitch_hindsight')
      .select('pitch_id, return_pct, alpha_pct, current_state')
      .in('pitch_id', ids);
    hindsight = data || [];
  }
  return { pitches: pitches || [], hByPitch: new Map(hindsight.map((h) => [h.pitch_id, h])) };
}

/* ── Period windowing ──────────────────────────────────────────────────────
   Anchored to the latest snapshot date (data-driven "now", so it is correct in
   demos and prod alike). `semester` ≈ trailing ~5 months; `ytd` = the calendar
   year of the latest snapshot; `inception` = everything. */
function windowStart(period, latestDate) {
  if (!latestDate) return null;
  const d = new Date(`${latestDate}T00:00:00Z`);
  if (period === 'ytd')
    return new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);
  if (period === 'semester') {
    const s = new Date(d);
    s.setUTCMonth(s.getUTCMonth() - 5);
    return s.toISOString().slice(0, 10);
  }
  return null; // inception
}

/** Fund-value-vs-benchmark time series from org_fund_snapshots, scoped to period. */
export async function fundSeries(supabase, orgId, period = 'semester') {
  const { data } = await supabase
    .from('org_fund_snapshots')
    .select('snapshot_date, total_value, total_cost, return_pct, benchmark_return_pct, alpha_pct')
    .eq('org_id', orgId)
    .order('snapshot_date', { ascending: true });
  const rows = data || [];
  if (rows.length === 0) return { series: [], latest: null };

  const latestDate = rows[rows.length - 1].snapshot_date;
  const start = windowStart(period, latestDate);
  const scoped = start ? rows.filter((r) => r.snapshot_date >= start) : rows;
  if (scoped.length === 0) return { series: [], latest: null };

  // Re-base returns to the first point in the window (0 for inception → stored).
  const base = scoped[0];
  const baseRet = finite(base.return_pct) ?? 0;
  const baseBench = finite(base.benchmark_return_pct) ?? 0;
  const series = scoped.map((r) => ({
    date: r.snapshot_date,
    fund_value: finite(r.total_value),
    fund_return_pct: finite(r.return_pct) != null ? finite(r.return_pct) - baseRet : null,
    benchmark_return_pct:
      finite(r.benchmark_return_pct) != null ? finite(r.benchmark_return_pct) - baseBench : null,
  }));

  // Headline stats reflect the latest snapshot (the real fund value), so the
  // stat strip and the chart tell one consistent story.
  const last = scoped[scoped.length - 1];
  const ret = finite(last.return_pct);
  const bench = finite(last.benchmark_return_pct);
  const latest = {
    total_value: finite(last.total_value),
    return_pct: ret,
    benchmark_return_pct: bench,
    alpha_pct: finite(last.alpha_pct) ?? (ret != null && bench != null ? ret - bench : null),
    as_of: last.snapshot_date,
  };
  return { series, latest };
}

/** Delta since the latest council meeting before now. Null when no meetings exist. */
export async function sinceLastMeeting(supabase, orgId) {
  const { data: meetings } = await supabase
    .from('org_meetings')
    .select('id, title, started_at, created_at')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false, nullsFirst: false })
    .limit(1);
  const meeting = (meetings || [])[0];
  const sinceIso = meeting?.started_at || meeting?.created_at;
  if (!sinceIso) return null; // no meetings → strip hides

  const sinceDate = sinceIso.slice(0, 10);
  const days = Math.max(0, Math.round((Date.now() - Date.parse(sinceIso)) / 86400000));

  // Fund value / return delta from the snapshots straddling the meeting date.
  const { data: snaps } = await supabase
    .from('org_fund_snapshots')
    .select('snapshot_date, total_value, return_pct')
    .eq('org_id', orgId)
    .order('snapshot_date', { ascending: true });
  const rows = snaps || [];
  const before = [...rows].reverse().find((r) => r.snapshot_date <= sinceDate) || rows[0] || null;
  const latest = rows[rows.length - 1] || null;
  const valueDelta =
    before && latest ? (finite(latest.total_value) ?? 0) - (finite(before.total_value) ?? 0) : null;
  const returnDelta =
    before && latest && finite(latest.return_pct) != null && finite(before.return_pct) != null
      ? finite(latest.return_pct) - finite(before.return_pct)
      : null;

  // Activity counts since the meeting.
  const countSince = async (table, col) => {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte(col, sinceIso);
    return count || 0;
  };
  const pitchesDecided = await (async () => {
    const { count } = await supabase
      .from('org_pitches')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .not('decision', 'is', null)
      .gte('decision_at', sinceIso);
    return count || 0;
  })();

  return {
    since_date: sinceDate,
    days_ago: days,
    fund_value_delta: valueDelta,
    return_delta_pct: returnDelta,
    positions_added: await countSince('org_positions', 'created_at'),
    positions_closed: null, // no close event in schema
    pitches_decided: pitchesDecided,
    flags_raised: null, // no fund-analytics flag event in schema yet
  };
}

async function getSectorCapPct(supabase, orgId) {
  const { data } = await supabase
    .from('org_ips_rules')
    .select('rule_type, rule_value, is_active')
    .eq('org_id', orgId)
    .eq('rule_type', 'max_sector_pct')
    .eq('is_active', true)
    .limit(1);
  const rule = (data || [])[0];
  if (!rule) return null;
  const v = rule.rule_value || {};
  return finite(v.pct) ?? finite(v.max) ?? finite(v.limit) ?? null;
}

function sectorWeights(positions) {
  const total = positions.reduce((s, p) => s + p.value, 0);
  const map = new Map();
  for (const p of positions) {
    const sector = p.sector || 'Unclassified';
    const s = map.get(sector) || { value: 0, cost: 0 };
    s.value += p.value;
    s.cost += p.cost;
    map.set(sector, s);
  }
  return { total, map };
}

/** Concentration flag — ONLY against a real IPS max_sector_pct rule. */
export async function concentration(supabase, orgId) {
  const cap = await getSectorCapPct(supabase, orgId);
  if (cap == null) return { breach: false, source: 'none' }; // no rule → never flag
  const positions = await getPortfolio(supabase, orgId);
  const { total, map } = sectorWeights(positions);
  if (total <= 0) return { breach: false, source: 'ips', limit_pct: cap };
  let worst = null;
  for (const [sector, s] of map) {
    const weight = (s.value / total) * 100;
    if (!worst || weight > worst.weight_pct) worst = { sector, weight_pct: weight };
  }
  const breach = !!worst && worst.weight_pct > cap;
  return {
    breach,
    source: 'ips',
    limit_pct: cap,
    sector: worst?.sector ?? null,
    weight_pct: worst?.weight_pct ?? null,
  };
}

/** One bar per sleeve: weight, cap marker, over-cap flag, PM. */
export async function sectorVsTarget(supabase, orgId) {
  const [positions, teams, members, cap] = await Promise.all([
    getPortfolio(supabase, orgId),
    getTeams(supabase, orgId),
    getMembers(supabase, orgId),
    getSectorCapPct(supabase, orgId),
  ]);
  const { total, map } = sectorWeights(positions);
  if (total <= 0) return [];
  const pmBySector = new Map();
  for (const t of teams) {
    const pm = members.find((m) => m.team_id === t.id && m.role === 'portfolio_manager');
    if (t.sector)
      pmBySector.set(t.sector, { pm_name: pm ? resolveMemberName(pm) : null, team_id: t.id });
  }
  return [...map.entries()]
    .map(([sector, s]) => {
      const weight = (s.value / total) * 100;
      const meta = pmBySector.get(sector) || {};
      return {
        sector,
        weight_pct: weight,
        cap_pct: cap,
        over_cap: cap != null ? weight > cap : false,
        pm_name: meta.pm_name ?? null,
        team_id: meta.team_id ?? null,
        contribution_pct: total > 0 ? ((s.value - s.cost) / total) * 100 : null,
      };
    })
    .sort((a, b) => b.weight_pct - a.weight_pct);
}

/** Real-name analyst leaderboard from pitches + hindsight. */
export async function analystLeaderboard(supabase, orgId) {
  const [members, teams, positions, { pitches, hByPitch }] = await Promise.all([
    getMembers(supabase, orgId),
    getTeams(supabase, orgId),
    getPortfolio(supabase, orgId),
    getPitches(supabase, orgId),
  ]);
  const teamById = new Map(teams.map((t) => [t.id, t]));
  // Contribution per analyst = Σ P/L of positions whose ticker they pitched.
  const analystByTicker = new Map();
  for (const p of pitches)
    if (p.ticker && p.analyst_member_id) analystByTicker.set(p.ticker, p.analyst_member_id);
  const contribByMember = new Map();
  for (const pos of positions) {
    const mid = analystByTicker.get(pos.ticker);
    if (mid) contribByMember.set(mid, (contribByMember.get(mid) || 0) + pos.pl);
  }

  const agg = new Map();
  for (const p of pitches) {
    if (!p.analyst_member_id) continue;
    const a = agg.get(p.analyst_member_id) || { decided: 0, up: 0, returns: [], alphas: [] };
    const decided = !!p.decision;
    if (decided) a.decided += 1;
    const h = hByPitch.get(p.id);
    if (h) {
      const r = finite(h.return_pct);
      const al = finite(h.alpha_pct);
      // hit = a decided pitch that is currently up (return > 0). Positions are
      // not linked to pitches in the schema, so hindsight return is the proxy.
      if (decided && r != null && r > 0) a.up += 1;
      if (r != null) a.returns.push(r);
      if (al != null) a.alphas.push(al);
    }
    a.count = (a.count || 0) + 1;
    agg.set(p.analyst_member_id, a);
  }

  return members
    .filter((m) => m.is_active && (m.role === 'analyst' || agg.has(m.id)))
    .map((m) => {
      const a = agg.get(m.id) || { count: 0, decided: 0, up: 0, returns: [], alphas: [] };
      const team = m.team_id ? teamById.get(m.team_id) : null;
      return {
        member_id: m.id,
        name: resolveMemberName(m),
        avatar_url: null, // no avatar column in org_members
        sleeve: team?.sector || team?.name || null,
        pitches: a.count,
        hit_rate_pct: a.decided > 0 ? (a.up / a.decided) * 100 : null,
        avg_return_pct: avg(a.returns),
        avg_alpha_pct: avg(a.alphas),
        coverage_count: a.count,
        contribution_usd: contribByMember.get(m.id) ?? 0,
      };
    })
    .sort((x, y) => (y.contribution_usd ?? -Infinity) - (x.contribution_usd ?? -Infinity));
}

/** Top / bottom positions this period by P/L, with the analyst who pitched them. */
export async function contributors(supabase, orgId) {
  const [positions, { pitches }] = await Promise.all([
    getPortfolio(supabase, orgId),
    getPitches(supabase, orgId),
  ]);
  if (positions.length === 0) return { top: [], bottom: [] };
  const members = await getMembers(supabase, orgId);
  const byId = new Map(members.map((m) => [m.id, m]));
  const analystByTicker = new Map();
  for (const p of pitches)
    if (p.ticker && p.analyst_member_id) analystByTicker.set(p.ticker, p.analyst_member_id);
  const totalCost = positions.reduce((s, p) => s + p.cost, 0);
  const rows = positions.map((p) => {
    const mid = analystByTicker.get(p.ticker);
    return {
      ticker: p.ticker,
      sector: p.sector || null,
      analyst_name: mid ? resolveMemberName(byId.get(mid)) : null,
      contribution_usd: p.pl,
      contribution_pct: totalCost > 0 ? (p.pl / totalCost) * 100 : null,
    };
  });
  const sorted = [...rows].sort((a, b) => b.contribution_usd - a.contribution_usd);
  return {
    top: sorted.slice(0, 5),
    bottom: sorted
      .filter((r) => r.contribution_usd < 0)
      .slice(-5)
      .reverse(),
  };
}

/** Submitted → Approved → Executed funnel + holdings with no assigned analyst. */
export async function pipeline(supabase, orgId) {
  const [{ pitches }, positions] = await Promise.all([
    getPitches(supabase, orgId),
    getPortfolio(supabase, orgId),
  ]);
  const submitted = pitches.length;
  const approved = pitches.filter((p) => (p.decision || '').toLowerCase() === 'accepted').length;
  // "Executed" = an approved pitch whose ticker is now a live position.
  const heldTickers = new Set(positions.map((p) => p.ticker));
  const executed = pitches.filter(
    (p) => (p.decision || '').toLowerCase() === 'accepted' && heldTickers.has(p.ticker),
  ).length;

  const pitchedTickers = new Set(pitches.filter((p) => p.analyst_member_id).map((p) => p.ticker));
  const coverageGaps = positions
    .filter((p) => !pitchedTickers.has(p.ticker))
    .map((p) => ({ ticker: p.ticker, sector: p.sector || null, team_id: p.team_id || null }));

  return { submitted, approved, executed, coverage_gaps: coverageGaps };
}

/**
 * Assemble the extended analytics payload. `performance` / `attribution` are
 * added by the caller (unchanged). Everything here is period-scoped or honest-empty.
 */
export async function buildFundAnalytics(supabase, orgId, period = 'semester') {
  const [series, slm, conc, svt, leaderboard, contrib, pipe] = await Promise.all([
    fundSeries(supabase, orgId, period),
    sinceLastMeeting(supabase, orgId),
    concentration(supabase, orgId),
    sectorVsTarget(supabase, orgId),
    analystLeaderboard(supabase, orgId),
    contributors(supabase, orgId),
    pipeline(supabase, orgId),
  ]);
  return {
    period,
    series: series.series,
    seriesLatest: series.latest,
    sinceLastMeeting: slm,
    concentration: conc,
    sectorVsTarget: svt,
    analystLeaderboard: leaderboard,
    contributors: contrib,
    pipeline: pipe,
    // TODO(cash): no cash field in schema yet — tile hidden until one exists.
    cash: null,
  };
}
