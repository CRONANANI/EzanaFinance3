/**
 * Armed Conflict Tracker and Sonar's conflict panel (Nov 7): the UCDP GED ingest (release
 * discovery, quarterly batches, event rows, one release per date range), the shared view
 * model, the map outlines and the wiring.
 *   npm run test:conflict-tracker
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const core = await import('@/lib/ucdp/core');
const view = await import('@/lib/ucdp/view');
const { ucdp, aggregateGed } = await import('@/lib/macro-sync/sources/events');
const { buildConflictWorld } = await import('@/lib/ucdp/world-core');
const atlas = createRequire(import.meta.url)('world-atlas/countries-110m.json');
const { countryEvidence } = await import('@/lib/sonar/landing-country');

/* Excerpt of ucdp.uu.se/apidocs as of Nov 2026. */
const DOCS = `The latest version of UCDP GED: 26.1
The latest versions of UCDP GED Candidate: Monthly release: 26.0.9 Quarterly release: 26.01.26.09
25.0.1 25.0.2 25.0.12 25.01.25.03 26.0.1 26.0.2 26.0.8 26.0.9 26.01.26.03 26.01.26.09`;

/* The sample event in the API docs. */
const EVENT = {
  id: 4,
  relid: 'YEM-2010-1-784-46',
  year: 2010,
  type_of_violence: 1,
  conflict_new_id: 230,
  conflict_name: 'Yemen (North Yemen): Government',
  dyad_new_id: 459,
  dyad_name: 'Government of Yemen (North Yemen) - AQAP',
  side_a: 'Government of Yemen (North Yemen)',
  side_b: 'AQAP',
  where_description: 'Şan’ā’ city (60 m road near Al-Eman University)',
  adm_1: 'Amānat al ‘Āşimah governorate',
  latitude: 15.354722,
  longitude: 44.206667,
  country: 'Yemen (North Yemen)',
  country_id: 678,
  region: 'Middle East',
  event_clarity: 1,
  date_prec: 1,
  date_start: '2010-09-25',
  date_end: '2010-09-25',
  deaths_a: 2,
  deaths_b: 0,
  deaths_civilians: 0,
  deaths_unknown: 0,
  best: 2,
  high: 2,
  low: 2,
};

test('release discovery: stable, newest monthly candidate per year, never backwards', () => {
  const v = core.parseUcdpVersions(DOCS);
  assert.equal(v.stable, '26.1');
  assert.equal(v.candidates[26], '26.0.9');
  assert.equal(v.candidates[25], '25.0.12');
  assert.equal(core.parseUcdpVersions('<html>loading</html>'), null);
  const merged = core.mergeVersions(
    { stable: '26.1', candidates: { 26: '26.0.10' } },
    { stable: '25.1', candidates: { 26: '26.0.9', 27: '27.0.1' } },
  );
  assert.deepEqual(merged, { stable: '26.1', candidates: { 26: '26.0.10', 27: '27.0.1' } });
  assert.equal(core.stableThrough('26.1'), 2025);
  assert.deepEqual(core.versionForYear(2025, v), { version: '26.1', candidate: false });
  assert.deepEqual(core.versionForYear(2026, v), { version: '26.0.9', candidate: true });
  assert.equal(core.versionForYear(2027, v), null);
});

test('batches: one per begun quarter over three years, cut by date_end', () => {
  const b = core.gedBatches(new Date('2026-11-07T12:00:00Z'));
  assert.equal(b.length, 12);
  assert.deepEqual(b[0], {
    year: 2024,
    quarter: 1,
    from: '2024-01-01',
    to: '2024-03-31',
    label: 'GED 2024 Q1',
  });
  assert.equal(b.at(-1).to, '2026-12-31');
  assert.equal(
    core.gedBatches(new Date('2026-02-01T00:00:00Z')).filter((x) => x.year === 2026).length,
    1,
  );
});

test('event rows: the docs sample maps cleanly; bad rows drop', () => {
  const r = core.gedRow(EVENT, { version: '26.1', candidate: false });
  assert.equal(r.iso3, 'YEM');
  assert.equal(r.date_end, '2010-09-25');
  assert.equal(r.best, 2);
  assert.equal(r.type_of_violence, 1);
  assert.equal(core.gedRow({ ...EVENT, type_of_violence: 9 }, { version: 'x' }), null);
  assert.equal(core.gedRow({ ...EVENT, id: null }, { version: 'x' }), null);
  assert.equal(core.ucdpIso3('DR Congo (Zaire)'), 'COD');
  assert.equal(core.ucdpIso3('Kingdom of eSwatini (Swaziland)'), 'SWZ');
  assert.equal(core.ucdpIso3('Bosnia-Herzegovina'), 'BIH');
});

test('monthly totals use the month of date_end', () => {
  const rows = aggregateGed([
    {
      country: 'Sudan',
      date_start: '2026-03-30',
      date_end: '2026-04-02',
      best: 7,
      type_of_violence: 1,
    },
  ]);
  assert.equal(rows.find((x) => x.series_key === 'UCDP.deaths.all:SDN').period, '2026-04');
});

