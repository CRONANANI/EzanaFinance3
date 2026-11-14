/**
 * Mock Trading investment theses (Nov 2026): validation, the what-if
 * projection, thesis fit scoring and the trade journal's position impact.
 * Pure: no React, no DOM, no fetch, no imports. Shared by the Build thesis
 * modal, the pre-trade cards, the order ticket and the /api/mock-theses
 * routes. Tested by scripts/check-mock-thesis.mjs.
 *
 * Fit scoring is rule-based and deterministic. It describes how an order
 * lines up with the active thesis; it never blocks an order and never gives
 * advice. Every threshold and weight is in FIT, so it can be tuned in one
 * place.
 */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/* ------------------------------------------------------------------ */
/* Limits, options and scoring constants                               */
/* ------------------------------------------------------------------ */

export const THESIS_LIMITS = Object.freeze({
  maxTheses: 3,
  name: 60,
  objective: 280,
  positionRules: 280,
  note: 280,
  sectors: 6,
  capMin: 1,
  capMax: 100,
  capDefault: 15,
});

export const TIME_HORIZONS = Object.freeze([
  { value: 'lt_1y', label: 'Under 1 year' },
  { value: '1_3y', label: '1 to 3 years' },
  { value: '3_5y', label: '3 to 5 years' },
  { value: '5y_plus', label: '5+ years' },
]);

export const RISK_TOLERANCES = Object.freeze([
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'aggressive', label: 'Aggressive' },
]);

export const FIT = Object.freeze({
  /* Highest portfolio beta that still reads as "within" each tolerance. */
  betaMax: Object.freeze({ conservative: 0.9, moderate: 1.3, aggressive: Infinity }),
  /* From this share of the cap up to the cap itself, a weight is "nearing". */
  nearingShare: 0.9,
  points: Object.freeze({
    sector: Object.freeze({ match: 40, neutral: 28, mismatch: 0 }),
    risk: Object.freeze({ within: 25, unknown: 15, above: 0 }),
    concentration: Object.freeze({ within: 35, nearing: 20, over: 0 }),
  }),
  /* Score at or above which the label is High, then Medium; below is Low. */
  labels: Object.freeze({ high: 75, medium: 50 }),
});

const labelOf = (list, value) => list.find((o) => o.value === value)?.label ?? '';
export const timeHorizonLabel = (v) => labelOf(TIME_HORIZONS, v);
export const riskToleranceLabel = (v) => labelOf(RISK_TOLERANCES, v);

/**
 * Starter templates for the Build thesis modal ("Start from"). They prefill
 * the form; nothing is saved until the user submits. Sector names are the
 * canonical ones the market data uses. Never seed these into an account.
 */
export const THESIS_TEMPLATES = Object.freeze([
  { key: 'blank', label: 'Blank', values: null },
  {
    key: 'ai-infrastructure',
    label: 'AI Infrastructure Growth',
    values: {
      name: 'AI Infrastructure Growth',
      objective:
        'Long-term growth by investing in the AI infrastructure ecosystem (chips, cloud, data centers).',
      time_horizon: '3_5y',
      risk_tolerance: 'aggressive',
      sector_focus: ['Technology', 'Communication Services'],
      position_rules: 'Build on pullbacks, size by conviction, add incrementally.',
      max_single_name_pct: 15,
    },
  },
  {
    key: 'dividend-compounder',
    label: 'Dividend Compounder',
    values: {
      name: 'Dividend Compounder',
      objective: 'Steady income and compounding from companies with long dividend records.',
      time_horizon: '5y_plus',
      risk_tolerance: 'conservative',
      sector_focus: ['Consumer Defensive', 'Healthcare', 'Utilities', 'Financial Services'],
      position_rules: 'Equal-size starter positions, reinvest income, trim after a dividend cut.',
      max_single_name_pct: 8,
    },
  },
  {
    key: 'macro-rotation',
    label: 'Macro Rotation',
    values: {
      name: 'Macro Rotation',
      objective: 'Rotate between sectors as growth, inflation and rates change.',
      time_horizon: 'lt_1y',
      risk_tolerance: 'moderate',
      sector_focus: ['Energy', 'Financial Services', 'Industrials', 'Basic Materials'],
      position_rules: 'Review monthly, hold broad funds for core exposure, cut what stops working.',
      max_single_name_pct: 20,
    },
  },
]);

/* ------------------------------------------------------------------ */
/* Validation (modal and server run the same functions)                */
/* ------------------------------------------------------------------ */

const THESIS_KEYS = [
  'name',
  'objective',
  'time_horizon',
  'risk_tolerance',
  'sector_focus',
  'position_rules',
  'max_single_name_pct',
];

