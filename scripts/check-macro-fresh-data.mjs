/**
 * Fresher data for the currency framework (Part E): ECB daily reference-rate crosses against
 * the dollar, BIS daily policy rates, IMF IRFCL official reserve assets, the optional CBRT
 * EVDS adapter, and how the catalogue chooses between daily, weekly and monthly series.
 * Network and database are stubbed; fixtures follow each source's documented shape.
 *   npm run test:macro-fresh
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const E = await import('../src/lib/macro-sync/sources/europe.js');
const B = await import('../src/lib/macro-sync/sources/bis.js');
const I = await import('../src/lib/macro-sync/sources/imf.js');
const V = await import('../src/lib/macro-sync/sources/evds.js');
const { yearsBefore } = await import('../src/lib/macro-sync/formats.js');
const { ADAPTERS } = await import('../src/lib/macro-sync/index.js');
const { adapterStatus } = await import('../src/lib/macro-sync/rotate.js');
const C = await import('../src/lib/sonar/macro/catalog.js');
const S = await import('../src/lib/sonar/macro/series-store.js');

const NOW = new Date('2026-11-06T00:00:00Z');
const PASS = new Date('2026-11-06T05:00:00Z');

/** A latest row as macro_series_latest returns it. */
const L = (source, series_key, country_iso3, period, value, extra = {}) => ({
  source,
  series_key,
  country_iso3,
  period,
  value,
  year_ago_period: null,
  year_ago_value: null,
  ...extra,
});

/** A fetchWithRetry stand-in: answers `body` and records each call. */
function stubFetch(body, { status = 200 } = {}) {
  const calls = [];
  const fn = async (url, opts = {}) => {
    calls.push({ url, opts });
    return { status, ok: status < 400, text: async () => body };
  };
  fn.calls = calls;
  return fn;
}

/* ---------------------------------------------------------------- ECB daily crosses */

test('ECB: local per USD is (local per EUR) / (USD per EUR) on the same day', () => {
  assert.equal(E.usdCross(50.0, 1.08), 46.296296);
  assert.ok(Math.abs(E.usdCross(50.0, 1.08) - 50 / 1.08) < 1e-6);
  assert.equal(E.usdCross(160.5, 1.07), Number((160.5 / 1.07).toPrecision(8)));
  assert.equal(E.usdCross(null, 1.08), null);
  assert.equal(E.usdCross(50, 0), null);
  assert.equal(E.usdCross(-1, 1.08), null);
  assert.equal(E.usdCross('x', 1.08), null);
});

const ECB_DAILY_CSV = [
  'KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE',
  'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-11-04,1.08',
  'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-11-05,1.10',
  'EXR.D.TRY.EUR.SP00.A,D,TRY,EUR,SP00,A,2026-11-04,50.0',
  'EXR.D.TRY.EUR.SP00.A,D,TRY,EUR,SP00,A,2026-11-05,50.6',
  'EXR.D.TRY.EUR.SP00.A,D,TRY,EUR,SP00,A,2026-11-06,50.9',
  'EXR.D.JPY.EUR.SP00.A,D,JPY,EUR,SP00,A,2026-11-04,165.24',
  'EXR.D.BGN.EUR.SP00.A,D,BGN,EUR,SP00,A,2026-11-04,1.9558',
  'EXR.D.XYZ.EUR.SP00.A,D,XYZ,EUR,SP00,A,2026-11-04,3.0',
  'EXR.D.GBP.EUR.SP00.A,D,GBP,EUR,SP00,A,2026-11-04,',
  '',
].join('\n');

