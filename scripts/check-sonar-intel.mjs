/**
 * Sonar Country & Currency Intelligence (Nov 2026): understanding and routing, the currency
 * computations and assessment, the structured brief and its validator, the landing pipeline's
 * country-question path against a stubbed database and provider, and the attribution rule on
 * the text Sonar sends to the model.
 *
 * Run: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-intel.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.SONAR_PING_CACHE_TTL_S = '0';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key-not-real';

const { understandQuery } = await import('@/lib/sonar/understand');
const { routeMacro } = await import('@/lib/sonar/macro/route');
const { findCurrency } = await import('@/lib/sonar/macro/currencies');
const { frameworksFor } = await import('@/lib/sonar/macro/intel');
const PB = await import('@/lib/sonar/macro/playbook');
const CUR = await import('@/lib/sonar/macro/currency');
const IB = await import('@/lib/sonar/macro/intel-brief');
const { runLandingPipeline, evidenceBrief } = await import('@/lib/sonar/landing-pipeline');

const NOW = new Date('2026-11-06T00:00:00Z');
const FIX = JSON.parse(
  readFileSync(new URL('./fixtures/macro-turkey.json', import.meta.url), 'utf8'),
).series;

/* ---------------------------------------------------------------- a stub Supabase client */

function stubDb(tables = {}) {
  return {
    rpc: async () => ({ data: null, error: { message: 'missing' } }),
    from(table) {
      const st = { filters: [], limit: null, order: null };
      const q = {
        select: () => q,
        eq: (c, v) => (st.filters.push((r) => r[c] === v), q),
        neq: () => q,
        in: (c, vs) => (st.filters.push((r) => vs.includes(r[c])), q),
        is: () => q,
        not: () => q,
        like: () => q,
        ilike: () => q,
        or: () => q,
        contains: () => q,
        overlaps: () => q,
        gte: (c, v) => (st.filters.push((r) => String(r[c] ?? '') >= String(v)), q),
        lte: () => q,
        gt: () => q,
        lt: () => q,
        range: () => q,
        textSearch: () => q,
        maybeSingle: () => q,
        single: () => q,
        order: (c, o) => ((st.order = { c, asc: o?.ascending !== false }), q),
        limit: (n) => ((st.limit = n), q),
        insert: () => q,
        upsert: () => q,
        update: () => q,
        delete: () => q,
        then: (res, rej) => {
          let rows = (tables[table] || []).filter((r) => st.filters.every((f) => f(r)));
          if (st.order) {
            rows = [...rows].sort((a, b) =>
              String(a[st.order.c]) < String(b[st.order.c]) ? -1 : 1,
            );
            if (!st.order.asc) rows.reverse();
          }
          if (st.limit != null) rows = rows.slice(0, st.limit);
          return Promise.resolve({ data: rows, error: null }).then(res, rej);
        },
      };
      return q;
    },
  };
}

const L = (source, series_key, country_iso3, period, value, extra = {}) => ({
  source,
  series_key,
  country_iso3,
  period,
  value,
  series_name: null,
  unit: null,
  frequency: null,
  dataset: null,
  year_ago_period: null,
  year_ago_value: null,
  ...extra,
});
const last = (arr) => arr[arr.length - 1];
const at = (arr, period) => arr.find((p) => p.period === period);

const KEYS = {
  fx: ['bis', 'WS_XRU:M.TR.TRY.A'],
  cpi: ['imf', 'IMF.CPI:dataflow.TUR.CPI._T.IX.M'],
  policy: ['bis', 'WS_CBPOL:M.TR'],
  reer: ['bis', 'WS_EER:M.R.B.TR'],
};
function turkeyTables() {
  const latest = [];
  const values = [];
  for (const [k, [source, key]] of Object.entries(KEYS)) {
    const s = FIX[k];
    const l = last(s);
    const y = String(Number(l.period.slice(0, 4)) - 1) + l.period.slice(4);
    const ya = at(s, y);
    latest.push(
      L(source, key, 'TUR', l.period, l.value, {
        frequency: 'M',
        year_ago_period: ya?.period || null,
        year_ago_value: ya?.value ?? null,
        series_name: k === 'fx' ? 'TRY per US dollar' : null,
      }),
    );
    for (const p of s) values.push({ source, series_key: key, period: p.period, value: p.value });
  }
  latest.push(L('imf', 'IMF.WEO:dataflow.TUR.BCA_NGDPD.A', 'TUR', '2025', -1.4));
  return { macro_series_latest: latest, macro_series_values: values };
}

