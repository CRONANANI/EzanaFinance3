/**
 * Unit tests for the Titans Shadow pipeline helpers (pure, no network).
 *   node scripts/check-titans.mjs   (also `npm run test:titans`)
 *
 * Fixtures in scripts/fixtures are real Schedule 13D/13G primary XML documents
 * as filed with the SEC (public records), in the post-Dec-2024 structured
 * format: a 13D, a 13D whose CUSIP sits in the nested issuerCusips element, a
 * 13G, and a 13G/A with the nested CUSIP.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSchedule13Xml, schedule13Kind, isAmendmentForm } from '../src/lib/sec-13f-parse.js';
import {
  SCHEDULE13_PARSER_VERSION,
  tagPurpose,
  purposeExcerpt,
  parseSecHeader,
  buildActivistRow,
  cleanText,
  normaliseGRule,
  gBasis,
} from '../src/lib/sec/schedule13-meta.js';
import { mapJobResult, normaliseTicker, CUSIP_RE } from '../src/lib/openfigi.js';
import {
  quarterEnd,
  priorQuarterEnd,
  currentReportQuarter,
  latestCompleteQuarter,
  recentPeriods,
  isRecentPeriod,
} from '../src/lib/sec/quarters.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('parseSchedule13Xml: Schedule 13D', () => {
  const r = parseSchedule13Xml(fixture('schedule13d.xml'));
  assert.equal(r.form_type, 'SCHEDULE 13D');
  assert.equal(r.subject_name, 'Aadi Bioscience, Inc.');
  assert.equal(r.subject_cik, '1422142');
  assert.equal(r.subject_cusip, '00032Q104');
  assert.equal(r.event_date, '2024-12-31');
  assert.equal(r.reporting_persons.length, 2);
  assert.deepEqual(r.reporting_persons[0], {
    name: 'BML Investment Partners, L.P.',
    cik: '1373604',
    shares: 2100000,
    percent: 8.5,
    types: ['PN'],
    fund_sources: ['WC'],
    citizenship: 'DE',
    sole_voting: 0,
    shared_voting: 2100000,
    sole_dispositive: 0,
    shared_dispositive: 2100000,
    group: null,
  });
  // The filing's stake is the largest reporting person's.
  assert.equal(r.percent_of_class, 9.9);
  assert.equal(r.shares, 2435000);
});

test('parseSchedule13Xml: Schedule 13D with nested issuerCusips', () => {
  const r = parseSchedule13Xml(fixture('schedule13d-nested-cusip.xml'));
  assert.equal(r.subject_name, 'Seaport Therapeutics, Inc.');
  assert.equal(r.subject_cusip, '81221K108');
  assert.equal(r.event_date, '2026-05-04');
  assert.equal(r.percent_of_class, 11.9);
  assert.equal(r.shares, 6294951);
  assert.equal(r.reporting_persons.length, 7);
});

test('parseSchedule13Xml: Schedule 13G', () => {
  const r = parseSchedule13Xml(fixture('schedule13g.xml'));
  assert.equal(r.form_type, 'SCHEDULE 13G');
  assert.equal(r.subject_name, 'Jushi Holdings Inc.');
  assert.equal(r.subject_cik, '1909747');
  assert.equal(r.subject_cusip, '48213Y107');
  assert.equal(r.event_date, '2025-11-19');
  assert.equal(r.percent_of_class, 5.1);
  assert.equal(r.shares, 10000000);
  assert.equal(r.reporting_persons[0].name, 'Marex Securities Products Inc.');
});

test('parseSchedule13Xml: Schedule 13G/A with nested CUSIP', () => {
  const r = parseSchedule13Xml(fixture('schedule13g-a-nested-cusip.xml'));
  assert.equal(r.form_type, 'SCHEDULE 13G/A');
  assert.equal(r.subject_name, 'AVIS BUDGET GROUP, INC.');
  assert.equal(r.subject_cusip, '053774105');
  assert.equal(r.event_date, '2026-03-31');
  assert.equal(r.percent_of_class, 22.2);
  assert.equal(isAmendmentForm(r.form_type), true);
});

/* ── Parser v2: the fields the filings carry beyond the stake ─────────── */