test('ECB: the daily batch fetches D..EUR.SP00.A for two years and stores only USD crosses', async () => {
  const batches = ADAPTERS.ecb.buildBatches(PASS);
  assert.equal(batches.length, E.ECB_QUERIES.length + 1);
  const daily = batches.at(-1);
  assert.equal(daily.key, 'D..EUR.SP00.A');
  assert.equal(daily.daily, true);
  assert.equal(daily.since, '2024-11-06');
  assert.equal(daily.since, yearsBefore(PASS, E.ECB_DAILY_YEARS));
  // The existing batches keep their place, so an in-progress pass keeps its cursor.
  assert.deepEqual(
    batches.slice(0, -1).map((b) => b.key),
    E.ECB_QUERIES.map((q) => q.key),
  );
  assert.equal(ADAPTERS.ecb.refreshAfterDays, 1);

  const fetch = stubFetch(ECB_DAILY_CSV);
  const rows = await ADAPTERS.ecb.fetchBatch(daily, fetch);
  assert.match(
    fetch.calls[0].url,
    /^https:\/\/data-api\.ecb\.europa\.eu\/service\/data\/EXR\/D\.\.EUR\.SP00\.A\?format=csvdata&detail=dataonly&startPeriod=2024-11-06$/,
  );
  const byKey = (k, p) => rows.find((r) => r.series_key === k && r.period === p);
  const tr = byKey('ECB.EXRUSD:D.TRY', '2026-11-04');
  assert.deepEqual(tr, {
    series_key: 'ECB.EXRUSD:D.TRY',
    country_iso3: 'TUR',
    period: '2026-11-04',
    value: 46.296296,
    series_name: 'TRY per US dollar (ECB reference rate cross)',
    unit: 'TRY per USD',
    frequency: 'D',
    dataset: 'EXR',
  });
  assert.equal(byKey('ECB.EXRUSD:D.TRY', '2026-11-05').value, Number((50.6 / 1.1).toPrecision(8)));
  assert.equal(byKey('ECB.EXRUSD:D.JPY', '2026-11-04').country_iso3, 'JPN');
  // No USD rate on 6 Nov: no cross. USD itself, BGN (euro member), unknown codes, blanks: none.
  assert.equal(byKey('ECB.EXRUSD:D.TRY', '2026-11-06'), undefined);
  for (const ccy of ['USD', 'BGN', 'XYZ', 'GBP', 'EUR'])
    assert.ok(!rows.some((r) => r.series_key === `ECB.EXRUSD:D.${ccy}`), ccy);
  assert.equal(rows.length, 3); // TRY on 4 and 5 Nov, JPY on 4 Nov
  // The monthly batch is unchanged: raw per-euro rows under ECB.EXR.
  const monthly = await ADAPTERS.ecb.fetchBatch(
    batches[0],
    stubFetch(
      'KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE\nEXR.M.USD.EUR.SP00.A,M,USD,EUR,SP00,A,2026-10,1.09\n',
    ),
  );
  assert.equal(monthly[0].series_key, 'ECB.EXR:M.USD.EUR.SP00.A');
});

test('ECB: every mapped currency is a real ISO3 economy and never a euro member', () => {
  for (const [ccy, iso3] of Object.entries(E.ECB_CCY_ISO3)) {
    assert.match(ccy, /^[A-Z]{3}$/);
    assert.match(iso3, /^[A-Z]{3}$/);
    assert.equal(C.EURO_AREA.has(iso3), false, `${ccy} -> ${iso3}`);
  }
  assert.equal(E.ECB_CCY_ISO3.USD, undefined);
  assert.equal(E.ECB_CCY_ISO3.EUR, undefined);
  assert.equal(E.ECB_CCY_ISO3.TRY, 'TUR');
});

/* ---------------------------------------------------------------- BIS daily policy rates */

