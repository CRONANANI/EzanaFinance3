# Sonar adaptive research: repository audit

Date: November 16, 2026. Commit audited: `57cc484` (main).

This audit was made by reading the code on main. It does not include a
reading of the production database or of any provider's live responses: where
a capability depends on a table existing or a key being set in production,
that is said. "Confirmed" means the code path exists and is exercised by a
route or a test, not that it was observed running in production.

## Confirmed: exists and was reused

| Capability                                                                                      | Where                                                                                                                             | How the adaptive layer uses it                                                              |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| The analyst roster: 21 roles (18 specialists, research director, methodology auditor, red team) | `src/lib/sonar/analysts/registry.js`                                                                                              | Every scenario profile names its analysts by registry id. No role is defined anywhere else. |
| Company names to tickers                                                                        | `src/lib/sonar/company-mentions.js`                                                                                               | The router's entity step.                                                                   |
| Time horizon of a question                                                                      | `timeHorizonOf` in `src/lib/sonar/engine/research-spec.js`                                                                        | The plan's `timeHorizon`.                                                                   |
| Daily OHLCV bars with a stated adjustment basis                                                 | `getDailyOhlcv` in `src/lib/prices/daily-bars.js`                                                                                 | The technical executor's only price source.                                                 |
| Daily closes for a comparison chart                                                             | `/api/sonar/market-context`, `src/lib/sonar/market-context.js`                                                                    | The secondary price comparison, drawn client-side from real closes.                         |
| News cache read (by ticker and full text)                                                       | `newsEvidence` in `src/lib/sonar/landing-research.js` over `news_articles_cache`                                                  | Input to the news intelligence layer.                                                       |
| Hybrid prediction-market retrieval (vector and full text)                                       | `src/lib/research-copilot/retrievers/markets.js` over `prediction_market_index`                                                   | Candidate markets, before strict matching.                                                  |
| Model call with web search and a provider chain                                                 | `synthesizeWithFallback` in `src/lib/sonar/llm-providers.js` (Anthropic web search tool; returns every result the tool retrieved) | The one live research call of the succession executor. No new provider or key.              |
| Ping reservation, settlement and guest cap                                                      | `src/lib/sonar/quota.js`, `/api/sonar/landing-query`                                                                              | Adaptive runs on the reservation the route already makes.                                   |
| Research-mode classifier (quick, standard, deep)                                                | `src/lib/sonar/research-mode.js`                                                                                                  | Unchanged. Decides every ping the adaptive router does not take.                            |
| Follow-up context shape                                                                         | `followUpContext` in `src/lib/sonar/workspace.js`                                                                                 | The thread a follow-up carries is this context plus the person and event.                   |
| Exemplary briefs                                                                                | `src/lib/sonar/exemplary/`                                                                                                        | Checked first by the route, before the adaptive plan.                                       |

## Partially implemented before this work

| Capability                    | State found                                                                                                                                | What was added                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Deterministic numerics        | `analysts/quant.js` has 50 functions (returns, volatility, drawdown, event study, multiples, 13F changes and more) but no chart indicators | `adaptive/technical.js`: RSI, SMA, EMA, MACD, ATR, realized volatility, 52-week range, each with its method stated.                        |
| News handling                 | Dedupe by title or address in two places; no clustering, source classes or relevance score                                                 | `adaptive/news-intelligence.js`: canonical addresses, clusters with corroboration counts, source classes, a deterministic relevance score. |
| Prediction markets in answers | Retrieval by similarity only; a market could be shown because it was near the question                                                     | `adaptive/prediction-intelligence.js`: a market is shown only when it names the entity, is about the same event, is open and is priced.    |
| Follow-ups                    | Always standard research, with a context blob the model reads                                                                              | The thread now also resolves references ("him", "that company") deterministically and re-plans the follow-up.                              |
| Answer layout                 | One layout per surface (quick board, research report, exemplary brief)                                                                     | An ordered list of typed sections chosen per scenario, one renderer per type.                                                              |

## Missing before this work, now built

- A scenario registry (30 scenarios, 4 council overlays) with evidence, computations, analysts and layout per scenario.
- A `ResearchPlan` assembled from the question and its thread.
- A report contract (typed sections, validated citations) and a section renderer.
- Two executors: technical analysis (B01) and executive succession (A02).

## Missing and still not built

See README.md, "Not built". In short: executors for the other 28 scenarios
and the 4 overlays; persistence of adaptive reports to saved research; a
streamed run; the model-backed (hybrid) classifier for ambiguous questions;
contract price history in the succession answer.

## Unavailable or unverified

| Item                          | Status                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Production schema             | Not read. `prediction_market_index` columns were taken from its migration (`20260716000000`). `news_articles_cache` columns were taken from the queries that read it.          |
| Prediction-market freshness   | The index is filled by cron routes. It is indexed data, not a live feed. The page labels prices "Latest indexed" with the index time, or "Stale" past six hours.               |
| Resolution rules per contract | The index has `description` only. It is shown as the contract's own text. There is no structured resolution-criteria field, outcome id or bid and ask, so spread is not shown. |
| Multi-outcome markets         | The index stores one row per yes/no contract. Outcomes of one event are not grouped into a denominator, so no multi-outcome probabilities are derived.                         |
| Intraday bars                 | None. VWAP and intraday readings are not computed.                                                                                                                             |
| Options, analyst estimates    | No source found. Not used.                                                                                                                                                     |
| Crypto price bars             | Not confirmed in `getDailyOhlcv`. A crypto technical question routes to B01 but is not executed.                                                                               |
| Live provider behaviour       | No provider was called during this work. The succession path's model call and the price path's bar fetch were exercised with fixtures only.                                    |