test('v2 13D: investor, funds, purpose, person types, powers', () => {
  const r = parseSchedule13Xml(fixture('schedule13d.xml'));
  // The submission's filer CIK matches the first reporting person.
  assert.equal(r.filer_cik, '1373604');
  assert.equal(r.filer_name, 'BML Investment Partners, L.P.');
  assert.equal(r.filer_source, 'cover_cik');
  assert.deepEqual(r.person_types, ['PN', 'IN']);
  assert.deepEqual(r.fund_sources, ['WC', 'PF']);
  assert.match(r.funds_source_text, /acquired using working capital/);
  assert.match(r.transaction_purpose, /sent a letter to the Board of Directors/);
  // Numeric entities (&#13;) are decoded away, paragraphs kept.
  assert.ok(!r.transaction_purpose.includes('&#'));
  assert.ok(r.transaction_purpose.includes('\n\n'));
  assert.deepEqual(r.purpose_tags, ['sale', 'letter']);
  // Powers are the lead (largest %) person's: Leonard, 9.9%.
  assert.equal(r.sole_voting, 335000);
  assert.equal(r.shared_voting, 2100000);
  assert.equal(r.sole_dispositive, 335000);
  assert.equal(r.shared_dispositive, 2100000);
  assert.deepEqual(r.g_rules, []);
  assert.equal(r.amendment_no, null);
  assert.equal(r.member_of_group, null);
});

test('v2 13D with seven persons: boilerplate-only purpose reads as investment', () => {
  const r = parseSchedule13Xml(fixture('schedule13d-nested-cusip.xml'));
  assert.equal(r.filer_name, 'ARCH Venture Fund XII, L.P.');
  assert.equal(r.filer_source, 'cover_cik');
  assert.deepEqual(r.fund_sources, ['WC', 'AF']);
  assert.deepEqual(r.person_types, ['PN', 'OO', 'IN']);
  assert.deepEqual(r.purpose_tags, ['investment']);
});

test('v2 13G: filing rule, group flag, first-person filer, no 13D items', () => {
  const r = parseSchedule13Xml(fixture('schedule13g.xml'));
  assert.deepEqual(r.g_rules, ['13d-1(c)']);
  assert.equal(gBasis(r.g_rules)[0].key, 'passive');
  assert.equal(r.member_of_group, true);
  assert.deepEqual(r.person_types, ['CO', 'OO']);
  // 13G persons carry no CIK, so the filer is the cover's first person.
  assert.equal(r.filer_cik, '2048490');
  assert.equal(r.filer_name, 'Marex Securities Products Inc.');
  assert.equal(r.filer_source, 'cover_first');
  assert.equal(r.sole_voting, 10000000);
  assert.equal(r.shared_voting, 0);
  assert.equal(r.transaction_purpose, null);
  assert.equal(r.funds_source_text, null);
  assert.deepEqual(r.fund_sources, []);
  assert.deepEqual(r.purpose_tags, []);
});

test('v2 13G/A: amendment number, QII basis, repeated person types', () => {
  const r = parseSchedule13Xml(fixture('schedule13g-a-nested-cusip.xml'));
  assert.equal(r.amendment_no, 3);
  assert.deepEqual(r.g_rules, ['13d-1(b)']);
  assert.equal(gBasis(r.g_rules)[0].label, 'Qualified institutional investor');
  // typeOfReportingPerson repeats per person, plus Item 3 typeOfPersonFiling.
  assert.deepEqual(r.person_types, ['IA', 'PN', 'HC', 'IN']);
  assert.deepEqual(r.reporting_persons[0].types, ['IA', 'PN']);
  assert.equal(r.shared_voting, 7824100);
  assert.equal(r.member_of_group, null);
});

test('tagPurpose: real plans tagged, reservation boilerplate ignored', () => {
  assert.deepEqual(
    tagPurpose(
      'The Reporting Persons intend to nominate three directors for election at the 2027 annual meeting and may solicit proxies in support of their nominees.',
    ),
    ['board', 'proxy'],
  );
  assert.deepEqual(
    tagPurpose(
      'The Reporting Persons entered into a Cooperation Agreement with the Issuer pursuant to which Jane Doe was appointed to the Board.',
    ),
    ['board', 'agreement'],
  );
  assert.deepEqual(
    tagPurpose(
      'The Reporting Persons believe the Issuer should initiate a share repurchase program.',
    ),
    ['capital'],
  );
  // Every Item 4 (a) to (j) action named, but only as a reservation.
  assert.deepEqual(
    tagPurpose(
      'The Reporting Persons acquired the shares for investment purposes. The Reporting Persons reserve the right to propose a merger, a sale of the Company, changes to the board of directors or any other action in subparagraphs (a) through (j) of Item 4.',
    ),
    ['investment'],
  );
  assert.deepEqual(tagPurpose(null), []);
});

