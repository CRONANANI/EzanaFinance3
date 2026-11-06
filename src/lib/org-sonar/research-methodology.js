/**
 * Sonar for organizations: the fund's research methodology (Nov 2026).
 *
 * One row per org in `org_research_methodology` tells Sonar's analysts how
 * this fund researches a company: the valuation methods it prefers, the
 * report sections the research director must fill, the default horizon,
 * whether scenarios and a red team are required, review rules, assumption
 * overrides for the valuation engine and the output format.
 *
 *   validateMethodology(body)   PUT body (snake_case) -> { ok, value | errors }
 *   normalizeMethodology(row)   DB row -> the camelCase shape analysts read
 *   loadOrgMethodology(admin, orgId)   tenant-scoped reader; defaults when
 *                                      there is no org or no row; never throws
 *
 * Pure (no imports of server infrastructure): the reader takes the client as
 * an argument, so the settings UI can share the option lists. Ranges below
 * mirror the database checks (horizon 3 to 120 months, output format) and
 * add sensible bounds for the overrides. Unit-tested in
 * scripts/check-org-research-methodology.mjs.
 */

export const VALUATION_METHODS = [
  { id: 'dcf', label: 'Discounted cash flow' },
  { id: 'comparables', label: 'Trading comparables (multiples)' },
  { id: 'precedent_transactions', label: 'Precedent transactions' },
  { id: 'sum_of_parts', label: 'Sum of the parts' },
  { id: 'dividend_discount', label: 'Dividend discount' },
  { id: 'residual_income', label: 'Residual income' },
  { id: 'nav', label: 'Net asset value' },
  { id: 'lbo', label: 'Leveraged buyout' },
];

/* Accepted spellings that map onto a canonical id. */
const METHOD_ALIASES = { multiples: 'comparables', comps: 'comparables', ddm: 'dividend_discount' };

export const REPORT_SECTIONS = [
  { id: 'thesis', label: 'Investment thesis' },
  { id: 'financials', label: 'Financials' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'industry', label: 'Industry' },
  { id: 'competition', label: 'Competitive position' },
  { id: 'risks', label: 'Risks' },
  { id: 'catalysts', label: 'Catalysts' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'management', label: 'Management and governance' },
  { id: 'capital_allocation', label: 'Capital allocation' },
  { id: 'ownership', label: 'Ownership and flows' },
  { id: 'macro', label: 'Macro exposure' },
  { id: 'esg', label: 'ESG' },
];

export const OUTPUT_FORMATS = [
  { id: 'ic_memo', label: 'Investment committee memo' },
  { id: 'research_note', label: 'Research note' },
  { id: 'one_pager', label: 'One-pager' },
];

export const HORIZON_MIN = 3;
export const HORIZON_MAX = 120;
export const NOTES_MAX = 2000;

/**
 * Valuation engine overrides. Rates are decimals (0.055 is 5.5%); `unit`
 * tells the UI how to show them.
 */
export const ASSUMPTION_FIELDS = [
  { id: 'risk_free_rate', label: 'Risk-free rate', min: 0, max: 0.1, unit: 'pct' },
  { id: 'equity_risk_premium', label: 'Equity risk premium', min: 0.02, max: 0.1, unit: 'pct' },
  { id: 'terminal_growth_cap', label: 'Terminal growth cap', min: 0, max: 0.05, unit: 'pct' },
  { id: 'discount_rate_floor', label: 'Discount rate floor', min: 0, max: 0.25, unit: 'pct' },
  { id: 'tax_rate', label: 'Tax rate', min: 0, max: 0.5, unit: 'pct' },
  { id: 'margin_of_safety', label: 'Margin of safety', min: 0, max: 0.5, unit: 'pct' },
  { id: 'beta_floor', label: 'Beta floor', min: 0, max: 3, unit: 'x' },
  { id: 'beta_cap', label: 'Beta cap', min: 0, max: 5, unit: 'x' },
];

export const CONFIDENCE_LEVELS = ['low', 'moderate', 'high'];

/** Review rules the fund can set on its reports. */
export const REVIEW_RULE_FIELDS = [
  { id: 'min_reviewers', label: 'Reviewers before approval', kind: 'int', min: 0, max: 5 },
  {
    id: 'require_executive_approval',
    label: 'An executive approves every report',
    kind: 'bool',
  },
  { id: 'require_citations', label: 'Every figure cites a source', kind: 'bool' },
  {
    id: 'min_confidence',
    label: 'Lowest confidence a report can be submitted at',
    kind: 'enum',
    options: CONFIDENCE_LEVELS,
  },
  { id: 'stale_after_days', label: 'Refresh a report after (days)', kind: 'int', min: 7, max: 730 },
];

