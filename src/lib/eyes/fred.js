/**
 * FRED (Federal Reserve Bank of St. Louis) series for Eyes Above: commercial
 * real estate and freight. Needs FRED_API_KEY (free at
 * fredaccount.stlouisfed.org). SERVER ONLY.
 *
 * Every id is checked against /fred/series on each run: a retired or renamed
 * series is reported in the cron response and skipped, never guessed.
 */
export const EYES_FRED_SERIES = [
  /* Commercial Real Estate Activity */
  { id: 'COMREPUSQ159N', dataset: 'cre' }, // CRE prices, % change from a year ago (BIS), quarterly
  { id: 'BOGZ1FL075035503Q', dataset: 'cre' }, // CRE price index, level (Z.1), quarterly
  { id: 'CREACBW027SBOG', dataset: 'cre' }, // CRE loans, all commercial banks, weekly
  { id: 'DRCRELEXFACBS', dataset: 'cre' }, // CRE loan delinquency rate, quarterly
  { id: 'TLNRESCONS', dataset: 'cre' }, // construction spending: nonresidential, monthly
  { id: 'TLCOMCONS', dataset: 'cre' }, // construction spending: commercial, monthly
  { id: 'PRMFGCONS', dataset: 'cre' }, // private construction spending: manufacturing, monthly
  { id: 'TLOFCONS', dataset: 'cre' }, // construction spending: office, monthly (verified at run time)
  /* Supply Chain Monitoring */
  { id: 'FRGSHPUSM649NCIS', dataset: 'supply' }, // Cass Freight Index: shipments, monthly
  { id: 'FRGEXPUSM649NCIS', dataset: 'supply' }, // Cass Freight Index: expenditures, monthly
];

const API = 'https://api.stlouisfed.org/fred';

async function fredGet(path, params) {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error('FRED_API_KEY is not set');
  const qs = new URLSearchParams({ ...params, api_key: key, file_type: 'json' });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`${API}/${path}?${qs}`, { cache: 'no-store', signal: ctrl.signal });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error_message || `HTTP ${res.status}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/** Series metadata, or null when FRED does not know the id. */
export async function fredSeries(id) {
  try {
    const j = await fredGet('series', { series_id: id });
    const s = j.seriess?.[0];
    return s
      ? {
          title: s.title,
          units: s.units_short || s.units,
          frequency: s.frequency_short || s.frequency,
        }
      : null;
  } catch (e) {
    if (/does not exist|Bad Request/i.test(String(e.message))) return null;
    throw e;
  }
}

/** Observations since `start` (YYYY-MM-DD); '.' (missing) becomes null. */
export async function fredObservations(id, start) {
  const j = await fredGet('series/observations', { series_id: id, observation_start: start });
  return (j.observations || []).map((o) => ({
    date: o.date,
    value: o.value === '.' ? null : Number(o.value),
  }));
}