/* ---------------------------------------------------------------- routing */

test('understand: possessive is a reading, either apostrophe, noCorrect or not', async () => {
  for (const q of ["Is Turkey's lira under pressure?", 'Is Turkey’s lira under pressure?']) {
    for (const noCorrect of [false, true]) {
      const u = await understandQuery(q, { noCorrect });
      assert.equal(u.intent, 'country_question', `${q} noCorrect=${noCorrect}`);
      assert.deepEqual(u.corrections, []);
      assert.equal(u.display, "Is Turkey's lira under pressure?");
      assert.ok(u.entities.some((e) => e.kind === 'country'));
    }
  }
});

test('understand: a bare country stays a profile; question forms are questions', async () => {
  for (const q of ['Turkey', 'Turkey economy', 'tell me about Turkey']) {
    assert.equal((await understandQuery(q)).intent, 'country', q);
  }
  for (const q of ["How is Brazil's economy doing?", "What is Japan's policy rate?"]) {
    assert.equal((await understandQuery(q)).intent, 'country_question', q);
  }
});

test('routing: currency words imply a country and the currency framework', () => {
  const lira = routeMacro('Is the lira under pressure?');
  assert.equal(lira.currency.iso3, 'TUR');
  assert.ok(lira.countries.includes('TUR'));
  assert.ok(lira.themes.includes('currency'));
  assert.ok(frameworksFor(lira).includes('currency'));
  for (const f of ['fx_usd', 'policy_rate', 'inflation_monthly']) {
    assert.ok(PB.FRAMEWORKS.currency.families.includes(f), f);
  }
  const peso = findCurrency('What is the peso doing?');
  assert.equal(peso.ambiguous, true);
  assert.deepEqual(peso.candidates, ['ARG', 'MEX', 'COL', 'CHL', 'PHL']);
  assert.equal(findCurrency('Is the Mexican peso weak?').iso3, 'MEX');
  assert.equal(findCurrency('Who won the election?'), null);
  assert.equal(findCurrency('the real issue is rates'), null);
  assert.equal(findCurrency('Rand Paul stock trades'), null);
});

test('routing: Argentina, Japan, Nigeria and Egypt questions reach the right frameworks', () => {
  const cases = [
    ['Is Argentina heading toward another currency crisis?', 'ARG', 'currency'],
    ["Is Japan's yen undervalued?", 'JPN', 'currency'],
    ['Is Nigeria experiencing external financing stress?', 'NGA', 'currency'],
    ["Is Egypt's currency sustainable?", 'EGY', 'currency'],
  ];
  for (const [q, iso3, fw] of cases) {
    const r = routeMacro(q);
    assert.ok(r.countries.includes(iso3), `${q} -> ${r.countries}`);
    assert.ok(frameworksFor(r).includes(fw), `${q} -> ${frameworksFor(r)}`);
  }
});

/* ---------------------------------------------------------------- assessment */

test('assessCurrencyPressure: Turkey-like inputs are elevated', () => {
  const a = PB.assessCurrencyPressure({
    fxNow: 48.65,
    fxYearAgo: 41.33,
    inflationAnnual: 29.7,
    inflationAnnualYearAgo: 33.3,
    policyRate: 37,
    policyRateChange1y: -3.5,
    currentAccountPctGdp: -1.4,
  });
  assert.equal(a.overall, 'elevated');
  assert.equal(a.crisisEstablished, false);
});

