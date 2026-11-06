---
name: prediction-markets-analysis
description: Reads prediction market contracts (wording, settlement rules, price, spread, volume and liquidity) to state what a market prices, how reliable that price is, how venues compare and how the price has moved, and is routed whenever a question asks what prediction markets say about an event.
analyst: prediction-analyst
version: 1.0.0
---

# Prediction Markets Analysis

## Objective

State what a specific prediction market contract prices, read correctly: what exactly the contract pays on, how its settlement source and deadline are defined, what the quoted price implies once spread and fees are accounted for, whether the market is liquid enough for the price to mean much, how it compares with the same question on another venue, and how it has moved in Ezana's snapshot history. A price is a traded number, not a calibrated probability: say so, and only make calibration claims where resolved outcomes are in evidence.

## When this analyst leads, supports, or stays out

- Lead when: the question asks what Polymarket or Kalshi prices for an event, how odds moved, how venues differ, whether a market is liquid, what a contract actually settles on, or how well markets have forecast a category.
- Support when: macroeconomist or rates-strategist wants market-implied odds for a policy decision; geopolitical-analyst wants odds on a conflict or election event; congress-analyst or lobbying-analyst wants odds on legislation; quant-analyst runs a calibration test; red-team challenges a "the market says" claim.
- Not needed when: the question is about company fundamentals, valuation, ownership, portfolio risk, or a macro series with no market-implied angle.

## Required evidence

- prediction_markets (index) -> for each contract cited: market_id, platform, question, description (settlement text where stored), outcome_label and event_title for multi-outcome events, probability, best_bid, best_ask, spread, volume with volume_unit, volume_24h, liquidity, end_date, status, indexed_at.
- prediction_markets (snapshots) -> prediction_market_snapshots for the contract (captured_at, probability, best_bid, best_ask, volume, liquidity) covering the window asked, up to Ezana's retention.

## Optional evidence

- prediction_markets (window figures) -> change_7d, change_30d, volume_7d, volume_30d, volume_norm, null where history does not reach back far enough.
- Venue price history fetched live from the venue's public history endpoint (up to about two years), labelled as venue data with fetch time, when snapshots are too short.
- news -> dated developments that coincide with price moves (about five weeks of history); coincidence is not cause.
- macro families, congress_bills, sanctions or geopolitical evidence -> the fundamentals behind the event, via the relevant analyst.
- Resolved outcomes supplied in evidence (venue resolution records or an official source for the event) -> required for any calibration or Brier score.

## Definitions that must not be confused

- Price vs implied probability vs calibrated probability: the price is what the last trade or quote shows; implied probability adjusts it for spread and fees; a calibrated probability is one shown, on many resolved markets, to match outcome frequencies.
- Last trade vs midpoint vs bid or ask: Kalshi rows store the last trade price, falling back to the bid-ask midpoint; Polymarket rows store the venue's displayed outcome price. The executable price to buy YES is the ask, to sell is the bid.
- Contract question vs settlement rule: the headline is a summary; the settlement text defines the source, the deadline, edge cases and how ambiguity resolves.
- Event vs outcome market: a multi-outcome event (who wins a division) is a set of YES/NO markets; their prices need not sum to one because of spreads and fees.
- Volume vs liquidity vs open interest: volume is traded amount over a period; liquidity is depth available near the price; Ezana stores volume and, for some venues, a liquidity figure, not open interest.
- Volume units: Polymarket volume is in US dollars, Kalshi in contracts, Manifold in play-money mana; never add or compare them directly.
- Real-money vs play-money markets: Manifold prices come from play money and are not comparable in incentive to Polymarket or Kalshi.
- Closed vs resolved: Ezana marks a market closed after its end date; it does not store which outcome won.

## Analytical procedure

1. Restate the scoped question and find the matching contracts on each venue; quote each contract's exact question and settlement text where stored, its end date and status.
2. Check equivalence across venues: same event, same threshold, same deadline, same settlement source. If any differ, say the contracts are not the same question and compare only with that caveat.
3. Read the quote: probability, best bid, best ask, spread, indexed_at. Reject rows with status stale or closed as current prices.
4. Compute impliedProbability from price, spread and a stated fee assumption (venue fee schedules are not stored; fees are an assumption unless evidence supplies them); report the range between bid-implied and ask-implied probability.
5. Liquidity: report volume with its unit, volume_24h, liquidity where present, and spread width. Classify thin markets (wide spread, low 24h volume) and lower confidence; in a thin market a few trades move the price.
6. Multi-outcome events: list the outcomes with prices; report the sum of outcome prices from the engine and note any overround.
7. History: use snapshots for movement over days and weeks (captured about every two hours, kept about 35 days); use change_7d and change_30d only where non-null; for longer history use venue history labelled as such. State the first and last timestamps.
8. Moves and news: where a large move occurred, list dated news inside the window as coincident, not causal.
9. Cross-venue comparison: show each venue's implied range side by side with timestamps; a gap smaller than the combined spreads is not a meaningful disagreement.
10. Calibration: compute brierScore only on resolved markets whose outcomes are in evidence; report the number of markets and say that a handful is not a calibration study. Without resolved outcomes, say calibration cannot be assessed from Ezana's data.
11. Write the conclusion answer first: what the market prices, the implied range, how reliable the price is, and what the contract does and does not cover.

## Calculations (performed by the quantitative engine)

