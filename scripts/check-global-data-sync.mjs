/**
 * Global data sync (Nov 3): shared format helpers, a parser per source family, the hourly
 * rotator's skip rules, the EU/UK/UN sanctions parsers and the Sonar macro-indicators findings.
 * Network and database are stubbed; fixtures follow each source's documented shape.
 *   npm run test:global-data-sync
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const F = await import('../src/lib/macro-sync/formats.js');
const { ADAPTERS, DEDICATED_CRON } = await import('../src/lib/macro-sync/index.js');
const { runDue, adapterStatus, backoffUntil } = await import('../src/lib/macro-sync/rotate.js');
const { parseGdeltTimeline, aggregateGed } =
  await import('../src/lib/macro-sync/sources/events.js');
const { parseSidra, parseBcra, parseBcrp, parseArgSeries } =
  await import('../src/lib/macro-sync/sources/latam.js');
const { parseSarb, parseCbnFx, parseBoj, parseSingstat, parseMospiCpi } =
  await import('../src/lib/macro-sync/sources/africa-asia.js');
const risk = await import('../src/lib/macro-sync/sources/risk-indices.js');
const { parseFewsCsv } = await import('../src/lib/macro-sync/sources/energy-food.js');
const { runSync, dedupeRows, serverErrorStreak, withStreak, isServerError } =
  await import('../src/lib/macro-sync/engine.js');
const { INDICATORS: WB_INDICATORS, worldbankExt } =
  await import('../src/lib/macro-sync/sources/worldbank-ext.js');
const { amecoIso3 } = await import('../src/lib/macro-sync/sources/europe.js');
const { parseSgs, SERIES: BCB_SERIES } = await import('../src/lib/macro-sync/sources/bcb.js');
const { parseEuXml, parseUnXml, parseUkCsv } = await import('../src/lib/sanctions-intl/parsers.js');
const { syncList } = await import('../src/lib/sanctions-intl/index.js');

/* ---------------------------------------------------------------- formats */

test('toIso3 maps ISO2, ISO3 and the Eurostat/IMF exceptions; drops aggregates', () => {
  assert.equal(F.toIso3('DE'), 'DEU');
  assert.equal(F.toIso3('DEU'), 'DEU');
  assert.equal(F.toIso3('EL'), 'GRC');
  assert.equal(F.toIso3('UK'), 'GBR');
  assert.equal(F.toIso3('XK'), 'XKX');
  assert.equal(F.toIso3('EU27_2020'), null);
});

test('nameToIso3 resolves common and awkward country names', () => {
  assert.equal(F.nameToIso3('United States'), 'USA');
  assert.equal(F.nameToIso3('Russia'), 'RUS');
  assert.equal(F.nameToIso3('Korea, Rep.'), 'KOR');
  assert.equal(F.nameToIso3("Côte d'Ivoire"), 'CIV');
  assert.equal(F.nameToIso3('Atlantis'), null);
});

test('normPeriod normalizes every date style the sources use', () => {
  const cases = {
    2024: '2024',
    '2024-M03': '2024-03',
    202403: '2024-03',
    '2024-Q2': '2024-Q2',
    '1952q1': '1952-Q1',
    '2024 Jan': '2024-01',
    'Mar.2024': '2024-03',
    '2024-03-15': '2024-03-15',
    '15/03/2024': '2024-03-15',
  };
  for (const [input, want] of Object.entries(cases)) assert.equal(F.normPeriod(input), want, input);
  assert.equal(F.freqOf('2024-Q2'), 'Q');
  assert.equal(F.freqOf('2024-03'), 'M');
});

test('toNum treats placeholders as missing', () => {
  for (const v of ['n.d.', '-', '', 'x', null, '..']) assert.equal(F.toNum(v), null, String(v));
  assert.equal(F.toNum('1,234.5'), 1234.5);
});

test('parseSdmxCsv keys series on every dimension and maps the country dimension', () => {
  const csv =
    'DATAFLOW,REF_AREA,INDICATOR,FREQ,TIME_PERIOD,OBS_VALUE\nIMF.RES:WEO(9.0.0),NGA,NGDP_RPCH,A,2024,3.4\nIMF.RES:WEO(9.0.0),NGA,NGDP_RPCH,A,2025,n.d.\n';
  const rows = F.parseSdmxCsv(csv, {
    prefix: 'IMF.WEO',
    dataset: 'WEO',
    countryDims: ['REF_AREA'],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].country_iso3, 'NGA');
  assert.equal(rows[0].period, '2024');
  assert.match(rows[0].series_key, /^IMF\.WEO:.*NGA.*NGDP_RPCH/);
});

test('decodeJsonStat handles dense values', () => {
  const js = {
    id: ['geo', 'time'],
    size: [2, 2],
    dimension: {
      geo: { category: { index: { DE: 0, FR: 1 } } },
      time: { category: { index: { 2023: 0, 2024: 1 } } },
    },
    value: [1, 2, 3, 4],
  };
  const cells = F.decodeJsonStat(js);
  assert.deepEqual(cells.find((c) => c.coords.geo === 'FR' && c.coords.time === '2024').value, 4);
});

/* ---------------------------------------------------------------- source parsers */

