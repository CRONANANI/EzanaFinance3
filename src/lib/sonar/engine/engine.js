/**
 * Sonar research engine v3: the executor (Sections 2, 4, 6, 7).
 *
 *   QUERY -> understanding -> resolution -> research spec -> plan
 *         -> evidence tasks (parallel, bounded) -> scoring and packing
 *         -> analysis (metrics, charts) -> relationships
 *         -> structured synthesis -> claim validation -> report
 *
 * Every stage emits a real event through `emit(type, data)`, which the
 * streaming route forwards as Server-Sent Events: the client never shows a
 * progress state that did not happen. Phase 1 (understanding, resolution,
 * spec, plan) is emitted as soon as it exists, typically well under 1.5 s.
 *
 * Every task and the synthesis are bounded by the run deadline; a failed or
 * slow task costs that task. If synthesis fails, or validation removes every
 * claim, the deterministic report quotes the records directly. A partial,
 * true answer beats a complete-looking unsupported one.
 *
 * SERVER ONLY. Domain logic lives in the modules it calls; this file only
 * orchestrates.
 */
import { understandQuery } from '@/lib/sonar/understand';
import { synthesizeWithFallback, HAIKU_MODEL } from '@/lib/sonar/llm-providers';
import { enforceGrounding } from '@/lib/sonar/groundingGuard';
import { getAdminClient } from '@/lib/supabase';
import { scoreDomains, buildResearchSpec } from './research-spec';
import { resolveResearch } from './resolution';
import { planResearch } from './planner';
import { RUNNERS } from './sources';
import { toEvidence, scoreEvidence, packEvidence, withMarkers } from './evidence';
import { analyze } from './analysis';
import { discoverRelationships, paths } from './relationships';
import {
  SYNTHESIS_SYSTEM,
  SYNTHESIS_PROMPT_VERSION,
  synthesisInput,
  parseResearchJson,
  validateResearch,
  deterministicResearch,
  renderBrief,
} from './findings';
import { loadActiveConfig } from './config-store';
import { recallEvidence } from './memory';
import { setCacheClient } from './cache';

export const ENGINE_VERSION = 'engine-v3.0';

/* Research depth: model, output tokens, run budget, synthesis reserve. */
export const DEPTH_PROFILES = {
  quick: {
    model: process.env.SONAR_FAST_MODEL || HAIKU_MODEL,
    tokens: 1000,
    budgetMs: 9_000,
    synthMs: 4_500,
    maxItems: 10,
    maxChars: 5000,
  },
  standard: {
    model: process.env.SONAR_FAST_MODEL || HAIKU_MODEL,
    tokens: 1600,
    budgetMs: 28_000,
    synthMs: 9_000,
    maxItems: 16,
    maxChars: 9000,
  },
  deep: {
    model: process.env.SONAR_LANDING_MODEL || 'claude-sonnet-4-5',
    tokens: 2600,
    budgetMs: 80_000,
    synthMs: 30_000,
    maxItems: 28,
    maxChars: 16000,
  },
};

function todayLine(now) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);
}

/**
 * Run one research assignment.
 * @param {string} query
 * @param {{ admin?: object, runId: string, depth?: 'quick'|'standard'|'deep', deadlineAt?: number,
 *   entitledDatasets?: string[]|null, emit?: Function, signal?: AbortSignal, scope?: { userId?: string|null, orgId?: string|null },
 *   noCorrect?: boolean, force?: object|null, now?: Date }} opts
 */
