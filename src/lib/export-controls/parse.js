/**
 * US export controls (Nov 2026, deep research).
 *
 * Export controls are a different regime from sanctions: the Commerce
 * Department's Bureau of Industry and Security (BIS) keeps the Entity List,
 * the Military End User list and the Unverified List, and publishes its rules
 * (advanced computing and semiconductor controls among them) in the Federal
 * Register. Two public sources:
 *   - the Consolidated Screening List (trade.gov), filtered to the BIS lists;
 *   - the Federal Register API, documents by the Industry and Security Bureau.
 *
 * Pure parsers and taggers. Unit-tested in scripts/check-sonar-step3.mjs.
 */
import Papa from 'papaparse';

export const BIS_LIST_RE = /entity list|military end user|unverified list/i;

export const RULE_TOPICS = [
  [
    'advanced_computing',
    /\b(advanced computing|semiconductor|integrated circuits?|supercomputer|artificial intelligence|AI model|model weights|GPUs?|data center)\b/i,
  ],
  ['entity_list', /\bEntity List\b/i],
  ['china', /\b(China|Chinese|PRC|Hong Kong|Macau)\b/i],
  ['russia', /\b(Russia|Russian|Belarus)\b/i],
];

const listOf = (source) => {
  const s = String(source || '');
  if (/entity list/i.test(s)) return 'entity_list';
  if (/military end user/i.test(s)) return 'military_end_user';
  if (/unverified/i.test(s)) return 'unverified_list';
  return null;
};

function countriesOf(addresses) {
  if (Array.isArray(addresses)) {
    return [
      ...new Set(
        addresses
          .map((a) =>
            String(a?.country || '')
              .trim()
              .toUpperCase(),
          )
          .filter((c) => /^[A-Z]{2}$/.test(c)),
      ),
    ];
  }
  /* CSV: addresses are "; "-joined, each ending in its country code. */
  return [
    ...new Set(
      String(addresses || '')
        .split(';')
        .map((a) => (a.trim().match(/,\s*([A-Z]{2})$/) || [])[1])
        .filter(Boolean),
    ),
  ];
}

const dateOf = (v) => {
  const m = String(v || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

/**
 * BIS entries from a Consolidated Screening List download (JSON: an array or
 * { results: [] }; or CSV text). Other agencies' lists are left out.
 */
export function parseCsl(payload) {
  let rows = [];
  if (typeof payload === 'string') {
    rows = Papa.parse(payload, { header: true, skipEmptyLines: true }).data || [];
  } else if (Array.isArray(payload)) {
    rows = payload;
  } else if (Array.isArray(payload?.results)) {
    rows = payload.results;
  }
  const out = [];
  for (const r of rows) {
    const list = listOf(r.source);
    if (!list || !r.name) continue;
    const alt = Array.isArray(r.alt_names)
      ? r.alt_names
      : String(r.alt_names || '')
          .split(';')
          .map((x) => x.trim())
          .filter(Boolean);
    const id = String(
      r.id || r._id || r.entity_number || `${list}:${r.name}:${r.start_date || ''}`,
    );
    out.push({
      id,
      list,
      name: String(r.name).trim().slice(0, 500),
      alt_names: alt.slice(0, 30),
      countries: countriesOf(r.addresses),
      federal_register_notice: r.federal_register_notice || null,
      license_requirement: r.license_requirement || null,
      start_date: dateOf(r.start_date),
      source_url: r.source_list_url || r.source_information_url || null,
    });
  }
  return out;
}

/** Topics a BIS rule touches, from its title and abstract. */
export function tagRule(text) {
  return RULE_TOPICS.filter(([, re]) => re.test(String(text || ''))).map(([id]) => id);
}

/** BIS documents from a Federal Register API page. */
export function parseFederalRegister(payload) {
  return (Array.isArray(payload?.results) ? payload.results : [])
    .filter((d) => d?.document_number && d?.title)
    .map((d) => ({
      document_number: String(d.document_number),
      title: String(d.title).slice(0, 800),
      abstract: d.abstract ? String(d.abstract).slice(0, 4000) : null,
      type: d.type || null,
      publication_date: dateOf(d.publication_date),
      effective_on: dateOf(d.effective_on),
      html_url: d.html_url || null,
      topics: tagRule(`${d.title} ${d.abstract || ''}`),
    }));
}

/** The Federal Register API URL for BIS documents, newest first. */
export function federalRegisterUrl({ page = 1, since = null } = {}) {
  const p = new URLSearchParams();
  p.append('conditions[agencies][]', 'industry-and-security-bureau');
  if (since) p.append('conditions[publication_date][gte]', since);
  p.append('order', 'newest');
  p.append('per_page', '100');
  p.append('page', String(page));
  for (const f of [
    'document_number',
    'title',
    'abstract',
    'type',
    'publication_date',
    'effective_on',
    'html_url',
  ])
    p.append('fields[]', f);
  return `https://www.federalregister.gov/api/v1/documents.json?${p.toString()}`;
}
