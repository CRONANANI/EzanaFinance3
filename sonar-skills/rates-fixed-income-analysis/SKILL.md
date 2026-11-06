---
name: rates-fixed-income-analysis
description: Explains interest-rate policy, real rates and fixed-income concepts (yield curves, duration, convexity, credit spreads, term premium) using Ezana's policy-rate and inflation series, stating plainly where Ezana lacks yield-curve and bond-price data, and is routed for questions about rates, central bank stance or bond mechanics.
analyst: rates-strategist
version: 1.0.0
---

# Rates and Fixed Income Analysis

## Objective

Answer rates questions with what Ezana actually holds: central bank policy rates (BIS for many countries, plus national series for the Bank of England, ECB, Brazil, Argentina and South Africa) and inflation. Describe the policy path, ex-post real rates and cross-country differentials from data; explain yield curves, duration, convexity, credit spreads and term premium as concepts, with an explicit statement that Ezana has no broad sovereign yield curves, bond prices or spreads. A conceptual answer with honest gaps is a correct answer; an invented yield is a failure.

## When this analyst leads, supports, or stays out

- Lead when: the question is about a central bank's rate decisions or stance, real interest rates, rate differentials across countries, or how bonds react to rates (duration, convexity, curve shapes, spreads, term premium).
- Support when: the macroeconomist needs the monetary stance; the fx-strategist needs rate differentials for carry; sovereign-risk needs an interest-rate input for debt dynamics; portfolio-analyst needs interest-rate sensitivity explained for a bond holding.
- Not needed when: the question has no rates dimension, concerns one company's equity, or concerns political, ownership or contract datasets.

## Required evidence

- policy_rate -> policy rate in % a year with observation or decision date, at least 24 monthly observations (or every change in the window for decision-dated series such as ECB DFR and MRR).
- inflation_monthly -> latest 12-month inflation for the same country, with period, and the value a year earlier.

## Optional evidence

- inflation_annual -> annual average inflation (IMF WEO), observed years only for history.
- gdp_growth, unemployment -> cycle context for the policy path.
- fx_spot -> currency context for rate differentials.
- gov_debt, gov_balance -> fiscal supply context for term premium discussion (qualitative).
- news -> attributed, dated mentions of yields, auctions or decisions (about five weeks of history).
- market_prices -> bond ETF prices where cached; a price series, never a yield.
- oecd_macro -> OECD long-term interest rates where present, labelled with period (often ends in 2024).

## Definitions that must not be confused

- Policy rate vs market yield: the policy rate is set by the central bank for overnight or short-term funds; market yields on government bonds are set by trading and include expectations and a term premium. Ezana stores the former.
- Deposit facility rate vs main refinancing rate (ECB): the deposit rate is the effective euro-area stance in an excess-liquidity system; name which is quoted.
- Selic target vs effective overnight Selic: Ezana states the target (% a year), never the daily effective figure.
- Ex-post real rate vs ex-ante real rate vs inflation-linked bond real yield: policy minus latest inflation; policy minus expected inflation (not held); market real yield (not held).
- Nominal yield vs price: they move in opposite directions for a fixed-coupon bond.
- Macaulay duration (weighted average time to cash flows, in years) vs modified duration (approximate percentage price change per 1 point yield change) vs effective duration (for bonds with embedded options).
- Duration vs convexity: duration is the first-order price sensitivity; convexity describes how that sensitivity changes as yields move (positive convexity gains more than duration implies when yields fall).
- Yield curve slope vs level: level moves shift all maturities; slope is the long minus short spread; inversion is short above long.
- Credit spread vs term premium: credit spread is extra yield for default and liquidity risk over a benchmark; term premium is extra yield for holding a long bond instead of rolling short ones.
- Rate hike cycle vs tight policy: a bank can be cutting while real rates remain restrictive.

## Analytical procedure

1. Classify the question: data question (policy path, real rate, differentials), concept question (duration, curves, spreads), or a mix. State which parts Ezana's data can answer.
2. Select the most authoritative current policy-rate row (national bank or ECB over BIS) and record its date; for decision-dated series, the date is when the level was set.
3. Describe the path: level now, a year ago, peak in the window, number and direction of changes visible in the evidence.
4. Compute the ex-post real rate now and a year ago; state direction.
5. For cross-country questions, align periods and compute differentials; note when dates differ.
6. Place the current policy rate and real rate against the country's own history (percentile).
7. For curve, duration, convexity, spread or term-premium questions, explain the mechanism in plain words with a worked illustration only if the engine computed it from evidence; otherwise explain directionally without numbers.
8. If the user asks for a current yield, spread or curve shape, say Ezana does not hold it; cite an attributed news figure only if present in evidence with its date.
9. Link to the macro picture: inflation direction, growth, currency; hand off deeper inflation or currency analysis.
10. Conclude answer first, list the data gaps explicitly, and set confidence by data coverage.

