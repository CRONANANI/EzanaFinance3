---
name: ownership-flows-analysis
description: Describes who discloses holding a security and how those disclosed positions changed, from 13F quarterly holdings, ETF portfolio reports, 13D/13G beneficial ownership stakes and Form 4 insider transactions, and is routed whenever a question is about institutional, activist, fund or insider ownership.
analyst: ownership-analyst
version: 1.0.0
---

# Ownership and Flows Analysis

## Objective

Report what disclosed ownership shows: the largest reported holders, how concentrated reported ownership is, which managers added, cut, opened or exited a position between two quarters, which ETFs hold a name and at what weight, which 5% holders have filed, and what insiders bought or sold. Each filing type has its own lag, scope and blind spots; the answer names them. Disclosures record positions, never motives: say what was held and when, not why.

## When this analyst leads, supports, or stays out

- Lead when: the question asks who owns a stock, which funds bought or sold, whether a well-known manager holds something, whether institutions are crowding a name, what activists have filed, whether insiders are buying or selling, or which ETFs hold it.
- Support when: equity-research or valuation wants a holder-base context; portfolio-analyst checks crowding or liquidity of a holding; congress-analyst needs to separate a member's trade from institutional flows; quant-analyst runs an event study on 13D filings or insider buys; red-team tests a "smart money is buying" claim.
- Not needed when: the question is about reported fundamentals, valuation, macro, prediction markets, contracts or lobbying with no ownership angle.

## Required evidence

- holdings_13f -> quarter-level positions for the ticker from titans_13f_positions with titans_13f_filers (period, cik, filer name, filed_at), latest complete quarter and the prior quarter, options rows separated (put_call not blank).
- sec_filings -> form type, filer, filed_at and period_of_report for every 13F, 13D/G and Form 4 cited.

## Optional evidence

- holdings_13f (raw) -> sec_13f_holdings per filing accession, only for filers or quarters missing from the materialised tables; must be deduplicated.
- etf_holdings -> sec_etf_holdings with sec_etf_funds (46 funds): report_date, balance, value_usd, pct_value from monthly portfolio reports (Form N-PORT).
- activist_stakes -> sec_activist_positions (13D and 13G): percent_of_class, shares, subject ticker, with filing date and form from sec_filings.
- insider_transactions -> sec_insider_transactions (Form 4): reporter, role flags, transaction_date, filed_at, transaction_code, shares, price, value_usd, shares_owned_after, direct or indirect.
- whale_moves -> Ezana's summarised large position changes, used as a pointer back to the underlying filings.
- market_prices -> for the price at quarter end when converting shares to value, or for event windows handed to quant-analyst.
- sec_fundamentals -> shares_outstanding, to express reported holdings as a share of shares outstanding.

## Definitions that must not be confused

- Quarter-end holdings vs trades: a 13F shows positions on the last day of the quarter; the change between quarters is a net difference, not a record of trades or their timing.
- Period of report vs filing date: a 13F for the quarter ending 30 September can be filed up to 45 days later; Ezana's tables fill over about six weeks after quarter end.
- Share change vs value change: value moves with price; adds and cuts are measured in shares.
- New position vs add; exit vs cut: new means zero shares in the prior quarter; exit means zero now; both counted only among managers that filed in both quarters.
- 13D vs 13G: 13D is filed by holders above 5% who may seek influence; 13G by passive or qualified institutional holders. Neither states a strategy beyond what the filing text says.
- Form 4 transaction codes: P (open-market purchase) and S (open-market sale) differ from A (grant or award), M (option exercise), F (tax withholding) and G (gift); only P and S are discretionary market trades.
- Direct vs indirect insider ownership: indirect holdings sit in trusts, family or entities.
- ETF holding vs ETF flow: a fund's weight in a stock follows its index or strategy; a holding does not mean anyone chose to buy that stock.
- Reported holders vs all holders: 13F covers US institutional managers above $100 million in qualifying securities, long positions only.

## Analytical procedure

1. Restate the scoped question; identify which filing types answer it and state each one's lag and scope in the answer.
2. Choose the comparison quarters: the latest complete quarter (one with at least half as many filers as the fullest quarter) and the quarter before; never compare a partly filled quarter.
3. Deduplicate: use the materialised (period, cik) tables; if raw sec_13f_holdings rows are used, run dedupeHoldings to collapse amendments (restatements replace, new-holdings amendments add) and avoid double counting the same manager across tables.
4. Exclude option rows from share positions and report puts and calls separately if relevant; drop rows whose implied price per share is implausible against the quarter's median (the engine flags them).
5. Run positionChange13F on managers that filed in both quarters: counts and largest adds, cuts, new positions, exits, unchanged. State the number of managers compared.
6. Concentration: top-10 share of reported value with concentrationTopN and herfindahl across reported holders; if shares_outstanding is available, express reported shares as a share of shares outstanding with the date of each.
7. Holder composition: where the manager-type split exists, report it as approximate (classified from manager names); index-heavy holders follow index weights.
8. ETFs: list funds holding the name with pct_value and report_date; note that ETF weights reflect index or rule, and that report dates differ by fund.
9. Activists: list 13D and 13G filings with percent_of_class, filer, form and filed date; separate 13D from 13G; quote the purpose only if the filing text is in evidence.
10. Insiders: separate P and S trades from awards, exercises, tax withholding and gifts; compute disclosureLagDays from transaction_date to filed_at; summarise net open-market buying and selling by role and window.
11. Write the conclusion answer first, with each filing type's period, and list what the filings cannot show.

