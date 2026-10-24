/**
 * Industry data ingest (CHIPS awards + admin entry). Run:
 * npm run test:chips-ingest (wired into npm test).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const N = await import('../src/lib/ingest/chips/normalize.js');
const NIST = await import('../src/lib/ingest/chips/nist.js');
const USA = await import('../src/lib/ingest/chips/usaspending.js');
const V = await import('../src/lib/industry-admin/validate.js');
const M = await import('../src/lib/sonar/industry-layout-model.js');
const fx = (f) => readFileSync(`tests/fixtures/nist/${f}`, 'utf8');

/* ── normalisation and amounts ── */

test('recipient names normalise: case, punctuation, legal suffixes', () => {
  assert.equal(N.normalizeRecipient('Micron Technology, Inc.'), 'MICRON TECHNOLOGY');
  assert.equal(
    N.normalizeRecipient('Samsung Austin Semiconductor LLC'),
    'SAMSUNG AUSTIN SEMICONDUCTOR',
  );
  assert.equal(N.normalizeRecipient('Example Corp. of America'), 'EXAMPLE');
  assert.equal(N.normalizeRecipient('  a&b  co '), 'A AND B');
});

test('amounts parse from published text', () => {
  assert.equal(N.parseAmount('$4.745 billion'), 4745000000);
  assert.equal(N.parseAmount('up to $10.3 million'), 10300000);
  assert.equal(N.parseAmount('$900 million'), 900000000);
  assert.equal(N.parseAmount('up to $105 million (split across two sites)'), 105000000);
  assert.equal(N.parseAmount('$1,250,000'), 1250000);
  assert.equal(N.parseAmount('see detail page'), null);
});

test('final vs proposed and split detection', () => {
  assert.equal(N.awardStatusFromLabel('Award Amount: $1 million'), 'final');
  assert.equal(N.awardStatusFromLabel('Proposed Award Amount: up to $1 million'), 'proposed');
  assert.ok(N.isSplitAward('$10.3 million, split across two sites'));
  assert.ok(!N.isSplitAward('$10.3 million'));
  assert.ok(N.amountsConflict(100, 94));
  assert.ok(!N.amountsConflict(100, 96));
});

/* ── NIST parser on fixtures ── */

test('NIST page 0: a final multi-billion award and a proposed award', () => {
  const rows = NIST.parseNistAwardsHtml(fx('page-0.html'));
  assert.equal(rows.length, 2);
  const [a, b] = rows;
  assert.equal(a.recipient_name, 'Example Fab Co');
  assert.equal(a.status, 'final');
  assert.equal(a.amount_usd, 4745000000);
  assert.equal(a.state_code, 'AZ');
  assert.equal(a.city, 'Phoenix');
  assert.equal(a.source_url, 'https://www.nist.gov/chips/example-fab-co-arizona-phoenix-az');
  assert.equal(b.status, 'proposed');
  assert.equal(b.amount_usd, 105000000);
  assert.equal(b.amount_text, 'up to $105 million');
});

test('NIST page 1: a split award lists every site and keeps one amount', () => {
  const [split, whole] = NIST.parseNistAwardsHtml(fx('page-1.html'));
  assert.ok(split.is_split_award);
  assert.deepEqual(split.sites, [
    { city: 'Austin', state_code: 'TX' },
    { city: 'Albany', state_code: 'NY' },
  ]);
  assert.equal(split.amount_usd, 10300000);
  assert.equal(whole.amount_usd, 900000000);
  assert.equal(whole.state_code, 'NC');
  assert.ok(!whole.is_split_award);
});

test('NIST fetch: stops on an empty page and fails loudly when parsing breaks', async () => {
  const pages = [fx('page-0.html'), fx('page-1.html'), fx('page-empty.html')];
  let i = 0;
  const fetchImpl = async (url) => {
    if (url.endsWith('robots.txt'))
      return { ok: true, text: async () => 'User-agent: *\nDisallow: /admin/' };
    return { ok: true, status: 200, text: async () => pages[i++] };
  };
  const out = await NIST.fetchNistPages({ fetchImpl, delayMs: 0 });
  assert.equal(out.entries.length, 4);
  assert.equal(out.pages, 3);
  const broken = async (url) =>
    url.endsWith('robots.txt')
      ? { ok: true, text: async () => '' }
      : { ok: true, status: 200, text: async () => fx('page-changed.html') };
  await assert.rejects(NIST.fetchNistPages({ fetchImpl: broken, delayMs: 0 }), /0 entries/);
});

