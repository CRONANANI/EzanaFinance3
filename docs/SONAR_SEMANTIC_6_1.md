# Sonar 6.1: end-to-end completion (Nov 28 2026)

Builds on Sonar 6.0 (`docs/SONAR_SEMANTIC_6.md`, commit 0f605ae7). Commits: 4dec9176 and 51875943.

## 1. Root cause: "the analysis step did not complete in time"

The label was wrong; the failure was not a timeout.

- **Evidence:** in the 14 days to Nov 28, 14 of 19 standard research runs in `sonar_research_runs` were deterministic (the written analysis was missing). None recorded a provider error.
- **Production logs:** every failed run inspected (Nov 27 13:43, Nov 27 17:54, Nov 28 08:51 UTC) shows `[sonar] anthropic usage ... output_tokens: 2100`. That is exactly the standard cap: 1,600 tokens plus 500 for the desk fields.
- **What happened:** the writer's JSON reply was cut at the token limit, so `parseResearchJson` returned null. The engine then fell back to the deterministic report and labelled it "did not complete in time".
- **Contributing cause:** in standard runs, specialists could run until `deadline - synthMs`, and `synthMs` was only 9 s, much less than the 25 to 30 s a full Haiku reply takes.

**Where the generic Pelosi profile came from.** Before 6.0, Query B attached no ownership analysis. With no composition, the fallback quoted the top retrieved records, which were Pelosi's disclosures. When a composition exists, the fallback already leads with the computed ranking (that is what Query A showed).

## 2. Fixes

| Area | Change |
| --- | --- |
| Writer budget | Standard profile: 2,400 tokens (cap 2,900), a 55 s budget, 32 s reserved for the writer, and a 34 s hop. The synthesis input carries a length budget. |
| Truncation | The provider now returns `stop_reason`. A cut reply is repaired by `repairTruncatedJson`: only complete array items and top-level keys survive, so no half-written finding is kept. The report says when it was shortened. |
| Honest labels | The fallback states the real cause: truncated, timeout, provider, invalid or skipped (`WRITER_FAILURE`). It is recorded on the run in `plan.writer`. |
| Required tasks | A supported ownership ranking is required. The server adds it when the page omitted it, unless the reader removed it (the composer now sends its dismissed capabilities). |
| Fulfillment | `intentFulfillment` checks holdings, 13F data, the computed ranking and the reporting period. When any check fails, the reader gets a notice. |
| Safe reuse | `result-reuse.js` (section 5). |
| Entity candidates | Lower-case surnames ("which pelosi holdings") and possessives without an apostrophe ("Pelosis holdings") become candidates and are tried by server resolution. A lower-case candidate counts only if it resolves to a member of Congress. If none resolves, the ranking does not run on a guess. |
| Compositional intent | `compositional.js` (section 4). |
| Follow-ups | `followUpIntent`: a short follow-up that swaps the entity ("What about Tommy Tuberville?") or the ranking method ("rank by dollar value instead") inherits the parent's intent. |
| Typos | Corrected against the domain vocabulary (one edit, words of 7+ letters). Names are never corrected. |
| Telemetry | `plan.canonicalIntent` (signature, family, measure, operations, reuse source) and `plan.writer` on every run. There is no query text in the signature. |

Still marked unsupported and never substituted: institutional ownership percentage, lowest-first ranking, and recent-trades-only universes. The reader sees a notice.

## 3. Live execution traces (production, guest, built-in browser)

| | Query A, before | Query B, before | Query A, after | Query B, after |
| --- | --- | --- | --- | --- |
| deployment | a2bb190e | a2bb190e | 4dec9176 | 4dec9176 |
| run (UTC) | 11:26:21 | 11:27:29 | 11:55:48 | 11:57:14 |
| ownership ranking | yes | yes | yes | yes, reused from 11:55:17 |
| 13F quarter / eligible / matched | 2026-09-30 / 20 / 20 | same | same | same |
| ranks 1 to 5 | MSFT 1,255, AAPL 1,244, AMZN 1,218, NVDA 1,195, GOOGL 1,129 | identical | identical | identical |
| written analysis | failed (deterministic) | failed | completed (2,727 output tokens) | completed |
| confidence shown | Medium | Medium | High | High |
| plan signature | n/a | n/a | cri1-80316b515b0a073f (resolved) | cri1-80316b515b0a073f |
| duration | 23.5 s | 22.1 s | 31.3 s | 29.5 s |

