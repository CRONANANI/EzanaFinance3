#!/usr/bin/env node
/**
 * Regenerate src/lib/sonar/analysts/reference/weo-latest-actual.js from a newly downloaded IMF
 * World Economic Outlook Database Appendix (the PDF with the Country Data Documentation
 * tables). Run every April and October, when a new WEO vintage is published.
 *
 *   node scripts/build-weo-latest-actual.mjs <appendix.pdf> --vintage 2027-04 [--through 2027-03-31] [--check]
 *   node scripts/build-weo-latest-actual.mjs <appendix.txt> ...   (already converted text)
 *
 * How it reads the tables: `pdftotext -layout` keeps each table's columns aligned, so the
 * "Latest Actual Annual Data" headers give character columns. Each country row's year
 * tokens ("2025", "2024/25") are assigned to the header column they sit under, never by
 * their order in the row: base years are four-digit years too, and a missing cell ("...")
 * would otherwise shift every later value.
 *   - National accounts and prices table: first "Latest Actual" column -> nationalAccounts,
 *     second -> cpi.
 *   - Government finance and balance of payments table: first -> governmentFinance,
 *     second -> balanceOfPayments.
 * Country names resolve to ISO3 with i18n-iso-countries plus the IMF's own spellings below.
 * Rows the parser cannot place are reported, never guessed. --check compares with the
 * committed table and exits 1 on a difference (no write).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import countries from 'i18n-iso-countries';

const GROUPS = {
  na: ['nationalAccounts', 'cpi'],
  gfs: ['governmentFinance', 'balanceOfPayments'],
};

/* IMF names that differ from the ISO names. */
const IMF_NAMES = {
  'Bahamas, The': 'BHS',
  'Gambia, The': 'GMB',
  'Congo, Dem. Rep. of the': 'COD',
  'Congo, Republic of': 'COG',
  Korea: 'KOR',
  'Lao P.D.R.': 'LAO',
  Micronesia: 'FSM',
  'Taiwan Province of China': 'TWN',
  'Hong Kong SAR': 'HKG',
  'Macao SAR': 'MAC',
  Kosovo: 'XKX',
  'West Bank and Gaza': 'WBG',
  'São Tomé and Príncipe': 'STP',
  'St. Kitts and Nevis': 'KNA',
  'St. Lucia': 'LCA',
  'St. Vincent and the Grenadines': 'VCT',
  Türkiye: 'TUR',
  'Côte d’Ivoire': 'CIV',
  "Côte d'Ivoire": 'CIV',
  'Kyrgyz Republic': 'KGZ',
  'Slovak Republic': 'SVK',
  Syria: 'SYR',
  Russia: 'RUS',
  Moldova: 'MDA',
  'Brunei Darussalam': 'BRN',
  'Cabo Verde': 'CPV',
  Eswatini: 'SWZ',
  'North Macedonia': 'MKD',
  'Timor-Leste': 'TLS',
  Iran: 'IRN',
  Egypt: 'EGY',
  Yemen: 'YEM',
  Venezuela: 'VEN',
  Aruba: 'ABW',
};

export function iso3Of(name) {
  const n = String(name || '')
    .replace(/\s+/g, ' ')
    .trim();
  return IMF_NAMES[n] || countries.getAlpha3Code(n, 'en') || null;
}

const YEAR_TOKEN = /(?<![\d/])(\d{4}(?:\/\d{2})?)(?![\d/])/g;

/** Character columns of each "Latest Actual" header on a header line. */
function headerColumns(line) {
  const out = [];
  const re = /Latest\s+Actual/g;
  let m;
  while ((m = re.exec(line))) out.push(m.index);
  return out;
}

/**
 * Parse the appendix text. Returns { countries: { ISO3: { group: 'YYYY' | 'YYYY/YY' } }, unplaced: [] }.
 * Pure (tested with a layout fixture).
 */
