/**
 * Sonar 5.0 (Nov 24 2026): the Research Composer's results as first-class research input.
 * Pure and client-safe.
 *
 * Before this, a composition reached the research engine as one quoted "attached file" in
 * the prompt preamble: its figures were not evidence, so the grounding check dropped every
 * claim that used them, and when the writer timed out the fallback quoted whatever records
 * the engine had retrieved for the first named person. Now:
 *
 *   compositionEvidence(c)   evidence items (source 'research_composer') the engine adds to
 *                            the evidence pool ahead of retrieval, so claims about the
 *                            overlap and the fundamentals validate and cite like any record
 *   fulfillmentContract(c)   the outputs the question requires and whether each was
 *                            produced, with one completion state
 *   fulfillmentBlock(f)      the contract as instructions for the writer
 *   deterministicAnswer(c,f) the answer computed from the results alone (used when the
 *                            writer fails, and as the executive answer when the writer's
 *                            does not report the requested result)
 *   answerCovers(report, c)  does a written answer report the requested result?
 *   clientComposition(c, f)  the compact typed payload the report renders
 */

import { conclusionRule, requiredOutputs } from './required-outputs.js';
import {
  OWNERSHIP_CAPABILITY,
  ownershipAnswer,
  quarterLabel,
  fmtInt,
  fmtUsd,
  fmtPct,
  fmtSigned,
} from './ownership.js';

export const COMPOSER_SOURCE = 'research_composer';

/** Completion states (spec: complete, limited coverage, partial, needs input, failed). */
export const COMPLETION = {
  complete: { key: 'complete', label: 'Complete' },
  limited: { key: 'limited', label: 'Complete with coverage limitations' },
  partial: { key: 'partial', label: 'Partially complete' },
  needs_input: { key: 'needs_input', label: 'Needs your input' },
  failed: { key: 'failed', label: 'Failed' },
};

const METRIC_LABEL = {
  revenue_growth: 'Revenue growth',
  gross_margin: 'Gross margin',
  operating_margin: 'Operating margin',
  net_margin: 'Net margin',
  fcf_margin: 'FCF margin',
  roe: 'ROE',
  debt_to_equity: 'Debt to equity',
};

