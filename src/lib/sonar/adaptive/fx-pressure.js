/**
 * Sonar adaptive research: currency pressure (Nov 17, 2026). View model `fx-pressure-v3`.
 *
 * "Is Türkiye's lira under pressure?", "How resilient are Brazil's reserves?", "What could
 * stabilize the rand?": one country's currency judged from Ezana's stored official series.
 * This is a strategy inside the country-macro scenario (C01), not a parallel engine: the
 * router sets plan.fx, the C01 executor hands the plan here, and the report goes through the
 * same layout planner, schema gate, sources and renderer as every adaptive answer.
 *
 * v2 (data preservation): the answer is an executive brief followed by the full analysis the
 * country board used to show, recomposed rather than trimmed. Nothing the stored data holds
 * is dropped because a wireframe did not draw it.
 * v3 (layout): a desk summary with a short answer and "See full reading", follow-up chips
 * under the question, the opening row of country intelligence, pressure breakdown and a
 * sources card beside Research Controls and Next steps, compact findings, the four charts
 * in one row, the flow, the long-run chart and indicators, then interpretation and the
 * evidence (Ezana datasets beside the news).
 *
 *   evidence   buildCountryIntel (macro/intel.js): best stored series per currency family,
 *              histories, the deterministic picture and assessment (macro/currency.js,
 *              macro/playbook.js thresholds), the transmission map
 *              buildCountryDossier (landing-country.js): OECD headline ranks, the Key chart
 *              stories, Key indicators, Global Empire Rankings, Echo, country news
 *              fxFindings (macro/fx-findings.js): the four computed findings
 *   model      buildFxPressure(): typed blocks, each figure with its period and source
 *                lead           executive verdict, narrative, why-it-matters bullets, driver chips
 *                fx_overview    country intelligence: header, four dated KPIs, pressure breakdown
 *                fx_findings    the four findings (evidence, meaning, why, caution)
 *                fx_evidence    source coverage, grouped (Ezana datasets, macro, web and news)
 *                fx_charts      the four charts (FX, inflation vs policy, REER, reserves)
 *                fx_flow        how pressure can travel (nodes and edges)
 *                fx_anchor      the long-run Key chart
 *                fx_indicators  the Key indicators table
 *                fx_drivers / fx_risk_scope / fx_monitor / fx_outlook / fx_conclusion
 *   renderer   SonarFxSections.jsx; the order follows the question's focus.
 *
 * Rules carried from the methodology:
 *   - a rising "local per USD" series means the local currency is weaker; both conventions
 *     are stated: usdInLocalChangePct = (current/prior - 1) * 100 and
 *     localValueInUsdChangePct = (prior/current - 1) * 100. The quote change is never
 *     presented as the currency's loss of dollar value.
 *   - the policy rate minus annual inflation is an ex-post arithmetic spread, never called
 *     the expected real rate.
 *   - reserves are gross whenever only gross figures exist; usable liquidity is not inferred.
 *   - pressure is a diagnosis; a crisis is never established from these series alone, and no
 *     score or probability is shown. Prediction markets appear as evidence (crowd odds with
 *     their platform), never as Ezana's forecast or in the verdict.
 *
 * Pure apart from runFxPressure, which makes the two bounded reads.
 */
import countries from 'i18n-iso-countries';
import { countryOf } from './country-ref';
import { countryByIso3 } from '@/lib/sonar/landing-country';
import { findCurrency, currencyOf, CURRENCY_OF } from '@/lib/sonar/macro/currencies';
import { periodLabel, periodEnd, fmtNum } from '@/lib/sonar/macro/catalog';
import { CURRENCY_LEVELS } from '@/lib/sonar/macro/playbook';
import { assessmentRows } from '@/lib/sonar/macro/intel-brief';
import { fxFindings, compactMetrics } from '@/lib/sonar/macro/fx-findings';
import { storyHeadline } from '@/lib/sonar/key-chart';
import { datasetEvidence } from '@/lib/sonar/country-board';
import { step, sourceBook, freshQuestions } from './kit';

export const FX_VIEW_MODEL = 'fx-pressure-v3';
/* ------------------------------------------------------------------ deterministic math */

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

/** Percent more local currency a dollar costs (prior -> current). Rising = weaker local. */
export const usdInLocalChangePct = (prior, current) =>
  num(prior) && num(current) ? (current / prior - 1) * 100 : null;

/** Percent change in the local currency's dollar value (prior -> current). Negative = lost. */
export const localValueInUsdChangePct = (prior, current) =>
  num(prior) && num(current) ? (prior / current - 1) * 100 : null;

/** Policy rate minus latest annual inflation, in percentage points (ex-post). */
export const exPostRateMinusInflationPp = (policyRate, cpiYoy) =>
  num(policyRate) != null && num(cpiYoy) != null ? policyRate - cpiYoy : null;

/* Days after a period ends before an observation is "lagged" and then "stale". A monthly
   statistic published five weeks after the month is normal, so it is lagged, not stale. */
const WINDOWS = {
  fx_daily: { lagged: 4, stale: 10 },
  fx_monthly: { lagged: 35, stale: 45 },
  monthly: { lagged: 35, stale: 75 },
  policy: { lagged: 45, stale: 120 },
};

/** 'fresh' | 'lagged' | 'stale' for an observation period, by kind. */
export function freshnessOf(period, kind, now = new Date()) {
  const end = periodEnd(period);
  if (!end) return 'stale';
  const days = (now - end) / 864e5;
  const w = WINDOWS[kind] || WINDOWS.monthly;
  return days > w.stale ? 'stale' : days > w.lagged ? 'lagged' : 'fresh';
}

/** The last observation at or before a period's end, from a sorted [{x, y}] series. */
function valueAt(points, period) {
  const end = periodEnd(period);
  if (!end) return null;
  let hit = null;
  for (const p of points) {
    const e = periodEnd(p.x);
    if (e && e <= end) hit = p;
    else if (e && e > end) break;
  }
  return hit;
}

/** The points of a series within `months` of its last observation. */
function lastMonths(points, months) {
  if (!points?.length) return [];
  const last = periodEnd(points[points.length - 1].x);
  if (!last) return points;
  const from = new Date(
    Date.UTC(last.getUTCFullYear(), last.getUTCMonth() - months, last.getUTCDate()),
  );
  return points.filter((p) => {
    const e = periodEnd(p.x);
    return e && e >= from;
  });
}

const cleanPoints = (points) =>
  (points || [])
    .filter((p) => p && p.x && num(Number(p.y)) != null)
    .map((p) => ({ x: String(p.x), y: Number(p.y) }))
    .sort((a, b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : 0));

/* ------------------------------------------------------------------ intent */

/* Names the page uses for a country where the dataset name is older. */
const DISPLAY_NAME = { TUR: 'Türkiye' };
const possessive = (name) => `${name}’s`;