test('GDELT: timeline JSON parses; a throttle notice is retryable', () => {
  const b = { iso3: 'IRN', mode: 'timelinetone', name: 'tone', unit: 'avg tone' };
  const rows = parseGdeltTimeline(
    JSON.stringify({ timeline: [{ data: [{ date: '20261101T000000Z', value: -4.2 }] }] }),
    b,
  );
  assert.deepEqual([rows[0].period, rows[0].value], ['2026-11-01', -4.2]);
  assert.throws(
    () => parseGdeltTimeline('Please limit requests to one every 5 seconds', b),
    (e) => e.retryable === true,
  );
});

test('UCDP: events aggregate to country-month totals and by violence type', () => {
  const rows = aggregateGed([
    { country: 'Sudan', date_start: '2026-03-02', best: 10, type_of_violence: 1 },
    { country: 'Sudan', date_start: '2026-03-20', best: 5, type_of_violence: 3 },
    { country: 'Yemen (North Yemen)', date_start: '2026-04-01', best: 2, type_of_violence: 1 },
  ]);
  const get = (k) => rows.find((r) => r.series_key === k && r.period).value;
  assert.equal(get('UCDP.deaths.all:SDN'), 15);
  assert.equal(get('UCDP.events.all:SDN'), 2);
  assert.equal(get('UCDP.deaths.one-sided:SDN'), 5);
  assert.equal(get('UCDP.deaths.all:YEM'), 2);
});

test('Latin America: SIDRA, BCRA, BCRP and Series de Tiempo', () => {
  const sidra = parseSidra(
    [
      { V: 'Valor', D3C: 'Mês (Código)' },
      { V: '0.44', D3C: '202609' },
      { V: '...', D3C: '202610' },
    ],
    { table: 1737, variable: 63, name: 'IPCA', unit: '%' },
  );
  assert.deepEqual(
    sidra.map((r) => [r.period, r.value]),
    [['2026-09', 0.44]],
  );
  const bcra = parseBcra(
    { results: [{ detalle: [{ fecha: '2026-10-31', valor: 1450.5 }] }] },
    { id: 5, name: 'FX', unit: 'ARS' },
  );
  assert.equal(bcra[0].period, '2026-10-31');
  const bcrp = parseBcrp(
    {
      config: { series: [{ name: 'A' }] },
      periods: [
        { name: 'Sep.2026', values: ['3.1'] },
        { name: 'Oct.2026', values: ['n.d.'] },
      ],
    },
    { codes: [{ code: 'PN01288PM' }] },
  );
  assert.deepEqual(
    bcrp.map((r) => r.period),
    ['2026-09'],
  );
  const arg = parseArgSeries({ data: [['2026-09-01', 100, null]] }, [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
  ]);
  assert.deepEqual(
    arg.map((r) => [r.series_key, r.period]),
    [['ARGSERIES:a', '2026-09']],
  );
});

test('Africa and Asia: SARB, CBN, BOJ, SingStat, MoSPI', () => {
  assert.equal(
    parseSarb([{ Period: '2026-10-30T00:00:00', Value: 17.4 }], {
      code: 'EXCX135D',
      name: 'FX',
      unit: 'ZAR',
    })[0].period,
    '2026-10-30',
  );
  const cbn = parseCbnFx([
    { currency: 'US DOLLAR', ratedate: '2026-10-30', centralrate: '1460.2' },
    { currency: 'CFA', ratedate: '2026-10-30', centralrate: '2.5' },
  ]);
  assert.deepEqual(
    cbn.map((r) => r.series_key),
    ['CBN.FX:US_DOLLAR'],
  );
  const boj = parseBoj(
    {
      RESULTSET: [
        { SERIES_CODE: 'FXERD04', VALUES: { SURVEY_DATES: [20261030], VALUES: [152.1] } },
      ],
    },
    { db: 'FM08', name: 'FX' },
  );
  assert.deepEqual([boj[0].period, boj[0].value], ['2026-10-30', 152.1]);
  const sg = parseSingstat(
    {
      Data: {
        row: [
          {
            seriesNo: '1',
            rowText: 'All items',
            uoM: 'Index',
            columns: [{ key: '2026 Sep', value: '116.2' }],
          },
        ],
      },
    },
    { id: 'M213751', name: 'CPI' },
  );
  assert.equal(sg[0].period, '2026-09');
  const mo = parseMospiCpi({
    data: [
      {
        state: 'All India',
        group: 'General Index',
        sector: 'Combined',
        month: 'September',
        year: 2026,
        index: '197.5',
        inflation: '1.9',
      },
      { state: 'Kerala', sector: 'Rural', month: 'September', year: 2026, index: '1' },
    ],
  });
  assert.equal(mo.length, 2);
  assert.equal(mo[0].period, '2026-09');
});

/* ---------------------------------------------------------------- duplicate keys */

/* No upsert may carry one (series_key, period) twice; Postgres refuses with "ON CONFLICT DO
   UPDATE command cannot affect row a second time". */
