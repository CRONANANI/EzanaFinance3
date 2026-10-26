/**
 * Ezana API handlers: eyes dimension (server only). Keyed by route id;
 * merged into HANDLERS by ../handlers.js. Built on ../handler-kit.js.
 *
 * Eyes Above is open data, so nothing here takes the delay cutoff. Patents,
 * night lights and chokepoint transits may be empty while their ingest is
 * pending: those routes still call their query (so they light up as soon as
 * rows land) and answer data: [] with meta.coverage, never an invented row.
 * The coverage note appears only when the whole dataset is empty, not when a
 * filter simply matches nothing.
 */
import { pageOf } from '../query';
import {
  ApiError,
  day,
  dbError,
  emptyCoverage,
  getAdminClient,
  insightCache,
  int,
  like,
  newestDate,
  num,
  pathParam,
  readPage,
  rpcRows,
  upper,
} from '../handler-kit';
import { EYES_SERIES } from '../catalog/eyes';
import {
  CPC_SECTIONS,
  normFrequency,
  rankMomentum,
  rankPorts,
  seriesChange,
  withYoy,
  matchesCountry,
} from '../insights/eyes';

const TICKER_RE = /^[A-Za-z][A-Za-z0-9.-]{0,9}$/;
const PORT_RE = /^port[0-9]{1,7}$/;
const REGION_RE = /^[a-z0-9][a-z0-9-]{0,59}$/;
const SERIES_SOURCE = { fred: 'FRED', nyfed: 'New York Fed' };

/* Change windows: the change functions compare the window with the 365 days
   before it, so a window past half a year stops meaning "recent". */
function windowDays(days, fallback) {
  const d = days ?? fallback;
  if (d > 180) throw new ApiError(400, 'invalid_param', '"days" must be between 7 and 180 here.');
  return d;
}

/* True when the table has no row at all (an ingest still pending). */
async function datasetEmpty(table, column) {
  const { data, error } = await getAdminClient().from(table).select(column).limit(1);
  if (error) throw dbError(table, error);
  return !data?.length;
}

/* meta.coverage only when the result is empty because the dataset is. */
async function coverageFor(rows, table, column) {
  if (rows.length) return undefined;
  return (await datasetEmpty(table, column)) ? emptyCoverage(rows) : undefined;
}

const withCoverage = (meta, coverage) => (coverage ? { ...meta, coverage } : meta);

/* ── patents ────────────────────────────────────────────────────────── */

function grantOut(r) {
  return {
    patent_id: r.patent_id,
    granted_at: day(r.patent_date),
    filed_at: day(r.filing_date),
    title: r.title || null,
    assignee: r.assignee || null,
    ticker: upper(r.ticker),
    cpc_section: r.cpc_section || null,
    cpc_title: CPC_SECTIONS[r.cpc_section] || null,
  };
}

async function patentGrants({ params }) {
  const rows = await readPage(
    'eyes_patents',
    'patent_id, patent_date, filing_date, title, assignee, ticker, cpc_section',
    { keys: ['patent_date', 'patent_id'], limit: params.limit, cursor: params.cursor },
    (qb) => {
      let x = qb;
      if (params.ticker?.length) x = x.in('ticker', params.ticker);
      if (params.cpc) x = x.eq('cpc_section', params.cpc);
      if (params.from) x = x.gte('patent_date', params.from);
      if (params.to) x = x.lte('patent_date', params.to);
      if (params.q) {
        const t = `"${like(params.q).replace(/%/g, '*')}"`;
        x = x.or(`assignee.ilike.${t},title.ilike.${t}`);
      }
      return x;
    },
  );
  const { rows: kept, page } = pageOf(rows, params.limit, (r) => [r.patent_date, r.patent_id]);
  const data = kept.map(grantOut);
  const coverage = params.cursor ? undefined : await coverageFor(data, 'eyes_patents', 'patent_id');
  return {
    data,
    page,
    meta: withCoverage({ as_of: newestDate(data.map((g) => g.granted_at)) }, coverage),
  };
}

