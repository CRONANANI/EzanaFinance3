/**
 * Alpha Intelligence insights, pure (tested by scripts/check-ezana-api-alpha.mjs).
 *
 * Procurement acceleration (signal procurement_acceleration, v1.0.0):
 *   For one complete fiscal year, each listed company's net federal contract
 *   obligations are compared with its OWN prior complete years:
 *     robust_z            (FY - median(prior)) / (1.4826 * MAD(prior))
 *     own_history_pct     where the FY sits among the prior years
 *     arc_growth          symmetric year-over-year change, -2 to 2
 *     excess_arc_growth   arc_growth minus the sector median (5+ peers)
 *     agency_hhi          concentration of the year's obligations by agency
 *   The baseline never reads the evaluated year or anything after it, and a
 *   fiscal year is evaluated only when it is complete (see completeFiscalYears).
 *   Descriptive only: nothing here is tested against returns.
 */
import {
  arcGrowth,
  benjaminiHochberg,
  hhi,
  median,
  mad,
  MAD_SCALE,
  nullExceedance,
  percentileRank,
  rankPValue,
  robustZ,
  round,
} from '../alpha/stats';

const PROCUREMENT = {
  signal_id: 'procurement_acceleration',
  signal_version: '1.0.0',
  method: 'robust_z_vs_own_history',
  /* Federal fiscal year N ends 30 September N; DoD obligations are published
     with a 90-day lag, so the year is not read before 29 December N. */
  reportingLagDays: 90,
  /* A year whose dataset total is below 80% of the median of the three prior
     years is still being reported or loaded. */
  completenessRatio: 0.8,
  maxBaselineYears: 8,
  minSectorPeers: 5,
};

const n = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** ISO date the fiscal year's reporting window closes. */
export function fiscalYearAvailable(fy) {
  const end = Date.UTC(fy, 8, 30);
  return new Date(end + PROCUREMENT.reportingLagDays * 86400000).toISOString().slice(0, 10);
}

/**
 * Fiscal years that are complete as of `asOf`: the reporting window closed by
 * then, and the year's dataset total reached 80% of the median of the three
 * prior years (years with fewer than three priors only need the window).
 */
export function completeFiscalYears(rows, asOf) {
  const totals = new Map();
  for (const r of rows || []) {
    const fy = n(r.fiscal_year);
    const amt = n(r.total_amount);
    if (fy == null || amt == null) continue;
    totals.set(fy, (totals.get(fy) || 0) + amt);
  }
  const years = [...totals.keys()].sort((a, b) => a - b);
  const out = [];
  for (const fy of years) {
    if (fiscalYearAvailable(fy) > asOf) continue;
    const prior = years.filter((y) => y < fy && y >= fy - 3).map((y) => totals.get(y));
    if (prior.length === 3 && totals.get(fy) < PROCUREMENT.completenessRatio * median(prior))
      continue;
    out.push(fy);
  }
  return out;
}

/* ticker -> fy -> { amount, awards, agencies: Map(agency -> amount) } */
function panelOf(rows) {
  const panel = new Map();
  for (const r of rows || []) {
    const t = r.ticker ? String(r.ticker).toUpperCase() : null;
    const fy = n(r.fiscal_year);
    const amt = n(r.total_amount);
    if (!t || fy == null || amt == null) continue;
    if (!panel.has(t)) panel.set(t, new Map());
    const years = panel.get(t);
    if (!years.has(fy)) years.set(fy, { amount: 0, awards: 0, agencies: new Map() });
    const y = years.get(fy);
    y.amount += amt;
    y.awards += n(r.award_count) || 0;
    const ag = r.awarding_agency || 'Unknown agency';
    y.agencies.set(ag, (y.agencies.get(ag) || 0) + amt);
  }
  return panel;
}

/* Top agencies by the change in obligations against the prior year. */
function agencyDrivers(cur, prev, k = 3) {
  const names = new Set([...(cur?.agencies?.keys() || []), ...(prev?.agencies?.keys() || [])]);
  return [...names]
    .map((agency) => {
      const now = cur?.agencies?.get(agency) ?? 0;
      const before = prev?.agencies?.get(agency) ?? 0;
      return { agency, obligations_usd: Math.round(now), change_usd: Math.round(now - before) };
    })
    .filter((d) => d.change_usd !== 0)
    .sort((a, b) => Math.abs(b.change_usd) - Math.abs(a.change_usd))
    .slice(0, k);
}