test('BIS: WS_CBPOL daily for the last three years, after the monthly flows', async () => {
  const batches = ADAPTERS.bis.buildBatches(PASS);
  assert.equal(batches[0].key, 'M.');
  assert.equal(batches[0].since, '2000');
  const daily = batches.at(-1);
  assert.deepEqual([daily.flow, daily.key, daily.since], ['WS_CBPOL', 'D.', '2023-11-06']);
  assert.equal(new Set(batches.map((b) => b.label)).size, batches.length, 'labels are unique');
  const fetch = stubFetch(
    'FREQ,REF_AREA,TIME_PERIOD,OBS_VALUE\nD,TR,2026-11-03,39.5\nD,TR,2026-11-04,38\nD,XM,2026-11-04,2\n',
  );
  const rows = await ADAPTERS.bis.fetchBatch(daily, fetch);
  assert.match(
    fetch.calls[0].url,
    /\/api\/v1\/data\/WS_CBPOL\/D\.\/all\?startPeriod=2023-11-06&detail=dataonly$/,
  );
  assert.deepEqual(
    rows.map((r) => [r.series_key, r.country_iso3, r.period, r.value, r.frequency]),
    [
      ['WS_CBPOL:D.TR', 'TUR', '2026-11-03', 39.5, 'D'],
      ['WS_CBPOL:D.TR', 'TUR', '2026-11-04', 38, 'D'],
      ['WS_CBPOL:D.XM', null, '2026-11-04', 2, 'D'],
    ],
  );
  // The monthly batch still starts in 2000.
  const m = stubFetch('FREQ,REF_AREA,TIME_PERIOD,OBS_VALUE\nM,TR,2026-09,40.5\n');
  await ADAPTERS.bis.fetchBatch(batches[0], m);
  assert.match(m.calls[0].url, /\/WS_CBPOL\/M\.\/all\?startPeriod=2000&/);
});

/* ---------------------------------------------------------------- IMF IRFCL reserves */

test('IMF: IRFCL official reserve assets, every sector, monthly, US dollars', async () => {
  const flow = I.FLOWS.find((f) => f.flow === 'IRFCL');
  assert.deepEqual([flow.agency, flow.key], ['IMF.STA', '*.IRFCLDT1_IRFCL65_USD.*.M']);
  const batch = ADAPTERS.imf.buildBatches(PASS).find((b) => b.flow === 'IRFCL');
  const fetch = stubFetch(
    [
      'COUNTRY,INDICATOR,SECTOR,FREQUENCY,TIME_PERIOD,OBS_VALUE',
      'TUR,IRFCLDT1_IRFCL65_USD,S1XS1311,M,2026-M08,155234000000',
      'TUR,IRFCLDT1_IRFCL65_USD,S1XS1311,M,2026-M09,158102000000',
      'ARG,IRFCLDT1_IRFCL65_USD,S1X,M,2026-M09,41000000000',
      'G163,IRFCLDT1_IRFCL65_USD,S1XS1311,M,2026-M09,1500000000000',
      '',
    ].join('\n'),
  );
  const rows = await ADAPTERS.imf.fetchBatch(batch, fetch);
  assert.match(
    fetch.calls[0].url,
    /^https:\/\/api\.imf\.org\/external\/sdmx\/3\.0\/data\/dataflow\/IMF\.STA\/IRFCL\/\+\/\*\.IRFCLDT1_IRFCL65_USD\.\*\.M\?/,
  );
  assert.match(decodeURIComponent(fetch.calls[0].url), /c\[TIME_PERIOD\]=ge:2015-M01/);
  assert.deepEqual(rows[1], {
    series_key: 'IMF.IRFCL:TUR.IRFCLDT1_IRFCL65_USD.S1XS1311.M',
    country_iso3: 'TUR',
    period: '2026-09',
    value: 158102000000,
    series_name: 'Official reserve assets in US dollars (IMF reserves data template)',
    unit: 'US dollars',
    frequency: 'M',
    dataset: 'IMF.STA/IRFCL',
  });
  assert.equal(rows[2].country_iso3, 'ARG');
  assert.equal(rows[3].country_iso3, null, 'aggregates stay null');
  // Other IMF flows keep "{name}: {indicator}" names.
  const cpi = ADAPTERS.imf.buildBatches(PASS).find((b) => b.flow === 'CPI');
  const cpiRows = await ADAPTERS.imf.fetchBatch(
    cpi,
    stubFetch(
      'COUNTRY,INDEX_TYPE,COICOP,TYPE,FREQUENCY,TIME_PERIOD,OBS_VALUE\nTUR,CPI,_T,IX,M,2026-M09,137.2\n',
    ),
  );
  assert.equal(cpiRows[0].series_name, 'Consumer price index');
});

