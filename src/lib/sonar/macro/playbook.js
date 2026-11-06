/**
 * Ezana macro playbook: how Sonar reasons about economies, currencies, debt and power.
 *
 * Original Ezana guidance, written in our own words from standard macroeconomics (credit and
 * debt cycles, balance-of-payments dynamics, monetary policy trade-offs, and the long-run
 * drivers of national strength). It is injected into synthesis prompts and used by the
 * deterministic assessments below. Sonar never cites "the playbook" or any author; it simply
 * reasons this way, and every figure still comes from cited evidence.
 *
 * Pure: no I/O. Thresholds are Ezana conventions, stated openly in answers as such
 * ("by Ezana's thresholds"), never presented as official classifications.
 */

/* ── The lens every answer uses (short; goes into every grounded prompt) ─────────────── */

export const MACRO_LENS = `How Ezana reasons about any economic question:
- Separate level, direction and acceleration. "High but falling" and "low but rising fast" are different stories; say which one the data shows.
- Judge a figure against the country's own history (percentile, long-run median) and against peers, not in isolation.
- Look for confirmation across independent indicators before calling a trend. One series is a clue; three agreeing series are evidence.
- Follow the money: who is borrowing, in what currency, from whom, and whether income is growing faster or slower than debt service.
- Name the mechanism, not just the correlation: how a change in one variable would move another, and what evidence shows that channel operating now.
- Distinguish symptoms (a weak currency, high inflation) from causes (negative real rates, external funding gaps, credit excess, policy credibility).
- Say what the evidence does NOT establish, and what development would change the conclusion.
- Timing is the hardest part: describe conditions and vulnerabilities, never predict dates or prices.`;

/* ── Frameworks (selected per question) ─────────────────────────────────────────────── */

