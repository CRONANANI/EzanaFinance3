/**
 * IMF PortWatch (portwatch.imf.org): daily port calls and import/export
 * volumes for ~1,700 ports, and daily transits through 28 maritime
 * chokepoints, estimated from AIS vessel positions. Public ArcGIS Feature
 * Services, no key. Data lags about 4 to 6 weeks and is revised, so each run
 * re-reads the last 21 days before its cursor. SERVER ONLY.
 *
 * Services (services9.arcgis.com/weJ1QsnbMYJlCHdG):
 *   Daily_Ports_Data               date, portid, portname, country, ISO3, portcalls*, import*, export*
 *   Daily_Chokepoints_Data         date, portid, portname, n_total, n_container, n_tanker, ..., capacity
 *   PortWatch_ports_database       port metadata (lat, lon)
 *   PortWatch_chokepoints_database chokepoint metadata (lat, lon)
 * Filter dates with DATE 'YYYY-MM-DD'. The date field is read as either a
 * DateOnly string or an epoch-millisecond Date, whichever the service returns.
 */
const BASE = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services';
const PAGE = 1000;
const TIMEOUT_MS = 30000;

/** Every feature of one query, paging with resultOffset. POST keeps long IN() lists off the URL. */
export async function arcQuery(service, params, { maxPages = 200 } = {}) {
  const out = [];
  for (let page = 0; page < maxPages; page += 1) {
    const body = new URLSearchParams({
      f: 'json',
      returnGeometry: 'false',
      resultOffset: String(page * PAGE),
      resultRecordCount: String(PAGE),
      ...params,
    });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let json;
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(`${BASE}/${service}/FeatureServer/0/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: ctrl.signal,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`${service}: HTTP ${res.status}`);
      // eslint-disable-next-line no-await-in-loop
      json = await res.json();
    } finally {
      clearTimeout(timer);
    }
    if (json.error) throw new Error(`${service}: ${json.error.message || 'query error'}`);
    const feats = json.features || [];
    for (const f of feats) out.push(f.attributes);
    if (!json.exceededTransferLimit || feats.length === 0) break;
  }
  return out;
}

const sqlDate = (iso) => `DATE '${String(iso).slice(0, 10)}'`;
const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;
const int = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v)));

/** 'YYYY-MM-DD' from a DateOnly string or an epoch-millisecond number. */
export function isoDay(v) {
  if (v == null) return null;
  if (typeof v === 'number') return new Date(v).toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

/* Attribute names differ in case between services (ISO3 / iso3). */
const attr = (r, name) => r[name] ?? r[name.toLowerCase()] ?? r[name.toUpperCase()];

/**
 * The busiest ports by port calls since `since`. A grouped sum on the daily
 * service first; if the service refuses statistics, the 12-month activity
 * field on the ports database instead. Either way: ranked by calls.
 */
export async function topPorts(since, limit = 100) {
  try {
    const groups = await arcQuery('Daily_Ports_Data', {
      where: `date >= ${sqlDate(since)}`,
      groupByFieldsForStatistics: 'portid,portname,country,ISO3',
      outStatistics: JSON.stringify([
        { statisticType: 'sum', onStatisticField: 'portcalls', outStatisticFieldName: 'calls' },
      ]),
      orderByFields: 'calls DESC',
    });
    const ranked = groups
      .map((g) => ({
        portid: attr(g, 'portid'),
        portname: attr(g, 'portname'),
        country: attr(g, 'country') || null,
        iso3: attr(g, 'ISO3') || null,
        calls_12m: int(attr(g, 'calls')),
      }))
      .filter((p) => p.portid && p.calls_12m)
      .sort((a, b) => b.calls_12m - a.calls_12m)
      .slice(0, limit);
    if (ranked.length) return ranked;
  } catch (e) {
    console.warn(
      '[eyes/portwatch] grouped statistics refused, using the ports database',
      e.message,
    );
  }
  const all = await arcQuery('PortWatch_ports_database', { where: '1=1', outFields: '*' });
  const field = Object.keys(all[0] || {}).find((k) => /^vessel_count_total$/i.test(k));
  if (!field) throw new Error('PortWatch_ports_database: no vessel_count_total field to rank by');
  return all
    .map((r) => ({
      portid: attr(r, 'portid'),
      portname: attr(r, 'portname'),
      country: attr(r, 'country') || null,
      iso3: attr(r, 'ISO3') || null,
      calls_12m: int(r[field]),
    }))
    .filter((p) => p.portid && p.calls_12m)
    .sort((a, b) => b.calls_12m - a.calls_12m)
    .slice(0, limit);
}

/** lat/lon for port or chokepoint ids from the metadata databases. */
export async function locations(service, ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    // eslint-disable-next-line no-await-in-loop
    const rows = await arcQuery(service, {
      where: `portid IN (${chunk.map(quote).join(',')})`,
      outFields: '*',
    });
    for (const r of rows)
      out.set(attr(r, 'portid'), {
        lat: attr(r, 'lat') ?? null,
        lon: attr(r, 'lon') ?? null,
        name: attr(r, 'portname'),
      });
  }
  return out;
}

/** Daily activity for the given ports since `since`. */
export async function portDays(portids, since) {
  const rows = [];
  for (let i = 0; i < portids.length; i += 25) {
    const chunk = portids.slice(i, i + 25);
    // eslint-disable-next-line no-await-in-loop
    const got = await arcQuery('Daily_Ports_Data', {
      where: `date >= ${sqlDate(since)} AND portid IN (${chunk.map(quote).join(',')})`,
      outFields:
        'date,portid,portcalls,portcalls_container,portcalls_tanker,portcalls_dry_bulk,import,export',
      /* A unique order, so offset paging neither skips nor repeats a row. */
      orderByFields: 'date ASC, portid ASC',
    });
    for (const r of got) {
      rows.push({
        portid: r.portid,
        date: isoDay(r.date),
        portcalls: int(r.portcalls),
        portcalls_container: int(r.portcalls_container),
        portcalls_tanker: int(r.portcalls_tanker),
        portcalls_dry_bulk: int(r.portcalls_dry_bulk),
        import_tonnes: int(r.import),
        export_tonnes: int(r.export),
      });
    }
  }
  return rows;
}

/** Daily transits for all 28 chokepoints since `since`. */
export async function chokepointDays(since) {
  const got = await arcQuery('Daily_Chokepoints_Data', {
    where: `date >= ${sqlDate(since)}`,
    outFields: 'date,portid,portname,n_total,n_container,n_tanker,n_dry_bulk,n_cargo,capacity',
    orderByFields: 'date ASC, portid ASC',
  });
  return got.map((r) => ({
    portid: r.portid,
    portname: r.portname,
    date: isoDay(r.date),
    n_total: int(r.n_total),
    n_container: int(r.n_container),
    n_tanker: int(r.n_tanker),
    n_dry_bulk: int(r.n_dry_bulk),
    n_cargo: int(r.n_cargo),
    capacity: int(r.capacity),
  }));
}