/** Trim and collapse runs of whitespace (including newlines) to one space. */
const tidy = (v) => String(v).replace(/\s+/g, ' ').trim();

/** Case-insensitive key for the unique-name rule. */
export const thesisNameKey = (name) => tidy(name ?? '').toLowerCase();

/**
 * Validate a thesis payload.
 *
 * @param {object} body  The fields in THESIS_KEYS. Unknown keys are rejected.
 * @param {{ sectors?: string[], partial?: boolean }} [opts]
 *   sectors: the allowed sector names (pass CANONICAL_SECTORS). When given,
 *            sector_focus is matched case-insensitively and stored in the
 *            list's own spelling.
 *   partial: for an edit, validate only the keys that are present.
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function parseThesis(body, opts = {}) {
  const { sectors = null, partial = false } = opts;
  const fail = (error) => ({ ok: false, error });
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Invalid thesis');
  const unknown = Object.keys(body).filter((k) => !THESIS_KEYS.includes(k));
  if (unknown.length) return fail(`Unknown field: ${unknown[0]}`);
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  const value = {};

  if (has('name') || !partial) {
    if (typeof body.name !== 'string') return fail('Name is required');
    const name = tidy(body.name);
    if (!name) return fail('Name is required');
    if (name.length > THESIS_LIMITS.name)
      return fail(`Name must be ${THESIS_LIMITS.name} characters or fewer`);
    value.name = name;
  }

  for (const [key, label, max] of [
    ['objective', 'Objective', THESIS_LIMITS.objective],
    ['position_rules', 'Position rules', THESIS_LIMITS.positionRules],
  ]) {
    if (has(key) || !partial) {
      const raw = body[key] ?? '';
      if (typeof raw !== 'string') return fail(`${label} must be text`);
      const text = tidy(raw);
      if (text.length > max) return fail(`${label} must be ${max} characters or fewer`);
      value[key] = text;
    }
  }

  if (has('time_horizon') || !partial) {
    const v = body.time_horizon ?? '3_5y';
    if (!TIME_HORIZONS.some((o) => o.value === v)) return fail('Choose a time horizon');
    value.time_horizon = v;
  }

  if (has('risk_tolerance') || !partial) {
    const v = body.risk_tolerance ?? 'moderate';
    if (!RISK_TOLERANCES.some((o) => o.value === v)) return fail('Choose a risk tolerance');
    value.risk_tolerance = v;
  }

  if (has('sector_focus') || !partial) {
    const raw = body.sector_focus ?? [];
    if (!Array.isArray(raw)) return fail('Sector focus must be a list');
    const allowed = Array.isArray(sectors)
      ? new Map(sectors.map((s) => [String(s).toLowerCase(), String(s)]))
      : null;
    const out = [];
    for (const item of raw) {
      if (typeof item !== 'string') return fail('Sector focus must be a list of sector names');
      const name = tidy(item);
      if (!name) continue;
      const stored = allowed ? allowed.get(name.toLowerCase()) : name;
      if (!stored) return fail(`Unknown sector: ${name}`);
      if (!out.includes(stored)) out.push(stored);
    }
    if (out.length > THESIS_LIMITS.sectors)
      return fail(`Choose up to ${THESIS_LIMITS.sectors} sectors`);
    value.sector_focus = out;
  }

  if (has('max_single_name_pct') || !partial) {
    const raw = body.max_single_name_pct ?? THESIS_LIMITS.capDefault;
    const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
    if (!isNum(n) || n < THESIS_LIMITS.capMin || n > THESIS_LIMITS.capMax)
      return fail(
        `Max single-name weight must be between ${THESIS_LIMITS.capMin} and ${THESIS_LIMITS.capMax}`,
      );
    value.max_single_name_pct = Math.round(n * 10) / 10;
  }

  if (partial && Object.keys(value).length === 0) return fail('Nothing to update');
  return { ok: true, value };
}

/**
 * Validate a trade's thesis note. Empty text clears the note (value null).
 * Line breaks are kept; other whitespace runs collapse to one space.
 * @returns {{ ok: true, value: string | null } | { ok: false, error: string }}
 */
export function parseThesisNote(raw) {
  if (raw == null) return { ok: true, value: null };
  if (typeof raw !== 'string') return { ok: false, error: 'Note must be text' };
  const text = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length > THESIS_LIMITS.note)
    return { ok: false, error: `Note must be ${THESIS_LIMITS.note} characters or fewer` };
  return { ok: true, value: text || null };
}