export const FRAMEWORKS = {
  currency: {
    id: 'currency',
    title: 'Currency pressure',
    guidance: `A currency is under pressure when demand for it falls short of supply at the current price. Diagnose it through five components, each with its own evidence:
1. Depreciation: the change against the US dollar over 1 month, 3 months and 1 year, and whether the pace is accelerating. Always state both conventions when quoting a move: "the dollar costs X% more in local currency" and "the currency lost Y% of its dollar value" (Y = 1 - old/new).
2. Inflation: annual and latest-month inflation, and the trend. High domestic inflation erodes the currency's purchasing power and pushes residents toward foreign currency.
3. Monetary policy stance: the policy rate minus latest annual inflation is an ex-post real rate, not a forward-looking one; say so. Negative or shrinking real rates weaken the case for holding the currency; easing while inflation is high tests credibility.
4. External liquidity: foreign-exchange reserves and their recent change, reserves relative to imports and to short-term external debt where available, the current account, and portfolio flows. Gross reserves overstate usable reserves; say so when only gross figures exist.
5. Market and political stress: geopolitical risk, policy uncertainty and governance indicators, which raise the premium investors demand.
A central bank defending a currency has four levers, each with a cost: raise rates (slows the economy), spend reserves (finite), restrict capital flows (damages confidence and investment), or let the currency fall (imports inflation). Name which levers the data shows being used.
Separate sustained depreciation from an acute crisis. A crisis needs evidence of disorderly moves, accelerating capital flight, reserves running low against near-term external obligations, or loss of market access. Do not call a crisis without that evidence.`,
    families: [
      'fx_usd',
      'fx_effective',
      'inflation_monthly',
      'inflation_annual',
      'policy_rate',
      'fx_reserves',
      'current_account',
      'bop',
      'trade_goods',
      'external_debt',
      'geopolitical_risk',
      'uncertainty',
      'governance',
    ],
  },

  debt: {
    id: 'debt',
    title: 'Debt and credit cycle',
    guidance: `Credit lets spending run ahead of income for a while; the bill arrives as debt service. Diagnose where an economy sits in its credit cycle:
- Is credit growing faster than income (rising credit-to-GDP, a positive credit gap)? Large positive gaps have historically preceded banking stress.
- How heavy is debt service relative to income (debt service ratios against their own history)?
- Who holds the debt (households, companies, government) and in which currency? Debt in a currency the country cannot print is far more dangerous: it cannot be inflated away, and a weaker currency makes it heavier.
- How much room does policy have: are interest rates already low, is the central bank able to ease, is the government able to borrow cheaply?
When debt burdens must fall, there are four ways, usually combined: spending cuts, defaults or restructurings, transfers from those with more to those with less, and money creation by the central bank. Cuts and defaults are deflationary; money creation and transfers are inflationary. A balanced mix keeps nominal growth above nominal interest rates and makes the adjustment manageable; an unbalanced one produces either a deflationary slump or, for countries with foreign-currency debt, an inflationary currency collapse. Describe which pattern the evidence is closer to.`,
    families: [
      'total_credit',
      'credit_gap',
      'debt_service',
      'gov_debt',
      'gov_balance',
      'house_prices',
      'policy_rate',
      'inflation_annual',
      'gdp_growth',
      'external_debt',
    ],
  },

  inflation: {
    id: 'inflation',
    title: 'Inflation dynamics',
    guidance: `Explain inflation through its drivers rather than its level alone: demand running ahead of capacity, currency weakness passing through to import prices, energy and food shocks, wage-price dynamics, and money and credit growth. Compare the latest month with the annual rate to show whether pressure is building or easing. Compare inflation with the policy rate (ex-post real rate) and, where available, with the target. Disinflation from a very high peak can coexist with inflation that is still far too high; say both.`,
    families: [
      'inflation_monthly',
      'inflation_annual',
      'policy_rate',
      'fx_usd',
      'commodity_price',
      'food_prices_local',
      'oil_demand',
      'unemployment',
      'gdp_growth',
    ],
  },

  growth: {
    id: 'growth',
    title: 'Growth and the business cycle',
    guidance: `Growth over a few quarters is driven by spending, credit and policy; growth over decades by productivity. Place the economy in its short-term cycle (growth versus its own trend, unemployment direction, activity indices, policy rate direction) and separately note the long-run supports or drags (investment, governance, demographics where evidence exists). Rising unemployment with easing policy and falling inflation reads differently from falling unemployment with rising inflation; name the combination.`,
    families: [
      'gdp_growth',
      'activity',
      'unemployment',
      'employment_sector',
      'inflation_annual',
      'policy_rate',
      'trade_goods',
    ],
  },

  geopolitics: {
    id: 'geopolitics',
    title: 'Geopolitical and internal-order risk',
    guidance: `Conflict, sanctions and political instability move economies through specific channels: trade and energy disruption, capital flight, sanctions-driven exclusion from payment systems, risk premiums on assets, and policy unpredictability. Distinguish external conflict (between states: geopolitical risk, sanctions, conflict events) from internal disorder (governance, political stability, policy uncertainty). Show the indicator's level against its own history, then the economic channel through which it would matter for the question asked. Never infer a causal effect from timing alone.`,
    families: [
      'geopolitical_risk',
      'uncertainty',
      'conflict',
      'news_tone',
      'governance',
      'sanctions',
    ],
  },

  commodity: {
    id: 'commodity',
    title: 'Commodities and energy',
    guidance: `Commodity prices move on supply (production, stocks, disruption risk), demand (industrial activity, energy transition, China and emerging-market growth) and the dollar. For a country, ask whether it is a net exporter or importer of the commodity: a price rise helps the trade balance and currency of exporters and squeezes importers through inflation and the current account. Quote prices with their unit and period, the one-year change and where the price sits in its five-year range.`,
    families: [
      'commodity_price',
      'oil_production',
      'oil_demand',
      'oil_stocks',
      'gas_production',
      'gas_demand',
      'gas_imports',
      'gas_stocks',
      'power_mix',
      'trade_goods',
      'current_account',
    ],
  },

  strength: {
    id: 'strength',
    title: 'Long-run national strength',
    guidance: `Over decades, a country's economic and financial standing rises and falls with a set of reinforcing strengths: education and skills, innovation and technology, cost competitiveness, productivity growth, share of world trade, military security, depth of financial markets, and whether its currency is used as a store of value by others. Weakening shows up as growing debts relative to income, rising internal conflict (inequality, polarization, weak governance), and challenges from rising powers. Use Ezana's Global Empire Rankings and governance indicators as the evidence for these strengths; describe direction over time, and never present a ranking as destiny.`,
    families: ['governance', 'gdp_growth', 'trade_goods', 'gov_debt', 'geopolitical_risk'],
    usesEmpire: true,
  },
};