test('adapter: pages a quarter with the token, stores events, replaces older releases', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, text: async () => DOCS });
  process.env.UCDP_ACCESS_TOKEN = 'test-token';
  const urls = [];
  const pages = [
    {
      TotalPages: 2,
      NextPageUrl: 'n',
      Result: [{ ...EVENT, id: 1, country: 'Sudan', date_end: '2026-04-02' }],
    },
    {
      TotalPages: 2,
      NextPageUrl: null,
      Result: [{ ...EVENT, id: 2, country: 'Sudan', date_end: '2026-05-02', type_of_violence: 3 }],
    },
  ];
  const fetchWithRetry = async (url, opts) => {
    urls.push([url, opts.headers['x-ucdp-access-token']]);
    return { status: 200, json: async () => pages[urls.length - 1] };
  };
  try {
    const batch = {
      year: 2026,
      quarter: 2,
      from: '2026-04-01',
      to: '2026-06-30',
      label: 'GED 2026 Q2',
    };
    const rows = await ucdp.fetchBatch(batch, fetchWithRetry);
    assert.equal(urls.length, 2);
    assert.match(
      urls[0][0],
      /gedevents\/26\.0\.9\?pagesize=1000&page=0&StartDate=2026-04-01&EndDate=2026-06-30/,
    );
    assert.equal(urls[0][1], 'test-token');
    assert.ok(rows.some((r) => r.series_key === 'UCDP.deaths.one-sided:SDN'));
    const calls = [];
    const q = (name) => {
      const chain = {
        delete: () => (calls.push([name, 'delete']), chain),
        gte: (c, v) => (calls.push(['gte', c, v]), chain),
        lte: (c, v) => (calls.push(['lte', c, v]), chain),
        neq: (c, v) => (calls.push(['neq', c, v]), Promise.resolve({ error: null })),
        upsert: (chunk, o) => (
          calls.push(['upsert', chunk.length, o.onConflict, chunk[0].candidate]),
          Promise.resolve({ error: null })
        ),
      };
      return chain;
    };
    await ucdp.afterBatch({ from: q }, rows);
    assert.deepEqual(calls[0], ['ucdp_ged_events', 'delete']);
    assert.deepEqual(
      calls.find((c) => c[0] === 'neq'),
      ['neq', 'version', '26.0.9'],
    );
    assert.deepEqual(
      calls.find((c) => c[0] === 'upsert'),
      ['upsert', 2, 'version,id', true],
    );
    /* An empty quarter deletes nothing. */
    const none = await core.writeGedEvents({ from: q }, { from: 'a', to: 'b', version: 'v' }, []);
    assert.deepEqual(none, { written: 0, replaced: false });
    /* A year no release covers fetches nothing. */
    assert.deepEqual(await ucdp.fetchBatch({ ...batch, year: 2031 }, fetchWithRetry), []);
  } finally {
    globalThis.fetch = realFetch;
  }
});

const OVERVIEW = {
  asof: '2026-09-10',
  window: { from: '2025-09-10', to: '2026-09-10' },
  kpis: {
    deaths: 7872,
    deaths_low: 6292,
    deaths_high: 15744,
    events: 48,
    civilians: 2608,
    prior_deaths: 6432,
    conflicts_active: 2,
    wars: 2,
    countries_active: 2,
    countries_with_deaths: 3,
  },
  monthly: [
    { month: '2026-07', type: 1, best: 400, low: 300, high: 800, events: 2, preliminary: true },
    { month: '2026-09', type: 3, best: 20, low: 16, high: 40, events: 1, preliminary: true },
  ],
  countries: [
    {
      iso3: 'SDN',
      country: 'Sudan',
      region: 'Africa',
      best: 4260,
      low: 3408,
      high: 8520,
      events: 24,
      state_based: 4020,
      non_state: 0,
      one_sided: 240,
      civilians: 1408,
      prior: 2820,
      top_conflict: 'Sudan: Government',
    },
    {
      iso3: 'UKR',
      country: 'Ukraine',
      region: 'Europe',
      best: 3600,
      low: 2880,
      high: 7200,
      events: 12,
      state_based: 3600,
      non_state: 0,
      one_sided: 0,
      civilians: 1200,
      prior: 3600,
      top_conflict: 'Russia - Ukraine',
    },
    {
      iso3: 'MEX',
      country: 'Mexico',
      region: 'Americas',
      best: 12,
      low: 9,
      high: 24,
      events: 12,
      state_based: 0,
      non_state: 12,
      one_sided: 0,
      civilians: 0,
      prior: 12,
      top_conflict: 'CJNG - Sinaloa',
    },
  ],
};

