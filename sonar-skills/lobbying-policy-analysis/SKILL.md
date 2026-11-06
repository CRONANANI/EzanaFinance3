---
name: lobbying-policy-analysis
description: Measures disclosed federal lobbying (LDA quarterly spend, issues, registrants, lobbyists and LD-203 contributions) for a company, sector or policy topic, and is routed whenever a question asks who lobbies, how much, on what, or how advocacy relates to legislation.
analyst: lobbying-analyst
version: 1.0.0
---

# Lobbying and Policy Analysis

## Objective

Describe disclosed federal lobbying activity: how much a client spent or a firm earned per quarter, on which issue areas and specific topics, through which registrants and lobbyists, toward which chambers and agencies, and what political contributions lobbyists and registrants reported. Map that activity to legislation only where the evidence names it. Disclosed advocacy is a fact; influence on outcomes is never established by it and is never claimed.

## When this analyst leads, supports, or stays out

- Lead when: the question asks how much a company or sector lobbies, who lobbies most on a topic (AI, chips, crypto, drug pricing), which firms a client hires, how spend has changed, which lobbyists have revolving-door histories, or whose PACs and lobbyists gave to which members.
- Support when: contracts-analyst or congress-analyst examines a "policy exposure" question; equity-research needs regulatory engagement as context; industry-analyst compares policy intensity across peers; geopolitical-analyst needs US advocacy on a trade or sanctions issue.
- Not needed when: the question concerns state lobbying, foreign agent registrations (FARA), campaign finance outside LD-203, or regulation content itself with no advocacy angle.

## Required evidence

- lobbying_filings -> LD-2 quarterly reports for the subject (client and registrant names and ids, filing year and quarter, amount, filing type, registration flag, issue codes, entities lobbied, lobbyists with covered positions), at least 8 quarters for any trend.
- lobbying_client_tickers -> verified client-name to ticker mapping and match method, for any company-level claim.

## Optional evidence

- lobbying_filings (specific_issues text) -> the free-text "specific lobbying issues", needed for topic-level (AI-specific) classification; populated only for filings ingested after the column was added and for topic ingests marked complete.
- lobbying_contributions -> LD-203 semiannual reports and items (contribution type, contributor, payee, honoree as filed, amount, date).
- congress_bills -> Ezana's small bills table (about 90 bills with actions, subjects, stage, sponsor): used for legislation mapping only when a bill appears there.
- congress_members, committee_members -> to identify honorees and committee jurisdiction (honoree names are free text and need matching).
- fec_candidates -> candidate identifiers for honoree matching.
- contract_history, congress_trades -> via handoff for combined questions.
- news -> recent coverage of a lobbying campaign (about five weeks of history).

## Definitions that must not be confused

- Income vs expenses: an outside firm reports income received from a client; an organization lobbying for itself reports total expenses, which already include fees paid to outside firms. Ezana's single amount column holds whichever was filed.
- In-house (self-filed) vs outside registrant: summing a self-filer's expenses with its outside firms' income double counts.
- LD-1 registration vs LD-2 activity report vs LD-203 contribution report: LD-1 opens a client relationship and carries no spend; LD-2 reports quarterly activity and amount; LD-203 is a semiannual report of contributions by registrants and lobbyists.
- Issue code vs specific issue text: the code is one of about 80 broad LDA areas (e.g. CPI, SCI, TAX); the text names bills, rules or topics. Spend is reported per filing, not per issue.
- AI-specific vs general lobbying: a filing is AI-specific only if its specific issue text names AI topics; a filing coded SCI or CPI is not AI lobbying on that basis.
- Client vs registrant vs lobbyist: who pays, who files, who lobbies.
- Filing quarter vs posting date: the activity period vs when the report was posted; amendments can arrive later.
- Disclosed contact vs influence: entities lobbied lists chambers and agencies contacted, not outcomes achieved.
- Contribution honoree vs payee: the person honored vs the committee or organization paid.

## Analytical procedure

1. Restate the scoped question; fix the subject (client, registrant, sector or topic) and the quarters covered.
2. Resolve the client: state the matched client names and ticker mapping (verified flag, match method); list name variants not matched.
3. Exclude registration filings (LD-1, is_registration) and zero-amount filings from spend; keep them for relationship counts.
4. Avoid double counting: if the client self-files, use its own expenses only; otherwise sum outside registrants' income. State which rule applied.
5. Compute spend by quarter and by year; compare the latest four complete quarters with the prior four. Treat the latest quarter as possibly incomplete until about 45 days after quarter end (amendments and late filings).
6. Classify topics: issue codes for broad areas; specific issue text for topics. Label a filing AI-specific only on text evidence, and report the share of filings with text available.
7. Describe the network: number of registrants, lobbyist count, revolving-door lobbyists with covered positions as filed, entities lobbied.
8. Map to legislation: cite bills named in specific issue text; link to congress_bills only on an exact bill identifier match; otherwise say the bill is not in Ezana's bills table.
9. LD-203: summarize contributions by payee and honoree with dates and amounts; match honorees to members only with a stated confidence.
10. Compare against peers or the sector where asked, using the same quarters and the same double-count rule.
11. Write the conclusion answer first; keep timing coincidences descriptive; list what disclosure cannot show.

