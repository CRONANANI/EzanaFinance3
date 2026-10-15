/**
 * Sanctions & Trade Policy: the pure pieces behind the page. The remarks
 * parser, the Recent Actions parser, the timeline and concentration
 * helpers, and the data-integrity rules. Remarks fixtures are real OFAC SDN
 * remarks (US Treasury, public domain) in the formats OFAC publishes.
 *
 * Usage: node --test scripts/check-sanctions.mjs  (or npm run test:sanctions)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PARSER_VERSION,
  disambiguators,
  joinOverflow,
  normIdentifier,
  normName,
  parseRemarks,
  splitRemarks,
} from '../src/lib/sanctions/remarks.js';
import { classifyTitle, parseRecentActions } from '../src/lib/sanctions/actions.js';
import {
  SOURCES,
  concentration,
  meter,
  monthRange,
  pctChange,
  share,
  sourceState,
  timelineSummary,
  toYears,
} from '../src/lib/sanctions/insights.js';

/* ── remarks ──────────────────────────────────────────────────────────── */

const CRYPTO =
  "DOB 12 Jul 1979; POB Iran; nationality Iran; alt. nationality Dominica; alt. nationality Afghanistan; Additional Sanctions Information - Subject to Secondary Sanctions; Gender Male; Digital Currency Address - XBT 15Zt2mKuQ5Qy6DEXfDcbtsEVneoGQQXrS4; alt. Digital Currency Address - XBT 1BUXxhcwzFukm9CUxnhag85sSXDkMRbXse; Digital Currency Address - ETH 0x8d79c73daae8630c88de372ba8f57592fa987607; Secondary sanctions risk: section 1(b) of Executive Order 13224, as amended by Executive Order 13886; Digital Currency Address - TRX TPgxjjB6AJeMSQFngbUM6dMMxPHa9GEtYa; Passport RA003752 (Dominica); National ID No. 784-1979-5841714-5 (United Arab Emirates); a.k.a. 'HASHEM, Siavash'; a.k.a. 'KAIVANPOUR, Siavash'; a.k.a. 'KIWAN PORT, Siyawesh'.";
const VESSEL =
  'Secondary sanctions risk: See Section 11 of Executive Order 14024.; alt. Secondary sanctions risk: Ukraine-/Russia-Related Sanctions Regulations, 31 CFR 589.201 and/or 589.209; Vessel Registration Identification IMO 9312872; MMSI 352002139; Linked To: HUIHAI HONG KONG SHIPPING CO LIMITED.';
const BANK =
  "SWIFT/BIC VTBRRUMM; Website www.vtb.com; alt. Website www.vtb.ru; Additional Sanctions Information - Subject to Secondary Sanctions; BIK (RU) 044030707; alt. BIK (RU) 044525187; Executive Order 13662 Directive Determination - Subject to Directive 1; Secondary sanctions risk: Ukraine-/Russia-Related Sanctions Regulations, 31 CFR 589.201 and/or 589.209; alt. Secondary sanctions risk: See Section 11 of Executive Order 14024.; Organization Established Date 17 Oct 1990; Target Type Financial Institution; Registration ID 1027739609391 (Russia); Tax ID No. 7702070139 (Russia); Government Gazette Number 00032520 (Russia); License 1000 (Russia); Legal Entity Number 253400V1H6ART1UQ0N98; For more information on directives, please visit the following link: http://www.treasury.gov/resource-center/sanctions/Programs/Pages/ukraine.aspx#directives.; a.k.a. 'JSC VTB BANK NEW DELHI BRANCH'.";
const PASSPORTS =
  'DOB 1969; alt. DOB 1963; alt. DOB 11 Feb 1964; POB Al-Medinah, Saudi Arabia; nationality Saudi Arabia; Secondary sanctions risk: section 1(b) of Executive Order 13224, as amended by Executive Order 13886; Passport B 960789; alt. Passport G 649385 issued 08 Sep 2006 expires 17 Jul 2011.';
