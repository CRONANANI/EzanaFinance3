/**
 * Sonar macro wiring (Nov 2026): the series catalogue, the readers against a stubbed
 * database, routing, euro-area handling, projections, rankings, attribution, the
 * NOT_SURFACED coverage rule, and the international sanctions lists.
 *   npm run test:sonar-macro
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const C = await import('../src/lib/sonar/macro/catalog.js');
const R = await import('../src/lib/sonar/macro/route.js');
const S = await import('../src/lib/sonar/macro/series-store.js');
const { ADAPTERS } = await import('../src/lib/macro-sync/index.js');
const { macroSeriesParams, memoContextCountries } =
  await import('../src/lib/sonar/engine/planner.js');
const { weightOf, DEFAULT_CONFIG, SOURCES } = await import('../src/lib/sonar/engine/domains.js');
const { analyze, fiveYearPercentile } = await import('../src/lib/sonar/engine/analysis.js');
const SI = await import('../src/lib/sonar/sanctions-intl.js');

const NOW = new Date('2026-11-06T00:00:00Z');

/* ---------------------------------------------------------------- a stub Supabase client */

const likeRe = (p) =>
  new RegExp(
    `^${String(p)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/%/g, '.*')
      .replace(/_/g, '.')}$`,
    'i',
  );

function stubDb(tables = {}, rpcs = {}) {
  const calls = [];
  return {
    calls,
    rpc: async (name, args) =>
      rpcs[name]
        ? { data: rpcs[name](args), error: null }
        : { data: null, error: { message: 'missing' } },
    from(table) {
      const st = { filters: [], limit: null, order: null, head: false };
      const q = {
        select: (_c, o) => ((st.head = Boolean(o?.head)), q),
        eq: (c, v) => (calls.push(`${table}.${c}=${v}`), st.filters.push((r) => r[c] === v), q),
        in: (c, vs) => (st.filters.push((r) => vs.includes(r[c])), q),
        is: (c, v) => (st.filters.push((r) => (r[c] ?? null) === v), q),
        like: (c, p) => (st.filters.push((r) => likeRe(p).test(String(r[c] ?? ''))), q),
        ilike: (c, p) => (st.filters.push((r) => likeRe(p).test(String(r[c] ?? ''))), q),
        gte: (c, v) => (st.filters.push((r) => String(r[c] ?? '') >= String(v)), q),
        contains: (c, arr) => (
          st.filters.push((r) => arr.every((x) => (r[c] || []).includes(x))),
          q
        ),
        or: (expr) => {
          const parts = expr.split(/,(?=\w+\.)/);
          st.filters.push((r) =>
            parts.some((p) => {
              let m;
              if ((m = /^(\w+)\.ilike\.(.*)$/.exec(p)))
                return likeRe(m[2]).test(String(r[m[1]] ?? ''));
              if ((m = /^(\w+)\.cs\.\{"(.*)"\}$/.exec(p))) return (r[m[1]] || []).includes(m[2]);
              return false;
            }),
          );
          return q;
        },
        order: (c, o) => ((st.order = { c, asc: o?.ascending !== false }), q),
        limit: (n) => ((st.limit = n), q),
        then: (res, rej) => {
          try {
            let rows = (tables[table] || []).filter((r) => st.filters.every((f) => f(r)));
            if (st.order) {
              rows = [...rows].sort((a, b) =>
                String(a[st.order.c]) < String(b[st.order.c]) ? -1 : 1,
              );
              if (!st.order.asc) rows.reverse();
            }
            if (st.limit != null) rows = rows.slice(0, st.limit);
            return Promise.resolve(
              st.head ? { count: rows.length, error: null } : { data: rows, error: null },
            ).then(res, rej);
          } catch (e) {
            return Promise.reject(e).then(res, rej);
          }
        },
      };
      return q;
    },
  };
}

/* A latest row the way macro_series_latest returns it. */
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
const ya = (period, value) => ({ year_ago_period: period, year_ago_value: value });

/* ---------------------------------------------------------------- fixture rows per family */

