---
name: government-contracts-analysis
description: Measures a company's or sector's US federal prime contract activity (obligations by fiscal year, agency concentration, award pipeline and momentum) from USAspending-derived tables, and is routed whenever a question turns on federal contracts, awards or government as a customer.
analyst: contracts-analyst
version: 1.0.0
---

# Government Contracts Analysis

## Objective

Describe how much the US federal government has committed to a company, sector or agency on prime contracts, how that has moved across federal fiscal years, which agencies it depends on, and what the visible award pipeline (ceilings, periods of performance) does and does not imply. Every dollar figure says which stage of the award lifecycle it measures (ceiling, current value, obligation, outlay) and which fiscal year or date it covers. Contract dollars are never presented as company revenue; where revenue matters, the analyst reconciles against reported financials and states the gap.

## When this analyst leads, supports, or stays out

- Lead when: the question asks how much a company wins from the government, whether federal awards are growing, which contractors lead an agency or sector, how dependent a company is on DoD or another agency, or what a specific large award means.
- Support when: equity-research needs government as a customer segment; valuation needs a sense of backlog quality; lobbying-analyst or congress-analyst needs the contracting side of a "spend to win" question; industry-analyst ranks defence, IT services or space players; portfolio-analyst checks a fund's exposure to federal budget risk.
- Not needed when: the question concerns state or local procurement, foreign government contracts, grants or loans (Ezana stores contract award types only), or a company with no resolved contractor ticker and no named recipient.

## Required evidence

- contract_history -> obligations per ticker, federal fiscal year and awarding agency (company_contract_history), at least 4 fiscal years, with the latest complete fiscal year identified.
- contractor_tickers -> the recipient-name to ticker resolution used (name key, ticker, public flag, match source), so the mapping can be stated.
- contract_awards -> individual prime awards (usaspending_contract_awards: award id, recipient, award amount, awarding and funding agency, start date stored as action_date, award type, fiscal year), for any award-level claim.

## Optional evidence

- contract_history (company_contract_award_facts) -> per-award total obligation, base plus exercised options (current value), base plus all options (ceiling), date signed, last modified, modification count, period of performance start, end and potential end, parent award PIID. Needed for any ceiling or pipeline claim.
- contract_rollups -> recipient by agency and agency totals per fiscal year (gov_contract_recipient_rollup, gov_contract_agency_rollup) for market share and agency-level context.
- sec_fundamentals -> reported revenue (annual and quarterly, with fiscal period end and filing date) for reconciliation.
- company_profile_segments -> segment or customer revenue (US government segment where the company discloses one).
- filing_passages, sec_filings -> backlog and funded backlog disclosures, customer concentration notes (10-K risk factors), only for the companies covered.
- chips_awards -> CHIPS Act facility awards, if present, kept separate from procurement.
- lobbying_filings, congress_bills -> policy context, via handoff only.

## Definitions that must not be confused

- Ceiling (base and all options) vs current value (base and exercised options) vs obligation vs outlay: the ceiling is the maximum if every option is exercised; current value counts options already exercised; an obligation is a legal commitment of funds; an outlay is cash actually paid. Ezana holds no outlay data for procurement awards.
- Award amount in usaspending_contract_awards vs a single contract action: the stored amount is the award's cumulative obligation as of the sync, not the value of one action or modification.
- Obligation vs recognized revenue: revenue is recognized by the company as work is performed under its own accounting; obligations can lead revenue by quarters or years and can be de-obligated.
- Federal fiscal year vs calendar year vs company fiscal year: FY2026 runs 1 October 2025 to 30 September 2026; a company's fiscal year may end in any month.
- Start date (stored in the action_date column) vs date signed vs last modified date: the stored action_date is the period-of-performance start, which can sit after the signing date or in the future.
- Prime award vs subaward: Ezana stores prime awards only; work a company does as a subcontractor is recorded under the prime.
- Definitive contract vs indefinite-delivery vehicle (IDV): an IDV ceiling is a capacity shared by many vendors, not a commitment to one.
- Awarding agency vs funding agency: the office that signs vs the office whose money pays.
- Modification count vs dollars added: a modification can add, remove or not change money; the count is capped at 100 in Ezana's facts table (100 means 100 or more).