/** Which frameworks a routed question needs. `route` comes from the macro router. */
export function selectFrameworks(route = {}) {
  const t = new Set(route.themes || []);
  const out = new Set();
  if (t.has('currency') || route.currency) out.add('currency');
  if (t.has('credit') || t.has('housing') || t.has('debt') || t.has('financial stability'))
    out.add('debt');
  if (t.has('inflation')) out.add('inflation');
  if (t.has('growth') || t.has('labour') || t.has('recession')) out.add('growth');
  if (t.has('geopolitics') || t.has('risk') || t.has('conflict') || t.has('sanctions'))
    out.add('geopolitics');
  if (t.has('energy') || t.has('commodity') || t.has('food') || t.has('metals') || route.commodity)
    out.add('commodity');
  if (t.has('power') || t.has('long-run') || route.empire) out.add('strength');
  /* A country question with no specific theme: the general picture. */
  if (!out.size && (route.countries || []).length) {
    out.add('growth');
    out.add('inflation');
  }
  return [...out].slice(0, 3);
}

/** Prompt text for the selected frameworks, after MACRO_LENS. */
export function frameworkPrompt(ids = []) {
  const parts = ids
    .map((id) => FRAMEWORKS[id])
    .filter(Boolean)
    .map((f) => `${f.title}:\n${f.guidance}`);
  return parts.length ? `${MACRO_LENS}\n\n${parts.join('\n\n')}` : MACRO_LENS;
}

/* ── Deterministic currency assessment ──────────────────────────────────────────────── */

/** Ezana thresholds. Stated in answers as "Ezana's thresholds". */
export const CURRENCY_THRESHOLDS = {
  depreciation1y: { elevated: 10, severe: 25 }, // % lost against USD over a year
  depreciation3mAnnualised: { elevated: 15 },
  inflation: { elevated: 10, severe: 30 }, // % annual
  realRate: { negative: 0, thin: 2 }, // policy rate minus annual inflation, pp
  reserves3m: { deteriorating: -5, sharp: -15 }, // % change over ~3 months
  reserveImportMonths: { weak: 3 },
  currentAccount: { vulnerable: -4 }, // % of GDP
  riskPercentile: { elevated: 80 }, // own-history percentile
};

const LEVELS = ['low', 'moderate', 'elevated', 'severe'];

/**
 * metrics (all optional; pass what the evidence has):
 *   fxNow, fxYearAgo, fx3mAgo          local currency per USD
 *   inflationAnnual                    % y/y (latest)
 *   inflationAnnualYearAgo
 *   policyRate                         %
 *   policyRateChange1y                 pp
 *   reservesNow, reserves3mAgo         same unit
 *   reserveImportMonths
 *   currentAccountPctGdp
 *   riskPercentile                     0-100, own history (GPR or WUI)
 *
 * Returns { components: [{ id, label, level, evidence }], overall, crisisEstablished: false,
 *           missing: [...] }. `overall` is the median of assessed component levels, never a
 *           score; crisisEstablished is always false here because the data cannot show
 *           disorderly market functioning on its own (the model may only say so with evidence).
 */