/* ---------------------------------------------------------------- CBRT EVDS */

test('EVDS: skipped until EVDS_API_KEY is set', () => {
  assert.deepEqual(ADAPTERS.cbrt.requiresEnv, ['EVDS_API_KEY']);
  assert.equal(adapterStatus(ADAPTERS.cbrt, {}), 'missing env EVDS_API_KEY');
  assert.equal(adapterStatus(ADAPTERS.cbrt, { EVDS_API_KEY: 'k' }), null);
});

test('EVDS: Tarih forms and the JSON response parse to rows; blanks are skipped', () => {
  assert.equal(V.evdsPeriod('04-11-2026'), '2026-11-04');
  assert.equal(V.evdsPeriod('2026-9'), '2026-09');
  assert.equal(V.evdsPeriod('2026-10'), '2026-10');
  assert.equal(V.evdsPeriod('2026-13'), null);
  assert.equal(V.evdsDate('2026-11-06'), '06-11-2026');
  const fx = V.EVDS_SERIES.find((s) => s.code === V.EVDS_USDTRY);
  const rows = V.parseEvds(
    {
      totalCount: 3,
      items: [
        {
          Tarih: '03-11-2026',
          TP_DK_USD_A_YTL: '42.1234',
          UNIXTIME: { $numberLong: '1793660400' },
        },
        { Tarih: '04-11-2026', TP_DK_USD_A_YTL: null },
        { Tarih: '05-11-2026', TP_DK_USD_A_YTL: 42.2 },
      ],
    },
    fx,
  );
  assert.deepEqual(rows, [
    {
      series_key: 'EVDS:TP.DK.USD.A.YTL',
      country_iso3: 'TUR',
      period: '2026-11-03',
      value: 42.1234,
      series_name: 'Turkish lira per US dollar (CBRT indicative buying rate)',
      unit: 'TRY per USD',
      frequency: 'D',
      dataset: 'EVDS',
    },
    { ...rows[1], period: '2026-11-05', value: 42.2 },
  ]);
  const res = V.EVDS_SERIES.find((s) => s.code === V.EVDS_RESERVES);
  const weekly = V.parseEvds({ items: [{ Tarih: '30-10-2026', TP_AB_TOPLAM: '178366' }] }, res);
  assert.deepEqual(
    [weekly[0].period, weekly[0].value, weekly[0].unit, weekly[0].frequency],
    ['2026-10-30', 178366, 'USD millions', 'W'],
  );
  const cpi = V.EVDS_SERIES.find((s) => s.code === V.EVDS_CPI);
  const monthly = V.parseEvds({ items: [{ Tarih: '2026-9', TP_TUKFIY2025_GENEL: '131.52' }] }, cpi);
  assert.deepEqual([monthly[0].period, monthly[0].frequency], ['2026-09', 'M']);
  assert.deepEqual(V.parseEvds({}, cpi), []);
});

test('EVDS: path-style URL, key in a header; an HTML answer (bad key) fails the batch', async () => {
  const batches = ADAPTERS.cbrt.buildBatches(PASS);
  assert.deepEqual(
    batches.map((b) => b.code),
    ['TP.DK.USD.A.YTL', 'TP.AB.TOPLAM', 'TP.TUKFIY2025.GENEL', 'TP.PY.P02.1H'],
  );
  const prev = process.env.EVDS_API_KEY;
  process.env.EVDS_API_KEY = 'test-key';
  try {
    const fetch = stubFetch(
      JSON.stringify({ items: [{ Tarih: '30-10-2026', TP_AB_TOPLAM: '178366' }] }),
    );
    const rows = await ADAPTERS.cbrt.fetchBatch(batches[1], fetch);
    assert.equal(
      fetch.calls[0].url,
      'https://evds3.tcmb.gov.tr/igmevdsms-dis/series=TP.AB.TOPLAM&startDate=06-11-2023&endDate=06-11-2026&type=json',
    );
    assert.equal(fetch.calls[0].opts.headers.key, 'test-key');
    assert.ok(!fetch.calls[0].url.includes('test-key'), 'the key never goes in the URL');
    assert.equal(rows[0].series_key, 'EVDS:TP.AB.TOPLAM');
    await assert.rejects(
      ADAPTERS.cbrt.fetchBatch(batches[0], stubFetch('<!DOCTYPE html><html></html>')),
      (e) => /HTML page/.test(e.message) && !e.retryable,
    );
    await assert.rejects(ADAPTERS.cbrt.fetchBatch(batches[0], stubFetch('nope')), /not JSON/);
  } finally {
    if (prev === undefined) delete process.env.EVDS_API_KEY;
    else process.env.EVDS_API_KEY = prev;
  }
});

