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
    shares: 2100000,
    percent: 8.5,
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
