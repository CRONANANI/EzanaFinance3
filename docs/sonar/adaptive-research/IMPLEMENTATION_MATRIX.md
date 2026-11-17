# Adaptive research: implementation matrix

Last updated Nov 17, 2026. Keep this file in step with `EXECUTORS` in
`src/lib/sonar/adaptive/orchestrator.js` and `executable` in `profiles.js`.

## What the states mean

- **Operational**: routes, runs its own executor, validates its output, has
  a truthful unavailable state, has end-to-end tests, and renders. It still
  carries the note "not yet read against production providers" until the
  first production pings have been checked in the logs (see Validation).
- **Partial**: an executor exists but a required input or section is
  missing.
- **Classified only**: the router recognises the question and writes a plan;
  the answer comes from the existing Sonar pipelines, not an executor. This
  is not a completed pipeline.

Routing and a fixture render are never enough for "Operational".

## Events and the news cycle

| ID  | Scenario                               | State           | Notes                                                                                                                    |
| --- | -------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| A01 | Event verification                     | Classified only |                                                                                                                          |
| A02 | Executive succession forecasting       | Operational     | Validated research call, strict market matching, news cache                                                              |
| A03 | Corporate leadership impact            | Operational     | Added Nov 17. Validated research call, measured reaction since the event, exposure table, cited baseline figures         |
| A04 | Earnings preview and surprise          | Classified only | Phase 2                                                                                                                  |
| A05 | Breaking news and market reaction      | Operational     | Added Nov 17. Listed securities only; daily closes, so not intraday. Market-wide and macro "why" questions are not taken |
| A06 | M&A, acquisition or divestiture        | Classified only |                                                                                                                          |
| A07 | Regulatory and legal decision forecast | Classified only | Phase 3                                                                                                                  |
| A08 | Geopolitical event and policy shock    | Classified only | Phase 3                                                                                                                  |
| A09 | Live event watch and catalysts         | Classified only |                                                                                                                          |
| A10 | Narrative and sentiment shift          | Classified only | Phase 3                                                                                                                  |

## Companies and markets

| ID  | Scenario                                   | State           | Notes                                           |
| --- | ------------------------------------------ | --------------- | ----------------------------------------------- |
| B01 | Price action and technical analysis        | Operational     | Deterministic; no model call                    |
| B02 | Equity fundamental health                  | Classified only | Phase 2 (financial statements, risk and thesis) |
| B03 | Valuation and peer comparison              | Classified only | Phase 2, first in order                         |
| B04 | Revenue concentration and dependence       | Classified only | Phase 2 (government contracts)                  |
| B05 | Industry value chain and competition       | Classified only | Phase 2                                         |
| B06 | Institutional ownership and flows          | Classified only | Phase 2 (13F)                                   |
| B07 | Insider and congressional transactions     | Classified only | Phase 2                                         |
| B08 | Corporate lobbying and government exposure | Classified only | Phase 3                                         |
| B09 | Cross-asset and sector performance         | Classified only |                                                 |
| B10 | Quant strategy, factor and risk            | Classified only | Phase 3                                         |

## Macro and global

| ID  | Scenario                             | State           | Notes                                                  |
| --- | ------------------------------------ | --------------- | ------------------------------------------------------ |
| C01 | Country macro assessment             | Classified only | Phase 2                                                |
| C02 | Global factual rankings              | Classified only | Phase 2                                                |
| C03 | Commodity supply and demand          | Classified only | Phase 3                                                |
| C04 | Rates, inflation and credit          | Classified only | Phase 3                                                |
| C05 | FX and sovereign risk                | Classified only | Phase 3                                                |
| C06 | Sanctions and trade exposure         | Classified only | Phase 3                                                |
| C07 | Crypto and on-chain intelligence     | Classified only |                                                        |
| C08 | Prediction markets and event pricing | Classified only | Phase 3. The matching module exists and is used by A02 |
| C09 | Emerging-market comparisons          | Classified only | Phase 2                                                |
| C10 | Supply chain and geography shock     | Classified only | Phase 3                                                |

## Council overlays

| ID  | Overlay                                               | State           | Notes                                       |
| --- | ----------------------------------------------------- | --------------- | ------------------------------------------- |
| D01 | Fund fit (IPS)                                        | Classified only | Phase 4. No organization data is read today |
| D02 | Pitch due diligence                                   | Classified only | Phase 4                                     |
| D03 | Fund risk and catalyst assessment (holdings)          | Classified only | Phase 4                                     |
| D04 | Research handoff and collaboration (Research Library) | Classified only | Phase 4                                     |

A personal question never reads council data: a plan that needs an
organization marks its organization sources as excluded when none is present,
and no overlay has an executor.

**Totals: 4 operational, 0 partial, 26 classified only, 4 overlays classified only.**

## Cross-cutting work

| Item                                       | State     | Notes                                                                                                                                                |
| ------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exemplary brief expiry                     | Done      | `exemplary/freshness.js`. Event instant, review date, or retirement by slug with `SONAR_EXEMPLARY_RETIRED`. A withdrawn brief runs as A03            |
| Follow-ups across pipelines                | Partial   | A02, A03, A05 and B01 offer each other's questions and carry the thread. A follow-up is re-planned and re-researched, never answered from the thread |
| Answer template                            | Done      | Brief and adaptive reports share the layout: follow-ups under the question, controls rail, sections in plan order                                    |
| Saving adaptive answers                    | Not built | No Save Research, history entry or session navigation for an adaptive report                                                                         |
| Streaming                                  | Not built | The report arrives whole                                                                                                                             |
| Research Controls applied to adaptive runs | Not built | The controls are shown; an adaptive executor does not read focus, horizon or sources yet                                                             |
| Real-provider validation                   | Not done  | See below                                                                                                                                            |

## Validation against real providers

Nothing here has been run against production prices, the news cache or the
model. This workspace has no production credentials and none were requested.
To validate after deploy, signed in, ping each of these and read the
`[sonar/landing] adaptive` log line (scenario, ms, degraded steps):

1. `Is NVIDIA technically oversold?` (B01)
2. `Who will replace Jensen Huang?` (A02)
3. `How will the CEO change affect NVIDIA and the chip industry?` (A03)
4. `Why is NVDA stock down this week?` (A05)

Check: `degraded` is empty; every figure in "The move, measured" matches the
chart; every source link opens; no candidate, catalyst or figure appears
without a citation. `SONAR_ADAPTIVE=off` returns every ping to the previous
pipelines.
