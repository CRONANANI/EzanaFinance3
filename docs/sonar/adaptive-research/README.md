# Sonar adaptive research

Sonar plans its research from the question. Two questions about the same
company can lead with different evidence, run different computations and open
with a different section, inside one design.

Status: the first vertical slice. Two scenarios run end to end. The other
scenarios route and plan, and are answered by the existing Sonar pipelines.

## How a ping flows

1. `/api/sonar/landing-query` receives the ping (and, for a follow-up, the
   thread it was asked in).
2. An exemplary brief for the exact question is served first, if one exists.
3. `planAdaptive()` builds a `ResearchPlan`: lead scenario, supporting
   scenarios, entities, required evidence, computations, analysts, section
   order, confidence and the reasons for the route. Pure; nothing is spent.
4. If the lead scenario has an executor and the plan is confident and
   complete, the ping is reserved as usual and `runAdaptive()` runs it. The
   result is a validated report: an ordered list of typed sections and the
   sources they cite.
5. Otherwise the ping continues exactly as before (research-mode classifier,
   then quick, standard or deep). A follow-up no executor takes comes back as
   standard research with the question written out in full.
6. An adaptive run that returns nothing usable falls through to the old
   pipeline on the same reservation. A ping is never charged twice.

## Module map

| Module                                                  | Role                                                           |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| `src/lib/sonar/adaptive/profiles.js`                    | The scenario registry: 30 scenarios, 4 council overlays.       |
| `src/lib/sonar/adaptive/router.js`                      | `planAdaptive(question, { thread })` to a `ResearchPlan`.      |
| `src/lib/sonar/adaptive/thread-context.js`              | Resolves "him", "that company" from the thread; sanitises it.  |
| `src/lib/sonar/adaptive/technical.js`                   | RSI, SMA, EMA, MACD, ATR, realized volatility, ranges.         |
| `src/lib/sonar/adaptive/news-intelligence.js`           | Canonical addresses, clusters, source classes, relevance.      |
| `src/lib/sonar/adaptive/prediction-intelligence.js`     | Strict market matching and normalisation.                      |
| `src/lib/sonar/adaptive/succession-research.js`         | The one live research call, and the validator for its reply.   |
| `src/lib/sonar/adaptive/layout-planner.js`              | Which sections appear, in what order; absences said once.      |
| `src/lib/sonar/adaptive/schema.js`                      | The report contract; removes what cannot be vouched for.       |
| `src/lib/sonar/adaptive/orchestrator.js`                | `runAdaptive(plan, deps)`; one executor per runnable scenario. |
| `src/components/sonar/adaptive/SonarAdaptiveReport.jsx` | One renderer per section type, in report order.                |
| `src/components/sonar/adaptive/SonarTechnicalChart.jsx` | Price, averages, volume and RSI, full width.                   |

## What runs today

