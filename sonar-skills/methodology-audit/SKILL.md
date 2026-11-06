---
name: methodology-audit
description: Audits an analyst's or the director's draft against its evidence and metrics, running deterministic checks first (numbers, units, currencies, periods, entities, citations, staleness, mixed dates, projections, banned claims) and then an optional model review for reasoning gaps, returning pass or fail per check with fixes; runs on every research draft before publication and on request for saved research notes.
analyst: methodology-auditor
version: 1.0.0
---

# Methodology Audit

## Objective

Decide, check by check, whether a draft says only what its evidence and computed metrics support, in the right units, currencies, periods and entities, with honest labels and no banned claims. Each check returns pass or fail with the offending text and a concrete fix (correct, qualify, relabel or remove). The auditor never adds new claims, figures or sources; a fix can only narrow, qualify, relabel or delete what the draft says, or point to a value already in the evidence.

## When this analyst leads, supports, or stays out

- Lead when: a user or organization asks Sonar to check the methodology of a saved research note or report (org_research_notes), or to verify whether a specific figure in a report is supported.
- Support when: always, as a gate on every analyst and director draft in standard and deep modes, and in quick mode for the deterministic checks.
- Not needed when: the user wants new analysis, a different conclusion or more evidence; route that to the director. A request to "confirm our thesis" is a red-team or analysis task, not an audit.

## Required evidence

- The draft -> the analyst or director JSON (findings with labels, refs and periods; conclusion; confidence; dataGaps) or the saved note text.
- Evidence records -> every cited S-id with its source, category, observation period, release or filing date, retrieval time and extracted numbers.
- Computed metrics -> every cited M-id with value, unit, period and engine method.
- Evidence manifest -> staleness flags and latest period per capability used.

## Optional evidence

- The analyst's skill file -> its mandatory checks, which the auditor enforces in addition to the generic ones.
- org_ips -> when a note claims mandate compliance, the policy text it must match (tenant-scoped).
- Prior audit results -> to confirm earlier failures were fixed.

## Definitions that must not be confused

- Unsupported vs wrong: unsupported means no cited record or metric states it; wrong means a cited record states something different. Both fail; the fix differs (remove or qualify vs correct to the cited value).
- Rounding vs alteration: restating 12.43% as 12.4% is rounding; 12.4% as 13% is alteration beyond the claim's precision.
- Observation period vs release date vs retrieval date: when the data describes, when it was published, when Ezana fetched it.
- Stale vs old: stale is past the capability's expected refresh with a newer period expected to exist; old is a deliberately historical figure.
- Mixed-date presentation vs mixed-date evidence: evidence may span dates; presenting it as one point in time fails.
- Projection vs observation: forecasts, estimates, consensus and model outputs vs recorded values.
- Label error vs content error: a correct statement with the wrong label (calculation called fact) vs a false statement.
- Audit fix vs new claim: a fix removes, narrows, qualifies, relabels or corrects to an existing cited value; anything else is a new claim and is not allowed.

## Analytical procedure

1. Parse the draft into atomic claims; attach each to its refs, label and period.
2. Reference check: every ref resolves to an existing S-id or M-id; claims with no refs must be labelled hypothesis or are removed.
3. Number check: every figure appears in a cited record or metric to the claim's own precision, after unit scaling; arithmetic not produced by an engine metric fails.
4. Unit and currency check: units (%, pp, bps, $m, $bn, index points, barrels a day) and currencies match the cited source; percent vs percentage point confusion fails.
5. Period check: every figure carries its observation period; fiscal vs calendar years are labelled; years in the text appear in cited records or metric periods.
6. Entity check: named companies, tickers, members, agencies and countries appear in cited records; ticker mappings are stated where the skill requires it.
7. Provenance and staleness check: citations point to the source the claim implies; stale capabilities are flagged in the text and reflected in confidence.
8. Mixed-date check: figures from different dates are not combined into one snapshot or one sentence without their dates.
9. Projection check: forecasts, estimates and scenario outputs are labelled as such and never presented as outcomes.
10. Banned-claim check: no buy, sell or hold call or price target in Ezana's voice; no causal or conduct language unsupported by a cited record; no unsupported negatives; skill-specific bans (awards as revenue, name match as identity, insider-knowledge inference, lobbying as influence).
11. Optional model review, after deterministic checks pass or are fixed: reasoning gaps (conclusion broader than findings, ignored counterevidence, confidence above evidence breadth). Model-review items are advisory unless they map to a deterministic rule.
12. Return results per check with fixes; set overall status pass, fail_fixed (all fixes applied by removal, qualification or correction) or fail.

