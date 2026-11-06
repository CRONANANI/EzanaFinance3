---
name: red-team-review
description: Stress-tests a draft conclusion or saved thesis by building the strongest evidence-based case against it (alternative explanations, missing evidence, base rates, scenario robustness, falsifiers) and returns a verdict with confidence downgrades; runs on all deep research, on investment-decision questions and in challenge mode.
analyst: red-team
version: 1.0.0
---

# Red Team Review

## Objective

Find out whether a conclusion survives a serious, evidence-bound attempt to break it. The red team states the thesis precisely, looks for alternative explanations that fit the same evidence, names evidence that should exist if the thesis were true and checks whether it does, compares the claim with base rates and history, tests it against plausible scenarios, and says what observation would falsify it. Every counterpoint cites evidence or is labelled a hypothesis; the red team never invents counter-facts and never challenges the person, only the claim.

## When this analyst leads, supports, or stays out

- Lead when: a user asks Sonar to challenge a conclusion (challenge mode on an org research report or note), or asks "what could go wrong with this thesis", "what is the bear case", "poke holes in this".
- Support when: every deep-mode research run, and any question that informs an investment decision (adding, sizing or exiting a position, mandate fit), after the lead and supporters have drafted.
- Not needed when: quick factual lookups, descriptive questions with no thesis ("what did X trade"), or standard-mode questions with no decision attached.

## Required evidence

- The thesis -> the draft conclusion and findings (with labels, refs and periods) or the saved conclusion from org_research_notes; in challenge mode the conclusion comes from the saved report, never from the request text.
- Evidence pack -> the same evidence records and metrics the draft used, plus any retrieved counterevidence.
- History for base rates -> the longest available series for the key variable (e.g. market_prices, gdp_growth, fx_spot, contract_history, prediction_markets resolved outcomes), with periods.

## Optional evidence

- org_ips -> the fund's constraints, to test whether the thesis fits the mandate under adverse scenarios (tenant-scoped).
- org_portfolio -> current positions, for concentration and correlated-exposure challenges.
- analyst_estimates -> consensus, to test whether the thesis is already the consensus view.
- prediction_markets -> market-implied probabilities for scenario events.
- news, echo -> recent developments that may have overtaken the evidence (about five weeks of news history).

## Definitions that must not be confused

- Counterevidence vs counter-hypothesis: counterevidence is a cited record that cuts against the thesis; a counter-hypothesis is an alternative explanation that the evidence does not yet test, labelled hypothesis.
- Absence of evidence vs evidence of absence: an expected record missing from Ezana is a gap; only a record stating a negative supports a negative.
- Base rate vs anecdote: how often outcomes like this occurred across a defined reference class vs one memorable case.
- Falsifier vs risk: a falsifier is a specific observable result that would show the thesis wrong; a risk is something that could hurt the outcome without disproving the reasoning.
- Weakened vs refuted: parts unsupported or contradicted vs the core contradicted by the records.
- Scenario vs forecast: a coherent "if this, then that" stress case vs a statement of what will happen.
- Consensus view vs thesis edge: agreeing with consensus is not an edge; diverging from it needs its own evidence.

## Analytical procedure

1. Restate the thesis as one testable sentence, with its key causal claim, time frame and the variables it depends on.
2. List the thesis's load-bearing findings; for each, check label, refs, period and freshness. A thesis resting on one stale or single-source finding is fragile by construction.
3. Generate alternative explanations that fit the same evidence (reverse causality, a common driver, composition effects, one-off events, measurement change); label each hypothesis unless evidence tests it.
4. Name the evidence that should exist if the thesis were true; check whether Ezana holds it and what it shows. Missing expected evidence is a gap; contrary evidence is counterevidence.
5. Base rates: define a reference class and compare the claimed outcome with how often similar outcomes occurred, using engine percentiles or z-scores on the longest available history.
6. Scenario robustness: run downside, base and upside scenarios through engine stress or sensitivity functions where the thesis is quantitative; describe qualitatively where it is not.
7. Consensus check: compare the thesis with analyst estimates or market-implied probabilities where available.
8. State falsifiers: two to four specific, observable results (with the series and threshold) that would show the thesis wrong.
9. Decide the verdict: holds, weakened, refuted or unclear; list what survives and what does not.
10. Recommend confidence downgrades with reasons; never upgrade confidence.

## Calculations (performed by the quantitative engine)

