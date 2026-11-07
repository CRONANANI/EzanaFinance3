/**
 * FX key findings (Nov 2026): the analytic findings of a country currency answer ("is this
 * currency under pressure?"), written from Ezana's computed measures only. Pure: no
 * I/O, no model call, so it adds nothing to the ping's latency, and every figure in the text
 * is one the measures already hold. Works for any currency (nothing is hardcoded to one
 * country): a finding whose inputs are missing is left out, never filled in.
 *
 *   1. Depreciation: persistence and pace (1M, 3M, 12M, 5Y; annualised 3M pace; volatility)
 *   2. The policy rate against inflation (ex-post spread, backward-looking; policy trend)
 *   3. Nominal depreciation against the real effective exchange rate (BIS real, broad basket
 *      only: a series whose direction and base are verified)
 *   4. What the data can and cannot establish about crisis risk
 *
 * Each finding: { id, title, headline, evidence: [string], interpretation, why,
 * qualification, status, chart }. `chart` names the chart that shows it ('fx', 'policy',
 * 'reer', 'reserves') or null. Findings only, never advice. Tested in
 * scripts/check-sonar-board-polish.mjs.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const num = (v) => typeof v === 'number' && Number.isFinite(v);

/** '2026-11-06' -> 'Nov 2026'; '2026-09' -> 'Sep 2026'. */
export function monthLabel(p) {
  const m = /^(\d{4})-(\d{2})/.exec(String(p || ''));
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(p || '');
}

/** One decimal, a real minus sign, no trailing ".0" on large values. */
export function pct1(v) {
  if (!num(v)) return 'n/a';
  const s = Math.abs(v).toFixed(1);
  return v < 0 ? `−${s}` : s;
}

/** An exchange rate as written: 4 significant decimals under 10, 2 above. */
export function rate(v) {
  if (!num(v)) return 'n/a';
  return v >= 100 ? v.toFixed(1) : v >= 10 ? v.toFixed(2) : v.toFixed(4);
}

/* "a 15.1%" but "an 18.1%", "an 8.2%", "an 11.0%". */
const article = (txt) =>
  /^(8|11|18|8\d)(\.|$|\d)/.test(String(txt)) && !/^(8\d\d)/.test(String(txt)) ? 'an' : 'a';

/* The calendar months between two periods ('2026-07' to '2026-09' -> 2), or null. */
function monthsBetween(a, b) {
  const x = /^(\d{4})-(\d{2})/.exec(String(a || ''));
  const y = /^(\d{4})-(\d{2})/.exec(String(b || ''));
  if (!x || !y) return null;
  return (Number(y[1]) - Number(x[1])) * 12 + (Number(y[2]) - Number(x[2]));
}

/* A window named by the span it really covers (a gap in the series can make "1 month" two). */
function spanLabel(w, nominal) {
  const n = monthsBetween(w.fromPeriod, w.toPeriod);
  if (!n || n <= 0) return nominal;
  if (n % 12 === 0 && n >= 24) return `${n / 12} years`;
  return n === 1 ? '1 month' : `${n} months`;
}