const METHOD_IDS = new Set(VALUATION_METHODS.map((m) => m.id));
const SECTION_IDS = new Set(REPORT_SECTIONS.map((s) => s.id));
const FORMAT_IDS = new Set(OUTPUT_FORMATS.map((f) => f.id));

export const DEFAULT_METHODOLOGY = Object.freeze({
  orgId: null,
  isDefault: true,
  valuationMethods: Object.freeze(['dcf', 'comparables']),
  requiredSections: Object.freeze(['financials', 'risks', 'industry']),
  horizonMonths: 36,
  scenariosRequired: true,
  redTeamRequired: false,
  reviewRules: Object.freeze({}),
  assumptionOverrides: Object.freeze({}),
  outputFormat: 'ic_memo',
  notes: null,
  updatedAt: null,
  updatedBy: null,
});

/** A fresh, mutable copy of the defaults (optionally for an org). */
export function defaultMethodology(orgId = null) {
  return {
    ...DEFAULT_METHODOLOGY,
    orgId: orgId || null,
    valuationMethods: [...DEFAULT_METHODOLOGY.valuationMethods],
    requiredSections: [...DEFAULT_METHODOLOGY.requiredSections],
    reviewRules: {},
    assumptionOverrides: {},
  };
}

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const blank = (v) => v === undefined || v === null || v === '';
const pick = (body, snake, camel) => (snake in body ? body[snake] : body[camel]);

function canonMethod(v) {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  return METHOD_ALIASES[s] || s;
}

