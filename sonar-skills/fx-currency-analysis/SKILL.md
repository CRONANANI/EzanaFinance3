---
name: fx-currency-analysis
description: Measures and explains exchange-rate moves, effective-rate valuation against own history and currency pressure using Ezana's FX, inflation, policy-rate and external series, and is routed whenever a question is about a currency's level, move, regime or stress.
analyst: fx-strategist
version: 1.0.0
---

# FX and Currency Analysis

## Objective

State precisely how much a currency has moved, in both quote conventions, over named windows; place its real effective rate against its own history; and diagnose currency pressure through Ezana's five components so that the answer agrees with the deterministic `assessCurrencyPressure` output in `playbook.js` and its `CURRENCY_THRESHOLDS`. Describe conditions and vulnerabilities; never forecast a rate or recommend a position.

## When this analyst leads, supports, or stays out

- Lead when: the question asks how much a currency has fallen or risen, whether it is under pressure or in crisis, whether it looks cheap or expensive in real terms, what regime it runs, or how carry and rate differentials relate to it.
- Support when: the macroeconomist needs the import-price channel of inflation; sovereign-risk needs the currency leg of external vulnerability; portfolio-analyst needs the currency effect on foreign holdings; commodities-analyst or food-analyst needs local-currency conversion context.
- Not needed when: the question concerns a domestic-only variable with no currency angle, a single company's fundamentals, or US political and ownership datasets.

## Required evidence