test('view: KPIs, gap-filled months, ranking, rising, ticker, map points', () => {
  const k = view.overviewKpis(OVERVIEW);
  assert.equal(k[0].value, '7,872');
  assert.equal(k[0].delta.text, '+22% vs prior 12 months');
  assert.equal(k[3].sub, '33% of all deaths');
  const m = view.monthlySeries(OVERVIEW.monthly);
  assert.deepEqual(
    m.map((r) => r.month),
    ['2026-07', '2026-08', '2026-09'],
  );
  assert.equal(m[1].total, 0);
  assert.equal(m[0].sb, 400);
  assert.equal(view.preliminaryFrom(OVERVIEW.monthly), '2026-07');
  assert.equal(view.countryRows(OVERVIEW)[0].dominant.label, 'State-based');
  assert.equal(view.countryRows(OVERVIEW, 'change')[0].iso3, 'SDN');
  assert.deepEqual(
    view.risingCountries(OVERVIEW).map((r) => r.iso3),
    ['SDN'],
  );
  assert.equal(view.tickerItems(OVERVIEW)[0].value, '4,260 deaths');
  const pts = view.mapPoints([
    [16, 33, 4020, 12, 4020, 0, 0, 'SDN'],
    [19, -99, 12, 12, 0, 12, 0, 'MEX'],
  ]);
  assert.deepEqual([pts[0].x, pts[0].y, pts[0].type], [213, 69, 1]);
  assert.ok(pts[0].r > pts[1].r);
});

const COUNTRY = {
  iso3: 'SDN',
  country: 'Sudan',
  region: 'Africa',
  window: { from: '2025-09-10', to: '2026-09-10' },
  kpis: {
    deaths: 4260,
    deaths_low: 3408,
    deaths_high: 8520,
    events: 24,
    civilians: 1408,
    prior_deaths: 2820,
    global_share: 0.5412,
    state_based: 4020,
    non_state: 0,
    one_sided: 240,
  },
  monthly: OVERVIEW.monthly,
  conflicts: [{ id: 309, name: 'Sudan: Government', type: 1, best: 4020, events: 12 }],
  actors: [
    { actor: 'RSF', best: 4260 },
    { actor: 'Government of Sudan', best: 4020 },
  ],
  latest: [],
};

test('country findings and the Sonar cue', () => {
  const f = view.countryFindings(COUNTRY);
  assert.match(
    f[0],
    /^UCDP recorded 4,260 deaths in organized violence in Sudan in the 12 months to Sep 10, 2026 \(range 3,408 to 8,520\)/,
  );
  assert.match(f[0], /up 51% on the 12 months before/);
  assert.match(f[2], /deadliest conflict was Sudan: Government/);
  assert.ok(f.every((s) => !/—/.test(s)));
  assert.equal(view.countryKpis(COUNTRY)[3].value, '54.1%');
  assert.ok(view.majorConflict(COUNTRY));
  for (const q of [
    'Is violence in Sudan rising?',
    'How deadly is the war in Ukraine?',
    'conflict risk in Mali',
  ])
    assert.ok(view.CONFLICT_CUE_RE.test(q), q);
  assert.ok(!view.CONFLICT_CUE_RE.test("Is Turkey's lira under pressure?"));
});

test('Sonar country evidence carries the conflict snippet', () => {
  const ev = countryEvidence({ name: 'Sudan', conflict: COUNTRY });
  const c = ev.find((e) => e.corpus === 'conflict');
  assert.ok(c);
  assert.match(c.snippet, /4,260 deaths/);
});

test('map outlines are keyed by ISO3', () => {
  const w = buildConflictWorld(atlas);
  assert.equal(w.w, 360);
  const iso = new Set(w.countries.map((c) => c.iso3));
  for (const code of ['SDN', 'UKR', 'MMR', 'COD', 'MEX', 'SSD']) assert.ok(iso.has(code), code);
  assert.ok(w.countries.length > 150);
});

test('wiring: page, API routes, dataset shell, Sonar layouts, engine', () => {
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  for (const p of [
    'src/app/datasets/conflict/page.js',
    'src/app/datasets/conflict/ConflictClient.jsx',
    'src/app/api/datasets/conflict/map/route.js',
    'src/app/api/datasets/conflict/country/route.js',
  ])
    assert.ok(existsSync(new URL(`../${p}`, import.meta.url)), p);
  assert.match(read('src/app/datasets/layout.js'), /'\/datasets\/conflict'/);
  assert.equal((read('src/app/datasets/ds-cards.css').match(/\.cfx-card,/g) || []).length, 2);
  assert.match(read('src/app/datasets/ds-align.css'), /\.cfx-page/);
  assert.match(
    read('src/components/landing/SonarCountryBoard.jsx'),
    /dossier\.conflict && dossier\.conflictFocus/,
  );
  assert.match(read('src/components/landing/SonarCountryStack.jsx'), /<ConflictCountryPanel/);
  assert.match(read('src/lib/sonar/engine/domains.js'), /macro_country: 0\.6/);
  assert.doesNotMatch(
    read('sonar-skills/geopolitical-country-risk/SKILL.md'),
    /pending activation/,
  );
  for (const p of [
    'src/app/datasets/conflict/ConflictClient.jsx',
    'src/app/datasets/conflict/Cards.jsx',
    'src/components/conflict/ConflictCountryPanel.jsx',
    'src/lib/ucdp/view.js',
  ])
    assert.doesNotMatch(read(p), /—/, `${p} has an em dash`);
});