/* ------------------------------------------------------------------ */
/* What-if: the order in the ticket, projected onto the portfolio      */
/* ------------------------------------------------------------------ */

const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

/**
 * Before and after for the ticket's order at the last price.
 *
 * A trade at the last price moves value between cash and the position, so
 * total value does not change and weights use the current total. A sell is
 * capped at the position's market value (a larger amount closes it).
 *
 * @param {{ side: 'buy'|'sell', amount: number, symbol: string, price: number,
 *   cash: number, totalValue: number,
 *   positions: Array<{ symbol: string, value: number }> }} p
 * @returns {null | { symbol, side, amount, shares, exceedsCash, closes,
 *   weight: { before, after }, cash: { before, after }, exposure: { before, after } }}
 *   null when there is no symbol, price or amount to project.
 */
export function whatIf({ side, amount, symbol, price, cash, positions, totalValue }) {
  const sym = String(symbol || '')
    .trim()
    .toUpperCase();
  const amt = Number(amount);
  const px = Number(price);
  const total = Number(totalValue);
  if (!sym || !(amt > 0) || !(px > 0) || !(total > 0)) return null;
  const isSell = side === 'sell';
  const c = Number(cash) || 0;
  const held = (Array.isArray(positions) ? positions : []).find(
    (p) => String(p.symbol || '').toUpperCase() === sym,
  );
  const posValue = Math.max(0, Number(held?.value) || 0);
  const traded = isSell ? Math.min(amt, posValue) : amt;
  const posAfter = isSell ? posValue - traded : posValue + traded;
  const cashAfter = isSell ? c + traded : c - traded;
  return {
    symbol: sym,
    side: isSell ? 'sell' : 'buy',
    amount: traded,
    shares: traded / px,
    exceedsCash: !isSell && traded > c,
    closes: isSell && posValue > 0 && traded >= posValue,
    weight: { before: pct(posValue, total), after: pct(posAfter, total) },
    cash: { before: c, after: cashAfter },
    exposure: { before: pct(total - c, total), after: pct(total - cashAfter, total) },
  };
}

/* ------------------------------------------------------------------ */
/* Thesis fit                                                          */
/* ------------------------------------------------------------------ */

/** 'match' | 'neutral' | 'mismatch' */
export function sectorCheck({ thesis, sector, isFund = false }) {
  const focus = Array.isArray(thesis?.sector_focus) ? thesis.sector_focus : [];
  const s = String(sector || '')
    .trim()
    .toLowerCase();
  if (!focus.length || isFund || !s) return 'neutral';
  return focus.some((f) => String(f).toLowerCase() === s) ? 'match' : 'mismatch';
}

/** 'within' | 'above' | 'unknown' (beta is the portfolio's, or null for N/A) */
export function riskCheck({ thesis, beta }) {
  if (!isNum(beta)) return 'unknown';
  const max = FIT.betaMax[thesis?.risk_tolerance] ?? FIT.betaMax.moderate;
  return beta <= max ? 'within' : 'above';
}

/** 'within' | 'nearing' | 'over' for a weight (percent) against a cap (percent). */
export function capStatus(weightPct, capPct) {
  const cap = Number(capPct);
  const w = Number(weightPct);
  if (!(cap > 0) || !isNum(w)) return 'within';
  if (w > cap) return 'over';
  return w >= cap * FIT.nearingShare ? 'nearing' : 'within';
}

const CAP_RANK = { within: 0, nearing: 1, over: 2 };

/**
 * Concentration of the order's ticker against the thesis cap, on the
 * projected weight. A sell is judged on the reduced weight, so it can only
 * hold or improve on where the position stands today.
 */
export function concentrationCheck({ thesis, projection }) {
  if (!projection) return 'within';
  const cap = thesis?.max_single_name_pct;
  const after = capStatus(projection.weight.after, cap);
  if (projection.side !== 'sell') return after;
  const before = capStatus(projection.weight.before, cap);
  return CAP_RANK[after] <= CAP_RANK[before] ? after : before;
}

export function fitLabel(score) {
  if (!isNum(score)) return null;
  if (score >= FIT.labels.high) return 'High';
  return score >= FIT.labels.medium ? 'Medium' : 'Low';
}

/**
 * The three checks, the 0 to 100 score and its label for the ticket's order.
 * Returns null when there is no active thesis or no order to judge.
 *
 * @param {{ thesis: object|null, projection: ReturnType<typeof whatIf>,
 *   sector?: string|null, isFund?: boolean, beta?: number|null }} p
 */
