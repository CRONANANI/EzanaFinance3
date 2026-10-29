/**
 * Ezana Sonar — US Sanctions source adapter (sonar-all-datasets spec, Step 3).
 *
 * Couples the live /datasets/sanctions page (OFAC SDN listings in
 * `sanctions_entries`) to Sonar. It REUSES the page's own vetted fetcher,
 * searchSanctions from '@/lib/sanctions/research' (the alias-aware
 * sanctions_search RPC, service-role, RLS already set on the table), so there
 * is no second query path and no second Supabase client.
 *
 * Matching: the resolver gives ISO-2 countries and themes; this adapter maps
 * each foreign country to the OFAC country name and its program codes, and
 * also searches any organization / person names by the alias-aware name
 * search. Recent designations rank higher. Findings only, never advice.
 */
import { searchSanctions } from '@/lib/sanctions/research';

const SLUG = 'sanctions';
const PAGE_ROUTE = '/datasets/sanctions';

/** ISO-2 -> the country name OFAC uses in sanctions_entries.countries. */
export const ISO_TO_OFAC_COUNTRY = {
  IR: 'Iran',
  RU: 'Russia',
  CN: 'China',
  IL: 'Israel',
  SA: 'Saudi Arabia',
  VE: 'Venezuela',
  KP: 'North Korea',
  SY: 'Syria',
  CU: 'Cuba',
  UA: 'Ukraine',
  VN: 'Vietnam',
};

/** ISO-2 -> representative OFAC program codes (informational / meta only). */
export const ISO_TO_PROGRAMS = {
  IR: ['IRAN', 'IRGC', 'IFSR', 'SDGT', 'IRAN-EO13846', 'IRAN-HR', 'CAATSA - IRAN'],
  RU: ['RUSSIA-EO14024', 'UKRAINE-EO13660', 'UKRAINE-EO13662'],
  VE: ['VENEZUELA', 'VENEZUELA-EO13850'],
  KP: ['DPRK', 'DPRK2', 'DPRK3'],
  SY: ['SYRIA'],
  CU: ['CUBA'],
};

const MAX_COUNTRIES = 3;
const MAX_NAMES = 3;

/** Recency in 0..1 over a two-year window; newer designations score higher. */
function recency(date) {
  if (!date) return 0;
  const t = new Date(date).getTime();
  if (!Number.isFinite(t)) return 0;
  const ageDays = (Date.now() - t) / 86_400_000;
  return Math.max(0, 1 - ageDays / 730);
}

/**
 * Map alias-aware sanctions rows (searchSanctions shape) to Sonar findings.
 * Pure, so it is unit-testable from a fixture with no database.
 * @param {Array} rows   rows from searchSanctions (mapRow shape)
 * @param {{ citeCountry?: string|null, citeQuery?: string|null }} [cite]
 */
export function rowsToFindings(rows, cite = {}) {
  const href = cite.citeCountry
    ? `${PAGE_ROUTE}?country=${encodeURIComponent(cite.citeCountry)}`
    : cite.citeQuery
      ? `${PAGE_ROUTE}?q=${encodeURIComponent(cite.citeQuery)}`
      : PAGE_ROUTE;
  return (rows || []).map((r) => {
    const programs = Array.isArray(r.programs) ? r.programs.filter(Boolean) : [];
    const countries = Array.isArray(r.countries) ? r.countries.filter(Boolean) : [];
    const date = r.listedOn || r.firstSeen || null;
    const type = r.type || 'Entity';
    const where = countries.length ? ` linked to ${countries.slice(0, 3).join(', ')}` : '';
    const when = date ? ` on the list since ${date}` : ' on the US sanctions list';
    return {
      sourceSlug: SLUG,
      title: `${r.name} listed${programs.length ? ` under ${programs.slice(0, 4).join(', ')}` : ''}`,
      summary: `${type}${where},${when}.`,
      date,
      relevance: Number((0.5 + 0.5 * recency(date)).toFixed(3)),
      citation: { label: 'US Sanctions', href },
      meta: {
        entNum: r.id ?? null,
        programs,
        entityType: r.type || null,
        countries,
        matchedAlias: r.matchedAlias || null,
      },
    };
  });
}

/** Cheap pre-filter: a foreign country, the sanctions theme, or a named entity. */
export function isRelevant(q) {
  const foreign = (q.countries || []).filter((c) => c !== 'US');
  return (
    foreign.length > 0 ||
    (q.themes || []).includes('sanctions') ||
    (q.organizations || []).length > 0 ||
    (q.people || []).length > 0
  );
}

/**
 * Search OFAC listings relevant to the resolved query. Reuses searchSanctions.
 * `ctx.searchFn` can be injected in tests; defaults to the real fetcher.
 * @param {import('./types').SonarQuery} q
 * @param {{ limit?: number, searchFn?: Function }} [ctx]
 * @returns {Promise<import('./types').SonarFinding[]>}
 */
export async function search(q, ctx = {}) {
  const limit = ctx.limit || 6;
  const searchFn = ctx.searchFn || searchSanctions;
  const from = q.window?.from || null;
  const foreign = (q.countries || []).filter((c) => c !== 'US').slice(0, MAX_COUNTRIES);
  const names = [...(q.organizations || []), ...(q.people || [])].slice(0, MAX_NAMES);

  const calls = [];
  for (const iso of foreign) {
    const name = ISO_TO_OFAC_COUNTRY[iso];
    if (name) calls.push({ params: { country: name, from, page: 1 }, cite: { citeCountry: name } });
  }
  for (const n of names) {
    if (n) calls.push({ params: { q: n, from, page: 1 }, cite: { citeQuery: n } });
  }
  if (!calls.length) return [];

  const settled = await Promise.allSettled(
    calls.map(async ({ params, cite }) => {
      const res = await searchFn(params);
      return rowsToFindings(res?.rows || [], cite);
    }),
  );

  const byId = new Map();
  for (const s of settled) {
    if (s.status !== 'fulfilled') continue;
    for (const f of s.value) {
      const key = f.meta?.entNum != null ? `e:${f.meta.entNum}` : `t:${f.title}`;
      if (!byId.has(key)) byId.set(key, f);
    }
  }
  return [...byId.values()]
    .sort(
      (a, b) =>
        b.relevance - a.relevance || String(b.date || '').localeCompare(String(a.date || '')),
    )
    .slice(0, limit);
}

/** @type {import('./types').SonarSourceAdapter} */
const sanctionsAdapter = {
  slug: SLUG,
  label: 'US Sanctions',
  dimension: 'Global Empire Lighthouse',
  minTier: 'free',
  timeoutMs: 4000,
  isRelevant,
  search,
};

export default sanctionsAdapter;