function topAgency(year) {
  if (!year?.agencies?.size || !(year.amount > 0)) return null;
  let best = null;
  for (const [agency, amt] of year.agencies) if (!best || amt > best.amt) best = { agency, amt };
  return { agency: best.agency, share: round(best.amt / year.amount, 4) };
}

/**
 * Evaluate every eligible company for fiscal year `fiscalYear`.
 * opts: { completeYears, sectors: Map(ticker -> sector), minHistory, minBaselineUsd }
 * Returns { rows, universe, excluded } with rows in the shared signal contract.
 */
export function procurementAcceleration(rows, opts) {
  const {
    fiscalYear,
    completeYears,
    sectors = new Map(),
    minHistory = 5,
    minBaselineUsd = 1e6,
  } = opts;
  const panel = panelOf(rows);
  const baselineYears = completeYears
    .filter((y) => y < fiscalYear)
    .slice(-PROCUREMENT.maxBaselineYears);
  const excluded = { short_history: 0, small_baseline: 0, flat_history: 0 };
  const out = [];

  for (const [ticker, years] of panel) {
    /* A company enters the baseline from its first observed complete year;
       after that, a year with no obligations is a real zero. */
    const first = baselineYears.find((y) => years.has(y));
    if (first == null) continue;
    const hist = baselineYears.filter((y) => y >= first);
    const baseline = hist.map((y) => years.get(y)?.amount ?? 0);
    const cur = years.get(fiscalYear) || null;
    const amount = cur?.amount ?? 0;
    if (hist.length < minHistory) {
      excluded.short_history += 1;
      continue;
    }
    const med = median(baseline);
    if (!(med >= minBaselineUsd)) {
      excluded.small_baseline += 1;
      continue;
    }
    const z = robustZ(amount, baseline);
    if (z == null) {
      excluded.flat_history += 1;
      continue;
    }
    const prevFy = fiscalYear - 1;
    const prev = years.get(prevFy) || null;
    const priorAmount = completeYears.includes(prevFy) ? (prev?.amount ?? 0) : null;
    /* The prior year scored against the years before IT (no leakage): when
       both years are extreme, the shift happened earlier and persisted
       (often a spin-off, merger or new programme), not this year. */
    const priorBase = hist.filter((y) => y < prevFy).map((y) => years.get(y)?.amount ?? 0);
    const priorZ = priorAmount == null ? null : robustZ(priorAmount, priorBase);
    out.push({
      ticker,
      sector: sectors.get(ticker) || null,
      z,
      arc: priorAmount == null ? null : arcGrowth(amount, priorAmount),
      amount,
      priorAmount,
      med,
      scaledMad: MAD_SCALE * mad(baseline),
      ownPct: percentileRank(amount, baseline),
      priorZ,
      hist,
      baseline,
      cur,
      prev,
    });
  }

  /* Cross-sectional context: sector medians of arc growth, and where each
     company's robust z sits in the whole evaluated universe. */
  const bySector = new Map();
  for (const r of out) {
    if (!r.sector || r.arc == null) continue;
    if (!bySector.has(r.sector)) bySector.set(r.sector, []);
    bySector.get(r.sector).push(r.arc);
  }
  const allZ = out.map((r) => r.z);
  /* Calibrated tail probability for each company's baseline length, then
     Benjamini-Hochberg across the whole evaluated universe. */
  const pNull = out.map((r) => nullExceedance(r.z, r.hist.length));
  const qNull = benjaminiHochberg(pNull);

  const evaluated = out.map((r, i) => {
    const peers = r.sector ? bySector.get(r.sector) || [] : [];
    const enough = peers.length >= PROCUREMENT.minSectorPeers;
    const sectorMedian = enough ? median(peers) : null;
    const limitations = [];
    if (r.priorAmount == null)
      limitations.push('The prior fiscal year is not complete, so growth is not computed.');
    if (!r.sector)
      limitations.push('No sector on file, so sector-relative growth is not computed.');
    else if (!enough)
      limitations.push(
        `Fewer than ${PROCUREMENT.minSectorPeers} sector peers, so sector-relative growth is not computed.`,
      );
    return {
      signal_id: PROCUREMENT.signal_id,
      signal_version: PROCUREMENT.signal_version,
      entity: { ticker: r.ticker, sector: r.sector },
      signal_type: 'descriptive',
      status: 'evaluated',
      as_of: `${fiscalYear}-09-30`,
      available_at: fiscalYearAvailable(fiscalYear),
      method: PROCUREMENT.method,
      value: round(r.z, 3),
      unit: 'robust_z',
      baseline_value: Math.round(r.med),
      percentile: round(percentileRank(r.z, allZ), 1),
      sample_size: r.hist.length,
      metrics: {
        fiscal_year: fiscalYear,
        obligations_usd: Math.round(r.amount),
        prior_obligations_usd: r.priorAmount == null ? null : Math.round(r.priorAmount),
        baseline_median_usd: Math.round(r.med),
        baseline_scaled_mad_usd: Math.round(r.scaledMad),
        own_history_percentile: round(r.ownPct, 1),
        prior_year_robust_z: round(r.priorZ, 3),
        arc_growth: round(r.arc, 4),
        sector_median_arc_growth: round(sectorMedian, 4),
        excess_arc_growth:
          r.arc != null && sectorMedian != null ? round(r.arc - sectorMedian, 4) : null,
        sector_percentile: enough && r.arc != null ? round(percentileRank(r.arc, peers), 1) : null,
        sector_peers: peers.length,
        awards: r.cur ? r.cur.awards : 0,
        prior_awards: r.prev ? r.prev.awards : null,
        agency_hhi: round(hhi([...(r.cur?.agencies?.values() || [])]), 4),
        prior_agency_hhi: round(hhi([...(r.prev?.agencies?.values() || [])]), 4),
        top_agency: topAgency(r.cur),
        drivers: agencyDrivers(r.cur, r.prev),
        history: r.hist.map((y, i) => ({
          fiscal_year: y,
          obligations_usd: Math.round(r.baseline[i]),
        })),
      },
      coverage: {
        baseline_years: [r.hist[0], r.hist[r.hist.length - 1]],
        history_years: r.hist.length,
        universe: out.length,
      },
      statistical_validation: {
        maturity: 'descriptive',
        predictive: 'not_evaluated',
        null_exceedance: round(pNull[i], 5),
        q_value: round(qNull[i], 5),
        rank_p: round(rankPValue(r.amount, r.baseline, r.z < 0 ? 'down' : 'up'), 4),
        min_attainable_rank_p: round(1 / (r.hist.length + 1), 4),
        note: "value is a robust z against the company's own history, not a probability. null_exceedance is the two-sided chance of a robust z this large on i.i.d. normal noise with the same number of baseline years (simulated); q_value adjusts it for every company evaluated (Benjamini-Hochberg). rank_p assumes only that years are exchangeable and cannot fall below 1/(years + 1). Not tested against returns or revenue.",
      },
      limitations,
    };
  });

  return { rows: evaluated, universe: out.length, excluded };
}

/** Sort keys and direction for the procurement list. */
export const PROCUREMENT_SORTS = {
  robust_z: (r) => r.value,
  growth: (r) => r.metrics.arc_growth,
  excess_growth: (r) => r.metrics.excess_arc_growth,
  amount_change: (r) =>
    r.metrics.prior_obligations_usd == null
      ? null
      : r.metrics.obligations_usd - r.metrics.prior_obligations_usd,
};

/**
 * Filter (direction up: robust z > 0; down: < 0) and order (largest move in
 * that direction first). Rows whose sort key is null go last.
 */
export function orderProcurement(rows, { direction = 'up', sort = 'robust_z' } = {}) {
  const key = PROCUREMENT_SORTS[sort] || PROCUREMENT_SORTS.robust_z;
  const sign = direction === 'down' ? -1 : 1;
  return rows
    .filter((r) => (direction === 'down' ? r.value < 0 : r.value > 0))
    .sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      if (ka == null && kb == null) return a.entity.ticker.localeCompare(b.entity.ticker);
      if (ka == null) return 1;
      if (kb == null) return -1;
      return sign * (kb - ka) || a.entity.ticker.localeCompare(b.entity.ticker);
    });
}
