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
import {
  planResearch,
  memoContextCountries,
  macroSeriesParams,
  paramsFor,
  SOURCE_DATASET,
  DEPTHS,
} from './planner';
import { routeMacro } from '@/lib/sonar/macro/route';
import { classifyCore } from '@/lib/sonar/research-mode-core';
import { ANALYSTS } from '@/lib/sonar/analysts/registry';
import {
  planTeam,
  markFreshness,
  capabilityOf,
  runSpecialists,
  directorSystemAddendum,
  directorBlock,
  methodologyBlock,
  redTeamSystem,
  parseRedTeam,
  resolutionSystem,
  applyResolutions,
  evidenceLines,
  teamView,
  teamMetrics,
} from '@/lib/sonar/analysts/orchestrator';
import * as quant from '@/lib/sonar/analysts/quant';
import {
  auditReport,
  applyAuditFixes,
  auditSystem,
  parseModelAudit,
  mergeModelAudit,
} from '@/lib/sonar/analysts/audit';
import { loadOrgMethodology } from '@/lib/org-sonar/research-methodology';
import { MACRO_LENS, frameworkPrompt } from '@/lib/sonar/macro/playbook';
import { RUNNERS, MEMO_MACRO_FAMILIES, MEMO_MACRO_LABEL } from './sources';
import { toEvidence, scoreEvidence, packEvidence, withMarkers } from './evidence';
import { analyze } from './analysis';
import { SOURCES, DEFAULT_CONFIG, weightOf } from './domains';
import { discoverRelationships, paths } from './relationships';
import {
  SYNTHESIS_SYSTEM,
  SYNTHESIS_PROMPT_VERSION,
  synthesisInput,
  parseResearchJson,
  validateResearch,
  validateClaim,
  ensureRankingAnswer,
  deterministicResearch,
  renderBrief,
} from './findings';
import {
  MEMO_PROMPT_VERSION,
  POSITIONING_PROMPT_VERSION,
  FUND_FIT_PROMPT_VERSION,
  memoSystem,
  memoInput,
  validateMemo,
  deterministicMemo,
  renderMemoBrief,
} from './investment-memo';
import { loadActiveConfig } from './config-store';
import { challengeAddendum, validateChallenge, CHALLENGE_PROMPT_SUFFIX } from './challenge';
import { recallEvidence } from './memory';
import { setCacheClient } from './cache';
import { analyticalIntent, intentBlock } from '@/lib/sonar/insight/intent';
import { semanticFamilyScores } from '@/lib/sonar/insight/semantic';
import { gateEvidence } from '@/lib/sonar/insight/relevance';
import { applyInsightStep } from '@/lib/sonar/insight/pipeline';

/* v3.1 (Nov 2026): analytical intent, evidence relevance, insight selection and the
   visualization plan (lib/sonar/insight). */
export const ENGINE_VERSION = 'engine-v3.1';

