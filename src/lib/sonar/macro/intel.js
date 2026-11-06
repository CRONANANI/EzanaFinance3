/**
 * Country & Currency Intelligence: the evidence and computations for one country
 * (Nov 2026). SERVER ONLY.
 *
 * buildCountryIntel(admin, { iso3, route }) picks the best series per currency-framework
 * family from macro_series_latest (national over BIS when both are current; the catalogue
 * decides), reads their histories in parallel, and computes the picture (currency.js):
 * exchange rate in both conventions, inflation, policy and the ex-post real rate, reserves,
 * the real effective exchange rate, stress, freshness, and the deterministic assessment.
 *
 * Returns evidence items for synthesis (each with its attribution in the citation, never
 * pasted into the text), the computed statements, KPI tiles, chart series and the
 * transmission map, plus the frameworks the question selects. Every read is bounded.
 */
import 'server-only';
import { iso3Name } from '@/lib/macro-sync/formats.js';
import { withTimeout } from '@/lib/with-timeout';
import {
  FAMILY_BY_ID,
  EURO_AREA,
  EURO_AREA_KEYS,
  pickBest,
  rowIso3,
  presentRow,
  periodLabel,
  keyBody,
} from './catalog.js';
import { attributionOf, seriesHistory, briefFromRows } from './series-store.js';
import { buildCurrencyPicture, stressEpisodes, episodesStatement } from './currency.js';
import { currencyOf } from './currencies.js';
import { FRAMEWORKS, PRESSURE_LABEL } from './playbook.js';
import { frameworksForRoute } from './route.js';

const TABLE = 'macro_series_latest';
const COLS =
  'source, series_key, country_iso3, period, value, series_name, unit, frequency, dataset, year_ago_period, year_ago_value';

async function read(build, timeoutMs, label) {
  const r = await withTimeout(Promise.resolve().then(build), timeoutMs, label);
  if (!r.ok || r.value?.error) return null;
  return Array.isArray(r.value?.data) ? r.value.data : [];
}

const best = (rows, fam, opts) => pickBest(rows, FAMILY_BY_ID[fam], opts)[0]?.r || null;

/** The currency a country uses, from the map or the BIS key (WS_XRU:M.TR.TRY.A -> TRY). */
function currencyFor(iso3, fxRow) {
  const known = currencyOf(EURO_AREA.has(iso3) ? 'EUR' : iso3);
  if (known) return known;
  const code = fxRow?.source === 'bis' ? keyBody(fxRow).split('.')[2] : null;
  return code ? { code, name: code, short: code } : null;
}

/** Frameworks for a routed question; external-financing questions read as currency ones. */
export const frameworksFor = frameworksForRoute;

/**
 * The transmission map for the currency framework: channels, each marked supported by data
 * when the brief holds evidence for it, otherwise conceptual. Not a fitted causal model.
 */
export function transmissionMap(picture) {
  const m = picture?.metrics || {};
  const node = (id, label, supported) => ({ id, label, supported: Boolean(supported) });
  const nodes = [
    node('inflation', 'High inflation', m.inflation?.annual?.value >= 10),
    node('fx_demand', 'Demand for foreign currency and expectations', false),
    node('easing', 'Monetary easing', m.policy?.change12mPp != null && m.policy.change12mPp < 0),
    node(
      'capital',
      'Capital-flow risk',
      Boolean(m.external?.portfolio) || m.reserves?.change3mPct < 0,
    ),
    node('depreciation', 'Depreciation', m.fx?.y1?.valueLostPct > 0),
    node('import_prices', 'Import-price pressure', false),
  ];
  const edges = [
    ['inflation', 'fx_demand'],
    ['easing', 'capital'],
    ['fx_demand', 'depreciation'],
    ['capital', 'depreciation'],
    ['depreciation', 'import_prices'],
  ];
  return { nodes, edges, caption: 'Conceptual channels, not a fitted causal model.' };
}

/**
 * Everything the brief needs for one country.
 * @param {object} admin  Supabase client
 * @param {{ iso3: string, route?: object, timeoutMs?: number, now?: Date }} o
 */
