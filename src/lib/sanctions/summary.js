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
import { currencyFor } from './fx';

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
  programCountries: {},
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
  /* Program -> address country -> listings, for the map's program view. */
  const programCountries = {};
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
      if (cs.length) {
        const pc = programCountries[p] || (programCountries[p] = {});
        for (const c of new Set(cs)) pc[c] = (pc[c] || 0) + 1;
      }
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
    programCountries,
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
export const getSanctionsSummary = unstable_cache(loadSummary, ['sanctions-summary-v2'], {
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

/* ── trend vs currency ─────────────────────────────────────────────────── */

const monthKey = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
function lastMonths(n, now = new Date()) {
  const out = [];
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    out.push(monthKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1))));
  }
  return out;
}

/**
 * Pure: the countries being sanctioned hardest lately, each beside its
 * currency against the dollar.
 *   trend  rows { country, month: 'YYYY-MM-01', added } (sanctions_country_trend)
 *   fx     rows { currency, month, usd_rate } (fx_monthly)
 * Steepness compares the last 12 months' new listings with the 12 before.
 * A country needs MIN_RECENT recent listings to rank, so one designation in a
 * quiet year does not read as a surge. FX is the currency's value in dollars
 * indexed to 100 at the window's first month: below 100 means it weakened.
 */
const MIN_RECENT = 10;
export function computeTrends(trend, fx, { now = new Date(), limit = 6 } = {}) {
  const months = lastMonths(24, now);
  const byCountry = new Map();
  for (const r of trend || []) {
    const m = String(r.month).slice(0, 10);
    if (!months.includes(m)) continue;
    const rec = byCountry.get(r.country) || new Map();
    rec.set(m, (rec.get(m) || 0) + Number(r.added || 0));
    byCountry.set(r.country, rec);
  }
  const fxBy = new Map();
  for (const r of fx || []) {
    const m = String(r.month).slice(0, 10);
    const rec = fxBy.get(r.currency) || new Map();
    rec.set(m, Number(r.usd_rate));
    fxBy.set(r.currency, rec);
  }
  const rows = [];
  for (const [country, rec] of byCountry) {
    const series = months.map((m) => rec.get(m) || 0);
    const recent = series.slice(12).reduce((a, b) => a + b, 0);
    const prior = series.slice(0, 12).reduce((a, b) => a + b, 0);
    if (recent < MIN_RECENT) continue;
    const cur = currencyFor(country);
    let fxIndex = null;
    let fxChange = null;
    if (cur?.regime === 'float' && fxBy.has(cur.ccy)) {
      const rates = fxBy.get(cur.ccy);
      const vals = months.map((m) => (rates.get(m) > 0 ? 1 / rates.get(m) : null));
      const first = vals.find((v) => v != null);
      if (first) {
        fxIndex = vals.map((v) => (v == null ? null : Math.round((v / first) * 1000) / 10));
        const a = vals[11];
        const b = vals[23] ?? [...vals].reverse().find((v) => v != null);
        if (a && b) fxChange = Math.round((b / a - 1) * 1000) / 10;
      }
    }
    rows.push({
      country,
      currency: cur?.ccy || null,
      regime: cur?.regime || null,
      months,
      added: series,
      recent,
      prior,
      /* +100% when listings doubled; a country new to the list counts as
         the size of its recent wave. */
      change: prior ? Math.round(((recent - prior) / prior) * 100) : null,
      fxIndex,
      fxChange,
    });
  }
  /* Steepest first: the biggest rise in new listings, then the biggest wave. */
  rows.sort((a, b) => b.recent - b.prior - (a.recent - a.prior) || b.recent - a.recent);
  return rows.slice(0, limit);
}

async function loadTrends() {
  if (!isServerSupabaseConfigured()) return { rows: [], ready: false };
  try {
    const admin = getAdminClient();
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - 25, 1);
    const [trend, fx] = await Promise.all([
      admin.rpc('sanctions_country_trend', { p_months: 24 }),
      admin
        .from('fx_monthly')
        .select('currency, month, usd_rate')
        .gte('month', since.toISOString().slice(0, 10))
        .limit(5000),
    ]);
    if (trend.error) throw new Error(trend.error.message);
    const rows = computeTrends(trend.data || [], fx.error ? [] : fx.data || []);
    return {
      rows,
      ready: (trend.data || []).length > 0,
      fx: !fx.error && (fx.data || []).length > 0,
    };
  } catch (e) {
    console.error('[sanctions] trends:', e?.message || e);
    return { rows: [], ready: false };
  }
}

export const getSanctionsTrends = unstable_cache(loadTrends, ['sanctions-trends-v1'], {
  revalidate: 21600,
  tags: ['sanctions'],
});

/* ── news pulses ───────────────────────────────────────────────────────── */

/**
 * Countries where sanctions news broke in the past 30 days, from
 * sanctions_news: the story count and the newest headline per country. A
 * country pulses with two or more stories; when fewer than three countries
 * clear that bar, single-story countries pulse too, so a quiet month still
 * shows where the news is.
 */
async function loadNewsPulses() {
  if (!isServerSupabaseConfigured()) return [];
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await getAdminClient()
      .from('sanctions_news')
      .select('title, url, source, published_at, countries')
      .gte('published_at', since)
      .order('published_at', { ascending: false })
      .limit(400);
    if (error) throw new Error(error.message);
    const by = new Map();
    for (const r of data || []) {
      for (const c of r.countries || []) {
        const rec = by.get(c) || {
          country: c,
          count: 0,
          title: r.title,
          url: r.url,
          source: r.source,
          publishedAt: r.published_at,
        };
        rec.count += 1;
        by.set(c, rec);
      }
    }
    const all = [...by.values()].sort((a, b) => b.count - a.count);
    const major = all.filter((r) => r.count >= 2);
    return (major.length >= 3 ? major : all).slice(0, 24);
  } catch (e) {
    console.error('[sanctions] news pulses:', e?.message || e);
    return [];
  }
}

export const getSanctionsNewsPulses = unstable_cache(loadNewsPulses, ['sanctions-news-v1'], {
  revalidate: 3600,
  tags: ['sanctions'],
});
