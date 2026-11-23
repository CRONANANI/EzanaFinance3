/**
 * Research Composer: the capability registry (Nov 22 2026).
 *
 * One registry for both paths. A question can attach a capability automatically
 * (lib/sonar/composer/intents.js) or the reader can attach it from the Research Composer
 * menu; either way the attachment is the same object, validated by validateAttachment and
 * executed by lib/sonar/composer/execute.js. Pure and client-safe.
 *
 * Attachment (the one shape every path produces):
 *   {
 *     key        stable id: `${capability}` for analyses, `model:...`, `query:...` for context
 *     capability 'fundamental-analysis' | 'dcf-valuation' | 'backtesting' | 'context'
 *     kind       'analysis' | 'query' | 'model' | 'pack' | 'tool' | 'chart' | 'echo' | 'photo'
 *     origin     'auto' (inferred from the question) | 'user' | 'saved' | 'suggested'
 *     subject    { text, kind?: 'institution'|'politician'|'company', id?, name?, eligible? }
 *     target     4.0: what the analysis operates on { id, kind: 'subject' | 'set', label,
 *                dataset?, dependsOn, explicit, stale? } (lib/sonar/composer/context.js). A
 *                'set' target (an intersection, a query's output) replaces the subject as
 *                the analysed companies; the subject stays the research subject.
 *     relation   relationship key (RELATIONS[capability] entry) or 'other'
 *     custom     the reader's own instruction when relation is 'other'
 *     params     typed values, keyed by PARAMS[capability] ids
 *     status     'supported' | 'conditional' | 'unsupported' | 'validation_error' | 'unrelated'
 *     issues     [{ param?, message, fix? }]
 *   }
 *
 * Only capabilities with an executor are listed as analyses. A capability without one is
 * never shown as runnable.
 */

/* ── parameters ─────────────────────────────────────────────────────── */

/** Typed parameter schema. `max` may be a function of the attachment (data-dependent). */
export const PARAMS = {
  'fundamental-analysis': [
    {
      id: 'top_n',
      label: 'Holdings',
      type: 'integer',
      min: 1,
      max: (a) => Math.min(25, onSet(a) ? (a.target.count ?? 25) : (a?.subject?.eligible ?? 25)),
      default: (a) => (onSet(a) ? null : 10),
      placeholder: 'All',
      when: (a) =>
        onSet(a) || a?.subject?.kind === 'institution' || a?.subject?.kind === 'politician',
      effect: (a) =>
        onSet(a)
          ? 'Empty analyses every company in the target set; a number keeps the largest by reported value.'
          : 'How many of the largest holdings are analysed.',
    },
    {
      id: 'metrics',
      label: 'Metrics',
      type: 'multi',
      options: [
        { value: 'revenue_growth', label: 'Revenue growth' },
        { value: 'gross_margin', label: 'Gross margin' },
        { value: 'operating_margin', label: 'Operating margin' },
        { value: 'net_margin', label: 'Net margin' },
        { value: 'fcf_margin', label: 'Free cash flow margin' },
        { value: 'roe', label: 'Return on equity' },
        { value: 'debt_to_equity', label: 'Debt to equity' },
      ],
      default: [
        'revenue_growth',
        'gross_margin',
        'operating_margin',
        'net_margin',
        'fcf_margin',
        'roe',
        'debt_to_equity',
      ],
      effect: 'Which ratios are computed from the latest filed annual figures.',
    },
  ],
  'dcf-valuation': [
    {
      id: 'top_n',
      label: 'Companies',
      type: 'integer',
      min: 1,
      max: (a) => Math.min(5, onSet(a) ? (a.target.count ?? 5) : (a?.subject?.eligible ?? 5)),
      default: (a) => (onSet(a) ? null : 3),
      placeholder: 'All (up to 5)',
      when: (a) =>
        onSet(a) || a?.subject?.kind === 'institution' || a?.subject?.kind === 'politician',
      effect: 'How many companies are valued (at most 5 per run), largest by reported value.',
    },
    {
      id: 'years',
      label: 'Forecast years',
      type: 'integer',
      min: 3,
      max: 10,
      default: 5,
      effect: 'Years of projected free cash flow before the terminal value.',
    },
    {
      id: 'growth_pct',
      label: 'FCF growth %',
      type: 'percent',
      min: -20,
      max: 40,
      step: 0.5,
      default: null,
      placeholder: 'From history',
      effect: 'Annual free cash flow growth. Empty uses filed revenue growth, held to 0 to 20%.',
    },
    {
      id: 'wacc_pct',
      label: 'Discount rate %',
      type: 'percent',
      min: 4,
      max: 20,
      step: 0.25,
      default: 9,
      effect: 'Weighted average cost of capital used to discount the cash flows.',
    },
    {
      id: 'terminal_pct',
      label: 'Terminal growth %',
      type: 'percent',
      min: 0,
      max: 4,
      step: 0.25,
      default: 2.5,
      effect: 'Perpetual growth after the forecast years. Must stay below the discount rate.',
    },
  ],
  backtesting: [
    {
      id: 'years',
      label: 'Years',
      type: 'integer',
      min: 1,
      max: 10,
      default: 5,
      effect: 'The historical window, ending today.',
    },
    {
      id: 'hold_days',
      label: 'Hold (days)',
      type: 'integer',
      min: 5,
      max: 365,
      default: 90,
      effect: 'Each position closes after this many calendar days.',
    },
    {
      id: 'within_days',
      label: 'Entry window (days)',
      type: 'integer',
      min: 1,
      max: 60,
      default: 5,
      effect: 'A buy is allowed for this many days after the disclosure became public.',
    },
    {
      id: 'benchmark',
      label: 'Benchmark',
      type: 'enum',
      options: [{ value: 'SPY', label: 'S&P 500 (SPY)' }],
      default: 'SPY',
      effect: 'Compared over the same window.',
    },
  ],
};