/* ---------------------------------------------------------------- catalogue: fx_usd */

const fxFam = C.FAMILY_BY_ID.fx_usd;
const pick = (rows, fam) => C.pickBest(rows, fam, { now: NOW })[0]?.r.series_key;

test('fx_usd: the ECB daily cross is catalogued and named', () => {
  const r = L('ecb', 'ECB.EXRUSD:D.TRY', 'TUR', '2026-11-05', 46.0);
  assert.equal(C.familyOf(r)?.id, 'fx_usd');
  const s = C.presentRow(r, fxFam, { now: NOW });
  assert.equal(s.name, 'TRY per US dollar (ECB reference rate cross)');
  assert.equal(s.unit, 'TRY per USD');
  assert.equal(s.money, false);
  // The euro's monthly rate is still a separate, euro-area statement.
  assert.equal(
    fxFam.name(L('ecb', 'ECB.EXR:M.USD.EUR.SP00.A', null, '2026-10', 1.1)),
    'US dollars per euro (ECB reference rate, monthly average)',
  );
  assert.equal(C.familyOf(L('ecb', 'ECB.EXRUSD:M.TRY', 'TUR', '2026-10', 46)), null);
});

test('fx_usd: a fresher daily cross beats BIS monthly; a stale one does not', () => {
  const bis = L('bis', 'WS_XRU:M.TR.TRY.A', 'TUR', '2026-09', 45.1);
  // Daily is fresher (Nov vs Sep): it wins.
  assert.equal(
    pick([bis, L('ecb', 'ECB.EXRUSD:D.TRY', 'TUR', '2026-11-05', 46.0)], fxFam),
    'ECB.EXRUSD:D.TRY',
  );
  // Same month: the dated print wins over the monthly average.
  assert.equal(
    pick([bis, L('ecb', 'ECB.EXRUSD:D.TRY', 'TUR', '2026-09-30', 45.3)], fxFam),
    'ECB.EXRUSD:D.TRY',
  );
  // Daily stopped in June, BIS is current for September: BIS wins.
  assert.equal(
    pick([bis, L('ecb', 'ECB.EXRUSD:D.TRY', 'TUR', '2026-06-15', 40.0)], fxFam),
    'WS_XRU:M.TR.TRY.A',
  );
  // Daily far older than the monthly (outside the six-month window): BIS wins.
  assert.equal(
    pick([bis, L('ecb', 'ECB.EXRUSD:D.TRY', 'TUR', '2025-12-31', 30.0)], fxFam),
    'WS_XRU:M.TR.TRY.A',
  );
});

test('fx_usd: the national central bank stays first when current (CBRT EVDS, BCB)', () => {
  const rows = [
    L('bis', 'WS_XRU:M.TR.TRY.A', 'TUR', '2026-09', 45.1),
    L('ecb', 'ECB.EXRUSD:D.TRY', 'TUR', '2026-11-05', 46.0),
    L('cbrt', 'EVDS:TP.DK.USD.A.YTL', 'TUR', '2026-11-04', 45.9),
  ];
  assert.equal(pick(rows, fxFam), 'EVDS:TP.DK.USD.A.YTL');
  const s = C.presentRow(rows[2], fxFam, { now: NOW });
  assert.deepEqual(
    [s.name, s.unit],
    ['Turkish lira per US dollar (CBRT indicative buying rate)', 'TRY per USD'],
  );
  assert.equal(
    pick(
      [
        L('bcb', 'SGS.1', 'BRA', '2026-11-04', 5.4),
        L('ecb', 'ECB.EXRUSD:D.BRL', 'BRA', '2026-11-05', 5.41),
      ],
      fxFam,
    ),
    'SGS.1',
  );
});