const MEXICO =
  'Secondary sanctions risk: section 1(b) of Executive Order 13224, as amended by Executive Order 13886; Organization Established Date 11 Mar 2025; Organization Type: Wholesale of solid, liquid and gaseous fuels and related products; Folio Mercantil No. N-2025031199 (Mexico); Linked To: GARZA GARCIA, Gamaliel.';
const AIRCRAFT =
  "Aircraft Model IL-18; Aircraft Manufacturer's Serial Number (MSN) 189011302; Aircraft Tail Number RA-75478; Secondary sanctions risk: See Section 11 of Executive Order 14024.; Linked To: FEDERAL STATE GOVERNMENTAL INSTITUTION 223 FLIGHT UNIT STATE AIRLINES OF THE MINISTRY OF DEFENSE OF THE RUSSIAN FEDERATION.";

test('split: segments, final full stop dropped, empty markers', () => {
  assert.deepEqual(splitRemarks('DOB 1969; POB Iraq.'), ['DOB 1969', 'POB Iraq']);
  assert.deepEqual(splitRemarks('-0-'), []);
  assert.deepEqual(splitRemarks(null), []);
  assert.deepEqual(splitRemarks(' ; ;DOB 1969;'), ['DOB 1969']);
});

test('crypto individual: identifiers, aliases, facts, nothing lost', () => {
  const p = parseRemarks(CRYPTO);
  assert.equal(p.version, PARSER_VERSION);
  assert.equal(p.secondaryRisk.length, 1);
  assert.match(p.secondaryRisk[0], /^section 1\(b\) of Executive Order 13224/);
  assert.deepEqual(p.aliases, ['HASHEM, Siavash', 'KAIVANPOUR, Siavash', 'KIWAN PORT, Siyawesh']);
  const crypto = p.identifiers.filter((i) => i.kind === 'crypto');
  assert.equal(crypto.length, 4);
  assert.equal(crypto[1].isAlt, true);
  assert.equal(crypto[0].value, 'XBT 15Zt2mKuQ5Qy6DEXfDcbtsEVneoGQQXrS4');
  const passport = p.identifiers.find((i) => i.kind === 'passport');
  assert.deepEqual([passport.value, passport.issuer], ['RA003752', 'Dominica']);
  const nid = p.identifiers.find((i) => i.kind === 'national_id');
  assert.equal(nid.value, '784-1979-5841714-5');
  assert.equal(nid.valueNorm, '784197958417145');
  assert.equal(nid.issuer, 'United Arab Emirates');
  const nat = p.facts.filter((f) => f.key === 'nationality');
  assert.deepEqual(
    nat.map((f) => [f.value, f.isAlt]),
    [
      ['Iran', false],
      ['Dominica', true],
      ['Afghanistan', true],
    ],
  );
  assert.deepEqual(p.unparsed, []);
});

test('vessel: IMO and MMSI, both secondary-risk clauses verbatim, link', () => {
  const p = parseRemarks(VESSEL);
  assert.deepEqual(
    p.identifiers.map((i) => [i.kind, i.value]),
    [
      ['imo', '9312872'],
      ['mmsi', '352002139'],
    ],
  );
  assert.equal(p.secondaryRisk.length, 2);
  assert.equal(p.secondaryRisk[0], 'See Section 11 of Executive Order 14024.');
  assert.deepEqual(p.linkedTo, ['HUIHAI HONG KONG SHIPPING CO LIMITED']);
});