function cleanText(v, max) {
  const s = String(v ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
  return s || null;
}

/* A list of ids from `allowed`; returns { list, bad }. */
function idList(v, allowed, canon = (x) => String(x ?? '').trim()) {
  const raw = Array.isArray(v) ? v : [];
  const list = [];
  const bad = [];
  for (const x of raw) {
    const id = canon(x);
    if (!allowed.has(id)) bad.push(String(x));
    else if (!list.includes(id)) list.push(id);
  }
  return { list, bad };
}

/**
 * Validate a PUT body. Missing fields take the default (PUT replaces the
 * whole methodology). Accepts snake_case keys (the column names) and their
 * camelCase forms.
 * @returns {{ ok: true, value: object } | { ok: false, errors: Array<{ field: string, message: string }> }}
 *   `value` is the database row (snake_case, without org_id / updated_by).
 */
export function validateMethodology(body) {
  const errors = [];
  const err = (field, message) => errors.push({ field, message });
  if (!isObj(body)) {
    return { ok: false, errors: [{ field: 'body', message: 'Expected a JSON object.' }] };
  }
  const d = DEFAULT_METHODOLOGY;

  let valuation = [...d.valuationMethods];
  const vm = pick(body, 'valuation_methods', 'valuationMethods');
  if (vm !== undefined) {
    if (!Array.isArray(vm)) err('valuation_methods', 'Choose valuation methods from the list.');
    else {
      const { list, bad } = idList(vm, METHOD_IDS, canonMethod);
      if (bad.length) err('valuation_methods', `Unknown valuation method: ${bad.join(', ')}.`);
      else if (!list.length) err('valuation_methods', 'Choose at least one valuation method.');
      valuation = list;
    }
  }

  let sections = [...d.requiredSections];
  const rs = pick(body, 'required_sections', 'requiredSections');
  if (rs !== undefined) {
    if (!Array.isArray(rs)) err('required_sections', 'Choose report sections from the list.');
    else {
      const { list, bad } = idList(rs, SECTION_IDS);
      if (bad.length) err('required_sections', `Unknown report section: ${bad.join(', ')}.`);
      sections = list;
    }
  }

  let horizon = d.horizonMonths;
  const hm = pick(body, 'horizon_months', 'horizonMonths');
  if (hm !== undefined) {
    const n = Number(hm);
    if (blank(hm) || !Number.isInteger(n) || n < HORIZON_MIN || n > HORIZON_MAX) {
      err(
        'horizon_months',
        `Horizon must be a whole number of months from ${HORIZON_MIN} to ${HORIZON_MAX}.`,
      );
    } else horizon = n;
  }

  const bool = (snake, camel, fallback) => {
    const v = pick(body, snake, camel);
    if (v === undefined) return fallback;
    if (typeof v !== 'boolean') {
      err(snake, 'Expected true or false.');
      return fallback;
    }
    return v;
  };
  const scenarios = bool('scenarios_required', 'scenariosRequired', d.scenariosRequired);
  const redTeam = bool('red_team_required', 'redTeamRequired', d.redTeamRequired);

  const reviewRules = {};
  const rr = pick(body, 'review_rules', 'reviewRules');
  if (rr !== undefined && rr !== null) {
    if (!isObj(rr)) err('review_rules', 'Review rules must be an object.');
    else {
      const known = new Map(REVIEW_RULE_FIELDS.map((f) => [f.id, f]));
      for (const [k, v] of Object.entries(rr)) {
        const f = known.get(k);
        if (!f) {
          err(`review_rules.${k}`, 'Unknown review rule.');
          continue;
        }
        if (blank(v)) continue;
        if (f.kind === 'bool') {
          if (typeof v !== 'boolean') err(`review_rules.${k}`, 'Expected true or false.');
          else reviewRules[k] = v;
        } else if (f.kind === 'int') {
          const n = Number(v);
          if (!Number.isInteger(n) || n < f.min || n > f.max) {
            err(
              `review_rules.${k}`,
              `${f.label} must be a whole number from ${f.min} to ${f.max}.`,
            );
          } else reviewRules[k] = n;
        } else if (f.kind === 'enum') {
          if (!f.options.includes(v)) {
            err(`review_rules.${k}`, `${f.label} must be one of ${f.options.join(', ')}.`);
          } else reviewRules[k] = v;
        }
      }
    }
  }

  const overrides = {};
  const ao = pick(body, 'assumption_overrides', 'assumptionOverrides');
  if (ao !== undefined && ao !== null) {
    if (!isObj(ao)) err('assumption_overrides', 'Assumption overrides must be an object.');
    else {
      const known = new Map(ASSUMPTION_FIELDS.map((f) => [f.id, f]));
      for (const [k, v] of Object.entries(ao)) {
        const f = known.get(k);
        if (!f) {
          err(`assumption_overrides.${k}`, 'Unknown assumption.');
          continue;
        }
        if (blank(v)) continue;
        const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
        if (!Number.isFinite(n) || n < f.min || n > f.max) {
          err(
            `assumption_overrides.${k}`,
            `${f.label} must be between ${fmtBound(f, f.min)} and ${fmtBound(f, f.max)}.`,
          );
        } else overrides[k] = n;
      }
      if (
        Number.isFinite(overrides.beta_floor) &&
        Number.isFinite(overrides.beta_cap) &&
        overrides.beta_cap < overrides.beta_floor
      ) {
        err('assumption_overrides.beta_cap', 'Beta cap must be at or above the beta floor.');
      }
    }
  }

  let format = d.outputFormat;
  const of = pick(body, 'output_format', 'outputFormat');
  if (of !== undefined) {
    if (!FORMAT_IDS.has(of)) {
      err('output_format', 'Output format must be an IC memo, a research note or a one-pager.');
    } else format = of;
  }

  let notes = null;
  const nt = body.notes;
  if (nt !== undefined && nt !== null) {
    if (typeof nt !== 'string') err('notes', 'Notes must be text.');
    else if (nt.length > NOTES_MAX) err('notes', `Notes are limited to ${NOTES_MAX} characters.`);
    else notes = cleanText(nt, NOTES_MAX);
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      valuation_methods: valuation,
      required_sections: sections,
      horizon_months: horizon,
      scenarios_required: scenarios,
      red_team_required: redTeam,
      review_rules: reviewRules,
      assumption_overrides: overrides,
      output_format: format,
      notes,
    },
  };
}

function fmtBound(f, v) {
  return f.unit === 'pct' ? `${+(v * 100).toFixed(2)}%` : String(v);
}

/**
 * A DB row (or null) -> the methodology the analysts read. Defensive: values
 * outside the allowed lists or ranges fall back to the default (or are
 * dropped, for overrides and review rules), so a hand-edited row can never
 * feed the engine an out-of-range assumption.
 */
