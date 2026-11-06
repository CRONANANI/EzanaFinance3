/**
 * Sonar Research Data and Methodology Auditor (Nov 2026).
 *
 * Deterministic checks on every report in every mode, then (deep only) one model review with
 * the methodology-audit skill for reasoning gaps. The auditor returns pass/fail per check and
 * fixes; it never adds a claim. Fixes either change the text (remove or relabel a finding,
 * add a limitation) or appear as stated limitations.
 *
 * Pure except modelAudit (which takes the synthesis function from the caller).
 */
import { ANALYSTS } from './registry.js';
import { ruleChecksFor } from './orchestrator.js';
import { loadSkill } from './skills.js';
import { parseResearchJson } from '../engine/findings.js';

const YEAR = /\b(19[89]\d|20[0-4]\d)\b/;
const PROJECTION_WORDS =
  /\b(project|projected|projection|forecast|expected|estimate[sd]?|outlook)\b/i;
const NUM_RE = /(?<![\w.])-?\d[\d,]*(?:\.\d+)?/g;

/** Numbers in a text (thousands separators removed), ignoring years and single digits. */
export function figuresIn(text) {
  return (
    String(text || '')
      .replace(/\[(S\d+|M:[^\]]+)\]/g, ' ')
      .match(NUM_RE) || []
  )
    .map((s) => s.replace(/,/g, ''))
    .filter((s) => !/^-?\d$/.test(s) && !(YEAR.test(s) && s.length === 4))
    .map(Number)
    .filter(Number.isFinite);
}

function supported(v, allowed) {
  return allowed.some((a) => {
    if (!Number.isFinite(a)) return false;
    const tol = Math.max(0.05, Math.abs(a) * 0.01);
    return (
      Math.abs(v - a) <= tol || Math.abs(v - a * 100) <= Math.max(0.05, Math.abs(a * 100) * 0.01)
    );
  });
}

/** The report's prose findings in one shape: { id, text, markers, metrics, label }. */
export function reportClaims(report) {
  const out = [];
  if (report?.executiveConclusion?.text) {
    out.push({
      id: 'conclusion',
      text: report.executiveConclusion.text,
      markers: report.executiveConclusion.markers || report.executiveConclusion.evidence || [],
      metrics: report.executiveConclusion.metrics || [],
    });
  }
  for (const f of report?.keyFindings || []) {
    out.push({
      id: f.id || `f${out.length}`,
      text: [f.title, f.explanation].filter(Boolean).join('. '),
      markers: f.markers || f.evidence || [],
      metrics: f.metrics || [],
      label: f.classification,
    });
  }
  for (const a of report?.analysis || []) {
    out.push({
      id: a.id || `a${out.length}`,
      text: a.text,
      markers: a.markers || [],
      metrics: [],
      label: a.classification,
    });
  }
  for (const s of report?.sections || []) {
    for (const p of s.points || s.findings || []) {
      if (p?.text)
        out.push({
          id: p.id || `s${out.length}`,
          text: p.text,
          markers: p.markers || p.evidence || [],
          metrics: p.metrics || [],
          label: p.classification,
        });
    }
  }
  return out;
}

const markerKey = (m) => String(m).replace(/[[\]]/g, '');

/**
 * Deterministic audit.
 * @param {{ report, marked, metrics, specialists?, brief?, now? }} o
 * @returns {{ passed, total, checks: [{ id, label, pass, detail }], fixes: { removeIds: string[], limitations: string[] } }}
 */
