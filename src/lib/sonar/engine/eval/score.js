/**
 * Sonar research scorer (Section 9.5). Deterministic metrics computed from a
 * research run against its benchmark. A metric that cannot be measured for a
 * run (the baseline engine has no claim validation) is null and excluded
 * from the composite, never counted as zero or one.
 *
 * Long answers and many citations do not score by themselves: every metric
 * is a rate against what the benchmark requires.
 */

const rate = (hit, of) => (of ? hit / of : null);

/** All text a run asserts (conclusion, findings, analysis). */
export function claimText(run) {
  return [
    run.executiveConclusion?.text,
    ...(run.keyFindings || []).map((f) => `${f.title}. ${f.explanation}`),
    ...(run.analysis || []).map((a) => a.text),
    run.brief,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {object} run    a research run (engine v3), or baselineToRun() output
 * @param {object} bench  a BENCHMARKS entry
 */
export function scoreRun(run, bench) {
  const domains = (run.researchScope?.domains || []).map((d) => d.id);
  const ran = new Set(
    run.methodology?.plan?.tasks?.map((t) => t.source) || run.baselineSources || [],
  );
  const vis = new Set((run.visualizations || []).map((v) => v.id));
  const text = claimText(run);
  const limits = [...(run.limitations || []), text].join('\n');
  const stats = run.researchMetadata?.validation || null;

  const m = {
    understanding: run.baseline
      ? null
      : rate(
          bench.domains.filter((d) => domains.slice(0, 6).includes(d)).length,
          bench.domains.length,
        ),
    entity: bench.subject
      ? run.researchScope?.subject?.kind === bench.subject.kind &&
        String(run.researchScope?.subject?.id).toLowerCase() ===
          String(bench.subject.id).toLowerCase()
        ? 1
        : 0
      : null,
    wrongSubject: bench.notSubject
      ? String(run.researchScope?.subject?.id || '').toLowerCase() ===
        bench.notSubject.id.toLowerCase()
        ? 1
        : 0
      : null,
    planRecall: rate(
      (bench.mustRun || []).filter((s) => ran.has(s)).length,
      (bench.mustRun || []).length,
    ),
    planExclusion: rate(
      (bench.mustNotRun || []).filter((s) => !ran.has(s)).length,
      (bench.mustNotRun || []).length,
    ),
    visualizations: rate(
      (bench.visualizations || []).filter((v) => vis.has(v)).length,
      (bench.visualizations || []).length,
    ),
    citationCoverage: stats ? stats.citationCoverage : null,
    claimSupport: stats ? stats.claimSupportRate : null,
    numericAccuracy: stats
      ? 1 -
        rate(
          (run.researchMetadata?.validationLog || []).filter((l) =>
            (l.problems || []).some((p) => p.startsWith('unsupported_numbers')),
          ).length,
          Math.max(1, stats.claims),
        )
      : null,
    limitation: bench.limitation ? (bench.limitation.test(limits) ? 1 : 0) : null,
    forbidden: (bench.forbidden || []).length
      ? (bench.forbidden || []).some((re) => re.test(text))
        ? 0
        : 1
      : null,
    answered: run.executiveConclusion?.text || run.brief ? 1 : 0,
    latencyMs: run.researchMetadata?.durationMs ?? null,
    phase1Ms: run.researchMetadata?.phase1Ms ?? null,
    partial: run.researchMetadata?.partial ? 1 : 0,
    deterministic: run.methodology?.deterministic ? 1 : 0,
  };
  const W = {
    understanding: 1,
    entity: 2,
    planRecall: 2,
    planExclusion: 1,
    visualizations: 1,
    citationCoverage: 1.5,
    claimSupport: 2,
    numericAccuracy: 2,
    limitation: 1,
    forbidden: 2,
    answered: 2,
  };
  let num = 0;
  let den = 0;
  for (const [k, w] of Object.entries(W)) {
    if (m[k] == null) continue;
    num += w * m[k];
    den += w;
  }
  if (m.wrongSubject === 1) num = 0;
  return {
    benchmark: bench.id,
    metrics: m,
    composite: den ? Number((num / den).toFixed(4)) : null,
  };
}

/** The legacy landing pipeline's result in run shape, for baselines. */
export function baselineToRun(result, { durationMs = null } = {}) {
  const subj = result.politician
    ? { kind: 'politician', id: result.politician.bioguideId }
    : result.resolved?.ticker
      ? { kind: 'company', id: result.resolved.ticker }
      : result.country
        ? { kind: 'country', id: result.country.iso3 }
        : null;
  return {
    baseline: true,
    researchScope: { domains: [], subject: subj },
    baselineSources: [
      ...(result.corporaUsed || []),
      ...(result.dossier?.kind === 'politician' ? ['politician_dossier'] : []),
      ...(result.dossier?.kind === 'sector'
        ? ['congress_sector', 'contracts_history', 'price_performance']
        : []),
    ],
    visualizations: [],
    brief: result.answer || '',
    limitations: [],
    researchMetadata: { durationMs },
    methodology: { deterministic: false },
  };
}

/** Mean composite and per-metric means over scored runs. */
export function summarize(scores) {
  const comps = scores.map((s) => s.composite).filter((v) => v != null);
  const keys = Object.keys(scores[0]?.metrics || {});
  const means = {};
  for (const k of keys) {
    const vs = scores.map((s) => s.metrics[k]).filter((v) => v != null);
    means[k] = vs.length ? Number((vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(4)) : null;
  }
  return {
    composite: comps.length
      ? Number((comps.reduce((a, b) => a + b, 0) / comps.length).toFixed(4))
      : null,
    means,
    n: scores.length,
  };
}
