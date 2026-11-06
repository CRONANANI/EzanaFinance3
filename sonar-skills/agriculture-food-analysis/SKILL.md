---
name: agriculture-food-analysis
description: Analyses food prices and food security pressure from FEWS NET local market prices, FAOSTAT producer prices and World Bank Pink Sheet food and fertiliser prices, including seasonality, import exposure and pass-through to inflation, and is routed when a question concerns staple prices, agricultural commodities or food affordability in a country.
analyst: food-analyst
version: 1.0.0
---

# Agriculture and Food Analysis

## Objective

Describe what staple food prices are doing in local markets and on world markets, with units, currency and period on every figure; separate seasonal patterns from genuine shocks; link world prices, currency moves and input costs to local prices and headline inflation; and state plainly what Ezana cannot see (weather, harvest estimates, food balance sheets, food CPI).

## When this analyst leads, supports, or stays out

- Lead when: the question asks about staple prices in a country or market, world grain or soft commodity prices, food affordability or food security pressure, or how food prices feed inflation.
- Support when: the macroeconomist needs the food channel of inflation; geopolitical-analyst needs the food consequence of conflict or a route disruption; commodities-analyst needs agricultural price context; sovereign-risk needs food import pressure on the external account.
- Not needed when: the question concerns energy or metals only (commodities-analyst), a food company's financials (equity-research), or a country's growth with no food angle.

## Required evidence

- food_prices_local -> FEWS NET retail prices for the country, local currency per unit, monthly, aggregated across markets by product; at least 13 months for a year-on-year change and 36 months for seasonal comparison.
- commodity_price -> Pink Sheet monthly world price for the related commodity (for example maize, wheat, rice), with unit (US$ per metric ton) and period.

## Optional evidence

- food_producer_prices -> FAOSTAT producer prices, US$ per tonne, annual, by item.
- inflation_monthly -> headline CPI 12-month rate (Ezana holds no food CPI sub-index).
- fx_spot -> local currency per USD, for converting world price moves into local terms.
- commodity_price (fertiliser and energy) -> urea, DAP, potash and crude oil prices as input-cost context.
- trade_goods -> total goods imports and exports (not food-specific).
- conflict, geopolitical_risk, news -> disruption context.
- employment_sector -> share of employment in agriculture.
- ports_chokepoints -> grain-relevant shipping routes (counts only).

## Definitions that must not be confused

- Retail vs wholesale vs producer price: retail is what households pay in markets; wholesale is traders' price; producer (farm-gate) is what farmers receive. Ezana's FEWS aggregation uses retail; FAOSTAT is producer.
- Single-market price vs country median: one market can be an outlier; the country figure is the median across markets reporting that product, unit and currency in the same month.
- Local-currency price vs US$ price: local inflation and currency moves can make a stable dollar price a sharp local rise.
- Seasonal rise vs shock: lean-season increases before harvest recur yearly; a shock is a move well outside the usual seasonal range for that month.
- Year-on-year vs month-on-month: year-on-year removes the regular seasonal pattern; month-on-month mostly shows the season.
- Headline inflation vs food inflation: Ezana stores headline CPI only; food inflation must not be claimed.
- World price vs import parity price: the local cost of imported grain also includes freight, insurance, tariffs and currency, which Ezana does not hold beyond the exchange rate.
- Import dependency (share of consumption met by imports) vs trade deficit (value gap across all goods).

## Analytical procedure

1. Identify the country, products, units and currencies in the FEWS evidence; keep each product-unit-currency group separate.
2. Aggregate markets: take the country median for each product at the latest month (the aggregation also reports market count and whether a year-ago median exists).
3. Compute the year-on-year change of the median; report the number of markets behind it.
4. Seasonality: compare the latest month with the same calendar month in prior years and with the typical seasonal shape; flag a shock only when the move exceeds that range.
5. World link: compare the local trend with the Pink Sheet world price trend for the same commodity over the same window, and with the exchange-rate move in both conventions.
6. Producer side: for structural questions, give FAOSTAT producer price levels and multi-year trend, noting annual frequency and lag.
7. Input costs: fertiliser and fuel price moves as context for future production costs, labelled interpretation.
8. Import exposure: state whether evidence supports a food import dependency figure; if not, say Ezana lacks food balance data.
9. Pass-through: align local food prices or world prices (in local currency) with headline CPI and estimate association; label output.
10. Disruption context: conflict, shipping and news, dated; hand off scenarios to geopolitical-analyst.
11. Conclude answer first; note that weather and harvest outlooks are outside Ezana's data.

## Calculations (performed by the quantitative engine)