test('bank: many registry identifiers; the directives link stays unparsed', () => {
  const p = parseRemarks(BANK);
  const kinds = p.identifiers.map((i) => `${i.kind}:${i.value}`);
  for (const k of [
    'swift:VTBRRUMM',
    'bik:044030707',
    'bik:044525187',
    'registration:1027739609391',
    'tax_id:7702070139',
    'registration:00032520',
    'registration:1000',
    'lei:253400V1H6ART1UQ0N98',
  ]) {
    assert.ok(kinds.includes(k), `missing ${k}`);
  }
  assert.equal(p.identifiers.find((i) => i.value === '1027739609391').issuer, 'Russia');
  assert.equal(p.facts.find((f) => f.key === 'established').value, '17 Oct 1990');
  assert.equal(p.facts.filter((f) => f.key === 'website').length, 2);
  assert.ok(p.facts.some((f) => f.key === 'directive'));
  assert.equal(p.unparsed.length, 1);
  assert.match(p.unparsed[0], /^For more information on directives/);
  assert.deepEqual(p.aliases, ['JSC VTB BANK NEW DELHI BRANCH']);
});

test('passports: letter prefix kept, issued/expires split out, alt marked', () => {
  const p = parseRemarks(PASSPORTS);
  const pp = p.identifiers.filter((i) => i.kind === 'passport');
  assert.deepEqual(
    pp.map((i) => [i.value, i.isAlt, i.issued, i.expires]),
    [
      ['B 960789', false, null, null],
      ['G 649385', true, '08 Sep 2006', '17 Jul 2011'],
    ],
  );
  assert.equal(pp[0].valueNorm, 'B960789');
  const dob = p.facts.filter((f) => f.key === 'dob').map((f) => f.value);
  assert.deepEqual(dob, ['1969', '1963', '11 Feb 1964']);
  const d = disambiguators(p);
  assert.equal(d.length, 3);
  assert.equal(d[0].kind, 'dob');
});

test('entity: Folio Mercantil with issuer, org type, link with comma in name', () => {
  const p = parseRemarks(MEXICO);
  const f = p.identifiers.find((i) => i.label === 'Folio Mercantil');
  assert.deepEqual([f.value, f.issuer, f.valueNorm], ['N-2025031199', 'Mexico', 'N2025031199']);
  assert.deepEqual(p.linkedTo, ['GARZA GARCIA, Gamaliel']);
  assert.equal(
    p.facts.find((x) => x.key === 'org_type').value,
    'Wholesale of solid, liquid and gaseous fuels and related products',
  );
});

test('aircraft: model, MSN, tail number', () => {
  const p = parseRemarks(AIRCRAFT);
  assert.deepEqual(
    p.identifiers.map((i) => [i.kind, i.value]),
    [
      ['msn', '189011302'],
      ['tail', 'RA-75478'],
    ],
  );
  assert.equal(p.facts.find((x) => x.key === 'aircraft_model').value, 'IL-18');
  assert.equal(p.linkedTo.length, 1);
});

test('unknown and odd segments are kept verbatim, never dropped', () => {
  const p = parseRemarks(
    'Member of the State Duma; all offices worldwide; Passport -; DOB circa 1961.',
  );
  assert.deepEqual(p.unparsed, ['Member of the State Duma', 'all offices worldwide', 'Passport -']);
  assert.equal(p.facts[0].value, 'circa 1961');
});

test('normalisers', () => {
  assert.equal(normIdentifier(' n-2025/031 199 '), 'N2025031199');
  assert.equal(
    normName("AL-QA'IDA IN THE  INDIAN SUBCONTINENT."),
    'al qa ida in the indian subcontinent',
  );
  assert.equal(normName('  '), null);
  assert.equal(normName('Garza García, Gamaliel'), 'garza garcía gamaliel');
});

test('overflow join', () => {
  assert.equal(joinOverflow('abc', 'def'), 'abcdef');
  assert.equal(joinOverflow('abc', ''), null);
  assert.equal(joinOverflow('abc', '-0-'), null);
});

/* ── recent actions ──────────────────────────────────────────────────── */