const PRESSURE =
  /\b(pressure|under (strain|stress|attack)|weak(en|ening|ness)?|depreciat\w*|devalu\w*|slid(e|ing)|slump\w*|plung\w*|fall(ing)?|collaps\w*|crisis|crash\w*|stable|stabili[sz]\w*|outlook|doing|health|strong|resilien\w*|vulnerab\w*|at risk|in trouble|safe)\b/i;
const RESERVES =
  /\b(reserves?|external (buffers?|financing|position|liquidity|debt)|buffers?|import cover)\b/i;
const RESILIENCE =
  /\b(resilien\w*|adequa\w*|enough|strong|how (big|large|much)|cover|vulnerab\w*|safe|healthy)\b/i;
/* A same-day move asks why the price moved, not whether the currency is under pressure. */
const MOVEMENT =
  /\b(today|this morning|tonight|yesterday|intraday|this week|right now)\b|\bwhy (did|has|is)\b.{0,40}\b(fall|fell|drop|dropp|slid|plung|jump|surg|spik)\w*/i;
/* A comparison is a different answer (several currencies on one axis). */
const COMPARE =
  /\b(compare|comparison|versus|vs\.?|relative to|against (other|emerging|peers?|its peers)|peers)\b/i;

const FOCUS = [
  [
    'stabilize',
    /\b(stabili[sz]\w*|recover\w*|turn (it )?around|what (could|would|might) (help|support|save|fix))\b/i,
  ],
  ['reserves', RESERVES],
  ['crisis', /\b(crisis|collapse|crash|default|devaluation|break(down)?|disorderly)\b/i],
  ['inflation', /\b(inflation|policy|interest rates?|central bank|real rate)\b/i],
];

/* Currency codes as written in capitals ("TRY", "USD/TRY"); case-sensitive on purpose. */
const CODE_TO_ISO3 = Object.fromEntries(
  Object.entries(CURRENCY_OF)
    .filter(([iso3]) => iso3 !== 'USA')
    .map(([iso3, c]) => [c.code, iso3]),
);
function codeIn(text) {
  const t = String(text || '');
  if (t === t.toUpperCase()) return null; // a question in capitals is not a code
  const m = /\b(?:USD\/?)?([A-Z]{3})(?:\/USD)?\b/g;
  let hit;
  while ((hit = m.exec(t)))
    if (CODE_TO_ISO3[hit[1]] && hit[1] !== 'USD') return CODE_TO_ISO3[hit[1]];
  return null;
}

/**
 * Is this a one-country currency-pressure question?
 * @returns {null | { iso3, focus }}  focus: overall | reserves | inflation | stabilize | crisis
 */
export function fxIntent(text, { thread = null, hasCompany = false } = {}) {
  const q = String(text || '');
  if (!q.trim() || hasCompany) return null;
  if (MOVEMENT.test(q) || COMPARE.test(q)) return null;
  const country = countryOf(q);
  const cur = findCurrency(q, country ? [country.iso3] : []);
  const code = codeIn(q);
  /* A currency the question names (lira, rand, TRY), or the named country's currency. */
  const curIso3 = (cur && !cur.ambiguous && cur.iso3 !== 'USA' ? cur.iso3 : null) || code || null;
  /* Two different currencies named is a comparison. */
  if (curIso3 && country && curIso3 !== country.iso3 && !(curIso3 === 'EUR')) return null;
  const currencyWord = Boolean(curIso3) || /\b(currency|exchange rate|fx)\b/i.test(q);
  let iso3 = curIso3 || country?.iso3 || null;
  /* A follow-up in a currency thread inherits the country ("How resilient are its reserves?"). */
  const inherited = !iso3 && thread?.fx?.iso3 ? thread.fx.iso3 : null;
  if (inherited) iso3 = inherited;
  if (!iso3 || iso3 === 'USA') return null;
  const focus = FOCUS.find(([, re]) => re.test(q))?.[0] || 'overall';
  if (currencyWord && (PRESSURE.test(q) || focus !== 'overall')) return { iso3, focus };
  /* Reserves without a currency word: a resilience question about one country. */
  if (focus === 'reserves' && RESILIENCE.test(q) && (country || inherited)) return { iso3, focus };
  /* A follow-up asked inside a currency thread about inflation, policy or stabilizing. */
  if (inherited && focus !== 'overall') return { iso3, focus };
  /* A follow-up chip from a currency answer ("What should we monitor next?"). */
  if (
    inherited &&
    /\b(monitor|watch|signals?|ease|easing|exposed|external|financing|devaluation|trigger)\b/i.test(
      q,
    )
  )
    return { iso3, focus: 'overall' };
  return null;
}

/* ------------------------------------------------------------------ the view model */

/* Brief first (lead, overview, findings), then the detailed analysis. A focus moves the
   blocks that answer it forward; nothing is removed. */
const ORDER = {
  overall: [
    'fx_overview',
    'fx_findings',
    'fx_charts',
    'fx_flow',
    'fx_anchor',
    'fx_indicators',
    'fx_drivers',
    'fx_risk_scope',
    'fx_monitor',
    'fx_outlook',
    'fx_evidence',
  ],
  reserves: [
    'fx_overview',
    'fx_charts',
    'fx_findings',
    'fx_risk_scope',
    'fx_drivers',
    'fx_flow',
    'fx_anchor',
    'fx_indicators',
    'fx_monitor',
    'fx_outlook',
    'fx_evidence',
  ],
  inflation: [
    'fx_overview',
    'fx_findings',
    'fx_charts',
    'fx_drivers',
    'fx_risk_scope',
    'fx_flow',
    'fx_anchor',
    'fx_indicators',
    'fx_monitor',
    'fx_outlook',
    'fx_evidence',
  ],
  crisis: [
    'fx_overview',
    'fx_risk_scope',
    'fx_drivers',
    'fx_findings',
    'fx_charts',
    'fx_flow',
    'fx_anchor',
    'fx_indicators',
    'fx_monitor',
    'fx_outlook',
    'fx_evidence',
  ],
  stabilize: [
    'fx_overview',
    'fx_outlook',
    'fx_monitor',
    'fx_findings',
    'fx_charts',
    'fx_flow',
    'fx_anchor',
    'fx_indicators',
    'fx_drivers',
    'fx_risk_scope',
    'fx_evidence',
  ],
};
/* Which chart and finding lead for a focus. */
const PANEL_ORDER = {
  reserves: ['reserves', 'reer', 'fx', 'policy'],
  inflation: ['policy', 'fx', 'reer', 'reserves'],
};
const FINDING_ORDER = {
  reserves: ['crisis', 'real', 'pace', 'policy'],
  crisis: ['crisis', 'pace', 'policy', 'real'],
  inflation: ['policy', 'pace', 'real', 'crisis'],
};

const HEADLINE = {
  overall: (p, c) => `Is ${possessive(p)} ${c} under pressure?`,
  crisis: (p, c) => `Is the ${c} heading for a crisis?`,
  reserves: (p) => `How resilient are ${possessive(p)} external buffers?`,
  inflation: (p, c) => `How are inflation and policy rates bearing on the ${c}?`,
  stabilize: (p, c) => `What could stabilize the ${c}?`,
};