const keyCounts = (rows) => {
  const seen = new Map();
  for (const r of rows) {
    const k = `${r.series_key}|${r.period}`;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  return [...seen.values()];
};
const assertUniqueKeys = (rows, label) =>
  assert.ok(
    keyCounts(rows).every((n) => n === 1),
    `${label}: two rows share a (series_key, period)`,
  );

/* In-memory Supabase stand-in whose macro_series_values upsert fails like Postgres does. */
function strictDb() {
  const state = new Map();
  const values = new Map();
  const upserts = [];
  return {
    values,
    upserts,
    from(table) {
      const q = {
        select: () => q,
        eq: (_c, v) => ((q.key = v), q),
        maybeSingle: async () => ({ data: state.get(q.key) || null, error: null }),
        upsert: async (rows) => {
          rows = [].concat(rows);
          if (table === 'macro_ingest_state') {
            for (const r of rows) state.set(r.source, { ...state.get(r.source), ...r });
            return { error: null };
          }
          upserts.push(rows.length);
          const keys = rows.map((r) => `${r.source}|${r.series_key}|${r.period}`);
          if (new Set(keys).size !== keys.length) {
            return {
              error: { message: 'ON CONFLICT DO UPDATE command cannot affect row a second time' },
            };
          }
          rows.forEach((r, i) => values.set(keys[i], r));
          return { error: null };
        },
      };
      return q;
    },
  };
}

test('engine: dedupeRows keeps the last occurrence and counts the rest', () => {
  const { rows, dropped } = dedupeRows([
    { series_key: 'A', period: '2026-01', value: 1 },
    { series_key: 'A', period: '2026-02', value: 2 },
    { series_key: 'A', period: '2026-01', value: 3 },
    { series_key: 'B', period: '2026-01', value: 4 },
    { series_key: 'A', period: '2026-01', value: 5 },
  ]);
  assert.equal(dropped, 2);
  assert.equal(rows.length, 3);
  assert.equal(rows.find((r) => r.series_key === 'A' && r.period === '2026-01').value, 5);
  assert.deepEqual(dedupeRows([]), { rows: [], dropped: 0 });
});

test('engine: a batch with duplicate keys is written once per key and reports duplicatesDropped', async () => {
  const db = strictDb();
  // 1,200 rows with 200 repeats spread across what would be three upsert chunks.
  const rows = [];
  for (let i = 0; i < 1000; i += 1) {
    rows.push({ series_key: `S${i % 50}`, period: `P${Math.floor(i / 50)}`, value: i });
  }
  for (let i = 0; i < 200; i += 1) {
    rows.push({ series_key: `S${i % 50}`, period: `P${Math.floor(i / 50)}`, value: -(i + 1) });
  }
  const adapter = {
    source: 'dupetest',
    minIntervalMs: 0,
    attribution: 'test',
    buildBatches: () => [{ label: 'one' }],
    fetchBatch: async () => rows,
  };
  const r = await runSync(db, adapter, { force: true });
  assert.deepEqual(r.errors, []);
  assert.equal(r.passComplete, true);
  assert.equal(r.rowsRead, 1200);
  assert.equal(r.rowsWritten, 1000);
  assert.equal(r.duplicatesDropped, 200);
  assert.equal(db.values.size, 1000);
  assert.equal(db.values.get('dupetest|S0|P0').value, -1); // the last occurrence wins
  assert.equal(db.values.get('dupetest|S7|P3').value, -158);
  assert.equal(db.values.get('dupetest|S7|P4').value, 207); // no repeat: original kept
  assert.ok(db.upserts.every((n) => n <= 500));
});

test('engine: duplicatesDropped is 0 for a clean batch', async () => {
  const r = await runSync(
    strictDb(),
    {
      source: 'clean',
      minIntervalMs: 0,
      attribution: 'test',
      buildBatches: () => [{ label: 'one' }],
      fetchBatch: async () => [
        { series_key: 'A', period: '2026-01', value: 1 },
        { series_key: 'A', period: '2026-02', value: 2 },
      ],
    },
    { force: true },
  );
  assert.equal(r.rowsWritten, 2);
  assert.equal(r.duplicatesDropped, 0);
});

test('EPU: China and Mainland China are two series, neither lost, no duplicate keys', () => {
  const rows = [
    ['Economic Policy Uncertainty Index'],
    ['Year', 'Month', 'GEPU_current', 'GEPU_ppp', 'Australia', 'China', 'Mainland China', 'US'],
    [1999, 12, 100, 101, 90, 120, null, 80],
    [2000, 1, 102, 103, 91, 130, 140, 81],
    [2000, 2, 104, 105, 92, 131, 141, 82],
    ['Notes: China uses the South China Morning Post'],
  ];
  const out = risk.parseEpuSheet(rows);
  assertUniqueKeys(out, 'EPU');
  const series = (k) => out.filter((r) => r.series_key === k);
  assert.deepEqual(
    series('EPU.EPU:CHN').map((r) => [r.period, r.value]),
    [
      ['1999-12', 120],
      ['2000-01', 130],
      ['2000-02', 131],
    ],
  );
  assert.deepEqual(
    series('EPU.EPU_MAINLAND:CHN').map((r) => [r.period, r.value]),
    [
      ['2000-01', 140],
      ['2000-02', 141],
    ],
  );
  assert.equal(series('EPU.EPU_MAINLAND:CHN')[0].country_iso3, 'CHN');
  assert.equal(
    series('EPU.EPU_MAINLAND:CHN')[0].series_name,
    'Economic policy uncertainty index (Mainland China)',
  );
  assert.equal(series('EPU.EPU:USA').length, 3);
  assert.equal(series('EPU.EPU:AUS').length, 3);
  assert.equal(series('EPU.GEPU_current:WLD').length, 3);
  assert.equal(out.length, 3 * 2 + 3 * 3 + 2); // GEPU x2, AUS/CHN/USA, Mainland China
});

test('EPU: an "SCMP China" header is kept under its own key, not dropped', () => {
  const cols = risk.epuCountryColumns([
    'Year',
    'Month',
    'GEPU_current',
    'SCMP China',
    'Mainland China',
    'Korea',
    'UK',
  ]);
  assert.deepEqual(
    [...cols.values()].map((c) => c.key),
    ['EPU.EPU:CHN', 'EPU.EPU_MAINLAND:CHN', 'EPU.EPU:KOR', 'EPU.EPU:GBR'],
  );
  // No plain "China" column: the first claimant keeps EPU.EPU:CHN, the other is qualified.
  assert.equal(cols.get(3).key, 'EPU.EPU:CHN');
  assert.equal(cols.get(4).key, 'EPU.EPU_MAINLAND:CHN');
  const three = risk.epuCountryColumns(['Year', 'Month', 'China', 'SCMP China', 'Mainland China']);
  assert.deepEqual(
    [...three.values()].map((c) => c.key),
    ['EPU.EPU:CHN', 'EPU.EPU_SCMP:CHN', 'EPU.EPU_MAINLAND:CHN'],
  );
});

test('CBN: one central rate per currency and date; the last posted record wins', () => {
  const out = parseCbnFx([
    { id: 900, currency: 'US DOLLAR', ratedate: '2019-03-01', centralrate: '306.90' },
    { id: 905, currency: 'US DOLLAR', ratedate: '2019-03-01', centralrate: '306.95' },
    { id: 901, currency: 'US  Dollar ', ratedate: '2019-03-01T00:00:00', centralrate: '306.80' },
    { id: 899, currency: 'US DOLLAR', ratedate: '2019-02-28', centralrate: '306.85' },
    { id: 902, currency: 'EURO', ratedate: '2019-03-01', centralrate: '349.1' },
  ]);
  assertUniqueKeys(out, 'CBN');
  const usd = out.filter((r) => r.series_key === 'CBN.FX:US_DOLLAR');
  assert.deepEqual(
    usd.map((r) => [r.period, r.value]),
    [
      ['2019-03-01', 306.95],
      ['2019-02-28', 306.85],
    ],
  );
  assert.equal(usd[0].series_name, 'NGN per US DOLLAR (CBN central rate)');
  assert.equal(out.filter((r) => r.series_key === 'CBN.FX:EURO').length, 1);
  // Without ids the first listed (newest first in the feed) is kept.
  const noIds = parseCbnFx([
    { currency: 'YEN', ratedate: '2018-01-02', centralrate: '2.71' },
    { currency: 'YEN', ratedate: '2018-01-02', centralrate: '2.70' },
  ]);
  assert.deepEqual(
    noIds.map((r) => r.value),
    [2.71],
  );
});

const FEWS_HEADER =
  'country_code,market,market_id,product,product_source,unit,currency,price_type,period_date,value';
test('FEWS NET: weekly prices average into one monthly row per series', () => {
  const csv = [
    FEWS_HEADER,
    'NE,Niamey,101,Millet (Pearl),Local,kg,XOF,Retail,2026-03-02,300',
    'NE,Niamey,101,Millet (Pearl),Local,kg,XOF,Retail,2026-03-09,310',
    'NE,Niamey,101,Millet (Pearl),Local,kg,XOF,Retail,2026-03-16,320',
    'NE,Niamey,101,Millet (Pearl),Local,kg,XOF,Retail,2026-03-23,330',
    'NE,Niamey,101,Millet (Pearl),Local,kg,XOF,Retail,2026-04-06,340',
  ].join('\n');
  const out = parseFewsCsv(csv, 'NE');
  assertUniqueKeys(out, 'FEWS weekly');
  assert.deepEqual(
    out.map((r) => [r.series_key, r.period, r.value]),
    [
      ['FEWS:NE.Niamey.Millet (Pearl).kg.XOF.Retail', '2026-03', 315],
      ['FEWS:NE.Niamey.Millet (Pearl).kg.XOF.Retail', '2026-04', 340],
    ],
  );
  assert.equal(out[0].country_iso3, 'NER');
  assert.equal(out[0].series_name, 'Millet (Pearl) price, Niamey');
});

test('FEWS NET: local and imported product in one market stay two series', () => {
  const csv = [
    FEWS_HEADER,
    'NG,Kano,7,Rice (Milled),Local,50_kg,NGN,Wholesale,2026-03-01,60000',
    'NG,Kano,7,Rice (Milled),Import,50_kg,NGN,Wholesale,2026-03-01,85000',
    'NG,Kano,7,Rice (Milled),Import,50_kg,NGN,Wholesale,2026-03-15,87000',
    'NG,Kano,7,Maize Grain (White),Local,kg,NGN,Retail,2026-03-01,700',
  ].join('\n');
  const out = parseFewsCsv(csv, 'NG');
  assertUniqueKeys(out, 'FEWS product source');
  const byKey = Object.fromEntries(out.map((r) => [r.series_key, r]));
  assert.equal(byKey['FEWS:NG.Kano.Rice (Milled).50_kg.NGN.Wholesale.Local'].value, 60000);
  assert.equal(byKey['FEWS:NG.Kano.Rice (Milled).50_kg.NGN.Wholesale.Import'].value, 86000);
  assert.equal(
    byKey['FEWS:NG.Kano.Rice (Milled).50_kg.NGN.Wholesale.Import'].series_name,
    'Rice (Milled) price, Kano (Import)',
  );
  // A key that covers one series is unchanged, so stored rows keep their key.
  assert.ok(byKey['FEWS:NG.Kano.Maize Grain (White).kg.NGN.Retail']);
  assert.equal(out.length, 3);
});

test('FEWS NET: two markets with one name are told apart by market id only', () => {
  const csv = [
    FEWS_HEADER + ',dataseries',
    'SO,Garowe,11,Sorghum (Red),Local,kg,SOS,Retail,2026-03-01,8000,501',
    'SO,Garowe,12,Sorghum (Red),Local,kg,SOS,Retail,2026-03-01,8500,502',
  ].join('\n');
  const out = parseFewsCsv(csv, 'SO');
  assertUniqueKeys(out, 'FEWS market id');
  assert.deepEqual(out.map((r) => r.series_key).sort(), [
    'FEWS:SO.Garowe.Sorghum (Red).kg.SOS.Retail.11',
    'FEWS:SO.Garowe.Sorghum (Red).kg.SOS.Retail.12',
  ]);
});

test('FEWS NET: without identity columns, repeats in a month are averaged, never doubled', () => {
  const csv = [
    'market,product,unit,currency,price_type,period_date,value',
    'Mogadishu,Wheat Flour,kg,SOS,Retail,2026-03-01,20000',
    'Mogadishu,Wheat Flour,kg,SOS,Retail,2026-03-15,21000',
  ].join('\n');
  const out = parseFewsCsv(csv, 'SO');
  assert.deepEqual(
    out.map((r) => [r.series_key, r.period, r.value]),
    [['FEWS:SO.Mogadishu.Wheat Flour.kg.SOS.Retail', '2026-03', 20500]],
  );
});

/* ---------------------------------------------------------------- sync fixes (Sonar macro wiring) */

const oneBatchAdapter = (source, fetchBatch, batches = [{ label: 'one' }]) => ({
  source,
  minIntervalMs: 0,
  attribution: 'test',
  buildBatches: () => batches,
  fetchBatch,
});
const serverError = (msg = '500 from sdmx.example.org after 4 attempts') =>
  Object.assign(new Error(msg), { retryable: true });

test('engine: a pass where every batch failed is not complete, so the next run retries', async () => {
  const db = strictDb();
  const states = new Map();
  const origFrom = db.from.bind(db);
  db.from = (table) => {
    const q = origFrom(table);
    if (table !== 'macro_ingest_state') return q;
    const up = q.upsert;
    q.upsert = async (rows) => {
      for (const r of [].concat(rows)) states.set(r.source, { ...states.get(r.source), ...r });
      return up(rows);
    };
    return q;
  };
  const adapter = oneBatchAdapter(
    'allfail',
    async () => {
      throw new Error('Pink Sheet: monthly file link not found');
    },
    [{ label: 'a' }, { label: 'b' }],
  );
  const r = await runSync(db, adapter, { force: true });
  assert.equal(r.passComplete, false);
  assert.equal(r.allBatchesFailed, true);
  assert.equal(r.errors.length, 2);
  const st = states.get('allfail');
  assert.equal(st.pass_completed_at, null);
  assert.equal(st.pass_started_at, null);
  assert.equal(st.cursor, 0);
  // A pass with one good batch is complete as before.
  let n = 0;
  const half = oneBatchAdapter(
    'halffail',
    async () => {
      n += 1;
      if (n === 1) throw new Error('bad batch');
      return [{ series_key: 'A', period: '2026-01', value: 1 }];
    },
    [{ label: 'a' }, { label: 'b' }],
  );
  const r2 = await runSync(db, half, { force: true });
  assert.equal(r2.passComplete, true);
  assert.ok(states.get('halffail').pass_completed_at);
});

test('engine: a run that ends on a server error records a growing streak; recovery clears it', async () => {
  assert.equal(isServerError('500 from esploradati.istat.it after 5 attempts'), true);
  assert.equal(isServerError('fetch failed'), true);
  assert.equal(isServerError('400 from rplumber.ilo.org: invalid dataset'), false);
  assert.equal(isServerError('429 from api.gdeltproject.org after 4 attempts'), false);
  assert.equal(serverErrorStreak(withStreak(3, '500 from x')), 3);
  assert.equal(serverErrorStreak('500 from x'), 0);
  assert.equal(withStreak(2, withStreak(1, 'boom')), '[server-error x2] boom');

  // In-memory state that runSync reads back on every run.
  const state = new Map();
  const db = {
    from(table) {
      const q = {
        select: () => q,
        eq: (_c, v) => ((q.key = v), q),
        maybeSingle: async () => ({ data: state.get(q.key) || null, error: null }),
        upsert: async (rows) => {
          if (table === 'macro_ingest_state')
            for (const r of [].concat(rows)) state.set(r.source, { ...state.get(r.source), ...r });
          return { error: null };
        },
      };
      return q;
    },
  };
  let down = true;
  const adapter = oneBatchAdapter('istat-like', async () => {
    if (down) throw serverError();
    return [{ series_key: 'A', period: '2026-01', value: 1 }];
  });
  const r1 = await runSync(db, adapter, { force: true });
  assert.equal(r1.serverErrorStreak, 1);
  assert.equal(r1.passComplete, false);
  assert.match(state.get('istat-like').last_error, /^\[server-error x1\] 500 from/);
  const r2 = await runSync(db, adapter, { force: true });
  assert.equal(r2.serverErrorStreak, 2);
  assert.equal(serverErrorStreak(state.get('istat-like').last_error), 2);
  down = false;
  const r3 = await runSync(db, adapter, { force: true });
  assert.equal(r3.passComplete, true);
  assert.equal(r3.serverErrorStreak, undefined);
  assert.equal(serverErrorStreak(state.get('istat-like').last_error), 0);
  // A non-server failure never starts a streak.
  const bad = oneBatchAdapter('bad-request', async () => {
    throw new Error('400 from api.example.org: invalid id');
  });
  const r4 = await runSync(db, bad, { force: true });
  assert.equal(r4.serverErrorStreak, undefined);
  assert.equal(serverErrorStreak(state.get('bad-request').last_error), 0);
});

test('rotator: backs off 3 h after a server error, doubling to 24 h; force with only ignores it', async () => {
  const at = '2026-11-06T00:00:00.000Z';
  const hours = (n) =>
    (backoffUntil({ last_error: withStreak(n, '500 from x'), updated_at: at }) - new Date(at)) /
    3600e3;
  assert.deepEqual([1, 2, 3, 4, 5, 9].map(hours), [3, 6, 12, 24, 24, 24]);
  assert.equal(backoffUntil({ last_error: '400 from x', updated_at: at }), null);
  assert.equal(backoffUntil(null), null);

  const stateRows = [
    { source: 'flaky', last_error: withStreak(2, '500 from x'), updated_at: at },
    { source: 'healthy', last_error: null, updated_at: at },
  ];
  const ran = [];
  const db = {
    from: () => ({ select: async () => ({ data: stateRows, error: null }) }),
  };
  const adapters = {
    flaky: { source: 'flaky', buildBatches: () => [] },
    healthy: { source: 'healthy', buildBatches: () => [] },
  };
  // buildBatches() returning [] makes runSync skip before any database call.
  const wrap = (a) => ({
    ...a,
    buildBatches: () => (ran.push(a.source), []),
  });
  const list = { flaky: wrap(adapters.flaky), healthy: wrap(adapters.healthy) };
  const inside = await runDue(db, list, { env: {}, now: new Date('2026-11-06T05:00:00Z') });
  const flaky = inside.find((r) => r.source === 'flaky');
  assert.equal(flaky.skipped, true);
  assert.match(flaky.reason, /backing off after server errors until 2026-11-06T06:00:00/);
  assert.deepEqual(ran, ['healthy']);
  // Past the window it runs again.
  ran.length = 0;
  await runDue(db, list, { env: {}, now: new Date('2026-11-06T07:00:00Z') });
  assert.deepEqual(ran.sort(), ['flaky', 'healthy']);
  // A manual ?only=flaky&force=1 run ignores the backoff.
  ran.length = 0;
  await runDue(db, list, {
    env: {},
    only: ['flaky'],
    force: true,
    now: new Date('2026-11-06T05:00:00Z'),
  });
  assert.deepEqual(ran, ['flaky']);
});

test('macro-sync cron refreshes macro_series_latest after writing rows, bounded and never fatal', () => {
  const src = readFileSync(
    new URL('../src/app/api/cron/macro-sync/route.js', import.meta.url),
    'utf8',
  );
  assert.match(src, /rpc\('refresh_macro_series_latest'\)/);
  assert.match(src, /withTimeout\(admin\.rpc\('refresh_macro_series_latest'\), 60000/);
  assert.match(src, /wrote\.length \? await refreshLatest\(admin\)/);
  const mig = readFileSync(
    new URL('../supabase/migrations/20261108120000_sonar_macro_series_latest.sql', import.meta.url),
    'utf8',
  );
  assert.match(mig, /create materialized view if not exists public\.macro_series_latest/);
  assert.match(mig, /refresh materialized view concurrently public\.macro_series_latest/);
  assert.match(
    mig,
    /grant execute on function public\.refresh_macro_series_latest\(\) to service_role/,
  );
});

test('World Bank: debt codes go through WDI (source 2), one batch per indicator', () => {
  const debt = WB_INDICATORS.filter((i) => i.id.startsWith('DT.'));
  assert.deepEqual(
    debt.map((i) => i.id),
    ['DT.DOD.DECT.CD', 'DT.DOD.DECT.GN.ZS', 'DT.TDS.DECT.EX.ZS', 'DT.DOD.DSTC.ZS'],
  );
  // source=6 answers "not found" for every one of these; source 2 serves them.
  assert.ok(debt.every((i) => i.source === 2));
  assert.ok(WB_INDICATORS.every((i) => i.source !== 6));
  const batches = worldbankExt.buildBatches(new Date('2026-11-06T00:00:00Z'));
  assert.equal(batches.length, WB_INDICATORS.length);
  assert.deepEqual(
    batches.map((b) => b.label),
    WB_INDICATORS.map((i) => i.id),
  );
});

test('ECB: AMECO rows take their country from the key; aggregates stay null', () => {
  assert.equal(amecoIso3('ECB.AME:A.AUT.1.0.0.0.ZUTN'), 'AUT');
  assert.equal(amecoIso3('ECB.AME:A.DEU.1.0.0.0.ZUTN'), 'DEU');
  assert.equal(amecoIso3('ECB.AME:A.ROM.1.0.0.0.ZUTN'), 'ROU');
  assert.equal(amecoIso3('ECB.AME:A.EA20.1.0.0.0.ZUTN'), null);
  assert.equal(amecoIso3('ECB.AME:A.EU27.1.0.0.0.ZUTN'), null);
  assert.equal(amecoIso3('ECB.FM:B.U2.EUR.4F.KR.DFR.LEV'), null);
});

test('BCB: SGS 432 is the policy rate (% a year); an XML error page is retried, not skipped', () => {
  const selic = BCB_SERIES.find((s) => s.code === 432);
  assert.deepEqual([selic.name, selic.unit], ['Selic target rate', '% p.a.']);
  assert.equal(BCB_SERIES.find((s) => s.code === 11).unit, '% p.d.');
  const b = { code: 432, name: selic.name, unit: selic.unit, freq: 'D' };
  const rows = parseSgs('[{"data":"05/11/2026","valor":"13.75"}]', b);
  assert.deepEqual(
    [rows[0].series_key, rows[0].period, rows[0].value, rows[0].country_iso3],
    ['SGS.432', '2026-11-05', 13.75, 'BRA'],
  );
  assert.throws(
    () => parseSgs('<?xml version="1.0"?><error/>', b),
    (e) => e.retryable === true && /temporary error page/.test(e.message),
  );
  assert.throws(
    () => parseSgs('{"error":"O sistema aceita uma janela de consulta de, no maximo, 10 anos"}', b),
    (e) => !e.retryable && /10 anos/.test(e.message),
  );
  assert.deepEqual(parseSgs('', b), []);
});

const GPR_FILE = new URL('./fixtures/data_gpr_export.xls', import.meta.url);
test(
  'GPR: the real export parses (skips when the fixture file is absent)',
  { skip: !existsSync(GPR_FILE) },
  async () => {
    const wb = await F.readWorkbook(readFileSync(GPR_FILE));
    const rows = risk.parseGprSheet(Object.values(wb)[0]);
    assert.ok(rows.some((r) => r.series_key === 'GPR.GPR:WLD'));
    assert.ok(rows.some((r) => r.series_key === 'GPR.GPRC:UKR' && r.country_iso3 === 'UKR'));
    assert.ok(rows.every((r) => /^\d{4}-\d{2}$/.test(r.period)));
  },
);

/* ---------------------------------------------------------------- registry and rotator */

test('every adapter honours the contract and source ids are unique', () => {
  for (const [key, a] of Object.entries(ADAPTERS)) {
    assert.equal(key, a.source);
    assert.equal(typeof a.buildBatches, 'function', key);
    assert.equal(typeof a.fetchBatch, 'function', key);
    assert.ok(a.attribution, `${key} attribution`);
    const d = new Date('2026-11-03T00:00:00Z');
    assert.deepEqual(a.buildBatches(d), a.buildBatches(d), `${key} batches are deterministic`);
  }
  for (const k of DEDICATED_CRON) assert.equal(ADAPTERS[k].dedicatedCron, true);
});

test('rotator skips dedicated, disabled and missing-env adapters', async () => {
  assert.equal(adapterStatus(ADAPTERS.bcb, {}), 'dedicated cron');
  assert.equal(adapterStatus(ADAPTERS.banrep, {}), 'disabled');
  assert.match(adapterStatus(ADAPTERS.ucdp, {}), /UCDP_ACCESS_TOKEN/);
  assert.equal(adapterStatus(ADAPTERS.ucdp, { UCDP_ACCESS_TOKEN: 't' }), null);
  const fake = {
    a: { source: 'a', enabled: false },
    b: { source: 'b', dedicatedCron: true },
    c: { source: 'c', requiresEnv: ['NOPE'] },
  };
  const res = await runDue({}, fake, { env: {}, now: new Date('2026-11-03T00:00:00Z') });
  assert.deepEqual(
    res.map((r) => r.reason),
    ['disabled', 'dedicated cron', 'missing env NOPE'],
  );
});

/* ---------------------------------------------------------------- sanctions */

const EU_XML = `<?xml version="1.0"?><export>
  <sanctionEntity logicalId="13" euReferenceNumber="EU.27.28">
    <regulation programme="IRQ" publicationDate="2003-07-08"/>
    <subjectType code="person"/>
    <nameAlias wholeName="Saddam Hussein Al-Tikriti" strong="true"/>
    <nameAlias wholeName="Abu Ali" strong="false"/>
    <citizenship countryIso2Code="IQ"/>
  </sanctionEntity>
  <sanctionEntity logicalId="99"><regulation programme="RUS"/><subjectType code="enterprise"/><nameAlias wholeName="Acme Bank" strong="true"/><address countryIso2Code="RU"/></sanctionEntity>
</export>`;
const UN_XML = `<CONSOLIDATED_LIST><INDIVIDUALS><INDIVIDUAL><DATAID>6908555</DATAID><FIRST_NAME>RI</FIRST_NAME><SECOND_NAME>WON HO</SECOND_NAME><UN_LIST_TYPE>DPRK</UN_LIST_TYPE><REFERENCE_NUMBER>KPi.033</REFERENCE_NUMBER><LISTED_ON>2016-11-30</LISTED_ON><NATIONALITY><VALUE>Democratic People's Republic of Korea</VALUE></NATIONALITY><INDIVIDUAL_ALIAS><ALIAS_NAME>Ri Won-ho</ALIAS_NAME></INDIVIDUAL_ALIAS></INDIVIDUAL></INDIVIDUALS><ENTITIES><ENTITY><DATAID>110</DATAID><FIRST_NAME>AL-QAIDA</FIRST_NAME><UN_LIST_TYPE>Al-Qaida</UN_LIST_TYPE><LISTED_ON>2001-10-06</LISTED_ON></ENTITY></ENTITIES></CONSOLIDATED_LIST>`;
const UK_CSV = `Report Date: 03-Nov-2026
Unique ID,OFSI Group ID,Name 6,Name 1,Name 2,Name type,Regime Name,Designation Type,Date Designated,Nationality(/ies),Address Country
RUS0001,1,PUTIN,Vladimir,Vladimirovich,Primary name,Russia,Individual,25/02/2022,Russia,
RUS0001,1,PUTIN,Vladimir,,Alias,Russia,Individual,25/02/2022,Russia,
IRQ0002,2,Rafidain Bank,,,Primary name,Iraq,Entity,01/01/2004,,Iraq
`;

test('EU FSF XML: names, aliases, type, regimes, countries, listing date', () => {
  const rows = parseEuXml(EU_XML);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    list_source: 'eu',
    source_id: '13',
    name: 'Saddam Hussein Al-Tikriti',
    entry_type: 'individual',
    regimes: ['IRQ'],
    countries: ['IRQ'],
    aliases: ['Abu Ali'],
    listed_on: '2003-07-08',
  });
  assert.equal(rows[1].entry_type, 'entity');
  assert.deepEqual(rows[1].countries, ['RUS']);
});