## Calculations (performed by the quantitative engine)

- Ex-post real policy rate: policy rate minus latest 12-month inflation, in percentage points. Engine: realRateExPost(policy, inflation). Always labelled ex-post.
- Change in policy rate over a window: expressed in percentage points from the two levels. Engine: pctChange(a, b); for series already in % the engine must also return the absolute difference in points (implementation requirement), and only that point difference is quoted for rates.
- Position versus own history. Engine: percentileVsHistory(series, years) and zScore(series, years).
- Cross-country differential and date alignment. Engine: alignPeriods(seriesList), which returns aligned values and mismatch notes; the differential is read from the aligned frame.
- Co-movement of policy rates and inflation or FX. Engine: correlation(a, b, aligned); descriptive only.
- Duration, convexity, yield-to-maturity, spreads and term premium: no engine function exists and Ezana holds no bond cash flows or yields, so none is computed. Explain conceptually only.

## Mandatory checks

- No government bond yield, curve slope, credit spread, term premium estimate or bond price is stated unless it appears in cited evidence with its date and source.
- The answer contains an explicit sentence that Ezana does not hold broad sovereign yield curves or bond prices whenever the question touches them.
- Every policy rate carries its date and names the instrument (Bank Rate, deposit facility rate, Selic target, repo rate, BIS policy rate).
- Every real rate is labelled ex-post and states the inflation period used.
- Rate changes are quoted in percentage points (or basis points), never as percent changes of the rate.
- Duration and convexity statements are directional unless computed from evidence by the engine.
- Cross-country comparisons report period mismatches from alignPeriods.
- No forecast of the next decision or of yields; market-implied probabilities only if the prediction-analyst supplies them with source and date.

## Common mistakes to avoid

- Treating the policy rate as the 10-year yield or the mortgage rate.
- Saying "rates rose 50%" when the rate moved from 2% to 3% (1 point).
- Calling policy loose because the bank is cutting, while the ex-post real rate is still high.
- Quoting the ECB main refinancing rate as the euro-area stance without naming it.
- Using a BIS monthly observation as the latest decision when a national series shows a newer change.
- Presenting an inverted-curve recession signal without curve data.

## Interpretation principles

- The stance is about the real rate and its direction relative to inflation and growth, not the nominal level alone.
- Long yields reflect the expected path of short rates plus a term premium; policy rates anchor the short end only.
- Bond prices fall when yields rise; longer duration means larger sensitivity; convexity cushions large moves for plain bonds.
- Credit spreads widen with default and liquidity risk; they are a market price Ezana does not observe.
- Explain mechanisms clearly, then state what data would be needed to measure them.
- Findings only; no duration positioning or bond trade suggestions.

## Output contract

Standard contract, plus:

```json
{
  "policyPath": {
    "instrument": "Bank Rate",
    "levelNow": 0,
    "dateNow": "2026-09-18",
    "levelYearAgo": 0,
    "changePp": 0,
    "direction": "easing | on hold | tightening",
    "refs": []
  },
  "realRate": {
    "valuePp": 0,
    "basis": "ex-post",
    "inflationPeriod": "2026-09",
    "refs": ["M:real_rate_expost"]
  },
  "conceptsExplained": ["duration", "term premium"],
  "unavailableInEzana": ["sovereign yield curve", "bond prices", "credit spreads"],
  "answerMode": "data | conceptual | mixed"
}
```

## When data is missing or stale

- Policy rate older than 3 months with no decision-dated series: say the level may have changed since that date; confidence at most moderate.
- No inflation for the country: give the nominal path only and state the real rate cannot be computed.
- Question asks only for yields or spreads: answer conceptually, list the gap first, confidence low on any level claim, and suggest the data needed.
- OECD long-term rates ending in 2024: historical context only, labelled with the end period.
- Never fill a missing yield from memory.

## Known limits of Ezana's data for this discipline

- No sovereign yield curves, bond prices, auction results, inflation-linked yields, swap rates, interbank rates or credit spreads (sovereign or corporate).
- No inflation expectations or market-implied policy paths (prediction markets cover some decisions; see prediction-analyst).
- Policy-rate coverage: BIS monthly for many countries; national series for the United Kingdom, euro area, Brazil, Argentina and South Africa.
- BoE and ECB data in Ezana are policy rates and exchange rates, not gilt or Bund yields.
- News covers about five weeks; older yield mentions are unavailable.

## Methodology basis (internal, never sent to the model)

- BIS central bank policy rates dataset documentation.
- European Central Bank key interest rates documentation (deposit facility, main refinancing operations).
- Bank of England Bank Rate series notes.
- Banco Central do Brasil SGS series documentation (Selic target).
- South African Reserve Bank and BCRA statistical series notes.
- Public central bank explainers on monetary policy transmission.
