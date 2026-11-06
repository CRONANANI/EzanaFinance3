---
name: portfolio-risk-analysis
description: Measures an organization's or user's portfolio weights, concentration, sector exposure, benchmark-relative return, tracking error, beta, drawdown, historical VaR and stress scenarios, and interprets IPS and mandate compliance for student-managed funds, using only tenant-scoped data for the active organization.
analyst: portfolio-analyst
version: 1.0.0
---

# Portfolio Risk Analysis

## Objective

Describe what a portfolio holds and what risks it carries: how concentrated it is, which sectors and names dominate, how it has moved against its benchmark, how sensitive it is to the market, how deep its drawdowns have been, what a historical loss threshold looks like, and how it would fare under stated shocks. For organizations, read the fund's investment policy statement and mandate and say which rules the current book meets, breaches or cannot be checked. Use only the active organization's data, read through its own scoped sources. Frame findings educationally for student funds: explain the measure, then the result; the committee decides.

## When this analyst leads, supports, or stays out

- Lead when: the question is about "our fund", "our portfolio" or a stated set of holdings and weights: concentration, sector tilt, risk, benchmark comparison, drawdown, VaR, stress scenarios, IPS compliance, or whether a candidate position fits the mandate.
- Support when: valuation or equity-research is answering a fund-fit question and needs current weights and IPS checks; ownership-analyst checks crowding in the fund's names; macroeconomist or fx-strategist explain how a shock would reach the book; quant-analyst runs a backtest on the fund.
- Not needed when: the question is about a single security with no portfolio context, a macro or policy topic, or ownership of a stock by outside institutions.

## Required evidence

- org_portfolio -> the active organization's positions from the org position book (org_id scoped, active rows only): ticker, shares, avg_cost, current_price, sector, last_priced_at, priced flag, value; plus org_fund_snapshots (snapshot_date, total_value, total_cost, return_pct, benchmark_return_pct, benchmark_symbol, benchmark_source) for history.
- market_prices -> daily adj_close for every holding and the benchmark covering at least 252 trading days for risk statistics.
- org_ips -> the active IPS rules (rule type, value, severity, label) and the fund mandate (thesis, horizon, style, benchmark, focus and excluded sectors, minimum market cap).

## Optional evidence

- sec_fundamentals and company_profile_segments -> holding-level fundamentals and segment exposure, via equity-research.
- holdings_13f -> crowding context per holding, via ownership-analyst.
- macro families (policy_rate, fx_spot, commodity_price, inflation_monthly) -> to design and justify stress shocks.
- org_research_notes -> the fund's own pitch notes, as the fund's views, never Ezana's.
- For an individual user: the holdings and weights the user supplied in the question, labelled as user-supplied.

## Definitions that must not be confused

- Cost-basis return vs time-weighted return: Ezana's stored fund return is unrealised profit on current holdings over their cost; it is not a time-weighted or money-weighted performance figure and ignores closed positions and cash flows.
- Priced vs carried at cost: a position without a current price is valued at its average cost and contributes nothing to return.
- Benchmark return from the index vs proxy benchmark: benchmark_source tells whether the comparison uses the configured benchmark's price return or a fallback proxy; label it.
- Active return vs tracking error: active return is the difference in returns; tracking error is the volatility of that difference.
- Beta vs correlation: beta scales with relative volatility; correlation does not.
- Historical VaR vs expected shortfall vs maximum drawdown: VaR is a loss threshold at a confidence level over a horizon from past returns; drawdown is the peak-to-trough path actually experienced.
- Stress test vs forecast: a stress test applies a stated hypothetical shock; it is not a prediction.
- IPS rule breach vs warning vs not checkable: the deterministic check returns pass, warn, fail or unknown; some rule types are not evaluated.
- Sector exposure vs factor exposure: Ezana stores sector labels per position; it holds no factor loadings, so factor exposure beyond market beta is not available.

## Analytical procedure