const pct = (v) => (v == null || !Number.isFinite(v) ? null : `${(v * 100).toFixed(1)}%`);
const times = (v) => (v == null || !Number.isFinite(v) ? null : `${v.toFixed(2)}x`);
const usd = (v) => {
  if (v == null || !Number.isFinite(v)) return null;
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(0)}K`;
  return `${sign}$${a.toFixed(0)}`;
};
const metricText = (k, v) => (k === 'debt_to_equity' ? times(v) : pct(v));
const nameOf = (r) => `${r.issuer || r.ticker}${r.ticker ? ` (${r.ticker})` : ''}`;

const setResults = (c) => (c?.results || []).filter((r) => r.kind === 'query' && r.op && r.stats);
const analysisResults = (c, cap) =>
  (c?.results || []).filter((r) => r.capability && (!cap || r.capability === cap));
const failedSteps = (c) => (c?.results || []).filter((r) => r.status === 'failed');

/* ── evidence ───────────────────────────────────────────────────────── */

/**
 * Raw evidence items (toEvidence input) for every computed result. Each carries its data
 * and dates; titles name what was computed, not a source document.
 */
export function compositionEvidence(c) {
  const out = [];
  for (const s of setResults(c)) {
    const list = (s.matches || []).map(nameOf);
    const both = s.op === 'intersect';
    out.push({
      kind: 'aggregate',
      category: 'ezana_datasets',
      reliability: 0.95,
      title: s.title,
      text: [
        both
          ? `${s.stats.overlap} securities appear in both ${s.left?.label} and ${s.right?.label}, matched ${s.stats.level === 'issuer' ? 'by issuing company (CUSIP issuer prefix)' : 'on CUSIP (same security and share class)'}.`
          : `${s.stats.overlap} securities appear in both; ${s.stats.leftOnly} only in ${s.left?.label}; ${s.stats.rightOnly} only in ${s.right?.label}.`,
        list.length
          ? `${both ? 'Matching' : 'Resulting'} securities: ${list.slice(0, 25).join(', ')}.`
          : null,
        `${s.left?.label}: ${s.left?.count} securities with identifiers, ${s.left?.asOf || 'date not stated'}. ${s.right?.label}: ${s.right?.count} securities, reporting period ${(s.right?.periods || []).join(', ') || 'as returned by the query'}.`,
        ...(s.notes || []),
        'These are the latest available reported or estimated holdings in each dataset; a match is not verified simultaneous ownership.',
      ]
        .filter(Boolean)
        .join(' '),
      entities: (s.matches || []).map((m) => m.ticker).filter(Boolean),
      data: { op: s.op, stats: s.stats, matches: s.matches },
    });
  }
  for (const a of analysisResults(c, 'fundamental-analysis')) {
    for (const t of a.table || []) {
      const r = t.ratios;
      if (!r || r.revenue == null) continue;
      const parts = [
        `Revenue ${usd(r.revenue)}${r.revenue_growth != null ? ` (${pct(r.revenue_growth)} year over year)` : ''}`,
        ...['gross_margin', 'operating_margin', 'net_margin', 'fcf_margin', 'roe', 'debt_to_equity']
          .filter((k) => r[k] != null)
          .map((k) => `${METRIC_LABEL[k].toLowerCase()} ${metricText(k, r[k])}`),
        r.fcf != null ? `free cash flow ${usd(r.fcf)}` : null,
      ].filter(Boolean);
      out.push({
        kind: 'record',
        category: 'ezana_datasets',
        reliability: 0.95,
        title: `${nameOf(t)} fundamentals, fiscal year ending ${r.fiscalYearEnd || 'latest filed'}`,
        text: `${parts.join(', ')}. Calculated from SEC filed financials (annual), fiscal year ending ${r.fiscalYearEnd || 'latest filed'}.`,
        period: r.fiscalYearEnd || null,
        date: r.fiscalYearEnd || null,
        entities: [t.ticker].filter(Boolean),
        data: { ticker: t.ticker, ratios: r },
      });
    }
    if (a.coverage) {
      out.push({
        kind: 'aggregate',
        category: 'ezana_datasets',
        reliability: 0.95,
        title: 'Fundamental Analysis coverage',
        text: `${a.coverage.selected} companies selected for Fundamental Analysis; ${a.coverage.withData} have filed financials on record; ${a.coverage.complete ?? a.coverage.withData} have every requested metric.`,
        entities: [],
        data: { coverage: a.coverage },
      });
    }
  }
  for (const a of analysisResults(c, OWNERSHIP_CAPABILITY)) {
    const o = a.ownership;
    if (a.status !== 'done' || !o?.rows) continue;
    const ans = ownershipAnswer(o);
    const q = quarterLabel(o.period);
    out.push({
      kind: 'aggregate',
      category: 'ezana_datasets',
      reliability: 0.95,
      title: `Institutional ownership ranking, 13F ${q}`,
      text: `${ans.text} Ranked by ${ans.metricLabel.toLowerCase()} among ${fmtInt(o.coverage?.filers)} 13F filers with an effective filing for the quarter ending ${o.period}${o.prior ? `; quarter-over-quarter changes compare the ${fmtInt(o.coverage?.comparable)} filers that reported in both ${quarterLabel(o.prior)} and ${q}` : ''}. Universe: ${o.universe?.eligible} eligible common stocks from ${o.universe?.source}.`,
      period: o.period,
      date: o.period,
      entities: o.rows.map((r) => r.ticker).filter(Boolean),
      data: { ownership: true, period: o.period, metric: o.metric },
    });
    for (const r of o.rows.filter((x) => x.rank != null).slice(0, 25)) {
      out.push({
        kind: 'record',
        category: 'ezana_datasets',
        reliability: 0.95,
        title: `${nameOf(r)} institutional ownership, 13F ${q}`,
        text: `${nameOf(r)} is reported by ${fmtInt(r.managers)} distinct 13F managers with aggregate reported value ${fmtUsd(r.value)} for the quarter ending ${o.period} (rank ${r.rank} of the universe by ${ans.metricLabel.toLowerCase()}).${r.change != null ? ` Among filers that reported in both quarters, ${fmtInt(r.newManagers)} started and ${fmtInt(r.exitedManagers)} stopped reporting it (net ${fmtSigned(r.change)}).` : ''}${r.weight != null ? ` Estimated weight in the subject's holdings: ${fmtPct(r.weight)}${r.floor ? ' (at the disclosure floor)' : ''}.` : ''}`,
        period: o.period,
        date: o.period,
        entities: [r.ticker].filter(Boolean),
        data: {
          ticker: r.ticker,
          ownership: { managers: r.managers, value: r.value, change: r.change },
        },
      });
    }
  }
  for (const a of analysisResults(c).filter(
    (x) => x.capability !== 'fundamental-analysis' && x.capability !== OWNERSHIP_CAPABILITY,
  )) {
    if (a.status !== 'done' || !a.text) continue;
    out.push({
      kind: 'aggregate',
      category: 'ezana_datasets',
      reliability: a.output === 'simulated' ? 0.8 : 0.95,
      title: a.title || a.capability,
      text: String(a.text).slice(0, 1500),
      entities: [],
      data: a.metrics ? { metrics: a.metrics } : null,
    });
  }
  return out;
}

/* ── the fulfillment contract ───────────────────────────────────────── */

/**
 * What the question required and what was produced. Objectives come from the executed
 * plan (each task the composition needed), so a step that failed or was skipped is named.
 */
export function fulfillmentContract(c) {
  if (!c) return null;
  const plan = c.plan || [];
  const failed = new Set(c.failedTasks || []);
  const results = c.results || [];
  const objectives = [];
  const add = (id, label, status, detail = null) => objectives.push({ id, label, status, detail });
  for (const t of plan) {
    if (t.id === 'subject:resolve') continue;
    if (t.id === 'subject:holdings')
      add(
        t.id,
        `Establish ${c.subject?.name ? `${c.subject.name}'s` : "the subject's"} holdings`,
        failed.has(t.id) ? 'failed' : 'done',
      );
    else if (t.id.startsWith('query:')) add(t.id, t.label, failed.has(t.id) ? 'failed' : 'done');
    else if (t.id.startsWith('set:')) {
      const r = results.find((x) => x.op && `set:${x.key}` === t.id);
      add(
        t.id,
        t.label,
        failed.has(t.id)
          ? 'failed'
          : r
            ? r.stats.overlap === 0 && r.op === 'intersect'
              ? 'empty'
              : 'done'
            : 'failed',
        r ? `${r.stats.overlap} in both` : null,
      );
    } else if (t.id.startsWith('analysis:')) {
      const key = t.id.slice('analysis:'.length);
      const r = results.find((x) => x.key === key && x.capability);
      const st = failed.has(t.id)
        ? 'failed'
        : !r
          ? 'failed'
          : r.status === 'done'
            ? r.coverage &&
              (r.coverage.withData < r.coverage.selected || r.coverage.status === 'bounded')
              ? 'limited'
              : 'done'
            : r.status === 'skipped'
              ? 'empty'
              : r.status === 'conditional' || r.status === 'validation_error'
                ? 'needs_input'
                : r.status === 'failed'
                  ? 'failed'
                  : 'needs_input';
      /* Sonar 6.2: a step that returned without its required outputs is limited, and the
         unmet requirements are named (required-outputs.js). */
      const reqs = r ? requiredOutputs(r) : [];
      const unmet = reqs.filter((q) => !q.ok);
      const st2 = st === 'done' && unmet.length ? 'limited' : st;
      add(
        t.id,
        r?.title || (r?.capability ? r.capability.replace(/-/g, ' ') : t.label),
        st2,
        r?.coverage
          ? r.capability === OWNERSHIP_CAPABILITY
            ? `${r.coverage.withData} of ${r.coverage.selected} holdings reported by 13F managers${r.ownership?.period ? `, ${quarterLabel(r.ownership.period)}` : ''}`
            : r.capability === 'macro-indicators'
              ? `${r.coverage.withData} of ${r.coverage.selected} countries with data`
              : r.coverage.status === 'bounded'
                ? `bounded: ${r.coverage.unchecked} companies not checked (${(
                    r.coverage.excluded || []
                  )
                    .filter((e) => e.kind === 'unchecked')
                    .map((e) => e.reason)
                    .join(
                      '; ',
                    )}); ${r.coverage.withData} of ${r.coverage.eligibleUniverse} checked companies with filed financials`
                : `${r.coverage.withData} of ${r.coverage.selected} companies with filed financials`
          : r?.failed || null,
      );
      if (reqs.length) objectives[objectives.length - 1].requirements = reqs;
      if (unmet.length)
        objectives[objectives.length - 1].detail = [
          objectives[objectives.length - 1].detail,
          `missing: ${unmet.map((q) => q.label.toLowerCase()).join('; ')}`,
        ]
          .filter(Boolean)
          .join('; ');
    }
  }
  const sts = objectives.map((o) => o.status);
  let state = 'complete';
  if (!objectives.length) state = 'failed';
  else if (sts.every((s) => s === 'failed')) state = 'failed';
  else if (sts.includes('failed')) state = 'partial';
  else if (sts.includes('needs_input')) state = 'needs_input';
  else if (sts.includes('limited') || sts.includes('empty')) state = 'limited';
  return { state, label: COMPLETION[state].label, objectives };
}

/** The contract as instructions for the writer. */
export function fulfillmentBlock(f, c) {
  if (!f) return '';
  const sets = setResults(c);
  const lines = [
    'REQUIRED OUTPUTS (Research Composer). The reader configured these analyses and they ran on stored data before you; their results are the [S] evidence items titled with what was computed. Answer the question from them first:',
    ...f.objectives.map((o) => `- ${o.label}: ${o.status}${o.detail ? ` (${o.detail})` : ''}`),
    sets.some((s) => s.op === 'intersect')
      ? '- The executive conclusion must state how many securities matched and name them, then summarise what the fundamentals show for those companies (profitability, growth, cash generation, leverage), citing the computed items. Do not substitute a profile of either holder.'
      : null,
    analysisResults(c, OWNERSHIP_CAPABILITY).some((a) => a.status === 'done')
      ? '- The executive conclusion must answer directly: name the holdings most widely held by 13F reporting managers with their manager counts and the reporting quarter, citing the computed ownership items. Do not lead with a profile of the person, their trading history or other members. A manager count measures breadth of ownership, not conviction; a change in reported value is not a purchase; 13F dates and disclosure dates differ.'
      : null,
    ...analysisResults(c)
      .map((a) => conclusionRule(a))
      .filter(Boolean),
    f.state !== 'complete'
      ? `- Completion: ${f.label}. Say plainly which required output is missing or limited and why; never fill it with an estimate.`
      : null,
    '- A match means a security appears in both latest available datasets; never call it simultaneous ownership. Missing financials are missing, not zero.',
  ].filter(Boolean);
  return `${lines.join('\n')}\n\n`;
}

/* ── the answer from the results alone ──────────────────────────────── */

function bestBy(table, key, dir = 'max') {
  const rows = table.filter((t) => t.ratios?.[key] != null && Number.isFinite(t.ratios[key]));
  if (rows.length < 2) return null;
  rows.sort((a, b) =>
    dir === 'max' ? b.ratios[key] - a.ratios[key] : a.ratios[key] - b.ratios[key],
  );
  return rows[0];
}

/**
 * An executive conclusion and findings computed from the results (no model). Every
 * statement is a computed value; comparisons need at least two companies with the metric.
 * `ev` maps a result to the evidence items it produced: { set, company(ticker), coverage }.
 */
export function deterministicAnswer(c, f, ev = {}) {
  const set = setResults(c).find((s) => s.op === 'intersect') || setResults(c)[0] || null;
  const fa = analysisResults(c, 'fundamental-analysis').find((a) => a.status === 'done') || null;
  const table = (fa?.table || []).filter((t) => t.ratios?.revenue != null);
  const cite = (e) =>
    e ? { evidenceIds: [e.id], markers: [e.marker] } : { evidenceIds: [], markers: [] };
  const own = analysisResults(c, OWNERSHIP_CAPABILITY).find((a) => a.status === 'done') || null;
  let text;
  if (own?.ownership?.rows && !set) {
    const ans = ownershipAnswer(own.ownership);
    const byTitle = (re) => ev.byTitle?.(re) || null;
    const rec = (t) => (t ? ev.company?.(t) || null : null);
    return {
      executiveConclusion: {
        id: 'conclusion_composer',
        text: ans.text,
        classification: 'calculated_result',
        ...cite(byTitle(/^Institutional ownership ranking/) || ev.set),
        metrics: [],
        validation: { action: 'kept', problems: [] },
      },
      keyFindings: ans.findings.map((x, i) => ({
        id: `composer_${i + 1}`,
        title: x.title,
        explanation: x.explanation,
        classification: 'calculated_result',
        ...cite(rec(x.tickers?.[0])),
        metrics: [],
        entities: x.tickers || [],
        validation: { action: 'kept', problems: [] },
      })),
      fulfillment: f,
    };
  }
  if (set && set.op === 'intersect') {
    const names = (set.matches || []).slice(0, 12).map(nameOf);
    text =
      set.stats.overlap === 0
        ? `No securities appear in both ${set.left.label} and ${set.right.label} under exact security matching, so there were no companies to analyse.`
        : `${set.stats.overlap} securities appear in both ${set.left.label} and ${set.right.label}: ${names.join(', ')}${set.stats.overlap > names.length ? ', and more' : ''}.${fa ? ` ${table.length} of ${fa.coverage?.selected ?? table.length} have filed financials for the comparison.` : ''}`;
  } else if (set) {
    text = `${set.stats.overlap} securities appear in both ${set.left.label} and ${set.right.label}; ${set.stats.leftOnly} only in the first and ${set.stats.rightOnly} only in the second.`;
  } else if (fa) {
    text = `Fundamental Analysis covered ${table.length} of ${fa.coverage?.selected ?? table.length} companies with filed financials.`;
  } else {
    const firstFail = failedSteps(c)[0];
    text = `The configured analysis did not complete${firstFail ? `: ${firstFail.title || firstFail.key} failed (${firstFail.failed})` : ''}. No result is shown in its place.`;
  }
  const findings = [];
  const finding = (title, explanation, row) =>
    findings.push({
      id: `composer_${findings.length + 1}`,
      title,
      explanation,
      classification: 'calculated_result',
      ...cite(row ? ev.company?.(row.ticker) : ev.coverage),
      metrics: [],
      entities: row?.ticker ? [row.ticker] : [],
      validation: { action: 'kept', problems: [] },
    });
  const pairs = [
    ['operating_margin', 'max', 'Highest operating margin', 'Operating margin'],
    ['revenue_growth', 'max', 'Fastest revenue growth', 'Revenue growth'],
    ['fcf_margin', 'max', 'Strongest cash generation', 'Free-cash-flow margin'],
    ['debt_to_equity', 'max', 'Highest leverage', 'Debt to equity'],
  ];
  for (const [k, dir, title, label] of pairs) {
    const top = bestBy(table, k, dir);
    if (!top) continue;
    const others = table.filter((t) => t !== top && t.ratios[k] != null);
    const median = others.length
      ? [...others.map((t) => t.ratios[k])].sort((a, b) => a - b)[Math.floor(others.length / 2)]
      : null;
    finding(
      `${title}: ${nameOf(top)}`,
      `${label} ${metricText(k, top.ratios[k])}${median != null ? ` against a median of ${metricText(k, median)} for the other matched companies with the figure` : ''} (fiscal year ending ${top.ratios.fiscalYearEnd || 'latest filed'}).`,
      top,
    );
  }
  if (fa && fa.coverage && fa.coverage.withData < fa.coverage.selected) {
    const missing = (fa.table || []).filter((t) => t.ratios?.revenue == null).map(nameOf);
    finding(
      'Coverage gap',
      `${fa.coverage.selected} matching companies identified; ${fa.coverage.withData} have filed financials for the comparison. Missing: ${missing.join(', ')}.`,
      null,
    );
  }
  return {
    executiveConclusion: {
      id: 'conclusion_composer',
      text,
      classification: 'calculated_result',
      ...cite(ev.set),
      metrics: [],
      validation: { action: 'kept', problems: [] },
    },
    keyFindings: findings,
    fulfillment: f,
  };
}

/** Does a written answer report the requested result (the overlap and its names)? */
export function answerCovers(report, c) {
  const set = setResults(c).find((s) => s.op === 'intersect');
  const text = [
    report?.executiveConclusion?.text,
    ...(report?.keyFindings || []).slice(0, 3).map((x) => `${x.title} ${x.explanation || ''}`),
  ]
    .filter(Boolean)
    .join(' ');
  const own = analysisResults(c, OWNERSHIP_CAPABILITY).find((a) => a.status === 'done');
  if (!set && own?.ownership?.rows) {
    /* The conclusion itself must name the leader and say it is about 13F managers. */
    const lead = own.ownership.rows.find((r) => r.rank === 1);
    const concl = String(report?.executiveConclusion?.text || '');
    if (!lead) return true;
    const named =
      new RegExp(`\\b${String(lead.ticker).replace('.', '\\.')}\\b`).test(concl) ||
      (lead.issuer &&
        concl.toLowerCase().includes(String(lead.issuer).toLowerCase().split(/[ ,]/)[0]));
    return Boolean(named) && /13f|manager|institution|investment firm|fund/i.test(concl);
  }
  if (!set) return true;
  if (set.stats.overlap === 0) return /\b(no|zero|none)\b/i.test(text);
  const tickers = (set.matches || []).map((m) => m.ticker).filter(Boolean);
  const named = tickers.filter((t) =>
    new RegExp(`\\b${t.replace('.', '\\.')}\\b`).test(text),
  ).length;
  return named >= Math.min(2, tickers.length) || text.includes(String(set.stats.overlap));
}

/* ── the payload the report renders ─────────────────────────────────── */

/** Compact and typed: no prose that the report would have to parse. */
export function clientComposition(c, f) {
  if (!c) return null;
  return {
    version: 5,
    subject: c.subject || null,
    fulfillment: f || fulfillmentContract(c),
    plan: (c.plan || []).map((t) => ({ id: t.id, label: t.label, ms: t.ms ?? null })),
    durationMs: c.durationMs ?? null,
    sets: setResults(c).map((s) => ({
      key: s.key,
      title: s.title,
      op: s.op,
      stats: s.stats,
      left: s.left,
      right: s.right,
      matches: s.matches || [],
      notes: s.notes || [],
    })),
    analyses: analysisResults(c).map((a) => ({
      key: a.key,
      capability: a.capability,
      title: a.title || null,
      status: a.status,
      relation: a.relation || null,
      coverage: a.coverage || null,
      columns: a.columns || null,
      funnel: a.funnel || null,
      macro: a.macro
        ? {
            measures: a.macro.measures,
            from: a.macro.from,
            byCountry: Object.fromEntries(
              Object.entries(a.macro.byCountry || {}).map(([k, x]) => [
                k,
                {
                  country: x.country,
                  latestYoYPeriod: x.latestYoYPeriod,
                  latestYoY: x.latestYoY,
                  annualized3m: x.annualized3m,
                  direction: x.direction,
                  policyRate: x.policyRate,
                  realRate: x.realRate,
                  realRatePeriod: x.realRatePeriod,
                  changesThisYear: x.changesThisYear,
                  netChangeThisYear: x.netChangeThisYear,
                },
              ]),
            ),
          }
        : null,
      leaders: a.leaders || null,
      aligned: typeof a.aligned === 'boolean' ? a.aligned : null,
      dependence: a.dependence
        ? {
            latestFiscalYear: a.dependence.latestFiscalYear,
            latestObligations: a.dependence.latestObligations,
            obligationGrowth: a.dependence.obligationGrowth,
            revenue: a.dependence.revenue,
            obligationsToRevenue: a.dependence.obligationsToRevenue,
            measureLabel: a.dependence.measureLabel || null,
            pairedFiscalYear: a.dependence.pairedFiscalYear ?? null,
            pairedValue: a.dependence.pairedValue ?? null,
            pairedOverlapMonths: a.dependence.pairedOverlapMonths ?? null,
            fiscalYearEnd: a.dependence.fiscalYearEnd ?? null,
            recognizedGovernmentShare: a.dependence.recognizedGovernmentShare ?? null,
            recognizedGovernmentRevenue: a.dependence.recognizedGovernmentRevenue ?? null,
            recognizedLabel: a.dependence.recognizedLabel || null,
            topAgencies: a.dependence.topAgencies,
            agencyConcentration: a.dependence.agencyConcentration,
          }
        : null,
      table: (a.table || []).slice(0, 30).map((t) =>
        a.columns
          ? Object.fromEntries(a.columns.map((c) => [c.key, t[c.key] ?? null]))
          : {
              ticker: t.ticker,
              issuer: t.issuer,
              value: t.value ?? null,
              ratios: t.ratios || null,
              ok: t.ok,
              perShare: t.perShare ?? null,
              close: t.close ?? null,
              reason: t.reason ?? null,
            },
      ),
      metrics: a.metrics || null,
      ownership: a.ownership ? compactOwnership(a.ownership) : null,
      limitations: a.limitations || [],
      failed: a.failed || null,
    })),
    failures: failedSteps(c).map((r) => ({
      key: r.key,
      title: r.title || r.key,
      failed: r.failed,
    })),
  };
}

/** The ownership result as the report renders it (no prose to parse). */
function compactOwnership(o) {
  if (!o.rows) return { universe: o.universe || null, excluded: o.excluded || [], rows: [] };
  return {
    version: o.version,
    metric: o.metric,
    subject: o.subject,
    period: o.period,
    prior: o.prior,
    coverage: o.coverage,
    universe: o.universe,
    excluded: (o.excluded || []).slice(0, 30),
    rows: o.rows.slice(0, 50).map((r) => ({
      cusip: r.cusip,
      ticker: r.ticker,
      issuer: r.issuer,
      rank: r.rank,
      weight: r.weight ?? null,
      floor: Boolean(r.floor),
      partnership: Boolean(r.partnership),
      managers: r.managers,
      value: r.value,
      shares: r.shares,
      comparableNow: r.comparableNow ?? null,
      comparablePrior: r.comparablePrior ?? null,
      newManagers: r.newManagers ?? null,
      exitedManagers: r.exitedManagers ?? null,
      change: r.change ?? null,
    })),
    trend: o.trend || null,
    managers: o.managers || [],
    states: o.states || [],
    method: o.method || null,
    answer: ownershipAnswer(o),
    limitations: o.limitations || [],
    durationMs: o.durationMs ?? null,
  };
}
