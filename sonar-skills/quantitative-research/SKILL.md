---
name: quantitative-research
description: Runs statistically disciplined tests on Ezana's time series (aligned joins, hypothesis tests, regressions with standard errors, event studies and backtests free of look-ahead and survivorship bias) entirely through engine functions, and is routed whenever a question asks whether a relationship, signal or effect holds in the data.
analyst: quant-analyst
version: 1.0.0
---

# Quantitative Research

## Objective

Answer "does this relationship or signal hold, how big is it, and how sure can we be" using engine computations only. Clean and align the series, choose a test that matches the question, report estimates with standard errors or intervals and sample sizes, guard against look-ahead, survivorship and multiple testing, and translate the result into plain language with its uncertainty. Never invent a coefficient, p-value or return; if the engine did not compute it, it does not appear.

## When this analyst leads, supports, or stays out

- Lead when: the question asks whether one series predicts or moves with another, whether a signal would have worked historically, whether returns differ after an event (insider buys, 13D filings, contract awards, congressional trades, sanctions listings), how volatile or correlated assets are, or whether an apparent pattern is statistically meaningful.
- Support when: portfolio-analyst needs beta, volatility or VaR inputs; ownership-analyst, contracts-analyst or congress-analyst want an event study; valuation needs a beta with its standard error; macroeconomist or fx-strategist want a correlation or regression on aligned series; prediction-analyst needs calibration statistics; red-team challenges a backtest.
- Not needed when: the question is descriptive (what a company reported, who owns what, what a market prices) and no test, estimate or uncertainty statement is required.

## Required evidence

- The series under test, each with its source capability, frequency, units, first and last observation dates, and release or filing dates where relevant: typically market_prices (adj_close, daily, at least 252 observations for return statistics) and one or more of sec_fundamentals, macro families, holdings_13f, insider_transactions, activist_stakes, congress_trades, contract_awards, prediction_markets.
- For event studies: an event list with the date the information became public (filing or release date, not period end) and a benchmark price series (market_prices for an index ETF) covering estimation and event windows.

## Optional evidence

- peer_set -> for cross-sectional tests and matched controls.
- macro families (policy_rate, inflation_monthly, fx_spot) -> as regressors, with release lags stated.
- news -> only to identify confounding events inside an event window (about five weeks of history).
- org_portfolio -> for tenant-scoped portfolio backtests (via portfolio-analyst).

## Definitions that must not be confused

- Correlation vs causation vs predictability: co-movement, a causal effect, and an out-of-sample forecasting edge are three different claims needing different designs.
- Observation date vs availability date: a quarterly figure for the period ending 30 June was not known until it was filed or released; tests must use availability dates.
- In-sample fit vs out-of-sample performance: a backtest tuned on the full sample is in-sample.
- Statistical significance vs economic significance: a tiny effect can be significant in large samples; a large effect can be insignificant in small ones.
- Standard error vs standard deviation: the first measures uncertainty of an estimate; the second the spread of the data.
- Abnormal return vs raw return: abnormal return subtracts a benchmark or model-expected return.
- Survivorship bias vs selection bias: survivorship drops entities that disappeared; selection picks the sample by an outcome-related criterion.
- Simple vs log returns; price vs total return (adj_close includes dividends and splits; close does not).

## Analytical procedure

1. Restate the question as a testable hypothesis with a null, the unit of observation, the horizon and the expected sign; decide this before looking at results.
2. Inventory each series: frequency, coverage dates, missing values, and availability lag; list known coverage gaps (news about five weeks; prediction snapshots about 35 days; fundamentals about three years).
3. Align with alignPeriods, joining on availability date for anything released with a lag; report the mismatch notes and the final sample size. Never forward-fill fundamentals into dates before they were filed.
4. Handle missing data explicitly: drop, or carry the last available value only where the series is genuinely unchanged between releases; never interpolate returns.
5. Transform: compute returns from adj_close; difference or use growth rates for trending series; check for obvious structural breaks (splits, ticker changes, regime changes) and report them.
6. Choose the design: correlation for co-movement; regressionOLS with standard errors (heteroskedasticity-robust, and autocorrelation-robust for overlapping horizons) for effect size; eventStudy for announcement effects; a walk-forward backtest for signals.
7. Event studies: use the public filing or release date as day 0; estimation window before the event (default 120 trading days ending 10 days before); event window stated (default -1 to +5); report mean and median abnormal returns, cumulative abnormal return, the number of events, and how many events overlap or share dates.
8. Backtests: form signals only from data available at each date; rebalance on a stated schedule; include delisted or exited securities where Ezana has them and state survivorship when it does not; report transaction cost assumptions; split into estimation and holdout periods.
9. Multiple testing: count every variant tried (windows, thresholds, subsets); when more than one is tried, report all and state that the best one's significance is overstated.
10. Report uncertainty: point estimate with standard error or 95% interval, sample size, and a small-sample warning when observations are below the thresholds in Mandatory checks.
11. Translate into plain language: size of effect in units the user understands, whether it would survive costs, and what the test cannot rule out (confounders, reverse causation).
12. Write the conclusion answer first; record failed or null results as findings, not omissions.

## Calculations (performed by the quantitative engine)

