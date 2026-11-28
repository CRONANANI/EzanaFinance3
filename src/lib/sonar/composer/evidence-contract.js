/**
 * Typed evidence contract for the writer (Sonar 6.4 hardening, Nov 28 2026).
 *
 * Production audit: the standard writer's unsupported claims were mostly (1) figures it
 * worked out itself (a ratio or a change no step computed), (2) statements about things no
 * record covered (a company the evidence did not name, a forecast, a policy path), and
 * (3) superlatives over a universe that was not fully checked. Validation removed them
 * afterwards. The contract states, before the writer starts, per computed step:
 *
 *   verified     each figure as computed: entity, label, value with unit, period, step
 *   allowed      conclusions the figures support, in plain words
 *   unsupported  conclusions the evidence does not support and must not be written
 *   unknowns     what is missing (never zero), and what was not checked
 *
 * Pure: built from the Composer results already computed. The writer reads it; claim
 * validation still checks every sentence afterwards.
 */

export const EVIDENCE_CONTRACT_VERSION = 'evidence-contract-v1';

const MAX_ROWS = 12;

function fmt(unit, v) {
  if (v == null || !Number.isFinite(Number(v))) return null;
  const n = Number(v);
  if (unit === 'pct') return `${(n * 100).toFixed(1)}%`;
  if (unit === 'x') return `${n.toFixed(2)}x`;
  if (unit === 'usd') {
    const a = Math.abs(n);
    const s = n < 0 ? '-' : '';
    if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`;
    if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(1)}B`;
    if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
    return `${s}$${a.toFixed(0)}`;
  }
  return String(n);
}

const entityOf = (r) => r.ticker || r.country || r.iso3 || r.issuer || r.name || null;
const periodOf = (r) =>
  r.ttmThrough
    ? `TTM through ${r.ttmThrough}`
    : r.fiscalYearEnd || r.latestYoYPeriod || r.period || null;

/** Verified figures and explicit gaps from a result's table, by its typed columns. */
function tableFacts(result) {
  const cols = (result.columns || []).filter((c) => c.unit);
  const verified = [];
  const missing = [];
  for (const row of (result.table || []).slice(0, MAX_ROWS)) {
    const entity = entityOf(row);
    if (!entity) continue;
    for (const c of cols) {
      const v = row[c.key] ?? row.ratios?.[c.key];
      const text = fmt(c.unit, v);
      if (text == null) missing.push(`${entity}: ${c.label}`);
      else verified.push({ entity, label: c.label, value: text, period: periodOf(row) });
    }
  }
  return { verified, missing };
}

function screenRules(r) {
  const cov = r.coverage || {};
  const allowed = [];
  const unsupported = ['Naming any company the screen did not return.'];
  const unknowns = [];
  if (r.table?.length) {
    const top = r.table[0];
    allowed.push(
      cov.status === 'bounded'
        ? `${entityOf(top)} ranks first among the ${cov.evaluatedCount - (cov.unchecked || 0)} companies checked.`
        : `${entityOf(top)} ranks first in the screened universe.`,
    );
  } else {
    allowed.push('No company in the screened universe met every condition.');
  }
  if (cov.status === 'bounded') {
    unsupported.push(
      `Calling any company the highest, lowest, cheapest or best in the whole universe: ${cov.unchecked} of ${cov.eligibleUniverse} eligible companies were not checked.`,
    );
    unknowns.push(
      ...(cov.excluded || [])
        .filter((e) => e.kind === 'unchecked')
        .map((e) => `${e.count} companies not checked: ${e.reason}.`),
    );
  }
  unknowns.push(
    ...(cov.excluded || [])
      .filter((e) => e.kind === 'unavailable')
      .map((e) => `${e.count} companies without the data (${e.reason}); missing, not zero.`),
  );
  return { allowed, unsupported, unknowns };
}

function comparisonRules(r) {
  const labels = (r.columns || []).filter((c) => c.unit).map((c) => c.label);
  return {
    allowed: ['The leader on each computed measure, with its value and period.'],
    unsupported: [
      `Any measure other than: ${labels.join(', ') || 'the computed columns'}.`,
      'A ratio, average or difference no step computed.',
    ],
    unknowns: [],
  };
}

