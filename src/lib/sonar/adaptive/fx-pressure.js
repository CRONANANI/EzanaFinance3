/**
 * Sonar adaptive research: currency pressure (Nov 17, 2026). View model `fx-pressure-v1`.
 *
 * "Is Türkiye's lira under pressure?", "How resilient are Brazil's reserves?", "What could
 * stabilize the rand?": one country's currency judged from Ezana's stored official series.
 * This is a strategy inside the country-macro scenario (C01), not a parallel engine: the
 * router sets plan.fx, the C01 executor hands the plan here, and the report goes through the
 * same layout planner, schema gate, sources and renderer as every adaptive answer.
 *
 *   evidence   buildCountryIntel (macro/intel.js): the best stored series per currency
 *              family, their histories, and the deterministic picture (macro/currency.js)
 *              including assessCurrencyPressure (macro/playbook.js, "Ezana's thresholds")
 *   plan       buildFxPressure(): a typed view model. Every figure is computed here from the
 *              stored observations and carries its period, its freshness and its source.
 *              Nothing is estimated, interpolated or written by a model.
 *   renderer   SonarFxSections.jsx draws the sections; the order follows the question's
 *              focus (a reserves question leads with the external buffers).
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
 *     score or probability is shown.
 *
 * Pure. The one read (deps.countryIntel) happens in runFxPressure.
 */
import { countryOf } from './country-ref';
import { countryByIso3 } from '@/lib/sonar/landing-country';
import { findCurrency, currencyOf, CURRENCY_OF } from '@/lib/sonar/macro/currencies';
import { periodLabel, periodEnd, fmtNum } from '@/lib/sonar/macro/catalog';
import { CURRENCY_LEVELS } from '@/lib/sonar/macro/playbook';
import { step, sourceBook, freshQuestions } from './kit';

export const FX_VIEW_MODEL = 'fx-pressure-v1';

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
  const from = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() - months, last.getUTCDate()));
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
const RESILIENCE = /\b(resilien\w*|adequa\w*|enough|strong|how (big|large|much)|cover|vulnerab\w*|safe|healthy)\b/i;
/* A same-day move asks why the price moved, not whether the currency is under pressure. */
const MOVEMENT =
  /\b(today|this morning|tonight|yesterday|intraday|this week|right now)\b|\bwhy (did|has|is)\b.{0,40}\b(fall|fell|drop|dropp|slid|plung|jump|surg|spik)\w*/i;
/* A comparison is a different answer (several currencies on one axis). */
const COMPARE = /\b(compare|comparison|versus|vs\.?|relative to|against (other|emerging|peers?|its peers)|peers)\b/i;

const FOCUS = [
  ['stabilize', /\b(stabili[sz]\w*|recover\w*|turn (it )?around|what (could|would|might) (help|support|save|fix))\b/i],
  ['reserves', RESERVES],
  ['crisis', /\b(crisis|collapse|crash|default|devaluation|break(down)?|disorderly)\b/i],
  ['inflation', /\b(inflation|policy rate|interest rates?|central bank|monetary policy|real rate)\b/i],
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
  while ((hit = m.exec(t))) if (CODE_TO_ISO3[hit[1]] && hit[1] !== 'USD') return CODE_TO_ISO3[hit[1]];
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
  const curIso3 =
    (cur && !cur.ambiguous && cur.iso3 !== 'USA' ? cur.iso3 : null) || code || null;
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
  return null;
}

/* ------------------------------------------------------------------ the view model */

const ORDER = {
  overall: ['fx_metrics', 'fx_trend', 'fx_insights', 'fx_drivers', 'fx_risk_scope', 'fx_policy', 'fx_buffers', 'fx_monitor', 'fx_outlook'],
  reserves: ['fx_metrics', 'fx_buffers', 'fx_policy', 'fx_risk_scope', 'fx_drivers', 'fx_insights', 'fx_trend', 'fx_monitor', 'fx_outlook'],
  inflation: ['fx_metrics', 'fx_policy', 'fx_buffers', 'fx_insights', 'fx_drivers', 'fx_risk_scope', 'fx_trend', 'fx_monitor', 'fx_outlook'],
  crisis: ['fx_metrics', 'fx_risk_scope', 'fx_drivers', 'fx_trend', 'fx_insights', 'fx_policy', 'fx_buffers', 'fx_monitor', 'fx_outlook'],
  stabilize: ['fx_metrics', 'fx_outlook', 'fx_monitor', 'fx_trend', 'fx_insights', 'fx_policy', 'fx_buffers', 'fx_drivers', 'fx_risk_scope'],
};
/* Sections drawn in the top zone, beside Research Controls. */
const TOP = {
  overall: ['fx_metrics', 'fx_trend'],
  reserves: ['fx_metrics'],
  inflation: ['fx_metrics'],
  crisis: ['fx_metrics', 'fx_trend'],
  stabilize: ['fx_metrics', 'fx_trend'],
};
const METRIC_ORDER = {
  reserves: ['reserves', 'fx', 'policy', 'inflation'],
  inflation: ['inflation', 'policy', 'fx', 'reserves'],
};

