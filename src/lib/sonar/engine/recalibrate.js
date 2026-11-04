/**
 * Sonar research engine: controlled recalibration (Sections 9.3 to 9.6).
 *
 * The learning cycle, without retraining any model per query:
 *
 *   1. Every run writes telemetry (telemetry.js): which sources ran for which
 *      domain, which of their evidence was selected, and which selected
 *      evidence a surviving (validated) claim actually cited.
 *   2. Reviewed feedback (status 'accepted') adds signals: an
 *      'irrelevant_source' on an evidence item counts against its source.
 *   3. sourceUtility() aggregates, per primary domain x source: runs, selected
 *      rate, cited rate, irrelevant rate.
 *   4. proposeConfig() nudges each weight toward its cited rate, bounded, only
 *      where there is enough data (minRuns), producing a CANDIDATE config.
 *   5. The candidate and the active config run the benchmark suite;
 *      gate() approves only if the candidate's mean composite is not lower
 *      and no benchmark regresses past the tolerance, and claim support does
 *      not fall.
 *   6. An admin promotes an approved candidate (scripts/sonar-recalibrate.mjs
 *      --promote). The previous active config is retired, not deleted, so a
 *      regression is a one-command rollback.
 *
 * A citation click is never treated as proof a citation is correct, and
 * unreviewed feedback never moves a weight.
 *
 * Pure. Unit-tested in scripts/check-sonar-engine.mjs.
 */

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/**
 * @param {Array} runs rows from sonar_research_runs (primary_domain, plan, evidence_decisions, report)
 * @param {Array} feedback accepted rows from sonar_research_feedback (run_id, kind, evidence_id)
 */
export function sourceUtility(runs, feedback = []) {
  const bad = new Map(); /* run_id -> Set(evidence_id) */
  for (const f of feedback) {
    if (f.kind !== 'irrelevant_source' || !f.evidence_id) continue;
    if (!bad.has(f.run_id)) bad.set(f.run_id, new Set());
    bad.get(f.run_id).add(f.evidence_id);
  }
  const u = new Map();
  const cell = (domain, source) => {
    const k = `${domain}|${source}`;
    if (!u.has(k)) u.set(k, { domain, source, runs: 0, selected: 0, cited: 0, irrelevant: 0 });
    return u.get(k);
  };
  for (const r of runs) {
    const domain = r.primary_domain;
    if (!domain) continue;
    const tasks = r.plan?.tasks || [];
    const decisions = r.evidence_decisions?.decisions || [];
    const evidence = r.report?.evidence || [];
    const sourceOf = new Map(evidence.map((e) => [e.id, e.source]));
    const citedIds = new Set(
      [r.report?.executiveConclusion, ...(r.report?.keyFindings || [])]
        .filter(Boolean)
        .flatMap((c) => c.evidenceIds || []),
    );
    for (const t of tasks) {
      const c = cell(domain, t.source);
      c.runs += 1;
      if (decisions.some((d) => d.source === t.source && d.selected)) c.selected += 1;
      if ([...citedIds].some((id) => sourceOf.get(id) === t.source)) c.cited += 1;
      if ([...(bad.get(r.id) || [])].some((id) => sourceOf.get(id) === t.source)) c.irrelevant += 1;
    }
  }
  return [...u.values()].map((c) => ({
    ...c,
    selectedRate: c.runs ? c.selected / c.runs : 0,
    citedRate: c.runs ? c.cited / c.runs : 0,
    irrelevantRate: c.runs ? c.irrelevant / c.runs : 0,
  }));
}

/**
 * A candidate config: each weight with enough data moves toward its cited
 * rate by at most `step`, minus a penalty for reviewed irrelevance.
 */
export function proposeConfig(
  current,
  utility,
  { minRuns = 20, step = 0.15, target = 0.35, version } = {},
) {
  const weights = JSON.parse(JSON.stringify(current.weights));
  const changes = [];
  for (const u of utility) {
    if (u.runs < minRuns) continue;
    const row = (weights[u.domain] = weights[u.domain] || {});
    const before = Number(row[u.source]) || 0;
    const delta =
      clamp(step * ((u.citedRate - target) / target), -step, step) - step * u.irrelevantRate;
    const after = Number(clamp(before + delta).toFixed(3));
    if (Math.abs(after - before) >= 0.01) {
      row[u.source] = after;
      changes.push({
        domain: u.domain,
        source: u.source,
        before,
        after,
        runs: u.runs,
        citedRate: Number(u.citedRate.toFixed(3)),
      });
    }
  }
  return {
    config: {
      ...current,
      weights,
      version: version || `${current.version}+r${Date.now().toString(36)}`,
    },
    changes,
  };
}

/**
 * Approve a candidate only if it is at least as good overall, no benchmark
 * regresses beyond `tolerance`, and claim support does not fall.
 * @param {{ perBenchmark: Array<{benchmark,composite}>, summary }} baseline
 * @param {{ perBenchmark: Array<{benchmark,composite}>, summary }} candidate
 */
export function gate(baseline, candidate, { tolerance = 0.02 } = {}) {
  const reasons = [];
  const b = new Map(baseline.perBenchmark.map((s) => [s.benchmark, s.composite]));
  for (const s of candidate.perBenchmark) {
    const before = b.get(s.benchmark);
    if (before != null && s.composite != null && s.composite < before - tolerance) {
      reasons.push(`regression:${s.benchmark}:${before}->${s.composite}`);
    }
  }
  if ((candidate.summary.composite ?? 0) < (baseline.summary.composite ?? 0))
    reasons.push('lower_mean_composite');
  const cs = candidate.summary.means?.claimSupport;
  const bs = baseline.summary.means?.claimSupport;
  if (cs != null && bs != null && cs < bs - tolerance) reasons.push('lower_claim_support');
  return { approved: reasons.length === 0, reasons };
}