export function auditReport({ report, marked = [], metrics = [], specialists = [], brief = '' }) {
  const byMarker = new Map(marked.map((e) => [e.marker, e]));
  const claims = reportClaims(report);
  const checks = [];
  const fixes = { removeIds: [], limitations: [] };
  const add = (id, label, pass, detail = '') =>
    checks.push({ id, label, pass: Boolean(pass), detail });

  /* 1. Every number traces to a cited record or a metric. */
  const allowedAll = [
    ...marked.flatMap((e) => figuresIn(`${e.title} ${e.text}`)),
    ...metrics.flatMap((m) =>
      typeof m.value === 'number' ? [m.value] : figuresIn(JSON.stringify(m.value)),
    ),
  ];
  const untraced = [];
  for (const c of claims) {
    const local = [
      ...c.markers
        .map(markerKey)
        .flatMap((m) =>
          byMarker.get(m) ? figuresIn(`${byMarker.get(m).title} ${byMarker.get(m).text}`) : [],
        ),
      ...metrics
        .filter((m) => c.metrics.map((x) => String(x).replace(/^M:/, '')).includes(m.id))
        .map((m) => m.value),
    ];
    const bad = figuresIn(c.text).filter((v) => !supported(v, local.length ? local : allowedAll));
    if (bad.length) {
      untraced.push(`${c.id}: ${bad.slice(0, 3).join(', ')}`);
      if (c.id !== 'conclusion') fixes.removeIds.push(c.id);
    }
  }
  add(
    'numbers_traced',
    'Every number traces to a source or a computed metric',
    !untraced.length,
    untraced.join('; '),
  );

  /* 2. Citations exist. */
  const textAll = [brief, ...claims.map((c) => c.text)].join(' ');
  const cited = [...textAll.matchAll(/\[(S\d+)\]/g)].map((m) => m[1]);
  const ghost = [...new Set([...cited, ...claims.flatMap((c) => c.markers.map(markerKey))])].filter(
    (m) => /^S\d+$/.test(m) && !byMarker.has(m),
  );
  const uncited = claims.filter(
    (c) =>
      c.id !== 'conclusion' && !c.markers.length && !c.metrics.length && c.label !== 'hypothesis',
  );
  add(
    'citations_exist',
    'Citations point to real records',
    !ghost.length,
    ghost.length ? `unknown: ${ghost.join(', ')}` : '',
  );
  add(
    'claims_cited',
    'Every finding is cited or labelled a hypothesis',
    !uncited.length,
    uncited.map((c) => c.id).join(', '),
  );

  /* 3. Every figure has a period: the claim names one, or every record it cites has one. */
  const noPeriod = claims.filter((c) => {
    if (!figuresIn(c.text).length) return false;
    if (YEAR.test(c.text) || /\b(Q[1-4]|FY\d{2,4}|month|quarter|year)\b/i.test(c.text))
      return false;
    const recs = c.markers
      .map(markerKey)
      .map((m) => byMarker.get(m))
      .filter(Boolean);
    return !recs.length || recs.some((r) => !(r.period?.label || r.date));
  });
  add(
    'periods_present',
    'Every figure has a period',
    !noPeriod.length,
    noPeriod.map((c) => c.id).join(', '),
  );

  /* 4. Mixed-date evidence is disclosed: a finding citing records from different years names them. */
  const mixed = claims.filter((c) => {
    const years = new Set(
      c.markers
        .map(markerKey)
        .map((m) => byMarker.get(m))
        .filter(Boolean)
        .map((r) => String(r.period?.label || r.date || '').match(YEAR)?.[0])
        .filter(Boolean),
    );
    if (years.size < 2) return false;
    return [...years].filter((y) => c.text.includes(y)).length < 2;
  });
  add(
    'mixed_dates_disclosed',
    'Mixed-date evidence is disclosed',
    !mixed.length,
    mixed.map((c) => c.id).join(', '),
  );
  if (mixed.length)
    fixes.limitations.push(
      'Some findings combine figures from different periods; each figure keeps its own period in the sources.',
    );

  /* 5. Projections are labelled. */
  const unlabelled = claims.filter((c) => {
    const recs = c.markers
      .map(markerKey)
      .map((m) => byMarker.get(m))
      .filter(Boolean);
    return (
      recs.some(
        (r) => r.data?.projection || /projection/i.test(String(r.data?.changeKind || '')),
      ) && !PROJECTION_WORDS.test(c.text)
    );
  });
  add(
    'projections_labelled',
    'Projections are labelled as projections',
    !unlabelled.length,
    unlabelled.map((c) => c.id).join(', '),
  );
  unlabelled.forEach((c) => c.id !== 'conclusion' && fixes.removeIds.push(c.id));

  /* 6. Stale items are flagged. */
  const staleCited = [...new Set(claims.flatMap((c) => c.markers.map(markerKey)))]
    .map((m) => byMarker.get(m))
    .filter((r) => r?.stale);
  const limitText = (report?.limitations || []).join(' ');
  const staleFlagged = !staleCited.length || /not current|stale|older|dated/i.test(limitText);
  add(
    'stale_flagged',
    'Data that is not current is flagged',
    staleFlagged,
    staleCited.map((r) => r.marker).join(', '),
  );
  if (!staleFlagged) {
    fixes.limitations.push(
      `Not current: ${staleCited
        .slice(0, 4)
        .map((r) => `${r.title} (${r.period?.label || r.date || 'undated'})`)
        .join('; ')}.`,
    );
  }

  /* 7. Entity matches are confirmed (the engine's validator logs mismatches it removed). */
  const log = report?.validation?.log || [];
  const entityKept = log.filter(
    (l) => (l.problems || []).includes('entity_mismatch') && l.action !== 'removed',
  );
  add('entities_confirmed', 'Named entities match the records cited', !entityKept.length, '');

  /* 8. Units consistent: every metric cited carries a unit; currency quotes keep one convention. */
  const unitless = metrics.filter(
    (m) =>
      claims.some((c) => c.metrics.map((x) => String(x).replace(/^M:/, '')).includes(m.id)) &&
      !m.unit,
  );
  const fxFlip = claims.filter(
    (c) => /\bUSD per [A-Z]{3}\b/.test(c.text) && /\b[A-Z]{3} per USD\b/.test(c.text),
  );
  add(
    'units_consistent',
    'Units and currency conventions are consistent',
    !unitless.length && !fxFlip.length,
    [...unitless.map((m) => m.id), ...fxFlip.map((c) => c.id)].join(', '),
  );

  /* 9. Each analyst's checkable registry rules hold in the final text. */
  const ruleFails = [];
  for (const s of specialists) {
    for (const rc of ruleChecksFor(ANALYSTS[s.id])) {
      const bad = claims.filter((c) => !rc.test(c.text));
      if (bad.length) ruleFails.push(`${ANALYSTS[s.id]?.title}: ${rc.id}`);
    }
  }
  add('analyst_rules', "Each analyst's rules hold", !ruleFails.length, ruleFails.join('; '));

  /* 10. Evidence diversity: specialists agreeing on one source is not verification. */
  const sourcesOf = (s) =>
    new Set(
      s.findings
        .flatMap((f) => f.refs.filter((r) => /^S\d+$/.test(r)))
        .map((m) => byMarker.get(m)?.source)
        .filter(Boolean),
    );
  const agreeing = specialists.filter((s) => s.status === 'done' && s.findings.length);
  const union = new Set(agreeing.flatMap((s) => [...sourcesOf(s)]));
  const single = agreeing.length >= 2 && union.size === 1;
  add(
    'evidence_diversity',
    'Agreement rests on more than one source',
    !single,
    single ? `single-source: ${[...union][0]}` : '',
  );
  if (single)
    fixes.limitations.push(
      'The specialists agree, but on a single source; the conclusion is single-source.',
    );

  const passed = checks.filter((c) => c.pass).length;
  return { passed, total: checks.length, checks, fixes };
}

