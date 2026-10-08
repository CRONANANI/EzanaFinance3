/**
 * Eyes Above page reads: SERVER ONLY (admin client). Every export is wrapped
 * in unstable_cache for an hour under the `eyes` tag, which the Eyes ingest
 * crons revalidate after each run. Nothing is estimated or filled in: an empty
 * table returns empty arrays and the page says what fills it.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';

const CACHE = { revalidate: 3600, tags: ['eyes'] };
const PAGE = 1000;

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const isoDaysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const maxDate = (...ds) => ds.filter(Boolean).reduce((m, d) => (!m || d > m ? d : m), null);

function check({ data, error }) {
  if (error) throw new Error(error.message);
  return data || [];
}

/** Every row of an ordered query, in 1,000-row pages (PostgREST caps a request). */
async function pages(build, cap = 20) {
  const out = [];
  for (let p = 0; p < cap; p += 1) {
    // eslint-disable-next-line no-await-in-loop
    const rows = check(await build().range(p * PAGE, p * PAGE + PAGE - 1));
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/** Series metadata and observations for one Eyes dataset ('supply' | 'cre'). */
async function seriesFor(admin, dataset, since = null) {
  const meta = check(
    await admin
      .from('eyes_series')
      .select('series_id, source, title, units, frequency, last_date')
      .eq('dataset', dataset)
      .order('series_id'),
  );
  const obs = await Promise.all(
    meta.map((s) =>
      pages(() => {
        let q = admin
          .from('eyes_series_obs')
          .select('date, value')
          .eq('series_id', s.series_id)
          .not('value', 'is', null);
        if (since) q = q.gte('date', since);
        return q.order('date');
      }),
    ),
  );
  return meta.map((s, i) => ({
    id: s.series_id,
    source: s.source,
    title: s.title,
    units: s.units,
    frequency: s.frequency,
    lastDate: s.last_date,
    points: obs[i].map((o) => ({ date: o.date, value: num(o.value) })),
  }));
}

/* ── Supply Chain Monitoring ─────────────────────────────────────────── */

async function loadSupply() {
  const admin = getAdminClient();
  const [choke, ports, series] = await Promise.all([
    admin.rpc('eyes_chokepoint_change', { p_days: 7 }).then(check),
    admin.rpc('eyes_port_change', { p_days: 28, p_limit: 100 }).then(check),
    seriesFor(admin, 'supply'),
  ]);
  const chokepoints = choke.map((c) => ({
    id: c.portid,
    name: c.portname,
    lastDate: c.last_date,
    recent: num(c.recent_avg),
    base: num(c.base_avg),
    change: num(c.change_pct),
    tankers: num(c.recent_tankers),
    containers: num(c.recent_containers),
  }));
  const portRows = ports.map((p) => ({
    id: p.portid,
    name: p.portname,
    country: p.country,
    lastDate: p.last_date,
    recent: num(p.recent_avg),
    base: num(p.base_avg),
    change: num(p.change_pct),
    imports: num(p.recent_import),
    exports: num(p.recent_export),
  }));
  return {
    chokepoints,
    ports: portRows,
    series,
    chokeThrough: chokepoints[0]?.lastDate || null,
    portsThrough: portRows[0]?.lastDate || null,
    through: maxDate(
      chokepoints[0]?.lastDate,
      portRows[0]?.lastDate,
      ...series.map((s) => s.lastDate),
    ),
  };
}
export const getSupplyChain = unstable_cache(loadSupply, ['eyes-supply-v1'], CACHE);

/** 365 days of one chokepoint's daily transits. */
async function loadChokepointDaily(id) {
  const admin = getAdminClient();
  const rows = await pages(() =>
    admin
      .from('eyes_chokepoint_transits')
      .select('date, n_total, n_tanker, n_container')
      .eq('portid', id)
      .gte('date', isoDaysAgo(500))
      .order('date'),
  );
  return rows.slice(-365).map((r) => ({
    date: r.date,
    total: num(r.n_total),
    tankers: num(r.n_tanker),
    containers: num(r.n_container),
  }));
}
export const getChokepointDaily = unstable_cache(
  loadChokepointDaily,
  ['eyes-choke-daily-v1'],
  CACHE,
);

/** 365 days of one port's daily calls. */
async function loadPortDaily(id) {
  const admin = getAdminClient();
  const rows = await pages(() =>
    admin
      .from('eyes_port_activity')
      .select('date, portcalls, import_tonnes, export_tonnes')
      .eq('portid', id)
      .gte('date', isoDaysAgo(500))
      .order('date'),
  );
  return rows.slice(-365).map((r) => ({
    date: r.date,
    total: num(r.portcalls),
    imports: num(r.import_tonnes),
    exports: num(r.export_tonnes),
  }));
}
export const getPortDaily = unstable_cache(loadPortDaily, ['eyes-port-daily-v1'], CACHE);

/* ── Commercial Real Estate Activity ─────────────────────────────────── */

async function loadCre() {
  const admin = getAdminClient();
  const series = await seriesFor(admin, 'cre', isoDaysAgo(3660));
  return { series, through: maxDate(...series.map((s) => s.lastDate)) };
}
export const getCre = unstable_cache(loadCre, ['eyes-cre-v1'], CACHE);

/* ── Patent Activity ─────────────────────────────────────────────────── */

export const CPC_SECTIONS = {
  A: 'Human necessities',
  B: 'Operations and transport',
  C: 'Chemistry and metallurgy',
  D: 'Textiles and paper',
  E: 'Fixed constructions',
  F: 'Mechanical engineering',
  G: 'Physics',
  H: 'Electricity',
  Y: 'Emerging cross-sectional',
};

async function loadPatents() {
  const admin = getAdminClient();
  const since = isoDaysAgo(365);
  const countOf = async (build) => {
    const { count: n, error } = await build();
    if (error) throw new Error(error.message);
    return n || 0;
  };
  const head = () => admin.from('eyes_patents').select('patent_id', { count: 'exact', head: true });
  const [momentum, recent, latest, total, matched, sections] = await Promise.all([
    admin.rpc('eyes_patent_momentum', { p_limit: 100, p_min_grants: 25 }).then(check),
    admin
      .from('eyes_patents')
      .select('patent_id, patent_date, title, assignee, ticker, cpc_section')
      .not('ticker', 'is', null)
      .order('patent_date', { ascending: false })
      .order('patent_id', { ascending: false })
      .limit(50)
      .then(check),
    admin
      .from('eyes_patents')
      .select('patent_date')
      .order('patent_date', { ascending: false })
      .limit(1)
      .then(check),
    countOf(head),
    countOf(() => head().not('ticker', 'is', null)),
    Promise.all(
      Object.keys(CPC_SECTIONS).map(async (s) => ({
        section: s,
        grants: await countOf(() => head().eq('cpc_section', s).gt('patent_date', since)),
      })),
    ),
  ]);
  return {
    momentum: momentum.map((m) => ({
      ticker: m.ticker,
      assignee: m.assignee,
      grants12: num(m.grants_12m),
      prior12: num(m.grants_prior_12m),
      change: num(m.change_pct),
      topCpc: m.top_cpc,
      lastGrant: m.last_grant,
    })),
    recent: recent.map((r) => ({
      id: r.patent_id,
      date: r.patent_date,
      title: r.title,
      assignee: r.assignee,
      ticker: r.ticker,
      cpc: r.cpc_section,
    })),
    sections,
    total,
    matched,
    through: latest[0]?.patent_date || null,
  };
}
export const getPatents = unstable_cache(loadPatents, ['eyes-patents-v1'], CACHE);

/** One company: grants per month for 36 months and its 20 latest grants. */
async function loadPatentCompany(ticker) {
  const admin = getAdminClient();
  const t = String(ticker).toUpperCase();
  const [monthly, latest] = await Promise.all([
    admin.rpc('eyes_patent_monthly', { p_ticker: t, p_months: 36 }).then(check),
    admin
      .from('eyes_patents')
      .select('patent_id, patent_date, title, cpc_section')
      .eq('ticker', t)
      .order('patent_date', { ascending: false })
      .limit(20)
      .then(check),
  ]);
  return {
    monthly: monthly.map((m) => ({ month: m.month, grants: num(m.grants) })),
    latest: latest.map((r) => ({
      id: r.patent_id,
      date: r.patent_date,
      title: r.title,
      cpc: r.cpc_section,
    })),
  };
}
export const getPatentCompany = unstable_cache(loadPatentCompany, ['eyes-patent-co-v1'], CACHE);

/* ── Satellite Imagery (night lights) ────────────────────────────────── */

async function loadNightLights() {
  const admin = getAdminClient();
  const [regions, obs] = await Promise.all([
    admin
      .from('eyes_regions')
      .select('region_id, name, kind, country, bbox')
      .order('name')
      .then(check),
    pages(() =>
      admin
        .from('eyes_night_lights')
        .select('region_id, month, mean_radiance')
        .gte('month', isoDaysAgo(800))
        .order('month'),
    ),
  ]);
  const byRegion = new Map();
  for (const o of obs) {
    if (!byRegion.has(o.region_id)) byRegion.set(o.region_id, []);
    byRegion.get(o.region_id).push({ month: o.month, value: num(o.mean_radiance) });
  }
  return {
    regions: regions.map((r) => ({
      id: r.region_id,
      name: r.name,
      kind: r.kind,
      country: r.country,
      bbox: r.bbox,
      points: byRegion.get(r.region_id) || [],
    })),
    through: obs.length ? obs[obs.length - 1].month : null,
  };
}
export const getNightLights = unstable_cache(loadNightLights, ['eyes-night-lights-v1'], CACHE);
