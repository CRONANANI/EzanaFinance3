/**
 * Latin American official sources (beyond BCB and CEPALSTAT, which have their own adapters).
 * All keyless and free; reuse with attribution.
 *
 * ibge     IBGE SIDRA: https://apisidra.ibge.gov.br/values/t/{table}/n1/all/v/{var}/p/last%20{N}
 *          JSON array whose FIRST element is a header row mapping keys (V, D1C, D2C, D3C, ...)
 *          to labels; the period column is found from that header rather than assumed.
 * bcra     BCRA Estadísticas v4.0 (v2 and v3 are deprecated):
 *          https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/{idVariable}?desde=&hasta=&limit=3000&offset=
 *          Catalogue of ids: /estadisticas/v4.0/monetarias . Response results[0].detalle[{fecha, valor}].
 * argSeries datos.gob.ar Series de Tiempo (INDEC series): https://apis.datos.gob.ar/series/api/series/?ids=&start_date=&limit=1000
 *          Response data: [[date, v1, v2, ...]] in the order of `ids`. Find ids at datos.gob.ar/series.
 * bcrp     BCRP: https://estadisticas.bcrp.gob.pe/estadisticas/series/api/{c1-c2}/json/{start}/{end}/ing
 *          At most 10 series per call, all of one frequency. Values are strings, 'n.d.' = missing.
 * banrep   Banco de la República SUAMECA. UNOFFICIAL, reverse-engineered endpoint (needs Origin and
 *          Referer headers); disabled by default. Enable only after testing, and expect breakage.
 */
import { toNum, normPeriod, freqOf, assertNotHtml } from '../formats.js';

/* ------------------------------------------------------------------ IBGE SIDRA */

/* Confirm table/variable ids in SIDRA (sidra.ibge.gov.br/tabela/{table}) before relying on them. */
export const SIDRA_QUERIES = [
  { table: 1737, variable: 63, name: 'IPCA, monthly change', unit: '%', last: 60 },
  { table: 1737, variable: 2265, name: 'IPCA, 12-month change', unit: '%', last: 60 },
  {
    table: 6381,
    variable: 4099,
    name: 'Unemployment rate (PNAD, rolling quarter)',
    unit: '%',
    last: 60,
  },
];

export function parseSidra(json, q) {
  if (!Array.isArray(json) || json.length < 2) return [];
  const [header, ...rows] = json;
  const periodKey = Object.keys(header).find(
    (k) =>
      /C$/.test(k) &&
      /(Mês|Trimestre|Ano)/i.test(String(header[k])) &&
      /Código/i.test(String(header[k])),
  );
  if (!periodKey) throw new Error(`SIDRA ${q.table}: period column not found in header`);
  return rows
    .map((r) => {
      const p = String(r[periodKey] || '');
      // YYYYMM monthly; rolling-quarter tables also use YYYYMM (end month); YYYY annual.
      const period = /^\d{6}$/.test(p) ? `${p.slice(0, 4)}-${p.slice(4)}` : normPeriod(p);
      const value = toNum(r.V);
      if (!period || value === null) return null;
      return {
        series_key: `SIDRA.${q.table}.${q.variable}:BRA`,
        country_iso3: 'BRA',
        period,
        value,
        series_name: q.name,
        unit: q.unit,
        frequency: freqOf(period),
        dataset: String(q.table),
      };
    })
    .filter(Boolean);
}

