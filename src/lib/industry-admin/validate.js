/**
 * Validation for /admin/industries writes (industry-data-ingest-prompt.md,
 * Step 4). Pure; tested in scripts/check-chips-ingest.mjs. Every row needs a
 * source URL, an as-of date, a scope and a measure type; a row missing any of
 * them is rejected, never filled in. Plain text only (no rich text anywhere).
 */

export const KNOWN_METRICS = [
  'industry_sales',
  'global_sales_share',
  'manufacturing_capacity_share',
  'market_share',
  'end_market_share',
  'employment',
  'rd_spend',
  'capex',
  'revenue',
  'operating_margin',
  'gross_margin',
  'workforce_gap',
  'graduates',
];
export const MEASURE_TYPES = ['observed', 'estimated', 'forecast', 'announced'];
export const UNITS = ['usd', 'pct', 'people', 'count', 'wafers_per_month', 'other'];
export const FACILITY_STATUSES = [
  'announced',
  'under_construction',
  'operational',
  'paused',
  'cancelled',
];
export const RISK_CONFIDENCE = ['documented', 'inferred'];
export const SCOPE_SUGGESTIONS = [
  'US-headquartered companies, global sales',
  'US-located manufacturing capacity',
  'Global industry',
];
export const SIA_GUARD =
  'Enter figures only, with citation. Do not paste SIA charts, maps or paragraphs.';

const isUrl = (v) => {
  try {
    const u = new URL(String(v));
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(Date.parse(v));
const str = (v, max = 300) => {
  const s = String(v ?? '').trim();
  return s.length ? s.slice(0, max) : '';
};
/* No markup: a pasted paragraph or chart embed is rejected, not cleaned. */
const plain = (v) => !/<[a-z/][^>]*>/i.test(String(v || ''));

function sourceErrors(row, errors) {
  if (!isUrl(row.source_url)) errors.push('source_url is required and must be a URL');
  if (!isDate(row.as_of)) errors.push('as_of is required (YYYY-MM-DD)');
}

/** "key=value; key2=value2" or an object -> a flat string map. */
export function parseDimension(v) {
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [str(k, 60), str(x, 120)]));
  }
  const out = {};
  for (const part of String(v || '').split(';')) {
    const [k, ...rest] = part.split('=');
    if (k && rest.length) out[str(k, 60)] = str(rest.join('='), 120);
  }
  return out;
}

export function validateMetric(input) {
  const errors = [];
  const row = {
    industry_id: str(input.industry_id, 60),
    metric: str(input.metric === 'other' ? input.metric_other : input.metric, 60)
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_'),
    dimension: parseDimension(input.dimension),
    value: Number(String(input.value ?? '').replace(/[,$\s]/g, '')),
    unit: str(input.unit, 30),
    measure_type: str(input.measure_type, 20),
    scope: str(input.scope, 200),
    period: str(input.period, 40) || null,
    source_name: str(input.source_name, 200),
    source_url: str(input.source_url, 1000),
    source_page: str(input.source_page, 120) || null,
    as_of: str(input.as_of, 10),
  };
  if (!row.industry_id) errors.push('industry is required');
  if (!row.metric) errors.push('metric is required');
  if (!Number.isFinite(row.value)) errors.push('value must be a number');
  if (!row.unit) errors.push('unit is required');
  if (!MEASURE_TYPES.includes(row.measure_type)) errors.push('measure_type is required');
  if (!row.scope) errors.push('scope is required');
  if (!row.source_name) errors.push('source_name is required');
  sourceErrors(row, errors);
  for (const k of ['scope', 'source_name', 'period'])
    if (!plain(row[k])) errors.push(`${k} must be plain text`);
  return { ok: !errors.length, errors, row };
}

/** Same (industry, metric, dimension, period) means a newer row supersedes. */
export function metricKey(m) {
  const dim = Object.keys(m.dimension || {})
    .sort()
    .map((k) => `${k}=${m.dimension[k]}`)
    .join(';');
  return `${m.industry_id}|${m.metric}|${dim}|${m.period || ''}`;
}

export function validateFacility(input) {
  const errors = [];
  const inv = input.announced_investment_usd;
  const row = {
    industry_id: str(input.industry_id, 60),
    stage_id: str(input.stage_id, 60) || null,
    company_name: str(input.company_name, 200),
    ticker: str(input.ticker, 12).toUpperCase() || null,
    project_group: str(input.project_group, 120),
    city: str(input.city, 120) || null,
    state_code: str(input.state_code, 2).toUpperCase() || null,
    country: str(input.country, 2).toUpperCase() || 'US',
    activity: str(input.activity, 160) || null,
    status: str(input.status, 30) || null,
    incentive_type: str(input.incentive_type, 40) || null,
    announced_investment_usd:
      inv === '' || inv == null ? null : Number(String(inv).replace(/[,$\s]/g, '')),
    source_url: str(input.source_url, 1000),
    source_page: str(input.source_page, 120) || null,
    as_of: str(input.as_of, 10),
  };
  if (!row.industry_id) errors.push('industry is required');
  if (!row.company_name) errors.push('company_name is required');
  if (!row.project_group) errors.push('project_group is required');
  if (row.status && !FACILITY_STATUSES.includes(row.status))
    errors.push('status is not a known value');
  if (row.announced_investment_usd != null && !Number.isFinite(row.announced_investment_usd)) {
    errors.push('announced_investment_usd must be a number');
  }
  sourceErrors(row, errors);
  return { ok: !errors.length, errors, row };
}

/** Two facilities in one project_group both carrying an investment figure. */
export function projectGroupWarnings(facilities) {
  const by = new Map();
  for (const f of facilities || []) {
    if (!f.project_group || f.announced_investment_usd == null) continue;
    if (!by.has(f.project_group)) by.set(f.project_group, []);
    by.get(f.project_group).push(f);
  }
  return [...by.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(
      ([group, rows]) =>
        `${rows.length} facilities in project group "${group}" carry an announced investment. Check the phases do not overlap.`,
    );
}

export function validateRisk(input) {
  const errors = [];
  const row = {
    industry_id: str(input.industry_id, 60),
    stage_id: str(input.stage_id, 60) || null,
    risk_type: str(input.risk_type, 60) || null,
    title: str(input.title, 200),
    evidence: str(input.evidence, 2000),
    exposure: str(input.exposure, 500) || null,
    substitutes: str(input.substitutes, 500) || null,
    confidence: str(input.confidence, 20),
    source_url: str(input.source_url, 1000),
    as_of: str(input.as_of, 10),
  };
  if (!row.industry_id) errors.push('industry is required');
  if (!row.title) errors.push('title is required');
  if (!row.evidence) errors.push('evidence is required');
  if (!RISK_CONFIDENCE.includes(row.confidence)) errors.push('confidence is required');
  for (const k of ['title', 'evidence', 'exposure', 'substitutes'])
    if (!plain(row[k])) errors.push(`${k} must be plain text`);
  sourceErrors(row, errors);
  return { ok: !errors.length, errors, row };
}

/** RFC 4180-ish CSV: quoted fields, doubled quotes, CRLF. First row = header. */
export function parseCsv(textIn) {
  const rows = [];
  let row = [];
  let field = '';
  let q = false;
  const t = String(textIn || '');
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x !== '')) rows.push(row);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

/** Whether `actorId` may approve a row entered by `enteredBy`. */
export function canApprove(actorId, enteredBy, { requireSecondAdmin = false } = {}) {
  if (!requireSecondAdmin) return true;
  return !enteredBy || enteredBy !== actorId;
}