const FAMILY_FIXTURES = {
  gdp_growth: [
    L('imf', 'IMF.WEO:dataflow.TUR.NGDP_RPCH.A', 'TUR', '2025', 3.2),
    L('eurostat', 'ESTAT.nama_10_gdp:DE.CLV_PCH_PRE.B1GQ', 'DEU', '2025', 0.4),
  ],
  inflation_annual: [L('imf', 'IMF.WEO:dataflow.TUR.PCPIPCH.A', 'TUR', '2025', 35.1)],
  unemployment: [
    L('imf', 'IMF.WEO:dataflow.TUR.LUR.A', 'TUR', '2025', 8.7),
    L('ilostat', 'ILO.UNE_DEAP_SEX_AGE_RT_A:KEN.AGE_YTHADULT_YGE15', 'KEN', '2025', 5.6),
    L('eurostat', 'ESTAT.une_rt_m:AT.SA.TOTAL.T.PC_ACT', 'AUT', '2026-09', 5.4),
    L('ons', 'ONS:MGSX', 'GBR', '2026-Q2', 4.7),
    L('ecb', 'ECB.AME:A.DEU.1.0.0.0.ZUTN', null, '2025', 3.5),
  ],
  gov_debt: [L('imf', 'IMF.WEO:dataflow.JPN.GGXWDG_NGDP.A', 'JPN', '2025', 236)],
  gov_balance: [L('imf', 'IMF.WEO:dataflow.JPN.GGXCNL_NGDP.A', 'JPN', '2025', -3.1)],
  current_account: [L('imf', 'IMF.WEO:dataflow.TUR.BCA_NGDPD.A', 'TUR', '2025', -1.2)],
  inflation_monthly: [
    L('imf', 'IMF.CPI:dataflow.TUR.CPI._T.IX.M', 'TUR', '2026-09', 137.23, ya('2025-09', 100)),
    L('ecb', 'ECB.ICP:M.U2.N.000000.4.ANR', null, '2025-12', 2.1),
    L('eurostat', 'ESTAT.prc_hicp_manr:DE.CP00.RCH_A', 'DEU', '2025-12', 2.0),
    L('ons', 'ONS:D7G7', 'GBR', '2026-Q3', 3.8),
    L('ibge', 'SIDRA.1737.2265:BRA', 'BRA', '2026-09', 4.9),
    L('bcra', 'BCRA:28', 'ARG', '2026-09-30', 31.2),
  ],
  policy_rate: [
    L('bis', 'WS_CBPOL:M.TR', 'TUR', '2026-09', 37),
    L('boe', 'BOE:IUDBEDR', 'GBR', '2026-11-03', 4.0),
    L('sarb', 'SARB:MMRD002A', 'ZAF', '2026-11-03', 7.0),
    L('bcb', 'SGS.432', 'BRA', '2026-11-05', 13.75),
    L('ecb', 'ECB.FM:B.U2.EUR.4F.KR.DFR.LEV', null, '2026-09-16', 2.0),
  ],
  fx_usd: [
    L('bis', 'WS_XRU:M.TR.TRY.A', 'TUR', '2026-09', 48.65, ya('2025-09', 37.4)),
    L('ecb', 'ECB.EXR:M.USD.EUR.SP00.A', null, '2026-10', 1.12),
    L('bcb', 'SGS.1', 'BRA', '2026-10-30', 5.4),
    L('cbn', 'CBN.FX:US_DOLLAR', 'NGA', '2026-11-04', 1460),
    L('boj', 'BOJ.FM08:FXERD04', 'JPN', '2026-10-30', 152.1),
  ],
  fx_effective: [L('bis', 'WS_EER:M.R.B.TR', 'TUR', '2026-09', 108.26)],
  fx_reserves: [L('bcb', 'SGS.13621', 'BRA', '2026-10-28', 357114)],
  credit_gap: [L('bis', 'WS_CREDIT_GAP:Q.CA.P.A.C', 'CAN', '2026-Q1', -15.27)],
  debt_service: [L('bis', 'WS_DSR:Q.CA.H', 'CAN', '2026-Q1', 14)],
  total_credit: [L('bis', 'WS_TC:Q.CA.H.A.M.770.A', 'CAN', '2026-Q1', 100)],
  house_prices: [L('bis', 'WS_SPP:Q.CA.R.771', 'CAN', '2026-Q2', -6.72)],
  trade_goods: [
    L('imf', 'IMF.IMTS:dataflow.DEU.XG_FOB_USD.G001.M', 'DEU', '2026-07', 162536825214),
  ],
  bop: [L('imf', 'IMF.BOP:dataflow.DEU.L_NIL_T.D_F.USD.Q', 'DEU', '2026-Q2', 12439368767)],
  oil_production: [
    L('eia', 'EIA.1.57.TBPD:USA', 'USA', '2026-06', 13791.94),
    L('jodi-oil', 'JODI.oil_primary:SA.CRUDEOIL.INDPROD.KBD', 'SAU', '2026-08', 6237.9),
  ],
  oil_demand: [L('jodi-oil', 'JODI.oil_secondary:DE.TOTPRODS.TOTDEMO.KBD', 'DEU', '2026-08', 2100)],
  oil_stocks: [L('jodi-oil', 'JODI.oil_primary:DE.CRUDEOIL.CLOSTLV.KTONS', 'DEU', '2026-08', 5000)],
  refined_products: [
    L('jodi-oil', 'JODI.oil_secondary:DE.TOTPRODS.REFGROUT.KBD', 'DEU', '2026-08', 1800),
  ],
  gas_production: [L('jodi-gas', 'JODI.gas:NO.NATGAS.INDPROD.M3', 'NOR', '2026-08', 10000)],
  gas_demand: [L('jodi-gas', 'JODI.gas:DE.NATGAS.TOTDEMO.M3', 'DEU', '2026-08', 3648)],
  gas_imports: [L('jodi-gas', 'JODI.gas:DE.NATGAS.TOTIMPSB.M3', 'DEU', '2026-08', 6738)],
  gas_stocks: [L('jodi-gas', 'JODI.gas:DE.NATGAS.CLOSTLV.M3', 'DEU', '2026-08', 20000)],
  power_mix: [L('ember', 'EMBER:DEU.Electricity generation.Fuel.Coal.%', 'DEU', '2025', 22)],
  commodity_price: [
    L('pinksheet', 'PINK:Copper', null, '2026-10', 9876, { unit: '$/mt', series_name: 'Copper' }),
  ],
  food_prices_local: [
    L('fewsnet', 'FEWS:KE.Nairobi.Maize Grain (White).kg.KES.Retail', 'KEN', '2026-09', 60, {
      series_name: 'Maize Grain (White) price, Nairobi',
    }),
    L('faostat', 'FAO.PP:KEN.56', 'KEN', '2024', 465.9, {
      series_name: 'Producer price: Maize (corn)',
    }),
  ],
  geopolitical_risk: [
    L('gpr', 'GPR.GPR:WLD', null, '2026-10', 120),
    L('gpr', 'GPR.GPRC:DEU', 'DEU', '2026-10', 0.5),
  ],
  uncertainty: [
    L('wui', 'WUI.WUI:TUR', 'TUR', '2026-Q3', 30000),
    L('epu', 'EPU.EPU:CHN', 'CHN', '2026-09', 200),
  ],
  conflict: [L('ucdp', 'UCDP.deaths.all:UKR', 'UKR', '2026-09', 900)],
  news_tone: [L('gdelt', 'GDELT.timelinetone:TUR', 'TUR', '2026-10', -2.1)],
  governance: [
    L('worldbank-ext', 'WB.GOV_WGI_PV.EST:TUR', 'TUR', '2025', -1.1, {
      series_name: 'Political stability and absence of violence',
    }),
  ],
  remittances: [
    L('worldbank-ext', 'WB.BX.TRF.PWKR.DT.GD.ZS:KEN', 'KEN', '2025', 3.4, {
      series_name: 'Personal remittances, received',
      unit: '% of GDP',
    }),
  ],
  external_debt: [
    L('worldbank-ext', 'WB.DT.DOD.DECT.GN.ZS:KEN', 'KEN', '2024', 70, {
      series_name: 'External debt stocks',
      unit: '% of GNI',
    }),
  ],
  employment_sector: [
    L('ilostat', 'ILO.EMP_TEMP_SEX_ECO_NB_A:KEN.ECO_SECTOR_AGR', 'KEN', '2025', 9000),
  ],
  activity: [
    L('bcb', 'SGS.24363', 'BRA', '2026-08', 110, ya('2025-08', 105)),
    L('ons', 'ONS:IHYQ', 'GBR', '2026-Q2', 0.3),
  ],
};