test('assessCurrencyPressure: stable low, crisis severe, appreciating low, missing null', () => {
  const stable = PB.assessCurrencyPressure({
    fxNow: 1.01,
    fxYearAgo: 1.0,
    inflationAnnual: 2.1,
    policyRate: 4.5,
    policyRateChange1y: 0,
    currentAccountPctGdp: 1.5,
  });
  assert.equal(stable.overall, 'low');
  const crisis = PB.assessCurrencyPressure({
    fxNow: 200,
    fxYearAgo: 100,
    fx3mAgo: 150,
    inflationAnnual: 80,
    policyRate: 40,
    policyRateChange1y: -10,
    reservesNow: 10,
    reserves3mAgo: 20,
    currentAccountPctGdp: -6,
  });
  assert.equal(crisis.overall, 'severe');
  const up = PB.assessCurrencyPressure({
    fxNow: 90,
    fxYearAgo: 100,
    inflationAnnual: 2,
    policyRate: 4,
    policyRateChange1y: 0,
    currentAccountPctGdp: 2,
  });
  assert.equal(up.overall, 'low');
  const none = PB.assessCurrencyPressure({});
  assert.equal(none.overall, null);
  assert.ok(none.missing.length >= 3);
});

/* ---------------------------------------------------------------- computations */

test('both conventions: 41.33 to 48.65', () => {
  assert.equal(CUR.dollarDearerPct(41.33, 48.65).toFixed(1), '17.7');
  assert.equal(CUR.valueLostPct(41.33, 48.65).toFixed(1), '15.0');
  const pic = CUR.buildCurrencyPicture(
    {
      fx: [
        { period: '2025-09', value: 41.33 },
        { period: '2026-09', value: 48.65 },
      ],
    },
    { currency: { code: 'TRY', short: 'lira' }, place: 'Turkey', now: NOW },
  );
  const s = pic.statements.join(' ');
  assert.match(s, /the dollar costs 17\.7\d?% more in lira/);
  assert.match(s, /the lira lost 15\.0\d?% of its dollar value/);
});

test('the Turkey fixture: elevated, ex-post real rate labelled, freshness tags', () => {
  const pic = CUR.buildCurrencyPicture(
    {
      fx: FIX.fx,
      reer: FIX.reer,
      inflation: { history: FIX.cpi, mode: 'index' },
      policy: FIX.policy,
      external: { currentAccount: { value: -1.4, period: '2025', unit: '% of GDP' } },
    },
    { currency: { code: 'TRY', short: 'lira' }, place: 'Turkey', now: NOW },
  );
  assert.equal(pic.assessment.overall, 'elevated');
  const s = pic.statements.join(' ');
  assert.match(s, /Ex-post real policy rate \(policy rate minus latest annual inflation\)/);
  assert.match(s, /Annual inflation, Sep 2026: 29\.7/);
  assert.ok(pic.kpis.length <= 4 && pic.kpis.length >= 3);
  assert.ok(pic.missing.includes('sovereign CDS spreads'));
  assert.ok(pic.missing.includes('inflation expectations'));
  assert.equal(CUR.freshness('2026-08', 'fxMonthly', NOW), 'not current');
  assert.equal(CUR.freshness('2026-09', 'fxMonthly', NOW), 'current');
  assert.equal(CUR.freshness('2026-11-04', 'fx', NOW), 'current');
  assert.equal(CUR.freshness('2026-10', 'policy', NOW), 'current');
  assert.equal(CUR.freshness('2026-07', 'cpi', NOW), 'not current');
});

/* ---------------------------------------------------------------- the structured brief */