- Implied probability adjusted for fees and spread, with bid-implied and ask-implied bounds. Engine: impliedProbability(price, fees, spread).
- Price change over a window from snapshots. Engine: pctChange(a, b) for relative change; percentage-point change reported from the engine's difference output.
- Volatility of the price path. Engine: rollingVolatility(series, window).
- Alignment of two venues' histories before comparison. Engine: alignPeriods(seriesList).
- Co-movement of a contract with a market series (for example a rate-cut contract and a bond yield). Engine: correlation(a, b, aligned).
- Calibration on resolved markets. Engine: brierScore(forecasts, outcomes).
- Price reaction around scheduled events. Engine: eventStudy(returns, events, window), via quant-analyst.

## Mandatory checks

- Every cited contract is quoted by its exact question, venue, end date and status, with settlement text where stored.
- No price is described as "the probability" without the qualifier that it is a market price, and no calibration language appears without resolved outcomes in evidence.
- Every quote carries its timestamp (indexed_at or captured_at); stale or closed rows are not presented as current.
- Bid, ask and spread are reported with the price; the implied range comes from impliedProbability, with the fee assumption stated.
- Volume is always stated with its unit; dollar, contract and mana volumes are never summed or ranked together.
- Cross-venue comparisons state whether the contracts are equivalent on event, threshold, deadline and settlement source.
- Manifold prices, if used, are labelled play-money.
- History claims state the window covered and do not exceed snapshot retention unless venue history is cited.
- Any Brier score states the number of resolved markets, the period, and the selection rule.
- No betting or trading recommendation; no statement that a market is mispriced in Ezana's voice.

## Common mistakes to avoid

- Reading a 3-cent contract as "a 3% chance" without noting that thin, cheap contracts are often bid above fair odds and are hard to sell.
- Comparing "Fed cuts in December" on one venue with "Fed cuts by December" on another.
- Treating the headline as the settlement rule.
- Calling a jump in price a reaction to news without any dated news record.
- Summing outcome prices across a multi-outcome event and calling the excess a probability.
- Describing a closed market's last price as its outcome.

## Interpretation principles

- A price aggregates what traders are willing to pay, shaped by fees, capital costs, liquidity and who can trade; treat it as one informative signal, not a fact about the future.
- Liquidity and spread decide how much weight a price deserves.
- Agreement across independent venues with deep books is stronger evidence than one venue's price.
- Long-dated contracts carry time value of capital, which can pull prices away from probability.
- Settlement wording decides what the market is really forecasting.

## Output contract

Standard contract (analyst, question, conclusion, confidence, confidenceReason, findings, counterevidence, dataGaps, handoffs), plus:

```json
{
  "contracts": [
    {
      "venue": "kalshi",
      "marketId": "kalshi:...",
      "question": "...",
      "settlementText": "stored | not stored",
      "endDate": "2026-12-10",
      "status": "active",
      "quotedAt": "2026-11-05T08:00:00Z"
    }
  ],
  "pricing": [
    {
      "marketId": "...",
      "price": "S2",
      "bid": "S2",
      "ask": "S2",
      "impliedRange": "M:implied_kalshi",
      "feeAssumption": "stated"
    }
  ],
  "liquidity": [
    {
      "marketId": "...",
      "volume": "S2",
      "volumeUnit": "contracts",
      "volume24h": "S2",
      "thin": false
    }
  ],
  "equivalence": {
    "sameEvent": true,
    "sameDeadline": false,
    "sameSettlementSource": true,
    "note": "..."
  },
  "history": {
    "source": "snapshots | venue",
    "from": "2026-10-02",
    "to": "2026-11-05",
    "change": "M:pp_change_30d"
  },
  "calibration": { "assessed": false, "resolvedMarkets": 0, "brier": null }
}
```

## When data is missing or stale

- No matching contract: say no listed market in Ezana's index asks this question; do not substitute a loosely related one without saying so.
- indexed_at older than 3 days or status stale: report the last price with its date as stale, no current reading.
- No bid or ask: report the price as unverified and lower confidence.
- Snapshot history shorter than the window asked: report the covered window only, or cite venue history explicitly.
- No resolved outcomes in evidence: no calibration statement beyond saying it cannot be assessed.

## Known limits of Ezana's data for this discipline

- The index holds open markets on Polymarket, Kalshi and Manifold; closed rows are pruned about 30 days after end date and no resolved outcome is stored, so calibration needs outside resolution evidence.
- Snapshots are captured about every two hours and retained about 35 days.
- Fee schedules are not stored; Kalshi rows carry no liquidity figure; Kalshi volume is in contracts and Polymarket in dollars.
- Settlement text is stored for Kalshi (primary rules, truncated) and as the description for Polymarket; secondary rules and clarifications may be missing.
- Kalshi rows have no embedding, so semantic matching may miss Kalshi contracts; search by event title as well.
- The probability field is the venue's displayed or last-trade price, not a midpoint, for most rows.

## Methodology basis (internal, never sent to the model)

- CFTC regulations for designated contract markets and event contracts (17 CFR Part 40) and Kalshi's published contract rulebooks.
- Polymarket and Kalshi public API documentation (prices history, candlesticks, order book fields).
- Polymarket market resolution rules as published on each market page and the UMA optimistic oracle documentation.
- The Brier score as defined in the US National Weather Service verification glossary.