/* ── relationships ──────────────────────────────────────────────────── */

const n = (a, fallback) => a?.params?.top_n ?? fallback;
/** The analysis targets a security set (an intersection, a query's output), not its subject. */
export const onSet = (a) => a?.target?.kind === 'set';
const setText = (a) => a?.target?.dataset?.text || a?.target?.label || 'the target set';
const setScope = (a) =>
  a?.params?.top_n
    ? `the ${a.params.top_n} largest companies (by reported value) represented by`
    : 'the companies represented by';
const METRIC_PRESETS = {
  strength: ['gross_margin', 'operating_margin', 'fcf_margin', 'roe', 'debt_to_equity'],
  growth: ['revenue_growth', 'gross_margin', 'operating_margin', 'net_margin'],
  risk: ['debt_to_equity', 'fcf_margin', 'net_margin'],
};

/**
 * Relationship choices per capability. `for` lists the subject kinds a choice applies to;
 * `text(a)` writes the readable relationship from the live parameters.
 */
export const RELATIONS = {
  'fundamental-analysis': [
    {
      key: 'holdings',
      family: 'underlying_entity_analysis',
      for: ['institution'],
      text: (a) =>
        `Analyse the fundamentals of ${a.subject?.name || a.subject?.text || 'the manager'}'s top ${n(a, 10)} disclosed 13F holdings by reported value.`,
    },
    {
      key: 'holdings',
      family: 'underlying_entity_analysis',
      for: ['politician'],
      text: (a) =>
        `Analyse the fundamentals of ${a.subject?.name || a.subject?.text || 'the member'}'s top ${n(a, 10)} estimated disclosed holdings.`,
    },
    {
      key: 'direct',
      family: 'fundamental_analysis',
      for: ['company'],
      text: (a) =>
        `Analyse ${a.subject?.name || a.subject?.text || 'the company'}'s own fundamentals.`,
    },
    {
      key: 'set-all',
      family: 'derived_set_analysis',
      for: ['set'],
      text: (a) => `Analyse the financial fundamentals of ${setScope(a)} ${setText(a)}.`,
    },
    {
      key: 'set-strength',
      family: 'derived_set_analysis',
      for: ['set'],
      metrics: METRIC_PRESETS.strength,
      text: (a) =>
        `Compare the financial strength (margins, cash generation, returns and leverage) of ${setScope(a)} ${setText(a)}.`,
    },
    {
      key: 'set-growth',
      family: 'derived_set_analysis',
      for: ['set'],
      metrics: METRIC_PRESETS.growth,
      text: (a) => `Analyse growth and profitability among ${setScope(a)} ${setText(a)}.`,
    },
    {
      key: 'set-risk',
      family: 'derived_set_analysis',
      for: ['set'],
      metrics: METRIC_PRESETS.risk,
      text: (a) =>
        `Identify financial risks (leverage, weak cash generation, thin margins) among ${setScope(a)} ${setText(a)}.`,
    },
  ],
  'dcf-valuation': [
    {
      key: 'holdings',
      family: 'valuation',
      for: ['institution', 'politician'],
      text: (a) =>
        `Estimate intrinsic value for the top ${n(a, 3)} holdings with a ${a.params?.years ?? 5}-year discounted cash-flow model.`,
    },
    {
      key: 'direct',
      family: 'valuation',
      for: ['company'],
      text: (a) =>
        `Estimate ${a.subject?.name || a.subject?.text || 'the company'}'s intrinsic value with a ${a.params?.years ?? 5}-year discounted cash-flow model.`,
    },
    {
      key: 'set-value',
      family: 'valuation',
      for: ['set'],
      text: (a) =>
        `Estimate intrinsic value for ${a?.params?.top_n ? `the ${a.params.top_n} largest companies` : 'up to 5 companies'} in ${setText(a)} with a ${a.params?.years ?? 5}-year discounted cash-flow model.`,
    },
  ],
  backtesting: [
    {
      key: 'follow',
      family: 'backtesting',
      for: ['politician'],
      text: (a) =>
        `Backtest buying ${a.subject?.name || a.subject?.text || 'the member'}'s disclosed purchases after each became public, held ${a.params?.hold_days ?? 90} days, over ${a.params?.years ?? 5} years against ${a.params?.benchmark || 'SPY'}.`,
    },
  ],
};