const signed = (v) =>
  num(v) ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}` : 'n/a';

/**
 * The measures the findings need, without the long series, for the intel payload the band
 * holds (landing-pipeline intelView). `reerBasis` says whether the REER row is BIS real
 * broad ('bis_real_broad') or something whose base we have not verified ('other').
 */
export function compactMetrics(m, { reerBasis = null } = {}) {
  if (!m) return null;
  const { series, ...infl } = m.inflation || {};
  return {
    fx: m.fx || null,
    reer: m.reer ? { ...m.reer, basis: reerBasis } : null,
    inflation: m.inflation ? infl : null,
    policy: m.policy || null,
    reserves: m.reserves || null,
    external: m.external || {},
  };
}

const WINDOWS = [
  ['m1', '1 month'],
  ['m3', '3 months'],
  ['y1', '12 months'],
  ['y5', '5 years'],
];

function fxPace(fx, { code, name }) {
  const held = WINDOWS.filter(([k]) => fx?.[k] && num(fx[k].valueLostPct));
  if (!held.length || !(fx.y1 || fx.m3)) return null;
  const lost = held.filter(([k]) => fx[k].valueLostPct > 0);
  const gained = held.filter(([k]) => fx[k].valueLostPct < 0);
  const cur = name || code || 'currency';
  const unit = code || 'local currency';
  const headline =
    lost.length === held.length
      ? `The ${cur} has lost value against the US dollar over every window measured, from ${spanLabel(fx[held[0][0]], held[0][1])} to ${spanLabel(fx[held[held.length - 1][0]], held[held.length - 1][1])}.`
      : gained.length === held.length
        ? `The ${cur} has gained against the US dollar over every window measured.`
        : `The ${cur} fell against the dollar over ${lost.map((w) => w[1]).join(', ') || 'no window'} and rose over ${gained.map((w) => w[1]).join(', ')}.`;
  const evidence = held.map(([k, nominal]) => {
    const w = fx[k];
    const label = spanLabel(w, nominal);
    return `${label[0].toUpperCase()}${label.slice(1)} (${monthLabel(w.fromPeriod)} to ${monthLabel(w.toPeriod)}): ${unit} per USD from ${rate(w.from)} to ${rate(w.to)}. The dollar costs ${pct1(w.dollarDearerPct)}% more; the ${cur} ${w.valueLostPct >= 0 ? 'lost' : 'gained'} ${pct1(Math.abs(w.valueLostPct))}% of its dollar value.`;
  });
  if (num(fx.annualised3mValueLostPct))
    evidence.push(
      `The last 3 months annualise to ${article(pct1(Math.abs(fx.annualised3mValueLostPct)))} ${pct1(Math.abs(fx.annualised3mValueLostPct))}% ${fx.annualised3mValueLostPct >= 0 ? 'loss' : 'gain'} in dollar value.`,
    );
  if (num(fx.volatility3m) && num(fx.volatility5yMedian))
    evidence.push(
      `Volatility of ${fx.frequency === 'daily' ? 'daily' : 'monthly'} moves over 3 months: ${fx.volatility3m.toFixed(2)}%, against a 5-year median of ${fx.volatility5yMedian.toFixed(2)}%.`,
    );

  const parts = [];
  const y1 = fx.y1?.valueLostPct;
  const a3 = fx.annualised3mValueLostPct;
  if (num(y1) && num(a3) && y1 > 0 && a3 > 0) {
    const r = a3 / y1;
    parts.push(
      r < 0.8
        ? 'The loss of value is continuing, at a slower pace than over the past year'
        : r > 1.25
          ? 'The loss of value is continuing and has sped up against the past year'
          : 'The loss of value is continuing at about the pace of the past year',
    );
  } else if (num(y1) && y1 > 0) parts.push('The currency is weaker than a year ago');
  else if (num(y1)) parts.push('The currency is stronger than a year ago');
  if (num(fx.volatility3m) && num(fx.volatility5yMedian) && fx.volatility5yMedian > 0) {
    const v = fx.volatility3m / fx.volatility5yMedian;
    parts.push(
      v < 0.85
        ? 'with less volatility than its own 5-year norm: a steady, managed path rather than a disorderly one'
        : v > 1.5
          ? 'with volatility well above its own 5-year norm'
          : 'with volatility close to its own 5-year norm',
    );
  }
  const w = fx.y1 || fx.m3;
  return {
    id: 'fx-pace',
    title: 'Depreciation: persistence and pace',
    headline,
    evidence,
    interpretation: parts.length ? `${parts.join(', ')}.` : null,
    why: 'A persistent loss of value raises import prices and erodes local-currency savings even without a sudden break.',
    qualification: `The rise in ${unit} per USD and the share of value the ${cur} lost are different measures: over ${w === fx.y1 ? '12 months' : '3 months'}, ${article(pct1(w.dollarDearerPct))} ${pct1(w.dollarDearerPct)}% dearer dollar is ${article(pct1(w.valueLostPct))} ${pct1(w.valueLostPct)}% loss of the ${cur}'s dollar value.`,
    status: 'Calculated',
    chart: 'fx',
  };
}