test('purposeExcerpt prefers what the filer reports doing, verbatim', () => {
  const r = parseSchedule13Xml(fixture('schedule13d.xml'));
  const ex = purposeExcerpt(r.transaction_purpose, 300);
  assert.ok(ex.length <= 300);
  assert.match(ex, /^The Reporting Persons purchased/);
  assert.ok(!/reserve the right/i.test(ex));
});

test('cleanText: entities (also double-encoded), n/a and caps', () => {
  assert.equal(cleanText('a &amp;#167; b'), 'a \u00a7 b');
  assert.equal(cleanText('line one&#13;\nline two'), 'line one\nline two');
  assert.equal(cleanText('n/a'), null);
  assert.equal(cleanText('  '), null);
  assert.equal(cleanText('x'.repeat(50), 10).length, 10);
});

test('normaliseGRule reads every spelling', () => {
  assert.equal(normaliseGRule('Rule 13d-1(b)'), '13d-1(b)');
  assert.equal(normaliseGRule('13d - 1 ( C )'), '13d-1(c)');
  assert.equal(normaliseGRule('Rule 13d-2'), null);
});

/* A legacy submission header, in the layout EDGAR uses for every .txt
   submission (synthetic names and CIKs). */
const LEGACY_HEADER = `<SEC-DOCUMENT>0000000000-24-000001.txt : 20240105
<SEC-HEADER>0000000000-24-000001.hdr.sgml : 20240105
ACCESSION NUMBER:		0000000000-24-000001
CONFORMED SUBMISSION TYPE:	SC 13D
PUBLIC DOCUMENT COUNT:		2
FILED AS OF DATE:		20240105

SUBJECT COMPANY:	

	COMPANY DATA:	
		COMPANY CONFORMED NAME:			EXAMPLE TARGET CORP
		CENTRAL INDEX KEY:			0000012345

FILED BY:		

	COMPANY DATA:	
		COMPANY CONFORMED NAME:			EXAMPLE CAPITAL PARTNERS LP
		CENTRAL INDEX KEY:			0000067890
</SEC-HEADER>
<DOCUMENT>
<TYPE>SC 13D
NAME OF ISSUER: Example Target Corp
PERCENT OF CLASS REPRESENTED BY AMOUNT IN ROW (11) 7.4%
</DOCUMENT>`;

test('parseSecHeader separates the investor from the target', () => {
  const h = parseSecHeader(LEGACY_HEADER);
  assert.deepEqual(h.subject, { name: 'EXAMPLE TARGET CORP', cik: '12345' });
  assert.deepEqual(h.filedBy, { name: 'EXAMPLE CAPITAL PARTNERS LP', cik: '67890' });
  assert.deepEqual(parseSecHeader('no header here'), { subject: null, filedBy: null });
});

test('buildActivistRow: investor identity and stored shape', () => {
  const xml = parseSchedule13Xml(fixture('schedule13g-a-nested-cusip.xml'));
  const row = buildActivistRow({
    accessionNo: '0000902664-26-000001',
    filingFormType: 'SCHEDULE 13G/A',
    cover: xml,
    subjectTicker: 'CAR',
  });
  assert.equal(row.parser_version, SCHEDULE13_PARSER_VERSION);
  assert.equal(row.filer_name, 'Pentwater Capital Management LP');
  assert.equal(row.filer_cik, '0001425851');
  assert.equal(row.is_amendment, true);
  assert.equal(row.amendment_no, 3);
  assert.deepEqual(row.g_rules, ['13d-1(b)']);

  // Legacy filing: investor from the SEC header's FILED BY block.
  const legacy = buildActivistRow({
    accessionNo: '0000000000-24-000001',
    filingFormType: 'SC 13D',
    cover: {
      subject_name: 'Example Target Corp',
      subject_cik: '12345',
      percent_of_class: 7.4,
      reporting_persons: [],
      header: parseSecHeader(LEGACY_HEADER),
    },
  });
  assert.equal(legacy.filer_name, 'EXAMPLE CAPITAL PARTNERS LP');
  assert.equal(legacy.filer_cik, '0000067890');
  assert.equal(legacy.filer_source, 'sec_header');
  assert.deepEqual(legacy.purpose_tags, []);

  // A FILED BY block naming the target itself is not an investor.
  const self = buildActivistRow({
    accessionNo: '0000000000-24-000002',
    filingFormType: 'SC 13D',
    cover: {
      subject_cik: '12345',
      reporting_persons: [],
      header: { subject: null, filedBy: { name: 'EXAMPLE TARGET CORP', cik: '12345' } },
    },
  });
  assert.equal(self.filer_name, null);
  assert.equal(self.filer_source, null);
});