/* ── capabilities ───────────────────────────────────────────────────── */

export const CAPABILITIES = {
  'fundamental-analysis': {
    key: 'fundamental-analysis',
    label: 'Fundamental Analysis',
    type: 'Analysis',
    icon: 'bi-clipboard-data',
    summary: 'Margins, growth, cash flow and leverage from filed SEC figures.',
    subjects: ['institution', 'politician', 'company'],
    output: 'calculated',
  },
  'dcf-valuation': {
    key: 'dcf-valuation',
    label: 'DCF Valuation',
    type: 'Analysis',
    icon: 'bi-calculator',
    summary: 'A deterministic discounted cash-flow estimate with editable assumptions.',
    subjects: ['institution', 'politician', 'company'],
    output: 'estimated',
  },
  backtesting: {
    key: 'backtesting',
    label: 'Backtesting & Strategy Simulation',
    type: 'Analysis',
    icon: 'bi-clock-history',
    summary: 'Simulates a disclosure-following strategy on the Quant Lab engine.',
    subjects: ['politician'],
    output: 'simulated',
    unsupportedFor: {
      institution:
        'A strategy that follows 13F changes is not connected yet. Backtesting runs on congressional disclosures.',
      company:
        'Backtesting needs a strategy subject, such as a member of Congress whose disclosed purchases it follows.',
    },
  },
};

export const ANALYSES = Object.values(CAPABILITIES);

/* ── construction and validation ────────────────────────────────────── */

/** Default params for a capability, applied under any explicit values. */
const defaultOf = (p, a) => (typeof p.default === 'function' ? p.default(a) : p.default);

export function defaultParams(capability, attachment) {
  const out = {};
  for (const p of PARAMS[capability] || []) {
    if (p.when && !p.when(attachment)) continue;
    const d = defaultOf(p, attachment);
    out[p.id] = Array.isArray(d) ? [...d] : d;
  }
  return out;
}

/** The relationship choices that apply to an attachment's subject. */
export function relationsFor(attachment) {
  const kind = onSet(attachment) ? 'set' : attachment?.subject?.kind || null;
  return (RELATIONS[attachment?.capability] || []).filter((r) =>
    kind ? r.for.includes(kind) : !r.for.includes('set'),
  );
}

/** The readable relationship for an attachment. */
export function relationText(attachment) {
  if (!attachment) return '';
  if (attachment.relation === 'other' && attachment.custom) return attachment.custom;
  const opts = relationsFor(attachment);
  const r = opts.find((o) => o.key === attachment.relation) || opts[0];
  return r ? r.text(attachment) : '';
}

/** Parameters that apply to this attachment (respecting `when`). */
export function paramsFor(attachment) {
  return (PARAMS[attachment?.capability] || []).filter((p) => !p.when || p.when(attachment));
}

/** A new analysis attachment, with defaults under the given params. */
export function makeAnalysis(
  capability,
  { origin = 'user', subject = null, params = {}, relation } = {},
) {
  const base = { key: capability, capability, kind: 'analysis', origin, subject, custom: '' };
  const withDefaults = { ...base, params: { ...defaultParams(capability, base), ...params } };
  /* top_n waits for the subject (its limit depends on the data), unless the question set it. */
  if (!('top_n' in params)) delete withDefaults.params.top_n;
  const opts = relationsFor(withDefaults);
  return validateAttachment({ ...withDefaults, relation: relation || opts[0]?.key || 'other' });
}

/**
 * Validate an attachment against its capability, subject and data-dependent limits.
 * Never fixes a value silently: an out-of-range value is a validation error with a fix.
 */