/* ---------------------------------------------------------------- catalogue: policy_rate */

const polFam = C.FAMILY_BY_ID.policy_rate;

test('policy_rate: BIS daily matches; fresher daily wins, stale daily loses', () => {
  const m = L('bis', 'WS_CBPOL:M.TR', 'TUR', '2026-09', 40.5);
  const d = L('bis', 'WS_CBPOL:D.TR', 'TUR', '2026-11-04', 38);
  assert.equal(C.familyOf(d)?.id, 'policy_rate');
  assert.equal(C.presentRow(d, polFam, { now: NOW }).name, 'Central bank policy rate');
  assert.equal(pick([m, d], polFam), 'WS_CBPOL:D.TR');
  assert.equal(pick([m, { ...d, period: '2026-09-30' }], polFam), 'WS_CBPOL:D.TR');
  assert.equal(pick([m, { ...d, period: '2026-03-31' }], polFam), 'WS_CBPOL:M.TR');
  // One statement, not two: both BIS series carry the same name.
  assert.equal(C.pickBest([m, d], polFam, { now: NOW, max: 3 }).length, 1);
  // The EVDS one-week quotation is held but not stated as the policy rate.
  assert.equal(C.familyOf(L('cbrt', 'EVDS:TP.PY.P02.1H', 'TUR', '2026-11-04', 38)), null);
});

test('policy_rate: the cross-country ranking reads the monthly series only', () => {
  assert.equal(polFam.rank.like, 'WS_CBPOL:M.%');
  const rows = [
    L('bis', 'WS_CBPOL:M.TR', 'TUR', '2026-09', 40.5),
    L('bis', 'WS_CBPOL:D.TR', 'TUR', '2026-11-04', 38),
    L('bis', 'WS_CBPOL:M.BR', 'BRA', '2026-09', 15),
    L('bis', 'WS_CBPOL:D.BR', 'BRA', '2026-11-04', 15),
  ];
  const [item] = S.rankFromRows('policy_rate', rows, { now: NOW });
  const keys = item.meta.ranking.rows.map((x) => x.series_key);
  assert.deepEqual(keys, ['WS_CBPOL:M.TR', 'WS_CBPOL:M.BR'], 'each economy once, monthly');
});

/* ---------------------------------------------------------------- catalogue: fx_reserves */

const resFam = C.FAMILY_BY_ID.fx_reserves;

test('fx_reserves: IMF IRFCL is catalogued in US dollars; one sector per economy', () => {
  const imf = L(
    'imf',
    'IMF.IRFCL:dataflow.TUR.IRFCLDT1_IRFCL65_USD.S1XS1311.M',
    'TUR',
    '2026-09',
    158102000000,
    { unit: 'US dollars', year_ago_period: '2025-09', year_ago_value: 150000000000 },
  );
  assert.equal(C.familyOf(imf)?.id, 'fx_reserves');
  // Keys without the leading "dataflow" segment match too.
  assert.equal(
    C.familyOf(L('imf', 'IMF.IRFCL:TUR.IRFCLDT1_IRFCL65_USD.S1X.M', 'TUR', '2026-09', 1))?.id,
    'fx_reserves',
  );
  // Other IRFCL lines (gold, a different section) are not total reserves.
  assert.equal(
    C.familyOf(
      L('imf', 'IMF.IRFCL:dataflow.TUR.IRFCLDT1_IRFCL56_USD.S1XS1311.M', 'TUR', '2026-09', 1),
    ),
    null,
  );
  const s = C.presentRow(imf, resFam, { now: NOW });
  assert.equal(s.name, 'Official reserve assets (IMF reserves data template)');
  assert.equal(s.unit, 'US$');
  assert.equal(s.money, true);
  const item = C.rowToItem(imf, { attributionOf: S.attributionOf, now: NOW });
  assert.match(
    item.text,
    /Official reserve assets \(IMF reserves data template\), Sep 2026: 158\.1 billion US\$, up 5\.40% from 150\.0 billion in Sep 2025/,
  );
  const s1x = L('imf', 'IMF.IRFCL:dataflow.TUR.IRFCLDT1_IRFCL65_USD.S1X.M', 'TUR', '2026-09', 1);
  assert.equal(pick([s1x, imf], resFam), imf.series_key);
});

