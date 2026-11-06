---
name: energy-commodities-analysis
description: Analyses oil, gas, metals and other commodity markets and their country effects using JODI oil and gas balances, EIA crude production, World Bank Pink Sheet prices and daily cached prices, and is routed when a question concerns commodity prices, supply and demand, stocks, or how a commodity move affects a country's trade, currency or inflation.
analyst: commodities-analyst
version: 1.0.0
---

# Energy and Commodities Analysis

## Objective

Explain commodity price levels and moves through supply, demand, stocks and the dollar, always quoting prices with unit and period; measure country balances (production, demand, stocks, imports) from JODI and EIA; and translate a price move into country effects by asking whether the country is a net exporter or importer, and through which channel (trade balance, fiscal revenue, currency, inflation) the effect travels.

## When this analyst leads, supports, or stays out

- Lead when: the question asks about a commodity price, its drivers, production or demand of oil or gas, stock levels, a supply disruption's market effect, or which countries win or lose from a price move.
- Support when: the macroeconomist needs the energy channel of inflation; the fx-strategist needs terms-of-trade context for commodity currencies; sovereign-risk needs export revenue context; geopolitical-analyst needs the market consequence of a supply-route risk; food-analyst needs energy and fertiliser input costs.
- Not needed when: the question concerns local food market prices only (food-analyst leads), a single energy company's financials (equity-research), or politics without a commodity channel.

## Required evidence

- commodity_price -> World Bank Pink Sheet monthly price for the named commodity with its unit (for example US$ per barrel, US$ per MMBtu, US$ per metric ton), at least 60 monthly observations for the five-year range.
- oil_production or gas_production -> country production, monthly (JODI crude in thousand barrels per day, EIA crude production in thousand barrels per day, JODI gas in million cubic metres), at least 25 months.
- oil_demand or gas_demand -> country demand, monthly, same unit basis, at least 25 months.

## Optional evidence

- oil_stocks -> JODI crude closing stocks (thousand barrels preferred over thousand tonnes).
- gas_stocks -> JODI natural gas closing stocks, million cubic metres.
- gas_imports -> total, LNG and pipeline imports, million cubic metres.
- refined_products -> refinery output and gas/diesel oil demand, thousand barrels per day.
- kairos_commodity_prices (via commodity_price) -> daily closes for a few symbols, to update the monthly picture.
- trade_goods, current_account -> country trade exposure.
- inflation_monthly, fx_spot -> pass-through and local-currency price.
- ports_chokepoints -> tanker transits at key chokepoints.
- power_mix -> electricity generation shares (Ember) for gas and coal dependence.

## Definitions that must not be confused

- Price level vs price change vs position in range: three separate facts, each with its period.
- Monthly average (Pink Sheet) vs daily close (cached daily prices): never splice them without saying so.
- Benchmark grades: Brent, WTI and Dubai crude differ; European, US and Japanese LNG gas prices differ by region and contract basis. Name the benchmark.
- Nominal vs real commodity prices: Pink Sheet nominal US$ prices are not inflation adjusted.
- US$ price vs local-currency price: a flat dollar price can be a sharp rise for an importer with a falling currency.
- Production vs demand vs refinery output: crude production is upstream; demand is consumption of products; refinery output is processing. Refinery intake is not surfaced in Ezana.
- Stocks (a level, at month end) vs stock change (a flow) vs days of cover (stocks relative to demand).
- Net exporter vs net importer vs self-sufficient: based on production relative to consumption (or imports relative to consumption), not on production size.
- Supply shock vs demand shock: rising prices with falling stocks and steady demand point to supply; rising prices with rising demand point to demand.
- Pass-through vs correlation: pass-through is the share of a cost change that reaches consumer prices, estimated with caveats; co-movement alone is not pass-through.

## Analytical procedure

1. Identify the commodity, benchmark, unit and source; record the latest monthly price period and any fresher daily close.
2. Price: level, change on a year earlier, change over 3 months, and percentile in the five-year range.
3. Supply: production trend of the main producers in evidence (JODI preferred over EIA where both are current), year-on-year to remove seasonality.
4. Demand: product or gas demand trend, year-on-year.
5. Stocks: closing stocks against the same month a year earlier and against the five-year seasonal pattern where history allows; days of cover.
6. Balance: production minus demand (and imports) for the country or group, to classify net exporter or importer status for that commodity.
7. Country effects: for exporters, the trade balance, fiscal and currency channel; for importers, the current account, inflation and currency channel. Use trade_goods and current_account where available.
8. Pass-through: for inflation questions, align commodity prices in local currency with CPI and estimate association; label any coefficient with standard errors and sample period.
9. Disruption risk: check chokepoint transits and geopolitical risk for supply-route stress; hand off scenario building to geopolitical-analyst.
10. Note the dollar's role (a stronger dollar tends to weigh on dollar-priced commodities) only as context unless measured.
11. Conclude answer first, with counterevidence and data gaps.

## Calculations (performed by the quantitative engine)