const ALLOWED = [
  'TRY per US dollar, Sep 2026: 48.65; Sep 2025: 41.33. Over the year the dollar costs 17.71% more in lira, and the lira lost 15.04% of its dollar value.',
  'Annual inflation, Sep 2026: 29.73%, falling from 33.29% in Sep 2025.',
  'Policy rate, Sep 2026: 37%, down 3.5 percentage points from 40.5% in Sep 2025. Ex-post real policy rate: 7.27 percentage points.',
];
const GOOD = {
  answer:
    'Yes. The lira is under sustained pressure: the dollar costs 17.7% more than in Sep 2025 and the lira lost 15.0% of its dollar value.',
  assessmentLine: 'Sustained depreciation, not an acute crisis on the evidence held.',
  drivers: [
    {
      title: 'Inflation still high',
      text: 'Annual inflation was 29.73% in Sep 2026, down from 33.29%.',
      refs: ['S2'],
    },
    {
      title: 'Easing from a high rate',
      text: 'The policy rate fell 3.5 points to 37%.',
      refs: ['S3'],
    },
    { title: 'Invented', text: 'Reserves fell 42% in a month.', refs: ['S9'] },
  ],
  scenarios: [
    {
      name: 'Disinflation holds',
      conditions: 'If inflation keeps falling',
      implication: 'then depreciation may slow.',
    },
    {
      name: 'Easing too fast',
      conditions: 'If the ex-post real rate turns negative',
      implication: 'then pressure rises.',
    },
    {
      name: 'Shock',
      conditions: 'If external funding tightens',
      implication: 'then reserves are tested.',
    },
  ],
  monitor: [
    { indicator: 'Monthly inflation', why: 'shows whether disinflation continues' },
    { indicator: 'Policy rate decisions', why: 'the real rate cushion' },
    { indicator: 'Reserves', why: 'capacity to smooth moves' },
    { indicator: 'USD/TRY pace', why: 'acceleration would signal stress' },
  ],
  bottomLine:
    'The evidence shows sustained pressure, not a crisis. It does not establish disorderly markets. Over 6 to 12 months the real rate matters most.',
};

test('intel brief: validator drops an unsupported driver and keeps the rest', () => {
  const v = IB.validateIntelBrief(IB.parseIntelBrief(`Here: ${JSON.stringify(GOOD)}`), {
    allowedTexts: ALLOWED,
  });
  assert.equal(v.ok, true);
  assert.equal(v.brief.drivers.length, 2);
  assert.ok(v.dropped.some((d) => /Invented/.test(d)));
  assert.equal(v.brief.scenarios.length, 3);
  for (const f of IB.INTEL_FIELDS) assert.ok(f in v.brief, f);
  const rows = IB.assessmentRows({ assessment: { components: [] } }, v.brief);
  assert.deepEqual(rows[rows.length - 1], {
    id: 'crisis',
    label: 'Imminent currency crisis',
    level: 'not established',
  });
});

test('intel brief: a crisis call without qualifying evidence fails validation', () => {
  const bad = {
    ...GOOD,
    answer: 'Yes. Turkey is in a currency crisis, the dollar costs 17.7% more.',
  };
  const v = IB.validateIntelBrief(bad, {
    allowedTexts: ALLOWED,
    picture: { assessment: { components: [] } },
  });
  assert.equal(v.ok, false);
  const un = { ...GOOD, answer: 'Yes. The lira lost 61% this year.' };
  assert.equal(IB.validateIntelBrief(un, { allowedTexts: ALLOWED }).ok, false);
});

test('intel brief: plain text has no em dash and no Source: text', () => {
  const v = IB.validateIntelBrief(GOOD, { allowedTexts: ALLOWED });
  const text = IB.intelBriefText(v.brief, { label: 'Elevated pressure' });
  assert.match(text, /^Yes\./);
  assert.ok(!/[—]/.test(text));
  assert.ok(!/Source:/.test(text));
});

test('evidence fallback: inline "Source: ..." never reaches the visitor', () => {
  const out = evidenceBrief('Turkey', [
    {
      corpus: 'macro',
      marker: 'S1',
      snippet:
        'Turkey: TRY per US dollar 48.65 (Sep 2026). Source: Bank for International Settlements, BIS Statistics (data.bis.org).',
    },
  ]);
  assert.ok(!/Source:/.test(out), out);
  assert.match(out, /\[S1\]/);
});

/* ---------------------------------------------------------------- the pipeline */

