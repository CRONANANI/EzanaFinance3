/**
 * Server reads for the Sanctions & Trade Policy page's research features:
 * KPIs, the activity timeline, jurisdiction activity, the alias-aware
 * listings search, one record's full detail, the official actions and press
 * feeds, coverage and ingest status. Service-role reads through SQL functions
 * (supabase/migrations/20261015120100_sanctions_activity_fns.sql).
 *
 * Every function degrades to an explicit "unavailable" result (null or
 * { ready: false }) when its tables or functions are not there yet, so the
 * page shows an honest unavailable state instead of zeros.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { SOURCES } from './insights';

const db = () => (isServerSupabaseConfigured() ? getAdminClient() : null);

/* PostgREST / Postgres codes for "this function or table does not exist". */
const MISSING = new Set(['PGRST202', 'PGRST205', '42883', '42P01']);
const isMissing = (error) =>
  Boolean(
    error &&
    (MISSING.has(error.code) || /does not exist|Could not find/i.test(error.message || '')),
  );

function logErr(where, error) {
  if (!isMissing(error)) console.error(`[sanctions] ${where}:`, error?.message || error);
}

/* ── KPIs ──────────────────────────────────────────────────────────────── */

async function loadKpis() {
  const c = db();
  if (!c) return null;
  const { data, error } = await c.rpc('sanctions_kpis');
  if (error) {
    logErr('kpis', error);
    return null;
  }
  return data;
}
export const getSanctionsKpis = unstable_cache(loadKpis, ['sanctions-kpis-v1'], {
  revalidate: 3600,
  tags: ['sanctions'],
});

/* ── activity ──────────────────────────────────────────────────────────── */

