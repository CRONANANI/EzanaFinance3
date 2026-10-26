/**
 * Ezana API handlers: lighthouse dimension (server only). Keyed by route id;
 * merged into HANDLERS by ../handlers.js. Built on ../handler-kit.js.
 *
 * Empire routes read the same scores the Global Empire Rankings page reads
 * (getEmpireScoresForExplorer) and score them with the shared Empire model;
 * the maths lives in ../insights/lighthouse.js. Nothing here is
 * disclosure-based, so no route is delayed.
 */
import { getEmpireScoresForExplorer } from '@/lib/empire-public-store';
import { buildEmpireModel } from '@/app/datasets/oecd-macro/oecd-empire-model';
import {
  OECD_CURATED_SERIES,
  OECD_SERIES_BY_SLUG,
  OECD_AGGREGATE_AREAS,
  PROJECTION_FROM_YEAR,
} from '@/lib/oecd-curated';
import { WB_INDICATORS, WB_BY_ID } from '@/lib/lighthouse/indicators';
import {
  ApiError,
  getAdminClient,
  dbError,
  readPage,
  rpcRows,
  insightCache,
  emptyCoverage,
  pathParam,
  newestDate,
  num,
  int,
  day,
  upper,
} from '../handler-kit';
import { pageOf, encodeCursor } from '../query';
import { WB_DEFAULT_INDICATOR } from '../catalog/lighthouse';
import {
  empireCompare,
  empireCountry,
  empireDimension,
  empireDimensionList,
  empireRankings,
  gprMovers,
  oecdRanking,
  worldBankRanking,
} from '../insights/lighthouse';

const ISO3 = /^[A-Z]{3}$/;
const MAX_ISO3 = 30;
const PAGE = 1000;
const WB_SOURCE = 'World Bank World Development Indicators';
const OECD_SOURCE = 'OECD Economic Outlook';

const list = (data, limit, meta) => ({
  data,
  page: { limit: limit ?? data.length, has_more: false, next: null },
  meta,
});

/* Every row of a query, in pages of 1000 (the API's row cap per read). */
async function readAll(name, build, max = 20000) {
  const out = [];
  for (let from = 0; from < max; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw dbError(name, error);
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/* ── Empire ─────────────────────────────────────────────────────────── */

/* The page's own read, cached for every Empire route. A null (scores not
   synced, or the read failed) throws so it is never cached. */
async function empireModel() {
  const empire = await insightCache('lighthouse', 'empire.scores', {}, async () => {
    const e = await getEmpireScoresForExplorer();
    if (!e) throw new ApiError(503, 'not_available', 'The Empire rankings are being refreshed.');
    return e;
  });
  const model = buildEmpireModel(empire);
  if (!model) throw new ApiError(503, 'not_available', 'The Empire rankings are being refreshed.');
  return model;
}

const iso3Of = (value, what = 'country') => {
  const v = upper(String(value ?? '').trim());
  if (!v || !ISO3.test(v))
    throw new ApiError(400, 'invalid_param', `"${what}" must be an ISO3 code like USA.`);
  return v;
};

const empireMeta = (model, extra = {}) => ({
  as_of: String(model.year),
  year: model.year,
  ...extra,
});

/* ── World Bank ─────────────────────────────────────────────────────── */

const yearOf = (d) => (d ? Number(String(d).slice(0, 4)) : null);

async function worldBankRows(indicator, year) {
  const admin = getAdminClient();
  const fromYear = year ?? new Date().getUTCFullYear() - 10;
  const rows = await readAll('lighthouse_observations', () => {
    let qb = admin
      .from('lighthouse_observations')
      .select('ref_area, ref_area_name, period, value')
      .eq('source', 'worldbank')
      .eq('indicator', indicator)
      .not('value', 'is', null)
      .gte('period', `${fromYear}-01-01`);
    if (year) qb = qb.lte('period', `${year}-12-31`);
    return qb.order('ref_area').order('period');
  });
  return rows.map((r) => ({
    iso3: r.ref_area,
    name: r.ref_area_name || r.ref_area,
    indicator,
    year: yearOf(r.period),
    value: num(r.value),
  }));
}

/* ── geopolitical risk ──────────────────────────────────────────────── */

const GPR_SELECT = 'indicator, ref_area, ref_area_name, period, value';

/* Whether any GPR row is loaded (so an empty filtered page is not reported
   as a pending ingest). */
async function gprLoaded() {
  const { data, error } = await getAdminClient()
    .from('lighthouse_observations')
    .select('period')
    .eq('source', 'gpr')
    .limit(1);
  if (error) throw dbError('lighthouse_observations', error);
  return Boolean(data?.length);
}

/* ── sanctions ──────────────────────────────────────────────────────── */

const SANCTIONS_SOURCE = 'U.S. Treasury Office of Foreign Assets Control (OFAC)';
const monthsOf = (days) => Math.max(1, Math.round((days ?? 730) / 30.44));
const firstOfMonthsAgo = (months, now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1))
    .toISOString()
    .slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);
