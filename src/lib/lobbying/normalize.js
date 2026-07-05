/**
 * LDA API response → normalized shapes for the routes, cache, and UI. Field
 * names follow the LDA filing schema. `amount` collapses income (registrant
 * reporting client income) and expenses (client reporting in-house spend) into
 * one displayable number — LDA populates one or the other per filing. Missing
 * data yields nulls/empties, never fabricated values.
 */

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
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