export function parseAppendix(text) {
  const lines = String(text || '').split(/\r?\n/);
  const out = {};
  const unplaced = [];
  let table = null; // 'na' | 'gfs'
  let cols = [];
  for (const raw of lines) {
    const line = raw.replace(/\t/g, '    ');
    if (/National Accounts and Prices/i.test(line)) {
      table = 'na';
      cols = [];
      continue;
    }
    if (/Government Finance and Balance of Payments/i.test(line)) {
      table = 'gfs';
      cols = [];
      continue;
    }
    if (!table) continue;
    const h = headerColumns(line);
    if (h.length >= 2) {
      cols = h.slice(0, 2);
      continue;
    }
    if (cols.length < 2) continue;
    /* A data row starts with a country name, then a run of two or more spaces. */
    const nameMatch = /^\s{0,3}([A-ZÀ-Ý][^\d]{1,60}?)\s{2,}/.exec(line);
    if (!nameMatch) continue;
    const iso3 = iso3Of(nameMatch[1]);
    const years = [];
    let m;
    YEAR_TOKEN.lastIndex = 0;
    while ((m = YEAR_TOKEN.exec(line))) years.push({ at: m.index, v: m[1] });
    if (!years.length) continue;
    if (!iso3) {
      unplaced.push(nameMatch[1].trim());
      continue;
    }
    const [g1, g2] = GROUPS[table];
    const pick = (col) => {
      /* The token whose start is closest to the header column, within 6 characters. */
      const near = years
        .map((y) => ({ ...y, d: Math.abs(y.at - col) }))
        .filter((y) => y.d <= 6)
        .sort((a, b) => a.d - b.d)[0];
      return near ? near.v : null;
    };
    out[iso3] = { ...(out[iso3] || {}), [g1]: pick(cols[0]), [g2]: pick(cols[1]) };
  }
  return { countries: out, unplaced };
}

/** The reference module's text (sorted, stable). */
export function renderReference(parsed, { vintage, through, monthName }) {
  const sorted = Object.fromEntries(
    Object.keys(parsed.countries)
      .sort()
      .map((k) => [
        k,
        Object.fromEntries(
          Object.entries(parsed.countries[k])
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([g, v]) => [g, v ?? null]),
        ),
      ]),
  );
  const body = {
    source: `IMF World Economic Outlook, ${monthName}, Database Appendix: Country Data Documentation (latest actual annual data)`,
    vintage,
    dataThrough: through,
    note: "Values after a country's latest actual year are IMF staff estimates; the current year and later are projections. 'YYYY/YY' marks a fiscal year (the later calendar year ends it). null = not reported.",
    countries: sorted,
  };
  return `/* Generated from the IMF World Economic Outlook, ${monthName}, Database Appendix
   (Country Data Documentation: latest actual annual data). Regenerate each April and October
   with scripts/build-weo-latest-actual.mjs. */
export default ${JSON.stringify(body, null, 1)};
`;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const opt = (k) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] : null;
  };
  if (!file) {
    console.error(
      'usage: build-weo-latest-actual.mjs <appendix.pdf|.txt> --vintage YYYY-MM [--through YYYY-MM-DD] [--check]',
    );
    process.exit(2);
  }
  const text = /\.pdf$/i.test(file)
    ? execFileSync('pdftotext', ['-layout', file, '-'], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      })
    : readFileSync(file, 'utf8');
  const vintage = opt('vintage');
  if (!/^\d{4}-(04|10)$/.test(String(vintage))) {
    console.error('--vintage must be YYYY-04 or YYYY-10');
    process.exit(2);
  }
  const months = { '04': 'April', 10: 'October' };
  const monthName = `${months[vintage.slice(5)]} ${vintage.slice(0, 4)}`;
  const parsed = parseAppendix(text);
  const n = Object.keys(parsed.countries).length;
  if (n < 150) {
    console.error(
      `only ${n} economies parsed (expected about 195); the layout may have changed. Not writing.`,
    );
    process.exit(1);
  }
  if (parsed.unplaced.length)
    console.warn(`unplaced rows (add to IMF_NAMES): ${parsed.unplaced.join('; ')}`);
  const out = renderReference(parsed, { vintage, through: opt('through') || null, monthName });
  const target = new URL(
    '../src/lib/sonar/analysts/reference/weo-latest-actual.js',
    import.meta.url,
  );
  if (args.includes('--check')) {
    const same = readFileSync(target, 'utf8') === out;
    console.log(
      same ? 'weo-latest-actual.js is current' : 'weo-latest-actual.js differs from the appendix',
    );
    process.exit(same ? 0 : 1);
  }
  writeFileSync(target, out);
  console.log(
    `wrote ${n} economies to src/lib/sonar/analysts/reference/weo-latest-actual.js (${monthName})`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
