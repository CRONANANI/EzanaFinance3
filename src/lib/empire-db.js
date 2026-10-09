'use client';

/*
 * Browser side of the Empire Ranking reads. The empire_* tables are not
 * readable with the public key, so every call goes through /api/empire/data.
 * Signatures and return shapes are unchanged; failures resolve to the empty
 * value, as before.
 */

async function get(params, empty) {
  try {
    const res = await fetch(`/api/empire/data?${new URLSearchParams(params)}`);
    if (!res.ok) {
      console.error('[empire-db] request failed:', params.kind, res.status);
      return empty;
    }
    const body = await res.json();
    return body?.data ?? empty;
  } catch (e) {
    console.error('[empire-db] request failed:', params.kind, e?.message);
    return empty;
  }
}

/** All countries with their current ranking, joined with name, flag and region. */
export function fetchEmpireRankings() {
  return get({ kind: 'rankings' }, []);
}

/** The 18 power dimension z-scores for one country and year: { dimension: z }. */
export function fetchDimensionScores(countryCode, year) {
  return get({ kind: 'dimensions', country: countryCode, year: String(year) }, {});
}

/** z-score by year for one country: [{ year, value }]. */
export function fetchBigCycleHistory(countryCode, startYear = 1500, endYear = 2030) {
  return get(
    { kind: 'history', country: countryCode, start: String(startYear), end: String(endYear) },
    [],
  );
}

/** Raw indicator values pivoted for recharts: [{ year, USA: v, CHN: v, ... }]. */
export function fetchIndicatorTimeSeries(indicatorCode, countryCodes, startYear, endYear) {
  return get(
    {
      kind: 'indicators',
      code: indicatorCode,
      countries: (countryCodes || []).join(','),
      start: String(startYear),
      end: String(endYear),
    },
    [],
  );
}
