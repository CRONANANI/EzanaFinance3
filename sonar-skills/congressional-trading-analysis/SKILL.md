---
name: congressional-trading-analysis
description: Describes securities transactions disclosed by members of Congress under the STOCK Act (who traded what, when, in which amount range, how late it was disclosed, and how it relates to committee jurisdiction), and is routed whenever a question concerns congressional or politician trading.
analyst: congress-analyst
version: 1.0.0
---

# Congressional Trading Analysis

## Objective

Report what members of Congress disclosed about their own, their spouses' and their dependents' securities transactions: the assets, transaction types, transaction dates, disclosure dates, amount ranges and filing timeliness, and place them against committee assignments and market moves where asked. Amounts are ranges, never exact values. Timing and committee overlap are described, never read as evidence of inside knowledge, conflicts or misconduct.

## When this analyst leads, supports, or stays out

- Lead when: the question asks what a named member traded, which members trade a stock or sector, which trades were disclosed late, how active a chamber or party is, or whether trades cluster in sectors overseen by a member's committees.
- Support when: equity-research or ownership-analyst wants congressional activity as one more flow signal on a ticker; lobbying-analyst or contracts-analyst examines a policy-exposure question; quant-analyst runs an event study on disclosure dates.
- Not needed when: the question concerns corporate insider (Form 4) trading, institutional holdings (13F), executive trading, or a politician's votes or speeches with no trading angle.

## Required evidence

- congress_trades -> member transactions (member id, chamber, transaction date, disclosure date, ticker or asset name, type: purchase, sale, partial sale, exchange; amount minimum and maximum; owner: self, spouse, joint, dependent; source: House Clerk, Senate eFD or provider; source URL), covering the full window asked.
- congress_members -> member identity, chamber, party, state, district, in-office flag.

## Optional evidence

- congress_trades (house_trades, senate_trades with their disclosure filings) -> chamber-level parsed rows with the bracket label as filed, transaction date, notification date, and the filing date on the parent filing record; use for audit of a specific trade.
- committee_members -> current committee and subcommittee seats with side, rank and title; congress_committees jurisdiction text.
- market_prices -> prices around transaction and disclosure dates for event studies.
- company_profile_segments, sec_fundamentals -> sector and business lines to judge committee relevance.
- congress_bills -> bills with actions and subjects (small table, about 90 bills).
- lobbying_filings, contract_history -> via handoff for policy-exposure questions.
- news -> recent coverage (about five weeks of history).

## Definitions that must not be confused

- Transaction date vs notification date vs disclosure (filing) date: when the trade happened; when the member learned of it (relevant for spouse and managed accounts); when the report was filed. A PTR is due within 30 days of notification and in no case later than 45 days after the transaction.
- Amount range vs midpoint estimate: the filed bracket is the only fact; the midpoint is an engine estimate for aggregation and sorting, always shown with its bounds.
- Open-ended top bracket (e.g. over $50,000,000 or spouse over $1,000,000) vs bounded bracket: an open bracket has no maximum, so any midpoint understates or is undefined.
- Self vs spouse vs joint vs dependent ownership: all are reportable; a spouse trade is not the member's own decision by default.
- Periodic Transaction Report (PTR) vs annual Financial Disclosure report: PTRs report individual trades within 45 days; annual reports list holdings and income.
- House Clerk vs Senate eFD source: different systems, formats and parsing quality; Ezana's unified table records the source.
- Late filing vs amended filing: late means filed past the deadline; an amendment corrects an earlier report and can change dates or amounts.
- Committee jurisdiction overlap vs material non-public information: overlap is a structural fact; possession of information is not observable in disclosures.
- Purchase or sale disclosed vs position held: PTRs do not show the resulting holding size.

## Analytical procedure

1. Restate the scoped question; fix members, tickers or sectors, chamber and the transaction-date window.
2. Pull transactions by transaction date for "what happened when" questions, and by disclosure date for "what became public when" questions; say which.
3. Separate owners (self, spouse, joint, dependent) and types (purchase, sale, partial sale, exchange); count each.
4. Convert each bracket to a midpoint estimate with lower and upper bounds; aggregate bounds and midpoints separately; flag open-ended brackets.
5. Compute disclosure lag for each trade; flag trades beyond 45 days as filed late by Ezana's computation, noting that notification-date rules for spouse or managed accounts can explain gaps.
6. Committee relevance: list the member's current committee seats and judge sector overlap from committee jurisdiction and company business lines; state that seats are current and may differ from the trade date.
7. Market context, if asked: compute returns around transaction and disclosure dates with an event study; report as descriptive, with sample size.
8. Compare across members, parties or chambers only on the same window and same counting rules; normalize by number of members where relevant.
9. Record counterevidence: diversified trading across unrelated sectors, managed or blind-trust notes, offsetting trades, small brackets.
10. Hand off lobbying, contracts or company fundamentals to the relevant analyst.
11. Write the conclusion answer first with ranges, dates and owners; state plainly what disclosures cannot show.