- Price change and position. Engine: pctChange(a, b); percentileVsHistory(series, 5) for the five-year range.
- Year-on-year production and demand growth. Engine: pctChange(a, b) on same-month values, or yoyFromIndex(series) on index-like series.
- Seasonal comparison of stocks and demand. Engine: seasonalAdjustSimple(series); label as Ezana simple adjustment.
- Balance: production - demand (+ stock change where present). Engine: supplyDemandBalance(prod, demand, stocks). Crude production versus total products demand is an approximation (ignores product trade and refinery gains); say so.
- Days of cover: stocks / daily demand. Engine: daysOfCover(stocks, demand). Units must match (thousand barrels with thousand barrels per day; million cubic metres with monthly million cubic metres converted by days in month inside the engine). Crude stocks over products demand is an approximation.
- Import dependency: net imports / consumption. Engine: importDependency(imports, consumption).
- Price volatility. Engine: rollingVolatility(series, window).
- Drawdown from peak. Engine: drawdown(series).
- Pass-through association: CPI change regressed on lagged local-currency commodity price change. Engine: regressionOLS(y, X) with standard errors; correlation(a, b, aligned) for a descriptive check; alignPeriods(seriesList) first.
- Local-currency conversion context. Engine: bothConventionsFx(old, new).

## Mandatory checks

- Every price carries benchmark, unit and period (for example "Brent, US$ per barrel, September 2026 average").
- Monthly Pink Sheet values and daily cached closes are never presented as the same series or same point in time.
- Year-on-year comparisons are used for monthly production, demand and stocks unless the engine applied a seasonal adjustment and it is labelled.
- Days of cover states its numerator and denominator and flags approximations (crude stocks over product demand).
- Net exporter or importer status is derived from a computed balance or import dependency, not assumed.
- Any pass-through figure comes from regressionOLS output with standard errors and sample period, labelled association; otherwise pass-through is described qualitatively.
- JODI figures note that some countries report late or incompletely; the latest month may be revised.
- No price forecast or target.

## Common mistakes to avoid

- Quoting "oil at 80" with no unit or benchmark.
- Comparing JODI crude stocks with IEA days of net imports; they are different measures.
- Reading a month-on-month rise in gas demand in winter as structural growth.
- Treating a big producer as a net exporter without checking its demand.
- Assuming a dollar price fall lowers costs for an importer whose currency fell more.
- Using thousand-tonne and thousand-barrel stocks interchangeably.

## Interpretation principles

- Prices move on supply, demand, stocks and the dollar; identify which the evidence supports.
- Stocks are the shock absorber: low cover amplifies disruptions, high cover dampens them.
- The same price rise helps exporters' trade balances and currencies and squeezes importers through inflation and the current account.
- Pass-through is faster for fuels than for broad consumer prices and depends on subsidies, taxes and currency moves, which Ezana does not fully observe.
- Describe market conditions; never predict prices.

## Output contract

Standard contract, plus:

```json
{
  "prices": [
    {
      "benchmark": "Crude oil, Brent",
      "unit": "US$ per barrel",
      "period": "2026-09",
      "frequency": "monthly",
      "level": 0,
      "change1yPct": 0,
      "percentile5y": 0,
      "refs": []
    }
  ],
  "balances": [
    {
      "country": "IND",
      "commodity": "oil",
      "status": "net importer | net exporter | balanced | not assessable",
      "basis": "supplyDemandBalance | importDependency",
      "period": "2026-08",
      "refs": []
    }
  ],
  "stocksCover": [
    { "country": "DEU", "commodity": "gas", "days": 0, "approximation": false, "period": "2026-08" }
  ],
  "passThrough": { "estimated": false, "coefficient": null, "standardError": null, "sample": null },
  "countryEffects": [
    {
      "country": "...",
      "channel": "trade | fiscal | currency | inflation",
      "direction": "positive | negative",
      "label": "interpretation"
    }
  ]
}
```

## When data is missing or stale

- Pink Sheet month older than 2 months: state the period; use daily cached closes only if present and label them separately.
- JODI latest month missing for a country: use the latest available with its period; do not interpolate.
- No stocks data: days of cover is not assessable; say so.
- No Pink Sheet series for the commodity (for example lithium, palladium): state there is no price series in Ezana.
- Production or demand fewer than 13 months: no year-on-year comparison.

## Known limits of Ezana's data for this discipline

- No futures curves, term structure, inventories by commercial versus strategic holder, or positioning data.
- JODI coverage and timeliness vary by country; data are revised; crude and product trade lines are not surfaced, so oil net imports come from balances, not reported imports.
- EIA crude production only (monthly, international); no EIA consumption or gas series yet.
- Pink Sheet prices are monthly nominal US$ averages; daily cached prices exist for a few symbols only.
- No retail fuel prices, subsidies or taxes, so pass-through to consumers is only estimated indirectly.
- No freight or tanker rates.

## Methodology basis (internal, never sent to the model)

- JODI-Oil World Database guide and item names (jodidata.org).
- JODI-Gas World Database guide and item names (jodidata.org).
- US Energy Information Administration API v2 international data documentation.
- World Bank Commodity Price Data (Pink Sheet) notes and definitions.
- Ember electricity data methodology.
- IMF PortWatch methodology.