const ACTIONS_HTML = `
<ul>
 <li><a href="/recent-actions/20261014">Venezuela-related Designation Removal</a></li>
 <li><a href="/recent-actions/20261013">Counter Narcotics and Counter Terrorism Designations</a></li>
 <li><a href="https://ofac.treasury.gov/recent-actions/20261013_33">Settlement Agreement between OFAC and Bank of America, N.A.</a></li>
 <li><a href="/recent-actions/20261009_33"><span>Issuance of Russia-related General License</span></a></li>
 <li><a href="/recent-actions/20261005">Designation Removals and Updates; Publication of Iran-related OFAC Alert &amp; Amended FAQ</a></li>
 <li><a href="/recent-actions/20261013">Counter Narcotics and Counter Terrorism Designations</a></li>
 <li><a href="/recent-actions/counter-terrorism">Counter Terrorism</a></li>
 <li><a href="/recent-actions/20261399">Bad date</a></li>
 <li><a href="/recent-actions?page=1">Next</a></li>
</ul>`;

test('recent actions: dates from the link, de-duplicated, categories ignored', () => {
  const a = parseRecentActions(ACTIONS_HTML);
  assert.deepEqual(
    a.map((x) => x.id),
    ['20261014', '20261013', '20261013_33', '20261009_33', '20261005'],
  );
  assert.equal(a[0].date, '2026-10-14');
  assert.equal(a[2].url, 'https://ofac.treasury.gov/recent-actions/20261013_33');
  assert.equal(a[3].title, 'Issuance of Russia-related General License');
  assert.match(a[4].title, /Alert & Amended FAQ$/);
});

test('recent actions: kinds and program hints come from the title only', () => {
  assert.deepEqual(classifyTitle('Venezuela-related Designation Removal').kinds, ['removal']);
  assert.deepEqual(classifyTitle('Venezuela-related Designation Removal').programHints, [
    'Venezuela',
  ]);
  const c = classifyTitle('Counter Narcotics and Counter Terrorism Designations');
  assert.deepEqual(c.kinds, ['designation']);
  assert.deepEqual(c.programHints, ['Counter terrorism', 'Counter narcotics']);
  assert.deepEqual(classifyTitle('Designation Removals and Updates').kinds, ['removal', 'update']);
  assert.deepEqual(classifyTitle('Settlement Agreement between OFAC and a bank').kinds, [
    'enforcement',
  ]);
  assert.deepEqual(classifyTitle('Issuance of Russia-related General License').kinds, [
    'general_license',
  ]);
  assert.deepEqual(classifyTitle('Something else entirely').kinds, ['other']);
});

/* ── insights ─────────────────────────────────────────────────────────── */

test('pctChange and share refuse an empty base', () => {
  assert.equal(pctChange(10, 0), null);
  assert.equal(pctChange(15, 10), 50);
  assert.equal(pctChange(5, 10), -50);
  assert.equal(share(1, 0), null);
  assert.equal(share(1, 3), 33.3);
});

test('timeline summary: total, peak, average; zeros are real months', () => {
  const rows = [
    { month: '2026-08-01', listings: 0 },
    { month: '2026-09-01', listings: 12 },
    { month: '2026-10-01', listings: 3 },
  ];
  assert.deepEqual(timelineSummary(rows), {
    total: 15,
    months: 3,
    peak: { month: '2026-09-01', listings: 12 },
    avg: 5,
  });
  assert.deepEqual(timelineSummary([]), { total: 0, months: 0, peak: null, avg: null });
  assert.equal(timelineSummary([{ month: '2026-01-01', listings: 0 }]).peak, null);
});

test('years and month ranges, including leap February', () => {
  assert.deepEqual(
    toYears([
      { month: '2025-12-01', listings: 2 },
      { month: '2026-01-01', listings: 3 },
      { month: '2026-02-01', listings: 4 },
    ]),
    [
      { year: '2025', listings: 2 },
      { year: '2026', listings: 7 },
    ],
  );
  assert.deepEqual(monthRange('2028-02-01'), { from: '2028-02-01', to: '2028-02-29' });
  assert.deepEqual(monthRange('2026-12-01'), { from: '2026-12-01', to: '2026-12-31' });
  assert.equal(monthRange('nope'), null);
});

