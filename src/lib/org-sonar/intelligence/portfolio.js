/**
 * Sonar for organizations: fund-aware research operations (Nov 28 2026).
 *
 * Every figure here comes from the council's own position book (getOrgPositionBook, the
 * single source every fund surface reads) and from the calculations the Fund Analytics and
 * Compliance pages already run, so Sonar can never disagree with them:
 *
 *   weights and sector exposure   holdingsSummary (org-compliance-model.js): market value,
 *                                 the same figure the IPS engine has always used
 *   recorded rule comparisons     evaluateHoldings / evaluateProposal (the IPS engine)
 *
 * Valuation follows the book: a position without a stored price is carried at cost. That is
 * conservative, never fabricated, and the coverage line says how many positions are priced.
 *
 * Not computed here, and answered with the limitation instead: time-weighted return,
 * contribution to return, security-level performance, benchmark-relative alpha, volatility,
 * Sharpe ratio and factor exposures. Unrealized P&L is shown as unrealized P&L, never as a
 * return.
 *
 * A scenario ("what if we added $10,000 of MSFT") is computed on a copy of the book, labelled
 * Hypothetical, no trade executed, and never written anywhere.
 *
 * Pure and client-safe; unit-tested in scripts/check-org-sonar-intelligence.mjs.
 */
import { holdingsSummary, evaluateHoldings, evaluateProposal } from '@/lib/org-compliance-model';

export const HYPOTHETICAL_LABEL = 'Hypothetical, no trade executed.';

export const UNSUPPORTED_MEASURES = {
  'time-weighted return':
    'Cash flows into and out of the fund are not recorded, so a time-weighted return cannot be computed.',
  'contribution to return':
    'Security-level contribution needs dated trades and prices for the period; Fund Analytics shows the attribution it can support.',
  'benchmark-relative alpha':
    'Alpha is reported only where Fund Analytics records it from fund snapshots; Sonar does not recompute it.',
  'portfolio volatility': 'The fund has no daily valuation series, so volatility is not computed.',
  'Sharpe ratio':
    'A Sharpe ratio needs a return series and volatility, which the fund does not record.',
  'factor exposures': 'No factor model is connected to council holdings.',
  'rate or earnings sensitivity':
    'No per-holding rate or earnings sensitivity measure is computed; Sonar can research each holding separately.',
  'institutional participation trend per holding':
    'Run institutional ownership research per holding; it is not aggregated for the fund yet.',
};

const finite = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const tick = (p) => String(p?.ticker_symbol || p?.ticker || '').toUpperCase();

/** How much of the book is priced: the coverage line every fund answer carries. */
export function pricingCoverage(book = []) {
  const priced = book.filter((p) => p.priced).length;
  const stale = book
    .filter((p) => p.priced && p.last_priced_at)
    .map((p) => p.last_priced_at)
    .sort()[0];
  return {
    positions: book.length,
    priced,
    atCost: book.length - priced,
    oldestPrice: stale || null,
    note:
      book.length - priced > 0
        ? `${book.length - priced} of ${book.length} positions have no stored price and are carried at cost.`
        : null,
  };
}

/**
 * Concentration: each position's weight of fund value, largest first, the top-five share
 * and the largest sector. Weights use the same market value as the IPS engine.
 */
export function concentration(book = [], { top = 10 } = {}) {
  const h = holdingsSummary(book);
  if (!book.length || h.totalValue <= 0)
    return { empty: true, totalValue: 0, rows: [], sectors: [], coverage: pricingCoverage(book) };
  const rows = book
    .map((p) => ({
      ticker: tick(p),
      name: p.name || null,
      sector: p.sector || null,
      value: finite(p.current_value ?? p.value),
      weightPct: ((finite(p.current_value ?? p.value) || 0) / h.totalValue) * 100,
      unrealizedPl: finite(p.pl),
      priced: Boolean(p.priced),
    }))
    .sort((a, b) => b.weightPct - a.weightPct);
  const topN = rows.slice(0, 5).reduce((s, r) => s + r.weightPct, 0);
  return {
    empty: false,
    totalValue: h.totalValue,
    positionCount: rows.length,
    rows: rows.slice(0, top),
    topFiveSharePct: topN,
    largest: rows[0],
    sectors: h.sectors,
    coverage: pricingCoverage(book),
  };
}

/**
 * A hypothetical change to the book. `amountUsd` (signed) or `sizePct` (signed, of current
 * fund value). A new ticker needs its sector and price to be placed; without them the
 * result says which inputs are missing instead of guessing.
 */