function stubFetch(answerFor) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.anthropic.com/')) {
      const body = JSON.parse(init.body);
      calls.push(body);
      const out = await answerFor(body, init);
      return new Response(
        JSON.stringify({
          model: body.model,
          content: [{ type: 'text', text: out }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('{}', { status: 404 });
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

function pipelineBrief(body) {
  /* Answer only from numbers the prompt carries. */
  const src = body.messages[0].content;
  const dollar = /dollar costs ([\d.]+)% more/.exec(src)?.[1];
  const lost = /lira lost ([\d.]+)% of its dollar value/.exec(src)?.[1];
  const infl = /Annual inflation, Sep 2026: ([\d.]+)%/.exec(src)?.[1];
  const pol = /Policy rate, Sep 2026: ([\d.]+)%/.exec(src)?.[1];
  return JSON.stringify({
    ...GOOD,
    answer: `Yes. Over the year the dollar costs ${dollar}% more in lira and the lira lost ${lost}% of its dollar value.`,
    drivers: [
      { title: 'Inflation', text: `Annual inflation was ${infl}% in Sep 2026.`, refs: ['S1'] },
      { title: 'Policy easing', text: `The policy rate is ${pol}%.`, refs: ['S1'] },
      { title: 'Expectations', text: 'Residents hold foreign currency as a hedge.', refs: ['S1'] },
    ],
  });
}

test('pipeline: "Is Turkey\'s lira under pressure?" answers first, from the macro read', async () => {
  const db = stubDb(turkeyTables());
  const f = stubFetch((body) => pipelineBrief(body));
  try {
    const r = await runLandingPipeline("Is Turkey's lira under pressure?", {
      admin: db,
      wantDossier: true,
      deadlineAt: Date.now() + 25_000,
    });
    assert.equal(r.understood.intent, 'country_question');
    assert.deepEqual(r.understood.corrections, []);
    assert.equal(r.understood.display, "Is Turkey's lira under pressure?");
    assert.equal(r.briefKind, 'model', r.failedAt.join(','));
    assert.match(r.answer, /^Yes\./);
    assert.ok(r.countryIntel, 'intel view');
    assert.equal(r.countryIntel.focus, 'FX risk');
    assert.equal(r.countryIntel.assessmentLabel, 'Elevated pressure');
    for (const k of IB.INTEL_FIELDS) assert.ok(k in r.countryIntel.brief, k);
    assert.ok(!r.corporaUsed.includes('contracts'));
    /* Evidence carries the exchange rate, the policy rate and inflation for TUR. */
    const sys = f.calls[0].system;
    const user = f.calls[0].messages[0].content;
    assert.match(sys, /Currency pressure/);
    assert.match(user, /TRY per US dollar/);
    assert.match(user, /Policy rate, Sep 2026/);
    assert.match(user, /Annual inflation, Sep 2026/);
    /* Synthesis starts with at least 8 s left. */
    assert.ok(r.timing.synthesisStartMsLeft >= 8_000, String(r.timing.synthesisStartMsLeft));
  } finally {
    f.restore();
  }
});

test('pipeline: "Is the lira under pressure?" routes to Turkey through the currency map', async () => {
  const db = stubDb(turkeyTables());
  const f = stubFetch((body) => pipelineBrief(body));
  try {
    const r = await runLandingPipeline('Is the lira under pressure?', {
      admin: db,
      wantDossier: true,
      deadlineAt: Date.now() + 25_000,
    });
    assert.equal(r.country?.iso3, 'TUR');
    assert.ok(r.countryIntel);
    assert.match(r.answer, /^Yes\./);
  } finally {
    f.restore();
  }
});

test('pipeline: when the provider times out, the fallback opens with the computed direction line', async () => {
  const db = stubDb(turkeyTables());
  /* A provider that never answers: the hop's abort fires; a real timer keeps the
     test's event loop alive the way an open socket would. */
  const f = stubFetch(
    (_b, init) =>
      new Promise((_res, rej) => {
        const keep = setTimeout(
          () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          30_000,
        );
        init.signal?.addEventListener('abort', () => {
          clearTimeout(keep);
          rej(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      }),
  );
  try {
    const r = await runLandingPipeline("Is Turkey's lira under pressure?", {
      admin: db,
      wantDossier: false,
      deadlineAt: Date.now() + 12_000,
    });
    assert.equal(r.briefKind, 'evidence');
    assert.match(r.answer, /^By Ezana's thresholds, pressure on the lira is elevated\./);
    assert.ok(!/Source:/.test(r.answer), r.answer);
    assert.notEqual(r.briefKind, 'general');
  } finally {
    f.restore();
  }
});

test('pipeline: "What is the peso doing?" asks which peso, with a chip per country', async () => {
  const f = stubFetch(() => 'unused');
  try {
    const r = await runLandingPipeline('What is the peso doing?', {
      admin: stubDb({}),
      wantDossier: false,
      deadlineAt: Date.now() + 10_000,
    });
    assert.match(r.answer, /^Which peso\?/);
    assert.match(r.answer, /Argentina/);
    assert.match(r.answer, /Mexico/);
    const amb = r.understood.ambiguities.find((a) => a.surface === 'peso');
    assert.ok(amb && amb.alternatives.length === 5);
    assert.equal(r.resolved, null);
    assert.equal(f.calls.length, 0, 'no model call');
  } finally {
    f.restore();
  }
});

test('pipeline: "Turkey" keeps the country profile', async () => {
  const f = stubFetch(() => 'Turkey profile [S1].');
  try {
    const r = await runLandingPipeline('Turkey', {
      admin: stubDb(turkeyTables()),
      wantDossier: false,
      deadlineAt: Date.now() + 10_000,
    });
    assert.equal(r.understood.intent, 'country');
    assert.equal(r.countryIntel, null);
  } finally {
    f.restore();
  }
});

/* ---------------------------------------------------------------- attribution */

/* People who write about macro cycles, currencies and national strength, plus generic
   bibliographic words. The text Sonar sends the model names none of them. */
const NAMES =
  /\b(dalio|bridgewater|keynes|minsky|friedman|hayek|krugman|roubini|rogoff|reinhart|kindleberger|soros|bernanke|summers|el-erian|mises|fisher|samuelson)\b/i;
const BANNED = /\bplaybook\b|\bbooks?\b|\bauthor\b/i;

export function assertNoAttribution(text, label) {
  assert.ok(!NAMES.test(text), `${label} names a person: ${NAMES.exec(text)?.[0]}`);
  assert.ok(!BANNED.test(text), `${label} says ${BANNED.exec(text)?.[0]}`);
}

test('attribution: the lens, every framework and the intel prompt name no playbook, author or book', () => {
  assertNoAttribution(PB.MACRO_LENS, 'MACRO_LENS');
  for (const id of Object.keys(PB.FRAMEWORKS)) {
    assertNoAttribution(PB.frameworkPrompt([id]), `frameworkPrompt(${id})`);
  }
  assertNoAttribution(IB.intelSystemPrompt(['currency', 'debt', 'strength']), 'intelSystemPrompt');
  for (const v of Object.values(PB.PRESSURE_LABEL)) assertNoAttribution(v, 'PRESSURE_LABEL');
});

test('attribution: the assembled landing prompts name no playbook, author or book', async () => {
  const f = stubFetch((body) => pipelineBrief(body));
  try {
    for (const q of ["Is Turkey's lira under pressure?", 'Turkey', 'What is driving oil prices?']) {
      await runLandingPipeline(q, {
        admin: stubDb(turkeyTables()),
        wantDossier: false,
        deadlineAt: Date.now() + 15_000,
      });
    }
    assert.ok(f.calls.length >= 2);
    for (const c of f.calls) {
      assertNoAttribution(c.system, 'landing system prompt');
      assert.match(c.system, /How Ezana reasons about any economic question/);
      if (/numbered/.test(c.system)) assert.match(c.system, /most recent observed figure/);
    }
  } finally {
    f.restore();
  }
});

/* ---------------------------------------------------------------- contracts (A5) */

const CONTRACTS = await import('@/lib/research-copilot/retrievers/contracts');
function contractsDb(rows) {
  return {
    from: () => {
      const q = {
        select: () => q,
        order: () => q,
        limit: () => q,
        gte: () => q,
        or: () => q,
        then: (r) => Promise.resolve({ data: rows, error: null }).then(r),
      };
      return q;
    },
  };
}
const AWARDS = [
  {
    generated_award_id: 1,
    recipient_name: 'THUNDERCAT TECHNOLOGY LLC',
    award_amount: 5e6,
    awarding_agency: 'Department of Defense',
  },
  {
    generated_award_id: 2,
    recipient_name: 'THUNDERYARD INC',
    award_amount: 3e6,
    awarding_agency: 'General Services Administration',
  },
  {
    generated_award_id: 3,
    recipient_name: 'TURKEY HILL DAIRY',
    award_amount: 1e6,
    awarding_agency: 'Department of Agriculture',
  },
];

test('contracts: a currency question returns nothing; "Thundercat contracts" still finds Thundercat', async () => {
  const none = await CONTRACTS.retrieve("Is Turkey's lira under pressure?", {
    admin: contractsDb(AWARDS),
    entities: { keywords: ['turkey', 'lira', 'under', 'pressure'], names: ['Turkey'] },
  });
  assert.deepEqual(none, []);
  const hit = await CONTRACTS.retrieve('Thundercat contracts', {
    admin: contractsDb(AWARDS),
    entities: { keywords: ['thundercat', 'contracts'] },
  });
  assert.deepEqual(
    hit.map((h) => h.meta.recipient),
    ['THUNDERCAT TECHNOLOGY LLC'],
  );
  assert.ok(!CONTRACTS.wholeWord('under').test('thundercat technology llc'));
  assert.deepEqual(
    CONTRACTS.contractKeywords('x', ['under', 'pressure', 'turkey', 'lira', 'raytheon']),
    ['raytheon'],
  );
});

/* ---------------------------------------------------------------- deep research (C, D4) */

const PLANNER = await import('@/lib/sonar/engine/planner');
const ENGINE = await import('@/lib/sonar/engine/engine');
const FINDINGS = await import('@/lib/sonar/engine/findings');
const MEMO = await import('@/lib/sonar/engine/investment-memo');

test('deep research: the currency framework families are required macro_series evidence', () => {
  const p = PLANNER.macroSeriesParams({ rawQuery: "Is Turkey's lira under pressure?" }, null);
  assert.ok(p.frameworks.includes('currency'));
  for (const f of [
    'fx_usd',
    'policy_rate',
    'inflation_monthly',
    'fx_reserves',
    'external_debt',
    'credit_gap',
  ]) {
    assert.ok(p.required.includes(f), f);
    assert.ok(p.families.includes(f), f);
  }
  assert.deepEqual(p.countries, ['TUR']);
});

test('deep research: stress episodes from our own series, with inflation and the policy rate', () => {
  const fx = [];
  for (let y = 2019; y <= 2023; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      const t = (y - 2019) * 12 + m;
      /* Calm, then a sharp fall in 2021 to 2022, then calm. */
      const v = t < 30 ? 7 : t < 42 ? 7 * 1.06 ** (t - 29) : 7 * 1.06 ** 12;
      fx.push({ period: `${y}-${String(m).padStart(2, '0')}`, value: v });
    }
  }
  const eps = CUR.stressEpisodes(fx, {
    inflation: [{ period: '2022-04', value: 78.6 }],
    policy: [{ period: '2022-04', value: 14 }],
  });
  assert.equal(eps.length, 1);
  assert.ok(eps[0].peakLostPct >= 25);
  const line = CUR.episodesStatement(eps, { currency: { short: 'lira' } });
  assert.match(line, /Stress episodes in Ezana's own series/);
  assert.match(line, /annual inflation 78\.6%/);
  assert.ok(!/[—]/.test(line));
});

test('attribution: report, memo and fund-fit prompts carry the lens and name no playbook, author or book', () => {
  const country = ENGINE.macroAddendum({ rawQuery: "Is Turkey's lira under pressure?" }, null);
  assert.match(country, /Currency pressure/);
  assert.match(country, /Historical stress episodes/);
  const company = ENGINE.macroAddendum({ rawQuery: 'NVIDIA risks', memoKind: 'risk' }, null);
  assert.match(company, /How Ezana reasons about any economic question/);
  for (const [label, text] of [
    ['SYNTHESIS_SYSTEM', FINDINGS.SYNTHESIS_SYSTEM + country],
    ['MEMO_SYSTEM', MEMO.MEMO_SYSTEM + company],
    ['POSITIONING_SYSTEM', MEMO.POSITIONING_SYSTEM + company],
    ['FUND_FIT_SYSTEM', MEMO.FUND_FIT_SYSTEM + company],
    ['CURRENCY_REPORT_ADDENDUM', ENGINE.CURRENCY_REPORT_ADDENDUM],
  ]) {
    assertNoAttribution(text, label);
  }
});