/**
 * Apply the deterministic fixes: remove failing findings, add limitations. Returns a new report.
 */
export function applyAuditFixes(report, fixes) {
  if (!report || !fixes) return report;
  const drop = new Set(fixes.removeIds || []);
  const out = { ...report };
  if (out.keyFindings) out.keyFindings = out.keyFindings.filter((f) => !drop.has(f.id));
  if (out.analysis) out.analysis = out.analysis.filter((a) => !drop.has(a.id));
  const lim = new Set([...(out.limitations || []), ...(fixes.limitations || [])]);
  out.limitations = [...lim];
  return out;
}

/* ── Deep: one model review for reasoning gaps ────────────────────────────────────── */

export function auditSystem() {
  return `You are Sonar's Research Data and Methodology Auditor. Review the report for reasoning gaps against the evidence: unsupported leaps, confused definitions, missing counterevidence, overclaimed confidence. You never add a claim; you return pass or fail per check with a suggested fix. No em dashes.

${loadSkill('methodology-audit', { mode: 'standard' })}

Return ONLY JSON: {"checks":[{"id":"short_id","label":"what was checked","pass":true,"detail":"...","fix":"remove | relabel | add_limitation | none","target":"finding id or empty","limitation":"sentence when fix is add_limitation"}]}. At most 8 checks.`;
}