function policyVsInflation(policy, infl, missing) {
  if (!policy?.level || !infl?.annual || !num(policy.expostRealRatePp)) return null;
  const real = policy.expostRealRatePp;
  const headline =
    real > 0
      ? `The policy rate is above annual inflation: an ex-post real rate of ${signed(real)} percentage points.`
      : real < 0
        ? `The policy rate is below annual inflation: an ex-post real rate of ${signed(real)} percentage points.`
        : 'The policy rate equals annual inflation: an ex-post real rate of zero.';
  const evidence = [
    `Policy rate, ${monthLabel(policy.level.period)}: ${pct1(policy.level.value)}%.`,
    `Annual inflation, ${monthLabel(infl.annual.period)}: ${pct1(infl.annual.value)}%` +
      (infl.annualYearAgo
        ? `, ${infl.annual.value < infl.annualYearAgo.value ? 'down' : infl.annual.value > infl.annualYearAgo.value ? 'up' : 'unchanged'} from ${pct1(infl.annualYearAgo.value)}% in ${monthLabel(infl.annualYearAgo.period)}`
        : '') +
      '.',
    `Policy rate minus inflation: ${pct1(policy.level.value)}% − ${pct1(infl.annual.value)}% = ${signed(real)} pp.`,
  ];
  if (num(policy.change12mPp))
    evidence.push(
      `The policy rate ${policy.change12mPp > 0 ? 'rose' : policy.change12mPp < 0 ? 'fell' : 'was unchanged'}${policy.change12mPp ? ` ${pct1(Math.abs(policy.change12mPp))} pp` : ''} over 12 months${policy.lastChange ? `; last changed in ${monthLabel(policy.lastChange.period)}, from ${pct1(policy.lastChange.from)}% to ${pct1(policy.lastChange.to)}%` : ''}.`,
    );
  const easing = num(policy.change12mPp) && policy.change12mPp < 0;
  const falling = infl.trend === 'falling';
  const interpretation =
    real > 0
      ? `On this backward-looking measure policy is restrictive${falling ? ' and inflation is easing' : ''}${easing ? ', while the central bank has been cutting' : ''}.`
      : `On this backward-looking measure policy is loose against recent inflation${easing ? ', and the central bank has been cutting' : ''}, which tends to add to pressure on the currency.`;
  const noExp = (missing || []).some((m) => /inflation expectations/i.test(m));
  return {
    id: 'policy-real',
    title: 'The policy rate against inflation',
    headline,
    evidence,
    interpretation,
    why: 'A positive real rate rewards holding the local currency; a negative one pushes savers toward dollars and adds to depreciation pressure.',
    qualification: `Ex-post: the policy rate minus the latest annual inflation print, which looks backward. A forward-looking real rate needs inflation expectations${noExp ? ", which are not in Ezana's data" : ''}.`,
    status: 'Calculated',
    chart: 'policy',
  };
}

function nominalVsReal(reer, fx, { code, name }) {
  if (!reer?.latest || reer.basis !== 'bis_real_broad' || !num(reer.change1yPct)) return null;
  const cur = name || code || 'currency';
  const nomLost = fx?.y1?.valueLostPct;
  const realUp = reer.change1yPct > 0;
  const headline =
    num(nomLost) && nomLost > 0 && realUp
      ? `The ${cur} lost value against the dollar, yet rose ${pct1(reer.change1yPct)}% in real effective terms over the year.`
      : num(nomLost) && nomLost > 0
        ? `The ${cur} fell in both nominal and real effective terms over the year.`
        : `The ${cur}'s real effective rate ${realUp ? 'rose' : 'fell'} ${pct1(Math.abs(reer.change1yPct))}% over the year.`;
  const evidence = [
    `Real effective exchange rate (BIS, broad basket), ${monthLabel(reer.latest.period)}: index ${reer.latest.value.toFixed(1)}${reer.yearAgo ? `, against ${reer.yearAgo.value.toFixed(1)} in ${monthLabel(reer.yearAgo.period)}` : ''} (${signed(reer.change1yPct)}%).`,
  ];
  if (num(reer.percentile))
    evidence.push(
      `That is the ${ordinal(reer.percentile)} percentile of its own history since ${monthLabel(reer.since)}.`,
    );
  if (num(nomLost))
    evidence.push(
      `Over the same 12 months the ${cur} ${nomLost >= 0 ? 'lost' : 'gained'} ${pct1(Math.abs(nomLost))}% of its dollar value.`,
    );
  const interpretation =
    num(nomLost) && nomLost > 0 && realUp
      ? `Domestic prices are rising faster than the currency is falling, so in real terms the ${cur} is getting stronger, not weaker${num(reer.percentile) && reer.percentile >= 75 ? `, and sits near the strong end of its own history` : ''}.`
      : num(nomLost) && nomLost > 0
        ? `The nominal fall is larger than the inflation gap, so the ${cur} is also weaker in real terms.`
        : `The real rate moved ${realUp ? 'up' : 'down'} against its own past.`;
  return {
    id: 'reer',
    title: 'Nominal depreciation against the real exchange rate',
    headline,
    evidence,
    interpretation,
    why: 'Real strength alongside high inflation erodes export competitiveness and can store up pressure on the external balance; real weakness does the opposite.',
    qualification:
      'BIS real effective exchange rate, broad basket: a higher index means a stronger currency in real terms. A high reading against its own history is not by itself evidence of overvaluation; the index has no fixed fair-value level.',
    status: 'Calculated',
    chart: 'reer',
  };
}