export function validateAttachment(attachment) {
  const a = { ...attachment, issues: [] };
  const cap = CAPABILITIES[a.capability];
  if (!cap) return { ...a, status: 'supported' };
  /* A parameter that starts applying (the subject resolved to a set of holdings) gets its
     default; values already set are never touched. */
  const params = { ...(a.params || {}) };
  for (const p of paramsFor(a)) {
    if (p.id in params) continue;
    const max = typeof p.max === 'function' ? p.max(a) : p.max;
    const d = defaultOf(p, a);
    /* A default never starts out invalid: it stays inside the data's limit. Only a value
       the reader set can exceed it (and is then reported, not cut). */
    params[p.id] = Array.isArray(d)
      ? [...d]
      : typeof d === 'number' && max !== undefined
        ? Math.min(d, max)
        : d;
  }
  a.params = params;
  /* A relationship that does not fit the target (the target changed) falls back to the
     first that does; a custom instruction is kept. */
  const rels = relationsFor(a);
  if (a.relation !== 'other' && rels.length && !rels.some((r) => r.key === a.relation))
    a.relation = rels[0].key;
  if (a.target?.stale) {
    a.issues.push({
      message: `Its target (${a.target.label || 'a derived set'}) is no longer in this composition: the attachment that produced it was removed or its relationship changed.`,
      retarget: a.target.suggest || null,
      retargetLabel: a.target.suggestLabel || null,
    });
    return { ...a, status: 'conditional' };
  }
  if (onSet(a)) return validateParams(a);
  const kind = a.subject?.kind || null;
  if (!a.subject?.text && !a.subject?.name) {
    a.issues.push({ message: 'Name the company, fund manager or member of Congress to analyse.' });
    return { ...a, status: 'conditional' };
  }
  if (!kind) {
    a.issues.push({ message: `Sonar is resolving "${a.subject.text}".` });
    return { ...a, status: 'conditional' };
  }
  if (kind === 'unresolved') {
    a.issues.push({
      message: `"${a.subject.text}" did not match a company, a 13F filer or a member of Congress.`,
    });
    return { ...a, status: 'unrelated' };
  }
  if (!cap.subjects.includes(kind)) {
    a.issues.push({ message: cap.unsupportedFor?.[kind] || `${cap.label} does not apply here.` });
    return { ...a, status: 'unsupported' };
  }
  if (Array.isArray(a.subject?.candidates) && a.subject.candidates.length > 1) {
    a.issues.push({ message: 'More than one filer matches. Choose which one to analyse.' });
    return { ...a, status: 'conditional' };
  }
  return validateParams(a);
}

/** Range checks shared by subject and set targets. */
function validateParams(a) {
  for (const p of paramsFor(a)) {
    const v = a.params?.[p.id];
    if (v === null || v === undefined || v === '') continue;
    if (p.type === 'integer' || p.type === 'percent') {
      const num = Number(v);
      const max = typeof p.max === 'function' ? p.max(a) : p.max;
      if (!Number.isFinite(num))
        a.issues.push({ param: p.id, message: `${p.label} must be a number.` });
      else if (p.type === 'integer' && !Number.isInteger(num))
        a.issues.push({ param: p.id, message: `${p.label} must be a whole number.` });
      else if (p.min !== undefined && num < p.min)
        a.issues.push({
          param: p.id,
          message: `${p.label} must be at least ${p.min}.`,
          fix: p.min,
        });
      else if (max !== undefined && num > max) {
        const setCount = p.id === 'top_n' && onSet(a) && a.target?.count != null;
        const eligible =
          p.id === 'top_n' &&
          !onSet(a) &&
          a.subject?.eligible != null &&
          max === a.subject.eligible;
        a.issues.push({
          param: p.id,
          message: setCount
            ? `Only ${a.target.count} matching eligible companies are available. Choose ${a.target.count} or fewer.`
            : eligible
              ? `Only ${max} eligible holdings are available. Choose ${max} or fewer.`
              : `${p.label} can be at most ${max}.`,
          fix: max,
          fixLabel: setCount ? `Use all ${a.target.count}` : null,
        });
      }
    }
  }
  if (
    a.capability === 'dcf-valuation' &&
    Number(a.params?.terminal_pct) >= Number(a.params?.wacc_pct)
  ) {
    a.issues.push({
      param: 'terminal_pct',
      message: 'Terminal growth must be below the discount rate.',
    });
  }
  return { ...a, status: a.issues.length ? 'validation_error' : 'supported' };
}

/* ── composition ────────────────────────────────────────────────────── */

/** Statuses that count as valid, executable resources. */
const VALID = new Set(['supported']);

/**
 * The three-resource rule: three or more distinct, valid user-level resources qualify the
 * composition for Deep research, whatever their origin. Analyses count when valid; other
 * resources (a saved query, a model, a data pack, a lens, an Echo article) count once
 * each. Photos and duplicates never count. Qualification is not execution: the host still
 * runs entitlement, quota and consent checks.
 */
export function deepQualification(attachments = []) {
  const seen = new Set();
  let count = 0;
  for (const a of attachments) {
    if (!a || a.kind === 'photo') continue;
    if (a.kind === 'analysis' && !VALID.has(a.status)) continue;
    const id = a.kind === 'analysis' ? `analysis:${a.capability}` : a.key;
    if (seen.has(id)) continue;
    seen.add(id);
    count += 1;
  }
  return { count, qualifies: count >= 3 };
}