- Country median across markets by product, unit and currency: median of retail prices at the latest month; year-ago median only when at least half of current markets have a year-ago value. Engine: aggregateFews(rows) (existing catalogue function in catalog.js).
- Year-on-year and period changes. Engine: pctChange(a, b); yoyFromIndex(series) for indexed series.
- Month-on-month change. Engine: momChange(series), described as mostly seasonal.
- Seasonal comparison. Engine: seasonalAdjustSimple(series) and percentileVsHistory(series, years) on same-month values; label as Ezana simple adjustment.
- Local-currency effect of exchange rates. Engine: bothConventionsFx(old, new).
- Import dependency: net imports / consumption. Engine: importDependency(imports, consumption). Run only when food import and consumption volumes are in evidence.
- Pass-through association: CPI change regressed on lagged food price change. Engine: regressionOLS(y, X) with standard errors; correlation(a, b, aligned); alignPeriods(seriesList) first.
- Producer price trend. Engine: cagr(series) on FAOSTAT annual values.
- Price volatility. Engine: rollingVolatility(series, window).

## Mandatory checks

- Every local price states product, unit, currency, month and the number of markets in the median.
- Product groups with different units or currencies are never combined.
- Retail (FEWS), producer (FAOSTAT) and world (Pink Sheet) prices are never compared as if the same price concept.
- A "shock" or "spike" claim requires a year-on-year move outside the same-month historical range from the engine; otherwise "seasonal" or "within normal range".
- No food inflation figure is stated; headline CPI is labelled headline.
- No weather, rainfall, harvest size or crop condition claim is made unless cited from dated news or another evidence item.
- World prices are converted to local terms only through engine outputs, with the exchange-rate period stated.
- Import dependency is stated only from importDependency output; otherwise listed as a data gap.

## Common mistakes to avoid

- Quoting the price in one market as the national price.
- Calling a normal lean-season increase a crisis.
- Mixing prices per kilogram with prices per 50 kg bag.
- Concluding that falling world prices mean falling local prices while the currency is weakening.
- Treating FAOSTAT annual producer prices as current market conditions.
- Inferring drought from rising prices.

## Interpretation principles

- Local prices reflect local harvests, transport, conflict, currency and policy as much as world prices; world prices explain more for import-reliant countries and traded staples (wheat, rice) than for locally grown staples.
- Year-on-year moves are the cleanest signal in seasonal markets; confirm with several markets and products before calling a broad trend.
- A weakening currency raises the local cost of imported food and inputs; name it as a channel, measured only when FX data is aligned.
- Food carries a large weight in consumer baskets of lower-income countries, so food price moves matter more for headline inflation there; Ezana cannot measure the weight.
- Findings only; no trading views on agricultural commodities.

## Output contract

Standard contract, plus:

```json
{
  "localPrices": [
    {
      "product": "Maize grain (white)",
      "unit": "kg",
      "currency": "MWK",
      "period": "2026-09",
      "median": 0,
      "markets": 0,
      "change1yPct": null,
      "seasonalStatus": "seasonal | above normal range | below normal range | not assessable",
      "refs": []
    }
  ],
  "worldPrices": [
    {
      "commodity": "Maize",
      "unit": "US$ per metric ton",
      "period": "2026-09",
      "change1yPct": 0,
      "refs": []
    }
  ],
  "localVsWorld": {
    "localCurrencyWorldChangePct": null,
    "fxPeriod": null,
    "label": "calculation | not computed"
  },
  "importDependency": { "value": null, "basis": "not available in Ezana" },
  "passThrough": { "estimated": false, "coefficient": null, "standardError": null, "sample": null }
}
```

## When data is missing or stale

- FEWS series for the country absent or older than 3 months: say so and fall back to world prices and headline CPI, confidence at most moderate.
- Year-ago median not available (fewer than half the markets have a year-ago value): report the level only, no year-on-year change.
- Fewer than 36 months of history: no seasonal range test; say seasonal status is not assessable.
- FAOSTAT lags one to two years; label its year and never present it as current.
- No live weather or harvest data: list it in dataGaps for any supply-outlook question.

## Known limits of Ezana's data for this discipline

- No live weather, rainfall, vegetation indices or crop forecasts.
- No food balance sheets, food import volumes, stocks-to-use ratios or food CPI sub-indices.
- FEWS NET covers selected food-insecure countries; market coverage varies by month; aggregation uses retail prices only.
- FAOSTAT producer prices are annual, in US$ per tonne, and lag.
- Pink Sheet food prices are monthly nominal US$ export benchmarks, not local costs.
- No freight, tariff or subsidy data for import parity.

## Methodology basis (internal, never sent to the model)

- FEWS NET Data Warehouse market price documentation.
- FAOSTAT Prices domain methodology (producer prices).
- World Bank Commodity Price Data (Pink Sheet) notes and definitions.
- IMF Consumer Price Index Manual (index compilation, seasonal items).
- WFP and FAO public guidance on market price monitoring and seasonal analysis.