test('NIST robots: a disallow on /chips/ skips the job', async () => {
  assert.ok(
    NIST.robotsDisallows('User-agent: *\nDisallow: /chips/', '/chips/chips-program-office-awards'),
  );
  assert.ok(!NIST.robotsDisallows('User-agent: bot\nDisallow: /chips/', '/chips/x'));
  const out = await NIST.fetchNistPages({
    fetchImpl: async () => ({ ok: true, text: async () => 'User-agent: *\nDisallow: /chips/' }),
    delayMs: 0,
  });
  assert.equal(out.robots, 'disallowed');
});

/* ── USAspending client ── */

const RECORDED = {
  results: [
    {
      'Award ID': 'EXAMPLE-0001',
      'Recipient Name': 'EXAMPLE FAB CO',
      'Recipient UEI': 'ABCDEF123456',
      'Award Amount': 1500000000,
      'Start Date': '2024-12-20',
      'End Date': '2030-12-31',
      'Award Type': '05',
      'Place of Performance City Code': 'PHOENIX',
      'Place of Performance State Code': 'AZ',
      'Place of Performance Country Code': 'USA',
      Description: 'CHIPS INCENTIVES AWARD',
      generated_internal_id: 'ASST_NON_EXAMPLE-0001_1341',
    },
  ],
  page_metadata: { hasNext: false },
};

test('USAspending: request body filters 11.037 from the CHIPS Act signing', () => {
  const b = USA.buildBody({ codes: ['02', '03', '04', '05'], page: 1, endDate: '2026-10-24' });
  assert.deepEqual(b.filters.program_numbers, ['11.037']);
  assert.equal(b.filters.time_period[0].start_date, '2022-08-09');
  assert.ok(b.fields.includes('Recipient UEI'));
});

test('USAspending: recorded response maps to a chips_awards row', () => {
  const row = USA.toAwardRow({ ...RECORDED.results[0], _group: 'grants' });
  assert.equal(row.source, 'usaspending');
  assert.equal(row.source_record_id, 'ASST_NON_EXAMPLE-0001_1341');
  assert.equal(row.status, 'obligated');
  assert.equal(row.award_type, 'cooperative_agreement');
  assert.equal(row.amount_usd, 1500000000);
  assert.equal(row.state_code, 'AZ');
  assert.equal(row.country, 'US');
  assert.equal(row.source_url, 'https://www.usaspending.gov/award/ASST_NON_EXAMPLE-0001_1341');
});

test('USAspending: pages until hasNext is false, per award-type group', async () => {
  const calls = [];
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body);
    calls.push(`${body.filters.award_type_codes[0]}:${body.page}`);
    const more = body.filters.award_type_codes[0] === '02' && body.page < 3;
    return {
      ok: true,
      status: 200,
      json: async () => ({ ...RECORDED, page_metadata: { hasNext: more } }),
    };
  };
  const rows = await USA.fetchAllChipsAwards({ fetchImpl, endDate: '2026-10-24', delayMs: 0 });
  assert.deepEqual(calls, ['02:1', '02:2', '02:3', '07:1']);
  assert.equal(rows.length, 4);
});

test('USAspending: retries 429/5xx with backoff, gives up after five', async () => {
  let n = 0;
  const flaky = async () => {
    n += 1;
    return n < 3
      ? { ok: false, status: 429 }
      : { ok: true, status: 200, json: async () => RECORDED };
  };
  const out = await USA.postWithRetry({}, { fetchImpl: flaky, baseDelayMs: 0 });
  assert.equal(out.results.length, 1);
  assert.equal(n, 3);
  let m = 0;
  const down = async () => {
    m += 1;
    return { ok: false, status: 503 };
  };
  await assert.rejects(USA.postWithRetry({}, { fetchImpl: down, baseDelayMs: 0 }), /503/);
  assert.equal(m, 6);
  let k = 0;
  const bad = async () => {
    k += 1;
    return { ok: false, status: 400 };
  };
  await assert.rejects(USA.postWithRetry({}, { fetchImpl: bad, baseDelayMs: 0 }), /400/);
  assert.equal(k, 1);
});

