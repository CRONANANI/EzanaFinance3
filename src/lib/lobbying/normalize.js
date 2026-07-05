/**
 * LDA API response → normalized shapes for the routes, cache, and UI. Field
 * names follow the LDA filing schema. `amount` collapses income (registrant
 * reporting client income) and expenses (client reporting in-house spend) into
 * one displayable number — LDA populates one or the other per filing. Missing
 * data yields nulls/empties, never fabricated values.
 */

// LDA reports dollar fields (income/expenses) as decimal STRINGS ("160000.00")
// or null. Coerce robustly: strip any currency formatting ($, commas, spaces)
// before Number() so "$1,600,000.00" and "160000.00" both parse, never null.
const num = (v) => {
  if (v === null || v === undefined) return null;
  const s = typeof v === 'string' ? v.replace(/[$,\s]/g, '') : v;
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/**
 * Whether a filing is a registration (or amendment thereof) rather than an
 * activity report. Registrations and no-activity quarterly reports legitimately
 * carry no dollar figure, so the UI labels them instead of rendering "$0".
 * LDA filing_type codes: RR/RA/RE… = registrations; Q1–Q4 / MM / … = reports.
 */
export function isRegistrationFiling(f = {}) {
  const code = String(f.filing_type || '').toUpperCase();
  const display = String(f.filing_type_display || '').toLowerCase();
  return /registration/.test(display) || /^R[A-Z]?$/.test(code) || code.startsWith('RR');
}

/** A filing's reported dollar amount: income OR expenses (LDA sets one). */
export function filingAmount(f = {}) {
  const income = num(f.income);
  const expenses = num(f.expenses);
  if (income != null && income > 0) return income;
  if (expenses != null && expenses > 0) return expenses;
  // fall back to whichever is present (may be 0 or null)
  return income != null ? income : expenses;
}

/** Collapse a filing's lobbying_activities → unique issue codes + display list. */
export function filingIssues(f = {}) {
  const acts = Array.isArray(f.lobbying_activities) ? f.lobbying_activities : [];
  const seen = new Set();
  const issues = [];
  for (const a of acts) {
    const code = a?.general_issue_code || a?.general_issue_code_display || null;
    const display = a?.general_issue_code_display || a?.general_issue_code || null;
    if (display && !seen.has(display)) {
      seen.add(display);
      issues.push({ code, display });
    }
  }
  return issues;
}

/** Unique government entities targeted across a filing's activities. */
export function filingEntities(f = {}) {
  const acts = Array.isArray(f.lobbying_activities) ? f.lobbying_activities : [];
  const seen = new Set();
  const out = [];
  for (const a of acts) {
    for (const e of Array.isArray(a?.government_entities) ? a.government_entities : []) {
      const name = e?.name || e?.government_entity || null;
      if (name && !seen.has(name)) {
        seen.add(name);
        out.push(name);
      }
    }
  }
  return out;
}

/** Named lobbyists across a filing's activities, with revolving-door flag. */
export function filingLobbyists(f = {}) {
  const acts = Array.isArray(f.lobbying_activities) ? f.lobbying_activities : [];
  const byId = new Map();
  for (const a of acts) {
    for (const l of Array.isArray(a?.lobbyists) ? a.lobbyists : []) {
      const lob = l?.lobbyist || l || {};
      const id = lob.id || `${lob.first_name || ''}-${lob.last_name || ''}`;
      if (byId.has(id)) continue;
      const name = [lob.first_name, lob.middle_name, lob.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      // LDA exposes covered_position on activities: prior gov role = revolving door
      const coveredPosition = l?.covered_position || lob.covered_position || null;
      byId.set(id, {
        id: lob.id || null,
        name: name || null,
        coveredPosition: coveredPosition || null,
        revolvingDoor: !!coveredPosition,
      });
    }
  }
  return [...byId.values()];
}

/** Full normalized filing row for the list/table. */
export function normalizeFiling(f = {}) {
  const issues = filingIssues(f);
  const entities = filingEntities(f);
  const lobbyists = filingLobbyists(f);
  return {
    uuid: f.filing_uuid || null,
    year: f.filing_year != null ? Number(f.filing_year) : null,
    period: f.filing_period_display || f.filing_period || null,
    posted: f.dt_posted || null,
    amount: filingAmount(f),
    type: f.filing_type_display || f.filing_type || null,
    typeCode: f.filing_type || null,
    isRegistration: isRegistrationFiling(f),
    registrant: f.registrant?.name || null,
    registrantId: f.registrant?.id || null,
    client: f.client?.name || null,
    clientId: f.client?.id || null,
    clientDescription: f.client?.general_description || null,
    issues,
    entities,
    lobbyists,
    lobbyistCount: lobbyists.length,
    url: f.filing_document_url || null,
  };
}

/** Detailed normalized filing for the drill-down modal. */
export function normalizeFilingDetail(f = {}) {
  const base = normalizeFiling(f);
  return {
    ...base,
    activities: (Array.isArray(f.lobbying_activities) ? f.lobbying_activities : []).map((a) => ({
      issueCode: a?.general_issue_code || null,
      issueDisplay: a?.general_issue_code_display || a?.general_issue_code || null,
      description: a?.description || null,
      entities: (Array.isArray(a?.government_entities) ? a.government_entities : [])
        .map((e) => e?.name || e?.government_entity)
        .filter(Boolean),
    })),
  };
}

/* ── Entity-name canonicalization (for AGGREGATES only) ──────────────────────
   The same corporation files under many spelling variants ("General Motors",
   "General Motors Company", "General Motors, LLC", "GENERAL MOTORS CO."). Raw
   grouping fragments its spend across rows so no single variant reaches the
   top 25. canonicalEntity() collapses those variants to one grouping key so
   top-spenders / distinct counts consolidate correctly (matching Quiver-style
   boards). ONLY aggregates use this — individual filings keep their exact filed
   name in the recent-disclosures table. */

const CORP_SUFFIX_RE =
  /\b(INCORPORATED|INC|CORPORATION|CORP|COMPANY|CO|LLC|LLP|LP|LTD|PLC|HOLDINGS|GROUP|THE|USA|US|NA|N A)\b/g;

/**
 * Curated alias map for cross-name merges that suffix-stripping alone can't
 * catch (rebrands, subsidiaries, punctuation variants of the SAME filer). Keyed
 * by the suffix-stripped UPPERCASE form → { key, display }. Small and
 * conservative on purpose — a false merge is worse than a missed one, so this
 * only lists cases where the entities are unambiguously the same filer.
 * Extend as new high-volume filers surface. (~20 top corporate lobbyists.)
 */
const ENTITY_ALIASES = {
  'META PLATFORMS': { key: 'META', display: 'Meta' },
  META: { key: 'META', display: 'Meta' },
  FACEBOOK: { key: 'META', display: 'Meta' },
  ALPHABET: { key: 'GOOGLE', display: 'Google (Alphabet)' },
  GOOGLE: { key: 'GOOGLE', display: 'Google (Alphabet)' },
  'AMAZON COM': { key: 'AMAZON', display: 'Amazon' },
  'AMAZON WEB SERVICES': { key: 'AMAZON', display: 'Amazon' },
  AMAZON: { key: 'AMAZON', display: 'Amazon' },
  'EXXON MOBIL': { key: 'EXXONMOBIL', display: 'ExxonMobil' },
  EXXONMOBIL: { key: 'EXXONMOBIL', display: 'ExxonMobil' },
  'JPMORGAN CHASE': { key: 'JPMORGAN CHASE', display: 'JPMorgan Chase' },
  'JP MORGAN CHASE': { key: 'JPMORGAN CHASE', display: 'JPMorgan Chase' },
  'GENERAL MOTORS': { key: 'GENERAL MOTORS', display: 'General Motors' },
  'FORD MOTOR': { key: 'FORD', display: 'Ford Motor' },
  BOEING: { key: 'BOEING', display: 'Boeing' },
  'LOCKHEED MARTIN': { key: 'LOCKHEED MARTIN', display: 'Lockheed Martin' },
  'AT&T': { key: 'AT&T', display: 'AT&T' },
  'CHARTER COMMUNICATIONS': { key: 'CHARTER', display: 'Charter Communications' },
  'COMCAST NBCUNIVERSAL': { key: 'COMCAST', display: 'Comcast' },
  COMCAST: { key: 'COMCAST', display: 'Comcast' },
  'PHARMACEUTICAL RESEARCH & MANUFACTURERS OF AMERICA': {
    key: 'PHRMA',
    display: 'PhRMA',
  },
};

const SMALL_WORDS = new Set(['of', 'and', 'the', 'for', 'to', 'in', 'on', 'a', 'an']);

/** Readable Title Case for a display label (avoids ALL-CAPS in the UI). */
export function titleCase(str) {
  const s = String(str || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  return s
    .split(' ')
    .map((word, i) => {
      const lower = word.toLowerCase();
      // keep short all-caps tokens (acronyms/tickers) uppercase: GM, IBM, AT&T
      if (/^[A-Z0-9&.]{2,4}$/.test(word) && word === word.toUpperCase()) return word;
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * Canonicalize a lobbying entity name for AGGREGATION.
 * @param {string} raw client_name or registrant_name from a filing
 * @returns {{key:string, display:string}} key = grouping key; display = clean label
 */
export function canonicalEntity(raw) {
  if (!raw) return { key: '', display: '' };
  const s = String(raw).replace(/\s+/g, ' ').trim();
  const cleaned = s
    .toUpperCase()
    .replace(/[.,]/g, ' ')
    .replace(CORP_SUFFIX_RE, ' ')
    // drop a dangling conjunction left by suffix stripping ("… & Co" → "… &" → "…"),
    // but keep glued ampersands inside a token (AT&T) untouched
    .replace(/\s+(AND|&)\s*$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const alias = ENTITY_ALIASES[cleaned];
  if (alias) return { key: alias.key, display: alias.display };
  // no alias → group on the suffix-stripped key, show a cleaned title-cased label
  return { key: cleaned || s.toUpperCase(), display: titleCase(s) };
}

/** LDA constant list → [{ value, label }] for a filter dropdown. */
export function normalizeConstants(results = [], { valueKey = 'value', labelKey = 'name' } = {}) {
  return (Array.isArray(results) ? results : [])
    .map((r) => {
      if (typeof r === 'string') return { value: r, label: r };
      return {
        value: r[valueKey] ?? r.id ?? r.code ?? null,
        label: r[labelKey] ?? r.name ?? r.value ?? null,
      };
    })
    .filter((r) => r.value != null && r.label != null);
}