test('fx_reserves: national weekly or daily reserves beat IMF monthly when current', () => {
  const imf = L(
    'imf',
    'IMF.IRFCL:dataflow.TUR.IRFCLDT1_IRFCL65_USD.S1XS1311.M',
    'TUR',
    '2026-08',
    1.5e11,
    {
      unit: 'US dollars',
    },
  );
  const evds = L('cbrt', 'EVDS:TP.AB.TOPLAM', 'TUR', '2026-10-30', 178366, {
    unit: 'USD millions',
  });
  assert.equal(pick([imf, evds], resFam), 'EVDS:TP.AB.TOPLAM');
  const s = C.presentRow(evds, resFam, { now: NOW });
  assert.deepEqual([s.name, s.unit], ['CBRT gross official reserves (weekly)', 'USD millions']);
  // A national series long gone stale loses to a current IMF print.
  assert.equal(pick([imf, { ...evds, period: '2025-12-26' }], resFam), imf.series_key);
  // BCB keeps its stored unit.
  const bcb = L('bcb', 'SGS.13621', 'BRA', '2026-10-28', 357114, { unit: 'USD millions' });
  assert.equal(C.presentRow(bcb, resFam, { now: NOW }).unit, 'USD millions');
});

/* ---------------------------------------------------------------- catalogue: CPI */

test('inflation_monthly: CBRT EVDS CPI index is stated as the change on a year earlier', () => {
  const r = L('cbrt', 'EVDS:TP.TUKFIY2025.GENEL', 'TUR', '2026-09', 131.52, {
    year_ago_period: '2025-09',
    year_ago_value: 100,
  });
  const fam = C.FAMILY_BY_ID.inflation_monthly;
  assert.equal(C.familyOf(r)?.id, 'inflation_monthly');
  const s = C.presentRow(r, fam, { now: NOW });
  assert.equal(s.name, 'Consumer prices (TurkStat CPI), change on a year earlier');
  assert.ok(Math.abs(s.value - 31.52) < 1e-9);
  assert.equal(s.unit, '% on a year earlier');
  // National over IMF when both are current.
  const imf = L('imf', 'IMF.CPI:dataflow.TUR.CPI._T.IX.M', 'TUR', '2026-08', 137, {
    year_ago_period: '2025-08',
    year_ago_value: 105,
  });
  assert.equal(pick([imf, r], fam), 'EVDS:TP.TUKFIY2025.GENEL');
});

/* ---------------------------------------------------------------- coverage snapshot */

test('coverage snapshot lists the new prefixes, each stated by its family', () => {
  const snap = JSON.parse(
    readFileSync(new URL('./fixtures/macro-prefixes.json', import.meta.url), 'utf8'),
  );
  const want = { 'ecb|ECB.EXRUSD': 'fx_usd', 'imf|IMF.IRFCL': 'fx_reserves', 'cbrt|EVDS': null };
  for (const [key, fam] of Object.entries(want)) {
    const p = snap.prefixes.find((x) => `${x.source}|${x.prefix}` === key);
    assert.ok(p, key);
    if (fam)
      for (const smp of p.samples)
        assert.equal(C.familyOf({ source: p.source, ...smp })?.id, fam, smp.series_key);
  }
  assert.ok(C.PARTLY_SURFACED['cbrt|EVDS'].note.length > 20);
  assert.equal(C.SOURCE_SHORT.cbrt, 'CBRT');
});