test('UN consolidated XML: individuals and entities', () => {
  const rows = parseUnXml(UN_XML);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'RI WON HO');
  assert.deepEqual(rows[0].countries, ['PRK']);
  assert.deepEqual(rows[0].aliases, ['Ri Won-ho']);
  assert.equal(rows[1].entry_type, 'entity');
});

test('UK FCDO CSV: rows grouped by Unique ID, title line skipped', () => {
  const rows = parseUkCsv(UK_CSV);
  assert.equal(rows.length, 2);
  const p = rows.find((r) => r.source_id === 'RUS0001');
  assert.equal(p.entry_type, 'individual');
  assert.equal(p.listed_on, '2022-02-25');
  assert.deepEqual(p.countries, ['RUS']);
  assert.equal(rows.find((r) => r.source_id === 'IRQ0002').countries[0], 'IRQ');
});

test('sanctions sync refuses a short list and never marks removals', async () => {
  const db = { from: () => assert.fail('no database call on a short list') };
  const r = await syncList(db, 'un', { fetchText: async () => UN_XML });
  assert.equal(r.ok, false);
  assert.match(r.error, /minimum 500/);
});

/* ---------------------------------------------------------------- Sonar macro-indicators */

const macro = await import('../src/lib/sonar/sources/macro-indicators.js');
const { CORE_SOURCES, findMissingAdapters } = await import('../src/lib/sonar/sources/registry.js');
const { getSonarEntitlements } = await import('../src/lib/sonar/entitlements.js');
const { corporaForDatasets } = await import('../src/lib/sonar/retrieval.js');