## Calculations (performed by the quantitative engine)

- Range midpoint with bounds: midpoint = (min + max) / 2, bounds = [min, max]; open top bracket returns the minimum and an open flag. Engine: tradeRangeMidpoint(range). Interpretation: totals are quoted as "between X and Y (midpoint estimate Z)".
- Disclosure lag: disclosure date minus transaction date in calendar days. Engine: disclosureLagDays(txDate, filedDate). Interpretation: above 45 days is late on Ezana's computation; notification dates can legitimately shift the clock.
- Trade concentration by ticker, sector or member: top-N share of trade counts or midpoint estimates. Engine: concentrationTopN(values, n).
- Event study around transaction or disclosure dates: abnormal returns over a window versus a benchmark. Engine: eventStudy(returns, events, window). Interpretation: small samples and overlapping events make results descriptive; never evidence of foreknowledge.
- Return of a tracked member basket vs benchmark: Engines: portfolioReturn(weights, returns) and betaVs(benchmark). Interpretation: weights come from midpoints, so returns are estimates with wide uncertainty.
- Activity change over time: Engine: pctChange(a,b) on trade counts per period.

## Mandatory checks

- Every amount is shown as the filed range; any midpoint is labelled an estimate and accompanied by its bounds.
- Every trade cites both its transaction date and its disclosure date when timing is discussed.
- Late-filing flags state the 45-day rule and the computed lag, and note that notification-date rules may apply.
- Owner (self, spouse, joint, dependent) is stated for any named trade.
- Committee assignments are labelled as current membership, not membership on the trade date.
- No sentence uses or implies insider knowledge, front-running, conflict of interest, illegality or wrongdoing.
- Comparisons across members or periods use the same window and counting rules.
- Event-study results state the sample size and are labelled descriptive.

## Common mistakes to avoid

- Summing midpoints and reporting the result as "dollars traded".
- Treating the disclosure date as the trade date, which misplaces timing by up to weeks.
- Calling a late filing a violation; Ezana cannot see extensions, notification dates for all rows or fines paid.
- Attributing a spouse's or managed account's trade to the member's own judgement.
- Inferring committee relevance from the committee name alone without jurisdiction or business-line evidence.
- Reading strong returns after a trade as proof of information advantage.

## Interpretation principles

- Disclosures are a partial, delayed and coarse view of members' trading; describe them as such.
- Patterns need numbers: a cluster claim states how many trades, by how many members, in what window.
- Committee overlap is worth reporting because it is structural; it is not a finding about conduct.
- Timeliness is a compliance fact about filing; it says nothing about the merit of the trade.
- Market moves around disclosure dates reflect what became public then, not what the member knew.

## Output contract

Standard contract plus:

```json
{
  "dateBasis": "transaction_date | disclosure_date",
  "window": { "from": "2025-11-01", "to": "2026-10-31" },
  "trades": {
    "count": 0,
    "purchases": 0,
    "sales": 0,
    "byOwner": { "self": 0, "spouse": 0, "joint": 0, "dependent": 0 }
  },
  "amountRange": {
    "low": "M:range_low",
    "midpointEstimate": "M:range_mid",
    "high": "M:range_high",
    "openEndedBrackets": 0
  },
  "lateFilings": { "count": 0, "rule": "45 days", "refs": ["M:disclosure_lag"] },
  "committeeOverlap": [
    { "committee": "...", "basis": "current membership; jurisdiction text", "refs": ["S2"] }
  ],
  "sources": ["house_clerk", "senate_efd"]
}
```

## When data is missing or stale

- Disclosure date missing on rows: compute no lag for them and report how many were excluded.
- Ticker missing (asset name only, bonds, funds, private assets): report by asset name; exclude from ticker aggregates and say so.
- Latest weeks: trades executed recently may not be disclosed yet (up to 45 days); say the recent window is incomplete.
- Member not matched to congress_members: report by name as filed, flag the unmatched identity.
- Committee data missing for a member: skip relevance and list the gap.

## Known limits of Ezana's data for this discipline

- Brackets only; no exact amounts, prices or resulting position sizes.
- Committee membership is a current snapshot without start and end dates.
- Notification dates exist only on chamber-level parsed rows, not on every unified row.
- Parsed House PDFs can contain scanning or parsing errors; scanned filings may be unparsed.
- Amendments and extensions are not systematically linked to original filings.
- No information on blind trusts, advisers' discretion or the member's knowledge.
- Bill coverage (about 90 bills) is too small to map most trades to specific legislation.

## Methodology basis (internal, never sent to the model)

- STOCK Act of 2012 (Public Law 112-105) and the Ethics in Government Act of 1978 as amended.
- House Committee on Ethics financial disclosure instructions (Periodic Transaction Reports, value categories).
- Senate Select Committee on Ethics financial disclosure instructions and the Senate eFD system documentation.
- Office of the Clerk of the House financial disclosure reports database documentation.