/* Raw codes that must never reach a statement. */
const RAW_CODE =
  /\b(?:[A-Z]{2,}_[A-Z0-9_]{2,}|INDPROD|CLOSTLV|TOTDEMO|TOTDEMC|TOTIMPSB|TOTEXPSB|REFINOBS|REFGROUT|NATGAS|CRUDEOIL|GASDIES|TOTPRODS|KBD|KTONS|ECO_[A-Z_]+|AGE_[A-Z_0-9]+)\b/;

test('every family matches its fixture keys, and only its own', () => {
  for (const [id, rows] of Object.entries(FAMILY_FIXTURES)) {
    assert.ok(C.FAMILY_BY_ID[id], `family ${id} exists`);
    for (const r of rows) assert.equal(C.familyOf(r)?.id, id, `${r.source} ${r.series_key}`);
  }
  // Every catalogue family has a fixture.
  for (const f of C.FAMILIES) assert.ok(FAMILY_FIXTURES[f.id], `fixture for ${f.id}`);
});

test('readable names: no statement carries a raw code (fixtures and every snapshot sample)', () => {
  for (const rows of Object.values(FAMILY_FIXTURES)) {
    for (const r of rows) {
      const s = C.presentRow(
        {
          ...r,
          year_ago_period: r.year_ago_period,
          year_ago_value:
            r.year_ago_value ?? (C.FAMILY_BY_ID.inflation_monthly.match(r) ? 100 : null),
        },
        C.familyOf(r),
        { now: NOW },
      );
      if (!s) continue;
      assert.doesNotMatch(s.name, RAW_CODE, `${r.series_key}: ${s.name}`);
      assert.doesNotMatch(String(s.unit || ''), RAW_CODE, `${r.series_key}: ${s.unit}`);
    }
  }
  const snap = JSON.parse(
    readFileSync(new URL('./fixtures/macro-prefixes.json', import.meta.url), 'utf8'),
  );
  let named = 0;
  for (const p of snap.prefixes) {
    for (const smp of p.samples) {
      const r = {
        source: p.source,
        ...smp,
        period: '2025',
        value: 1,
        year_ago_period: '2024',
        year_ago_value: 1,
      };
      const f = C.familyOf(r);
      if (!f) continue;
      const s = C.presentRow(r, f, { now: NOW });
      if (!s) continue; // a row the catalogue cannot name never reaches an answer
      named += 1;
      assert.doesNotMatch(s.name, RAW_CODE, `${r.series_key}: ${s.name}`);
    }
  }
  assert.ok(named > 300, `named ${named} snapshot samples`);
  // JODI codes as JODI defines them: REFINOBS is refinery intake, REFGROUT refinery output.
  assert.equal(C.JODI_FLOWS.REFINOBS, 'refinery intake');
  assert.equal(C.JODI_FLOWS.REFGROUT, 'refinery output');
  assert.equal(C.JODI_UNITS.M3, 'million cubic metres');
  assert.equal(
    C.FAMILY_BY_ID.gas_demand.name(FAMILY_FIXTURES.gas_demand[0]),
    'Natural gas gross inland deliveries',
  );
});

test('coverage: every held prefix matches a family or is NOT_SURFACED / PARTLY_SURFACED with a reason', () => {
  const snap = JSON.parse(
    readFileSync(new URL('./fixtures/macro-prefixes.json', import.meta.url), 'utf8'),
  );
  assert.ok(snap.prefixes.length >= 60);
  const missing = [];
  for (const p of snap.prefixes) {
    const key = `${p.source}|${p.prefix}`;
    if (C.NOT_SURFACED[key]) {
      assert.ok(C.NOT_SURFACED[key].length > 20, `${key} has a reason`);
      continue;
    }
    const partly = C.PARTLY_SURFACED[key];
    if (partly) {
      const fam = C.FAMILY_BY_ID[partly.family];
      assert.ok(
        fam?.match({ source: p.source, series_key: partly.example }),
        `${key} example matches ${partly.family}`,
      );
      assert.ok(partly.note.length > 20);
      continue;
    }
    const hit = p.samples.some((s) => C.familyOf({ source: p.source, ...s }));
    if (!hit) missing.push(key);
  }
  assert.deepEqual(missing, [], `uncovered prefixes: ${missing.join(', ')}`);
});

test('observed vs projected: IMF WEO and AMECO current-year values are projections, labelled', () => {
  const weo = L('imf', 'IMF.WEO:dataflow.TUR.NGDP_RPCH.A', 'TUR', '2026', 2.7, ya('2025', 3.2));
  const s = C.presentRow(weo, C.FAMILY_BY_ID.gdp_growth, { now: NOW });
  assert.deepEqual([s.period, s.value], ['2025', 3.2]);
  assert.deepEqual(s.projection, { period: '2026', value: 2.7 });
  const item = C.rowToItem(weo, { attributionOf: S.attributionOf, now: NOW });
  assert.match(item.text, /projection for 2026: 2\.70 \(a projection, not an outcome\)/);
  assert.equal(item.meta.period, '2025');
  // A projection with no observed year before it is not stated at all.
  assert.equal(
    C.presentRow(
      { ...weo, year_ago_value: null, year_ago_period: null },
      C.FAMILY_BY_ID.gdp_growth,
      { now: NOW },
    ),
    null,
  );
  // Monthly data in the current year is observed.
  assert.equal(
    C.isProjection(L('imf', 'IMF.CPI:dataflow.TUR.CPI._T.IX.M', 'TUR', '2026-09', 1), NOW),
    false,
  );
  assert.equal(
    C.isProjection(L('ecb', 'ECB.AME:A.DEU.1.0.0.0.ZUTN', null, '2026', 3.6), NOW),
    true,
  );
});