1. Confirm scope: the active organization from the session context (never from question text), the caller's active membership, and that every row read carries that org_id. For a user question, use only user-supplied holdings.
2. Build current weights from position values; report the share of value that is priced versus carried at cost and the oldest last_priced_at date.
3. Concentration: largest weights, top-5 and top-10 share with concentrationTopN, herfindahl on weights, and the effective number of positions derived by the engine.
4. Sector exposure: weights by sector label; flag positions with no sector; compare with benchmark sector weights only if they are in evidence.
5. Return history: read org_fund_snapshots; state that return_pct is cost-basis and point-in-time; for a holdings-based view, compute portfolioReturn on current weights over a stated window and label it "current weights applied backward" (not the fund's realised history).
6. Benchmark-relative: active return and trackingError against the configured benchmark over the same aligned window; state benchmark_source.
7. Market sensitivity: betaVs on aligned daily or weekly returns, with window and standard error.
8. Downside: drawdown on the fund value series and on the current-weights series (labelled separately); varHistorical at 95% and 99%, one-day and ten-day if requested, with window.
9. Stress tests: apply shocks with stressTest (for example equity market down 20%, a sector down 30%, a rate shock via beta to a rates-sensitive proxy); justify each shock from evidence or label it hypothetical; never call it a forecast.
10. IPS and mandate: map each active rule to the book (position cap, sector cap, number of positions, prohibited tickers and sectors, minimum market cap, cash floor, single-trade cap) and report pass, warn, fail or not checkable, with the rule's own severity. Note rules the deterministic check does not evaluate and evaluate them only where the data allows.
11. For a candidate position, show the IPS checks and the pro forma weights it would create; leave the decision to the committee.
12. Write the conclusion answer first, educational in tone, with confidence reflecting pricing coverage and history length.

## Calculations (performed by the quantitative engine)

- Portfolio return from weights and returns. Engine: portfolioReturn(weights, returns).
- Tracking error: standard deviation of portfolio minus benchmark returns, annualised. Engine: trackingError.
- Beta against the benchmark with standard error. Engine: betaVs(benchmark) after alignPeriods(seriesList).
- Drawdown path and maximum drawdown with dates. Engine: drawdown(series).
- Historical value at risk at confidence alpha over a stated window. Engine: varHistorical(returns, alpha).
- Stress loss under stated shocks. Engine: stressTest(holdings, shocks).
- Concentration: top-N share and Herfindahl on weights. Engine: concentrationTopN(values, n), herfindahl(shares).
- Rolling volatility of portfolio returns. Engine: rollingVolatility(series, window).
- Period change in fund value. Engine: pctChange(a, b).

## Mandatory checks

- Every row used belongs to the active organization; no cross-organization data, no data named in the question text that the session did not scope.
- The share of value carried at cost (unpriced) and the oldest price date are stated; if more than 20% of value is unpriced, risk statistics are labelled unreliable.
- Stored fund return is described as cost-basis unrealised return on current holdings, not time-weighted performance.
- Any return series built from current weights is labelled as current weights applied backward, distinct from the fund's realised history.
- benchmark_source is stated whenever a benchmark return is quoted; a proxy is never called the index.
- VaR states confidence level, horizon and lookback window; stress results state each shock and its justification or "hypothetical".
- Each IPS rule is reported as pass, warn, fail or not checkable; cash floor rules are not checkable because positions carry no cash balance.
- No buy, sell, size or rebalance instruction in Ezana's voice; candidate-position output is pro forma weights and checks for the committee.
- Factor exposure beyond market beta and sector weights is not claimed.

## Common mistakes to avoid

- Treating cost-basis return as the fund's performance against the benchmark over the term.
- Computing VaR from 40 days of snapshots.
- Ignoring unpriced CSV-imported positions that sit at cost.
- Calling a sector "overweight" without benchmark sector weights in evidence.
- Treating a warn-severity IPS rule as a hard breach, or a block-severity rule as advisory.
- Reading positions or rules from another organization the user mentions.
- Presenting stress results as expected losses.

## Interpretation principles

- Concentration and sector tilt explain most of a small fund's risk; say which few positions drive it.
- Tracking error tells how different the fund is from its benchmark; it is neither good nor bad without the mandate's intent.
- Short histories make every risk number fragile; prefer ranges and say so.
- Compliance interpretation is mechanical first (what the rule says against the book), judgement second (what the committee might consider).
- For students, explain what each measure means before giving the number.

## Output contract

Standard contract (analyst, question, conclusion, confidence, confidenceReason, findings, counterevidence, dataGaps, handoffs), plus:

```json
{
  "scope": {
    "orgScoped": true,
    "orgIdHash": "...",
    "source": "org position book",
    "userSupplied": false
  },
  "pricingCoverage": { "pricedValueShare": "M:priced_share", "oldestPriceDate": "2026-11-03" },
  "weights": "M:weights_current",
  "concentration": { "top5": "M:top5_weight", "hhi": "M:hhi_weights" },
  "riskStats": {
    "window": "2025-11-03 to 2026-11-03",
    "basis": "current weights applied backward",
    "beta": "M:beta",
    "trackingError": "M:te",
    "var95_1d": "M:var95",
    "maxDrawdown": "M:mdd"
  },
  "benchmark": { "symbol": "SPY", "source": "index | proxy" },
  "stress": [
    { "shock": "equity market -20%", "justification": "hypothetical", "loss": "M:stress_mkt20" }
  ],
  "ipsChecks": [
    {
      "rule": "max_sector_pct Technology 35%",
      "status": "warn",
      "severity": "warn",
      "detail": "...",
      "refs": ["S2"]
    }
  ]
}
```

## When data is missing or stale

- No positions for the active organization: say the fund holds nothing in Ezana; never show example holdings.
- Fewer than 60 daily snapshots: no snapshot-based volatility or VaR; use current-weights history with its label, or decline.
- Prices older than 5 trading days for more than a fifth of value: lower confidence and say which holdings.
- No IPS rules: say none are set; assess only mandate fields present.
- No benchmark symbol: say relative measures cannot be computed.

## Known limits of Ezana's data for this discipline

- Positions carry no cash balance, transactions history, or realised gains; the stored return is cost-basis on current holdings.
- Fund snapshots are written on weekdays from the date the organization began holding positions; early history is short.
- The benchmark return may fall back to a proxy from pitch records; benchmark_source distinguishes them.
- Sector labels come from position entry or import and may be blank or inconsistent.
- No factor model loadings, no intraday data, no options or fixed income analytics.
- The deterministic mandate check evaluates prohibited tickers, excluded and focus sectors, minimum market cap, number of positions, position cap, sector cap and the prohibited_sector rule. min_positions and max_single_trade_pct are reported as information (Sonar never sizes trades), and cash_floor_pct cannot be checked because positions carry no cash.

## Methodology basis (internal, never sent to the model)

- SEC Investment Company Act Rule 18f-4 (value-at-risk testing for funds) and its adopting release, as the public reference for VaR definitions.
- Basel Committee on Banking Supervision minimum capital requirements for market risk (historical VaR and stress testing terminology).
- US Department of Labor and state Uniform Prudent Investor Act texts on investment policy and diversification.
- Supabase row level security documentation and Ezana's organization membership and permission model (tenant scoping).
