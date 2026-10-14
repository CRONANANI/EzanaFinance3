/**
 * Server reads for the Sanctions & Trade Policy page (sanctions_entries, the
 * OFAC SDN list loaded daily by /api/cron/ingest-ofac). Service-role reads of
 * public-domain data; only the ingest writes. Every function degrades to an
 * honest empty result on error so the page renders its empty states rather
 * than failing.
 *
 *   getSanctionsSummary()  whole-list aggregates (types, countries, programs,
 *                          targeted jurisdictions, themes), cached 6h and
 *                          revalidated by the ingest via the 'sanctions' tag
 *   getSanctionsPage()     one filtered, paginated page of listings
 *   getNewestAdditions()   entries added since the first (baseline) load
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { programMeta } from './programs';

const CHUNK = 1000;
const TYPES = ['entity', 'individual', 'vessel', 'aircraft'];
const EMPTY_SUMMARY = {
  active: 0,
  byType: { entity: 0, individual: 0, vessel: 0, aircraft: 0 },
  baseline: null,
  synced: null,
  addedSince: 0,
  noCountry: 0,
  countries: [],
  programs: [],
  targets: [],
  themes: [],
};

async function fetchAllActive(admin) {
  const head = await admin
    .from('sanctions_entries')
    .select('ent_num', { count: 'exact', head: true })
    .is('removed_on', null);
  if (head.error) throw new Error(head.error.message);
  const total = head.count || 0;
  const pages = Math.ceil(total / CHUNK);
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      admin
        .from('sanctions_entries')
        .select('ent_num, entry_type, programs, countries, first_seen, synced_at')
        .is('removed_on', null)
        .order('ent_num', { ascending: true })
        .range(i * CHUNK, i * CHUNK + CHUNK - 1),
    ),
  );
  const rows = [];
  for (const r of results) {
    if (r.error) throw new Error(r.error.message);
    rows.push(...(r.data || []));
  }
  return rows;
}

const bump = (map, key, type) => {
  let rec = map.get(key);
  if (!rec) {
    rec = { name: key, total: 0, entity: 0, individual: 0, vessel: 0, aircraft: 0 };
    map.set(key, rec);
  }
  rec.total += 1;
  if (type in rec) rec[type] += 1;
  return rec;
};
const byTotal = (a, b) => b.total - a.total || a.name.localeCompare(b.name);

/** Pure: aggregate active rows into the page's summary. */
function summarize(rows) {
  if (!rows.length) return EMPTY_SUMMARY;
  const byType = { entity: 0, individual: 0, vessel: 0, aircraft: 0 };
  const countries = new Map();
  const programs = new Map();
  const targets = new Map();
  const themes = new Map();
  let baseline = null;
  let synced = null;
  let noCountry = 0;

  for (const r of rows) {
    if (!baseline || r.first_seen < baseline) baseline = r.first_seen;
    if (!synced || r.synced_at > synced) synced = r.synced_at;
  }

  let addedSince = 0;
  for (const r of rows) {
    const type = TYPES.includes(r.entry_type) ? r.entry_type : 'entity';
    byType[type] += 1;
    if (r.first_seen > baseline) addedSince += 1;

    const cs = r.countries || [];
    if (!cs.length) noCountry += 1;
    for (const c of new Set(cs)) bump(countries, c, type);

    const ps = r.programs || [];
    const seenTarget = new Set();
    const seenTheme = new Set();
    for (const p of new Set(ps)) {
      bump(programs, p, type);
      const meta = programMeta(p);
      if (meta.target && !seenTarget.has(meta.target)) {
        seenTarget.add(meta.target);
        const t = bump(targets, meta.target, type);
        t.codes = t.codes || new Map();
      }
      if (meta.target) {
        const t = targets.get(meta.target);
        t.codes.set(p, (t.codes.get(p) || 0) + 1);
      }
      if (!seenTheme.has(meta.theme)) {
        seenTheme.add(meta.theme);
        bump(themes, meta.theme, type);
      }
    }
  }

  const countryList = [...countries.values()].sort(byTotal);
  const basedIn = new Map(countryList.map((c) => [c.name, c.total]));
  const ALIAS = { 'North Korea': 'Korea, North', 'DR Congo': 'Congo, Democratic Republic of the' };

  return {
    active: rows.length,
    byType,
    baseline,
    synced,
    addedSince,
    noCountry,
    countries: countryList,
    programs: [...programs.values()].sort(byTotal).map((p) => ({ ...p, code: p.name })),
    targets: [...targets.values()].sort(byTotal).map((t) => ({
      ...t,
      codes: [...t.codes.entries()].sort((a, b) => b[1] - a[1]).map(([code]) => code),
      basedThere: basedIn.get(ALIAS[t.name] || t.name) || 0,
    })),
    themes: [...themes.values()].sort(byTotal).map((t) => ({ ...t, key: t.name })),
  };
}