function macroRules(r) {
  const allowed = [];
  const unknowns = [];
  const from = r.macro?.from;
  for (const x of Object.values(r.macro?.byCountry || {})) {
    if (x.changesThisYear != null) {
      allowed.push(
        x.changes?.length
          ? `${x.country}: ${x.changes.length} policy rate change(s) since ${from} (${x.changes
              .map((c) => `${c.date} ${c.change > 0 ? '+' : ''}${c.change.toFixed(2)} points`)
              .join(', ')}).`
          : `${x.country}: no policy rate change since ${from}.`,
      );
    }
    if (x.direction) allowed.push(`${x.country}: inflation trend computed as ${x.direction}.`);
    if (x.latestYoY == null) unknowns.push(`${x.country}: no year-on-year inflation figure.`);
    if (x.policyRate == null) unknowns.push(`${x.country}: no policy rate figure.`);
    if (x.gapNote) unknowns.push(`${x.country}: ${x.gapNote}`);
    if (x.provenance?.missingMonths?.length)
      unknowns.push(
        `${x.country}: CPI months missing from the series (not interpolated): ${x.provenance.missingMonths.slice(0, 6).join(', ')}.`,
      );
  }
  return {
    allowed,
    unsupported: [
      'Future policy moves, market expectations or inflation forecasts (none are in the evidence).',
      'Reasons a central bank acted, unless an [S] record states them.',
      'Calling a derived figure (year-on-year, 3-month annualised, real rate) observed, or any value for a missing month.',
    ],
    unknowns,
  };
}

function dependenceRules(r) {
  const d = r.dependence || {};
  return {
    allowed:
      d.pairedFiscalYear != null ? ['The award-value-to-revenue indicator as computed.'] : [],
    unsupported: [
      'Any other award-to-revenue ratio, and calling award value recognized government revenue.',
      ...(Number.isFinite(d.recognizedGovernmentShare)
        ? []
        : ['Saying the company does not disclose government revenue.']),
    ],
    unknowns: Number.isFinite(d.recognizedGovernmentShare)
      ? []
      : ['Recognized government revenue share is not available here.'],
  };
}

const RULES = {
  'financial-screen': screenRules,
  'company-comparison': comparisonRules,
  'macro-indicators': macroRules,
  'government-dependence': dependenceRules,
};

/**
 * @param {object[]} results Composer results (capability, status, columns, table, ...)
 * @returns {{ version: string, steps: object[] } | null}
 */
export function evidenceContract(results = []) {
  const steps = [];
  for (const r of results || []) {
    if (!r?.capability || !RULES[r.capability]) continue;
    if (r.status !== 'done') {
      steps.push({
        step: r.title || r.capability,
        capability: r.capability,
        verified: [],
        allowed: [],
        unsupported: [`Any result of ${r.title || r.capability}: the step did not complete.`],
        unknowns: [r.failed || r.error || 'The step did not complete.'],
      });
      continue;
    }
    const { verified, missing } = tableFacts(r);
    const rules = RULES[r.capability](r);
    steps.push({
      step: r.title || r.capability,
      capability: r.capability,
      verified,
      allowed: rules.allowed,
      unsupported: rules.unsupported,
      unknowns: [
        ...rules.unknowns,
        ...missing.slice(0, 12).map((m) => `${m}: missing (not zero).`),
      ],
    });
  }
  return steps.length ? { version: EVIDENCE_CONTRACT_VERSION, steps } : null;
}

/** The contract as a prompt block (empty string when there is none). */
export function evidenceContractBlock(contract) {
  if (!contract?.steps?.length) return '';
  const lines = [
    `EVIDENCE CONTRACT (${contract.version}). Write only conclusions the verified figures support. Copy figures exactly, with their period. Anything listed as unsupported must not appear; anything unknown is said to be unknown, never estimated.`,
  ];
  for (const s of contract.steps) {
    lines.push(`Step: ${s.step}`);
    if (s.verified.length)
      lines.push(
        '  Verified:',
        ...s.verified.map(
          (v) => `   - ${v.entity} | ${v.label} | ${v.value}${v.period ? ` | ${v.period}` : ''}`,
        ),
      );
    if (s.allowed.length) lines.push('  Allowed:', ...s.allowed.map((a) => `   - ${a}`));
    if (s.unsupported.length)
      lines.push('  Unsupported:', ...s.unsupported.map((a) => `   - ${a}`));
    if (s.unknowns.length) lines.push('  Unknown:', ...s.unknowns.map((a) => `   - ${a}`));
  }
  return `${lines.join('\n')}\n\n`;
}

/** Counts for telemetry (no figures). */
export function contractSummary(contract) {
  if (!contract) return null;
  return {
    version: contract.version,
    steps: contract.steps.length,
    verified: contract.steps.reduce((n, s) => n + s.verified.length, 0),
    unsupported: contract.steps.reduce((n, s) => n + s.unsupported.length, 0),
    unknowns: contract.steps.reduce((n, s) => n + s.unknowns.length, 0),
  };
}