test('IMF CPI: the index becomes a change on a year earlier; no year-ago value, no statement', () => {
  const r = FAMILY_FIXTURES.inflation_monthly[0];
  const s = C.presentRow(r, C.FAMILY_BY_ID.inflation_monthly, { now: NOW });
  assert.ok(Math.abs(s.value - 37.23) < 1e-9);
  assert.equal(s.unit, '% on a year earlier');
  assert.equal(C.yoyFromIndex(110, 100).toFixed(4), '10.0000');
  assert.equal(
    C.presentRow(
      { ...r, year_ago_value: null, year_ago_period: null },
      C.FAMILY_BY_ID.inflation_monthly,
      { now: NOW },
    ),
    null,
  );
  // A rate states its change in percentage points; a level in percent.
  const fx = C.presentRow(FAMILY_FIXTURES.fx_usd[0], C.FAMILY_BY_ID.fx_usd, { now: NOW });
  assert.equal(fx.changeKind, 'pct');
  assert.match(fx.changeText, /^up 30\.1% from 37\.4 in Sep 2025$/);
  const pr = C.presentRow(
    L('bis', 'WS_CBPOL:M.TR', 'TUR', '2026-09', 37, ya('2025-09', 40)),
    C.FAMILY_BY_ID.policy_rate,
    { now: NOW },
  );
  assert.equal(pr.changeKind, 'pp');
  assert.match(pr.changeText, /^down 3\.00 percentage points from 40\.0 in Sep 2025$/);
});

test('euro area: a member gets the ECB rate and euro-area inflation, labelled "the euro area"', () => {
  const euro = [
    L('ecb', 'ECB.FM:B.U2.EUR.4F.KR.DFR.LEV', null, '2026-09-16', 2.0),
    L('ecb', 'ECB.FM:B.U2.EUR.4F.KR.MRR_FR.LEV', null, '2026-09-16', 2.15),
    L('ecb', 'ECB.ICP:M.U2.N.000000.4.ANR', null, '2025-12', 2.1),
    L('ecb', 'ECB.EXR:M.USD.EUR.SP00.A', null, '2026-10', 1.12),
  ];
  const own = [FAMILY_FIXTURES.gas_imports[0], FAMILY_FIXTURES.geopolitical_risk[1]];
  const items = S.briefFromRows('DEU', own, {
    families: ['gas_imports', 'geopolitical_risk'],
    themes: ['gas', 'geopolitics'],
    euro,
    now: NOW,
  });
  const ea = items.filter((i) => i.meta.scope === 'euro_area');
  assert.deepEqual(
    ea.map((i) => i.meta.family),
    ['policy_rate'],
  );
  assert.match(ea[0].title, /^the euro area: ECB deposit facility rate/);
  // A prices or rates question also gets euro-area inflation and EUR/USD.
  const rates = S.briefFromRows('DEU', [], {
    families: ['policy_rate', 'inflation_monthly'],
    themes: ['rates'],
    euro,
    now: NOW,
  });
  assert.deepEqual(
    rates.filter((i) => i.meta.scope === 'euro_area').map((i) => i.meta.family),
    ['policy_rate', 'inflation_monthly', 'fx_usd'],
  );
  assert.equal(C.EURO_AREA.has('BGR'), true);
  assert.equal(C.EURO_AREA.has('GBR'), false);
  // A non-member never gets euro-area rows.
  assert.equal(
    S.briefFromRows('GBR', [FAMILY_FIXTURES.policy_rate[1]], {
      families: ['policy_rate'],
      now: NOW,
    }).some((i) => i.meta.scope === 'euro_area'),
    false,
  );
});

test('national central bank over BIS for the same rate when both are current', () => {
  const rows = [L('bis', 'WS_CBPOL:M.GB', 'GBR', '2026-09', 4.25), FAMILY_FIXTURES.policy_rate[1]];
  const [best] = C.pickBest(rows, C.FAMILY_BY_ID.policy_rate, { now: NOW });
  assert.equal(best.r.source, 'boe');
  // A stale national series loses to a current one.
  const stale = [
    L('bis', 'WS_CBPOL:M.GB', 'GBR', '2026-09', 4.25),
    L('boe', 'BOE:IUDBEDR', 'GBR', '2025-01-03', 4.75),
  ];
  assert.equal(C.pickBest(stale, C.FAMILY_BY_ID.policy_rate, { now: NOW })[0].r.source, 'bis');
});

test('ranking: one source, period mix reported, rows 18+ months older than the leader left out', () => {
  const rows = [
    L('eia', 'EIA.1.57.TBPD:USA', 'USA', '2026-06', 13792),
    L('eia', 'EIA.1.57.TBPD:SAU', 'SAU', '2026-06', 9800),
    L('eia', 'EIA.1.57.TBPD:RUS', 'RUS', '2026-05', 9300),
    L('eia', 'EIA.1.57.TBPD:VEN', 'VEN', '2024-09', 900),
    L('eia', 'EIA.1.57.TBPD:WORL', null, '2026-06', 78371),
  ];
  const [head] = S.rankFromRows('oil_production', rows, { limit: 10, now: NOW });
  assert.deepEqual(
    head.meta.ranking.rows.map((r) => r.iso3),
    ['USA', 'SAU', 'RUS'],
  );
  assert.match(
    head.text,
    /latest data: Jun 2026 for 2 countries, older for 1 \(back to May 2026\); 1 left out with data more than 18 months older/,
  );
  assert.match(
    head.text,
    /1\. United States 13,792; 2\. Saudi Arabia 9,800; 3\. Russia 9,300 \(May 2026\)/,
  );
  assert.equal(head.citation.label, ADAPTERS.eia.attribution);
  // Region filter and ascending order.
  /* Within a region the 18-month window runs from the region's own leader. */
  const [latam] = S.rankFromRows('oil_production', rows, {
    region: 'latin_america',
    order: 'asc',
    now: NOW,
  });
  assert.deepEqual(
    latam.meta.ranking.rows.map((r) => r.iso3),
    ['VEN'],
  );
  assert.match(
    latam.text,
    /^Lowest crude oil production in Latin America \(thousand barrels per day\), Sep 2024 unless noted/,
  );
});

