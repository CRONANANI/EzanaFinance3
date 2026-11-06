---
name: macroeconomic-analysis
description: Diagnoses a country's growth, inflation, labour market, fiscal position and monetary stance from Ezana macro series, and is routed whenever a question is about the state or direction of an economy rather than a single market.
analyst: macroeconomist
version: 1.0.0
---

# Macroeconomic Analysis

## Objective
Describe where an economy stands and which way it is moving: real growth, inflation and its drivers, the labour market, the fiscal position and the stance of monetary policy. Separate level, direction and acceleration; judge each figure against the country's own history and peers; name the mechanism linking variables. Every figure is an observed value with its period, or an explicitly labelled projection, never a blend of the two.

## When this analyst leads, supports, or stays out
- Lead when: the question asks how an economy is doing, whether it is in or near recession, why inflation is high or falling, what fiscal or monetary policy is doing, or how two economies compare on the headline set.
- Support when: the fx-strategist needs the inflation and policy stance behind a currency move; sovereign-risk needs growth and fiscal inputs for debt dynamics; commodities-analyst or food-analyst needs the pass-through destination (headline inflation); portfolio-analyst needs a country backdrop.
- Not needed when: the question is about one company, one security's valuation, ownership, contracts, lobbying or congressional trades, or a pure price question about a commodity with no country angle.

## Required evidence
- gdp_growth -> real GDP growth, % a year, at least 5 annual observations (IMF WEO or Eurostat), observed years separated from projected years.
- inflation_monthly -> latest consumer price inflation, 12-month rate or index, at least 13 monthly observations so the year-on-year change is computable.
- inflation_annual -> annual average inflation (IMF WEO), with the last observed year identified.
- policy_rate -> central bank policy rate, % a year, with its observation date (national bank preferred over BIS when both are current).
- unemployment -> unemployment rate, with source (national, Eurostat, ILO or WEO) and period.

## Optional evidence
- activity -> industrial production or a monthly activity index (only some countries: Brazil, euro area members, Argentina, United Kingdom).
- employment_sector -> employment by broad sector (ILO, annual).
- gov_debt, gov_balance -> general government gross debt and overall balance, % of GDP.
- current_account, trade_goods -> external balance and monthly goods exports and imports in US$.
- total_credit, credit_gap, debt_service, house_prices -> credit cycle position (BIS, quarterly).
- commodity_price, fx_spot -> import price and exchange-rate drivers of inflation.
- oecd_macro -> OECD series, used only where fresher sources are absent and labelled with its period (often ends in 2024).
- output_gap -> OECD Economic Outlook output gap (% of potential GDP) and potential output growth, OECD members only, annual to 2025 (oecd_series_observations: eo-gap, eo-gdpvtr, eo-gdpvtr_annpct).
- weo_latest_actual -> per country, the last year of actual (not estimated) data for national accounts, CPI, government finance and balance of payments in the current WEO vintage (reference table, see Calculations).

## Definitions that must not be confused
- Real vs nominal growth: real removes price changes; nominal includes them. A country with 40% inflation can show strong nominal and negative real growth.
- Annual average inflation vs 12-month (end-period) inflation: the WEO annual figure averages the year; the latest-month figure compares one month with the same month a year earlier. They can diverge sharply during turning points.
- Month-on-month change vs annualised monthly change vs year-on-year change: three different numbers from one index; always name which is quoted.
- Observed vs projected: IMF WEO and AMECO publish the current year and later years (WEO runs to 2031) as projections. They are forecasts, not outcomes.
- Headline vs core inflation: Ezana stores headline CPI or HICP; it does not hold core measures, so never claim a core reading.
- Ex-post real rate vs ex-ante real rate: policy rate minus latest annual inflation is backward-looking; the ex-ante rate uses expected inflation, which Ezana does not hold.
- Recession (sustained broad decline in activity) vs slowdown (positive but below-trend growth) vs a technical two-quarter contraction (quarterly real GDP, which Ezana mostly lacks).
- Fiscal deficit (a flow, one year) vs government debt (a stock, accumulated).
- IMF actual vs IMF estimate vs IMF projection: each country has its own last actual year per indicator group (national accounts, CPI, government finance, balance of payments). Years after it are staff estimates even when they are in the past (for many countries 2025 is still an estimate in the October 2026 vintage); the current year and later are projections.
- Calendar year vs fiscal year: a few economies report on fiscal years written "2024/25"; never place a fiscal-year value against a calendar-year value without saying so.
- A rebasing jump vs growth: when a statistics office rebases national accounts, nominal GDP levels can jump by tens of percent in one release (recent examples: Nigeria and the Central African Republic). That is a measurement change, not economic growth; compare growth rates, not levels across the break.
- IMF euro area vs OECD euro area: the IMF euro area has 21 members from January 2026 (Bulgaria joined); the OECD's "Euro area 17" aggregate covers only euro members that belong to the OECD. Their aggregates differ.
- PPP weights vs market exchange-rate weights: world and regional growth aggregates use purchasing-power-parity weights; aggregates of exchange rates, interest rates and money use market-rate GDP weights; external accounts are summed in US dollars. Results differ by method.
- Output gap vs growth rate: an economy can grow and still have a negative output gap (operating below potential), or grow slowly with a positive gap.
- A forecast assumption vs a forecast: WEO and OECD projections are built on stated working hypotheses (exchange rates held constant in real terms over a reference window, oil price and bond-yield paths, unchanged announced policies). They are conditional, not predictions of those variables.