async function patentMomentum({ params }) {
  const sort = params.sort || 'change';
  const minGrants = params.min_grants ?? 10;
  return insightCache(
    'eyes',
    'patents.momentum',
    { sort, min_grants: minGrants, limit: params.limit },
    async () => {
      /* The function returns at most 500 companies by recent grants; the
         ranking by growth runs over that set. */
      const { data: rows } = await rpcRows(
        'eyes_patent_momentum',
        { p_limit: 500, p_min_grants: minGrants },
        (r) => ({
          ticker: upper(r.ticker),
          assignee: r.assignee || null,
          grants_12m: int(r.grants_12m),
          grants_prior_12m: int(r.grants_prior_12m),
          change_pct: num(r.change_pct),
          top_cpc: r.top_cpc || null,
          top_cpc_title: CPC_SECTIONS[r.top_cpc] || null,
          last_grant: day(r.last_grant),
        }),
      );
      const data = rankMomentum(rows, sort, params.limit);
      const coverage = await coverageFor(data, 'eyes_patents', 'patent_id');
      return {
        data,
        page: { limit: params.limit, has_more: false, next: null },
        meta: withCoverage({ as_of: newestDate(data.map((r) => r.last_grant)) }, coverage),
      };
    },
  );
}

async function patentCompanyMonthly({ path }) {
  const ticker = pathParam(path.ticker, TICKER_RE, 'company').toUpperCase();
  return insightCache('eyes', 'patents.company_monthly', { ticker }, async () => {
    const { data } = await rpcRows(
      'eyes_patent_monthly',
      { p_ticker: ticker, p_months: 36 },
      (r) => ({ month: day(r.month), grants: int(r.grants) }),
    );
    data.sort((a, b) => (a.month < b.month ? -1 : 1));
    const coverage = await coverageFor(data, 'eyes_patents', 'patent_id');
    return {
      data,
      meta: withCoverage(
        { ticker, months: 36, as_of: newestDate(data.map((r) => r.month)) },
        coverage,
      ),
    };
  });
}

/* ── supply chain ───────────────────────────────────────────────────── */

async function portMovers({ params }) {
  const days = windowDays(params.days, 28);
  const sort = params.sort || 'move';
  const country = params.country || null;
  return insightCache(
    'eyes',
    'supply_chain.ports',
    { days, sort, country, limit: params.limit },
    async () => {
      const [{ data: change }, ports] = await Promise.all([
        rpcRows('eyes_port_change', { p_days: days, p_limit: 200 }, (r) => r),
        getAdminClient()
          .from('eyes_ports')
          .select('portid, iso3, lat, lon')
          .eq('tracked', true)
          .then(({ data, error }) => {
            if (error) throw dbError('eyes_ports', error);
            return new Map((data || []).map((p) => [p.portid, p]));
          }),
      ]);
      const rows = change
        .map((r) => {
          const p = ports.get(r.portid) || {};
          return {
            portid: r.portid,
            name: r.portname,
            country: r.country || null,
            iso3: p.iso3 || null,
            lat: num(p.lat),
            lon: num(p.lon),
            last_date: day(r.last_date),
            recent_calls_per_day: num(r.recent_avg),
            baseline_calls_per_day: num(r.base_avg),
            change_pct: num(r.change_pct),
            import_tonnes_per_day: num(r.recent_import),
            export_tonnes_per_day: num(r.recent_export),
          };
        })
        .filter((r) => matchesCountry(r, country));
      const data = rankPorts(rows, sort, params.limit);
      const coverage = await coverageFor(data, 'eyes_port_activity', 'portid');
      return {
        data,
        page: { limit: params.limit, has_more: false, next: null },
        meta: withCoverage({ days, as_of: newestDate(data.map((r) => r.last_date)) }, coverage),
      };
    },
  );
}

async function portDaily({ params, path }) {
  const portid = pathParam(path.portid, PORT_RE, 'port');
  const { data: port, error } = await getAdminClient()
    .from('eyes_ports')
    .select('portid, portname, country, iso3')
    .eq('portid', portid)
    .maybeSingle();
  if (error) throw dbError('eyes_ports', error);
  if (!port) throw new ApiError(404, 'not_found', 'No port with that id.');
  const rows = await readPage(
    'eyes_port_activity',
    'date, portcalls, portcalls_container, portcalls_tanker, portcalls_dry_bulk, import_tonnes, export_tonnes',
    { keys: ['date'], limit: params.limit, cursor: params.cursor },
    (qb) => {
      let x = qb.eq('portid', portid);
      if (params.from) x = x.gte('date', params.from);
      if (params.to) x = x.lte('date', params.to);
      return x;
    },
  );
  const { rows: kept, page } = pageOf(rows, params.limit, (r) => [r.date]);
  const data = kept.map((r) => ({
    date: day(r.date),
    calls: int(r.portcalls),
    calls_container: int(r.portcalls_container),
    calls_tanker: int(r.portcalls_tanker),
    calls_dry_bulk: int(r.portcalls_dry_bulk),
    import_tonnes: int(r.import_tonnes),
    export_tonnes: int(r.export_tonnes),
  }));
  return {
    data,
    page,
    meta: {
      port: {
        portid: port.portid,
        name: port.portname,
        country: port.country || null,
        iso3: port.iso3 || null,
      },
      as_of: newestDate(data.map((r) => r.date)),
    },
  };
}