export function normalizeMethodology(row) {
  if (!isObj(row)) return defaultMethodology();
  const d = defaultMethodology(row.org_id || null);

  const methods = idList(row.valuation_methods, METHOD_IDS, canonMethod).list;
  const sections = Array.isArray(row.required_sections)
    ? idList(row.required_sections, SECTION_IDS).list
    : d.requiredSections;
  const h = Number(row.horizon_months);

  const reviewRules = {};
  if (isObj(row.review_rules)) {
    for (const f of REVIEW_RULE_FIELDS) {
      const v = row.review_rules[f.id];
      if (blank(v)) continue;
      if (f.kind === 'bool' && typeof v === 'boolean') reviewRules[f.id] = v;
      else if (f.kind === 'int' && Number.isInteger(Number(v)) && v >= f.min && v <= f.max)
        reviewRules[f.id] = Number(v);
      else if (f.kind === 'enum' && f.options.includes(v)) reviewRules[f.id] = v;
    }
  }

  const overrides = {};
  if (isObj(row.assumption_overrides)) {
    for (const f of ASSUMPTION_FIELDS) {
      const v = row.assumption_overrides[f.id];
      if (blank(v)) continue;
      const n = Number(v);
      if (Number.isFinite(n) && n >= f.min && n <= f.max) overrides[f.id] = n;
    }
    if (
      Number.isFinite(overrides.beta_floor) &&
      Number.isFinite(overrides.beta_cap) &&
      overrides.beta_cap < overrides.beta_floor
    ) {
      delete overrides.beta_cap;
    }
  }

  return {
    orgId: row.org_id || null,
    isDefault: false,
    valuationMethods: methods.length ? methods : d.valuationMethods,
    requiredSections: sections,
    horizonMonths:
      Number.isInteger(h) && h >= HORIZON_MIN && h <= HORIZON_MAX ? h : d.horizonMonths,
    scenariosRequired:
      typeof row.scenarios_required === 'boolean' ? row.scenarios_required : d.scenariosRequired,
    redTeamRequired:
      typeof row.red_team_required === 'boolean' ? row.red_team_required : d.redTeamRequired,
    reviewRules,
    assumptionOverrides: overrides,
    outputFormat: FORMAT_IDS.has(row.output_format) ? row.output_format : d.outputFormat,
    notes: typeof row.notes === 'string' && row.notes.trim() ? row.notes.slice(0, NOTES_MAX) : null,
    updatedAt: row.updated_at || null,
    updatedBy: row.updated_by || null,
  };
}

export const METHODOLOGY_COLUMNS =
  'org_id, valuation_methods, required_sections, horizon_months, scenarios_required, ' +
  'red_team_required, review_rules, assumption_overrides, output_format, notes, updated_by, updated_at';

/**
 * The org's methodology for a Sonar run (server). Tenant-scoped: reads only
 * the row for `orgId`, and returns that org's id on the result so a caller
 * can assert it. Guests, users outside any org (orgId null), orgs without a
 * row, a missing table and any read error all get the defaults. Never throws.
 * @param {object|null} admin  service-role client from @/lib/supabase
 * @param {string|null} orgId  the caller's resolved org (never from the request body)
 * @returns {Promise<object>}  normalizeMethodology() shape
 */
export async function loadOrgMethodology(admin, orgId) {
  if (!admin || !orgId || typeof orgId !== 'string') return defaultMethodology();
  try {
    const { data, error } = await admin
      .from('org_research_methodology')
      .select(METHODOLOGY_COLUMNS)
      .eq('org_id', orgId)
      .maybeSingle();
    if (error || !data) return defaultMethodology(orgId);
    /* Belt and braces: a row for any other org is never returned. */
    if (data.org_id && data.org_id !== orgId) return defaultMethodology(orgId);
    return normalizeMethodology({ ...data, org_id: orgId });
  } catch {
    return defaultMethodology(orgId);
  }
}

/** Label for an id from one of the option lists (UI and prompts). */
export function optionLabel(list, id) {
  return list.find((o) => o.id === id)?.label || id;
}

/**
 * Plain-language lines describing the methodology, for the director and
 * valuation prompts ("per your fund's methodology"). Empty for defaults so a
 * run without an org methodology reads exactly as before.
 */
export function methodologyBrief(m) {
  if (!m || m.isDefault) return [];
  const lines = [
    `Preferred valuation methods: ${m.valuationMethods.map((id) => optionLabel(VALUATION_METHODS, id)).join(', ')}.`,
    m.requiredSections.length
      ? `Required report sections: ${m.requiredSections.map((id) => optionLabel(REPORT_SECTIONS, id)).join(', ')}. Write "not available in Ezana data" for a section the evidence cannot fill.`
      : null,
    `Default horizon: ${m.horizonMonths} months, unless the question names one.`,
    m.scenariosRequired ? 'Scenarios (bear, base, bull) are required.' : null,
    m.redTeamRequired ? 'A red team review is required.' : null,
    `Output format: ${optionLabel(OUTPUT_FORMATS, m.outputFormat)}.`,
  ];
  const ov = ASSUMPTION_FIELDS.filter((f) => Number.isFinite(m.assumptionOverrides?.[f.id])).map(
    (f) => `${f.label} ${fmtBound(f, m.assumptionOverrides[f.id])}`,
  );
  if (ov.length) lines.push(`Assumption overrides: ${ov.join('; ')}.`);
  return lines.filter(Boolean);
}