test('concentration uses assignments as the denominator', () => {
  const c = concentration({
    active: 10,
    programs: [
      { code: 'A', total: 6 },
      { code: 'B', total: 4 },
      { code: 'C', total: 2 },
    ],
    countries: [{ name: 'X', total: 8 }],
  });
  assert.equal(c.programAssignments, 12);
  assert.deepEqual(c.largestProgram, { code: 'A', total: 6, share: 50 });
  assert.equal(c.multiProgramRatio, 1.2);
  assert.equal(c.top5CountryShare, 100);
  assert.equal(concentration({ active: 0, programs: [], countries: [] }).largestProgram, null);
});

test('source state follows fixed rules, never "ok" from a timestamp alone', () => {
  const rule = SOURCES[0];
  const now = Date.parse('2026-10-15T12:00:00Z');
  assert.equal(sourceState(null, rule, now).state, 'unavailable');
  assert.equal(sourceState({ last_attempt_at: null }, rule, now).state, 'never');
  assert.equal(
    sourceState(
      {
        last_attempt_at: '2026-10-15T05:40:00Z',
        last_status: 'failed',
        last_ok_at: '2026-10-14T05:40:00Z',
      },
      rule,
      now,
    ).state,
    'failed',
  );
  assert.equal(
    sourceState(
      { last_attempt_at: '2026-10-15T05:40:00Z', last_status: 'skipped', last_ok_at: null },
      rule,
      now,
    ).state,
    'never',
  );
  assert.equal(
    sourceState(
      {
        last_attempt_at: '2026-10-15T05:40:00Z',
        last_status: 'ok',
        last_ok_at: '2026-10-12T05:40:00Z',
      },
      rule,
      now,
    ).state,
    'stale',
  );
  assert.equal(
    sourceState(
      {
        last_attempt_at: '2026-10-15T05:40:00Z',
        last_status: 'ok',
        last_ok_at: '2026-10-15T05:41:00Z',
      },
      rule,
      now,
    ).state,
    'ok',
  );
});

test('meter keeps "not measurable" distinct from zero', () => {
  assert.deepEqual(meter(0, 100), { n: 0, d: 100, pct: 0 });
  assert.deepEqual(meter(5, null), { n: 5, d: null, pct: null });
  assert.deepEqual(meter(null, 100), { n: null, d: 100, pct: null });
});

test('long-tail identifier and fact formats from the live list', () => {
  const p = parseRemarks(
    "Trade License No. 04110179 (United Kingdom); Matricula Mercantil No 00002911 (Colombia); V.A.T. Number BG 121024920 (Bulgaria); Driver's License No. 04900377 (Moldova) issued 02 Jul 2004; Aircraft Mode S Transponder Code 140AE7; Former Vessel Flag Comoros; Telephone (357)(22660766); Executive Order 13846 information: BAN ON INVESTMENT IN EQUITY OR DEBT OF SANCTIONED PERSON. Sec. 4(e)",
  );
  assert.deepEqual(
    p.identifiers.map((i) => [i.label, i.value, i.issuer]),
    [
      ['Trade license', '04110179', 'United Kingdom'],
      ['Matricula Mercantil', '00002911', 'Colombia'],
      ['VAT number', 'BG 121024920', 'Bulgaria'],
      ["Driver's license", '04900377', 'Moldova'],
      ['Aircraft Mode S transponder code', '140AE7', null],
    ],
  );
  assert.equal(p.identifiers[3].issued, '02 Jul 2004');
  assert.deepEqual(
    p.facts.map((f) => f.key),
    ['vessel_flag_former', 'phone', 'statutory_info'],
  );
  assert.deepEqual(p.unparsed, []);
});