const TYPES = new Set(['entity', 'individual', 'vessel', 'aircraft']);
const COUNTRY_RE = /^[\p{L}\p{M} ,.:'()-]{2,64}$/u;
const PROGRAM_RE = /^[A-Z0-9 -]{2,32}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate activity params. Pure. */
export function parseActivityParams(sp) {
  const get = (k) => (typeof sp.get === 'function' ? sp.get(k) : sp[k]) || '';
  const months = Number.parseInt(get('months') || '24', 10);
  const out = {
    months: [0, 6, 12, 24].includes(months) ? months : 24,
    country: get('country').trim() || null,
    program: get('program').trim() || null,
    type: get('type') || null,
    dim: get('dim') || null,
    from: get('from') || null,
    to: get('to') || null,
  };
  if (out.type && !TYPES.has(out.type)) return { error: 'Unknown entry type.' };
  if (out.country && !COUNTRY_RE.test(out.country)) return { error: 'Unknown country.' };
  if (out.program && !PROGRAM_RE.test(out.program)) return { error: 'Unknown program.' };
  if (out.dim && !['program', 'country', 'type'].includes(out.dim))
    return { error: 'Unknown breakdown.' };
  if ((out.from && !DATE_RE.test(out.from)) || (out.to && !DATE_RE.test(out.to))) {
    return { error: 'Bad date.' };
  }
  return out;
}

async function loadActivity(months, country, program, type) {
  const c = db();
  if (!c) return { ready: false, rows: [] };
  const { data, error } = await c.rpc('sanctions_activity', {
    p_months: months,
    p_country: country,
    p_program: program,
    p_type: type,
  });
  if (error) {
    logErr('activity', error);
    return { ready: false, rows: [] };
  }
  const rows = (data || []).map((r) => ({
    month: String(r.month).slice(0, 10),
    listings: r.listings,
  }));
  return { ready: rows.length > 0, rows };
}
export const getSanctionsActivity = unstable_cache(loadActivity, ['sanctions-activity-v1'], {
  revalidate: 3600,
  tags: ['sanctions'],
});

async function loadBreakdown(dim, from, to, country, program, type) {
  const c = db();
  if (!c) return null;
  const { data, error } = await c.rpc('sanctions_activity_breakdown', {
    p_dim: dim,
    p_from: from,
    p_to: to,
    p_country: country,
    p_program: program,
    p_type: type,
    p_limit: 8,
  });
  if (error) {
    logErr('breakdown', error);
    return null;
  }
  return data || [];
}
export const getSanctionsBreakdown = unstable_cache(loadBreakdown, ['sanctions-breakdown-v1'], {
  revalidate: 3600,
  tags: ['sanctions'],
});

/** targets: { [jurisdiction]: string[] program codes } */
async function loadTargetActivity(targetsJson, days) {
  const c = db();
  if (!c) return null;
  const { data, error } = await c.rpc('sanctions_target_activity', {
    p_targets: JSON.parse(targetsJson),
    p_days: days,
  });
  if (error) {
    logErr('target activity', error);
    return null;
  }
  return Object.fromEntries(
    (data || []).map((r) => [r.target, { recent: r.recent, prior: r.prior }]),
  );
}
const cachedTargetActivity = unstable_cache(loadTargetActivity, ['sanctions-targets-v1'], {
  revalidate: 3600,
  tags: ['sanctions'],
});
export const getTargetActivity = (targets, days = 365) =>
  cachedTargetActivity(JSON.stringify(targets || {}), days);

/* ── listings search ───────────────────────────────────────────────────── */

export const SEARCH_PAGE_SIZE = 25;
export const SEARCH_MAX_PAGE = 800;
export const EXPORT_MAX_ROWS = 5000;

/** Validate listing params. Pure. Unknown keys are ignored. */
export function parseSearchParams(sp) {
  const get = (k) => (typeof sp.get === 'function' ? sp.get(k) : sp[k]) || '';
  const page = Number.parseInt(get('page') || '1', 10);
  const f = {
    type: get('type'),
    country: get('country').trim(),
    program: get('program').trim(),
    q: get('q').trim().slice(0, 80),
    ident: get('ident').trim().slice(0, 64),
    from: get('from'),
    to: get('to'),
    risk: get('risk') === '1',
    linked: get('linked') === '1',
    linkedTo: get('linkedTo').trim().slice(0, 200),
    page,
  };
  if (f.type && !TYPES.has(f.type)) return { error: 'Unknown entry type.' };
  if (f.country && !COUNTRY_RE.test(f.country)) return { error: 'Unknown country.' };
  if (f.program && !PROGRAM_RE.test(f.program)) return { error: 'Unknown program.' };
  if ((f.from && !DATE_RE.test(f.from)) || (f.to && !DATE_RE.test(f.to)))
    return { error: 'Bad date.' };
  if (f.from && f.to && f.from > f.to) return { error: 'The start date is after the end date.' };
  if (!Number.isInteger(page) || page < 1 || page > SEARCH_MAX_PAGE) return { error: 'Bad page.' };
  return f;
}

const mapRow = (r) => ({
  id: r.ent_num,
  name: r.name,
  type: r.entry_type,
  programs: r.programs || [],
  countries: r.countries || [],
  localities: r.localities || [],
  firstSeen: r.first_seen,
  listedOn: r.listed_on || null,
  secondaryRisk: Boolean(r.secondary_risk),
  matchedAlias: r.matched_alias || null,
  ident: r.ident_label ? { label: r.ident_label, value: r.ident_value } : null,
  linkCount: r.link_count || 0,
});

function rpcArgs(f, offset, limit) {
  return {
    p_q: f.q || null,
    p_ident: f.ident || null,
    p_type: f.type || null,
    p_country: f.country || null,
    p_program: f.program || null,
    p_from: f.from || null,
    p_to: f.to || null,
    p_secondary: f.risk ? true : null,
    p_has_links: f.linked ? true : null,
    p_linked_to: f.linkedTo || null,
    p_offset: offset,
    p_limit: limit,
  };
}

/**
 * One page of listings. { rows, total, page, pageSize, research } where
 * research=false means the research functions are not installed and the
 * caller should fall back to the basic listing query.
 */
export async function searchSanctions(f) {
  const page = f.page || 1;
  const empty = { rows: [], total: 0, page, pageSize: SEARCH_PAGE_SIZE, research: true };
  const c = db();
  if (!c) return empty;
  const { data, error } = await c.rpc(
    'sanctions_search',
    rpcArgs(f, (page - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE),
  );
  if (error) {
    if (isMissing(error)) return { ...empty, research: false };
    logErr('search', error);
    return { ...empty, error: 'The sanctions list could not be loaded.' };
  }
  const rows = data || [];
  return { ...empty, rows: rows.map(mapRow), total: rows.length ? Number(rows[0].total) : 0 };
}

/** Up to EXPORT_MAX_ROWS rows for a CSV export, in pages of 500. */
export async function exportSanctions(f) {
  const c = db();
  if (!c) return { rows: [], total: 0, error: 'not configured' };
  const out = [];
  let total = 0;
  for (let offset = 0; offset < EXPORT_MAX_ROWS; offset += 500) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await c.rpc('sanctions_search', rpcArgs(f, offset, 500));
    if (error) return { rows: [], total: 0, error: error.message };
    const rows = data || [];
    if (rows.length) total = Number(rows[0].total);
    out.push(...rows.map(mapRow));
    if (rows.length < 500) break;
  }
  return { rows: out.slice(0, EXPORT_MAX_ROWS), total };
}

/* ── one record ────────────────────────────────────────────────────────── */

export async function getSanctionsRecord(entNum) {
  const c = db();
  if (!c) return null;
  const [entry, date, aliases, ids, rel] = await Promise.all([
    c
      .from('sanctions_entries')
      .select(
        'ent_num, name, entry_type, programs, countries, localities, remarks, remarks_full, secondary_risk, remarks_unparsed, parser_version, parsed_at, first_seen, last_seen, removed_on, synced_at',
      )
      .eq('ent_num', entNum)
      .maybeSingle(),
    c
      .from('sanctions_listing_dates')
      .select('listed_on, synced_at')
      .eq('ent_num', entNum)
      .maybeSingle(),
    c
      .from('sanctions_aliases')
      .select('alt_type, alt_name, alt_remarks, source')
      .eq('ent_num', entNum)
      .order('source')
      .order('alt_name')
      .limit(200),
    c
      .from('sanctions_identifiers')
      .select('kind, label, value, issuer, is_alt, raw')
      .eq('ent_num', entNum)
      .order('kind')
      .limit(200),
    c.rpc('sanctions_relations', { p_ent: entNum }),
  ]);
  if (entry.error) {
    logErr('record', entry.error);
    return null;
  }
  if (!entry.data) return { notFound: true };
  const e = entry.data;
  return {
    id: e.ent_num,
    name: e.name,
    type: e.entry_type,
    programs: e.programs || [],
    countries: e.countries || [],
    localities: e.localities || [],
    remarks: e.remarks_full || e.remarks || null,
    remarksTruncated: !e.remarks_full && (e.remarks || '').length >= 1000,
    secondaryRisk: e.secondary_risk ? e.secondary_risk.split(' | ') : [],
    unparsed: e.remarks_unparsed || null,
    parsed: e.parser_version != null,
    parserVersion: e.parser_version,
    parsedAt: e.parsed_at,
    firstSeen: e.first_seen,
    lastSeen: e.last_seen,
    removedOn: e.removed_on,
    syncedAt: e.synced_at,
    listedOn: date.error ? null : date.data?.listed_on || null,
    aliases: aliases.error ? null : aliases.data || [],
    identifiers: ids.error ? null : ids.data || [],
    links: rel.error ? null : rel.data?.links || [],
    linkedFrom: rel.error ? null : rel.data?.linked_from || [],
  };
}

/* ── feeds ─────────────────────────────────────────────────────────────── */

async function loadActions(limit) {
  const c = db();
  if (!c) return { ready: false, items: [] };
  const { data, error } = await c
    .from('ofac_actions')
    .select('id, action_date, title, url, kinds, program_hints, synced_at')
    .order('action_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (error) {
    logErr('actions', error);
    return { ready: false, items: [] };
  }
  return {
    ready: true,
    items: (data || []).map((a) => ({
      id: a.id,
      date: a.action_date,
      title: a.title,
      url: a.url,
      kinds: a.kinds || [],
      programHints: a.program_hints || [],
    })),
  };
}
export const getOfacActions = unstable_cache(loadActions, ['sanctions-actions-v1'], {
  revalidate: 1800,
  tags: ['sanctions'],
});

async function loadNews(limit) {
  const c = db();
  if (!c) return { ready: false, items: [] };
  const { data, error } = await c
    .from('sanctions_news')
    .select('id, title, url, source, published_at, countries, summary')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) {
    logErr('news', error);
    return { ready: false, items: [] };
  }
  return {
    ready: true,
    items: (data || []).map((n) => ({
      id: n.id,
      title: n.title,
      url: n.url,
      source: n.source,
      date: n.published_at,
      countries: n.countries || [],
      summary: n.summary,
    })),
  };
}
export const getSanctionsNewsFeed = unstable_cache(loadNews, ['sanctions-news-feed-v1'], {
  revalidate: 1800,
  tags: ['sanctions'],
});

/* ── coverage and ingest status ────────────────────────────────────────── */

async function loadCoverage() {
  const c = db();
  if (!c) return null;
  const { data, error } = await c.rpc('sanctions_coverage');
  if (error) {
    logErr('coverage', error);
    return null;
  }
  return data;
}
export const getSanctionsCoverage = unstable_cache(loadCoverage, ['sanctions-coverage-v1'], {
  revalidate: 3600,
  tags: ['sanctions'],
});

/** { [source]: row } or null when the run log cannot be read. Not cached long: it is the freshness signal. */
async function loadIngestStatus() {
  const c = db();
  if (!c) return null;
  const { data, error } = await c.rpc('ingest_status', { p_sources: SOURCES.map((s) => s.id) });
  if (error) {
    logErr('ingest status', error);
    return null;
  }
  return Object.fromEntries((data || []).map((r) => [r.source, r]));
}
export const getIngestStatus = unstable_cache(loadIngestStatus, ['sanctions-ingest-status-v1'], {
  revalidate: 300,
  tags: ['sanctions'],
});
