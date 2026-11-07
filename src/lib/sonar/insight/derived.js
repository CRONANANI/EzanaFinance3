/**
 * Deterministic analytical findings (Nov 2026): insights computed from data Sonar already
 * holds, with no model call, so a quick ping gets them at no latency cost and every depth
 * gets the same arithmetic.
 *
 * A finding here combines an observation with a comparison, an interpretation, why it
 * matters and its limits. Every figure it states is also returned as a metric with its
 * method and inputs, so the claim validator can check it and the reader can reproduce it.
 * Where the data cannot support an insight (a trend from one observation, a world share
 * from a top-ten list), it says so instead of producing one.
 *
 *   currencyInsights(picture)    currency stress: nominal versus real, policy versus
 *                                inflation, pace and persistence, inflation and the
 *                                currency together, what is missing
 *   rankingInsights(vis, intent) concentration (only as wide as the data), mixed periods,
 *                                why a trend cannot be shown
 *   trendInsight(vis)            whether a series' change is speeding up or slowing
 *
 * Copy rules: sentence case, no em dashes, findings only (no advice).
 */
import { periodLabel, fmtNum } from '@/lib/sonar/macro/catalog';
import { ordinal } from '@/lib/sonar/macro/currency';

const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const f = (v) => fmtNum(v);
const abs = (v) => Math.abs(v);

function figure(id, label, value, { unit = 'percent', method, period = null, inputs = [] }) {
  return {
    id,
    label,
    value: +Number(value).toFixed(4),
    unit,
    method,
    period: period ? { label: period } : null,
    inputs,
  };
}

/* ------------------------------------------------------------------ currency stress */

/**
 * Up to five findings from a currency picture (macro/currency.js buildCurrencyPicture).
 * `place` and `currency` ({ code, short, name }) are for the wording.
 * -> [{ id, insight, title, explanation, comparison, implication, caveat, classification,
 *       figures, gap }]
 */