test('run log: outcome comes from the job body, never assumed', async () => {
  const { summarizeRun } = await import('../src/lib/ingest-runs-summary.js');
  assert.equal(summarizeRun({ ok: true, upserted: 10, parsed: 10 }, 200).status, 'ok');
  assert.equal(summarizeRun({ ok: false, upserted: 4, errors: ['x'] }, 200).status, 'partial');
  assert.equal(summarizeRun({ ok: false, error: 'only 12 entries parsed' }, 502).status, 'failed');
  assert.equal(
    summarizeRun({ ok: true, skipped: true, reason: 'nothing new' }, 200).status,
    'skipped',
  );
  assert.equal(summarizeRun(null, 500).status, 'failed');
  assert.equal(summarizeRun({ ok: true }, 500).status, 'failed');
  const r = summarizeRun({ ok: true, written: 7, entries: 9, validation: '9 of 10 matched' }, 200);
  assert.deepEqual([r.rows_written, r.rows_read, r.validation], [7, 9, '9 of 10 matched']);
});

test('CSV: quoting and formula neutralising', async () => {
  const { csvCell, toCsv } = await import('../src/lib/sanctions/insights.js');
  assert.equal(csvCell('GARZA GARCIA, Gamaliel'), '"GARZA GARCIA, Gamaliel"');
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('-0-'), "'-0-");
  assert.equal(csvCell(null), '');
  assert.equal(
    toCsv(
      [{ a: 1, b: 'x"y' }],
      [
        ['A', (r) => r.a],
        ['B', (r) => r.b],
      ],
    ),
    'A,B\n1,"x""y"',
  );
});

/* The 72 program tags on the live list on Oct 14, 2026. A new tag OFAC adds
   later shows as "Other" until it is mapped; this test keeps today's set
   fully described. */
const LIVE_TAGS =
  'RUSSIA-EO14024 SDGT IFSR SDNTK NPWMD IRAN-EO13902 ILLICIT-DRUGS-EO14059 GLOMAG IRAN UKRAINE-EO13662 IRAN-EO13846 TCO IRGC CYBER2 IRAN-HR UKRAINE-EO13661 DPRK4 BELARUS-EO14038 VENEZUELA-EO13850 PAARSSR-EO13894 BALKANS VENEZUELA DPRK3 UKRAINE-EO13660 BURMA-EO14014 DPRK2 IRAN-EO13876 IRAQ2 ELECTION-EO13848 FTO UKRAINE-EO13685 DRCONGO CUBA-EO14404 CYBER4 NICARAGUA CUBA BELARUS DPRK VENEZUELA-EO13884 MAGNIT IRAN-EO13871 SUDAN-EO14098 SDNT LIBYA3 IRAN-CON-ARMS-EO IRAN-TRA SOMALIA CAR PEESA-EO14039 IFCA BALKANS-EO14033 ICC-EO14203 HOSTAGES-EO14078 LIBYA2 LEBANON HRIT-IR IRAQ3 YEMEN CYBER3 NICARAGUA-NHRAA RUSSIA-EO14065 DARFUR MALI-EO13882 PAIPA NS-PLC DPRK-NKSPEA SSIDES UHRPA HRIT-SY'
    .split(' ')
    .concat(['CAATSA - RUSSIA', 'SOUTH SUDAN', 'CAATSA - IRAN']);

test('every program tag on the live list has curated metadata', async () => {
  const { hasProgramMeta, programMeta } = await import('../src/lib/sanctions/programs.js');
  assert.equal(LIVE_TAGS.length, 72);
  const missing = LIVE_TAGS.filter((t) => !hasProgramMeta(t));
  assert.deepEqual(missing, []);
  assert.equal(programMeta('PAIPA').theme, 'cyber');
  assert.equal(programMeta('NS-PLC').target, null);
  assert.equal(programMeta('SSIDES').target, null);
});