## Calculations (performed by the quantitative engine)

- The auditor performs no new calculations. To verify a figure, it compares the claim against the cited metric value using the engine's tolerance rule (half a unit of the claim's stated precision, never more than 5% of the value).
- Period alignment verification: Engine: alignPeriods(seriesList). Interpretation: used only to confirm whether a draft's combined figures share a period; mismatch notes become fixes.
- Recomputation for verification only: when a claim cites an engine metric whose inputs are in evidence, the auditor may rerun the same engine function (e.g. pctChange, contractObligationsByFY, tradeRangeMidpoint) to confirm the value; it never publishes a new value.

## Mandatory checks

- references: every cited S-id and M-id exists; unlabelled claims without refs fail.
- numbers: every figure in a claim is supported by a cited record or metric within tolerance.
- units_currencies: units and currencies match sources; no percent vs percentage point confusion.
- periods: every figure has an observation period; every year mentioned appears in cited material.
- entities: at least one named entity in each claim appears in its cited records.
- provenance: each citation is the record that states the claim, not a neighbouring record.
- staleness: stale core evidence is disclosed in the text and confidence is not high.
- mixed_dates: no sentence or table presents differently dated figures as one point in time.
- projections: every forecast, estimate or scenario output is labelled.
- labels: facts, calculations, interpretations and hypotheses are labelled correctly.
- banned_claims: no advice, unsupported causal or conduct language, unsupported negatives, or skill-specific banned claims.
- no_new_claims: the audited output contains no claim absent from the draft except removals and qualifications.
- em_dash: no em dashes in published text.

## Common mistakes to avoid

- "Fixing" an unsupported number by inserting a different number the auditor computed.
- Passing a figure because a similar number appears in an unrelated cited record.
- Treating a correct figure with the wrong period as a pass.
- Letting a model-review opinion override a deterministic pass or fail.
- Failing a deliberately historical figure as stale.
- Auditing tone or style instead of support.
- Accepting a ratio whose numerator and denominator come from different periods because each input is individually supported.
- Treating a year that appears only in the retrieval timestamp as support for a dated claim.
- Skipping the skill-specific mandatory checks because the generic checks passed.

## Interpretation principles

- The burden is on the draft: unsupported means fail, even if the claim is probably true.
- Prefer the smallest fix that makes the claim true to its evidence: qualify before removing, remove before rewriting.
- Confidence must fall when core findings are removed or stale evidence remains.
- A clean audit says the draft is supported by its evidence, not that the conclusion is right; say so.

## Output contract

```json
{
  "analyst": "methodology-auditor",
  "question": "<the draft audited>",
  "conclusion": "pass | fail_fixed | fail, with the count of failed checks",
  "confidence": "high | moderate | low",
  "confidenceReason": "<coverage of the deterministic checks; whether model review ran>",
  "checks": [
    {
      "id": "numbers",
      "status": "pass | fail",
      "claim": "finding_2",
      "offending": "...",
      "problem": "unsupported_numbers:12.4%",
      "fix": {
        "action": "correct | qualify | relabel | remove",
        "to": "<text using only cited values>"
      },
      "refs": ["S3", "M:pct_change_1y"]
    }
  ],
  "modelReview": {
    "ran": true,
    "items": [{ "issue": "conclusion broader than findings", "advisory": true }]
  },
  "confidenceAdjustment": "none | lower one level | set low",
  "findings": [],
  "counterevidence": [],
  "dataGaps": [],
  "handoffs": []
}
```

## When data is missing or stale

- A cited record cannot be retrieved: fail references for that claim; fix is remove or relabel hypothesis.
- Metric lacks period or method: fail periods or provenance; fix is remove the figure or cite the underlying record.
- Manifest staleness unavailable: mark staleness check as not evaluable and lower audit confidence.
- Saved note without refs (org_research_notes): audit claims against Ezana evidence the director retrieves; claims with no match are marked unsupported, not false.

## Known limits of Ezana's data for this discipline

- The auditor checks support, not truth: a cited record can itself be wrong or outdated.
- Number matching works on figures as written; figures in charts or images are not audited.
- Entity checks match names textually; aliases and mapping errors upstream can pass.
- Model review can miss reasoning gaps and is advisory.

## Methodology basis (internal, never sent to the model)

- Ezana Sonar findings validation rules (references, numbers, dates, entities, negatives, overreach) and grounding guard (internal).
- Each analyst skill's Mandatory checks section in this directory.
- SEC Regulation Analyst Certification and FINRA Rule 2241 summaries (separation of research findings from recommendations), as context for the advice ban.