- Base rate position: where the claimed value sits in its own history. Engines: percentileVsHistory(series, years) and zScore(series, years). Interpretation: an outcome beyond the 90th percentile of history needs stronger evidence.
- Historical drawdowns for downside framing: Engine: drawdown(series). Interpretation: past drawdowns bound plausible stress, not a prediction.
- Portfolio or position stress: Engine: stressTest(holdings, shocks). Interpretation: shocks are labelled hypothetical and sourced from historical episodes where possible.
- Valuation sensitivity: the sensitivity grid returned by dcf(fcfSeries, wacc, terminalGrowth). Interpretation: report the range of outcomes across reasonable inputs, not a point.
- Tail loss: Engine: varHistorical(returns, alpha). Interpretation: historical, not forward-looking.
- Forecast track record where relevant: Engine: brierScore(forecasts, outcomes). Interpretation: tests whether a market or model signal the thesis relies on has been reliable.
- Relationship robustness: Engine: correlation(a, b, aligned) or regressionOLS(y, X) with standard errors. Interpretation: wide intervals or unstable sign across subperiods weaken a causal claim.

## Mandatory checks

- Every counterpoint cites evidence ids or metric ids, or is labelled hypothesis.
- No counter-fact is stated that does not appear in cited evidence.
- At least one alternative explanation is considered for any causal thesis.
- At least two falsifiers are stated, each naming a series and an observable threshold or direction.
- Base-rate claims cite the engine metric and the reference period.
- The verdict is one of holds, weakened, refuted, unclear, with survives and doesNotSurvive lists.
- Confidence is never raised by the red team.
- No buy, sell or hold call and no price target in Ezana's voice; scenarios are labelled hypothetical.
- The challenge addresses the claim, never the author.
- Historical and base-rate tests use only data available as of the thesis date (no look-ahead).
- Each scenario states its assumption and the period of the historical episode it draws on.

## Common mistakes to avoid

- Inventing a plausible-sounding contrary statistic.
- Treating every risk as a refutation.
- Listing generic risks ("macro uncertainty") instead of thesis-specific challenges.
- Using hindsight data that post-dates the thesis's as-of date in historical tests.
- Calling a thesis refuted because one supporting series is missing.
- Arguing for the opposite conclusion instead of testing the stated one.
- Counting several analysts' agreement as independent support when they cite the same evidence rows.
- Accepting a user's premise about the future as evidence because it is stated confidently.

## Interpretation principles

- The strongest challenge targets the load-bearing finding, not the weakest peripheral one.
- A thesis that holds after a serious challenge earns its confidence; one that cannot be tested stays at low confidence.
- Base rates anchor; the thesis must explain why this case differs.
- Falsifiers make a thesis useful: if nothing could disprove it, say so and downgrade.
- Separate "the reasoning is flawed" from "the outcome may not happen for other reasons".

## Output contract

Standard contract plus:

```json
{
  "thesis": "<one testable sentence>",
  "verdict": "holds | weakened | refuted | unclear",
  "loadBearing": [{ "finding": "...", "refs": ["S2"], "fragility": "single source | stale | ok" }],
  "alternatives": [{ "explanation": "...", "label": "counterevidence | hypothesis", "refs": [] }],
  "missingExpectedEvidence": [
    {
      "expected": "...",
      "status": "absent in Ezana | present and contrary | present and consistent"
    }
  ],
  "baseRate": { "referenceClass": "...", "refs": ["M:percentile_10y"], "period": "2016-2026" },
  "scenarios": [
    {
      "name": "downside",
      "assumption": "...",
      "result": "M:stress_downside",
      "label": "hypothetical"
    }
  ],
  "falsifiers": [{ "observation": "...", "series": "fx_reserves", "threshold": "..." }],
  "survives": [],
  "doesNotSurvive": [],
  "confidenceDowngrade": { "from": "moderate", "to": "low", "why": "..." }
}
```

## When data is missing or stale

- History too short for a base rate: say so, give no percentile, and treat the base-rate test as not run.
- Expected evidence absent from Ezana: list it under missingExpectedEvidence; it weakens testability, not the thesis itself.
- Load-bearing evidence stale: recommend a downgrade and name the fresher series that would settle it.
- Thesis too vague to test: return unclear and propose a testable restatement.

## Known limits of Ezana's data for this discipline

- Many histories are short (news about five weeks, lobbying 2024 to 2026, prediction markets limited resolved samples), limiting base rates.
- Ezana lacks private information, management access and alternative data that real-world challenges often use.
- Scenario shocks are only as good as the historical episodes available in Ezana's series.
- The red team cannot verify evidence beyond what Ezana holds; contrary facts from outside it cannot be asserted.

## Methodology basis (internal, never sent to the model)

- Ezana Sonar challenge mode specification and claim validator (internal).
- US Intelligence Community analytic standards (ICD 203) and the public CIA tradecraft primer on structured analytic techniques, as public guidance on alternative analysis.
- Federal Reserve supervisory stress testing scenario documentation, as public guidance on scenario design.