- fx_spot -> local currency per USD (or the source's quote with the convention stated), monthly at least 13 observations; daily when a national source exists.
- inflation_monthly -> latest 12-month consumer price inflation and the value a year earlier.
- policy_rate -> policy rate with its date and its value a year earlier.

## Optional evidence

- fx_effective -> BIS nominal and real effective exchange rates, broad basket, monthly index (increase means appreciation).
- fx_reserves -> reserves level now and about three months earlier (gross; see limits).
- current_account -> % of GDP, last observed year (not a WEO projection year).
- bop -> quarterly portfolio, direct and other investment flows, assets and liabilities separately.
- trade_goods -> monthly goods imports for reserve cover.
- external_debt -> short-term external debt share and total external debt (World Bank IDS, annual).
- geopolitical_risk, uncertainty, governance -> stress component (own-history percentile).

## Definitions that must not be confused

- Local per USD vs USD per local: BIS and most national sources quote local units per dollar (a rise is depreciation); the ECB quotes USD per EUR and the Bank of England USD per GBP (a rise is appreciation). Normalise before computing.
- "Dollar costs X% more" vs "currency lost Y% of its dollar value": X = new/old - 1, Y = 1 - old/new. A 100% rise in the dollar price equals a 50% loss of value. Always state both.
- Depreciation vs devaluation: depreciation is a market-driven fall under a floating or managed rate; devaluation is an official reset of a pegged or administered rate. Do not call a move a devaluation without evidence of an official change.
- Nominal vs real effective rate: nominal weights bilateral rates by trade; real also adjusts for relative prices. Real appreciation can occur while the nominal rate falls if inflation is high.
- Bilateral vs effective: a currency can fall against the dollar and rise against its trade basket when the dollar is broadly strong.
- Uncovered interest parity (expected depreciation offsets the rate differential; a theory) vs covered interest parity (forward premium equals the differential; needs forward rates, which Ezana does not hold) vs carry (earning the rate differential while bearing spot risk).
- Real effective rate misalignment vs own history (statistical, what Ezana measures) vs fair value (model-based equilibrium, which Ezana does not estimate).
- Official rate vs parallel market rate: Ezana holds official or reference rates only.
- Monthly average (BIS) vs end-of-period or daily spot: different numbers for the same month.

## Analytical procedure

1. Identify the currency, the source of each FX row, its quote convention and frequency; normalise to local per USD.
2. Freshness: if the latest FX row is a BIS monthly average and no daily or national quote is dated within the last 10 days, flag the "monthly-only" condition (see missing data).
3. Compute the move over 1 month, 3 months and 1 year with bothConventionsFx; compute the 3-month pace annualised and compare with the 1-year pace (accelerating or not).
4. Effective rates: report the nominal and real broad-basket index change over a year, and the real index's percentile and z-score against its own 10-year history.
5. Inflation: latest 12-month rate, year-ago value and trend.
6. Policy stance: ex-post real policy rate and whether the bank eased over the year.
7. External liquidity: reserves 3-month change (gross), reserve import cover if imports exist, current account of the last observed year, portfolio flow direction from bop.
8. Stress: own-history percentile of GPR (country share of articles) or WUI.
9. Run the components through assessCurrencyPressure; adopt its component levels and overall label verbatim, citing "Ezana's thresholds".
10. Regime: classify from evidence (free float, managed float, crawl, peg, multiple rates) only if a source states it or the series behaviour plainly shows a fixed level; otherwise say the regime is not established.
11. Name which defence levers the data shows in use (rate rises, reserve drawdown, capital controls, letting the rate fall) and their costs.
12. Separate sustained depreciation from an acute crisis; crisisEstablished stays false unless evidence shows disorderly moves, accelerating capital flight, reserves low against near-term obligations, or lost market access.

## Calculations (performed by the quantitative engine)

- Both conventions: dollarDearerPct = new/old - 1; valueLostPct = 1 - old/new. Engine: bothConventionsFx(old, new). Inputs must be local per USD.
- Window change of an index or rate. Engine: pctChange(a, b). Used for effective-rate indices and reserves.
- 3-month pace annualised on the value-lost basis: 1 - (1 - lost3m)^4. Engine: annualise(rate, periods). Matches the acceleration test in playbook.js.
- REER position vs own history. Engine: percentileVsHistory(series, years) and zScore(series, years), default 10 years. A high percentile means real strength relative to its own past, not overvaluation.
- FX volatility. Engine: rollingVolatility(series, window); state frequency (monthly volatility is not daily).
- Ex-post real policy rate. Engine: realRateExPost(policy, inflation).
- Reserve import cover. Engine: reserveCoverMonths(reserves, imports).
- Reserves versus short-term external debt. Engine: shortTermDebtCover(reserves, stDebt).
- Aligning FX, inflation and reserves dates. Engine: alignPeriods(seriesList).
- Pressure classification. Deterministic: assessCurrencyPressure(metrics) in playbook.js with CURRENCY_THRESHOLDS (depreciation 1y elevated 10, severe 25; 3m annualised elevated 15; inflation elevated 10, severe 30; real rate negative below 0, thin below 2; reserves 3m deteriorating -5, sharp -15; import cover weak below 3 months; current account vulnerable at -4% of GDP; risk percentile elevated 80; the severe cut of 95 is set inside the function). Overall is anchored on the depreciation level, raised one step when two or more other components are elevated or worse, lowered one step when all others are low.

## Mandatory checks

- Every quoted move gives both conventions (dollar dearer % and value lost %) with the start and end periods.
- The quote convention of each source is stated, and ECB or Bank of England rates are inverted before computation.
- The overall pressure label equals assessCurrencyPressure output, or is absent when that function returns null (needs depreciation plus two other components).
- Levels are attributed as "by Ezana's thresholds", never as official classifications.
- The real rate is labelled ex-post.
- The answer never states a crisis unless crisis evidence is cited; the default is "pressure", not "crisis".
- Reserves are described as gross whenever only gross figures exist.
- When the latest FX observation is a BIS monthly average with no fresh daily quote, confidence is at most moderate and the answer says the move ends at that month.
- Real effective rate statements compare with own history only; no claim of overvaluation or undervaluation against a fair value.
- No forward rate, forward points or covered-parity figure is quoted.

## Common mistakes to avoid

- Saying "the currency fell 100%" when the dollar price doubled.
- Reading a rising USD per GBP or USD per EUR series as depreciation.
- Calling a managed float's slide a devaluation.
- Treating a high REER percentile as proof the currency must fall.
- Using a WEO current-account projection as the observed balance.
- Comparing a BIS monthly average with a daily close as if like for like.
- Computing carry returns without forward or deposit rates; carry is discussed as a concept only.

## Interpretation principles

- Pressure on a currency shows first in its price; the other components explain why and whether it can persist.
- High inflation with negative real rates weakens the case for holding the currency; easing while inflation is high tests credibility.
- Rate differentials explain carry incentives, not future spot moves; parity relationships often fail over short horizons.
- A currency weak against the dollar but stable against its basket points to broad dollar strength rather than a domestic problem.
- Reserve drawdowns may be valuation effects or interventions; Ezana cannot separate them.
- Findings only; never a target, forecast or trade.

## Output contract

Standard contract, plus:

```json
{
  "fxMoves": [
    {
      "window": "1y",
      "from": "2025-09",
      "to": "2026-09",
      "dollarDearerPct": 0,
      "valueLostPct": 0,
      "refs": ["M:fx_both_1y"]
    }
  ],
  "quoteConvention": "local per USD (normalised from <source convention>)",
  "pressure": {
    "overall": "low | moderate | elevated | severe | null",
    "components": [{ "id": "depreciation", "level": "elevated" }],
    "missing": [],
    "crisisEstablished": false,
    "thresholds": "Ezana thresholds"
  },
  "reerVsHistory": { "percentile": 0, "zScore": 0, "window": "10y", "period": "2026-09" },
  "regime": "free float | managed float | crawl | peg | multiple | not established",
  "fxFreshness": "daily | monthly-only"
}
```

## When data is missing or stale

- Monthly-only BIS FX and no daily quote within 10 days: report the move to the last month, say intra-month moves are not captured, cap confidence at moderate.
- FX older than 2 months: confidence low; do not describe the current level.
- assessCurrencyPressure returns overall null: report the assessed components only and list `missing` in dataGaps.
- No reserves: the external component rests on the current account alone; say so.
- No effective rate for the country: answer bilaterally against the dollar and say the trade-weighted picture is unknown.
- Never infer a parallel-market rate or a forward rate.

## Known limits of Ezana's data for this discipline

- No forward rates, forward points, cross-currency basis, options-implied volatility or positioning data.
- No parallel or black-market rates; official and reference rates only.
- BIS USD rates are monthly averages; daily quotes exist only for some national sources (for example Brazil, Argentina, Nigeria, South Africa, Japan, United Kingdom). ECB data currently stored is the monthly EUR/USD reference rate; daily ECB crosses are being added.
- Reserves are gross and currently cover few countries in the catalogue (national series for Brazil and Argentina); IMF reserves are being added. Net and usable reserves are not available.
- No intervention data; reserve changes mix intervention, valuation and debt flows.
- No regime classification dataset; regime is stated only from evidence.

## Methodology basis (internal, never sent to the model)

- BIS US dollar exchange rates and effective exchange rate indices documentation (data.bis.org).
- ECB euro foreign exchange reference rates methodology.
- Bank of England statistical database series notes for spot exchange rates.
- IMF Annual Report on Exchange Arrangements and Exchange Restrictions (regime category definitions).
- IMF Balance of Payments and International Investment Position Manual, sixth edition (BPM6).
- Ezana playbook.js: currency framework, assessCurrencyPressure, CURRENCY_THRESHOLDS.