export const ibge = {
  source: 'ibge',
  minIntervalMs: 2000,
  attribution: 'IBGE, Sistema IBGE de Recuperação Automática (SIDRA)',
  buildBatches() {
    return SIDRA_QUERIES.map((q) => ({ ...q, label: `SIDRA ${q.table}/${q.variable}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const res = await fetchWithRetry(
      `https://apisidra.ibge.gov.br/values/t/${b.table}/n1/all/v/${b.variable}/p/last%20${b.last}`,
      { headers: { Accept: 'application/json' } },
    );
    return parseSidra(await res.json(), b);
  },
};

/* ------------------------------------------------------------------ BCRA */

/* ids from the v4.0 catalogue: confirm each with GET /estadisticas/v4.0/monetarias before use. */
export const BCRA_SERIES = [
  { id: 1, name: 'International reserves', unit: 'USD millions' },
  { id: 5, name: 'Wholesale exchange rate (ARS per USD)', unit: 'ARS per USD' },
  { id: 6, name: 'Monetary policy rate', unit: '% p.a.' },
  { id: 27, name: 'Monthly inflation', unit: '% m/m' },
  { id: 28, name: 'Year-on-year inflation', unit: '% y/y' },
];

export function parseBcra(json, s) {
  const detalle = json?.results?.[0]?.detalle || json?.results || [];
  return detalle
    .map((d) => {
      const period = normPeriod(d.fecha);
      const value = toNum(d.valor);
      return period && value !== null
        ? {
            series_key: `BCRA:${s.id}`,
            country_iso3: 'ARG',
            period,
            value,
            series_name: s.name,
            unit: s.unit,
            frequency: freqOf(period),
            dataset: 'monetarias v4',
          }
        : null;
    })
    .filter(Boolean);
}

export const bcra = {
  source: 'bcra',
  minIntervalMs: 2000,
  attribution: 'Banco Central de la República Argentina, API de Estadísticas',
  buildBatches(passDate) {
    const hasta = passDate.toISOString().slice(0, 10);
    return BCRA_SERIES.map((s) => ({ ...s, desde: '2018-01-01', hasta, label: `BCRA ${s.id}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const out = [];
    for (let offset = 0; offset < 30000; offset += 3000) {
      const url = `https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/${b.id}?desde=${b.desde}&hasta=${b.hasta}&limit=3000&offset=${offset}`;
      const rows = parseBcra(
        await (await fetchWithRetry(url, { headers: { Accept: 'application/json' } })).json(),
        b,
      );
      out.push(...rows);
      if (rows.length < 3000) break;
    }
    return out;
  },
};

/* ------------------------------------------------------------------ Argentina Series de Tiempo (INDEC) */

/* Confirm ids at https://datos.gob.ar/series (search the series, copy its id). */
export const ARG_SERIES = [
  { id: '148.3_INIVELNAL_DICI_M_26', name: 'CPI national level (INDEC)', unit: 'index' },
  { id: '143.3_NO_PR_2004_A_21', name: 'EMAE economic activity estimator (INDEC)', unit: 'index' },
];

export function parseArgSeries(json, series) {
  const out = [];
  for (const row of json?.data || []) {
    const period = normPeriod(row[0]);
    if (!period) continue;
    series.forEach((s, i) => {
      const value = toNum(row[i + 1]);
      if (value === null) return;
      const p = /^\d{4}-\d{2}-01$/.test(period) ? period.slice(0, 7) : period;
      out.push({
        series_key: `ARGSERIES:${s.id}`,
        country_iso3: 'ARG',
        period: p,
        value,
        series_name: s.name,
        unit: s.unit,
        frequency: freqOf(p),
        dataset: 'series-tiempo',
      });
    });
  }
  return out;
}

export const argSeries = {
  source: 'arg-series',
  minIntervalMs: 2000,
  attribution: 'Datos Argentina, Series de Tiempo API (source: INDEC)',
  buildBatches() {
    return [{ series: ARG_SERIES, label: 'Series de Tiempo' }];
  },
  async fetchBatch(b, fetchWithRetry) {
    const out = [];
    for (let start = 0; start < 20000; start += 1000) {
      const url = `https://apis.datos.gob.ar/series/api/series/?ids=${b.series.map((s) => s.id).join(',')}&start_date=2010-01-01&limit=1000&start=${start}&format=json`;
      const json = await (
        await fetchWithRetry(url, { headers: { Accept: 'application/json' } })
      ).json();
      out.push(...parseArgSeries(json, b.series));
      if ((json?.data || []).length < 1000) break;
    }
    return out;
  },
};

/* ------------------------------------------------------------------ BCRP (Peru) */

/* Codes: search https://estadisticas.bcrp.gob.pe/estadisticas/series/ ; group by frequency
   (monthly codes end in M, quarterly Q, annual A, daily D). The two below come from BCRP's
   own API guide; replace/add the series Sonar should cite. */
export const BCRP_GROUPS = [
  {
    freq: 'M',
    start: '2015-1',
    codes: [
      { code: 'PN01288PM', name: 'BCRP series PN01288PM' },
      { code: 'PN01289PM', name: 'BCRP series PN01289PM' },
    ],
  },
];

export function parseBcrp(json, group) {
  const names = (json?.config?.series || []).map((s) => s.name);
  const out = [];
  for (const p of json?.periods || []) {
    const period = normPeriod(
      String(p.name || '')
        .replace(/\./g, ' ')
        .trim(),
    );
    if (!period) continue;
    (p.values || []).forEach((v, i) => {
      const value = toNum(v);
      const c = group.codes[i];
      if (value === null || !c) return;
      out.push({
        series_key: `BCRP:${c.code}`,
        country_iso3: 'PER',
        period,
        value,
        series_name: names[i] || c.name,
        unit: null,
        frequency: freqOf(period),
        dataset: 'BCRPData',
      });
    });
  }
  return out;
}

export const bcrp = {
  source: 'bcrp',
  minIntervalMs: 2000,
  attribution: 'Banco Central de Reserva del Perú, BCRPData',
  buildBatches(passDate) {
    const end = `${passDate.getUTCFullYear()}-${passDate.getUTCMonth() + 1}`;
    return BCRP_GROUPS.map((g, i) => ({ ...g, end, label: `BCRP group ${i + 1}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const url = `https://estadisticas.bcrp.gob.pe/estadisticas/series/api/${b.codes.map((c) => c.code).join('-')}/json/${b.start}/${b.end}/ing`;
    const res = await fetchWithRetry(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    assertNotHtml(text, 'estadisticas.bcrp.gob.pe');
    return parseBcrp(JSON.parse(text), b);
  },
};

/* ------------------------------------------------------------------ BanRep (Colombia, unofficial) */

export const BANREP_SERIES = [
  { id: 1, name: 'TRM, official COP per USD rate', unit: 'COP per USD' },
  { id: 100002, name: 'Consumer price index', unit: 'index' },
];

export function parseBanrep(json, s) {
  return (json?.data || [])
    .map(([ms, v]) => {
      const date = new Date(Number(ms));
      if (Number.isNaN(date.getTime())) return null;
      const period = date.toISOString().slice(0, 10);
      const value = toNum(v);
      return value === null
        ? null
        : {
            series_key: `BANREP:${s.id}`,
            country_iso3: 'COL',
            period,
            value,
            series_name: s.name,
            unit: s.unit,
            frequency: 'D',
            dataset: 'SUAMECA',
          };
    })
    .filter(Boolean);
}

export const banrep = {
  source: 'banrep',
  enabled: false, // unofficial endpoint: enable after a manual test
  minIntervalMs: 3000,
  attribution: 'Banco de la República (Colombia), SUAMECA',
  buildBatches() {
    return BANREP_SERIES.map((s) => ({ ...s, label: `BanRep ${s.id}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const url = `https://suameca.banrep.gov.co/estadisticas-economicas-back/rest/estadisticaEconomicaRestService/consultaInformacionSerieXTipoDato?idSerie=${b.id}&tipoDato=0&cantDatos=5000`;
    const res = await fetchWithRetry(url, {
      headers: {
        Accept: 'application/json',
        Origin: 'https://suameca.banrep.gov.co',
        Referer: 'https://suameca.banrep.gov.co/',
      },
    });
    return parseBanrep(await res.json(), b);
  },
};