/* ── state totals and the pipeline ── */

test('state totals count a split award once per state', () => {
  const award = { id: 'n1', source: 'nist', status: 'final', amount_usd: 10300000 };
  const totals = M.incentivesByState([
    { state_code: 'TX', awards: [award] },
    { state_code: 'TX', awards: [award] },
    { state_code: 'NY', awards: [award] },
  ]);
  assert.deepEqual(totals, { TX: 10300000, NY: 10300000 });
});

/* ── admin validation ── */

test('metrics: source fields, scope and measure type are required', () => {
  const ok = V.validateMetric({
    industry_id: 'semiconductors',
    metric: 'industry_sales',
    value: '1,234.5',
    unit: 'usd',
    measure_type: 'observed',
    scope: 'US-headquartered companies, global sales',
    source_name: 'Example association report',
    source_url: 'https://example.org/report.pdf',
    source_page: 'p. 4',
    as_of: '2026-07-01',
  });
  assert.ok(ok.ok, ok.errors.join(';'));
  assert.equal(ok.row.value, 1234.5);
  const bad = V.validateMetric({
    industry_id: 'semiconductors',
    metric: 'industry_sales',
    value: '1',
    unit: 'usd',
  });
  assert.ok(!bad.ok);
  for (const k of ['measure_type', 'scope', 'source_name', 'source_url', 'as_of']) {
    assert.ok(
      bad.errors.some((e) => e.startsWith(k)),
      k,
    );
  }
  const html = V.validateMetric({ ...ok.row, scope: '<p>pasted paragraph</p>' });
  assert.ok(!html.ok);
});

test('metrics: superseding keys on industry, metric, dimension and period', () => {
  const a = { industry_id: 's', metric: 'm', dimension: { b: '2', a: '1' }, period: '2025' };
  const b = { industry_id: 's', metric: 'm', dimension: { a: '1', b: '2' }, period: '2025' };
  assert.equal(V.metricKey(a), V.metricKey(b));
  assert.notEqual(V.metricKey(a), V.metricKey({ ...b, period: '2024' }));
});

test('CSV parses quoted fields; facilities warn on project-group overlap', () => {
  const rows = V.parseCsv('metric,scope\nindustry_sales,"US, global"\n');
  assert.deepEqual(rows, [{ metric: 'industry_sales', scope: 'US, global' }]);
  const w = V.projectGroupWarnings([
    { project_group: 'g', announced_investment_usd: 1 },
    { project_group: 'g', announced_investment_usd: 2 },
    { project_group: 'h', announced_investment_usd: 3 },
  ]);
  assert.equal(w.length, 1);
});

test('self-approval: allowed by default, blocked with a second-admin rule', () => {
  assert.ok(V.canApprove('u1', 'u1'));
  assert.ok(!V.canApprove('u1', 'u1', { requireSecondAdmin: true }));
  assert.ok(V.canApprove('u2', 'u1', { requireSecondAdmin: true }));
});

/* ── RLS (static: the migration declares it) ── */

test('RLS: anon reads approved registry rows only; queue and audit are admin only', () => {
  const dir = readdirSync('supabase/migrations');
  const reg = readFileSync(
    `supabase/migrations/${dir.find((f) => f.endsWith('_industry_registry.sql'))}`,
    'utf8',
  );
  const ing = readFileSync(
    `supabase/migrations/${dir.find((f) => f.endsWith('_industry_data_ingest.sql'))}`,
    'utf8',
  );
  for (const t of ['industry_facilities', 'industry_metrics', 'industry_risks']) {
    assert.match(
      reg,
      new RegExp(
        `on public\\.${t}\\s+for select to anon, authenticated using \\(review_status = 'approved'\\)`,
      ),
    );
  }
  for (const t of ['ingest_runs', 'industry_review_queue', 'industry_audit']) {
    assert.match(ing, new RegExp(`alter table public\\.${t} enable row level security`));
    assert.ok(!new RegExp(`on public\\.${t}[^;]*to anon`).test(ing), `${t} must not grant anon`);
    assert.match(ing, new RegExp(`on public\\.${t}[^;]*is_industry_admin\\(\\)`));
  }
  assert.ok(
    !/user_metadata/.test(ing.replace(/--.*$/gm, '')),
    'admin check must not read user_metadata',
  );
});