const lvl = (l) => (l ? CURRENCY_LEVELS.indexOf(l) : -1);
const pct = (v, d = 1) => `${Math.abs(v).toFixed(d)}%`;
const signedPct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;
const pp = (v) => `${Math.abs(v).toFixed(1)} pp`;
const minus = (s) => String(s ?? '').replace(/(^|[\s(])-(?=\d)/g, '$1−');

/** Reserves value in US dollars, from the stored unit. */
function reservesUsd(value, unit) {
  if (num(value) == null) return null;
  if (/billion/i.test(unit || '')) return value * 1e9;
  if (/million/i.test(unit || '')) return value * 1e6;
  return value;
}
function money(v) {
  if (num(v) == null) return null;
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `$${(a / 1e6).toFixed(1)}M`;
  return `$${Math.round(a).toLocaleString('en-US')}`;
}
const rate = (v) =>
  num(v) == null
    ? null
    : Math.abs(v) >= 1000
      ? Math.round(v).toLocaleString('en-US')
      : v.toFixed(2);

/** Month-end points of a daily series ('YYYY-MM' labelled), for rolling changes. */
function monthEnds(points) {
  const by = new Map();
  for (const p of points) by.set(String(p.x).slice(0, 7), p);
  return [...by.entries()].map(([k, p]) => ({ x: k, y: p.y }));
}

/** Rolling 12-month change in the dollar price of the currency, per month. */
function rolling12m(series) {
  const monthly = series.map((p) => ({ x: String(p.x).slice(0, 7), y: p.y }));
  const by = new Map(monthly.map((p) => [p.x, p.y]));
  const out = [];
  for (const p of monthly) {
    const [y, m] = p.x.split('-').map(Number);
    const prior = by.get(`${y - 1}-${String(m).padStart(2, '0')}`);
    if (num(prior)) out.push({ x: p.x, y: r1(usdInLocalChangePct(prior, p.y)) });
  }
  return out;
}

/** Up to n points spread evenly (first and last kept), for a sparkline. */
function thin(points, n = 24) {
  if (points.length <= n) return points.map((p) => p.y);
  const out = [];
  for (let i = 0; i < n; i += 1)
    out.push(points[Math.round((i * (points.length - 1)) / (n - 1))].y);
  return out;
}

/** A Key chart story -> the typed anchor-chart tab. */
function anchorStory(s, projectionFrom) {
  const pts = (s.points || []).filter((p) => num(p.value) != null);
  if (pts.length < 2) return null;
  const label = (p) => p.label ?? String(Math.floor(p.year));
  const d = s.decimals ?? 1;
  const fmt = (v) => `${minus(v.toFixed(d))}${/%/.test(s.unit || '') ? '%' : ''}`;
  return {
    slug: s.slug,
    short: s.short || s.label,
    label: s.label,
    headline: s.headline || storyHeadline(s),
    unit: s.unit,
    percent: /%/.test(s.unit || ''),
    points: pts.map((p) => ({
      x: label(p),
      y: p.value,
      proj: Boolean(p.proj || (projectionFrom && !p.label && p.year >= projectionFrom)),
      est: Boolean(p.est),
    })),
    median: num(s.median) != null ? s.median : null,
    normYears: s.normYears || null,
    stats: [
      { label: 'Latest', value: fmt(s.latest.value), note: label(s.latest) },
      num(s.median) != null
        ? {
            label: `${s.normYears}Y median`,
            value: fmt(s.median),
            note:
              num(s.z) != null
                ? `${Math.abs(s.z).toFixed(1)} sd ${s.z >= 0 ? 'above' : 'below'}`
                : null,
          }
        : null,
      s.peak ? { label: 'Peak', value: fmt(s.peak.value), note: label(s.peak) } : null,
      s.trough ? { label: 'Trough', value: fmt(s.trough.value), note: label(s.trough) } : null,
    ].filter(Boolean),
    note: `${s.seriesName || s.label}, ${s.unit}. Source: ${s.source || 'OECD Economic Outlook'}.${(s.points || []).some((p) => p.proj) ? ' Dashed years are projections.' : ''}${s.estimate ? ` ${s.estimate}.` : ''}`,
  };
}

/**
 * The typed view model for one country's currency.
 * @param {object} intel    buildCountryIntel() output
 * @param {object} dossier  buildCountryDossier() output (optional; adds the Key chart, Key
 *                          indicators and dataset evidence)
 * @param {{ focus?: string, now?: Date, plan?: object }} o
 * @returns {null | { built, sources, thread, model }}  null when no exchange-rate history
 */
export function buildFxPressure(
  intel,
  dossier = null,
  { focus = 'overall', now = new Date(), plan = null } = {},
) {
  if (!intel || intel.empty || !intel.picture) return null;
  const m = intel.picture.metrics || {};
  const fx = m.fx;
  if (!fx?.latest || !fx.y1) return null; // a year of FX history is the minimum
  if (!ORDER[focus]) focus = 'overall';
  const charts = intel.charts || {};
  const assessment = intel.picture.assessment || { components: [], overall: null, missing: [] };
  const comp = (id) => assessment.components.find((c) => c.id === id) || null;
  const currency = intel.currency ||
    currencyOf(intel.iso3) || { code: '', name: 'currency', short: 'currency' };
  const code = currency.code || 'local currency';
  const shortName = currency.short || currency.name || 'currency';
  const place = DISPLAY_NAME[intel.iso3] || countryByIso3(intel.iso3)?.name || intel.place;
  const missing = (intel.picture.missing || []).filter(Boolean);

  /* Sources: one per stored series family, each with the series and its observation range. */
  const sources = sourceBook();
  const src = (chart, family) =>
    chart?.source
      ? [
          sources.add({
            key: `fx:${family}:${chart.source}`,
            title: `${chart.source}: ${chart.label}`,
            publisher: chart.source,
            date: chart.period?.split(' to ').pop() || null,
            detail: `${chart.label}, ${chart.period}. Stored official series as published; Sonar does not adjust it.`,
            kind: 'dataset',
          }),
        ]
      : [];
  const fxChart = charts.fx || charts.fxMonthly || null;
  const fxCites = src(fxChart, 'fx');
  const inflCites = src(charts.inflation, 'inflation');
  const polCites = src(charts.policy, 'policy');
  const resCites = src(charts.reserves, 'reserves');
  const reerCites = src(charts.reer, 'reer');
  const keyCites =
    dossier?.keyIndicators?.length || dossier?.keyChart?.stories?.length
      ? [
          sources.add({
            key: `fx:dossier:${intel.iso3}`,
            title: `${place}: Key chart and Key indicators`,
            publisher:
              [...new Set((dossier.keyIndicators || []).map((r) => r.source).filter(Boolean))].join(
                ', ',
              ) || 'OECD Economic Outlook',
            detail:
              'Latest observed values per headline indicator, with the long-run series behind the Key chart. Estimates and projections are labelled.',
            kind: 'dataset',
          }),
        ]
      : [];

  /* ---- the computed facts the narrative uses (all deterministic) */
  const y1 = fx.y1;
  const usdUp = usdInLocalChangePct(y1.from, y1.to);
  const valueChg = localValueInUsdChangePct(y1.from, y1.to);
  const m3 = fx.m3;
  const m3ValueChg = m3 ? localValueInUsdChangePct(m3.from, m3.to) : null;
  const fxKind = fx.frequency === 'daily' ? 'fx_daily' : 'fx_monthly';
  const fxFresh = freshnessOf(fx.latest.period, fxKind, now);
  const infl = m.inflation;
  const pol = m.policy;
  const res = m.reserves;
  const reer = charts.reer ? m.reer : null;
  const spread =
    pol && infl ? exPostRateMinusInflationPp(pol.level.value, infl.annual.value) : null;
  const resUnit = charts.reserves?.unit || '';
  const resNow = res ? reservesUsd(res.level.value, resUnit) : null;
  const depLevel = comp('depreciation')?.level || null;
  const overall = assessment.overall;
  const weaker = valueChg < 0;
  const persistent = weaker && m3ValueChg != null && m3ValueChg < 0;
  const pressureLevel = Math.max(lvl(depLevel), lvl(overall));
  const pressure = pressureLevel >= 1 ? 'established' : weaker ? 'limited' : 'not_established';
  const ca = m.external?.currentAccount;

  /* ================================================================ executive brief */
  let verdict;
  if (pressureLevel >= 2)
    verdict = `Yes. The ${shortName} is ${persistent ? 'depreciating persistently' : 'markedly weaker than a year ago'}, but the available data do not establish an imminent currency crisis.`;
  else if (pressureLevel === 1)
    verdict = `Moderately. The ${shortName} has lost ground against the dollar${persistent ? ' and is still weakening' : ''}, but the available data do not point to acute stress.`;
  else if (weaker)
    verdict = `Not materially. The ${shortName} is only slightly weaker against the dollar than a year ago, within Ezana’s low-pressure band.`;
  else
    verdict = `No. The ${shortName} has strengthened against the dollar over the year; the stored data show no exchange-rate pressure.`;

  let ctxText = `${
    usdUp >= 0
      ? `The dollar costs ${pct(usdUp)} more ${shortName} than a year earlier`
      : `The dollar costs ${pct(usdUp)} less ${shortName} than a year earlier`
  }${
    infl
      ? `, while annual inflation is ${pct(infl.annual.value)} (${periodLabel(infl.annual.period)})${infl.trend && infl.annualYearAgo ? `, ${infl.trend === 'falling' ? 'down' : infl.trend === 'rising' ? 'up' : 'unchanged'} from ${pct(infl.annualYearAgo.value)} a year earlier` : ''}`
      : ''
  }.`;
  if (pol && spread != null)
    ctxText +=
      spread > 0
        ? ` A ${pct(pol.level.value)} policy rate sits ${pp(spread)} above latest inflation, which provides some monetary restraint;`
        : ` The ${pct(pol.level.value)} policy rate sits ${pp(spread)} below latest inflation, so monetary policy offers little restraint;`;
  ctxText += `${pol && spread != null ? ' whether' : ' Whether'} external buffers can absorb new shocks depends on more than gross reserves alone.`;
  if (fxFresh === 'stale')
    ctxText += ` The latest stored exchange rate is from ${periodLabel(fx.latest.period)}, so later moves are not captured.`;

  /* Why it matters: one line per driver the data hold, each with what it shows. */
  const bullets = [
    {
      id: 'fx',
      text: `${code} per USD rose ${pct(usdUp)} in twelve months to ${rate(fx.latest.value)} (${periodLabel(fx.latest.period)}); the ${shortName} lost ${pct(valueChg)} of its dollar value${m3ValueChg != null ? `, ${pct(m3ValueChg)} of it in the last three months` : ''}.`,
      basis: 'supported',
    },
    infl
      ? {
          id: 'inflation',
          text: `Annual inflation is ${pct(infl.annual.value)} (${periodLabel(infl.annual.period)})${infl.annualYearAgo ? `, ${infl.trend === 'falling' ? 'down' : infl.trend === 'rising' ? 'up' : 'unchanged'} from ${pct(infl.annualYearAgo.value)}` : ''}: ${infl.annual.value >= 10 ? 'persistent price growth keeps eroding the currency' : 'not the main source of pressure'}.`,
          basis: 'supported',
        }
      : null,
    spread != null
      ? {
          id: 'policy',
          text: `The ${pct(pol.level.value)} policy rate is ${pp(spread)} ${spread >= 0 ? 'above' : 'below'} inflation on an ex-post basis${pol.change12mPp != null && pol.change12mPp < 0 ? `, after ${pp(pol.change12mPp)} of cuts in a year` : ''}: ${spread >= 0 ? 'restrictive, yet depreciation continues' : 'too loose to anchor the currency'}.`,
          basis: 'interpretation',
        }
      : null,
    res
      ? {
          id: 'reserves',
          text: `Gross reserves are ${money(resNow)} (${periodLabel(res.level.period)})${res.change3mPct != null ? `, ${res.change3mPct >= 0 ? 'up' : 'down'} ${pct(res.change3mPct)} over three months` : ''}${num(res.importMonths) != null ? `, about ${res.importMonths.toFixed(1)} months of goods imports` : ''}; usable (net) reserves are not in the data.`,
          basis: 'supported',
        }
      : null,
    {
      id: 'external',
      text:
        ca && num(ca.value) != null
          ? `The current account is ${minus(fmtNum(ca.value))}% of GDP (${periodLabel(ca.period)}); short-term external debt, rollover needs and CDS spreads, which decide whether pressure turns disorderly, cannot be assessed here.`
          : 'Short-term external debt, rollover needs and CDS spreads, which decide whether pressure turns disorderly, are not in Ezana’s data.',
      basis: 'cannot_conclude',
    },
  ].filter(Boolean);

  /* Driver chips: the assessment components with their levels. */
  const CHIP = {
    depreciation: 'FX depreciation',
    inflation: 'Inflation persistence',
    policy: 'Policy stance',
    external: 'Reserves and liquidity',
    stress: 'External vulnerability',
  };
  const chips = assessment.components
    .filter((c) => CHIP[c.id] && c.level)
    .map((c) => ({ id: c.id, label: CHIP[c.id], level: c.level }));

  const built = {};
  /* The desk summary: a short answer, one paragraph with the figures behind it, and the
     longer reading under "See full reading". */
  const LEVEL_WORD = { low: 'low', moderate: 'moderate', elevated: 'elevated', severe: 'severe' };
  const levelWord = LEVEL_WORD[overall] || LEVEL_WORD[depLevel] || null;
  const shortAnswer =
    pressureLevel >= 2
      ? `Yes. Pressure on the ${shortName} is ${levelWord || 'elevated'}.`
      : pressureLevel === 1
        ? `Moderately. The ${shortName} is under some pressure.`
        : weaker
          ? `Not materially. The ${shortName} is only slightly weaker.`
          : `No. The ${shortName} has strengthened against the dollar.`;
  const deskText =
    `${levelWord ? `By Ezana’s thresholds, pressure on the ${shortName} is ${levelWord}. ` : ''}` +
    `Over the year to ${periodLabel(y1.toPeriod)} the dollar ${usdUp >= 0 ? 'costs' : 'cost'} ${pct(usdUp)} ${usdUp >= 0 ? 'more' : 'less'} in ${possessive(place)} ${shortName}, and the ${shortName} ${valueChg < 0 ? 'lost' : 'gained'} ${pct(valueChg)} of its dollar value.` +
    `${pressureLevel >= 1 ? ' The available data do not establish an imminent currency crisis.' : ''}`;

  built.lead = {
    kicker: null, // the family label (Currency intelligence) heads the answer
    question: HEADLINE[focus](place, shortName),
    headline: shortAnswer,
    verdict: null,
    text: deskText,
    reading: `${verdict} ${ctxText}`,
    bullets,
    chips,
    asOf: `Observations through ${periodLabel(fx.latest.period)}`,
    computed: true,
    cites: [...fxCites, ...inflCites, ...polCites].slice(0, 3),
  };

  /* ================================================================ country intelligence */
  const tiles = [];
  const fxSparkSrc = cleanPoints(fxChart?.points);
  tiles.push({
    id: 'fx',
    label: `${code} per USD`,
    value: rate(fx.latest.value),
    delta: `Dollar ${usdUp >= 0 ? '+' : '−'}${pct(usdUp)} in a year`,
    tone: usdUp > 0 ? 'negative' : 'positive',
    period: `${periodLabel(fx.latest.period)} · higher = weaker ${code}`,
    freshness: fxFresh,
    spark: thin(lastMonths(fxSparkSrc, 12)),
    cites: fxCites,
  });
  if (infl)
    tiles.push({
      id: 'inflation',
      label: 'Annual inflation',
      value: pct(infl.annual.value),
      delta: infl.annualYearAgo
        ? `${infl.trend === 'falling' ? 'Falling' : infl.trend === 'rising' ? 'Rising' : 'Unchanged'} from ${pct(infl.annualYearAgo.value)}`
        : null,
      tone:
        infl.trend === 'falling' ? 'positive' : infl.trend === 'rising' ? 'negative' : 'neutral',
      period: `${periodLabel(infl.annual.period)} · year over year${infl.computedFromIndex ? ', from the CPI index' : ''}`,
      freshness: freshnessOf(infl.annual.period, 'monthly', now),
      spark: thin(lastMonths(cleanPoints(charts.inflation?.points), 12)),
      cites: inflCites,
    });
  if (pol)
    tiles.push({
      id: 'policy',
      label: 'Policy interest rate',
      value: pct(pol.level.value),
      delta:
        spread != null
          ? `${spread >= 0 ? '+' : '−'}${pp(spread)} vs. inflation*`
          : pol.change12mPp != null
            ? `${pol.change12mPp >= 0 ? '+' : '−'}${pp(pol.change12mPp)} in a year`
            : null,
      tone: 'neutral',
      period: `${periodLabel(pol.level.period)}${pol.change12mPp != null ? ` · ${pol.change12mPp >= 0 ? '+' : '−'}${pp(pol.change12mPp)} in a year` : ''}`,
      freshness: freshnessOf(pol.level.period, 'policy', now),
      spark: thin(lastMonths(cleanPoints(charts.policy?.points), 12)),
      cites: [...polCites, ...(spread != null ? inflCites : [])],
    });
  if (res)
    tiles.push({
      id: 'reserves',
      label: 'Gross official reserves',
      value: money(resNow) || fmtNum(res.level.value, { money: true }),
      delta:
        res.change3mPct != null
          ? `${res.change3mPct >= 0 ? '+' : '−'}${pct(res.change3mPct)} in 3 months`
          : null,
      tone: res.change3mPct > 0 ? 'positive' : res.change3mPct < 0 ? 'negative' : 'neutral',
      period: `${periodLabel(res.level.period)}${num(res.importMonths) != null ? ` · ${res.importMonths.toFixed(1)} months of imports` : ''}`,
      freshness: freshnessOf(res.level.period, 'monthly', now),
      spark: thin(lastMonths(cleanPoints(charts.reserves?.points), 12)),
      cites: resCites,
    });
  const metricOrder = {
    reserves: ['reserves', 'fx', 'policy', 'inflation'],
    inflation: ['inflation', 'policy', 'fx', 'reserves'],
  }[focus];
  if (metricOrder) tiles.sort((a, b) => metricOrder.indexOf(a.id) - metricOrder.indexOf(b.id));
  built.fx_overview = {
    eyebrow: 'Country intelligence / FX risk',
    place,
    iso2: (intel.iso3 && countries.alpha3ToAlpha2(intel.iso3)) || null,
    currency: `${currency.name || shortName}${currency.code ? ` (${currency.code})` : ''}`,
    level: overall,
    levelLabel:
      intel.assessmentLabel ||
      (overall ? `${overall[0].toUpperCase()}${overall.slice(1)} pressure` : null),
    asOf: `As of ${periodLabel(fx.latest.period)}`,
    items: tiles,
    footnote:
      spread != null
        ? `* ${pct(pol.level.value)} minus ${pct(infl.annual.value)} = ${spread >= 0 ? '' : '−'}${pp(spread)}, an ex-post spread; it is not the forward-looking real policy rate.`
        : null,
    breakdown: assessment.overall
      ? assessmentRows(intel.picture, null).map((r) => ({
          id: r.id,
          label: r.label,
          level: r.level,
          reading: r.evidence && typeof r.evidence === 'object' ? null : r.evidence || null,
        }))
      : [],
    breakdownNote:
      'Qualitative assessment against Ezana’s thresholds, not a calibrated risk score.',
  };

  /* ================================================================ key findings */
  const ID_OF = { 0: 'pace', 1: 'policy', 2: 'real', 3: 'crisis' };
  const raw = fxFindings({
    metrics: compactMetrics(m, { reerBasis: intel.reerBasis || null }),
    currency,
    place,
    missing,
  });
  const findingCites = {
    fx: fxCites,
    policy: [...polCites, ...inflCites],
    reer: reerCites,
    reserves: resCites,
  };
  let findings = raw.map((f) => ({
    key: /policy/i.test(f.title)
      ? 'policy'
      : /real/i.test(f.title)
        ? 'real'
        : /establish|scope/i.test(f.title)
          ? 'crisis'
          : /depreciation|pace/i.test(f.title)
            ? 'pace'
            : ID_OF[raw.indexOf(f)],
    title: f.title,
    status: f.status,
    headline: minus(f.headline),
    evidence: (f.evidence || []).map(minus),
    meaning: f.interpretation || null,
    why: f.why || null,
    caution: f.qualification || null,
    chart: f.chart || null,
    cites: findingCites[f.chart] || fxCites,
  }));
  const fo = FINDING_ORDER[focus];
  if (fo) findings = [...findings].sort((a, b) => fo.indexOf(a.key) - fo.indexOf(b.key));
  if (findings.length) built.fx_findings = { eyebrow: 'Key findings', items: findings };

  /* ================================================================ evidence and coverage */
  const datasets = dossier
    ? datasetEvidence({ dossier }).map((r) => ({
        id: r.id,
        chip: r.chip,
        dataset: r.dataset,
        title: r.title,
        summary: r.summary || null,
        bullets: (r.bullets || []).map(minus),
        href: r.href && !/^https?:/i.test(r.href) ? r.href : null,
        /* Prediction markets: crowd odds on open questions naming the country, shown as
             evidence with their platform; never Ezana's forecast and never in the verdict. */
        kind: r.id === 'prediction-markets' ? 'markets' : 'dataset',
      }))
    : [];
  const marketCount = Array.isArray(dossier?.matches?.markets) ? dossier.matches.markets.length : 0;
  const macroSources = (intel.sources || []).filter(Boolean);
  const news = (dossier?.news || [])
    .filter((n) => n && n.title && /^https?:/i.test(n.url || n.link || ''))
    .slice(0, 4)
    .map((n) => ({
      title: n.title,
      url: n.url || n.link,
      source: n.source || n.publisher || null,
      date: n.publishedAt || n.date || null,
    }));
  if (datasets.length || news.length || macroSources.length)
    built.fx_evidence = {
      eyebrow: 'Evidence',
      datasets,
      news,
      macroSources,
    };
  /* The opening row's sources card: how much evidence there is, and the leading datasets. */
  const evidenceCount = sources.list.length + datasets.length + news.length + marketCount;
  const sourcesBrief = datasets.length
    ? {
        count: evidenceCount,
        items: datasets.slice(0, 3).map((d) => ({
          id: d.id,
          badge: String(d.chip || d.dataset || '?')
            .trim()
            .charAt(0)
            .toUpperCase(),
          title: d.dataset,
          sub: d.kind === 'markets' ? 'Market odds, not Ezana forecasts' : 'Ezana dataset',
        })),
      }
    : sources.list.length
      ? {
          count: evidenceCount,
          items: sources.list.slice(0, 3).map((x, k) => ({
            id: `s${k}`,
            badge: String(x.publisher || x.title || '?')
              .trim()
              .charAt(0)
              .toUpperCase(),
            title: x.publisher || x.title,
            sub: 'Official series',
          })),
        }
      : null;
  built.fx_overview.sourcesBrief = sourcesBrief;

  /* ================================================================ the four charts */
  const panels = [];
  const fxPts = cleanPoints(charts.fx?.points);
  const fxMonthlyPts = cleanPoints(charts.fxMonthly?.points);
  const fxBase = fxPts.length >= 2 ? fxPts : fxMonthlyPts;
  if (fxBase.length >= 2) {
    const monthly = fxMonthlyPts.length >= 13 ? fxMonthlyPts : monthEnds(fxBase);
    const chg = rolling12m(monthly);
    const last = fxBase[fxBase.length - 1];
    panels.push({
      id: 'fx',
      title: `${code} per US dollar`,
      ranges: ['3M', '1Y', '3Y', '5Y'],
      defaultRange: '1Y',
      views: [
        {
          id: 'level',
          label: 'Level',
          unit: 'rate',
          series: [{ name: `${code} per USD`, tone: 'primary', points: fxBase }],
        },
        chg.length >= 2
          ? {
              id: 'change',
              label: '12M change',
              unit: '%',
              zero: true,
              series: [{ name: 'Dollar price, 12-month change', tone: 'primary', points: chg }],
            }
          : null,
      ].filter(Boolean),
      latest: `${periodLabel(last.x)} · ${rate(last.y)}`,
      caption: `Unit: ${code} per USD, ${fx.frequency === 'daily' ? 'daily' : 'monthly'} observations. Source: ${(charts.fx || charts.fxMonthly).source}. A higher line means a weaker ${code}. The 12M change is the change in the dollar’s price, not the ${shortName}’s loss of dollar value.`,
      cites: fxCites,
    });
  }
  const inflPts = cleanPoints(charts.inflation?.points);
  const polPts = cleanPoints(charts.policy?.points);
  if (inflPts.length >= 2) {
    const months = lastMonths(inflPts, 36);
    const aligned = months.map((p) => ({
      x: p.x,
      inflation: p.y,
      policy: polPts.length ? (valueAt(polPts, p.x)?.y ?? null) : null,
    }));
    const withPolicy = aligned.filter((r) => r.policy != null).length >= 2;
    const realPts = aligned
      .filter((r) => r.policy != null)
      .map((r) => ({ x: r.x, y: r1(exPostRateMinusInflationPp(r.policy, r.inflation)) }));
    panels.push({
      id: 'policy',
      title: withPolicy ? 'Inflation and the policy rate' : 'Annual inflation',
      views: [
        {
          id: 'rates',
          label: 'Rates',
          unit: '%',
          series: [
            {
              name: 'Inflation',
              tone: 'primary',
              points: aligned.map((r) => ({ x: r.x, y: r.inflation })),
            },
            withPolicy
              ? {
                  name: 'Policy rate',
                  tone: 'reference',
                  points: aligned.map((r) => ({ x: r.x, y: r.policy })),
                }
              : null,
          ].filter(Boolean),
        },
        realPts.length >= 2
          ? {
              id: 'real',
              label: 'Real rate',
              unit: 'pp',
              zero: true,
              series: [
                {
                  name: 'Ex-post real rate (policy minus inflation)',
                  tone: 'primary',
                  points: realPts,
                },
              ],
            }
          : null,
      ].filter(Boolean),
      latest:
        infl && pol
          ? `${periodLabel(pol.level.period)} · Inflation ${pct(infl.annual.value)} · Policy rate ${pct(pol.level.value)}`
          : infl
            ? `${periodLabel(infl.annual.period)} · ${pct(infl.annual.value)}`
            : null,
      caption: `Annual inflation (solid) monthly${withPolicy ? ' and the policy rate in force at each month end (dashed)' : ''}, %. Source: ${[charts.inflation?.source, withPolicy ? charts.policy?.source : null].filter(Boolean).join('; ')}.${spread != null ? ` Latest ex-post real rate: ${spread >= 0 ? '+' : '−'}${pp(spread)}. Ex-post means policy rate minus the latest inflation print; it is not the expected real rate.` : ''}`,
      cites: [...inflCites, ...polCites],
    });
  }
  const reerPts = cleanPoints(charts.reer?.points);
  if (reerPts.length >= 12) {
    const sorted = [...reerPts.map((p) => p.y)].sort((a, b) => a - b);
    const k = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[k] : (sorted[k - 1] + sorted[k]) / 2;
    panels.push({
      id: 'reer',
      title: 'Real effective exchange rate (BIS, broad)',
      views: [
        {
          id: 'level',
          label: 'Index',
          unit: 'index',
          ref: { value: median, label: `Median ${median.toFixed(1)}` },
          series: [{ name: 'REER', tone: 'primary', points: reerPts }],
        },
      ],
      latest: `${periodLabel(reerPts[reerPts.length - 1].x)} · ${reerPts[reerPts.length - 1].y.toFixed(1)}`,
      caption: `Unit: index; a higher line means a stronger currency in real terms. Latest ${reerPts[reerPts.length - 1].y.toFixed(1)} (${periodLabel(reerPts[reerPts.length - 1].x)})${reer?.percentile != null ? `, the ${ordinal(reer.percentile)} percentile of its own history since ${periodLabel(reer.since)}` : ''}${reer?.change1yPct != null ? `; ${signedPct(reer.change1yPct)} on a year earlier` : ''}. Not by itself a measure of over- or undervaluation. Source: ${charts.reer.source}.`,
      cites: reerCites,
    });
  }
  const resPts = cleanPoints(charts.reserves?.points).map((p) => ({
    x: p.x,
    y: reservesUsd(p.y, resUnit),
  }));
  if (resPts.length >= 2) {
    panels.push({
      id: 'reserves',
      title: 'Official reserves',
      views: [
        {
          id: 'level',
          label: 'Gross',
          unit: 'usd',
          series: [{ name: 'Gross official reserves', tone: 'primary', points: resPts }],
        },
      ],
      latest: `${periodLabel(resPts[resPts.length - 1].x)} · ${money(resPts[resPts.length - 1].y)}`,
      freshness: res ? freshnessOf(res.level.period, 'monthly', now) : null,
      caption: `Unit: US dollars, gross. ${charts.reserves.period}. Source: ${charts.reserves.source}. Gross reserves are not the same as usable (net) liquidity${num(res?.importMonths) != null ? `; the latest level covers about ${res.importMonths.toFixed(1)} months of goods imports` : ''}.`,
      cites: resCites,
    });
  }
  const po = PANEL_ORDER[focus];
  if (po) panels.sort((a, b) => po.indexOf(a.id) - po.indexOf(b.id));
  if (panels.length) built.fx_charts = { eyebrow: 'Key data visualizations', panels };

  /* ================================================================ how pressure can travel */
  const tm = intel.transmission;
  if (tm?.nodes?.length >= 2 && tm.edges?.length) {
    const ids = new Set(tm.nodes.map((n) => n.id));
    const edges = tm.edges.filter(([a, b]) => ids.has(a) && ids.has(b));
    const layer = {};
    const depth = (id, seen = new Set()) => {
      if (layer[id] != null) return layer[id];
      if (seen.has(id)) return 0;
      seen.add(id);
      const ins = edges.filter(([, b]) => b === id).map(([a]) => a);
      layer[id] = ins.length ? Math.max(...ins.map((a) => depth(a, seen))) + 1 : 0;
      return layer[id];
    };
    tm.nodes.forEach((n) => depth(n.id));
    const outgoing = new Set(edges.map(([a]) => a));
    built.fx_flow = {
      eyebrow: 'How pressure can travel',
      title: 'From domestic drivers to the exchange rate and beyond',
      nodes: tm.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        layer: layer[n.id] || 0,
        kind: !outgoing.has(n.id) ? 'effect' : n.supported ? 'supported' : 'conceptual',
        supported: Boolean(n.supported),
        feeds: edges
          .filter(([a]) => a === n.id)
          .map(([, b]) => tm.nodes.find((x) => x.id === b)?.label),
      })),
      edges: edges.map(([from, to]) => ({ from, to })),
      caption: `${tm.caption || 'Conceptual channels, not a fitted causal model.'} “Supported by data” means the stored series show that link’s starting condition today.`,
    };
  }

  /* ================================================================ long-run anchor and indicators */
  const kc = dossier?.keyChart || (dossier?.oecd?.stories?.length ? dossier.oecd : null);
  const stories = (kc?.stories || []).map((s) => anchorStory(s, kc.projectionFrom)).filter(Boolean);
  if (stories.length) {
    const def = Math.min(Math.max(0, kc.storyIndex ?? 0), stories.length - 1);
    built.fx_anchor = {
      eyebrow: `${intel.iso3} / Key chart`,
      place,
      stories,
      defaultIndex: def,
      cites: keyCites,
    };
  }
  const rows = (dossier?.keyIndicators || []).filter((r) => r && r.label && r.value != null);
  if (rows.length)
    built.fx_indicators = {
      eyebrow: `${intel.iso3} / Key indicators`,
      place,
      rows: rows.map((r) => ({
        id: r.id || r.label,
        label: r.label,
        value: minus(r.value),
        period: r.period || '',
        change: r.change ? minus(r.change) : null,
        source: r.source || '',
        attribution: r.attribution || null,
        note: r.estimate || r.projection || null,
      })),
      note: 'Latest observed values. IMF staff estimates and projections are labelled and never shown as outcomes.',
      cites: keyCites,
    };

  /* ================================================================ interpretation and scope */
  const drivers = [];
  if (infl)
    drivers.push({
      driver: 'Prices',
      basis: 'observed',
      text: `Annual inflation of ${pct(infl.annual.value)} (${periodLabel(infl.annual.period)})${infl.trend === 'falling' ? ' remains high even as its rate declines' : infl.trend === 'rising' ? ' is rising' : ''}, ${infl.annual.value >= 10 ? 'adding pressure to confidence and domestic purchasing power' : 'a limited source of pressure on its own'}.`,
      cites: inflCites,
    });
  if (spread != null)
    drivers.push({
      driver: 'Monetary policy',
      basis: 'derived',
      text: `The ${pct(pol.level.value)} rate is ${pp(spread)} ${spread >= 0 ? 'above' : 'below'} latest observed inflation (an ex-post arithmetic difference, not the expected real policy rate)${pol.change12mPp != null && pol.change12mPp < 0 ? `; the rate is ${pp(pol.change12mPp)} lower than a year earlier` : ''}.`,
      cites: [...polCites, ...inflCites],
    });
  drivers.push(
    ca && num(ca.value) != null
      ? {
          driver: 'External financing',
          basis: 'observed',
          text: `The current account was ${minus(fmtNum(ca.value))}% of GDP in ${periodLabel(ca.period)}${ca.estimate ? ` (${ca.estimate})` : ''}. ${ca.value < 0 ? 'A deficit has to be financed from abroad, which can amplify FX pressure when funding tightens.' : 'A surplus reduces reliance on foreign funding.'} Current net financing stress is not directly measured here.`,
          cites: [],
        }
      : {
          driver: 'External financing',
          basis: 'conceptual',
          text: 'Funding demand and investor confidence can amplify FX pressure, but current net financing stress is not directly established by the stored series.',
          cites: [],
        },
  );
  if (reer?.change1yPct != null)
    drivers.push({
      driver: 'Real exchange rate',
      basis: 'observed',
      text: `The BIS real effective exchange rate ${reer.change1yPct >= 0 ? 'rose' : 'fell'} ${pct(reer.change1yPct)} over the year to ${fmtNum(reer.latest.value)} (${periodLabel(reer.latest.period)})${reer.change1yPct > 0 && weaker ? `, despite nominal ${code} depreciation; the measures use different baskets and price adjustments` : ''}.`,
      cites: reerCites,
    });
  built.fx_drivers = {
    eyebrow: 'What the data support, and what is interpretation',
    title: 'How the macro forces connect',
    note: 'Observed: a stored series. Derived: arithmetic on stored series. Conceptual: a channel, not measured here.',
    rows: drivers,
  };

  built.fx_risk_scope = {
    eyebrow: 'What cannot yet be concluded',
    pressure,
    crisis: 'not_established',
    text:
      pressure === 'established'
        ? 'Currency weakness is observable in the stored exchange rate. Determining whether a disorderly break is near requires more direct external-liquidity and market-stress measures.'
        : 'The stored exchange rate does not show sustained weakness by Ezana’s thresholds. A crisis judgment would still need external-liquidity and market-stress measures.',
    missing: [
      'Net usable reserves',
      'Short-term external debt',
      'Forward FX obligations',
      'Bank FX funding',
      'Sovereign CDS spreads',
      'Capital flows',
      'Inflation expectations',
    ],
    alsoMissing: missing.filter(
      (x) => !/cds|inflation expectations|net usable|short-term external|capital flow/i.test(x),
    ),
    thresholdsNote: overall
      ? `Pressure level by Ezana’s thresholds: ${overall}. A level, not a probability.`
      : null,
  };

  /* ---- monitoring checklist: what to watch, and whether Sonar holds it */
  const resFresh = res ? freshnessOf(res.level.period, 'monthly', now) : null;
  built.fx_monitor = {
    eyebrow: 'Monitoring checklist',
    items: [
      {
        signal:
          fx.frequency === 'daily' ? 'Daily FX and volatility' : 'Exchange rate and volatility',
        why: `${code} per USD moves and rapid changes in realized volatility.`,
        availability: fx.frequency === 'daily' && fxFresh !== 'stale' ? 'in_data' : 'partial',
        reading:
          fx.volatility3m != null && fx.volatility5yMedian != null
            ? `3-month volatility of daily moves ${fx.volatility3m.toFixed(2)}%, ${fx.volatility3m < fx.volatility5yMedian ? 'below' : 'above'} its 5-year median of ${fx.volatility5yMedian.toFixed(2)}%`
            : null,
      },
      {
        signal: 'Inflation expectations',
        why: 'Whether expected inflation is falling alongside observed inflation.',
        availability: 'gap',
      },
      {
        signal: 'Monetary decisions',
        why: 'The policy path and its credibility against incoming inflation, not only the ex-post spread.',
        availability: pol ? 'partial' : 'gap',
      },
      {
        signal: 'Reserve adequacy',
        why: 'Net usable reserves against short-term obligations; gross reserves alone overstate the buffer.',
        availability: res ? 'partial' : 'gap',
        reading: res
          ? `Gross only, ${periodLabel(res.level.period)}${resFresh === 'fresh' ? '' : `, ${resFresh}`}`
          : null,
      },
      {
        signal: 'Funding market stress',
        why: 'CDS spreads, external refinancing and capital flows could change the risk assessment.',
        availability: 'gap',
      },
    ],
  };

  built.fx_outlook = {
    eyebrow: 'Conditional outlook / No probabilities',
    rows: [
      {
        name: 'Stabilization',
        tone: 'calm',
        text: `The ${shortName}’s monthly depreciation slows, inflation keeps falling${spread != null ? ' with the policy rate above it' : ''}, and external buffers hold or rise.`,
      },
      {
        name: 'Continued pressure',
        tone: 'mid',
        text: 'Disinflation is slow while depreciation persists and financing remains costly.',
      },
      {
        name: 'Stress escalation',
        tone: 'high',
        text: 'Reserves fall, rollover conditions tighten, or exchange-rate volatility shifts abruptly.',
      },
    ],
  };

  built.fx_conclusion = {
    text:
      pressure === 'established'
        ? 'The available evidence supports a diagnosis of sustained currency pressure, not an imminent crisis forecast. The measures that would change this judgment are listed under Risk signals.'
        : 'The available evidence does not show sustained currency pressure. The measures a crisis judgment would need are listed under Risk signals.',
  };

  built.limitations = {
    items: [
      'Every figure is a stored official observation with its own date; daily, monthly and annual series are labelled and never mixed into one line.',
      'Pressure levels use Ezana’s published thresholds. They are a diagnosis, not a probability or a forecast.',
      fx.frequency === 'monthly'
        ? 'The exchange rate is a monthly average, so moves within the latest month are not captured.'
        : null,
      missing.length ? `Not in Ezana’s data for ${place}: ${missing.join('; ')}.` : null,
    ].filter(Boolean),
  };

  /* Follow-up chips under the question: what eases it, peers, policy, exposure, what to watch. */
  const chips4 = [
    focus !== 'stabilize' ? `What would ease pressure on the ${shortName}?` : null,
    focus !== 'inflation' ? `Does monetary policy offset the pressure on the ${shortName}?` : null,
    focus !== 'reserves' ? `How exposed is ${place} to external financing conditions?` : null,
    `What could trigger a sharper ${shortName} devaluation?`,
    `What should we monitor next for the ${shortName}?`,
  ];
  built.followups = {
    placeholder: `Ask about the assumptions, risks or another part of this analysis`,
    related: plan ? freshQuestions(plan, chips4, 4) : chips4.filter(Boolean).slice(0, 4),
  };

  const sectionOrder = ORDER[focus].filter((t) => built[t]);
  built._order = ['lead', ...sectionOrder, 'fx_conclusion', 'sources', 'limitations', 'followups'];

  return {
    built,
    sources: sources.list,
    thread: {
      subject: place,
      fx: { iso3: intel.iso3, code },
      headline: built.lead.headline,
      summary: `${verdict} ${ctxText}`.slice(0, 600),
    },
    model: { version: FX_VIEW_MODEL, focus, pressure, overall },
  };
}

const ordinal = (k) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = k % 100;
  return `${k}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/* ------------------------------------------------------------------ executor */

/** The C01 strategy for a currency-pressure plan. null lets the caller answer the old way. */
export async function runFxPressure(plan, deps, now, telemetry) {
  const iso3 = plan.fx?.iso3;
  if (!iso3 || !deps.countryIntel) return null;
  const [intel, dossier] = await Promise.all([
    step(telemetry, 'macro_series', 10000, () => deps.countryIntel(iso3, { now })).catch(
      () => null,
    ),
    deps.countryDossier
      ? step(telemetry, 'country_dossier', 9000, () =>
          deps.countryDossier(iso3, { query: plan.resolvedQuestion || plan.question || '' }),
        ).catch(() => null)
      : null,
  ]);
  const out = buildFxPressure(intel, dossier, { focus: plan.fx.focus, now, plan });
  if (!out) return null;
  return { built: out.built, sources: out.sources, thread: out.thread, audit: out.model };
}