/* The cached query embedder, loaded only when a standard or deep run asks for it. */
const embedQuery = (text) =>
  import('@/lib/rag/embed-cached').then((m) => m.embedViaSupabaseCached(text)).catch(() => null);

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
    /* Nov 6: 40 s (was 28) so one parallel round of specialists fits before the director. */
    budgetMs: 40_000,
    synthMs: 9_000,
    maxItems: 16,
    maxChars: 9000,
  },
  /* Deep research (Nov 2026): the evidence tasks get about 20 seconds, the
     written assessment up to about three minutes. The route's function cap
     is 300 seconds. */
  deep: {
    model: process.env.SONAR_DEEP_MODEL || process.env.SONAR_LANDING_MODEL || 'claude-sonnet-4-5',
    tokens: 2600,
    memoTokens: Number(process.env.SONAR_DEEP_TOKENS) || 6000,
    budgetMs: 280_000,
    synthMs: 200_000,
    maxItems: 36,
    maxChars: 30000,
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
/* Nov 6: how Sonar reasons about economies and markets, in every report and memo prompt.
   A company question keeps its structure; the lens shapes how macro context is read. A
   country, currency, macro, commodity or geopolitics question also reads its frameworks
   (max 3), and a currency question adds the structural, historical and scenario sections. */
export const CURRENCY_REPORT_ADDENDUM = `
This question concerns a country's currency or external position. In addition to the format above:
- Structural vulnerabilities: external debt, the credit gap, debt service and dollarisation, only where the evidence holds them.
- Historical stress episodes: the episodes the evidence finds in Ezana's own series, with what inflation and the policy rate did then.
- Policy scenarios over 6 to 12 months: conditional ("if X, then Y"), no probabilities, no forecasts of dates or levels.
- Separate sustained depreciation from an acute crisis; call a crisis only with evidence of disorderly moves, capital flight, reserves running low against obligations, or lost market access.
- Label the ex-post real rate as ex-post. Projections stay labelled as projections. Nothing is asserted without evidence.`;

export function macroAddendum(spec, resolution = null) {
  const params = spec?.memoKind ? null : macroSeriesParams(spec, resolution);
  const frameworks = params?.frameworks || [];
  if (!frameworks.length) return `\n\n${MACRO_LENS}`;
  return `\n\n${frameworkPrompt(frameworks)}${frameworks.includes('currency') ? CURRENCY_REPORT_ADDENDUM : ''}`;
}

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
    /* Sonar for organizations (Nov 2026), set by the research route only:
       the fund context of a fund fit run, and the conclusion a challenge
       run tests ({ claim, reportId }). */
    fund = null,
    challenge = null,
    /* Offline evaluation only (scripts/sonar-analyst-quality.mjs): frozen sources, resolution
       and memory replace live retrieval. Null in production. */
    evidenceOverride = null,
  } = opts;
  const runnerFor = (src) => evidenceOverride?.runners?.[src] ?? RUNNERS[src];
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
  const resolution = evidenceOverride?.resolution
    ? evidenceOverride.resolution
    : await leg(
        'resolve',
        () =>
          bounded(resolveResearch(understood, { query, admin, ms: 1100, domains: prelim }), 1600),
        (v) => v.subject?.kind || 'none',
      ).catch(() => ({
        subject: null,
        countries: [],
        universe: null,
        notes: ['resolution_failed'],
      }));
  const spec = buildResearchSpec(understood, { query, resolution, depth, now, fund });
  if (challenge?.claim) spec.challenge = { claim: String(challenge.claim).slice(0, 900) };
  /* Nov 2026: what the question is trying to establish (lib/sonar/insight/intent.js). The
     lexical intent is immediate; standard and deep runs refine it with semantic family
     matching, computed in parallel with retrieval so it adds no wait. */
  let intent = analyticalIntent(query, { spec, understood });
  const semanticP =
    depth !== 'quick' && !evidenceOverride
      ? semanticFamilyScores(spec.rawQuery || query, { embed: embedQuery, timeoutMs: 700 }).catch(
          () => null,
        )
      : Promise.resolve(null);
  /* Nov 6: the active organization's research methodology (defaults for everyone else). Its
     horizon applies when the question names none; it reaches the director and the valuation,
     portfolio and equity analysts. */
  const methodology = scope.orgId
    ? await bounded(loadOrgMethodology(admin, scope.orgId), 1200).catch(() => null)
    : null;
  if (
    methodology &&
    !methodology.isDefault &&
    methodology.horizonMonths &&
    (!spec.timeHorizon || spec.timeHorizon.kind === 'unspecified')
  ) {
    spec.timeHorizon = {
      ...(spec.timeHorizon || {}),
      kind: 'organization',
      months: methodology.horizonMonths,
    };
  }
  /* A config override is for evaluation only (the recalibration gate runs
     candidates against the benchmarks); production reads the active row. */
  const config = opts.config || (await loadActiveConfig(admin).catch(() => null));
  const plan = planResearch(spec, resolution, {
    config: config || undefined,
    depth,
    entitledDatasets,
  });
  /* A fund fit run checks the fund's mandate and IPS for the company. */
  if (spec.memoKind === 'fund_fit' && resolution.subject?.id) {
    plan.tasks.push({
      id: `t${plan.tasks.length + 1}_fund_mandate`,
      source: 'fund_mandate',
      params: { ticker: String(resolution.subject.id).toUpperCase(), fund },
      priority: 1,
      maxItems: 1,
      budgetMs: plan.tasks[0]?.budgetMs || 8000,
      dependsOn: [],
      reason: 'fund_fit',
      drivers: [{ domain: 'fund_fit', contribution: 1 }],
    });
  }
  /* ── The research team ───────────────────────────────────────────── */
  /* Nov 6: the router picks a lead and supporting specialists from the spec, the research-mode
     classification and the macro route; their required capabilities become required evidence.
     Quick runs route the lead only (no analyst calls). */
  const teamMode = depth === 'deep' ? 'deep' : depth === 'quick' ? 'quick' : 'standard';
  const classification = (() => {
    try {
      return classifyCore(query, { understood, now, coverage: null });
    } catch {
      return { mode: teamMode, operations: [] };
    }
  })();
  const macroRoute = routeMacro(query);
  const redTeamWanted =
    teamMode === 'deep' ||
    Boolean(methodology && !methodology.isDefault && methodology.redTeamRequired);
  let team = planTeam({
    spec: { ...spec, rawQuery: spec.rawQuery || query },
    classification,
    route: macroRoute,
    orgId: scope.orgId || null,
    mode: teamMode,
  });
  if (teamMode !== 'quick' && team.routing.lead) {
    const entitled = entitledDatasets ? new Set(entitledDatasets) : null;
    const planned = new Set(plan.tasks.map((t) => t.source));
    const room = () => (DEPTHS[depth] || DEPTHS.standard).maxTasks + 4 - plan.tasks.length;
    const addSource = (source, reason) => {
      if (planned.has(source) || !runnerFor(source)) return;
      const ds = SOURCE_DATASET[source];
      if (entitled && ds && !entitled.has(ds)) return;
      const params = paramsFor(source, resolution, spec);
      if (!params) return;
      planned.add(source);
      plan.tasks.push({
        id: `t${plan.tasks.length + 1}_${source}`,
        source,
        params,
        priority: 0.7,
        maxItems: (DEPTHS[depth] || DEPTHS.standard).items,
        budgetMs: plan.tasks[0]?.budgetMs || (DEPTHS[depth] || DEPTHS.standard).taskMs,
        dependsOn: [],
        reason,
        drivers: [{ domain: 'research_team', contribution: 0.7 }],
      });
    };
    team.sources.forEach((src) => addSource(src, 'team:required'));
    /* Nov 7: a preferred source that needs no subject (a broad scan such as lobbying
       leaders) runs only when one of the question's domains asks for it. Otherwise it spends
       a task budget on an unrelated scan: on "How has congressional trading changed?" lobbying
       leaders timed out at 20 s and left the lead analyst too little time to report. */
    const wantedByDomain = (src) =>
      (spec.domains || []).some((d) => weightOf(config || DEFAULT_CONFIG, d.id, src) > 0);
    team.preferredSources.forEach(
      (src) =>
        room() > 0 &&
        ((SOURCES[src]?.needs || []).length || wantedByDomain(src)) &&
        addSource(src, 'team:preferred'),
    );
    /* macro_series reads the team's families first. */
    const macroTask = plan.tasks.find((t) => t.source === 'macro_series');
    if (macroTask && team.families.length) {
      macroTask.params = {
        ...macroTask.params,
        families: [...new Set([...team.families, ...(macroTask.params.families || [])])],
      };
    }
  }
  const titled = (s) => (s ? { id: s.id, title: ANALYSTS[s.id]?.title, score: s.score } : null);

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
      format: spec.format,
      memoKind: spec.memoKind,
      angles: spec.angles,
      challenge: spec.challenge || null,
      intent: {
        primary: intent.primary,
        objectives: intent.objectives,
        family: intent.family,
        measure: intent.measure,
      },
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
    team: {
      mode: teamMode,
      lead: titled(team.routing.lead),
      supporting: (team.routing.supporting || []).map(titled),
      skipped: (team.routing.skipped || []).map((x) => ({
        title: ANALYSTS[x.id]?.title,
        reason: x.reason,
      })),
    },
  };
  emit('plan', phase1);
  const teamEvent = (routing) => {
    const v = teamView({ routing, specialists: [], audit: null, mode: teamMode });
    emit('team', {
      mode: teamMode,
      lead: v.lead,
      supporting: (routing.supporting || []).map((x) => ({
        id: x.id,
        title: ANALYSTS[x.id]?.title,
        reason: teamView({ routing: { lead: x }, specialists: [], audit: null, mode: teamMode })
          .lead?.reason,
      })),
      controls:
        teamMode === 'quick'
          ? ['methodology-auditor']
          : ['research-director', 'methodology-auditor', ...(redTeamWanted ? ['red-team'] : [])],
    });
  };
  if (team.routing.lead) teamEvent(team.routing);

  /* ── Phase 2: evidence ───────────────────────────────────────────── */
  emit('stage', { stage: 'retrieving' });
  const memory = evidenceOverride
    ? evidenceOverride.memory || []
    : await recallEvidence(admin, { subject: resolution.subject, scope, now }).catch(() => []);
  const layout = {};
  const raw = [];
  const ctxBase = { admin, now };
  await Promise.all(
    plan.tasks.map(async (t) => {
      const run = runnerFor(t.source);
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
  /* Company memo (Nov 2026): macro context for the countries the company reports revenue
     from, once the revenue, export-control and customer evidence has named them. Labelled
     as context, never as the company's exposure. */
  if (spec.format === 'investment_memo' && runnerFor('macro_series') && !aborted()) {
    const countries = memoContextCountries(raw, resolution);
    const ms = Math.min(4000, left() - D.synthMs);
    if (countries.length && ms >= 800) {
      const t = {
        id: `t${plan.tasks.length + 1}_macro_series`,
        source: 'macro_series',
        params: {
          countries,
          themes: [],
          families: MEMO_MACRO_FAMILIES,
          contextLabel: MEMO_MACRO_LABEL,
        },
        priority: 0.6,
        maxItems: 8,
        budgetMs: ms,
        dependsOn: ['revenue_geo', 'export_controls', 'customer_capex'],
        reason: 'investment_memo:country_context',
        drivers: [{ domain: 'investment_memo', contribution: 0.6 }],
      };
      plan.tasks.push(t);
      emit('task', { id: t.id, source: t.source, status: 'running' });
      try {
        const out = await leg(
          'task:macro_series:context',
          () =>
            bounded(
              runnerFor('macro_series')(t.params, { ...ctxBase, ms, maxItems: t.maxItems }),
              ms,
            ),
          (v) => `items=${v?.items?.length || 0}`,
        );
        const items = (out?.items || []).map((it) => toEvidence(it, { source: t.source }));
        raw.push(...items);
        if (out?.layout) Object.assign(layout, { macroContext: out.layout.macro });
        emit('task', { id: t.id, source: t.source, status: 'done', items: items.length });
      } catch (e) {
        emit('task', {
          id: t.id,
          source: t.source,
          status: e?.name === 'TimeoutError' ? 'timeout' : 'failed',
        });
      }
    }
  }
  /* Two sources can state the same series (macro_country appends the country's catalogue
     rows; macro_series may read them too): keep one copy of an identical statement. */
  {
    const seen = new Set();
    for (let i = raw.length - 1; i >= 0; i -= 1) {
      const k = `${raw[i].title}|${raw[i].text}`;
      if (raw[i].kind === 'series' && seen.has(k)) raw.splice(i, 1);
      else seen.add(k);
    }
  }
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
  /* The semantic family score was computed during retrieval; refine the intent with it. */
  const semantic = await semanticP;
  if (semantic) intent = analyticalIntent(query, { spec, understood, semantic });
  /* Nov 2026: every record is classified against the intent (direct, supporting,
     background, irrelevant). Irrelevant records never reach scoring or the answer. */
  const relevanceGate = gateEvidence(all, intent, { now });
  const subjectTerms = [
    resolution.subject?.label,
    resolution.subject?.id,
    ...(resolution.politician ? [resolution.politician.lastName] : []),
  ].filter(Boolean);
  const universe = resolution.universe?.tickers || [];
  const scored = relevanceGate.kept.map((e) => ({
    evidence: e,
    ...scoreEvidence(e, spec, { subjectTerms, universe, now }),
  }));
  const { selected, decisions } = packEvidence(scored, {
    maxItems: D.maxItems,
    maxChars: D.maxChars,
  });
  /* A fund fit memo always cites the fund's own mandate record, first. */
  const mandate =
    spec.memoKind === 'fund_fit' ? scored.find((x) => x.evidence.source === 'fund_mandate') : null;
  const marked = withMarkers(
    mandate
      ? [
          { ...mandate, why: ['fund_mandate'] },
          ...selected.filter((x) => x.evidence.source !== 'fund_mandate'),
        ]
      : selected,
  );
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
    irrelevant: relevanceGate.dropped.length,
  });

  /* ── Analysis and relationships ──────────────────────────────────── */
  emit('stage', { stage: 'analyzing' });
  const { metrics, visualizations } = analyze(all, spec);
  /* Nov 6: the quantitative engine's calculations on the selected evidence (both FX
     conventions, the ex-post real rate, REER against its history), citable as M:id. */
  if (teamMode !== 'quick') {
    const have = new Set(metrics.map((m) => m.id));
    for (const m of teamMetrics(marked, quant)) if (!have.has(m.id)) metrics.push(m);
  }
  emit('analysis', { metrics, visualizations });
  const relationships = discoverRelationships(all, layout);
  const rootId = resolution.subject
    ? `${resolution.subject.kind === 'politician' ? 'politician' : resolution.subject.kind}:${String(resolution.subject.id).toLowerCase()}`
    : null;
  emit('relationships', {
    relationships: relationships.slice(0, 80),
    paths: rootId ? paths(relationships, rootId) : [],
  });

  /* ── Specialists ─────────────────────────────────────────────────── */
  /* Re-check evidence fit with what the shared retrieval actually returned, then run the
     specialists in parallel on their scoped evidence. Each item is marked current or stale. */
  const markedF = markFreshness(marked, { now });
  let specialists = [];
  let teamRun = { dropped: [], estimatedUsd: 0 };
  if (teamMode !== 'quick' && team.routing.lead && marked.length && !aborted()) {
    const available = new Set(all.map(capabilityOf).filter(Boolean));
    const recheck = planTeam({
      spec: { ...spec, rawQuery: spec.rawQuery || query },
      classification,
      route: macroRoute,
      orgId: scope.orgId || null,
      available,
      mode: teamMode,
    });
    if (recheck.routing.lead) {
      const changed =
        recheck.routing.lead.id !== team.routing.lead.id ||
        (recheck.routing.supporting || []).map((x) => x.id).join() !==
          (team.routing.supporting || []).map((x) => x.id).join();
      team = recheck;
      if (changed) teamEvent(team.routing);
    }
    const capMs = teamMode === 'deep' ? 70_000 : 14_000;
    const until = Math.min(deadline - D.synthMs, Date.now() + capMs);
    if (until - Date.now() > 4_000) {
      emit('stage', { stage: 'specialists' });
      teamRun = await leg(
        'specialists',
        () =>
          runSpecialists({
            routing: team.routing,
            spec: { ...spec, rawQuery: spec.rawQuery || query },
            marked: markedF,
            metrics,
            mode: teamMode,
            deadlineAt: until,
            emit,
            methodology,
            synth: synthesizeWithFallback,
            models: {
              fast: process.env.SONAR_ANALYST_FAST_MODEL || DEPTH_PROFILES.standard.model,
              strong: process.env.SONAR_ANALYST_STRONG_MODEL || DEPTH_PROFILES.deep.model,
            },
            today: todayLine(now),
          }),
        (v) =>
          `done=${v.specialists.filter((x) => x.status === 'done').length}/${v.specialists.length}`,
      ).catch(() => ({ specialists: [], dropped: [], estimatedUsd: 0 }));
      specialists = teamRun.specialists || [];
    }
  }
  const withTeam = specialists.some((x) => x.status === 'done');

  /* ── Synthesis and validation ────────────────────────────────────── */
  emit('stage', { stage: 'synthesizing' });
  if (withTeam)
    emit('analyst', {
      id: 'research-director',
      title: ANALYSTS['research-director'].title,
      role: 'director',
      status: 'started',
    });
  let report = null;
  let providerErrors = [];
  let parsedChallenge = null;
  let model = null;
  const memo = spec.format === 'investment_memo';
  if (marked.length && left() > 2_500 && !aborted()) {
    const synth = await leg(
      'synthesize',
      () =>
        synthesizeWithFallback({
          system:
            (memo ? memoSystem(spec) : SYNTHESIS_SYSTEM) +
            macroAddendum(spec, resolution) +
            (withTeam ? directorSystemAddendum(teamMode) : '') +
            (spec.challenge ? challengeAddendum(spec.challenge.claim) : ''),
          user:
            (memo ? memoInput : synthesisInput)({
              spec,
              plan,
              marked,
              metrics,
              today: todayLine(now),
            }) +
            (withTeam ? directorBlock(specialists) : '') +
            methodologyBlock(methodology) +
            (memo ? '' : intentBlock(intent)),
          /* A positioning memo writes sections per angle as well as risks. */
          maxTokens: memo
            ? spec.memoKind === 'positioning'
              ? Math.max(D.memoTokens || D.tokens, 8000)
              : D.memoTokens || D.tokens
            : D.tokens,
          model: D.model,
          fallbackModel: HAIKU_MODEL,
          webSearch: { enabled: false },
          deadlineAt: deadline - 400,
          minHopMs: 2_000,
          reserveMs: 0,
          /* One long call for a written assessment; the provider chain's
             own caps (25 s a hop, 50 s a chain) stay for every other run. */
          ...(depth === 'deep' ? { maxHopMs: D.synthMs, chainMs: D.synthMs + 5_000 } : {}),
        }),
      (v) => (v?.answer ? 'answered' : v?.degraded || 'no answer'),
    ).catch(() => null);
    providerErrors = synth?.providerErrors || [];
    model = synth?.model || D.model;
    const parsed = parseResearchJson(synth?.answer);
    parsedChallenge = parsed?.challenge || null;
    if (parsed) {
      report = memo
        ? validateMemo(parsed, {
            marked,
            metrics,
            kind: spec.memoKind,
            mandate: layout.fundFit || null,
          })
        : validateResearch(parsed, { marked, metrics });
      if (!report.executiveConclusion && !report.keyFindings.length) report = null;
    }
  }
  if (!report)
    report = memo
      ? deterministicMemo({ spec, marked, metrics })
      : deterministicResearch({ spec, marked, metrics });
  /* Nov 6: a ranking question opens with its ranking, even when the model's ranking claims
     did not survive validation. */
  if (!memo) ensureRankingAnswer(report, { visualizations, marked, metrics });
  /* Nov 2026: the insight step (lib/sonar/insight/pipeline.js). Deterministic findings join
     the model's, every candidate is scored for relevance, new information, evidence, depth
     and usefulness, restatements of the answer or a chart move to supporting facts, and the
     charts are planned so no two show the same comparison. No model call. */
  let insightRun = { diagnostics: null, visualPlan: null };
  if (!memo) {
    try {
      insightRun = applyInsightStep(report, {
        intent,
        marked,
        metrics,
        visualizations,
        layout,
        depth,
      });
      emit('analysis', { metrics, visualizations, intent: report.insight?.intent || null });
    } catch {
      /* The report stands as validated; the step is an improvement, never a dependency. */
    }
  }
  if (spec.challenge) {
    report.challenge = validateChallenge(report.deterministic ? null : parsedChallenge, {
      marked,
      metrics,
      claim: spec.challenge.claim,
    });
  }

  if (withTeam)
    emit('analyst', {
      id: 'research-director',
      title: ANALYSTS['research-director'].title,
      role: 'director',
      status: report.deterministic ? 'failed' : 'done',
    });

  /* ── The director's draft (Nov 7) ────────────────────────────────── */
  /* While the review passes run (red team, the director's resolution, the model audit
     review), the reader sees the director's draft, marked as under review. Sent only when
     one of those passes will run; otherwise findings follows at once and nothing changes.
     The brief passes the same grounding guard as the final one, and a guard failure sends
     no draft at all. The report is a deep copy, so later review edits do not alter what was
     sent. The draft never reaches a saved report: snapshots read the findings report only. */
  const redTeamAhead = redTeamWanted && withTeam && !report.deterministic && left() > 25_000;
  const auditReviewAhead = teamMode === 'deep' && !report.deterministic && left() > 15_000;
  if ((redTeamAhead || auditReviewAhead) && !aborted()) {
    try {
      const grounded = await enforceGrounding(
        memo ? renderMemoBrief(report) : renderBrief(report),
        marked.map((e) => `${e.title}. ${e.text}`),
        null,
      );
      if (typeof grounded?.text === 'string' && !aborted())
        emit('draft', { report: structuredClone(report), brief: grounded.text });
    } catch {
      /* No draft: the reader waits for findings, as before. */
    }
  }

  /* ── Red team (deep, or the org requires it) ─────────────────────── */
  let redTeam = null;
  if (redTeamWanted && withTeam && !report.deterministic && left() > 25_000 && !aborted()) {
    emit('stage', { stage: 'red_team' });
    emit('analyst', {
      id: 'red-team',
      title: ANALYSTS['red-team'].title,
      role: 'red-team',
      status: 'started',
    });
    const strong = process.env.SONAR_ANALYST_STRONG_MODEL || DEPTH_PROFILES.deep.model;
    const draft = memo ? renderMemoBrief(report) : renderBrief(report);
    const rt = await leg('red-team', () =>
      synthesizeWithFallback({
        system: redTeamSystem(),
        user: `Draft report:\n${draft}\n\nEvidence:\n${evidenceLines(markedF)}`,
        maxTokens: ANALYSTS['red-team'].maxOutputTokens?.deep || 1200,
        model: strong,
        fallbackModel: HAIKU_MODEL,
        webSearch: { enabled: false },
        deadlineAt: Math.min(deadline - 15_000, Date.now() + 45_000),
        minHopMs: 2_000,
        reserveMs: 0,
      }),
    ).catch(() => null);
    redTeam = parseRedTeam(rt?.answer);
    emit('analyst', {
      id: 'red-team',
      title: ANALYSTS['red-team'].title,
      role: 'red-team',
      status: redTeam ? 'done' : 'failed',
    });
    if (redTeam?.points.length) {
      const fin = await leg('director-final', () =>
        synthesizeWithFallback({
          system: resolutionSystem(),
          user: `Draft report:\n${draft}\n\nRed-team points:\n${redTeam.points
            .map((p, i) => `${i}. (${p.kind}) ${p.text} ${p.refs.map((r) => `[${r}]`).join('')}`)
            .join('\n')}\n\nEvidence:\n${evidenceLines(markedF)}`,
          maxTokens: 900,
          model: strong,
          fallbackModel: HAIKU_MODEL,
          webSearch: { enabled: false },
          deadlineAt: Math.min(deadline - 8_000, Date.now() + 30_000),
          minHopMs: 2_000,
          reserveMs: 0,
        }),
      ).catch(() => null);
      redTeam = applyResolutions(redTeam, parseResearchJson(fin?.answer));
      /* Incorporated points join the analysis, through the same claim validator; the rest
         become stated limitations. */
      const byMarker = new Map(marked.map((e) => [e.marker, e]));
      const metricsById = new Map(metrics.map((m) => [m.id, m]));
      report.analysis = report.analysis || [];
      report.limitations = report.limitations || [];
      redTeam.points.forEach((p, i) => {
        if (p.resolution === 'incorporated') {
          const refs = p.noteRefs.length ? p.noteRefs : p.refs;
          const v = validateClaim(
            {
              text: p.note,
              classification: 'analytical_interpretation',
              evidence: refs.filter((r) => /^S\d+$/.test(r)),
              metrics: refs.filter((r) => /^M:/.test(r)),
            },
            { byMarker, metricsById },
          );
          if (v.action !== 'removed') {
            report.analysis.push({
              id: `redteam_${i + 1}`,
              text: p.note,
              classification: v.classification,
              markers: refs.filter((r) => /^S\d+$/.test(r)),
              metrics: refs.filter((r) => /^M:/.test(r)).map((r) => r.slice(2)),
              evidenceIds: v.evidenceIds,
            });
          } else {
            p.resolution = 'limitation';
            report.limitations.push(p.text);
          }
        } else if (p.resolution === 'limitation') {
          report.limitations.push(p.note || p.text);
        }
      });
    }
  }

  /* ── Methodology audit (every report) ────────────────────────────── */
  emit('stage', { stage: 'auditing' });
  emit('analyst', {
    id: 'methodology-auditor',
    title: ANALYSTS['methodology-auditor'].title,
    role: 'auditor',
    status: 'started',
  });
  let audit = auditReport({
    report,
    marked: markedF,
    metrics,
    specialists,
    brief: memo ? renderMemoBrief(report) : renderBrief(report),
  });
  if (teamMode === 'deep' && !report.deterministic && left() > 15_000 && !aborted()) {
    const review = await leg('audit-review', () =>
      synthesizeWithFallback({
        system: auditSystem(),
        user: `Report:\n${memo ? renderMemoBrief(report) : renderBrief(report)}\n\nDeterministic checks:\n${audit.checks
          .map((c) => `${c.pass ? 'PASS' : 'FAIL'} ${c.id}: ${c.detail || ''}`)
          .join('\n')}\n\nEvidence:\n${evidenceLines(markedF)}`,
        maxTokens: ANALYSTS['methodology-auditor'].maxOutputTokens?.deep || 900,
        model: process.env.SONAR_ANALYST_STRONG_MODEL || DEPTH_PROFILES.deep.model,
        fallbackModel: HAIKU_MODEL,
        webSearch: { enabled: false },
        deadlineAt: Math.min(deadline - 4_000, Date.now() + 30_000),
        minHopMs: 2_000,
        reserveMs: 0,
      }),
    ).catch(() => null);
    audit = mergeModelAudit(audit, parseModelAudit(review?.answer));
  }
  report = applyAuditFixes(report, audit.fixes);
  emit('analyst', {
    id: 'methodology-auditor',
    title: ANALYSTS['methodology-auditor'].title,
    role: 'auditor',
    status: 'done',
  });
  emit('audit', { passed: audit.passed, total: audit.total, checks: audit.checks });
  if (team.routing.lead && teamMode !== 'quick') {
    report.team = teamView({
      routing: team.routing,
      specialists,
      audit,
      redTeam,
      metrics,
      marked: markedF,
      mode: teamMode,
    });
  }

  /* The rendered text passes the existing grounding guard too. */
  const brief = await enforceGrounding(
    memo ? renderMemoBrief(report) : renderBrief(report),
    marked.map((e) => `${e.title}. ${e.text}`),
    null,
  )
    .then((r) => r.text)
    .catch(() => (memo ? renderMemoBrief(report) : renderBrief(report)));
  emit('findings', { report, brief });

  const run = {
    runId,
    engine: ENGINE_VERSION,
    promptVersion: `${
      memo
        ? spec.memoKind === 'fund_fit'
          ? FUND_FIT_PROMPT_VERSION
          : spec.memoKind === 'positioning'
            ? POSITIONING_PROMPT_VERSION
            : MEMO_PROMPT_VERSION
        : SYNTHESIS_PROMPT_VERSION
    }${spec.challenge ? `+${CHALLENGE_PROMPT_SUFFIX}` : ''}`,
    format: memo ? 'investment_memo' : 'report',
    memo: memo
      ? {
          centralQuestion: report.centralQuestion,
          memoKind: report.memoKind || spec.memoKind,
          sections: report.sections || [],
          risks: report.risks,
          scenarios: report.scenarios,
          chain: report.chain,
          dataGaps: report.dataGaps,
          angles: spec.angles,
        }
      : null,
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
    visualPlan: insightRun.visualPlan
      ? {
          version: insightRun.visualPlan.version,
          items: insightRun.visualPlan.items.map((x) => ({
            ...x.spec,
            role: x.role,
            views: x.views,
          })),
          dropped: insightRun.visualPlan.dropped,
        }
      : null,
    intent: report.insight?.intent || null,
    supportingFacts: report.supportingFacts || [],
    conclusionLimits: report.conclusionLimits || null,
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
      relevance: e.relevance || null,
    })),
    methodology: {
      plan: phase1.plan,
      evidence: { retrieved: all.length, selected: marked.length, decisions },
      deterministic: Boolean(report.deterministic),
      /* For evaluation and telemetry; the reader sees titles through report.team. */
      routing: team.routing.lead
        ? {
            lead: team.routing.lead.id,
            supporting: (team.routing.supporting || []).map((x) => x.id),
            controls: team.routing.controls || [],
          }
        : null,
      audit: {
        passed: audit.passed,
        total: audit.total,
        checks: audit.checks.map((c) => ({ id: c.id, ok: c.pass })),
      },
    },
    limitations: report.limitations,
    team: report.team || null,
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
      /* Telemetry only: the insight step's decisions (never rendered). */
      insight: {
        intent: {
          primary: intent.primary,
          family: intent.family,
          objectives: intent.objectives,
          semantic: Boolean(semantic),
        },
        evidence: { kept: relevanceGate.kept.length, irrelevant: relevanceGate.dropped.length },
        ...(insightRun.diagnostics || {}),
      },
      trace,
      /* Telemetry only (never rendered): who ran, the audit, the pre-call cost estimate. */
      team: team.routing.lead
        ? {
            mode: teamMode,
            lead: team.routing.lead.id,
            supporting: specialists.filter((x) => x.role === 'supporting').map((x) => x.id),
            missing: specialists.filter((x) => x.status !== 'done').map((x) => x.id),
            dropped: teamRun.dropped || [],
            estimatedUsd: teamRun.estimatedUsd || 0,
            audit: {
              passed: audit.passed,
              total: audit.total,
              failed: audit.checks.filter((c) => !c.pass).map((c) => c.id),
            },
            redTeam: redTeam ? { verdict: redTeam.verdict, points: redTeam.points.length } : null,
            validation: specialists.map((x) => ({
              id: x.id,
              removed: (x.log || []).filter((l) => l.action === 'removed').length,
            })),
          }
        : null,
      cost: {
        usd: teamRun.estimatedUsd || 0,
        basis: 'pre-call estimate, specialists and controls',
      },
      partial: trace.some((t) => !t.ok),
      aborted: aborted(),
    },
  };
  emit('report', run);
  return run;
}