export async function runResearch(query, opts = {}) {
  const {
    admin = getAdminClient(),
    runId,
    depth = 'standard',
    entitledDatasets = null,
    emit = () => {},
    signal = null,
    scope = {},
    noCorrect = false,
    force = null,
    now = new Date(),
  } = opts;
  setCacheClient(() => admin);
  const D = DEPTH_PROFILES[depth] || DEPTH_PROFILES.standard;
  const startedAt = Date.now();
  const deadline = Number(opts.deadlineAt) || startedAt + D.budgetMs;
  const left = () => deadline - Date.now();
  const aborted = () => Boolean(signal?.aborted);
  const trace = [];
  const leg = async (name, fn, note) => {
    const t0 = Date.now();
    try {
      const v = await fn();
      trace.push({ leg: name, ok: true, ms: Date.now() - t0, note: note ? note(v) : undefined });
      return v;
    } catch (e) {
      trace.push({ leg: name, ok: false, ms: Date.now() - t0, note: e?.name || 'threw' });
      throw e;
    }
  };
  const bounded = (p, ms) =>
    Promise.race([
      p,
      new Promise((_, rej) =>
        setTimeout(
          () => rej(Object.assign(new Error('timeout'), { name: 'TimeoutError' })),
          Math.max(0, ms),
        ),
      ),
    ]);

  /* ── Phase 1: understand, resolve, specify, plan ─────────────────── */
  emit('stage', { stage: 'understanding' });
  const understood = await leg(
    'understand',
    () => understandQuery(query, { noCorrect, force }),
    (v) => v.intent,
  );
  const prelim = scoreDomains(query, understood);
  const resolution = await leg(
    'resolve',
    () => bounded(resolveResearch(understood, { query, admin, ms: 1100, domains: prelim }), 1600),
    (v) => v.subject?.kind || 'none',
  ).catch(() => ({ subject: null, countries: [], universe: null, notes: ['resolution_failed'] }));
  const spec = buildResearchSpec(understood, { query, resolution, depth, now });
  /* A config override is for evaluation only (the recalibration gate runs
     candidates against the benchmarks); production reads the active row. */
  const config = opts.config || (await loadActiveConfig(admin).catch(() => null));
  const plan = planResearch(spec, resolution, {
    config: config || undefined,
    depth,
    entitledDatasets,
  });
  const phase1 = {
    runId,
    engine: ENGINE_VERSION,
    understood: {
      raw: understood.raw,
      corrected: understood.corrected,
      corrections: understood.corrections,
      display: understood.display,
      intent: understood.intent,
      entities: understood.entities,
      ambiguities: understood.ambiguities,
    },
    subject: resolution.subject,
    universe: resolution.universe
      ? {
          label: resolution.universe.label,
          basis: resolution.universe.basis,
          count: resolution.universe.tickers.length,
        }
      : null,
    spec: {
      question: spec.question,
      objective: spec.objective,
      domains: spec.domains.slice(0, 6),
      timeHorizon: spec.timeHorizon,
      ranking: spec.ranking,
      comparison: spec.comparison,
      relationships: spec.relationships,
      reportComponents: spec.reportComponents,
      depth,
    },
    plan: {
      configVersion: plan.configVersion,
      tasks: plan.tasks.map((t) => ({
        id: t.id,
        source: t.source,
        priority: t.priority,
        reason: t.reason,
      })),
      excluded: plan.excluded,
      visualizations: plan.visualizations,
    },
    phase1Ms: Date.now() - startedAt,
  };
  emit('plan', phase1);

  /* ── Phase 2: evidence ───────────────────────────────────────────── */
  emit('stage', { stage: 'retrieving' });
  const memory = await recallEvidence(admin, { subject: resolution.subject, scope, now }).catch(
    () => [],
  );
  const layout = {};
  const raw = [];
  const ctxBase = { admin, now };
  await Promise.all(
    plan.tasks.map(async (t) => {
      const run = RUNNERS[t.source];
      if (!run) return;
      emit('task', { id: t.id, source: t.source, status: 'running' });
      const ms = Math.min(t.budgetMs, left() - D.synthMs);
      if (ms < 300 || aborted()) {
        trace.push({ leg: `task:${t.source}`, ok: false, ms: 0, note: 'no_time' });
        emit('task', { id: t.id, source: t.source, status: 'skipped' });
        return;
      }
      try {
        const out = await leg(
          `task:${t.source}`,
          () => bounded(run(t.params, { ...ctxBase, ms, maxItems: t.maxItems }), ms),
          (v) => `items=${v?.items?.length || 0}`,
        );
        const items = (out?.items || []).map((it) => toEvidence(it, { source: t.source }));
        raw.push(...items);
        Object.assign(layout, out?.layout || {});
        emit('task', { id: t.id, source: t.source, status: 'done', items: items.length });
        if (out?.layout) emit('panel', { source: t.source, layout: out.layout });
      } catch (e) {
        emit('task', {
          id: t.id,
          source: t.source,
          status: e?.name === 'TimeoutError' ? 'timeout' : 'failed',
        });
      }
    }),
  );
  /* Fresh evidence supersedes the remembered copy of the same record. */
  const freshIds = new Set(raw.map((e) => e.id));
  const all = [...raw, ...memory.filter((m) => !freshIds.has(m.id))];
  if (memory.length) {
    emit('memory', {
      recalled: memory.length,
      newSinceLast: raw.filter((e) => !memory.some((m) => m.id === e.id)).length,
      lastRetrievedAt: memory[0]?.historical?.retrievedAt || null,
    });
  }

  /* ── Evidence selection ──────────────────────────────────────────── */
  emit('stage', { stage: 'verifying_evidence' });
  const subjectTerms = [
    resolution.subject?.label,
    resolution.subject?.id,
    ...(resolution.politician ? [resolution.politician.lastName] : []),
  ].filter(Boolean);
  const universe = resolution.universe?.tickers || [];
  const scored = all.map((e) => ({
    evidence: e,
    ...scoreEvidence(e, spec, { subjectTerms, universe, now }),
  }));
  const { selected, decisions } = packEvidence(scored, {
    maxItems: D.maxItems,
    maxChars: D.maxChars,
  });
  const marked = withMarkers(selected);
  emit('evidence', {
    retrieved: all.length,
    selected: marked.map((e) => ({
      id: e.id,
      marker: e.marker,
      source: e.source,
      category: e.category,
      title: e.title,
      score: e.score,
      why: e.why,
    })),
    excluded: decisions.filter((d) => !d.selected).length,
  });

  /* ── Analysis and relationships ──────────────────────────────────── */
  emit('stage', { stage: 'analyzing' });
  const { metrics, visualizations } = analyze(all, spec);
  emit('analysis', { metrics, visualizations });
  const relationships = discoverRelationships(all, layout);
  const rootId = resolution.subject
    ? `${resolution.subject.kind === 'politician' ? 'politician' : resolution.subject.kind}:${String(resolution.subject.id).toLowerCase()}`
    : null;
  emit('relationships', {
    relationships: relationships.slice(0, 80),
    paths: rootId ? paths(relationships, rootId) : [],
  });

  /* ── Synthesis and validation ────────────────────────────────────── */
  emit('stage', { stage: 'synthesizing' });
  let report = null;
  let providerErrors = [];
  let model = null;
  if (marked.length && left() > 2_500 && !aborted()) {
    const synth = await leg(
      'synthesize',
      () =>
        synthesizeWithFallback({
          system: SYNTHESIS_SYSTEM,
          user: synthesisInput({ spec, plan, marked, metrics, today: todayLine(now) }),
          maxTokens: D.tokens,
          model: D.model,
          fallbackModel: HAIKU_MODEL,
          webSearch: { enabled: false },
          deadlineAt: deadline - 400,
          minHopMs: 2_000,
          reserveMs: 0,
        }),
      (v) => (v?.answer ? 'answered' : v?.degraded || 'no answer'),
    ).catch(() => null);
    providerErrors = synth?.providerErrors || [];
    model = synth?.model || D.model;
    const parsed = parseResearchJson(synth?.answer);
    if (parsed) {
      report = validateResearch(parsed, { marked, metrics });
      if (!report.executiveConclusion && !report.keyFindings.length) report = null;
    }
  }
  if (!report) report = deterministicResearch({ spec, marked, metrics });

  /* The rendered text passes the existing grounding guard too. */
  const brief = await enforceGrounding(
    renderBrief(report),
    marked.map((e) => `${e.title}. ${e.text}`),
    null,
  )
    .then((r) => r.text)
    .catch(() => renderBrief(report));
  emit('findings', { report, brief });

  const run = {
    runId,
    engine: ENGINE_VERSION,
    promptVersion: SYNTHESIS_PROMPT_VERSION,
    configVersion: plan.configVersion,
    researchQuestion: spec.question,
    researchScope: {
      domains: spec.domains.slice(0, 6),
      subject: resolution.subject,
      universe: phase1.universe,
      geography: spec.geography,
      timeHorizon: spec.timeHorizon,
      depth,
    },
    executiveConclusion: report.executiveConclusion,
    keyFindings: report.keyFindings,
    quantitativeMetrics: metrics,
    analysis: report.analysis,
    relationships,
    visualizations,
    evidence: marked.map((e) => ({
      id: e.id,
      marker: e.marker,
      source: e.source,
      category: e.category,
      title: e.title,
      text: e.text,
      url: e.url,
      date: e.date,
      period: e.period,
      retrievedAt: e.retrievedAt,
      historical: e.historical,
      score: e.score,
      why: e.why,
    })),
    methodology: {
      plan: phase1.plan,
      evidence: { retrieved: all.length, selected: marked.length, decisions },
      deterministic: Boolean(report.deterministic),
    },
    limitations: report.limitations,
    followOnResearch: report.followOnResearch,
    confidence: report.confidence,
    brief,
    layout,
    understood: phase1.understood,
    researchMetadata: {
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      phase1Ms: phase1.phase1Ms,
      model,
      providerErrors,
      validation: report.validation?.stats || null,
      validationLog: report.validation?.log || [],
      trace,
      partial: trace.some((t) => !t.ok),
      aborted: aborted(),
    },
  };
  emit('report', run);
  return run;
}