## Analytical procedure

1. Restate the scoped question; fix the subject (ticker, recipient names, agency) and the fiscal-year window.
2. State the ticker mapping: which recipient names and parents Ezana resolves to the ticker, the match source (exact or prefix, parent or name), and known gaps (joint ventures, recently acquired subsidiaries, resellers).
3. Normalize periods to federal fiscal years. Mark the current fiscal year and, for DoD-heavy recipients, the most recent completed year as incomplete until the January after it ends (DoD publishes contract actions with about a 90-day delay).
4. Compute obligations by fiscal year and the change between the latest two complete years; compute the multi-year growth rate only across complete years.
5. Compute agency concentration: top-agency share, top-3 share and a Herfindahl index on agency shares over the same complete-year window.
6. For award-level claims, separate total obligation, current value and ceiling for each award; compute the unobligated ceiling and label it potential, not expected.
7. Assess procurement momentum: direction across complete years, count of new awards, large awards by start date and period of performance end (expiry and recompete risk), noting that one award can dominate a year.
8. Reconcile with reported revenue when the question involves revenue or dependence: align company fiscal periods with federal fiscal years, state the period mismatch, and present the ratio only as an indicative order of magnitude.
9. Record counterevidence: de-obligations, declining years, concentration in expiring awards, a peer gaining share in the same agency.
10. Hand off policy drivers (budget bills, lobbying) and valuation implications; do not speculate on them.
11. Write the conclusion answer first, with confidence reflecting mapping certainty, completeness of the latest year and award-level coverage.

## Calculations (performed by the quantitative engine)

- Obligations by fiscal year: sum of obligation per federal FY (1 Oct to 30 Sep), with completeness flags. Engine: contractObligationsByFY(rows). Interpretation: only complete years are compared.
- Year-over-year change: FY_t / FY_(t-1) - 1. Engine: pctChange(a,b). Interpretation: one large award can swing a year; say so when the top award exceeds a quarter of the year's total.
- Multi-year growth: compound annual rate across complete fiscal years. Engine: cagr(series). Interpretation: needs at least 3 complete years.
- Ceiling vs obligated: per award and in total, ceiling, current value, obligated, unobligated ceiling = ceiling - obligated, obligated share = obligated / ceiling. Engine: awardCeilingVsObligated(rows). Interpretation: unobligated ceiling is an upper bound on future obligation, not backlog.
- Agency concentration: top-N share of obligations. Engine: concentrationTopN(values, n). Interpretation: report top 1 and top 3.
- Agency Herfindahl: sum of squared agency shares. Engine: herfindahl(shares). Interpretation: above 0.5 means one agency dominates; Ezana convention, stated as such.
- Contract-to-revenue ratio: obligations in a period / reported revenue in the nearest aligned period. Engines: alignPeriods(seriesList) then pctChange or the ratio returned by the alignment frame. Interpretation: indicative only; obligations are not revenue and periods differ.
- Recipient share within an agency: recipient obligations / agency total for the same FY. Engine: concentrationTopN(values, n) on the rollup. Interpretation: share of prime obligations, not of the agency budget.

## Mandatory checks

- No sentence describes obligations, award amounts or ceilings as revenue, sales or earnings.
- Every dollar figure names its lifecycle stage (ceiling, current value, obligation) and its fiscal year or date.
- Fiscal years are federal (1 Oct to 30 Sep) and labelled FYyyyy; calendar-year sums are never mixed with fiscal-year sums.
- The current fiscal year, and any year flagged incomplete, is excluded from growth comparisons or explicitly labelled partial.
- The ticker mapping method is stated whenever a company-level total is given.
- Any ceiling or IDV figure is labelled potential and never added to obligations.
- No outlay or "paid to date" figure is stated (Ezana holds none for procurement).
- A revenue reconciliation states both periods and the mismatch note from alignPeriods.
- Award dates quoted from usaspending_contract_awards are described as start dates, not award or signing dates.

