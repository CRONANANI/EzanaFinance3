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
const { runDue, adapterStatus } = await import('../src/lib/macro-sync/rotate.js');
const { parseGdeltTimeline, aggregateGed } =
  await import('../src/lib/macro-sync/sources/events.js');
const { parseSidra, parseBcra, parseBcrp, parseArgSeries } =
  await import('../src/lib/macro-sync/sources/latam.js');
const { parseSarb, parseCbnFx, parseBoj, parseSingstat, parseMospiCpi } =
  await import('../src/lib/macro-sync/sources/africa-asia.js');
const risk = await import('../src/lib/macro-sync/sources/risk-indices.js');
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

test('macro-indicators: latest observed value wins; IMF projection is labelled, never shown as observed', () => {
  const rows = [
    {
      source: 'imf',
      series_key: 'IMF.WEO:IRN.NGDP_RPCH.A',
      period: '2025',
      value: 0.3,
      series_name: 'Real GDP growth',
      unit: '%',
    },
    {
      source: 'imf',
      series_key: 'IMF.WEO:IRN.NGDP_RPCH.A',
      period: '2026',
      value: -1.7,
      series_name: 'Real GDP growth',
      unit: '%',
    },
    {
      source: 'imf',
      series_key: 'IMF.WEO:IRN.NGDP_RPCH.A',
      period: '2027',
      value: 1.1,
      series_name: 'Real GDP growth',
      unit: '%',
    },
    {
      source: 'gpr',
      series_key: 'GPR.GPRC:IRN',
      period: '2026-10',
      value: 1.42,
      series_name: 'Country GPR',
      unit: 'index',
    },
    { source: 'ucdp', series_key: 'UCDP.deaths.all:IRN', period: '2026-09', value: null },
  ];
  const f = macro.rowsToFindings(rows, 'IRN', { now: new Date('2026-11-03T00:00:00Z') });
  const gdp = f.find((x) => x.meta.headline === 'gdp');
  assert.equal(gdp.meta.period, '2026');
  assert.match(gdp.summary, /IMF projection for 2027/);
  assert.ok(f.find((x) => x.meta.headline === 'gpr'));
  assert.equal(
    f.find((x) => x.meta.headline === 'conflict'),
    undefined,
  );
  assert.ok(f.every((x) => x.citation.href.startsWith('/datasets/')));
});

test('macro-indicators: search reads via the injected db, one query per country (max 3)', async () => {
  const seen = [];
  const db = {
    from: () => {
      const q = {
        select: () => q,
        eq: (_c, v) => (seen.push(v), q),
        gte: () => q,
        order: () => q,
        limit: async () => ({ data: [], error: null }),
      };
      return q;
    },
  };
  await macro.default.search({ countries: ['IR', 'US', 'CN', 'RU'], themes: [] }, { db });
  assert.deepEqual(seen, ['IRN', 'USA', 'CHN']);
  assert.equal(macro.default.isRelevant({ countries: [] }), false);
});

test('Sonar wiring: core source, free entitlement, corpus, coverage', () => {
  assert.ok(CORE_SOURCES['macro-indicators']);
  assert.ok(getSonarEntitlements({ planTier: 0 }).datasets.includes('macro'));
  assert.ok(corporaForDatasets(['macro']).includes('macro'));
  assert.deepEqual(findMissingAdapters(), []);
});