async function chokepoints({ params }) {
  const days = windowDays(params.days, 7);
  return insightCache('eyes', 'supply_chain.chokepoints', { days }, async () => {
    const { data } = await rpcRows('eyes_chokepoint_change', { p_days: days }, (r) => ({
      id: r.portid,
      name: r.portname,
      last_date: day(r.last_date),
      recent_transits_per_day: num(r.recent_avg),
      baseline_transits_per_day: num(r.base_avg),
      change_pct: num(r.change_pct),
      recent_tankers_per_day: num(r.recent_tankers),
      recent_containers_per_day: num(r.recent_containers),
    }));
    return {
      data,
      page: { limit: data.length, has_more: false, next: null },
      meta: withCoverage(
        { days, as_of: newestDate(data.map((r) => r.last_date)) },
        emptyCoverage(data),
      ),
    };
  });
}

/* ── series (freight and commercial real estate) ───────────────────── */

const seriesMeta = (s) => ({
  id: s.series_id,
  title: s.title,
  units: s.units || null,
  frequency: normFrequency(s.frequency),
  source: SERIES_SOURCE[s.source] || s.source || null,
});

/* Latest value and changes for every series of one dataset ('supply' or
   'cre'), optionally one series. */
async function seriesChanges(dataset, routeId, series) {
  if (series && !EYES_SERIES[dataset].includes(series)) {
    throw new ApiError(400, 'invalid_param', `"series" ${series} is not served by this endpoint.`);
  }
  return insightCache('eyes', routeId, { series: series || null }, async () => {
    const admin = getAdminClient();
    let q = admin
      .from('eyes_series')
      .select('series_id, source, title, units, frequency, last_date')
      .eq('dataset', dataset)
      .order('series_id');
    if (series) q = q.eq('series_id', series);
    const { data: meta, error } = await q;
    if (error) throw dbError('eyes_series', error);
    /* 120 newest observations is a year and more for weekly, monthly and
       quarterly series alike, enough for the year-earlier comparison. */
    const obs = await Promise.all(
      (meta || []).map(async (s) => {
        const { data, error: e } = await admin
          .from('eyes_series_obs')
          .select('date, value')
          .eq('series_id', s.series_id)
          .not('value', 'is', null)
          .order('date', { ascending: false })
          .limit(120);
        if (e) throw dbError('eyes_series_obs', e);
        return data || [];
      }),
    );
    const data = (meta || []).map((s, i) => ({
      ...seriesMeta(s),
      ...seriesChange(obs[i].map((o) => ({ date: o.date, value: num(o.value) }))),
    }));
    return {
      data,
      page: { limit: data.length, has_more: false, next: null },
      meta: withCoverage(
        { as_of: newestDate(data.map((r) => r.latest_date)) },
        emptyCoverage(data),
      ),
    };
  });
}

async function seriesHistory(dataset, { params, path }) {
  const id = String(path.series ?? '');
  if (!EYES_SERIES[dataset].includes(id))
    throw new ApiError(404, 'not_found', 'No series with that id.');
  const { data: s, error } = await getAdminClient()
    .from('eyes_series')
    .select('series_id, source, title, units, frequency, last_date')
    .eq('series_id', id)
    .maybeSingle();
  if (error) throw dbError('eyes_series', error);
  /* A known series not loaded yet (the GSCPI before its worker runs). */
  if (!s) {
    return {
      data: [],
      page: { limit: params.limit, has_more: false, next: null },
      meta: { series: { id }, as_of: null, coverage: emptyCoverage([]) },
    };
  }
  const rows = await readPage(
    'eyes_series_obs',
    'date, value',
    { keys: ['date'], limit: params.limit, cursor: params.cursor },
    (qb) => {
      let x = qb.eq('series_id', id).not('value', 'is', null);
      if (params.from) x = x.gte('date', params.from);
      if (params.to) x = x.lte('date', params.to);
      return x;
    },
  );
  const { rows: kept, page } = pageOf(rows, params.limit, (r) => [r.date]);
  const data = kept.map((r) => ({ date: day(r.date), value: num(r.value) }));
  return {
    data,
    page,
    meta: { series: seriesMeta(s), as_of: day(s.last_date) },
  };
}