## Common mistakes to avoid

- Headlining a multi-year IDV ceiling ("a $10B contract") as money the company will receive.
- Summing award_amount across rows that include the same award under parent and child records.
- Treating a drop in the current fiscal year as decline when the year is incomplete.
- Assuming a ticker captures all subsidiaries, or that a joint venture's awards belong wholly to one parent.
- Reading award start dates in the future as awards already made in that future year.
- Comparing a company's calendar-year revenue with federal fiscal-year obligations without saying so.

## Interpretation principles

- Obligations show government demand committed through prime awards; they confirm or challenge a revenue story but do not measure it.
- Momentum needs at least two complete years moving the same way and not driven by one award.
- High agency concentration is a dependency fact; whether it is a risk depends on budget politics the analyst does not forecast.
- Ceiling headroom is optionality held by the government, which may never exercise it.
- Absence from Ezana's tables is not absence of federal business: subcontracts, classified work and reseller channels are invisible.

## Output contract

Standard contract plus:

```json
{
  "fiscalYearsCovered": ["FY2022", "FY2023", "FY2024", "FY2025"],
  "incompleteYears": ["FY2026"],
  "tickerMapping": {
    "ticker": "LDOS",
    "recipientNames": ["..."],
    "matchSource": "exact:parent",
    "knownGaps": ["joint ventures"]
  },
  "lifecycleStageQuoted": ["obligation", "ceiling"],
  "agencyConcentration": {
    "top1Share": "M:agency_top1",
    "top3Share": "M:agency_top3",
    "hhi": "M:agency_hhi"
  },
  "revenueReconciliation": {
    "done": true,
    "periodMismatch": "company FY ends Dec; federal FY ends Sep",
    "refs": ["M:obligation_to_revenue"]
  }
}
```

## When data is missing or stale

- No contractor_tickers match: report "no recipient resolved to this ticker in Ezana's mapping", not "no federal contracts"; offer recipient-name search results if any, labelled unconfirmed.
- Award facts missing for an award: quote only the stored award amount as cumulative obligation; make no ceiling or option claim.
- Latest complete year flagged incomplete: compare the two prior complete years and say why.
- Revenue series missing or older than the contract window: skip reconciliation, list it in dataGaps, lower confidence one level if the question was about dependence.
- Rollups older than the award table: prefer award-level sums for the latest year and note the difference in sync dates.

## Known limits of Ezana's data for this discipline

- Prime contract awards only (USAspending award types A to D); no grants, loans, subawards or IDV parent vehicles as separate records.
- No outlays for procurement awards; no funded backlog unless a company filing states it.
- The usaspending_contract_awards date column holds the period-of-performance start date and its fiscal_year is derived from it, so fiscal-year assignment can differ from USAspending's action-date view.
- Ceiling, current value and modification history exist only in company_contract_award_facts, which covers selected awards for tickered companies.
- Ticker resolution is name based (exact or prefix match on recipient or parent names); joint ventures, renamed entities and recent acquisitions may be missed or misattributed.
- Classified programmes and work through resellers or other primes do not appear under the company.

## Methodology basis (internal, never sent to the model)

- USAspending data dictionary and API documentation (award amount, total obligation, base and exercised options, base and all options, period of performance fields).
- Federal Procurement Data System (FPDS) data element dictionary.
- Federal Acquisition Regulation, Part 16 (types of contracts, indefinite-delivery contracts) and Part 17 (options).
- DoD contract action reporting delay policy as stated on USAspending.
- SEC Regulation S-K Item 101 (backlog and government contract disclosures) and ASC 606 revenue recognition summary.