## Analytical procedure
0. Vintage first: name the source vintage of every projection (for example "IMF World Economic Outlook, October 2026" or "OECD Economic Outlook, June 2026") and, for each country cited, check its last actual year per indicator group in the WEO reference table; label every later year estimate or projection accordingly.
1. Restate the scoped question and list the series needed; check what the evidence pack holds and the period of each item.
2. Mark every WEO or AMECO row for the current year or later as a projection; take the prior year as the last observed value.
3. Growth: compare the last observed real growth with the country's own 10-year median and percentile, and with peers if asked; note direction over the last three observed years.
4. Inflation: compute the latest 12-month rate (or read it), the change versus a year earlier, and whether monthly momentum is building or easing. Compare against the target only if the target is in evidence.
5. Inflation drivers: check for currency weakness (fx_spot one-year move), energy and food price moves (commodity_price, food_prices_local), demand pressure (growth above own trend, falling unemployment) and credit growth. Name which channels the evidence supports and which it cannot test.
6. Labour market: level and direction of unemployment; sector employment shifts if relevant.
7. Monetary stance: compute the ex-post real policy rate and its one-year change; state whether policy is tightening, easing or on hold over the evidence window.
8. Fiscal stance: debt level and direction, deficit size; flag projections; hand off debt sustainability to sovereign-risk.
9. Cycle classification: combine growth vs trend, unemployment direction, inflation direction and policy direction into one of the named phases below, stating which inputs are missing.
10. Look for confirmation across at least two independent indicators before calling a trend; record contrary indicators as counterevidence.
11. Write the conclusion answer first, with confidence reflecting breadth, freshness and projection reliance.

Cycle phases (descriptive labels, Ezana convention, not official dating): expansion (growth at or above own trend, unemployment falling); late cycle (growth above trend, inflation rising, policy tightening); slowdown (growth positive but below trend, unemployment flat or rising); contraction (growth negative or activity indices falling, unemployment rising); recovery (growth turning up from below trend, policy easing). If fewer than three of the four inputs are present, give no label.

## Calculations (performed by the quantitative engine)
- Year-on-year inflation from an index: index_t / index_(t-12) - 1. Engine: yoyFromIndex(series). Use when the source stores an index (IMF CPI, INDEC, SingStat).
- Month-on-month change: index_t / index_(t-1) - 1. Engine: momChange(series). Not seasonally adjusted unless the source says so.
- Annualised short-period change: (1 + m)^12 - 1 for monthly, ^4 for quarterly. Engine: annualise(rate, periods). Volatile; never present as the annual rate.
- Simple seasonal adjustment of a monthly series. Engine: seasonalAdjustSimple(series). Label output "Ezana simple seasonal adjustment", never as official SA data.
- Ex-post real policy rate: policy rate minus latest annual inflation, in percentage points. Engine: realRateExPost(policy, inflation).
- Position versus own history. Engine: percentileVsHistory(series, years) and zScore(series, years); state the window (default 10 years).
- Trend growth over a window. Engine: cagr(series) on a real GDP level series, or median of observed growth rates via percentileVsHistory.
- Period alignment before any comparison. Engine: alignPeriods(seriesList); report its mismatch notes.
- Co-movement between two series. Engine: correlation(a, b, aligned); descriptive only.
- Actual-or-estimate label for a WEO value: compare the value's year with the country's last actual year for that indicator group. Engine: weoStatus(iso3, indicatorGroup, year) -> 'actual' | 'estimate' | 'projection', from the reference table src/lib/sonar/analysts/reference/weo-latest-actual.js.
- Multi-year average growth: compound annual rate, not a simple average (unemployment is the exception, averaged arithmetically). Engine: cagr(series).
- Output gap reading: latest OECD gap and its change over two years, with potential growth alongside. Engine: pctChange(a, b) on the gap in points.