async function loadSummary() {
  if (!isServerSupabaseConfigured()) return EMPTY_SUMMARY;
  try {
    return summarize(await fetchAllActive(getAdminClient()));
  } catch (e) {
    console.error('[sanctions] summary:', e?.message || e);
    return EMPTY_SUMMARY;
  }
}

/* The aggregate is ~30KB; the raw rows are never cached (they would exceed
   the data-cache entry limit). The ingest revalidates the 'sanctions' tag. */
export const getSanctionsSummary = unstable_cache(loadSummary, ['sanctions-summary-v1'], {
  revalidate: 21600,
  tags: ['sanctions'],
});

/* ── listings ─────────────────────────────────────────────────────────── */

const PAGE_SIZE = 25;
const MAX_PAGE = 800;
const COUNTRY_RE = /^[\p{L}\p{M} ,.:'()-]{2,64}$/u;
const PROGRAM_RE = /^[A-Z0-9 -]{2,32}$/;

/** Validate raw query params into a safe filter, or { error }. Pure. */
export function parseListingParams(sp) {
  const get = (k) => (typeof sp.get === 'function' ? sp.get(k) : sp[k]) || '';
  const type = get('type');
  const country = get('country').trim();
  const program = get('program').trim();
  const q = get('q').trim().slice(0, 80);
  const page = Number.parseInt(get('page') || '1', 10);
  if (type && !TYPES.includes(type)) return { error: 'Unknown entry type.' };
  if (country && !COUNTRY_RE.test(country)) return { error: 'Unknown country.' };
  if (program && !PROGRAM_RE.test(program)) return { error: 'Unknown program.' };
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) return { error: 'Bad page.' };
  return { type, country, program, q, page };
}

/* ILIKE wildcards in the user's text are matched literally. */
const likeEscape = (s) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

export async function getSanctionsPage({ type, country, program, q, page = 1 } = {}) {
  const empty = { rows: [], total: 0, page, pageSize: PAGE_SIZE };
  if (!isServerSupabaseConfigured()) return empty;
  try {
    let query = getAdminClient()
      .from('sanctions_entries')
      .select('ent_num, name, entry_type, programs, countries, first_seen', { count: 'exact' })
      .is('removed_on', null);
    if (type) query = query.eq('entry_type', type);
    /* supabase-js joins array values unquoted, so "Korea, North" would split
       at the comma. Quote the one-element array literal ourselves; the
       validators above already exclude " and \. */
    if (country) query = query.filter('countries', 'cs', `{"${country}"}`);
    if (program) query = query.filter('programs', 'cs', `{"${program}"}`);
    if (q) query = query.ilike('name', `%${likeEscape(q)}%`);
    const from = (page - 1) * PAGE_SIZE;
    const { data, error, count } = await query
      .order('first_seen', { ascending: false })
      .order('name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    return {
      rows: (data || []).map((e) => ({
        id: e.ent_num,
        name: e.name,
        type: e.entry_type,
        programs: e.programs || [],
        countries: e.countries || [],
        firstSeen: e.first_seen,
      })),
      total: count || 0,
      page,
      pageSize: PAGE_SIZE,
    };
  } catch (e) {
    console.error('[sanctions] page:', e?.message || e);
    return { ...empty, error: 'The sanctions list could not be loaded.' };
  }
}

/** Entries listed after the baseline load, newest first. */
export async function getNewestAdditions(baseline, limit = 30) {
  if (!baseline || !isServerSupabaseConfigured()) return [];
  try {
    const { data, error } = await getAdminClient()
      .from('sanctions_entries')
      .select('ent_num, name, entry_type, programs, countries, first_seen')
      .is('removed_on', null)
      .gt('first_seen', baseline)
      .order('first_seen', { ascending: false })
      .order('ent_num', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data || []).map((e) => ({
      id: e.ent_num,
      name: e.name,
      type: e.entry_type,
      programs: e.programs || [],
      countries: e.countries || [],
      firstSeen: e.first_seen,
    }));
  } catch (e) {
    console.error('[sanctions] newest:', e?.message || e);
    return [];
  }
}