## Calculations (performed by the quantitative engine)

- Spend by quarter: sum of amounts per client per filing quarter, with registration and zero filings excluded and the self-file rule applied. Engine: lobbyingSpendByQuarter(rows). Interpretation: the engine returns the rule applied and incomplete-quarter flags.
- Trailing four-quarter change: sum(last 4 complete quarters) vs sum(prior 4). Engines: lobbyingSpendByQuarter(rows) then pctChange(a,b). Interpretation: LDA rounds amounts to the nearest $10,000 and reports under $5,000 as such; small changes are noise.
- Multi-year growth: compound annual rate on full-year spend. Engine: cagr(series). Interpretation: complete years only.
- Spend concentration among clients on a topic: top-N share. Engine: concentrationTopN(values, n). Interpretation: share of disclosed spend on matching filings, not of total influence.
- Registrant concentration for one client: Herfindahl of registrant income shares. Engine: herfindahl(shares).
- Contribution totals by honoree or payee over a window: Engine: concentrationTopN(values, n) on LD-203 items. Interpretation: reported contributions only.
- Lobbying alongside another series (contracts, bill stage dates): Engine: alignPeriods(seriesList). Interpretation: alignment notes are quoted; no causal reading.

## Mandatory checks

- Registration (LD-1) filings and zero amounts are excluded from every spend total.
- A self-filing client's expenses are never added to its outside firms' income.
- Every amount carries its filing quarter (e.g. 2026 Q2) and the claim says income or expenses where known.
- No claim attributes a dollar amount to a single issue when the filing lists several issues.
- "AI lobbying" totals use specific issue text, and state the share of filings with text available and topic-ingest completeness.
- Legislation is linked only when a bill identifier appears in evidence; bills absent from congress_bills are said to be absent.
- No sentence states or implies that lobbying caused a vote, bill outcome, contract or regulatory decision.
- LD-203 honoree-to-member matches state the matching basis.

## Common mistakes to avoid

- Ranking companies by summing every filing that names them, which double counts in-house and outside spend.
- Counting a filing's full amount under each of its issue codes.
- Treating issue code CPI or SCI as AI lobbying.
- Calling a sharp fall in the latest quarter a cut before late filings arrive.
- Reading revolving-door lobbyists as evidence of access or success.
- Treating trade association spend as the member company's own spend.

## Interpretation principles

- Spend measures disclosed effort and cost, not effectiveness.
- A sustained multi-quarter rise across several registrants is stronger evidence of a priority shift than one large quarter.
- Topic share is a lower bound when specific issue text is missing for older filings.
- Association lobbying (trade groups) can carry a company's interests without appearing under its name; say so when relevant.
- Advocacy on a bill and the bill's progress are two facts; their alignment is not causation.

## Output contract

Standard contract plus:

```json
{
  "quartersCovered": ["2025 Q1", "2026 Q2"],
  "incompleteQuarters": ["2026 Q3"],
  "clientMapping": { "ticker": "NVDA", "clientNames": ["NVIDIA CORPORATION"], "verified": true },
  "doubleCountRule": "self-filed expenses only | outside income summed",
  "topicClassification": {
    "topic": "ai",
    "basis": "specific_issues text",
    "textCoverageShare": "M:text_coverage",
    "ingestComplete": false
  },
  "legislationLinks": [{ "bill": "118-hr-xxxx", "inEzanaBillsTable": false, "refs": ["S4"] }],
  "contributions": { "window": "2025 H2", "refs": ["M:ld203_top_honorees"] }
}
```

## When data is missing or stale

- No ticker mapping: search by client name, present matches as unverified, lower confidence.
- Specific issue text missing or topic ingest incomplete: rank by the broader issue area and say the topic ranking is not yet reliable.
- Latest quarter within 45 days of its end: label it preliminary and base trends on prior complete quarters.
- Bill not in congress_bills: name it from the filing text only; make no stage or probability claim.
- LD-203 period not yet ingested: say contributions for that half-year are not available.

## Known limits of Ezana's data for this discipline

- Federal LDA filings only, 2024 to 2026; no state lobbying or FARA.
- One amount per filing, no per-issue split; amounts are rounded by filers.
- Specific issue text is partial (recent ingests and completed topic walks only).
- Ticker mapping covers about 370 clients; subsidiaries and trade associations are often unmapped.
- congress_bills holds about 90 bills, so most bills named in filings cannot be tracked for stage.
- LD-203 honorees are free text; Ezana does not hold FEC itemized receipts beyond candidate identifiers.
- Disclosures show activity, not meetings' content, positions taken, or outcomes.

## Methodology basis (internal, never sent to the model)

- Lobbying Disclosure Act of 1995 as amended, and the LDA Guidance issued by the Secretary of the Senate and Clerk of the House.
- LDA.gov API documentation (filings, contributions, issue codes, filing types).
- Senate Office of Public Records LD-1, LD-2 and LD-203 form instructions.
- Congress.gov API documentation for bill identifiers, actions and subjects.