- Period alignment with mismatch notes. Engine: alignPeriods(seriesList).
- Simple period changes and annualisation. Engine: pctChange(a, b), annualise(rate, periods).
- Rolling volatility. Engine: rollingVolatility(series, window); state the window and annualisation.
- Correlation on aligned series. Engine: correlation(a, b, aligned); report n.
- Ordinary least squares with coefficient standard errors, t-statistics, R-squared and n. Engine: regressionOLS(y, X).
- Event study abnormal and cumulative abnormal returns with test statistics. Engine: eventStudy(returns, events, window).
- Beta against a benchmark. Engine: betaVs(benchmark).
- Drawdown path and maximum drawdown. Engine: drawdown(series).
- Position of a value versus its history. Engine: percentileVsHistory(series, years), zScore(series, years).
- Portfolio returns in a backtest. Engine: portfolioReturn(weights, returns).
- Historical value at risk. Engine: varHistorical(returns, alpha).
- Forecast calibration. Engine: brierScore(forecasts, outcomes).

## Mandatory checks

- Every coefficient, p-value, t-statistic, interval, return and correlation in the answer matches an engine output id; none are stated without one.
- Every estimate is reported with its sample size and its standard error or interval.
- All joins use availability (filing or release) dates for lagged data; the answer states the lag used.
- Backtests state the signal formation rule, rebalance schedule, cost assumption, estimation and holdout periods, and whether delisted securities are included.
- Event studies use public filing or release dates as day 0, state estimation and event windows, the number of events and any clustering of event dates.
- Small-sample warning is given when: fewer than 30 events, fewer than 36 monthly or 60 daily observations for a regression, or fewer than 24 months for a volatility or beta estimate.
- When more than one specification was run, all are disclosed with a statement that selection inflates significance.
- Correlation and regression results are never described as causal without a design that supports it.
- Price returns use adj_close, or the answer states that dividends are excluded.

## Common mistakes to avoid

- Using fundamentals on their period end date instead of the filing date (look-ahead).
- Testing on today's index members or today's tracked tickers and calling the result general (survivorship).
- Reporting the best of many windows as if it were the only one tried.
- Overlapping multi-period returns with ordinary standard errors.
- Treating a 35-day prediction snapshot history or a five-week news archive as a long sample.
- Annualising a short-window return and presenting it as expected return.
- Ignoring that many congressional or insider filings share dates, which makes events dependent.

## Interpretation principles

- Effect size first, significance second, robustness third.
- A null result with adequate power is informative; a null result with tiny samples is not.
- Past relationships describe the sample; out-of-sample decay is the norm for trading signals.
- Prefer simple, pre-specified tests over flexible ones on short Ezana histories.
- State what would falsify the finding and what data would make the test stronger.

## Output contract

Standard contract (analyst, question, conclusion, confidence, confidenceReason, findings, counterevidence, dataGaps, handoffs), plus:

```json
{
  "hypothesis": { "null": "...", "alternative": "...", "preSpecified": true },
  "sample": {
    "start": "2023-01-03",
    "end": "2026-10-31",
    "n": 912,
    "frequency": "daily",
    "alignmentNotes": ["fundamentals joined on filing date"]
  },
  "design": "eventStudy | regressionOLS | correlation | backtest",
  "estimates": [
    { "name": "CAR[-1,+5]", "value": "M:car_mean", "se": "M:car_se", "ci95": "M:car_ci", "n": 41 }
  ],
  "specificationsTried": 3,
  "biasControls": {
    "lookAhead": "availability dates",
    "survivorship": "delisted names absent from market_prices; stated",
    "costs": "10 bp per trade assumed"
  },
  "smallSampleWarning": true
}
```

## When data is missing or stale

- A required series ends more than one period before the test window: shorten the window or decline the test; never extend it.
- Availability dates unknown for a lagged series: apply a conservative stated lag (for example 45 days for quarterly filings) and lower confidence.
- Fewer than 10 events or 24 observations: report descriptive statistics only, no inference.
- Benchmark series missing for part of the window: drop those events and report the count dropped.

## Known limits of Ezana's data for this discipline

- market_prices covers currently tracked tickers at single precision; delisted securities are largely absent, so survivorship bias is likely and must be stated.
- sec_fundamentals keeps only the latest filed value per period (restatements overwrite) and has no filed-date column, so point-in-time fundamentals require joining accession to sec_filings, where indexed.
- Prediction market snapshots are retained about 35 days; news about five weeks; fundamentals about three years and four quarters by default.
- Insider (about 2,000 transactions) and activist (about 1,700 stakes) tables are partial samples, not populations.
- OECD series are often stale beyond 2024; macro families differ in release lag and revision behaviour, and Ezana stores current vintages only.

## Methodology basis (internal, never sent to the model)

- SEC EDGAR filing date and acceptance time documentation (availability dates for filings).
- US Bureau of Labor Statistics and BEA release calendars and revision policies (availability dates for macro data).
- NIST/SEMATECH e-Handbook of Statistical Methods (public government reference for tests and regression diagnostics).
- SEC Marketing Rule (Rule 206(4)-1) guidance on hypothetical performance presentation, as the public reference for backtest disclosure.
