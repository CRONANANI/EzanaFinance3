/**
 * IMF data via the new SDMX API (2025 portal): https://api.imf.org/external/sdmx/3.0
 *   /data/dataflow/{agency}/{flow}/+/{key}   key: '.'-separated, '*' wildcard, '+' OR
 * The old dataservices.imf.org JSON API is retired, and IFS no longer exists as one dataflow:
 * its content moved to topic flows (CPI, IRFCL, ...). The gateway has intermittently enforced
 * a free subscription key: set IMF_API_KEY (portal.api.imf.org) and it is sent as the
 * Ocp-Apim-Subscription-Key header. Response: SDMX-CSV (Accept: text/csv), columns COUNTRY
 * (ISO3), INDICATOR, FREQUENCY, TIME_PERIOD, OBS_VALUE. Monthly periods arrive as 2026-M03.
 * Dimension orders below come from current client code (imfp, sdmx1); confirm with
 * GET {BASE}/structure/dataflow/{agency}/{flow}/+ ?references=datastructure if a batch 404s.
 *
 * IRFCL (International Reserves and Foreign Currency Liquidity, the reserves data template):
 * dataflow IMF.STA:IRFCL, structure DSD_IRFCL_PUB, key COUNTRY.INDICATOR.SECTOR.FREQUENCY.
 * IRFCLDT1_IRFCL65_USD is Section I.A, official reserve assets, approximate market value in
 * US dollars (the codelist is CL_IRFCL_INDICATOR_PUB). OBS_VALUE comes in units (US dollars);
 * the SCALE attribute (6) only says the IMF displays it in millions, and attributes=none drops
 * it. The sector is left open: most economies report S1XS1311 (monetary authorities and
 * central government), some only S1X; the catalogue states one per economy.
 * api.imf.org could not be reached from the environment this was written in; the flow, the
 * dimension order and the indicator code are those used by working public clients against
 * this API in 2026. A wrong key fails that one batch (logged and skipped), never the run.
 */
import { parseSdmxCsv } from '../formats.js';

const BASE = 'https://api.imf.org/external/sdmx/3.0';

export const FLOWS = [
  {
    agency: 'IMF.RES',
    flow: 'WEO',
    // COUNTRY.INDICATOR.FREQ: real GDP growth, inflation, unemployment, current account % GDP,
    // gross government debt % GDP, government net lending % GDP.
    key: '*.NGDP_RPCH+PCPIPCH+LUR+BCA_NGDPD+GGXWDG_NGDP+GGXCNL_NGDP.A',
    name: 'World Economic Outlook',
    since: null,
  },
  {
    agency: 'IMF.STA',
    flow: 'CPI',
    // COUNTRY.INDEX_TYPE.COICOP.TYPE.FREQ: headline CPI index, monthly.
    key: '*.CPI._T.IX.M',
    name: 'Consumer price index',
    since: '2015-M01',
  },
  {
    agency: 'IMF.STA',
    flow: 'IMTS',
    // COUNTRY.INDICATOR.COUNTERPART.FREQ: goods exports FOB and imports CIF with the world (G001).
    key: '*.XG_FOB_USD+MG_CIF_USD.G001.M',
    name: 'International trade in goods',
    since: '2015-M01',
  },
  {
    agency: 'IMF.STA',
    flow: 'BOP',
    // COUNTRY.ACCOUNTING_ENTRY.INDICATOR.UNIT.FREQ: net financial assets and liabilities for
    // direct, portfolio and other investment, USD, quarterly.
    key: '*.A_NFA_T+L_NIL_T.D_F+P_F+O_F.USD.Q',
    name: 'Balance of payments, financial account',
    since: '2010-Q1',
  },
  {
    agency: 'IMF.STA',
    flow: 'IRFCL',
    // COUNTRY.INDICATOR.SECTOR.FREQUENCY: official reserve assets (Section I.A), US dollars,
    // every reporting sector, monthly.
    key: '*.IRFCLDT1_IRFCL65_USD.*.M',
    name: 'Official reserve assets',
    seriesName: 'Official reserve assets in US dollars (IMF reserves data template)',
    unit: 'US dollars',
    since: '2015-M01',
  },
];

export const imf = {
  source: 'imf',
  minIntervalMs: 2000,
  attribution: 'International Monetary Fund, IMF Data (data.imf.org)',
  buildBatches() {
    return FLOWS.map((f) => ({ ...f, label: `${f.agency}/${f.flow}` }));
  },
  async fetchBatch(b, fetchWithRetry) {
    const qs = new URLSearchParams({
      dimensionAtObservation: 'TIME_PERIOD',
      attributes: 'none',
      measures: 'all',
    });
    if (b.since) qs.set('c[TIME_PERIOD]', `ge:${b.since}`);
    const url = `${BASE}/data/dataflow/${b.agency}/${b.flow}/+/${b.key}?${qs}`;
    const headers = { Accept: 'text/csv' };
    if (process.env.IMF_API_KEY) headers['Ocp-Apim-Subscription-Key'] = process.env.IMF_API_KEY;
    const res = await fetchWithRetry(url, { headers, okStatuses: [404] });
    if (res.status === 404) return [];
    const rows = parseSdmxCsv(await res.text(), {
      prefix: `IMF.${b.flow}`,
      dataset: `${b.agency}/${b.flow}`,
      countryDims: ['COUNTRY', 'REF_AREA', 'JURISDICTION'],
      ...(b.seriesName ? { seriesName: b.seriesName } : {}),
      ...(b.unit ? { unit: b.unit } : {}),
    });
    if (b.seriesName) return rows;
    return rows.map((r) => ({
      ...r,
      series_name: r.series_name ? `${b.name}: ${r.series_name}` : b.name,
    }));
  },
};