export async function buildCountryIntel(
  admin,
  {
    iso3,
    route = {},
    timeoutMs = 2500,
    now = new Date(),
    historyYears = 6,
    withEpisodes = false,
  } = {},
) {
  if (!admin || !iso3) return null;
  const t0 = Date.now();
  const eurozone = iso3 === 'EUR';
  const member = eurozone || EURO_AREA.has(iso3);
  const [own, euro] = await Promise.all([
    eurozone
      ? Promise.resolve([])
      : read(
          () => admin.from(TABLE).select(COLS).eq('country_iso3', iso3).limit(5000),
          timeoutMs,
          `intel ${iso3}`,
        ),
    member
      ? read(
          () =>
            admin
              .from(TABLE)
              .select(COLS)
              .in('source', ['ecb', 'bis'])
              .in(
                'series_key',
                EURO_AREA_KEYS.map((k) => k.series_key),
              ),
          timeoutMs,
          'intel euro',
        )
      : Promise.resolve([]),
  ]);
  if (own === null) return null; // the read failed: the caller may retry once
  const rows = [...own, ...(euro || [])];
  if (!rows.length)
    return {
      iso3,
      place: iso3Name(iso3) || iso3,
      empty: true,
      items: [],
      frameworks: frameworksFor(route),
    };

  /* Euro members price their currency in the euro area's rows. */
  const forFx = member ? euro || [] : own;
  const fxRow = best(forFx.length ? forFx : rows, 'fx_usd', { now });
  const fxMonthlyRow = !member
    ? own.find(
        (r) => r.source === 'bis' && /^WS_XRU:M\./.test(r.series_key) && /\.A$/.test(r.series_key),
      ) || null
    : null;
  const inflRow =
    best(own.length ? own : rows, 'inflation_monthly', { now }) ||
    best(euro || [], 'inflation_monthly', { now });
  const policyRow = best(own, 'policy_rate', { now }) || best(euro || [], 'policy_rate', { now });
  const reerRow =
    own.find((r) => r.source === 'bis' && /^WS_EER:M\.R\.B\./.test(r.series_key)) ||
    best(own, 'fx_effective', { now });
  const reservesRow = best(own, 'fx_reserves', { now });
  const caRow = best(own, 'current_account', { now });
  const extDebtRow = best(own, 'external_debt', { now });
  const riskRow =
    own.find((r) => r.source === 'gpr' && /^GPR\.GPRC:/.test(r.series_key)) ||
    own.find((r) => r.source === 'wui' && /^WUI\.WUI:/.test(r.series_key)) ||
    null;
  const importsRow =
    own.find((r) => r.source === 'imf' && /\.MG_CIF_USD\.G001\.M$/.test(r.series_key)) || null;

  const y = now.getUTCFullYear();
  const hist = (row, since) =>
    row
      ? seriesHistory(admin, row.source, row.series_key, { since, timeoutMs }).catch(() => [])
      : Promise.resolve(null);
  const [fxH, fxMH, inflH, polH, reerH, resH, riskH] = await Promise.all([
    hist(fxRow, `${y - historyYears}`),
    fxMonthlyRow && fxMonthlyRow.series_key !== fxRow?.series_key
      ? hist(fxMonthlyRow, `${y - historyYears}`)
      : Promise.resolve(null),
    hist(inflRow, `${y - Math.max(7, historyYears + 1)}`),
    hist(policyRow, `${y - Math.max(4, historyYears)}`),
    hist(reerRow, '2000'),
    hist(reservesRow, `${y - 3}`),
    hist(riskRow, '1990'),
  ]);

  const inflFam = inflRow ? FAMILY_BY_ID.inflation_monthly : null;
  const inflMode = inflRow && inflFam.presentOf(inflRow) === 'yoy_from_index' ? 'index' : 'rate';
  const ext = {};
  for (const [k, row] of [
    ['currentAccount', caRow],
    ['externalDebt', extDebtRow],
  ]) {
    const s = row
      ? presentRow(
          row,
          FAMILY_BY_ID[k === 'currentAccount' ? 'current_account' : 'external_debt'],
          { now },
        )
      : null;
    if (s) ext[k] = { value: s.value, period: s.period, unit: s.unit, source: row.source };
  }
  const importsMonthlyUsd =
    importsRow && Number(importsRow.value) > 0 ? Number(importsRow.value) : null;
  /* BCB and BCRA reserves are USD millions; IMF reserves (Part E) are US$. */
  const reservesUnitToUsd = reservesRow && /millions/i.test(reservesRow.unit || '') ? 1e6 : 1;

  const place = eurozone ? 'the euro area' : iso3Name(iso3) || iso3;
  const currency = currencyFor(iso3, fxRow);
  const picture = buildCurrencyPicture(
    {
      fx: fxH,
      fxMonthly: fxMH,
      reer: reerH,
      inflation: inflH ? { history: inflH, mode: inflMode } : null,
      policy: polH,
      reserves: resH,
      importsMonthlyUsd,
      reservesUnitToUsd,
      external: ext,
      risk: riskH,
      riskLabel: riskRow?.source === 'wui' ? 'world uncertainty' : 'geopolitical risk',
    },
    { currency, place, now },
  );

  /* Deep research: the stress episodes in Ezana's own series (longest FX history held). */
  const episodes = withEpisodes
    ? stressEpisodes(fxMH?.length ? fxMH : fxH, {
        inflation: picture.metrics.inflation?.series || [],
        policy: polH || [],
      })
    : [];
  const episodesLine = episodesStatement(episodes, { currency });
  if (episodesLine) picture.statements.push(episodesLine);

  /* Evidence: the computed statements first (each cites its own series), then the
     catalogue rows for the question's families. */
  const cite = (row) => (row ? attributionOf(row.source) : null);
  const sourcesUsed = [
    fxRow,
    inflRow,
    policyRow,
    reerRow,
    reservesRow,
    caRow,
    extDebtRow,
    riskRow,
  ].filter(Boolean);
  const computedItems = picture.statements.map((text, i) => ({
    title: `${place}: computed currency measures ${i + 1}`,
    text,
    date: null,
    citation: {
      label: [...new Set(sourcesUsed.map(cite))].join('; '),
      href: `/datasets/world-bank?country=${iso3}`,
    },
    meta: { family: 'computed', scope: 'computed', iso3, source: 'ezana' },
  }));
  const fams = (
    route.families && route.families.length ? route.families : FRAMEWORKS.currency.families
  ).filter((f) => FAMILY_BY_ID[f]);
  const catalogueItems = briefFromRows(eurozone ? 'EUR' : iso3, own, {
    families: fams,
    themes: route.themes || ['currency'],
    limit: 8,
    euro: euro || [],
    now,
  });

  const chart = (row, h, label, unit) =>
    row && h?.length
      ? {
          label,
          unit,
          source: attributionOf(row.source),
          period: `${periodLabel(h[0].period)} to ${periodLabel(h[h.length - 1].period)}`,
          points: h.map((p) => ({ x: p.period, y: Number(p.value) })),
        }
      : null;
  const inflSeries = picture.metrics.inflation?.series || null;
  const charts = {
    inflation: inflSeries?.length
      ? {
          label: `Annual inflation${picture.metrics.inflation.computedFromIndex ? ' (computed from the CPI index)' : ''}`,
          unit: '%',
          source: attributionOf(inflRow.source),
          period: `${periodLabel(inflSeries[0].period)} to ${periodLabel(inflSeries[inflSeries.length - 1].period)}`,
          points: inflSeries.slice(-72).map((p) => ({ x: p.period, y: p.value })),
        }
      : null,
    fx: chart(
      fxRow,
      fxH,
      `${currency?.code || 'Local currency'} per US dollar`,
      `${currency?.code || 'local'} per USD`,
    ),
    fxMonthly: chart(
      fxMonthlyRow,
      fxMH,
      `${currency?.code || 'Local currency'} per US dollar (monthly)`,
      `${currency?.code || 'local'} per USD`,
    ),
    policy: chart(policyRow, polH, 'Policy rate', '% a year'),
    reserves: chart(reservesRow, resH, 'Official reserves', reservesRow?.unit || 'US$'),
  };

  return {
    iso3,
    place,
    currency,
    picture,
    assessmentLabel: picture.assessment.overall ? PRESSURE_LABEL[picture.assessment.overall] : null,
    items: [...computedItems, ...catalogueItems],
    frameworks: frameworksFor(route),
    charts,
    transmission: transmissionMap(picture),
    episodes,
    sources: [...new Set(sourcesUsed.map(cite))],
    ms: Date.now() - t0,
  };
}

/** Kept for callers that only need a row's country (re-export for tests). */
export { rowIso3 };