export function assessCurrencyPressure(m = {}) {
  const T = CURRENCY_THRESHOLDS;
  const comps = [];
  const missing = [];
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  /* Depreciation */
  if (n(m.fxNow) && n(m.fxYearAgo)) {
    const dollarDearer = (m.fxNow / m.fxYearAgo - 1) * 100;
    const valueLost = (1 - m.fxYearAgo / m.fxNow) * 100;
    let level =
      valueLost >= T.depreciation1y.severe
        ? 'severe'
        : valueLost >= T.depreciation1y.elevated
          ? 'elevated'
          : valueLost > 3
            ? 'moderate'
            : 'low';
    let accel = null;
    if (n(m.fx3mAgo)) {
      const lost3m = (1 - m.fx3mAgo / m.fxNow) * 100;
      const annualised = (1 - Math.pow(1 - lost3m / 100, 4)) * 100;
      accel = annualised;
      if (annualised >= T.depreciation3mAnnualised.elevated && level === 'moderate')
        level = 'elevated';
    }
    comps.push({
      id: 'depreciation',
      label: 'Exchange-rate depreciation',
      level,
      evidence: {
        dollarDearerPct: round(dollarDearer),
        valueLostPct: round(valueLost),
        annualisedLast3mPct: accel == null ? null : round(accel),
      },
    });
  } else missing.push('exchange rate against the US dollar, a year of history');

  /* Inflation */
  if (n(m.inflationAnnual) != null) {
    const v = m.inflationAnnual;
    const level =
      v >= T.inflation.severe
        ? 'severe'
        : v >= T.inflation.elevated
          ? 'elevated'
          : v >= 4
            ? 'moderate'
            : 'low';
    const trend =
      n(m.inflationAnnualYearAgo) != null
        ? v < m.inflationAnnualYearAgo
          ? 'falling'
          : v > m.inflationAnnualYearAgo
            ? 'rising'
            : 'flat'
        : null;
    comps.push({
      id: 'inflation',
      label: 'Inflation persistence',
      level,
      evidence: { annualPct: round(v), yearAgoPct: n(m.inflationAnnualYearAgo), trend },
    });
  } else missing.push('recent annual inflation');

  /* Policy stance */
  if (n(m.policyRate) != null && n(m.inflationAnnual) != null) {
    const real = m.policyRate - m.inflationAnnual;
    const easing = n(m.policyRateChange1y) != null && m.policyRateChange1y < 0;
    let level =
      real < T.realRate.negative ? 'severe' : real < T.realRate.thin ? 'elevated' : 'moderate';
    if (real >= T.realRate.thin && !easing) level = 'low';
    if (easing && level === 'low') level = 'moderate';
    comps.push({
      id: 'policy',
      label: 'Monetary policy stance',
      level,
      evidence: {
        policyRate: m.policyRate,
        expostRealRatePp: round(real),
        easingOverYear: easing,
        note: 'ex-post: policy rate minus latest annual inflation, not a forward-looking real rate',
      },
    });
  } else missing.push('policy rate');

  /* External liquidity */
  const ext = {};
  let extLevel = null;
  if (n(m.reservesNow) && n(m.reserves3mAgo)) {
    const chg = (m.reservesNow / m.reserves3mAgo - 1) * 100;
    ext.reservesChange3mPct = round(chg);
    extLevel =
      chg <= T.reserves3m.sharp
        ? 'severe'
        : chg <= T.reserves3m.deteriorating
          ? 'elevated'
          : chg < 0
            ? 'moderate'
            : 'low';
  }
  if (n(m.reserveImportMonths) != null) {
    ext.reserveImportMonths = round(m.reserveImportMonths);
    if (m.reserveImportMonths < T.reserveImportMonths.weak)
      extLevel = maxLevel(extLevel, 'elevated');
  }
  if (n(m.currentAccountPctGdp) != null) {
    ext.currentAccountPctGdp = round(m.currentAccountPctGdp);
    if (m.currentAccountPctGdp <= T.currentAccount.vulnerable)
      extLevel = maxLevel(extLevel, 'elevated');
    else extLevel = maxLevel(extLevel, m.currentAccountPctGdp < 0 ? 'moderate' : 'low');
  }
  if (extLevel)
    comps.push({ id: 'external', label: 'External liquidity', level: extLevel, evidence: ext });
  else missing.push('foreign-exchange reserves or current account');

  /* Market and political stress */
  if (n(m.riskPercentile) != null) {
    const p = m.riskPercentile;
    const level =
      p >= 95
        ? 'severe'
        : p >= T.riskPercentile.elevated
          ? 'elevated'
          : p >= 50
            ? 'moderate'
            : 'low';
    comps.push({
      id: 'stress',
      label: 'Political and market stress',
      level,
      evidence: { ownHistoryPercentile: round(p) },
    });
  } else missing.push('geopolitical or uncertainty index');

  /* Overall: anchored on the exchange-rate move itself (pressure on a currency shows up first
     in its price), then raised one step when two or more other components are elevated or
     worse, or lowered one step when every other component is low. Needs the depreciation
     component and at least two others; otherwise there is no overall label. */
  const dep = comps.find((c) => c.id === 'depreciation');
  const others = comps.filter((c) => c.id !== 'depreciation');
  let overall = null;
  if (dep && others.length >= 2) {
    let i = LEVELS.indexOf(dep.level);
    const hot = others.filter((c) => LEVELS.indexOf(c.level) >= 2).length;
    if (hot >= 2) i = Math.min(3, i + 1);
    else if (others.every((c) => c.level === 'low')) i = Math.max(0, i - 1);
    overall = LEVELS[i];
  }
  return {
    components: comps,
    overall,
    crisisEstablished: false,
    missing,
    thresholds: 'Ezana thresholds',
  };
}

function maxLevel(a, b) {
  if (!a) return b;
  return LEVELS.indexOf(b) > LEVELS.indexOf(a) ? b : a;
}
function round(v) {
  return Math.round(v * 100) / 100;
}

/** Plain label for an overall level, for the answer header. */
export const PRESSURE_LABEL = {
  low: 'Low pressure',
  moderate: 'Moderate pressure',
  elevated: 'Elevated pressure',
  severe: 'Severe pressure',
};