export function thesisFit({ thesis, projection, sector = null, isFund = false, beta = null }) {
  if (!thesis || !projection) return null;
  const checks = {
    sector: sectorCheck({ thesis, sector, isFund }),
    risk: riskCheck({ thesis, beta }),
    concentration: concentrationCheck({ thesis, projection }),
  };
  const score =
    FIT.points.sector[checks.sector] +
    FIT.points.risk[checks.risk] +
    FIT.points.concentration[checks.concentration];
  return { checks, score, label: fitLabel(score) };
}

const one = (n) => (isNum(n) ? n.toFixed(1) : '0.0');

/**
 * The three checks as short descriptive sentences, in display order
 * (sector, risk, concentration). `ok` false means: show the warning icon.
 * Wording describes; it never advises.
 */
export function fitClauses({ thesis, fit, projection }) {
  if (!thesis || !fit || !projection) return [];
  const { checks } = fit;
  const name = thesis.name;
  const cap = one(Number(thesis.max_single_name_pct));
  const sym = projection.symbol;
  const w = one(projection.weight.after);
  const sectorText = {
    match: `Lines up with ${name}.`,
    neutral: `No sector check against ${name}.`,
    mismatch: `Outside the sector focus of ${name}.`,
  }[checks.sector];
  const riskText = {
    within: 'Within risk tolerance.',
    above: 'Above risk tolerance.',
    unknown: 'Risk tolerance check needs more history.',
  }[checks.risk];
  const capText = {
    within: `${sym} would be ${w}% against a ${cap}% cap.`,
    nearing: `Nearing the cap: ${sym} would be ${w}% against a ${cap}% cap.`,
    over: `Past the cap: ${sym} would be ${w}% against a ${cap}% cap.`,
  }[checks.concentration];
  return [
    { key: 'sector', ok: checks.sector !== 'mismatch', text: sectorText },
    { key: 'risk', ok: checks.risk !== 'above', text: riskText },
    { key: 'concentration', ok: checks.concentration === 'within', text: capText },
  ];
}

/**
 * Share of invested market value held in the thesis's sector focus, as a
 * percent. null (shown as "N/A") when the thesis has no sector focus or
 * nothing is invested. Positions with an unknown sector count as outside.
 *
 * @param {{ thesis: object|null,
 *   positions: Array<{ symbol: string, value: number }>,
 *   sectors: Record<string, string|null> }} p  sectors is keyed by ticker.
 */
export function portfolioAlignment({ thesis, positions, sectors }) {
  const focus = Array.isArray(thesis?.sector_focus) ? thesis.sector_focus : [];
  if (!focus.length) return null;
  const set = new Set(focus.map((f) => String(f).toLowerCase()));
  let invested = 0;
  let inFocus = 0;
  for (const p of Array.isArray(positions) ? positions : []) {
    const v = Math.max(0, Number(p.value) || 0);
    invested += v;
    const s = sectors?.[String(p.symbol || '').toUpperCase()];
    if (s && set.has(String(s).toLowerCase())) inFocus += v;
  }
  return invested > 0 ? (inFocus / invested) * 100 : null;
}

/* ------------------------------------------------------------------ */
/* Trade journal: position impact                                      */
/* ------------------------------------------------------------------ */

const EPS = 1e-9;

/**
 * Replay the trade log in time order and describe what each trade did to its
 * position. Returns a Map from trade id to
 * { kind: 'opened'|'added'|'reduced'|'closed', shares, after }.
 * `shares` is the size of the change (positive); `after` is the holding left.
 *
 * @param {Array<{ id: string, ticker: string, trade_type: 'buy'|'sell',
 *   quantity: number, created_at: string }>} trades  Any order.
 */
export function tradeImpacts(trades) {
  const list = (Array.isArray(trades) ? trades : [])
    .map((t, i) => ({ t, i, at: new Date(t?.created_at).getTime() }))
    .sort((a, b) => (a.at || 0) - (b.at || 0) || a.i - b.i);
  const held = new Map();
  const out = new Map();
  for (const { t } of list) {
    const sym = String(t?.ticker || '').toUpperCase();
    const qty = Math.abs(Number(t?.quantity) || 0);
    if (!sym || !(qty > 0)) continue;
    const before = held.get(sym) || 0;
    const isSell = t.trade_type === 'sell';
    const moved = isSell ? Math.min(qty, before) : qty;
    const after = isSell ? before - moved : before + moved;
    const flat = after <= EPS;
    held.set(sym, flat ? 0 : after);
    let kind;
    if (isSell) kind = flat ? 'closed' : 'reduced';
    else kind = before <= EPS ? 'opened' : 'added';
    out.set(t.id, { kind, shares: isSell ? moved : qty, after: flat ? 0 : after });
  }
  return out;
}