export function currencyInsights(picture, { place = '', currency = null, reerBasis } = {}) {
  const m = picture?.metrics || {};
  const fx = m.fx;
  const reer = m.reer;
  const infl = m.inflation;
  const pol = m.policy;
  const cur = currency?.short || currency?.name || 'currency';
  const out = [];

  /* A. Nominal depreciation versus the real exchange rate. */
  /* Only a real effective rate whose direction and base are verified (BIS real, broad
     basket) is compared with the nominal move, as on the quick board (macro/fx-findings.js).
     When the caller does not say, the comparison is made. */
  const reerOk = reerBasis === undefined || reerBasis === 'bis_real_broad';
  if (fx?.y1 && n(fx.y1.valueLostPct) != null && reer && reerOk && n(reer.percentile) != null) {
    const lost = fx.y1.valueLostPct;
    const p = reer.percentile;
    const title =
      lost > 0 && p >= 60
        ? `Nominal weakness and real-terms strength coexist`
        : lost > 0 && p <= 40
          ? `The ${cur} is weak in nominal and in real terms`
          : `Nominal weakness with a mid-range real exchange rate`;
    out.push({
      id: 'insight_fx_real',
      insight: 'nominal_vs_real',
      title,
      explanation: `The ${cur} lost ${f(lost)}% of its dollar value over the year to ${periodLabel(fx.y1.toPeriod)}, while the real effective exchange rate sits at the ${ordinal(p)} percentile of its own history since ${periodLabel(reer.since)}${n(reer.change1yPct) != null ? `, ${reer.change1yPct >= 0 ? 'up' : 'down'} ${f(abs(reer.change1yPct))}% on a year earlier` : ''}.`,
      comparison: `Nominal: ${f(lost)}% lost against the dollar. Real effective: ${ordinal(p)} percentile.`,
      implication:
        p >= 60
          ? 'When prices at home rise faster than abroad, a currency can fall against the dollar and still gain in real terms, which erodes the price competitiveness of exports.'
          : 'A real exchange rate low in its own range means the nominal fall has not been offset by faster inflation at home.',
      caveat:
        'The percentile compares the currency with its own past. It does not by itself establish overvaluation or undervaluation.',
      classification: 'analytical_interpretation',
      figures: [
        figure('insight_fx_real_lost', `${cur} value lost against the dollar over a year`, lost, {
          method: '(1 - rate a year earlier / latest rate) x 100',
          period: `${periodLabel(fx.y1.fromPeriod)} to ${periodLabel(fx.y1.toPeriod)}`,
        }),
        figure(
          'insight_fx_real_pct',
          'Real effective exchange rate, percentile of own history',
          p,
          {
            unit: 'percentile',
            method: `share of observations since ${periodLabel(reer.since)} at or below the latest value`,
            period: periodLabel(reer.latest?.period),
          },
        ),
        ...(n(reer.change1yPct) != null
          ? [
              figure(
                'insight_fx_real_chg',
                'Real effective exchange rate, change on a year earlier',
                abs(reer.change1yPct),
                {
                  method: '(latest index / index a year earlier - 1) x 100, absolute value',
                  period: periodLabel(reer.latest?.period),
                },
              ),
            ]
          : []),
      ],
    });
  }

  /* B. Monetary policy versus inflation: the simple ex-post spread, labelled as such. */
  if (pol?.level && infl?.annual && n(pol.expostRealRatePp) != null) {
    const s = pol.expostRealRatePp;
    const trend = infl.annualYearAgo
      ? `, while inflation is ${infl.trend} from ${f(infl.annualYearAgo.value)}% a year earlier`
      : '';
    const moved =
      n(pol.change12mPp) != null && pol.change12mPp !== 0
        ? ` The policy rate is ${pol.change12mPp < 0 ? 'down' : 'up'} ${f(abs(pol.change12mPp))} percentage points on a year earlier${trend}.`
        : trend
          ? ` The policy rate is unchanged on a year earlier${trend}.`
          : '';
    out.push({
      id: 'insight_policy_spread',
      insight: 'policy_vs_inflation',
      title:
        s > 0 ? 'The policy rate sits above inflation' : 'The policy rate sits below inflation',
      explanation: `A policy rate of ${f(pol.level.value)}% (${periodLabel(pol.level.period)}) against annual inflation of ${f(infl.annual.value)}% (${periodLabel(infl.annual.period)}) gives an ex-post spread of ${s > 0 ? '+' : ''}${f(s)} percentage points.${moved}`,
      comparison: `Policy rate minus annual inflation: ${s > 0 ? '+' : ''}${f(s)} percentage points.`,
      implication:
        s > 0
          ? pol.change12mPp < 0
            ? 'On this simple measure the stance is still restrictive, though easing: the central bank has cut while keeping rates above current inflation.'
            : 'On this simple measure the stance is restrictive: rates are above current inflation.'
          : 'On this simple measure policy has not offset inflation, which leaves holding the currency less rewarding.',
      caveat:
        'This is ex-post (policy rate minus the latest annual inflation), not the forward-looking real rate, which needs inflation expectations. It says nothing about lending conditions.',
      classification: 'calculated_result',
      figures: [
        figure('insight_policy_rate', 'Policy rate', pol.level.value, {
          method: 'latest observed value',
          period: periodLabel(pol.level.period),
        }),
        figure('insight_policy_infl', 'Annual inflation', infl.annual.value, {
          method: 'latest annual rate',
          period: periodLabel(infl.annual.period),
        }),
        figure(
          'insight_policy_spread_pp',
          'Ex-post spread, policy rate minus annual inflation',
          s,
          {
            unit: 'percentage points',
            method: 'policy rate minus latest annual inflation',
          },
        ),
        ...(n(pol.change12mPp) != null && pol.change12mPp !== 0
          ? [
              figure(
                'insight_policy_chg',
                'Policy rate change on a year earlier',
                abs(pol.change12mPp),
                {
                  unit: 'percentage points',
                  method: 'latest minus a year earlier, absolute value',
                },
              ),
            ]
          : []),
        ...(infl.annualYearAgo
          ? [
              figure(
                'insight_policy_infl_ya',
                'Annual inflation a year earlier',
                infl.annualYearAgo.value,
                {
                  method: 'annual rate a year earlier',
                  period: periodLabel(infl.annualYearAgo.period),
                },
              ),
            ]
          : []),
      ],
    });
  }

  /* C. The pace and persistence of depreciation. */
  if (fx?.y1 && fx?.m3 && n(fx.annualised3mValueLostPct) != null && n(fx.y1.valueLostPct) != null) {
    const ann = fx.annualised3mValueLostPct;
    const yr = fx.y1.valueLostPct;
    const pace =
      yr > 0 && ann > yr * 1.25 ? 'faster' : yr > 0 && ann < yr * 0.75 ? 'slower' : 'steady';
    const vol = n(fx.volatility3m) != null && n(fx.volatility5yMedian) != null;
    const calm = vol && fx.volatility3m < fx.volatility5yMedian;
    out.push({
      id: 'insight_fx_pace',
      insight: 'depreciation_pace',
      title:
        pace === 'faster'
          ? 'Depreciation is speeding up'
          : pace === 'slower'
            ? 'Depreciation has slowed'
            : 'Depreciation is persistent rather than accelerating',
      explanation: `The ${cur} lost ${f(fx.m3.valueLostPct)}% over three months, an annualised pace of ${f(ann)}%, against ${f(yr)}% over the full year${fx.y5 ? ` and ${f(fx.y5.valueLostPct)}% over five years` : ''}.${vol ? ` Volatility over three months is ${f(fx.volatility3m)} against a five-year median of ${f(fx.volatility5yMedian)} (${calm ? 'calmer' : 'more volatile'} than usual).` : ''}`,
      comparison: `Annualised three-month pace ${f(ann)}% against ${f(yr)}% over the year.`,
      implication:
        pace === 'faster' || (vol && !calm)
          ? 'A quicker, more volatile slide is the pattern that comes before acute stress, though on its own it does not establish a crisis.'
          : 'An orderly, sustained slide is a different signal from a disorderly sell-off. On these measures the pressure is persistent, not accelerating.',
      caveat:
        'Annualising three months assumes the recent pace continues. A weak currency is not on its own evidence of an imminent crisis.',
      classification: 'calculated_result',
      figures: [
        figure('insight_fx_pace_3m', 'Value lost over three months', fx.m3.valueLostPct, {
          method: '(1 - rate three months earlier / latest rate) x 100',
        }),
        figure('insight_fx_pace_ann', 'Three-month loss, annualised', ann, {
          method: '(1 - (1 - three-month loss)^4) x 100',
        }),
        figure('insight_fx_pace_1y', 'Value lost over a year', yr, {
          method: '(1 - rate a year earlier / latest rate) x 100',
        }),
        ...(fx.y5
          ? [
              figure('insight_fx_pace_5y', 'Value lost over five years', fx.y5.valueLostPct, {
                method: '(1 - rate five years earlier / latest rate) x 100',
              }),
            ]
          : []),
        ...(vol
          ? [
              figure('insight_fx_vol_3m', 'Volatility, last three months', fx.volatility3m, {
                unit: 'standard deviation',
                method: `standard deviation of ${fx.frequency} percentage changes`,
              }),
              figure('insight_fx_vol_med', 'Volatility, five-year median', fx.volatility5yMedian, {
                unit: 'standard deviation',
                method: 'median of rolling three-month standard deviations',
              }),
            ]
          : []),
      ],
    });
  }

  /* D. Inflation and the currency together (pass-through is a mechanism, not a result). */
  if (infl?.annual && infl?.annualYearAgo && fx?.y1 && n(fx.y1.dollarDearerPct) != null) {
    const falling = infl.trend === 'falling';
    const rising = infl.trend === 'rising';
    out.push({
      id: 'insight_infl_fx',
      insight: 'inflation_fx',
      title: falling
        ? `Inflation is easing even as the ${cur} weakens`
        : rising
          ? `Inflation and currency weakness are rising together`
          : `Inflation stays high alongside a weaker ${cur}`,
      explanation: `Annual inflation is ${f(infl.annual.value)}% (${periodLabel(infl.annual.period)}), ${infl.trend} from ${f(infl.annualYearAgo.value)}% a year earlier, while the dollar costs ${f(fx.y1.dollarDearerPct)}% more than a year ago.${infl.peak5y ? ` The five-year peak was ${f(infl.peak5y.value)}% in ${periodLabel(infl.peak5y.period)}.` : ''}`,
      comparison: `Inflation ${f(infl.annual.value)}% now against ${f(infl.annualYearAgo.value)}% a year earlier; dollar ${f(fx.y1.dollarDearerPct)}% dearer.`,
      implication: falling
        ? 'A weaker currency raises import prices, one channel that keeps inflation persistent. So far inflation has eased despite it, but it remains well above where the currency would stop losing value.'
        : 'A weaker currency raises import prices, one channel that keeps inflation persistent. The data here is consistent with that channel but does not test it.',
      caveat:
        'Exchange-rate pass-through is a mechanism, not a result measured here. Timing alone does not show cause.',
      classification: 'analytical_interpretation',
      figures: [
        figure('insight_infl_now', 'Annual inflation', infl.annual.value, {
          method: 'latest annual rate',
          period: periodLabel(infl.annual.period),
        }),
        figure('insight_infl_ya', 'Annual inflation a year earlier', infl.annualYearAgo.value, {
          method: 'annual rate a year earlier',
          period: periodLabel(infl.annualYearAgo.period),
        }),
        figure(
          'insight_infl_fx_1y',
          'Dollar dearer in local currency over a year',
          fx.y1.dollarDearerPct,
          { method: '(latest rate / rate a year earlier - 1) x 100' },
        ),
        ...(infl.peak5y
          ? [
              figure('insight_infl_peak', 'Five-year inflation peak', infl.peak5y.value, {
                method: 'highest annual rate in five years',
                period: periodLabel(infl.peak5y.period),
              }),
            ]
          : []),
      ],
    });
  }

  /* E. External vulnerability and the evidence that is missing. */
  const missing = (picture?.missing || []).filter(Boolean);
  if (missing.length) {
    /* The gaps that bear on defending the currency and financing it come first. */
    const weight = (x) =>
      /reserve|cds|spread|expectation|debt|current.account|capital|financ/i.test(x) ? 0 : 1;
    const named = [...missing].sort((a, b) => weight(a) - weight(b)).slice(0, 3);
    out.push({
      id: 'insight_gaps',
      insight: 'missing_evidence',
      title: 'What the data cannot yet settle',
      explanation: `Not in Ezana's data for ${place || 'this country'}: ${missing.join(', ')}.`,
      comparison: null,
      implication: `Without ${named.length > 1 ? `${named.slice(0, -1).join(', ')} and ${named.at(-1)}` : named[0]}, the assessment can describe the pressure but cannot judge how well the ${cur} can be defended or how far external financing risk extends.`,
      caveat: null,
      classification: 'unknown',
      figures: [],
      gap: true,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ rankings */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const when = (p) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(p || ''));
  return m ? `${MON[Number(m[2]) - 1]} ${m[1]}` : String(p || '');
};
const fmt1 = (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 1 });

/**
 * Findings and limitations from a ranking visualization ({ id, title, unit, rows:[{label,
 * value, note}] }). Concentration is computed only as widely as the rows go: across every
 * country reported when the list is long, among the listed largest when it is short, and
 * never as a world share from a short list.
 * -> { findings, limitations }
 */
export function rankingInsights(vis, intent = null) {
  const rows = (vis?.rows || [])
    .map((r) => ({ label: r.label, value: Number(r.value), note: r.note || null }))
    .filter((r) => r.label && Number.isFinite(r.value) && r.value >= 0);
  const findings = [];
  const limitations = [];
  if (rows.length < 2) return { findings, limitations };
  const measure = String(vis.title || 'this measure')
    .replace(/^(highest|largest|most|lowest)\s+/i, '')
    .toLowerCase();
  const notes = [...new Set(rows.map((r) => r.note).filter(Boolean))].sort();
  const mixed = notes.length > 1;
  if (mixed)
    limitations.push(
      `Each country's latest observation is used, and these come from different periods (${when(notes[0])} to ${when(notes.at(-1))}), so the ranking mixes periods.`,
    );

  const lowest = /^lowest\s/i.test(vis.title || '');
  if (!lowest && rows.length >= 6) {
    const total = rows.reduce((s, r) => s + r.value, 0);
    const top5 = rows.slice(0, 5).reduce((s, r) => s + r.value, 0);
    if (total > 0) {
      const share = (top5 / total) * 100;
      const wide = rows.length >= 15;
      const hhi = rows.reduce((s, r) => s + (r.value / total) ** 2, 0);
      const eff = hhi > 0 ? 1 / hhi : null;
      findings.push({
        id: 'insight_concentration',
        insight: 'concentration',
        title: wide
          ? share >= 50
            ? `${measure[0].toUpperCase()}${measure.slice(1)} is concentrated in a few countries`
            : `${measure[0].toUpperCase()}${measure.slice(1)} is spread across many countries`
          : `The largest five dominate the ${rows.length} listed`,
        explanation: wide
          ? `The top five account for ${fmt1(share)}% of the total across the ${rows.length} countries reported${eff ? `, equivalent to about ${fmt1(eff)} equal-sized producers` : ''}.`
          : `Among the ${rows.length} largest listed, the top five account for ${fmt1(share)}% of their combined total.`,
        comparison: `Top five share: ${fmt1(share)}%.`,
        implication: wide
          ? 'When output is this concentrated, a change in a few countries can move the global total, so their policies and disruptions matter more than the long tail.'
          : 'Within the largest producers, output still clusters at the top, so changes among the leaders matter most for the group.',
        caveat: wide
          ? mixed
            ? "Shares use each country's latest observation, from different periods."
            : null
          : `This is a share of the ${rows.length} listed, not of world output; a world total is not in this answer.`,
        classification: 'calculated_result',
        figures: [
          figure(
            'insight_conc_top5',
            `Top five share of the ${wide ? 'countries reported' : `${rows.length} listed`}`,
            share,
            {
              method: `sum of the five largest values / sum of all ${rows.length} values listed x 100`,
            },
          ),
          figure('insight_conc_n', 'Countries listed', rows.length, {
            unit: 'count',
            method: 'rows in the ranking',
          }),
          ...(wide && eff
            ? [
                figure('insight_conc_eff', 'Effective number of producers', eff, {
                  unit: 'count',
                  method: '1 / sum of squared shares (inverse Herfindahl index)',
                }),
              ]
            : []),
        ],
        entities: rows.slice(0, 5).map((r) => r.label),
      });
      if (!wide)
        limitations.push(
          'Only the largest producers are listed, so shares of world output cannot be computed.',
        );
    }
  }

  const wantsHistory = intent?.needsHistory || intent?.objectives?.includes('trend');
  const hasHistory = (vis?.rows || []).some(
    (r) => Array.isArray(r.history) && r.history.length > 1,
  );
  if (wantsHistory && !hasHistory) {
    findings.push({
      id: 'insight_no_history',
      insight: 'missing_history',
      title: 'How the ranking has changed cannot be established here',
      explanation: `The ranking uses each country's latest observation of ${measure} only. History by country is not in this answer, so changes in rank or share over time are not shown.`,
      comparison: null,
      implication:
        'A trend or concentration change needs at least two comparable observations per country.',
      caveat: null,
      classification: 'unknown',
      figures: [],
      gap: true,
    });
  }
  return { findings, limitations };
}

/* ------------------------------------------------------------------ trends */

/**
 * Whether a line series' change is speeding up or slowing: the change over the latest
 * window against the change over the window before it. Rates (%, percentage points) are
 * compared in percentage points, levels in percent. Null when the series is too short.
 */
export function trendInsight(vis) {
  const s = (vis?.series || []).filter((p) => p && Number.isFinite(Number(p.y)));
  if (s.length < 8) return null;
  const monthly = /^\d{4}-\d{2}/.test(String(s.at(-1).x));
  const w = monthly && s.length >= 25 ? 12 : Math.floor((s.length - 1) / 2);
  if (w < 3) return null;
  const a = Number(s.at(-1 - 2 * w).y);
  const b = Number(s.at(-1 - w).y);
  const c = Number(s.at(-1).y);
  const rate = /%|percent|pp|rate/i.test(`${vis.unit || ''} ${vis.title || ''}`);
  const d1 = rate ? b - a : a ? ((b - a) / Math.abs(a)) * 100 : null;
  const d2 = rate ? c - b : b ? ((c - b) / Math.abs(b)) * 100 : null;
  if (d1 == null || d2 == null) return null;
  const unit = rate ? 'percentage points' : '%';
  const say = (v) =>
    `${v >= 0 ? 'up' : 'down'} ${fmt1(Math.abs(v))}${rate ? ' percentage points' : '%'}`;
  const speeding = Math.abs(d2) > Math.abs(d1) * 1.2 && Math.sign(d2) === Math.sign(d1 || d2);
  const reversing = Math.sign(d1) !== Math.sign(d2) && Math.abs(d1) > 0 && Math.abs(d2) > 0;
  const name = String(vis.title || 'The series');
  return {
    id: `insight_trend_${String(vis.id || 'series').replace(/[^a-z0-9_]/gi, '_')}`,
    insight: 'trend_pace',
    title: reversing
      ? `${name} has reversed direction`
      : speeding
        ? `${name} is moving faster than before`
        : `${name} is moving more slowly than before`,
    explanation: `Over the latest ${w} ${monthly ? 'months' : 'periods'} to ${when(s.at(-1).x)} it is ${say(d2)}, against ${say(d1)} over the ${w} before.`,
    comparison: `Latest window ${say(d2)}; prior window ${say(d1)}.`,
    implication: reversing
      ? 'A change of direction matters more than the level: the earlier trend is not continuing.'
      : speeding
        ? 'The move is gathering pace rather than settling.'
        : 'The move continues but is losing momentum.',
    caveat: 'Two windows describe momentum; they do not explain it.',
    classification: 'calculated_result',
    figures: [
      figure(`insight_trend_${vis.id}_window`, 'Window length', w, {
        unit: 'count',
        method: 'periods in each window',
      }),
      figure(
        `insight_trend_${vis.id}_recent`,
        `${name}: change over the latest window`,
        Math.abs(d2),
        {
          unit: rate ? 'percentage points' : 'percent',
          method: `latest value minus the value ${w} periods earlier${rate ? '' : ', as a percent of the earlier value'}, absolute`,
        },
      ),
      figure(
        `insight_trend_${vis.id}_prior`,
        `${name}: change over the prior window`,
        Math.abs(d1),
        {
          unit: rate ? 'percentage points' : 'percent',
          method: `the same over the ${w} periods before, absolute`,
        },
      ),
    ],
    unit,
  };
}

/**
 * The figures of a list of derived findings as engine metrics (M:id), each citing the
 * evidence ids it was computed from.
 */
export function insightMetrics(findings, inputs = []) {
  const out = [];
  for (const x of findings || [])
    for (const g of x.figures || [])
      out.push({
        id: g.id,
        label: g.label,
        value: g.value,
        unit: g.unit,
        method: g.method,
        period: g.period,
        inputs: g.inputs?.length ? g.inputs : inputs,
        derived: true,
      });
  return out;
}
