// node --env-file=.env.local scripts/afdb-csv-import.mjs path/to/export.csv "AfDB Socio-Economic Database"
// Expects a long-format CSV from the portal export: country, indicator, period/year, value (+ unit).
// Map the column names below to the export's actual headers before running.
import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json' with { type: 'json' };
import { createClient } from '@supabase/supabase-js';

countries.registerLocale(en);
const [file, datasetName = 'AfDB'] = process.argv.slice(2);
const COL = {
  country: 'Country',
  indicator: 'Indicator',
  period: 'Date',
  value: 'Value',
  unit: 'Unit',
};
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);
const { data } = Papa.parse(readFileSync(file, 'utf8'), { header: true, skipEmptyLines: true });
const rows = data
  .map((r) => {
    const iso3 = countries.getAlpha3Code(r[COL.country], 'en') || null;
    return {
      source: 'afdb',
      series_key: `AFDB:${iso3 || r[COL.country]}.${r[COL.indicator]}`,
      country_iso3: iso3,
      period: String(r[COL.period]).slice(0, 10),
      value: r[COL.value] === '' ? null : Number(r[COL.value]),
      series_name: r[COL.indicator],
      unit: r[COL.unit] || null,
      dataset: datasetName,
    };
  })
  .filter((r) => r.period);
for (let i = 0; i < rows.length; i += 500) {
  const { error } = await db
    .from('macro_series_values')
    .upsert(rows.slice(i, i + 500), { onConflict: 'source,series_key,period' });
  if (error) throw error;
}
console.log(`Imported ${rows.length} rows from ${file}`);