test('macro-indicators v2: a current-year IMF value is a labelled projection, never observed', async () => {
  const { presentRow, FAMILY_BY_ID } = await import('../src/lib/sonar/macro/catalog.js');
  const row = {
    source: 'imf',
    series_key: 'IMF.WEO:dataflow.IRN.NGDP_RPCH.A',
    country_iso3: 'IRN',
    period: '2026',
    value: -1.7,
    year_ago_period: '2025',
    year_ago_value: 0.3,
  };
  const s = presentRow(row, FAMILY_BY_ID.gdp_growth, { now: new Date('2026-11-03T00:00:00Z') });
  assert.equal(s.period, '2025');
  assert.equal(s.value, 0.3);
  assert.deepEqual(s.projection, { period: '2026', value: -1.7 });
});

test('macro-indicators v2: search reads macro_series_latest through the injected db for the routed countries', async () => {
  const seen = [];
  const db = {
    from: (table) => {
      const q = {
        select: () => q,
        eq: (c, v) => (seen.push(`${table}.${c}=${v}`), q),
        in: () => q,
        like: () => q,
        gte: () => q,
        order: () => q,
        limit: () => q,
        then: (res) => res({ data: [], error: null }),
      };
      return q;
    },
  };
  await macro.default.search(
    { raw: "How is Iran's economy doing?", countries: ['IR'], themes: [] },
    { db },
  );
  assert.ok(seen.includes('macro_series_latest.country_iso3=IRN'), seen.join(', '));
  assert.equal(macro.default.isRelevant({ raw: 'Who owns Palantir?', countries: [] }), false);
});

test('Sonar wiring: core source, free entitlement, corpus, coverage', () => {
  assert.ok(CORE_SOURCES['macro-indicators']);
  assert.ok(getSonarEntitlements({ planTier: 0 }).datasets.includes('macro'));
  assert.ok(corporaForDatasets(['macro']).includes('macro'));
  assert.deepEqual(findMissingAdapters(), []);
});