export function parseModelAudit(text) {
  const j = parseResearchJson(text);
  if (!j || !Array.isArray(j.checks)) return null;
  return j.checks.slice(0, 8).map((c, i) => ({
    id: `review_${
      String(c.id || i)
        .replace(/[^\w]/g, '')
        .slice(0, 30) || i
    }`,
    label: String(c.label || 'Reasoning review')
      .replace(/\s*\u2014\s*/g, ', ')
      .slice(0, 140),
    pass: Boolean(c.pass),
    detail: String(c.detail || '')
      .replace(/\s*\u2014\s*/g, ', ')
      .slice(0, 300),
    fix: ['remove', 'relabel', 'add_limitation', 'none'].includes(c.fix) ? c.fix : 'none',
    target: typeof c.target === 'string' ? c.target : '',
    limitation:
      typeof c.limitation === 'string'
        ? c.limitation.replace(/\s*\u2014\s*/g, ', ').slice(0, 300)
        : '',
  }));
}

/** Merge the model review into the deterministic audit; its fixes only remove or relabel. */
export function mergeModelAudit(audit, review) {
  if (!review?.length) return audit;
  const checks = [
    ...audit.checks,
    ...review.map(({ id, label, pass, detail }) => ({ id, label, pass, detail })),
  ];
  const fixes = {
    removeIds: [
      ...audit.fixes.removeIds,
      ...review.filter((r) => !r.pass && r.fix === 'remove' && r.target).map((r) => r.target),
    ],
    limitations: [
      ...audit.fixes.limitations,
      ...review
        .filter((r) => !r.pass && r.fix === 'add_limitation' && r.limitation)
        .map((r) => r.limitation),
    ],
    relabel: review.filter((r) => !r.pass && r.fix === 'relabel' && r.target).map((r) => r.target),
  };
  return { passed: checks.filter((c) => c.pass).length, total: checks.length, checks, fixes };
}

/**
 * The ping's checks (quick mode, telemetry): numbers trace to the evidence, citations point
 * at real snippets, no em dash. `markers` is how many snippets the brief could cite.
 */
export function auditLanding(answer, sourceTexts = [], { markers = 0 } = {}) {
  const allowed = sourceTexts.flatMap((t) => figuresIn(t));
  const bad = figuresIn(answer).filter((v) => !supported(v, allowed));
  const cited = [...String(answer).matchAll(/\[S(\d+)\]/g)].map((m) => Number(m[1]));
  const ghost = cited.filter((n) => n < 1 || (markers && n > markers));
  const checks = [
    {
      id: 'numbers_traced',
      label: 'Every number traces to a source',
      pass: !bad.length,
      detail: bad.slice(0, 5).join(', '),
    },
    {
      id: 'citations_exist',
      label: 'Citations point to real snippets',
      pass: !ghost.length,
      detail: ghost.join(', '),
    },
    { id: 'no_em_dash', label: 'No em dashes', pass: !/\u2014/.test(answer), detail: '' },
  ];
  return { passed: checks.filter((c) => c.pass).length, total: checks.length, checks };
}