const HEADLINE = {
  overall: (p, c) => `Is ${possessive(p)} ${c} under pressure?`,
  crisis: (p, c) => `Is the ${c} heading for a crisis?`,
  reserves: (p) => `How resilient are ${possessive(p)} external buffers?`,
  inflation: (p, c) => `How are inflation and policy rates bearing on the ${c}?`,
  stabilize: (p, c) => `What could stabilize the ${c}?`,
};

const lvl = (l) => (l ? CURRENCY_LEVELS.indexOf(l) : -1);
const pct = (v, d = 1) => `${fmtNum(Math.abs(v)) == null ? '' : Math.abs(v).toFixed(d)}%`;
const signedPct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;
const pp = (v) => `${Math.abs(v).toFixed(1)} pp`;

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
  num(v) == null ? null : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2);

/**
 * The typed view model for one country's currency.
 * @param {object} intel  buildCountryIntel() output
 * @param {{ focus?: string, now?: Date, plan?: object }} o
 * @returns {null | { built, sources, thread, model }}  null when no exchange-rate history
 */
export function buildFxPressure(intel, { focus = 'overall', now = new Date(), plan = null } = {}) {
  if (!intel || intel.empty || !intel.picture) return null;
  const m = intel.picture.metrics || {};
  const fx = m.fx;
  if (!fx?.latest || !fx.y1) return null; // a year of FX history is the minimum
  if (!ORDER[focus]) focus = 'overall';
  const charts = intel.charts || {};
  const assessment = intel.picture.assessment || { components: [], overall: null, missing: [] };
  const comp = (id) => assessment.components.find((c) => c.id === id) || null;
  const currency = intel.currency || currencyOf(intel.iso3) || { code: '', name: 'currency', short: 'currency' };
  const code = currency.code || 'local currency';
  const shortName = currency.short || currency.name || 'currency';
  const place = DISPLAY_NAME[intel.iso3] || countryByIso3(intel.iso3)?.name || intel.place;

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
  const spread = pol && infl ? exPostRateMinusInflationPp(pol.level.value, infl.annual.value) : null;
  const resUnit = charts.reserves?.unit || '';
  const resNow = res ? reservesUsd(res.level.value, resUnit) : null;
  const depLevel = comp('depreciation')?.level || null;
  const overall = assessment.overall;
  const weaker = valueChg < 0;
  const persistent = weaker && m3ValueChg != null && m3ValueChg < 0;
  const pressureLevel = Math.max(lvl(depLevel), lvl(overall));
  const pressure = pressureLevel >= 1 ? 'established' : weaker ? 'limited' : 'not_established';

  /* ---- lead */
  let verdict;
  if (pressureLevel >= 2)
    verdict = `Yes. The ${shortName} is ${persistent ? 'depreciating persistently' : 'markedly weaker than a year ago'}, but the available data do not establish an imminent currency crisis.`;
  else if (pressureLevel === 1)
    verdict = `Moderately. The ${shortName} has lost ground against the dollar${persistent ? ' and is still weakening' : ''}, but the available data do not point to acute stress.`;
  else if (weaker)
    verdict = `Not materially. The ${shortName} is only slightly weaker against the dollar than a year ago, within Ezana’s low-pressure band.`;
  else
    verdict = `No. The ${shortName} has strengthened against the dollar over the year; the stored data show no exchange-rate pressure.`;

  const ctx = [];
  ctx.push(
    usdUp >= 0
      ? `The dollar costs ${pct(usdUp)} more ${shortName} than a year earlier`
      : `The dollar costs ${pct(usdUp)} less ${shortName} than a year earlier`,
  );
  if (infl)
    ctx.push(
      `annual inflation is ${pct(infl.annual.value)} (${periodLabel(infl.annual.period)})${infl.trend && infl.annualYearAgo ? `, ${infl.trend === 'falling' ? 'down' : infl.trend === 'rising' ? 'up' : 'unchanged'} from ${pct(infl.annualYearAgo.value)} a year earlier` : ''}`,
    );
  let ctxText = `${ctx.join(', while ')}.`;
  if (pol && spread != null)
    ctxText +=
      spread > 0
        ? ` A ${pct(pol.level.value)} policy rate sits ${pp(spread)} above latest inflation, which provides some monetary restraint`
        : ` The ${pct(pol.level.value)} policy rate sits ${pp(spread)} below latest inflation, so monetary policy offers little restraint`;
  else if (pol) ctxText += ` The policy rate is ${pct(pol.level.value)}`;
  ctxText += pol ? '; ' : ' ';
  ctxText += `${pol ? 'whether' : 'Whether'} external buffers can absorb new shocks depends on more than gross reserves alone.`;
  if (fxFresh === 'stale')
    ctxText += ` The latest stored exchange rate is from ${periodLabel(fx.latest.period)}, so later moves are not captured.`;

  const built = {};
  built.lead = {
    kicker: 'Foreign exchange / Country intelligence',
    headline: HEADLINE[focus](place, shortName),
    verdict,
    text: ctxText,
    asOf: `Observations through ${periodLabel(fx.latest.period)}`,
    computed: true,
    cites: [...fxCites, ...inflCites, ...polCites].slice(0, 3),
  };

  /* ---- metrics: exactly the four that frame the question, each with its own date */
  const tiles = {};
  tiles.fx = {
    id: 'fx',
    label: `${code} per USD`,
    value: rate(fx.latest.value),
    delta: `${usdUp >= 0 ? '↑' : '↓'} ${pct(usdUp)} vs. a year earlier`,
    tone: usdUp > 0 ? 'negative' : 'positive',
    period: `${periodLabel(fx.latest.period)} · higher = weaker ${code}`,
    freshness: fxFresh,
    cites: fxCites,
  };
  if (infl)
    tiles.inflation = {
      id: 'inflation',
      label: 'Annual inflation',
      value: pct(infl.annual.value),
      delta: infl.annualYearAgo
        ? `${infl.trend === 'falling' ? '↓' : infl.trend === 'rising' ? '↑' : '→'} from ${pct(infl.annualYearAgo.value)}`
        : null,
      tone: infl.trend === 'falling' ? 'positive' : infl.trend === 'rising' ? 'negative' : 'neutral',
      period: `${periodLabel(infl.annual.period)} · year over year${infl.computedFromIndex ? ', from the CPI index' : ''}`,
      freshness: freshnessOf(infl.annual.period, 'monthly', now),
      cites: inflCites,
    };
  if (pol)
    tiles.policy = {
      id: 'policy',
      label: 'Policy interest rate',
      value: pct(pol.level.value),
      delta:
        spread != null
          ? `${spread >= 0 ? '+' : '−'}${pp(spread)} ${spread >= 0 ? 'above' : 'below'} latest inflation*`
          : pol.change12mPp != null
            ? `${pol.change12mPp >= 0 ? '+' : '−'}${pp(pol.change12mPp)} in a year`
            : null,
      tone: 'neutral',
      period: periodLabel(pol.level.period),
      freshness: freshnessOf(pol.level.period, 'policy', now),
      footnote:
        spread != null
          ? `* ${pct(pol.level.value)} minus ${pct(infl.annual.value)} = ${spread >= 0 ? '' : '−'}${pp(spread)}, an ex-post spread; it is not the forward-looking real policy rate.`
          : null,
      cites: [...polCites, ...(spread != null ? inflCites : [])],
    };
  if (res)
    tiles.reserves = {
      id: 'reserves',
      label: 'Gross official reserves',
      value: money(resNow) || fmtNum(res.level.value, { money: true }),
      delta:
        res.change3mPct != null
          ? `${res.change3mPct >= 0 ? '↑' : '↓'} ${pct(res.change3mPct)} over 3 months`
          : null,
      tone: res.change3mPct > 0 ? 'positive' : res.change3mPct < 0 ? 'negative' : 'neutral',
      period: periodLabel(res.level.period),
      freshness: freshnessOf(res.level.period, 'monthly', now),
      cites: resCites,
    };
  const order = METRIC_ORDER[focus] || ['fx', 'inflation', 'policy', 'reserves'];
  built.fx_metrics = {
    items: order.map((k) => tiles[k]).filter(Boolean),
    footnote: tiles.policy?.footnote || null,
  };

  /* ---- the primary chart: the stored series itself, never joined or smoothed */
  const fxPoints = cleanPoints(fxChart?.points);
  const window = lastMonths(fxPoints, 12);
  if (window.length >= 2) {
    const first = window[0];
    const last = window[window.length - 1];
    built.fx_trend = {
      eyebrow: 'Primary chart / Currency trend',
      title: `${code} per U.S. dollar, ${fx.frequency === 'daily' ? 'daily observations' : 'monthly averages'}`,
      note: `A rising series means the ${shortName} is depreciating against the dollar.`,
      quote: `${code} per USD`,
      points: lastMonths(fxPoints, 60).map((p) => ({ x: p.x, y: p.y })),
      defaultRange: '1Y',
      ranges: fx.frequency === 'daily' ? ['1M', '3M', '6M', 'YTD', '1Y'] : ['6M', 'YTD', '1Y', '5Y'],
      frequency: fx.frequency,
      summary: `${rate(first.y)} (${periodLabel(first.x)}) to ${rate(last.y)} (${periodLabel(last.x)}): the dollar price in ${shortName} ${usdInLocalChangePct(first.y, last.y) >= 0 ? 'rose' : 'fell'} ${pct(usdInLocalChangePct(first.y, last.y))}; the ${shortName}’s dollar value changed ${signedPct(localValueInUsdChangePct(first.y, last.y))}.`,
      caption: `Source: ${fxChart.source}. Each point is a stored observation with its own date; gaps are not filled.`,
      cites: fxCites,
    };
  }

  /* ---- reading the pressure: three conclusions, each from computed figures */
  const insights = [];
  insights.push({
    title: persistent
      ? 'Depreciation is persistent, not just a one-day move'
      : weaker
        ? `The ${shortName} is weaker than a year ago`
        : `The ${shortName} has strengthened against the dollar`,
    text:
      `${code} per USD moved from ${rate(y1.from)} (${periodLabel(y1.fromPeriod)}) to ${rate(y1.to)} (${periodLabel(y1.toPeriod)}). ` +
      `That is a ${pct(usdUp)} ${usdUp >= 0 ? 'rise' : 'fall'} in the dollar price in ${shortName}, equivalent to a ${pct(valueChg)} ${valueChg < 0 ? 'fall' : 'rise'} in the ${shortName}’s dollar value.` +
      (m3ValueChg != null
        ? ` Over the last three months the ${shortName}’s dollar value changed ${signedPct(m3ValueChg)}.`
        : ''),
    emphasis: [`${pct(usdUp)} ${usdUp >= 0 ? 'rise' : 'fall'} in the dollar price`, `${pct(valueChg)} ${valueChg < 0 ? 'fall' : 'rise'} in the ${shortName}’s dollar value`],
    cites: fxCites,
  });
  if (infl) {
    const hi = infl.annual.value >= 10;
    insights.push({
      title:
        infl.trend === 'falling'
          ? hi
            ? 'Inflation has cooled, but remains a major pressure'
            : 'Inflation has cooled'
          : infl.trend === 'rising'
            ? 'Inflation is rising'
            : hi
              ? 'Inflation remains a major pressure'
              : 'Inflation is not the main pressure',
      text:
        `Annual inflation was ${pct(infl.annual.value)} in ${periodLabel(infl.annual.period)}` +
        (infl.annualYearAgo
          ? `, ${infl.trend === 'falling' ? 'down' : infl.trend === 'rising' ? 'up' : 'unchanged'} from ${pct(infl.annualYearAgo.value)} a year earlier`
          : '') +
        `.${hi ? ' That is still a high rate of domestic price growth, which weighs on the currency’s purchasing power.' : ''}`,
      cites: inflCites,
    });
  }
  if (res) {
    insights.push({
      title:
        res.change3mPct != null && res.change3mPct < 0
          ? 'Gross reserves are falling'
          : 'Buffers exist, but crisis risk cannot be concluded',
      text:
        `Gross official reserves were ${money(resNow)} in ${periodLabel(res.level.period)}` +
        (res.change3mPct != null
          ? `, ${res.change3mPct >= 0 ? 'up' : 'down'} ${pct(res.change3mPct)} over three months`
          : '') +
        '. Net usable reserves, funding rollover and CDS spreads are not in Sonar’s data, so a crisis assessment cannot rest on them.',
      cites: resCites,
    });
  } else if (pol && spread != null) {
    insights.push({
      title: spread > 0 ? 'Policy is restrictive on an ex-post basis' : 'Policy offers little restraint',
      text: `The ${pct(pol.level.value)} policy rate is ${pp(spread)} ${spread >= 0 ? 'above' : 'below'} latest annual inflation, an ex-post arithmetic difference, not the expected real rate. Reserve data are not available, so external buffers are not assessed.`,
      cites: [...polCites, ...inflCites],
    });
  }
  built.fx_insights = { title: 'Reading the pressure', items: insights.slice(0, 3) };

  /* ---- what drives it: each row says whether it is observed, derived or conceptual */
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
  const ca = m.external?.currentAccount;
  drivers.push(
    ca && num(ca.value) != null
      ? {
          driver: 'External financing',
          basis: 'observed',
          text: `The current account was ${fmtNum(ca.value)}${ca.unit && String(ca.unit).startsWith('%') ? ca.unit : ' % of GDP'} in ${periodLabel(ca.period)}${ca.estimate ? ` (${ca.estimate})` : ''}. ${ca.value < 0 ? 'A deficit has to be financed from abroad, which can amplify FX pressure when funding tightens.' : 'A surplus reduces reliance on foreign funding.'} Current net financing stress is not directly measured here.`,
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
    eyebrow: 'Why the currency is under pressure',
    title: 'How the macro forces connect',
    note: 'Observed: a stored series. Derived: arithmetic on stored series. Conceptual: a channel, not measured here.',
    rows: drivers,
  };

  /* ---- is a crisis imminent: scope, never a score */
  const missing = [
    'Net usable reserves',
    'Short-term external debt',
    'Forward FX obligations',
    'Bank FX funding',
    'Sovereign CDS spreads',
    'Capital flows',
    'Inflation expectations',
  ];
  const alsoMissing = (assessment.missing || []).filter(
    (x) => !/cds|inflation expectations/i.test(x),
  );
  built.fx_risk_scope = {
    eyebrow: 'What would signal a crisis?',
    pressure,
    crisis: 'not_established',
    text:
      pressure === 'established'
        ? 'Currency weakness is observable in the stored exchange rate. Determining whether a disorderly break is near requires more direct external-liquidity and market-stress measures.'
        : 'The stored exchange rate does not show sustained weakness by Ezana’s thresholds. A crisis judgment would still need external-liquidity and market-stress measures.',
    missing,
    alsoMissing,
    thresholdsNote: overall
      ? `Pressure level by Ezana’s thresholds: ${overall}. A level, not a probability.`
      : null,
  };

  /* ---- policy and external buffers: two complementary pictures */
  const inflPts = cleanPoints(charts.inflation?.points);
  const polPts = cleanPoints(charts.policy?.points);
  if (inflPts.length >= 2 && polPts.length >= 2) {
    const months = lastMonths(inflPts, 24);
    const aligned = months.map((p) => ({ x: p.x, inflation: p.y, policy: valueAt(polPts, p.x)?.y ?? null }));
    if (aligned.filter((r) => r.policy != null).length >= 2) {
      const falling = infl?.trend === 'falling';
      built.fx_policy = {
        eyebrow: 'Inflation / Policy rate',
        title:
          spread != null && spread > 0 && falling
            ? 'Disinflation against still-high interest rates'
            : spread != null && spread < 0
              ? 'Policy rate below inflation'
              : 'Inflation and the policy rate',
        categories: aligned.map((r) => r.x),
        series: [
          { name: 'Annual inflation', values: aligned.map((r) => r.inflation), tone: 'primary' },
          { name: 'Policy rate', values: aligned.map((r) => r.policy), tone: 'reference' },
        ],
        unit: '%',
        caption:
          'Inflation: monthly, year over year. Policy rate: the setting in force at each month end. The gap between them is an ex-post spread, not the expected real rate.',
        cites: [...inflCites, ...polCites],
      };
    }
  }
  const reerPts = charts.reer ? lastMonths(cleanPoints(charts.reer.points), 24) : [];
  const resPts = lastMonths(cleanPoints(charts.reserves?.points), 24);
  if (reerPts.length >= 2 || resPts.length >= 2) {
    built.fx_buffers = {
      eyebrow: reerPts.length >= 2 ? 'REER / External reserves' : 'External reserves',
      title:
        reer?.change1yPct > 0 && weaker
          ? 'Nominal depreciation, real strength and reserves'
          : reerPts.length >= 2
            ? 'Real exchange rate and reserves'
            : 'Gross official reserves',
      panels: [
        reerPts.length >= 2
          ? {
              id: 'reer',
              label: 'BIS real effective exchange rate (index, higher = stronger in real terms)',
              points: reerPts,
              latest: `${fmtNum(reer.latest.value)} (${periodLabel(reer.latest.period)})`,
              change: reer.change1yPct != null ? `${signedPct(reer.change1yPct)} over a year` : null,
              cites: reerCites,
            }
          : null,
        resPts.length >= 2
          ? {
              id: 'reserves',
              label: `Gross official reserves (${resUnit || 'US$'})`,
              points: resPts,
              latest: `${money(resNow)} (${periodLabel(res.level.period)})`,
              change: res?.change3mPct != null ? `${signedPct(res.change3mPct)} over 3 months` : null,
              freshness: res ? freshnessOf(res.level.period, 'monthly', now) : null,
              cites: resCites,
            }
          : null,
      ].filter(Boolean),
      caption:
        'Real effective rates are price-adjusted baskets and do not measure the probability of an FX crisis. Gross reserves are not the same as usable liquidity.',
    };
  }

  /* ---- monitoring checklist: what to watch, and whether Sonar holds it */
  const resFresh = res ? freshnessOf(res.level.period, 'monthly', now) : null;
  built.fx_monitor = {
    eyebrow: 'Monitoring checklist',
    items: [
      {
        signal: fx.frequency === 'daily' ? 'Daily FX and volatility' : 'Exchange rate and volatility',
        why: `${code} per USD moves and rapid changes in realized volatility.`,
        availability: fx.frequency === 'daily' && fxFresh !== 'stale' ? 'in_data' : 'partial',
        reading:
          fx.volatility3m != null && fx.volatility5yMedian != null
            ? `3-month volatility ${fx.volatility3m < fx.volatility5yMedian ? 'below' : 'above'} its 5-year median`
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
        reading: res ? `Gross only, ${periodLabel(res.level.period)}${resFresh === 'fresh' ? '' : `, ${resFresh}`}` : null,
      },
      {
        signal: 'Funding market stress',
        why: 'CDS spreads, external refinancing and capital flows could change the risk assessment.',
        availability: 'gap',
      },
    ],
  };

  /* ---- conditional outlook: conditions, not forecasts; no probabilities */
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
      'Every figure is a stored official observation with its own date; daily, monthly and quarterly series are labelled and never mixed into one line.',
      'Pressure levels use Ezana’s published thresholds. They are a diagnosis, not a probability or a forecast.',
      fx.frequency === 'monthly'
        ? 'The exchange rate is a monthly average, so moves within the latest month are not captured.'
        : null,
    ].filter(Boolean),
  };

  const rel = {
    stabilize: `What could stabilize the ${shortName}?`,
    reserves: `How resilient are ${possessive(place)} reserves?`,
    compare: `Compare ${code} against emerging-market currencies`,
    inflation: `How are inflation and rates bearing on the ${shortName}?`,
  };
  const related = [rel.stabilize, rel.reserves, rel.compare, rel.inflation].filter(
    (q) => q !== rel[focus],
  );
  built.followups = {
    placeholder: `Ask a follow-up about the ${shortName}…`,
    related: plan ? freshQuestions(plan, related) : related.slice(0, 3),
  };

  const sectionOrder = ORDER[focus].filter((t) => built[t]);
  const top = new Set(TOP[focus]);
  for (const t of sectionOrder) if (top.has(t)) built[t].top = true;
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

/* ------------------------------------------------------------------ executor */

/** The C01 strategy for a currency-pressure plan. null lets the caller answer the old way. */
export async function runFxPressure(plan, deps, now, telemetry) {
  const iso3 = plan.fx?.iso3;
  if (!iso3 || !deps.countryIntel) return null;
  const intel = await step(telemetry, 'macro_series', 10000, () =>
    deps.countryIntel(iso3, { now }),
  ).catch(() => null);
  const out = buildFxPressure(intel, { focus: plan.fx.focus, now, plan });
  if (!out) return null;
  return { built: out.built, sources: out.sources, thread: out.thread, audit: out.model };
}
