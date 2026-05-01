/**
 * Historical daily weather from Open-Meteo archive (no API key).
 */

export async function fetchWeatherHistory(lat, lon, startDate, endDate, variables) {
  const dailyParam = variables.join(',');
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=${dailyParam}&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo archive HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!json?.daily?.time) {
    return [];
  }

  const dates = json.daily.time;
  return dates.map((date, i) => {
    const row = { date };
    for (const v of variables) {
      row[v] = json.daily[v]?.[i] ?? null;
    }
    return row;
  });
}

export function computeMonthlyAnomalies(rows, variable) {
  const byMonth = {};
  for (const row of rows) {
    const month = row.date.slice(5, 7);
    if (row[variable] == null || !Number.isFinite(row[variable])) continue;
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(row[variable]);
  }

  const monthMeans = {};
  for (const m of Object.keys(byMonth)) {
    const arr = byMonth[m];
    monthMeans[m] = arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  const result = new Map();
  for (const row of rows) {
    const month = row.date.slice(5, 7);
    const value = row[variable];
    if (value == null || !Number.isFinite(value)) continue;
    const baseline = monthMeans[month];
    if (baseline == null) continue;
    result.set(row.date, value - baseline);
  }

  return result;
}