/* ── night lights ───────────────────────────────────────────────────── */

const regionOut = (r) => ({
  id: r.region_id,
  name: r.name,
  kind: r.kind,
  country: r.country || null,
  bbox: Array.isArray(r.bbox) ? r.bbox.map(num) : null,
});

async function nightLightRegions({ params }) {
  const rows = await readPage(
    'eyes_regions',
    'region_id, name, kind, country, bbox',
    { keys: ['region_id'], limit: params.limit, cursor: params.cursor, dir: 'asc' },
    (qb) => {
      let x = qb;
      if (params.region_kind) x = x.eq('kind', params.region_kind);
      if (params.country) x = x.eq('country', String(params.country).toUpperCase());
      return x;
    },
  );
  const { rows: kept, page } = pageOf(rows, params.limit, (r) => [r.region_id]);
  const data = kept.map(regionOut);
  const coverage = params.cursor ? undefined : await coverageFor(data, 'eyes_regions', 'region_id');
  return { data, page, meta: withCoverage({}, coverage) };
}

async function nightLightRegion({ params, path }) {
  const id = pathParam(path.id, REGION_RE, 'region');
  const { data: region, error } = await getAdminClient()
    .from('eyes_regions')
    .select('region_id, name, kind, country, bbox')
    .eq('region_id', id)
    .maybeSingle();
  if (error) throw dbError('eyes_regions', error);
  if (!region) {
    /* No regions seeded yet: answer empty rather than a 404 for every id. */
    if (await datasetEmpty('eyes_regions', 'region_id')) {
      return { data: [], meta: { region: null, as_of: null, coverage: emptyCoverage([]) } };
    }
    throw new ApiError(404, 'not_found', 'No region with that id.');
  }
  const from = params.from || null;
  const to = params.to || null;
  return insightCache('eyes', 'night_lights.region', { id, from, to }, async () => {
    /* Read the whole monthly history (a few hundred rows at most) so the
       year-earlier month is there even when `from` cuts it off. */
    const { data: obs, error: e } = await getAdminClient()
      .from('eyes_night_lights')
      .select('month, mean_radiance, sum_radiance, valid_pixels')
      .eq('region_id', id)
      .order('month', { ascending: true })
      .limit(1000);
    if (e) throw dbError('eyes_night_lights', e);
    const data = withYoy(
      (obs || []).map((o) => ({
        month: day(o.month),
        value: num(o.mean_radiance),
        sum_radiance: num(o.sum_radiance),
        valid_pixels: int(o.valid_pixels),
      })),
    )
      .filter((p) => (!from || p.month >= from) && (!to || p.month <= to))
      .map((p) => ({
        month: p.month,
        mean_radiance: p.value,
        sum_radiance: p.sum_radiance,
        valid_pixels: p.valid_pixels,
        yoy_change_pct: p.yoy_change_pct,
      }));
    const coverage = await coverageFor(data, 'eyes_night_lights', 'region_id');
    return {
      data,
      meta: withCoverage(
        { region: regionOut(region), as_of: newestDate(data.map((p) => p.month)) },
        coverage,
      ),
    };
  });
}

export const HANDLERS = {
  'patents.grants': patentGrants,
  'patents.momentum': patentMomentum,
  'patents.company_monthly': patentCompanyMonthly,
  'supply_chain.ports': portMovers,
  'supply_chain.port_daily': portDaily,
  'supply_chain.chokepoints': chokepoints,
  'supply_chain.freight': ({ params }) =>
    seriesChanges('supply', 'supply_chain.freight', params.series),
  'supply_chain.freight_history': (ctx) => seriesHistory('supply', ctx),
  'real_estate.indicators': ({ params }) =>
    seriesChanges('cre', 'real_estate.indicators', params.series),
  'real_estate.history': (ctx) => seriesHistory('cre', ctx),
  'night_lights.regions': nightLightRegions,
  'night_lights.region': nightLightRegion,
};

/* Database functions these handlers call that exist in production but no
   migration creates (verified live with a read-only pg_proc query). The API
   guard test accepts an RPC only if a migration creates it or it is here.
   Every Eyes function (eyes_patent_momentum, eyes_patent_monthly,
   eyes_port_change, eyes_chokepoint_change) is created by
   20261008000300_eyes_above_datasets.sql, so none is live-only. */
export const LIVE_ONLY_RPCS = [];