const text = (v) => (v == null || String(v).trim() === '' ? null : String(v).trim());

function sanctionsSearchArgs(params, offset, limit) {
  return {
    p_q: text(params.q),
    p_ident: text(params.id_number),
    p_type: params.entity_type || null,
    p_country: text(params.country),
    p_program: text(params.program),
    p_from: params.from || null,
    p_to: params.to || null,
    p_offset: offset,
    p_limit: limit,
  };
}

/* ── handlers ───────────────────────────────────────────────────────── */

export const HANDLERS = {
  /* Empire */
  'empire.rankings': async ({ params }) => {
    const model = await empireModel();
    const ranked = empireRankings(model);
    return list(
      ranked.slice(0, params.limit),
      params.limit,
      empireMeta(model, {
        ranked_countries: ranked.length,
        scored_countries: model.countries.length,
        dimensions: empireDimensionList(model),
      }),
    );
  },

  'empire.country': async ({ path }) => {
    const iso = pathParam(upper(path.country), ISO3, 'country');
    const model = await empireModel();
    const out = empireCountry(model, iso);
    if (!out) throw new ApiError(404, 'not_found', 'No Empire scores for that country.');
    return { data: out, meta: empireMeta(model) };
  },

  'empire.dimension': async ({ path }) => {
    const id = pathParam(path.dimension, /^[a-z_]{2,40}$/, 'dimension');
    const model = await empireModel();
    const out = empireDimension(model, id);
    if (!out) throw new ApiError(404, 'not_found', 'No live Empire dimension with that id.');
    return {
      data: out.rows,
      page: { limit: out.rows.length, has_more: false, next: null },
      meta: empireMeta(model, { dimension: out.dimension }),
    };
  },

  'empire.compare': async ({ params }) => {
    if (!params.a || !params.b)
      throw new ApiError(400, 'invalid_param', 'Send two countries as a and b (ISO3 codes).');
    const a = iso3Of(params.a, 'a');
    const b = iso3Of(params.b, 'b');
    if (a === b)
      throw new ApiError(400, 'invalid_param', '"a" and "b" must be different countries.');
    const model = await empireModel();
    const out = empireCompare(model, a, b);
    if (!out) throw new ApiError(404, 'not_found', 'No Empire scores for one of those countries.');
    return { data: out, meta: empireMeta(model) };
  },

  /* OECD */
  'macro.oecd_series': async () => {
    const data = OECD_CURATED_SERIES.map((s) => ({
      slug: s.slug,
      label: s.label,
      lens: s.lens,
      unit: s.unitLabel || null,
      frequency: 'annual',
      signed: Boolean(s.signed),
      higher_is_better: !s.inv,
      projection_from_year: PROJECTION_FROM_YEAR,
    }));
    return list(data, data.length, { source: OECD_SOURCE, as_of: null });
  },

  'macro.oecd_observations': async ({ params, path }) => {
    const slug = path.slug;
    if (!OECD_SERIES_BY_SLUG[slug])
      throw new ApiError(404, 'not_found', 'No OECD series with that slug.');
    const areas = params.iso3 ? [...new Set(params.iso3.map((v) => v.toUpperCase()))] : null;
    if (areas && areas.length > MAX_ISO3)
      throw new ApiError(400, 'invalid_param', `At most ${MAX_ISO3} iso3 values per request.`);
    const rows = await readPage(
      'oecd_series_observations',
      'ref_area, ref_area_name, year, obs_value, unit_label, synced_at',
      { keys: ['ref_area', 'year'], limit: params.limit, cursor: params.cursor, dir: 'asc' },
      (qb) => {
        let x = qb.eq('ezana_slug', slug);
        if (areas) x = x.in('ref_area', areas);
        return x;
      },
    );
    const { rows: kept, page } = pageOf(rows, params.limit, (r) => [r.ref_area, r.year]);
    return {
      data: kept.map((r) => ({
        area: r.ref_area,
        area_name: r.ref_area_name || r.ref_area,
        is_aggregate: OECD_AGGREGATE_AREAS.includes(r.ref_area),
        year: int(r.year),
        value: num(r.obs_value),
        unit: r.unit_label || OECD_SERIES_BY_SLUG[slug].unitLabel || null,
        projection: Number(r.year) >= PROJECTION_FROM_YEAR,
      })),
      page,
      meta: {
        source: OECD_SOURCE,
        as_of: day(newestDate(kept.map((r) => r.synced_at))),
        projection_from_year: PROJECTION_FROM_YEAR,
        ...(kept.length || areas || params.cursor ? {} : { coverage: emptyCoverage(kept) }),
      },
    };
  },

  'macro.oecd_ranking': async ({ params, path }) => {
    const slug = path.slug;
    if (!OECD_SERIES_BY_SLUG[slug])
      throw new ApiError(404, 'not_found', 'No OECD series with that slug.');
    const order = params.sort || 'highest';
    const out = await insightCache(
      'lighthouse',
      'macro.oecd_ranking',
      { slug, order, year: params.year },
      async () => {
        const { data } = await rpcRows(
          'oecd_latest_observations',
          { p_slugs: [slug], p_max_year: params.year ?? null },
          (r) => r,
        );
        return oecdRanking(data, { order, projectionFrom: PROJECTION_FROM_YEAR });
      },
    );
    const rows = out.rows.slice(0, params.limit);
    return list(rows, params.limit, {
      source: OECD_SOURCE,
      as_of: out.year == null ? null : String(out.year),
      year: out.year,
      series: {
        slug,
        label: OECD_SERIES_BY_SLUG[slug].label,
        unit: OECD_SERIES_BY_SLUG[slug].unitLabel,
      },
    });
  },

  /* World Bank */
  'macro.world_bank_country': async ({ path }) => {
    const iso = pathParam(upper(path.country), ISO3, 'country');
    const { data, error } = await getAdminClient()
      .rpc('lighthouse_latest', { p_source: 'worldbank', p_indicators: null })
      .eq('ref_area', iso);
    if (error) throw dbError('lighthouse_latest', error);
    const rows = data || [];
    if (!rows.length) throw new ApiError(404, 'not_found', 'No World Bank data for that country.');
    const order = new Map(WB_INDICATORS.map((i, k) => [i.id, k]));
    const out = rows
      .filter((r) => WB_BY_ID[r.indicator])
      .sort((a, b) => order.get(a.indicator) - order.get(b.indicator))
      .map((r) => {
        const latest = num(r.latest_value);
        const prior = num(r.prior_value);
        return {
          indicator: r.indicator,
          label: WB_BY_ID[r.indicator].label,
          unit: WB_BY_ID[r.indicator].unit,
          latest_year: yearOf(r.latest_period),
          latest_value: latest,
          prior_year: yearOf(r.prior_period),
          prior_value: prior,
          change: latest == null || prior == null ? null : Math.round((latest - prior) * 1e6) / 1e6,
        };
      });
    return list(out, out.length, {
      source: WB_SOURCE,
      as_of: day(newestDate(rows.map((r) => r.latest_period))),
      iso3: iso,
      country: rows[0].ref_area_name || iso,
    });
  },

  'macro.world_bank_rankings': async ({ params }) => {
    const indicator = params.indicator || WB_DEFAULT_INDICATOR;
    const order = params.sort || 'highest';
    const out = await insightCache(
      'lighthouse',
      'macro.world_bank_rankings',
      { indicator, order, year: params.year },
      async () =>
        worldBankRanking(await worldBankRows(indicator, params.year ?? null), indicator, {
          year: params.year ?? null,
          order,
        }),
    );
    return list(out.rows.slice(0, params.limit), params.limit, {
      source: WB_SOURCE,
      as_of: out.year == null ? null : String(out.year),
      year: out.year,
      year_rule: out.rule,
      indicator: {
        id: indicator,
        label: WB_BY_ID[indicator].label,
        unit: WB_BY_ID[indicator].unit,
      },
    });
  },

  /* Geopolitical risk */
  'gpr.index': async ({ params }) => {
    const country = params.country ? iso3Of(params.country) : null;
    const rows = await readPage(
      'lighthouse_observations',
      GPR_SELECT,
      { keys: ['period', 'indicator', 'ref_area'], limit: params.limit, cursor: params.cursor },
      (qb) => {
        let x = qb.eq('source', 'gpr').eq('frequency', 'monthly');
        if (params.gpr_index) x = x.eq('indicator', params.gpr_index);
        if (country) x = x.eq('ref_area', country);
        if (params.from) x = x.gte('period', params.from);
        if (params.to) x = x.lte('period', params.to);
        return x;
      },
    );
    const { rows: kept, page } = pageOf(rows, params.limit, (r) => [
      r.period,
      r.indicator,
      r.ref_area,
    ]);
    return {
      data: kept.map((r) => ({
        index: r.indicator,
        iso3: r.ref_area,
        country: r.ref_area_name || r.ref_area,
        month: day(r.period),
        value: num(r.value),
      })),
      page,
      meta: {
        as_of: day(newestDate(kept.map((r) => r.period))),
        ...(kept.length || (await gprLoaded()) ? {} : { coverage: emptyCoverage(kept) }),
      },
    };
  },

  'gpr.movers': async ({ params }) => {
    const movers = await insightCache('lighthouse', 'gpr.movers', {}, async () => {
      const admin = getAdminClient();
      const newest = await admin
        .from('lighthouse_observations')
        .select('period')
        .eq('source', 'gpr')
        .eq('indicator', 'GPRC')
        .eq('frequency', 'monthly')
        .order('period', { ascending: false })
        .limit(1);
      if (newest.error) throw dbError('lighthouse_observations', newest.error);
      const latest = newest.data?.[0]?.period;
      if (!latest) return null;
      const d = new Date(`${String(latest).slice(0, 10)}T00:00:00Z`);
      const from = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 63, 1))
        .toISOString()
        .slice(0, 10);
      const rows = await readAll('lighthouse_observations', () =>
        admin
          .from('lighthouse_observations')
          .select('ref_area, ref_area_name, period, value')
          .eq('source', 'gpr')
          .eq('indicator', 'GPRC')
          .eq('frequency', 'monthly')
          .gte('period', from)
          .order('ref_area')
          .order('period'),
      );
      return gprMovers(
        rows.map((r) => ({
          iso3: r.ref_area,
          name: r.ref_area_name,
          period: r.period,
          value: num(r.value),
        })),
      );
    });
    /* null: no country GPR rows at all (ingest pending); []: rows, no qualifier. */
    const rows = (movers || []).slice(0, params.limit);
    return list(rows, params.limit, {
      as_of: rows[0] ? `${rows[0].latest_month}-01` : null,
      ...(movers ? {} : { coverage: emptyCoverage([]) }),
    });
  },

  /* Sanctions */
  'sanctions.entities': async ({ params }) => {
    const offset = params.cursor ? Number(params.cursor[0]) : 0;
    if (!Number.isInteger(offset) || offset < 0)
      throw new ApiError(400, 'invalid_param', 'The cursor is not valid. Start again without it.');
    const { data, error } = await getAdminClient().rpc(
      'sanctions_search',
      sanctionsSearchArgs(params, offset, params.limit + 1),
    );
    if (error) throw dbError('sanctions_search', error);
    const rows = data || [];
    const has_more = rows.length > params.limit;
    const kept = rows.slice(0, params.limit);
    return {
      data: kept.map((r) => ({
        id: r.ent_num,
        name: r.name,
        type: r.entry_type,
        programs: r.programs || [],
        countries: r.countries || [],
        localities: r.localities || [],
        listed_on: day(r.listed_on),
        secondary_risk: r.secondary_risk != null,
        matched_alias: r.matched_alias || null,
        identifier: r.ident_value ? { label: r.ident_label, value: r.ident_value } : null,
        links: int(r.link_count) ?? 0,
      })),
      page: {
        limit: params.limit,
        has_more,
        next: has_more ? encodeCursor([offset + params.limit]) : null,
      },
      meta: {
        source: SANCTIONS_SOURCE,
        as_of: day(newestDate(kept.map((r) => r.listed_on))),
        total: rows.length ? Number(rows[0].total) : 0,
        note: 'Research data, not a compliance screening tool.',
      },
    };
  },

  'sanctions.entity': async ({ path }) => {
    const id = Number(pathParam(path.id, /^[0-9]{1,9}$/, 'sanctions entry'));
    const admin = getAdminClient();
    const [entry, date, aliases, idents, rel] = await Promise.all([
      admin
        .from('sanctions_entries')
        .select(
          'ent_num, name, entry_type, programs, countries, localities, remarks, remarks_full, secondary_risk, removed_on, synced_at',
        )
        .eq('ent_num', id)
        .maybeSingle(),
      admin.from('sanctions_listing_dates').select('listed_on').eq('ent_num', id).maybeSingle(),
      admin
        .from('sanctions_aliases')
        .select('alt_type, alt_name')
        .eq('ent_num', id)
        .order('source')
        .order('alt_name')
        .limit(200),
      admin
        .from('sanctions_identifiers')
        .select('kind, label, value, issuer, is_alt')
        .eq('ent_num', id)
        .order('kind')
        .order('id')
        .limit(200),
      admin.rpc('sanctions_relations', { p_ent: id }),
    ]);
    if (entry.error) throw dbError('sanctions_entries', entry.error);
    if (!entry.data) throw new ApiError(404, 'not_found', 'No sanctions entry with that id.');
    for (const [name, r] of [
      ['sanctions_listing_dates', date],
      ['sanctions_aliases', aliases],
      ['sanctions_identifiers', idents],
      ['sanctions_relations', rel],
    ])
      if (r.error) throw dbError(name, r.error);
    const e = entry.data;
    const party = (p) => ({ id: p.id, name: p.name, type: p.type || null });
    return {
      data: {
        id: e.ent_num,
        name: e.name,
        type: e.entry_type,
        programs: e.programs || [],
        countries: e.countries || [],
        localities: e.localities || [],
        listed_on: day(date.data?.listed_on),
        removed_on: day(e.removed_on),
        secondary_risk: e.secondary_risk ? e.secondary_risk.split(' | ') : [],
        remarks: e.remarks_full || e.remarks || null,
        aliases: (aliases.data || []).map((a) => ({ type: a.alt_type, name: a.alt_name })),
        identifiers: (idents.data || []).map((i) => ({
          kind: i.kind,
          label: i.label,
          value: i.value,
          issuer: i.issuer || null,
          is_alt: Boolean(i.is_alt),
        })),
        links: (rel.data?.links || []).map((l) => ({
          name: l.name,
          matches: (l.matches || []).map(party),
        })),
        linked_from: (rel.data?.linked_from || []).map(party),
      },
      meta: {
        source: SANCTIONS_SOURCE,
        as_of: day(e.synced_at),
        note: 'Research data, not a compliance screening tool.',
      },
    };
  },

  'sanctions.activity': async ({ params }) => {
    const months = monthsOf(params.days);
    const filters = {
      country: text(params.country),
      program: text(params.program),
      type: params.entity_type || null,
    };
    const out = await insightCache(
      'lighthouse',
      'sanctions.activity',
      { months, ...filters },
      async () => {
        const from = firstOfMonthsAgo(months);
        const to = today();
        const f = { p_country: filters.country, p_program: filters.program, p_type: filters.type };
        const [series, countries, programs] = await Promise.all([
          rpcRows('sanctions_activity', { p_months: months, ...f }, (r) => ({
            month: day(r.month),
            listings: int(r.listings) ?? 0,
          })),
          rpcRows(
            'sanctions_activity_breakdown',
            { p_dim: 'country', p_from: from, p_to: to, ...f, p_limit: 10 },
            (r) => ({ country: r.key, listings: int(r.listings) ?? 0 }),
          ),
          rpcRows(
            'sanctions_activity_breakdown',
            { p_dim: 'program', p_from: from, p_to: to, ...f, p_limit: 10 },
            (r) => ({ program: r.key, listings: int(r.listings) ?? 0 }),
          ),
        ]);
        return {
          from,
          to,
          months: series.data,
          total: series.data.reduce((s, m) => s + m.listings, 0),
          top_countries: countries.data,
          top_programs: programs.data,
        };
      },
    );
    return {
      data: out,
      meta: {
        source: SANCTIONS_SOURCE,
        as_of: out.to,
      },
    };
  },

  'sanctions.country_trend': async ({ params }) => {
    const months = Math.min(120, monthsOf(params.days));
    const country = text(params.country);
    const rows = await insightCache(
      'lighthouse',
      'sanctions.country_trend',
      { months, country },
      async () => {
        const admin = getAdminClient();
        const all = await readAll('sanctions_country_trend', () => {
          let qb = admin.rpc('sanctions_country_trend', { p_months: months });
          if (country) qb = qb.eq('country', country);
          return qb.order('month').order('country');
        });
        return all.map((r) => ({
          country: r.country,
          month: day(r.month),
          listings: int(r.added) ?? 0,
        }));
      },
    );
    return {
      data: rows,
      meta: {
        source: SANCTIONS_SOURCE,
        as_of: day(newestDate(rows.map((r) => r.month))),
        months,
      },
    };
  },

  'sanctions.actions': async ({ params }) => {
    const rows = await readPage(
      'ofac_actions',
      'id, action_date, title, url, kinds, program_hints',
      {
        keys: ['action_date', 'id'],
        notNull: ['action_date'],
        limit: params.limit,
        cursor: params.cursor,
      },
      (qb) => {
        let x = qb;
        if (params.action_kind) x = x.contains('kinds', [params.action_kind]);
        if (params.from) x = x.gte('action_date', params.from);
        if (params.to) x = x.lte('action_date', params.to);
        return x;
      },
    );
    const { rows: kept, page } = pageOf(rows, params.limit, (r) => [r.action_date, r.id]);
    return {
      data: kept.map((r) => ({
        id: r.id,
        date: day(r.action_date),
        title: r.title,
        kinds: r.kinds || [],
        program_hints: r.program_hints || [],
        url: r.url,
      })),
      page,
      meta: {
        source: SANCTIONS_SOURCE,
        as_of: day(newestDate(kept.map((r) => r.action_date))),
      },
    };
  },

  'sanctions.summary': async () => {
    const out = await insightCache('lighthouse', 'sanctions.summary', {}, async () => {
      const admin = getAdminClient();
      const [k, c] = await Promise.all([
        admin.rpc('sanctions_kpis'),
        admin.rpc('sanctions_coverage'),
      ]);
      if (k.error) throw dbError('sanctions_kpis', k.error);
      if (c.error) throw dbError('sanctions_coverage', c.error);
      const kpis = k.data || {};
      const cov = c.data || {};
      const asOf = day(kpis.today) || today();
      const from = new Date(Date.parse(`${asOf}T00:00:00Z`) - 364 * 86400000)
        .toISOString()
        .slice(0, 10);
      const programs = await rpcRows(
        'sanctions_activity_breakdown',
        { p_dim: 'program', p_from: from, p_to: asOf, p_limit: 10 },
        (r) => ({ program: r.key, listings: int(r.listings) ?? 0 }),
      );
      return {
        as_of: asOf,
        active: int(kpis.active) ?? 0,
        listed_last_30_days: int(kpis.listed_30) ?? 0,
        listed_prior_30_days: int(kpis.listed_prev_30) ?? 0,
        listed_last_90_days: int(kpis.listed_90) ?? 0,
        listed_last_365_days: int(kpis.listed_365) ?? 0,
        removed_last_30_days: int(kpis.removed_30) ?? 0,
        removed_since_tracking: int(kpis.removed_observed) ?? 0,
        tracking_since: day(cov.baseline),
        earliest_listed: day(kpis.earliest_listed),
        latest_listed: day(kpis.latest_listed),
        coverage: {
          active: int(cov.active),
          with_listing_date: int(cov.with_listing_date),
          with_country: int(cov.with_country),
          with_identifier: int(cov.with_identifier),
          with_alias: int(cov.with_alias),
          with_links: int(cov.with_links),
          with_secondary_risk: int(cov.with_secondary_risk),
        },
        top_programs: programs.data,
      };
    });
    const { as_of: asOf, ...data } = out;
    return {
      data,
      meta: {
        source: SANCTIONS_SOURCE,
        as_of: asOf,
        ...(data.active ? {} : { coverage: emptyCoverage([]) }),
      },
    };
  },
};

/* Database functions these handlers call that exist in production but no
   migration creates (verified live with a read-only pg_proc query). The API
   guard test accepts an RPC only if a migration creates it or it is here. */
export const LIVE_ONLY_RPCS = ['lighthouse_latest'];