**B01, price action and technical analysis** ("Is NVIDIA technically
oversold?"). Deterministic end to end and makes no model call. Daily bars come
from the existing price helper; RSI(14), the 20, 50 and 200-session averages,
MACD, ATR(14), 30-session realized volatility and the 52-week range are
computed in code; the headline and summary are assembled from those numbers.
Sections: lead, full-width chart, computed readings (each with its method),
recent coverage when the cache has any, sources, limits, follow-ups. With no
prices it says so and computes nothing.

**A02, executive succession** ("Who will replace him?" under the NVIDIA
question, or "Who will replace Jensen Huang?"). One live research call with
web search verifies the current state and collects named candidates. Its
reply is validated before use: a link is kept only if the search tool
returned it in that call; a candidate needs at least one such link and one of
three bases (named by the company, named in reporting, named in third-party
analysis); a "verified" status needs a regulator, issuer or established news
source. Prediction markets are retrieved and then strictly matched. Sections:
lead, where things stand, matching contracts (only if any), who has been
named (or a plain statement that no credible list exists), what has been
reported, scenarios (labelled as interpretation), a secondary price chart,
what to monitor, sources, limits, follow-ups. Once a successor is named the
"who will" markets are dropped. With the model unavailable it says
verification did not complete and lists cached coverage only.

## Budgets

| Scenario | Budget from request start                                | Model calls                  | Provider calls                         |
| -------- | -------------------------------------------------------- | ---------------------------- | -------------------------------------- |
| B01      | 14 s (bars 9 s, news 3.5 s)                              | 0                            | 1 price read, 1 news read              |
| A02      | 45 s (research to the deadline, markets 6 s, news 3.5 s) | 1, with up to 4 web searches | 1 retrieval, 1 index read, 1 news read |

The route's `maxDuration` is 90 s. Each step is bounded and recorded
(`telemetry.steps`); the route logs scenario, sections, step timings,
degraded steps and how many markets were considered and shown. Telemetry
stays in the logs and is not sent to the page. No cost figure is computed.

## Rollout and rollback

- On by default. Set `SONAR_ADAPTIVE=off` in the environment to turn it off
  without a deploy; every ping then takes the old path.
- Only B01 and A02 take pings, and only when the plan's confidence is at
  least 0.42 and the entities the scenario needs are named.
- To revert the code: the adaptive layer is additive. Removing the `adaptive`
  entry from `formats` in `SonarSection.jsx` stops the page asking for it.

## Tests

`npm run test:sonar-adaptive`: 84 tests. 64 routing evaluations
(`scripts/fixtures/sonar-adaptive-evals.mjs`), the indicator definitions
against a published RSI example, market matching, news clustering, the reply
validator (including an injected candidate and a made-up link), the report
contract, the layout planner, and both executors end to end with every source
faked (`scripts/fixtures/sonar-adaptive-data.mjs`), including no prices, no
market, a named successor and every feed down.

## Council overlays

`overlays.js` holds D01 to D04; `org-deps.js` builds their readers. The rules:

- An overlay runs only when the question's primary scenario is an overlay,
  the request is signed in, and `resolveOrgContext()` finds an active
  membership for that user. The organization id is that membership's. It is
  never read from the request.
- Pitches and council reports are read with the caller's own token, so
  row-level security decides what is visible, and are also filtered to the
  organization. Fund context is read with the service client scoped to the
  verified organization id, as the org research route already does.
- No model or web call sees organization data. Nothing is written.
- The answer is flagged `org: true`. The page hides Save Research and the save
  route refuses it, so council content does not enter personal research.
- IPS wording: a rule is "marked blocking in the IPS". Sonar does not place,
  stop or approve trades and each answer says so.

## Streaming (plan only)

Not built, by decision: it follows stable live validation.

1. The route already produces sections in a fixed order. Emit them as
   server-sent events: `plan`, then one `section` per validated section, then
   `sources`, then `done` with the same report the JSON response returns today.
2. Validate each section before it is sent. A section the validator would
   remove is never shown and then withdrawn.
3. Settle the ping once, on `done`. An aborted stream cancels the reservation,
   as an aborted request does now.
4. The client keeps the JSON path as the fallback and as the only path when
   `SONAR_ADAPTIVE_STREAM` is not `on`.
5. Saved research and the session thread store the final report only.

## Not built

- **Streaming.** Plan above.
- **Live validation.** The runner exists; it has not been executed against
  production. See `IMPLEMENTATION_MATRIX.md`.
- **A real 13F dry run and backfill, and published lobbying identities.**
  Both wait for approval; see `DATA_COVERAGE.md`.
- **Overlay write paths.** Attaching research to a pitch or sharing a report
  is not done from Sonar.
- **Hybrid classification.** Routing is deterministic. An ambiguous question
  is left to the existing classifier, not sent to a model.
- **Contract price history, spread, bid and ask, resolution rules.**
- **Event study, sector heatmaps, valuation distribution charts.**
- **Migrating the exemplary brief to the section schema.**