export function scenarioBook(
  book = [],
  { ticker, amountUsd = null, sizePct = null, sector = null, name = null },
) {
  const h = holdingsSummary(book);
  const sym = String(ticker || '').toUpperCase();
  const missing = [];
  if (!sym) missing.push('ticker');
  let delta = finite(amountUsd);
  if (delta === null && finite(sizePct) !== null && h.totalValue > 0)
    delta = (finite(sizePct) / 100) * h.totalValue;
  if (delta === null) missing.push('amount');
  const held = book.find((p) => tick(p) === sym);
  const sectorOf = held?.sector || sector || null;
  if (!held && !sectorOf) missing.push('sector');
  if (missing.length) return { ok: false, missing, label: HYPOTHETICAL_LABEL };

  const next = book.map((p) => ({ ...p }));
  if (held) {
    const row = next.find((p) => tick(p) === sym);
    const v = (finite(row.current_value ?? row.value) || 0) + delta;
    if (v < 0)
      return {
        ok: false,
        missing: [],
        reason: 'The reduction is larger than the position.',
        label: HYPOTHETICAL_LABEL,
      };
    row.current_value = v;
    row.value = v;
  } else {
    if (delta <= 0)
      return {
        ok: false,
        missing: [],
        reason: `${sym} is not held, so it cannot be reduced.`,
        label: HYPOTHETICAL_LABEL,
      };
    next.push({
      ticker: sym,
      ticker_symbol: sym,
      name,
      sector: sectorOf,
      current_value: delta,
      value: delta,
      priced: false,
      hypothetical: true,
    });
  }
  return {
    ok: true,
    book: next,
    delta,
    held: Boolean(held),
    sector: sectorOf,
    label: HYPOTHETICAL_LABEL,
  };
}

/** Sector weights before and after a hypothetical change, from holdingsSummary on both books. */
export function scenarioExposure(book, scenario) {
  const s = scenarioBook(book, scenario);
  if (!s.ok) return s;
  const before = holdingsSummary(book);
  const after = holdingsSummary(s.book);
  const pct = (h, sector) => h.sectors.find((x) => x.sector === sector)?.pct ?? 0;
  const posPct = (h, b) => {
    const p = b.find((x) => tick(x) === String(scenario.ticker).toUpperCase());
    return p && h.totalValue > 0
      ? ((finite(p.current_value ?? p.value) || 0) / h.totalValue) * 100
      : 0;
  };
  return {
    ok: true,
    label: HYPOTHETICAL_LABEL,
    ticker: String(scenario.ticker).toUpperCase(),
    deltaUsd: s.delta,
    sector: s.sector,
    fundValueBefore: before.totalValue,
    fundValueAfter: after.totalValue,
    positionPctBefore: posPct(before, book),
    positionPctAfter: posPct(after, s.book),
    sectorPctBefore: pct(before, s.sector),
    sectorPctAfter: pct(after, s.sector),
    book: s.book,
  };
}

/**
 * The recorded rule comparison for a scenario: the IPS engine's own readings on the
 * hypothetical book (evaluateHoldings) and its per-idea checks (evaluateProposal: prohibited
 * lists, trade size, position count). Advisory only: the result is a potential policy
 * concern for human review, never a blocked or rejected trade (the compliance engine here
 * records and compares; it does not enforce orders).
 */
export function policyObservations({ rules = [], book = [], scenario = null, marketCap = null }) {
  const activeRules = (rules || []).filter((r) => r.is_active !== false);
  if (!activeRules.length)
    return {
      rules: 0,
      observations: [],
      concerns: 0,
      note: 'The council has no active recorded IPS rules.',
    };
  const current = evaluateHoldings({ rules: activeRules, positions: book });
  let after = null;
  let idea = null;
  let exposure = null;
  if (scenario) {
    exposure = scenarioExposure(book, scenario);
    if (exposure.ok) {
      after = evaluateHoldings({ rules: activeRules, positions: exposure.book });
      const sizePct =
        exposure.fundValueBefore > 0
          ? (Math.abs(exposure.deltaUsd) / exposure.fundValueBefore) * 100
          : null;
      idea = evaluateProposal({
        rules: activeRules.filter((r) =>
          [
            'prohibited_ticker',
            'prohibited_sector',
            'max_single_trade_pct',
            'max_positions',
            'min_market_cap',
          ].includes(r.rule_type),
        ),
        positions: book,
        ticker: exposure.ticker,
        sector: exposure.sector,
        sizePct: exposure.deltaUsd > 0 ? sizePct : null,
        marketCap,
      });
    }
  }
  const afterById = new Map((after?.ruleStatus || []).map((r) => [r.rule_id, r]));
  const ideaById = new Map((idea?.violations || []).map((v) => [v.rule_id, v]));
  const observations = current.ruleStatus.map((r) => {
    const a = afterById.get(r.rule_id) || null;
    const v = ideaById.get(r.rule_id) || null;
    const statusAfter = v ? 'bad' : (a?.status ?? null);
    const concern = (statusAfter ?? r.status) === 'bad';
    return {
      ruleId: r.rule_id,
      ruleType: r.rule_type,
      label: r.label || r.rule_type.replace(/_/g, ' '),
      current: { status: r.status, detail: r.detail },
      scenario: a || v ? { status: statusAfter, detail: v?.detail || a?.detail } : null,
      concern,
      wording: concern
        ? 'Potential policy concern'
        : r.status === 'none'
          ? 'Not read from holdings'
          : 'Recorded rule comparison',
      reviewRequired: concern,
    };
  });
  return {
    rules: activeRules.length,
    observations,
    concerns: observations.filter((o) => o.concern).length,
    scenario: exposure && exposure.ok ? { ...exposure, book: undefined } : exposure,
    note: 'Advisory comparison against recorded rules. Nothing is blocked or executed; the committee decides.',
  };
}

/** The limitation text for each unsupported measure a question asked for. */
export function limitationsFor(labels = []) {
  return labels.map((l) => ({
    measure: l,
    reason: UNSUPPORTED_MEASURES[l] || 'Not supported for council holdings.',
  }));
}