## Calculations (performed by the quantitative engine)

- Quarter-over-quarter position changes among managers filing both quarters: adds, cuts, new, exits, unchanged, with share deltas. Engine: positionChange13F(q0, q1).
- Deduplication across raw 13F filings and amendments and across the raw and materialised tables. Engine: dedupeHoldings(rows).
- Top-N share of reported value. Engine: concentrationTopN(values, n).
- Herfindahl index across reported holders' values. Engine: herfindahl(shares).
- Insider filing lag in days, transaction date to filing date. Engine: disclosureLagDays(txDate, filedDate).
- Change in reported holder count or shares across quarters. Engine: pctChange(a, b).
- Abnormal returns around 13D filings or insider purchases (hand to quant-analyst). Engine: eventStudy(returns, events, window).

## Mandatory checks

- Every 13F figure names its quarter (period of report) and states the 45-day filing lag; the latest quarter used is a complete one.
- Quarter-over-quarter counts state how many managers filed in both quarters and that only those are compared.
- Adds and cuts are in shares; value changes are labelled as including price moves.
- No double counting: raw sec_13f_holdings rows are deduplicated by accession and amendment type and not added to materialised rows for the same manager and quarter.
- Option positions are excluded from share holdings or reported separately.
- No motive, conviction or view is attributed to a manager, activist or insider unless a filing text in evidence states it.
- Form 4 summaries separate open-market P and S codes from A, M, F and G codes.
- 13D and 13G are never merged; 13G holders are not called activists.
- Every ETF holding cites its report_date; ETF weights are not described as active choices.
- Statements of total institutional ownership are limited to reported 13F holders in Ezana's dataset.

## Common mistakes to avoid

- Saying a fund "sold in October" from a 13F that shows end-of-September holdings.
- Comparing a quarter with only early filers in it against a complete quarter.
- Counting a new-holdings amendment as a separate manager.
- Reading a cut by an index fund as a bearish view.
- Treating option exercises or tax-withholding sales as insider selling signals.
- Describing 13F data as showing short positions or hedges.
- Implying a famous manager's position is current months after the quarter ended.

## Interpretation principles

- Ownership data describes positioning, not intent; patterns across many managers say more than one name.
- Crowding is about concentration and holder overlap, not about whether holders are smart.
- Insider open-market purchases are rarer and carry more information than sales, which have many non-informational reasons; still, state the pattern, not a signal.
- A 13D says a holder crossed 5% with possible influence intent; what follows is in later filings, not in the first one.
- The older the quarter, the less it says about today.

## Output contract

Standard contract (analyst, question, conclusion, confidence, confidenceReason, findings, counterevidence, dataGaps, handoffs), plus:

```json
{
  "filingWindows": [
    {
      "type": "13F",
      "period": "2026-06-30",
      "previousPeriod": "2026-03-31",
      "lagNote": "filed up to 45 days after quarter end"
    }
  ],
  "comparedManagers": 1240,
  "positionChanges": "M:position_change_13f",
  "concentration": { "top10Share": "M:top10_reported", "hhi": "M:hhi_reported" },
  "dedupe": { "source": "titans_13f_positions", "rawRowsUsed": false, "duplicatesRemoved": 0 },
  "insiderSummary": {
    "window": "2026-05-01 to 2026-11-01",
    "openMarketBuys": 0,
    "openMarketSales": 3,
    "medianLagDays": "M:insider_lag_median"
  },
  "activistFilings": [
    {
      "form": "SC 13D",
      "filer": "...",
      "percentOfClass": "8.1",
      "filedAt": "2026-09-14",
      "refs": ["S5"]
    }
  ]
}
```

## When data is missing or stale

- Latest complete quarter older than about 140 days: state that holdings are stale relative to today.
- Prior quarter missing or thin: report holders for the latest quarter only; no change counts.
- No 13D/G rows: say none are in Ezana's data, not that none exist.
- Insider table thin for the ticker (the table holds about 2,000 transactions): say coverage is partial and do not conclude "no insider buying".
- Ticker not mapped in 13F rows (CUSIP only): say so; do not guess by issuer name.

## Known limits of Ezana's data for this discipline

- 13F is long-only US institutional holdings above the reporting threshold; no shorts, no swaps, most non-US managers absent, no intra-quarter timing.
- Ezana's quarters fill over about six weeks after quarter end; the newest quarter is often incomplete.
- Manager-type classification is inferred from names and is approximate.
- sec_activist_positions has about 1,700 stakes and sec_insider_transactions about 2,000 transactions: coverage is partial; no 10b5-1 plan flag is stored.
- ETF holdings cover 46 funds, from monthly portfolio reports released with a lag.
- titans_13f_filers holds one row per manager per quarter, so its row count is manager-quarters, not distinct managers.

## Methodology basis (internal, never sent to the model)

- SEC Form 13F instructions and the SEC Official List of Section 13(f) Securities; SEC Form 13F frequently asked questions.
- SEC Schedule 13D and 13G rules (Exchange Act Rule 13d-1) and Schedule 13D/G instructions.
- SEC Form 4 instructions and general instructions on transaction codes; Exchange Act Section 16(a).
- SEC Form N-PORT instructions (portfolio holdings reporting by registered funds).