test('attribution: each citation is the adapter attribution, verbatim', () => {
  const cases = [
    ['boj', FAMILY_FIXTURES.fx_usd[4]],
    ['ucdp', FAMILY_FIXTURES.conflict[0]],
    ['gdelt', FAMILY_FIXTURES.news_tone[0]],
    ['eia', FAMILY_FIXTURES.oil_production[0]],
    ['worldbank-ext', FAMILY_FIXTURES.governance[0]],
    ['imf', FAMILY_FIXTURES.gdp_growth[0]],
    ['pinksheet', FAMILY_FIXTURES.commodity_price[0]],
  ];
  for (const [src, row] of cases) {
    const item = C.rowToItem(row, { attributionOf: S.attributionOf, now: NOW });
    assert.ok(item, src);
    assert.equal(item.citation.label, ADAPTERS[src].attribution, src);
    assert.ok(item.text.endsWith(`Source: ${ADAPTERS[src].attribution}.`), src);
  }
});

test('analysis: latest, change, five-year percentile and rank, each with its method; line chart with source', () => {
  const hist = Array.from({ length: 60 }, (_, i) => ({
    period: `20${22 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
    value: 100 + i,
  }));
  const ev = [
    {
      id: 'ev_1',
      period: { label: '2026-10' },
      data: {
        metric: 'macro_series',
        family: 'commodity_price',
        name: 'Copper',
        place: null,
        scope: 'global',
        value: 159,
        unit: 'US$ per metric ton',
        period: '2026-10',
        change: 12,
        changeKind: 'pct',
        yearAgoPeriod: '2025-10',
        attribution: ADAPTERS.pinksheet.attribution,
        history: hist,
        derived: false,
      },
    },
    {
      id: 'ev_2',
      data: {
        metric: 'macro_series',
        family: 'oil_production',
        name: 'Highest crude oil production',
        attribution: ADAPTERS.eia.attribution,
        unit: 'thousand barrels per day',
        ranking: {
          order: 'desc',
          mix: 'latest data: Jun 2026',
          rows: [{ rank: 1, iso3: 'USA', name: 'United States', value: 13792, period: '2026-06' }],
        },
      },
    },
  ];
  const { metrics, visualizations } = analyze(ev, {});
  const ids = metrics.map((m) => m.id);
  assert.ok(ids.includes('macro_latest_commodity_price_global'));
  assert.ok(ids.includes('macro_yoy_commodity_price_global'));
  assert.ok(ids.includes('macro_pct5y_commodity_price_global'));
  assert.ok(ids.includes('macro_rank_oil_production_usa'));
  assert.ok(metrics.every((m) => m.method && m.inputs?.length));
  const line = visualizations.find((v) => v.type === 'line');
  assert.equal(line.source, ADAPTERS.pinksheet.attribution);
  assert.equal(line.unit, 'US$ per metric ton');
  assert.ok(line.period.label);
  assert.ok(visualizations.find((v) => v.type === 'bars' && v.source === ADAPTERS.eia.attribution));
  assert.equal(Math.round(fiveYearPercentile(hist, 159).value), 100);
});

test('research engine: macro_series source, domain weights and spec params', () => {
  assert.deepEqual(
    [SOURCES.macro_series.category, SOURCES.macro_series.reliability],
    ['historical', 0.9],
  );
  const w = (d) => weightOf(DEFAULT_CONFIG, d, 'macro_series');
  assert.deepEqual(
    [w('country'), w('macro'), w('commodity'), w('geopolitics'), w('institutional')],
    [0.95, 1, 0.9, 0.8, 0.3],
  );
  // A stored config that predates the source falls back to the code default for it.
  const old = { version: 'v0', weights: { macro: { news: 0.6 } } };
  assert.equal(weightOf(old, 'macro', 'macro_series'), 1);
  assert.equal(weightOf(old, 'macro', 'news'), 0.6);
  const p = macroSeriesParams(
    { rawQuery: 'What could a Taiwan blockade mean for TSMC?' },
    { countries: [] },
  );
  assert.deepEqual(p.countries, ['TWN']);
  assert.ok(p.themes.includes('geopolitics'));
  assert.equal(macroSeriesParams({ rawQuery: 'Who owns Palantir?' }, { countries: [] }), null);
  // Memo context: countries named by revenue and export-control evidence, max 3.
  const ev = [
    {
      source: 'revenue_geo',
      title: 'Revenue by region',
      text: 'Taiwan 12%, China 18%, United States 60%, Japan 4%',
    },
    {
      source: 'export_controls',
      title: 'Export rules',
      text: 'China and Hong Kong shipments require a licence',
    },
    { source: 'news', title: 'Germany', text: 'Germany Germany Germany' },
  ];
  assert.deepEqual(memoContextCountries(ev, { countries: [{ iso3: 'TWN' }] }), [
    'TWN',
    'CHN',
    'USA',
  ]);
});

/* ---------------------------------------------------------------- routing cases (stubbed) */

const LATEST = [
  // Turkey
  L('bis', 'WS_XRU:M.TR.TRY.A', 'TUR', '2026-09', 48.65, ya('2025-09', 37.4)),
  L('bis', 'WS_CBPOL:M.TR', 'TUR', '2026-09', 37, ya('2025-09', 40)),
  L('imf', 'IMF.CPI:dataflow.TUR.CPI._T.IX.M', 'TUR', '2026-09', 137.23, ya('2025-09', 100)),
  L('bis', 'WS_CREDIT_GAP:Q.TR.P.A.C', 'TUR', '2026-Q1', -9.1),
  L('imf', 'IMF.WEO:dataflow.TUR.NGDP_RPCH.A', 'TUR', '2025', 3.2),
  L('eia', 'EIA.1.57.TBPD:TUR', 'TUR', '2026-06', 80),
  // Germany
  L('jodi-gas', 'JODI.gas:DE.NATGAS.TOTIMPSB.M3', 'DEU', '2026-08', 6738, ya('2025-08', 7000)),
  L('jodi-gas', 'JODI.gas:DE.NATGAS.TOTDEMO.M3', 'DEU', '2026-08', 3648),
  L('gpr', 'GPR.GPRC:DEU', 'DEU', '2026-10', 0.5),
  L('imf', 'IMF.WEO:dataflow.DEU.NGDP_RPCH.A', 'DEU', '2025', 0.4),
  // Euro area
  L('ecb', 'ECB.FM:B.U2.EUR.4F.KR.DFR.LEV', null, '2026-09-16', 2.0),
  L('ecb', 'ECB.ICP:M.U2.N.000000.4.ANR', null, '2025-12', 2.1),
  // Russia (named as a gas supplier)
  L('jodi-gas', 'JODI.gas:RU.NATGAS.INDPROD.M3', 'RUS', '2026-08', 50000),
  // Kenya
  L(
    'fewsnet',
    'FEWS:KE.Nairobi.Maize Grain (White).kg.KES.Retail',
    'KEN',
    '2026-09',
    60,
    ya('2025-09', 50),
  ),
  L(
    'fewsnet',
    'FEWS:KE.Mombasa.Maize Grain (White).kg.KES.Retail',
    'KEN',
    '2026-09',
    64,
    ya('2025-09', 52),
  ),
  L('imf', 'IMF.CPI:dataflow.KEN.CPI._T.IX.M', 'KEN', '2026-09', 106, ya('2025-09', 100)),
  L('worldbank-ext', 'WB.GOV_WGI_PV.EST:KEN', 'KEN', '2025', -1.0, {
    series_name: 'Political stability and absence of violence',
  }),
  // Japan
  L('bis', 'WS_CBPOL:M.JP', 'JPN', '2026-09', 0.75),
  L('imf', 'IMF.WEO:dataflow.JPN.GGXWDG_NGDP.A', 'JPN', '2025', 236),
  // Canada
  L('bis', 'WS_DSR:Q.CA.H', 'CAN', '2026-Q1', 14),
  L('bis', 'WS_CREDIT_GAP:Q.CA.P.A.C', 'CAN', '2026-Q1', -15.27),
  L('bis', 'WS_SPP:Q.CA.R.771', 'CAN', '2026-Q2', -6.72),
  L('bis', 'WS_TC:Q.CA.H.A.M.770.A', 'CAN', '2026-Q1', 100),
  L('eia', 'EIA.1.57.TBPD:CAN', 'CAN', '2026-06', 4900),
  // Taiwan
  L('gpr', 'GPR.GPRC:TWN', 'TWN', '2026-10', 0.9),
  L('bis', 'WS_XRU:M.TW.TWD.A', 'TWN', '2026-09', 31.2),
  // Commodities and world
  L('pinksheet', 'PINK:Copper', null, '2026-10', 9876, {
    ...ya('2025-10', 9000),
    unit: '$/mt',
    series_name: 'Copper',
  }),
  L('gpr', 'GPR.GPR:WLD', null, '2026-10', 120, ya('2025-10', 100)),
  L('gpr', 'GPR.GPRT:WLD', null, '2026-10', 125),
  L('eia', 'EIA.1.57.TBPD:USA', 'USA', '2026-06', 13792),
  L('eia', 'EIA.1.57.TBPD:SAU', 'SAU', '2026-06', 9800),
  // Latin American and other CPI
  L('imf', 'IMF.CPI:dataflow.ARG.CPI._T.IX.M', 'ARG', '2026-09', 131, ya('2025-09', 100)),
  L('imf', 'IMF.CPI:dataflow.BRA.CPI._T.IX.M', 'BRA', '2026-09', 104.9, ya('2025-09', 100)),
  L('imf', 'IMF.CPI:dataflow.VEN.CPI._T.IX.M', 'VEN', '2026-08', 260, ya('2025-08', 100)),
];
const PINK_HISTORY = Array.from({ length: 60 }, (_, i) => ({
  source: 'pinksheet',
  series_key: 'PINK:Copper',
  period: `20${21 + Math.floor((i + 10) / 12)}-${String(((i + 10) % 12) + 1).padStart(2, '0')}`,
  value: 7000 + i * 40,
}));
const db = stubDb({ macro_series_latest: LATEST, macro_series_values: PINK_HISTORY });

const familiesOf = async (q) => {
  const route = R.routeMacro(q);
  if (!R.isMacroRelevant(route, { text: q })) return { route, items: [], fams: [] };
  const items = await S.macroBrief(db, route, { limit: 12, now: NOW });
  return {
    route,
    items,
    fams: items.map((i) => `${i.meta.family}:${i.meta.iso3 || i.meta.scope}`),
  };
};

test("routing: Is Turkey's lira under pressure?", async () => {
  const { fams } = await familiesOf("Is Turkey's lira under pressure?");
  for (const f of ['fx_usd:TUR', 'policy_rate:TUR', 'inflation_monthly:TUR'])
    assert.ok(fams.includes(f), fams.join(' '));
  assert.ok(!fams.some((f) => /^(gdp_growth|oil_production)/.test(f)), fams.join(' '));
  assert.equal(fams[0], 'fx_usd:TUR');
});

test('routing: How exposed is Germany to a Russian gas cutoff?', async () => {
  const { fams } = await familiesOf('How exposed is Germany to a Russian gas cutoff?');
  assert.ok(fams.includes('gas_imports:DEU') || fams.includes('gas_demand:DEU'), fams.join(' '));
  assert.ok(fams.includes('geopolitical_risk:DEU'), fams.join(' '));
  assert.ok(fams.includes('policy_rate:euro_area'), fams.join(' '));
  assert.ok(!fams.some((f) => /^gdp_growth/.test(f)));
});

test("routing: What's happening with copper prices?", async () => {
  const { items, fams } = await familiesOf("What's happening with copper prices?");
  assert.deepEqual(fams, ['commodity_price:global']);
  assert.match(
    items[0].text,
    /^Copper, Oct 2026: 9,876 US\$ per metric ton, up 9\.73% from 9,000 in Oct 2025\. Five-year range/,
  );
  assert.ok(items[0].meta.range.percentile >= 0);
});

test('routing: Which countries produce the most crude oil?', async () => {
  const { route, items } = await familiesOf('Which countries produce the most crude oil?');
  assert.deepEqual(route.ranking, { family: 'oil_production', order: 'desc', region: null });
  assert.equal(items[0].meta.family, 'oil_production');
  assert.equal(items[0].meta.source, 'eia');
  assert.equal(items[0].meta.ranking.rows[0].iso3, 'USA');
});

test('routing: How are food prices in Kenya?', async () => {
  const { items, fams } = await familiesOf('How are food prices in Kenya?');
  assert.ok(fams.includes('food_prices_local:KEN'), fams.join(' '));
  assert.ok(fams.includes('inflation_monthly:KEN'), fams.join(' '));
  assert.ok(!fams.some((f) => /^governance/.test(f)));
  const maize = items.find((i) => i.meta.family === 'food_prices_local');
  assert.match(
    maize.text,
    /Maize Grain \(White\), median retail price across 2 markets, Sep 2026: 62\.0 KES per kg/,
  );
});

test("routing: What is Japan's policy rate?", async () => {
  const { fams } = await familiesOf("What is Japan's policy rate?");
  assert.equal(fams[0], 'policy_rate:JPN');
  assert.ok(!fams.some((f) => /^(gov_debt|gas_|oil_)/.test(f)), fams.join(' '));
});

test('routing: Highest inflation in Latin America', async () => {
  const { route, items } = await familiesOf('Highest inflation in Latin America');
  assert.equal(route.ranking.family, 'inflation_monthly');
  assert.equal(route.ranking.region, 'latin_america');
  const rows = items[0].meta.ranking.rows;
  assert.deepEqual(
    rows.map((r) => r.iso3),
    ['VEN', 'ARG', 'BRA'],
  );
  assert.ok(rows.every((r) => C.REGIONS.latin_america.members.includes(r.iso3)));
});

test('routing: Is household debt a risk in Canada?', async () => {
  const { fams } = await familiesOf('Is household debt a risk in Canada?');
  for (const f of ['debt_service:CAN', 'credit_gap:CAN', 'house_prices:CAN'])
    assert.ok(fams.includes(f), fams.join(' '));
  assert.ok(!fams.some((f) => /^oil_/.test(f)));
});

test('routing: How has geopolitical risk changed this year?', async () => {
  const { fams, items } = await familiesOf('How has geopolitical risk changed this year?');
  assert.equal(fams[0], 'geopolitical_risk:global');
  assert.match(items[0].text, /^Geopolitical risk index \(world\), Oct 2026: 120\.0/);
});

test('routing: What could a Taiwan blockade mean for TSMC? (deep memo context for TWN)', async () => {
  const p = macroSeriesParams(
    { rawQuery: 'What could a Taiwan blockade mean for TSMC?' },
    { countries: [] },
  );
  const items = await S.macroBrief(
    db,
    { ...p, families: ['geopolitical_risk', 'policy_rate', 'fx_usd', 'inflation_monthly'] },
    { now: NOW },
  );
  const fams = items.map((i) => `${i.meta.family}:${i.meta.iso3}`);
  assert.ok(fams.includes('geopolitical_risk:TWN'), fams.join(' '));
  assert.ok(fams.includes('fx_usd:TWN'), fams.join(' '));
});

test('routing: Who owns Palantir? reaches no macro or international sanctions data', async () => {
  const route = R.routeMacro('Who owns Palantir?');
  assert.equal(R.isMacroRelevant(route, { text: 'Who owns Palantir?' }), false);
  assert.equal(SI.sanctionsEntityName('Who owns Palantir?'), null);
  assert.equal(SI.isComparativeSanctions('Who owns Palantir?'), false);
  const items = await SI.intlSanctionsEvidence(stubDb({}), { query: 'Who owns Palantir?' });
  assert.deepEqual(items, []);
});

test('routing: sanctions questions are not macro questions', () => {
  for (const q of [
    'Is Rosneft sanctioned by the EU and UK?',
    'Which countries have the most UN sanctions listings?',
  ]) {
    assert.equal(R.isMacroRelevant(R.routeMacro(q), { text: q }), false, q);
  }
  assert.equal(
    R.isMacroRelevant(R.routeMacro('Nvidia revenue growth'), {
      text: 'Nvidia revenue growth',
      hasCompany: true,
    }),
    false,
  );
  assert.equal(R.routeMacro('Highest inflation in Latin America').countries.includes('USA'), false);
});

/* ---------------------------------------------------------------- international sanctions */

const INTL = [
  {
    list_source: 'uk',
    source_id: '1',
    name: 'PJSC Rosneft Oil Company',
    entry_type: 'entity',
    regimes: ['The Russia (Sanctions) (EU Exit) Regulations 2019'],
    countries: ['RUS'],
    aliases: ['PJSC Oil and Gas Company Rosneft', 'ROSNEFT'],
    listed_on: '2025-10-15',
    removed_on: null,
  },
  {
    list_source: 'uk',
    source_id: '2',
    name: 'ROSNEFT AERO',
    entry_type: 'entity',
    regimes: ['The Russia (Sanctions) (EU Exit) Regulations 2019'],
    countries: ['RUS'],
    aliases: [],
    listed_on: '2022-03-15',
    removed_on: null,
  },
  {
    list_source: 'eu',
    source_id: '3',
    name: 'JSC Rosneftflot',
    entry_type: 'entity',
    regimes: ['UKR'],
    countries: ['RUS'],
    aliases: ['АО “Роснефтефлот”'],
    listed_on: '2026-04-23',
    removed_on: null,
  },
  {
    list_source: 'eu',
    source_id: '4',
    name: 'RN AERO',
    entry_type: 'entity',
    regimes: ['UKR'],
    countries: ['RUS'],
    aliases: ['ROSNEFT AERO'],
    listed_on: '2023-03-14',
    removed_on: null,
  },
  {
    list_source: 'un',
    source_id: '5',
    name: 'KOREA MINING DEVELOPMENT TRADING CORPORATION',
    entry_type: 'entity',
    regimes: ['DPRK'],
    countries: ['PRK'],
    aliases: [],
    listed_on: '2009-04-24',
    removed_on: null,
  },
  {
    list_source: 'un',
    source_id: '6',
    name: 'ABD AL-HAMID',
    entry_type: 'individual',
    regimes: ['Al-Qaida'],
    countries: ['AFG'],
    aliases: [],
    listed_on: '2001-01-25',
    removed_on: null,
  },
  {
    list_source: 'un',
    source_id: '7',
    name: 'OLD ENTRY',
    entry_type: 'individual',
    regimes: ['Al-Qaida'],
    countries: ['AFG'],
    aliases: [],
    listed_on: '2001-01-25',
    removed_on: '2026-11-05',
  },
];
const ofacSearch = async ({ q }) => ({
  rows: /rosneft/i.test(q)
    ? [
        {
          id: 17022,
          name: 'OPEN JOINT-STOCK COMPANY ROSNEFT OIL COMPANY',
          programs: ['RUSSIA-EO14024'],
          countries: ['Russia'],
          listedOn: '2014-09-12',
        },
        {
          id: 51835,
          name: 'JOINT STOCK COMPANY ROSNEFTEFLOT',
          programs: ['RUSSIA-EO14024'],
          countries: ['Russia'],
        },
      ]
    : [],
});

test('sanctions: name matching is equality or whole-word prefix after legal forms, aliases included', () => {
  assert.equal(SI.nameMatch('Rosneft', 'PJSC Rosneft Oil Company'), 'prefix');
  assert.equal(SI.nameMatch('Rosneft', 'OPEN JOINT-STOCK COMPANY ROSNEFT OIL COMPANY'), 'prefix');
  assert.equal(SI.nameMatch('Rosneft', 'ROSNEFT'), 'exact');
  assert.equal(SI.nameMatch('Rosneft', 'JSC Rosneftflot'), null);
  assert.equal(SI.nameMatch('Rosneft', 'JOINT STOCK COMPANY ROSNEFTEFLOT'), null);
  assert.equal(SI.sanctionsEntityName('Is Rosneft sanctioned by the EU and UK?'), 'Rosneft');
  assert.deepEqual(SI.listsNamed('Is Rosneft sanctioned by the EU and UK?'), ['eu', 'uk']);
  assert.equal(
    SI.isComparativeSanctions('Which countries have the most UN sanctions listings?'),
    true,
  );
});

test('sanctions: Is Rosneft sanctioned by the EU and UK? -> which lists include it, never implying identity', async () => {
  const items = await SI.intlSanctionsEvidence(stubDb({ sanctions_intl_entries: INTL }), {
    query: 'Is Rosneft sanctioned by the EU and UK?',
    searchOfac: ofacSearch,
  });
  assert.equal(items.length, 1);
  const it = items[0];
  assert.equal(it.meta.kind, 'intl_entity');
  assert.deepEqual(it.meta.lists, ['ofac', 'uk']);
  assert.deepEqual(it.meta.notOn, ['eu']);
  assert.match(it.text, /listed by OFAC and the UK; not on the EU list/);
  assert.match(it.text, /UK Sanctions List \(FCDO\): PJSC Rosneft Oil Company/);
  assert.match(it.text, /US Treasury OFAC SDN list: OPEN JOINT-STOCK COMPANY ROSNEFT OIL COMPANY/);
  assert.doesNotMatch(it.text, /Rosneftflot|ROSNEFTEFLOT/);
  assert.match(it.text, /A name match is not a confirmed identity/);
  assert.match(it.citation.label, /UK Sanctions List \(FCDO\)/);
});

test('sanctions: Which countries have the most UN sanctions listings? -> counts by country from the list', async () => {
  const rpcs = {
    sanctions_intl_country_counts: ({ p_list }) =>
      p_list === 'un'
        ? [
            { country: 'AFG', listings: 148 },
            { country: 'PRK', listings: 141 },
          ]
        : [],
  };
  const items = await SI.intlSanctionsEvidence(stubDb({ sanctions_intl_entries: INTL }, rpcs), {
    query: 'Which countries have the most UN sanctions listings?',
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].meta.kind, 'intl_counts');
  assert.match(
    items[0].text,
    /UN Security Council Consolidated List: 1\. Afghanistan 148; 2\. North Korea 141/,
  );
  // Without the SQL function, counts come from exact per-country counts, and say so.
  const fb = await SI.intlSanctionsEvidence(stubDb({ sanctions_intl_entries: INTL }), {
    query: 'Which countries have the most UN sanctions listings?',
  });
  assert.match(
    fb[0].text,
    /among the 26 most-sanctioned jurisdictions checked\): 1\. Afghanistan 1; 2\. North Korea 1/,
  );
});

test('sanctions: a country question gets listings per list, top regimes and recent additions', async () => {
  const rpcs = {
    sanctions_intl_country_summary: () => [
      {
        list_source: 'eu',
        listings: 2066,
        entities: 762,
        individuals: 1304,
        recent: 0,
        top_regimes: [
          { regime: 'UKR', listings: 1738 },
          { regime: 'HR', listings: 94 },
        ],
      },
      {
        list_source: 'uk',
        listings: 2033,
        entities: 443,
        individuals: 1590,
        recent: 30,
        top_regimes: [
          { regime: 'The Russia (Sanctions) (EU Exit) Regulations 2019', listings: 1826 },
        ],
      },
    ],
  };
  const items = await SI.intlSanctionsEvidence(stubDb({}, rpcs), {
    query: 'How sanctioned is Russia?',
    countries: ['RUS'],
  });
  assert.equal(items[0].meta.kind, 'intl_country');
  assert.match(
    items[0].text,
    /EU Financial Sanctions Files: 2,066 active listings naming Russia \(762 entities, 1,304 individuals\); top regimes: UKR \(actions against Ukraine\) 1,738; HR \(global human rights regime\) 94/,
  );
  assert.match(
    items[0].text,
    /UK Sanctions List \(FCDO\): 2,033 active listings naming Russia.*30 added in the last 90 days/,
  );
  // Fallback: exact counts, active rows only (the removed UN row is not counted).
  const fb = await SI.intlCountrySummary(stubDb({ sanctions_intl_entries: INTL }), 'AFG');
  assert.deepEqual(Object.keys(fb), ['un']);
  assert.equal(fb.un.listings, 1);
});