test('parseSchedule13Xml: not a structured cover -> null', () => {
  assert.equal(parseSchedule13Xml('<html><body>SC 13D</body></html>'), null);
  assert.equal(parseSchedule13Xml(''), null);
});

test('schedule13Kind normalises every spelling', () => {
  for (const f of ['SC 13D', 'SC 13D/A', 'SCHEDULE 13D', 'SCHEDULE 13D/A', '13D']) {
    assert.equal(schedule13Kind(f), '13D', f);
  }
  for (const f of ['SC 13G', 'SC 13G/A', 'SCHEDULE 13G', 'SCHEDULE 13G/A']) {
    assert.equal(schedule13Kind(f), '13G', f);
  }
  assert.equal(schedule13Kind('13F-HR'), null);
  assert.equal(isAmendmentForm('SCHEDULE 13D'), false);
});

test('OpenFIGI picker: equity result preferred, ticker normalised', () => {
  const row = mapJobResult('084670702', {
    data: [
      { figi: 'BBG000X', ticker: 'BRK/B', marketSector: 'Corp', exchCode: 'US', name: 'BOND' },
      {
        figi: 'BBG000DWG505',
        ticker: 'BRK/B',
        marketSector: 'Equity',
        exchCode: 'US',
        name: 'BERKSHIRE HATHAWAY INC-CL B',
        securityType: 'Common Stock',
      },
    ],
  });
  assert.equal(row.status, 'mapped');
  assert.equal(row.ticker, 'BRK.B');
  assert.equal(row.figi, 'BBG000DWG505');
  assert.equal(row.market_sector, 'Equity');
  assert.equal(row.security_type, 'Common Stock');
});

test('OpenFIGI picker: first result when no equity; warning and error', () => {
  assert.equal(
    mapJobResult('912828ZZ0', { data: [{ ticker: 'T 1 1/2', marketSector: 'Govt' }] })
      .market_sector,
    'Govt',
  );
  const un = mapJobResult('000000000', { warning: 'No identifier found.' });
  assert.equal(un.status, 'unmapped');
  assert.equal(un.ticker, null);
  assert.equal(mapJobResult('000000000', { error: 'Invalid idValue' }).status, 'error');
  assert.equal(mapJobResult('000000000', { data: [] }).status, 'unmapped');
});

test('ticker normalisation and CUSIP validation', () => {
  assert.equal(normaliseTicker(' brk/a '), 'BRK.A');
  assert.equal(normaliseTicker(''), null);
  assert.ok(CUSIP_RE.test('00032Q104'));
  assert.ok(!CUSIP_RE.test('00032Q10'));
  assert.ok(!CUSIP_RE.test('00032q104'));
});

test('quarters: quarter ends and the reporting window', () => {
  assert.equal(quarterEnd('2026-08-15'), '2026-09-30');
  assert.equal(quarterEnd('2026-03-31'), '2026-03-31');
  assert.equal(priorQuarterEnd('2026-06-30'), '2026-03-31');
  assert.equal(priorQuarterEnd('2026-03-31'), '2025-12-31');

  const oct6 = new Date('2026-10-06T12:00:00Z');
  assert.equal(currentReportQuarter(oct6), '2026-09-30');
  assert.equal(latestCompleteQuarter(oct6), '2026-06-30');
  assert.deepEqual(recentPeriods(oct6), ['2026-09-30', '2026-06-30', '2026-03-31']);

  const nov20 = new Date('2026-11-20T00:00:00Z'); // Q3 deadline (Nov 14) has passed
  assert.equal(latestCompleteQuarter(nov20), '2026-09-30');
  assert.deepEqual(recentPeriods(nov20), ['2026-09-30', '2026-06-30']);
});

test('isRecentPeriod', () => {
  const oct6 = new Date('2026-10-06T12:00:00Z');
  assert.equal(isRecentPeriod('2026-06-30', oct6), true);
  assert.equal(isRecentPeriod('2026-03-31', oct6), true); // prior of the complete quarter
  assert.equal(isRecentPeriod('2026-09-30', oct6), true); // filing window open
  assert.equal(isRecentPeriod('2025-12-31', oct6), false);
  assert.equal(isRecentPeriod('2000-06-30', oct6), false); // a late catch-up filing
  assert.equal(isRecentPeriod('2026-06-15', oct6), false); // not a quarter-end
  assert.equal(isRecentPeriod(null, oct6), false);
});