function ordinal(v) {
  const n = Math.round(v);
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th';
  return `${n}${s}`;
}

/* What a crisis call would need that Ezana does not hold, in the order a reader thinks of it. */
const CRISIS_INPUTS = [
  'net usable reserves',
  'short-term external debt',
  'FX-denominated funding of banks and firms',
  'sovereign CDS spreads',
  'capital flows',
  'inflation expectations',
];

function crisisScope(m, { code, name }, place) {
  if (!m?.fx) return null;
  const held = [
    m.fx ? 'the exchange rate' : null,
    m.inflation ? 'inflation' : null,
    m.policy ? 'the policy rate' : null,
    m.reer?.basis === 'bis_real_broad' ? 'the real effective exchange rate' : null,
    m.reserves ? 'gross official reserves' : null,
    m.external?.currentAccount ? 'the current account' : null,
    m.external?.externalDebt ? 'total external debt' : null,
  ].filter(Boolean);
  const notHeld = CRISIS_INPUTS;
  const evidence = [`Measured here: ${listOf(held)}.`];
  if (m.reserves?.level && num(m.reserves.change3mPct))
    evidence.push(
      `Gross reserves ${m.reserves.change3mPct >= 0 ? 'rose' : 'fell'} ${pct1(Math.abs(m.reserves.change3mPct))}% over 3 months to ${monthLabel(m.reserves.level.period)}${num(m.reserves.importMonths) ? `, about ${m.reserves.importMonths.toFixed(1)} months of goods imports` : ''}.`,
    );
  evidence.push(`Not in Ezana's data: ${listOf(notHeld)}.`);
  return {
    id: 'crisis-scope',
    title: 'What the data can and cannot establish',
    headline: `The data measure depreciation pressure on the ${name || code || 'currency'}; on their own they cannot establish that a crisis is imminent${place ? ` in ${place}` : ''}.`,
    evidence,
    interpretation:
      'Depreciation pressure (what the exchange rate and its drivers show) is measured here. Vulnerability (how exposed balance sheets are to a further fall) is only partly measured. An imminent crisis (a disorderly break) cannot be called from these series.',
    why: 'A weak currency is not a forecast of a crisis; the missing measures are the ones that decide whether pressure turns disorderly.',
    qualification: 'Findings from the measures listed, not a forecast.',
    status: 'Scope',
    chart: m.reserves ? 'reserves' : null,
  };
}

function listOf(xs) {
  if (xs.length <= 1) return xs[0] || 'none';
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/**
 * The findings for one currency answer, in reading order (at most four).
 * metrics  compactMetrics(picture.metrics) as the pipeline passed it
 * currency { code, name }; place: the country's name; missing: the picture's missing list
 */
export function fxFindings({ metrics, currency = null, place = null, missing = [] } = {}) {
  if (!metrics) return [];
  const who = { code: currency?.code || null, name: currency?.short || currency?.name || null };
  return [
    fxPace(metrics.fx, who),
    policyVsInflation(metrics.policy, metrics.inflation, missing),
    nominalVsReal(metrics.reer, metrics.fx, who),
    crisisScope(metrics, who, place),
  ].filter(Boolean);
}