Query B, after, showed: "Sonar reused the ownership calculation it completed at 11:55 UTC on the same data: no new disclosures or 13F filings have arrived since."

**Screenshots:** the "before" report headers for both queries were captured. The "after" screenshots could not be taken because the browser pane on the user's computer was covered by another window (screenshot capture timed out), so the "after" evidence is the page text and the run records above. Further live queries hit the guest limit of 5 pings, so the lower-case candidate and unsupported-measure cases were verified by tests, not live.

**Only two runs since the deploy.** That is not enough to state a new failure rate. Re-check `sonar_research_runs.deterministic` and `plan->'writer'` after a day of traffic.

## 4. Compositional intent

A question is read as typed parts:

- **Universe:** sector, index, tickers or entity.
- **Filters:** a measure compared with a number, or the existence of an event.
- **Measures:** about 26 typed measures, each bound to a dataset with an availability flag from the Nov 28 table audit.
- **Operation:** rank, screen, compare, relate (driver to target), model (DCF, GARCH, backtest, Monte Carlo) or assess.
- **Time:** the window the question names.

New families: `multi_stage_screen`, `macro_relationship`, measure-defined `fundamental_analysis`, and the model families. Assess families collapse to their defining measure, so wording is not material. A measure without data (short interest, ESG) is reported as unsupported. The older cue families remain only for questions with no measure (open risk, strategy, Echo coverage).

## 5. Safe result reuse

A stored computation is used only when every one of these matches:

- the resolved plan signature (never an unresolved one);
- the data epoch, read live (the member's disclosure count and latest date, and the 13F filer counts for each recent quarter-end);
- the intent, ownership method, composition and reuse versions;
- the attachment parameters;
- the access class (guest or member).

It also requires:

- public capabilities only, with no organization scope and no query or file attachments;
- a complete computation whose fulfillment check passed;
- an age under 6 hours.

Reuse is bypassed when the question asks for the latest data. Storage is `sonar_cache`; no migration is needed.

## 6. Benchmark and calibration

Benchmark `sem-bench-v2` (`npm run test:sonar-semantic`):

- 118 queries in 38 groups, 32 hard negatives, 7 follow-ups, and 139 deterministic noisy variants (lower case, casual opener, filler, typo).
- Recall 80/80 pairs, false equivalence 0/32, noise 139/139, follow-ups 7/7.
- Deterministic stage: about 0.05 to 0.26 ms per question.

Calibration against the production embedder (`GET /api/sonar/semantic-calibration`, gte-small 384-d, 306 texts, 304 embedded, Nov 28 11:57 UTC):

- **Similarity:** positive pairs have a median of 0.948 (minimum 0.808). Hard negatives have a median of 0.869, a 95th percentile of 0.986 and a maximum of 0.997.
- **Cosine alone:** the best F1 is 0.927 at 0.87, with precision 0.884, so about 1 in 9 "equivalent" calls would be wrong.
- **Structural equivalence:** precision 1.000 and recall 1.000 on 323 positive and 83 negative pairs.
- **Measure gating:** now 0.90 with a 0.02 margin, which answers 25.7% of 35 ownership questions, all correctly. The previous 0.86 / 0.04 answered 17.1%. No setting below 0.90 was fully accurate.
- **Embedding latency:** p50 274 ms, p95 364 ms per call.

## 7. Regression

All 53 `test:sonar-*` suites pass (835 tests, 0 failures). The analyst evals are unchanged (72 of 253, the same as before).

## 8. Known limits

- The guest ping limit prevented live checks of the lower-case candidate path and the unsupported-measure notice; both are covered by tests.
- Only the institutional ownership ranking has an executor among the compositional families. Screens, macro relationships and models are understood and planned, but their computation still runs through ordinary research or existing composer capabilities.
- When a composition times out, its partial results are still not kept; the failure is shown explicitly.
- Long Haiku replies take about 30 s. A reply that still exceeds the cap is repaired and labelled, not discarded.
- Only English is supported.
- The calibration sample for measure gating is small (35 questions). Re-run it whenever the exemplars or the benchmark change.