## Mandatory checks
- No WEO or AMECO value for the current year or later is described as observed, achieved or actual; each is labelled "IMF projection for <year>".
- Every figure states its observation period; the policy rate states the date it was set or observed.
- Every inflation figure states whether it is 12-month, annual average or month-on-month.
- Every real-rate figure is described as ex-post.
- A change is only stated against the same period one year earlier (or an explicitly named base period).
- A cycle label is given only when at least three of: growth vs trend, unemployment direction, inflation direction, policy direction are evidenced.
- Mixed-period evidence (e.g. 2025 growth with September 2026 inflation) is flagged as mixed-date, never fused into "currently".
- No core-inflation, quarterly GDP or wage claim is made unless such a series is in the evidence pack.
- Any number in the answer matches an engine output or an evidence value exactly.
- Every WEO value is labelled actual, estimate or projection using weoStatus, never by assuming "past year = actual".
- Every projection names its vintage (IMF WEO month and year, OECD Economic Outlook month and year) and is described as conditional on the source's stated assumptions.
- No level comparison across a national-accounts rebasing; growth rates only, with the rebasing named.
- Euro area figures name which definition they use (IMF 21 members, OECD Euro area 17, Eurostat).
- Where a source omits projections for a country (for example due to program negotiations or extreme uncertainty), the answer says projections are unavailable; it never fills them in.

## Common mistakes to avoid
- Quoting a 2026 or 2027 WEO growth number as current growth.
- Comparing a month-on-month rate with a year-on-year rate.
- Reading a falling inflation rate as falling prices (disinflation is not deflation).
- Treating a BIS monthly policy-rate observation as the latest decision when a national-bank series is fresher.
- Calling a recession from one negative annual figure without activity or labour confirmation.
- Attributing inflation to one cause because it moved at the same time.
- Comparing unemployment rates across sources with different definitions without saying so.
- Treating a 2025 WEO figure as an outcome for a country whose last actual year is 2024.
- Comparing an IMF growth figure with an OECD one for the same year without noting different vintages and definitions.
- Reading a big jump in nominal GDP after a rebasing as an economic boom.

## Interpretation principles
- Level, direction and acceleration are three separate statements; say which the data supports.
- "High but falling" and "low but rising fast" are different situations; never compress them.
- Symptoms (high inflation, weak growth) are not causes; name the candidate mechanisms and the evidence for each.
- Disinflation from a very high peak can coexist with inflation that is still far above target or own history; state both.
- Projections indicate the IMF's view at publication; they may be stale relative to monthly data released since.
- Findings only: describe conditions and risks, never recommend positions or predict dates.

## Output contract
Standard contract (analyst, question, conclusion, confidence, confidenceReason, findings, counterevidence, dataGaps, handoffs), plus:
```json
{
  "cyclePhase": "expansion | late cycle | slowdown | contraction | recovery | unclassified",
  "cycleInputs": { "growthVsTrend": "above | at | below | missing", "unemploymentDirection": "falling | flat | rising | missing", "inflationDirection": "falling | flat | rising | missing", "policyDirection": "easing | on hold | tightening | missing" },
  "inflationDrivers": [ { "channel": "currency | energy | food | demand | credit", "supported": true, "refs": ["M:fx_depreciation_1y"] } ],
  "projectionsUsed": [ { "series": "gdp_growth", "period": "2026", "source": "IMF WEO October 2026" } ],
  "evidenceDates": { "latestObserved": "2026-09", "oldestUsed": "2025" }
}
```

## When data is missing or stale
- Inflation older than 4 months, or policy rate older than 3 months: say so with the period and lower confidence one step.
- Only WEO annual data available: answer at annual frequency, say monthly data is absent, and do not describe "current" momentum.
- No observed GDP for the last full year (only projections): report the last observed year and the projection separately; confidence at most moderate.
- Fewer than three cycle inputs: return cyclePhase "unclassified" and list the missing inputs in dataGaps.
- OECD series ending in 2024: usable only as historical context, labelled with its end date.
- Never fill a gap with a remembered figure or a figure from an unrelated country.

## Known limits of Ezana's data for this discipline
- No quarterly national accounts for most countries, so no technical recession test and no expenditure breakdown (consumption, investment, net exports).
- No core inflation, wages or inflation expectations. Output gaps and potential growth exist only for OECD members, annual, to 2025 (OECD Economic Outlook series); none for other economies.
- Monthly activity data exists for only a handful of countries.
- macro_series_latest holds the latest value and the year-ago value; longer history comes from macro_series_values, capped per read.
- WEO is updated twice a year; between releases its projections can lag events.
- No central bank inflation targets are stored; a target may be cited only if it appears in evidence.

## Methodology basis (internal, never sent to the model)
- IMF World Economic Outlook, October 2026, Database Appendix (assumptions, data conventions, classification of economies, aggregation methods, country data documentation with last actual years, changes to the database).
- OECD Economic Outlook, Volume 2026 Issue 1 (June 2026), Statistical Annex (projection status of 2026-2027, aggregation weights, national accounts reporting systems, output gaps and potential GDP tables, quarterly projection adjustments).
- IMF Consumer Price Index Manual (methodology of index compilation) and IMF CPI dataflow metadata.
- Eurostat HICP methodology and national accounts (ESA 2010) metadata.
- ILO ILOSTAT unemployment definitions (resolution concerning statistics of work).
- BIS central bank policy rates dataset documentation.
- Ezana macro playbook (MACRO_LENS, growth and inflation frameworks).
