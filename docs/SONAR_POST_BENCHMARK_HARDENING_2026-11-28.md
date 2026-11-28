# Sonar post-benchmark hardening (Nov 28 2026)

This report answers "EZANA SONAR — POST-BENCHMARK HARDENING".

**This task made no Anthropic API requests, ran no LLM-based evaluation and switched no production model routing.**

- **No key, no calls:** the workspace has no `ANTHROPIC_API_KEY`, and Sonar's provider refuses to call without one.
- **Network guard in tests:** every new test also replaces `fetch` with a guard (`scripts/lib/no-llm-guard.mjs`) that fails on any LLM host.
- **Production unchanged:** every production run on Nov 28 served the `current` profile.

Every result below comes from:

- deterministic tests;
- saved artifacts in `sonar_research_evaluations`;
- read-only SQL against production data.

---

## 1. Cross-dataset planner: root cause

The failing case was `screen_congress_contracts_13f`: "companies Congress bought in the last 12 months, that won new federal contracts in the same period, whose institutional ownership rose". The frozen d3 snapshot shows four independent breaks.

| #   | Where                          | What happened                                                                                                                                                                                                                                             | Evidence                                                                            |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | Dataset planner (`planner.js`) | `contracts_history`, `institutional_13f`, `congress_company` and `congress_sector` all need tickers. The question names none, so all four were excluded as `unmet_needs:tickers`. Nothing could supply tickers from an earlier stage.                     | d3 snapshot `plan.excluded`                                                         |
| 2   | `congress_activity`            | The only ticker-free congressional source is a chamber-wide aggregate (counts, lags, top members). Its detector needs an aggregate question, so it returned nothing. It could never list companies.                                                       | `congressActivitySource`; data has 3,879 purchases across 738 tickers in the window |
| 3   | Composer (`intents.js`)        | The intent parser read the question correctly: multi-stage screen, filters congress and contracts, a 13F measure, a 12-month window. But the screen attachment required a sector universe, so it returned nothing: "no composition (multi_stage_screen)". | `canonicalIntent` output                                                            |
| 4   | Measures                       | "Ownership rose" had no change measure (only breadth). "Contracts in the same period" was read as the latest complete fiscal year, not the 12-month window.                                                                                               | `SCREEN_MEASURES`                                                                   |

Two further data findings:

- `contract_awards_resolved` holds future-dated `action_date` values, up to 2027-12-01. The new reads exclude them.
- Registry validation (`validateAttachment`) also rejected a screen without a sector or tickers, as "conditional".

## 2. Fixed research-execution chaining

**Typed intermediate results** (`src/lib/sonar/composer/stages.js`). Each stage result carries:

- canonical security ids (`cik:`, then `cusip:`, then `ticker:`, never mixed), with ticker, CIK and name;
- as-of date and period;
- coverage (requested, covered, missing);
- source lineage (table, filter, as-of, records read and dropped);
- downstream parameters (tickers, since, until);
- one of the states `ok`, `partial`, `empty`, `failed` or `skipped`. Empty, failed and skipped require a reason.

Results are validated and frozen. An `ok` result without rows or without lineage throws. `runStageChain` hands each stage only its predecessor's verified universe. An empty or failed stage stops the chain, and every later stage is recorded as skipped, with the upstream reason.

**The chain for the screen** (`runScreen` in `analytics-server.js`):

1. **Seed stage.** With no sector or tickers, the first condition that can list companies from dated records seeds the universe: congressional purchases, insider purchases, or federal awards signed in the window. A fiscal-year contract measure never seeds, because its period differs from the window. Junk tickers and future dates are dropped and counted.
2. **Filter stages.** Conditions run in the order stated. Each reads only its predecessor's survivors (before, every source was read for the whole universe). An `exists` seed condition is satisfied by the seed itself. A threshold on it still runs.
3. **New measures:**
   - `institutional_breadth_change`: net change in 13F managers among filers present in both quarters (`comparableNow - comparablePrior`), so a manager that hasn't filed yet isn't read as selling.
   - `gov_contract_value_window`: awards with an action date inside the window.
4. **Parser.** "Institutional ownership rose / increased / grew" becomes the filter `> 0`. "Rank them" with no measure ranks by the final stage's measure, and the report states this.
5. **Planner.** A composed screen's verified survivors become the dataset planner's universe when the question names no company (`universeFromComposition`, wired in `engine.js`). Contracts, 13F and per-company congressional sources then run on the screened companies. A test shows `contracts_history` and `institutional_13f` excluded before the fix and planned after.
6. **Nothing is fabricated.** A company without a record is "no data", counted in coverage and never passed. An empty stage is an explicit empty result. A read error is a failed stage carrying its reason.

**Verified with a saved fixture** (in-memory Supabase with the shapes of `congress_trades`, `contract_awards_resolved`, `sec_cusip_map`, `sec_13f_effective_filings` and `sonar_13f_ownership`):

| Stage               | Survivors                 | Notes                                                    |
| ------------------- | ------------------------- | -------------------------------------------------------- |
| Seed                | AAA (2 members), BBB, EEE | A sale and a junk ticker dropped                         |
| Contracts in window | AAA, EEE                  | BBB's award is future-dated; ZZZ is outside the universe |
| 13F rise            | AAA (+2)                  | EEE −2. The 13F read asked only about AAA and EEE.       |

Further fixture cases cover an empty contracts stage, an empty seed and a failed read. All are explicit.

**Not verified end to end:** no live run was possible (no API calls). The screen now composes, and the planner receives the universe, but a real benchmark run of this case remains to be done when budget allows.

## 3. DCF correctness audit (Microsoft)

The audit replayed the frozen d3 MSFT inputs deterministically. The saved $80.02 per share reproduces exactly, so the stored arithmetic is consistent.

| Item                    | Finding                                                                                                                                                                                                                                                                                                 | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing share price     | **Root cause:** the engine called `fetchDeepValuation(ticker, { ms, now })` with no quote, so deep runs never had a price, whatever FMP returned. The FMP 402 only made it worse. Market cap came from the stored daily caps, so the price was null while market cap was $3.66T.                        | **Internal price cache checked:** `price_data_cache` holds MSFT closes through 2026-11-27. When there is no live price, `storedClose` reads the latest close within 10 days, labelled `stored_close` with its date. Wired in the engine, the adaptive deps and the benchmark capture. Older than 10 days, or none, means no price. Nothing is estimated.                                                                                                                                 |
| FMP 402                 | The quote endpoint is refused for the key (separate from this task).                                                                                                                                                                                                                                    | No longer needed for the DCF price.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Capex assumption        | Trailing capex was 39.2% of revenue, against D&A of 12.2%. It was held flat for 5 years and into the terminal value, so the model reinvested about 27% of revenue forever at 2.5% growth. Filed MSFT capex/revenue: FY2021 12.3%, FY2022 12.0%, FY2023 13.3%, FY2024 18.1%, FY2025 22.9%, FY2026 34.9%. | **Explicit and editable:** capex intensity fades linearly from the trailing ratio (year 1) to a terminal ratio by year 5, and the terminal value uses the terminal ratio. The terminal ratio is, in order: a reader override (`capexTerminalPct`, labelled `override`); else the median of the company's own fiscal-year trailing windows (at least 3 years), floored at D&A; else the trailing ratio held flat. The assumptions table states the path, the history used and the source. |
| Capex sensitivity       | None existed.                                                                                                                                                                                                                                                                                           | New grid: D&A only, history median, midpoint, and trailing held flat (the old assumption). For MSFT: $273.69 (D&A), about $250 (15.7% median), $163, and $80.02 (flat). The capex assumption alone spans $80 to $274.                                                                                                                                                                                                                                                                    |
| Valuation-metric wiring | Fixed earlier (metrics reach the writer).                                                                                                                                                                                                                                                               | New metrics: `dcf_capex_pct_terminal`, `dcf_price_used` (with source and date), and per-share values from the capex sensitivity.                                                                                                                                                                                                                                                                                                                                                         |
| Shares and per-share    | Diluted weighted-average shares of the latest quarter. Equity = EV − debt + cash − minority.                                                                                                                                                                                                            | Verified against the hand fixture.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Forecast period         | Five years. Year-1 capex is the trailing ratio, year 5 the terminal ratio. Growth fades to terminal by year 5.                                                                                                                                                                                          | Asserted in tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Discount rate           | WACC by hand matched. With no market cap, WACC silently fell back to the cost of equity.                                                                                                                                                                                                                | The fallback is now disclosed (`equity_only` weights) in the assumptions.                                                                                                                                                                                                                                                                                                                                                                                                                |
| Terminal value          | Gordon growth on year 6, with a 1-point minimum WACC−g spread. Terminal share 72% for MSFT.                                                                                                                                                                                                             | Unchanged; guard tested.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| No price                | The conclusion dropped the DCF entirely when there was no price.                                                                                                                                                                                                                                        | It now states the DCF value and says plainly that there is no price to compare with.                                                                                                                                                                                                                                                                                                                                                                                                     |

**Hand-worked fixture:** revenue 100, 3% growth, 20% margin, 25% tax, 5% D&A, capex fading from 8% to 5%, WACC 9%.

- FCFF by year: 12.36, 13.53, 14.75, 16.04, 17.39.
- PV of the forecast 56.7793; terminal value 298.5131; EV 250.7923.
- **$24.0792 per share** ($19.60 with capex held flat).

All values were matched to 1e-5.

**Effect for MSFT on the next deep run:** with the fade to the 15.7% median, the base value is about $250 instead of $80. The sensitivity table shows the whole range. This is a modelling choice with a large effect, now made explicit, attributed to history, and editable.

## 4. Profile D-Efficient (disabled by default)

`D-efficient` is defined in `src/lib/sonar/model-routing.js`:

| Role                                      | Model         |
| ----------------------------------------- | ------------- |
| Quick writer                              | Haiku 4.5     |
| Standard writer                           | Sonnet 5.5    |
| Standard specialists                      | **Haiku 5.5** |
| Deep writer and final synthesis (resolve) | Opus 5.5      |
| Deep specialists                          | Sonnet 5.5    |
| Deep red team and audit                   | Sonnet 5.5    |

- **Only one difference from D:** the standard specialists (test-asserted).
- **Served to nobody by default.** With no flag, or with a canary profile but no staff flag, user list or percentage, every user resolves to `current`, staff included. Anonymous runs never join a canary.
- **Rollback:** clear the canary variables and redeploy; everyone returns to `current` (tested).
- **Mocked model call:** a request built from D-efficient goes to a mocked `fetch` and carries `claude-haiku-5-5` with thinking disabled. No real request was made.

## 5. Output contracts (fixture tests, no generation)

| Check                      | Result                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSON schema consistency    | **Fixed an inconsistency.** The length contracts said "No other fields" without naming `confidence` or a finding's `label`, which the validator reads. The template asked for `question` and `confidenceReason`, which nothing reads. One field list (`SPECIALIST_FIELDS`, `SPECIALIST_FINDING_FIELDS`) now drives the template and both length contracts. A test asserts template = contract = validator output. |
| Required analytical fields | Validated per finding: claim, label, refs, period. Missing confidence → `low`.                                                                                                                                                                                                                                                                                                                                    |
| Token budgets              | Every role's target is at most 60% of its cap. Every depth has a writer role, and hops fit their windows.                                                                                                                                                                                                                                                                                                         |
| Completion statuses        | Full matrix tested. **Fixed:** a reply recovered from a cut was classified `ok` when the provider reported no stop reason (fallback providers don't). It is now `truncated` for specialists, the writer and the red team.                                                                                                                                                                                         |
| Truncation handling        | A cut specialist reply keeps only complete findings (the half-written one is dropped, not patched). Nothing complete → null.                                                                                                                                                                                                                                                                                      |
| Partial preservation       | A repaired specialist output still validates and is kept. The red team keeps its complete points and is flagged `repaired`.                                                                                                                                                                                                                                                                                       |
| Saved reports              | The stored d4 role outcomes re-summarize to the stored counts. A pre-change specialist entry (with `analyst`, `question` and `confidenceReason`) still validates.                                                                                                                                                                                                                                                 |
| Evidence references        | Unknown markers and metrics are removed and logged; brackets are stripped.                                                                                                                                                                                                                                                                                                                                        |

## 6. Stored benchmark re-analysis (deterministic only)

**Source:** suite `model-bench-2026-11-28-profile-d4`, stored outputs and deterministic scores. Queries: `docs/sql/SQL_sonar_d4_deterministic_reanalysis.md`. Per-case fixture: `sonar-evals/d4-per-case-2026-11-28.json`. Analysis: `src/lib/sonar/engine/eval/stored-analysis.js`, `scripts/sonar-stored-reanalysis.mjs`. No new AI-graded score was produced. The screen case is excluded (retrieval failed in every cell).

**Scorer bug found and fixed.** The citation-validity count stripped brackets from `[S1]`; the "findings without a valid citation" count did not.

- **Who it hurt:** the Sonnet 5.5 writer cites with brackets and the Haiku 4.5 writer does not, so the stored count overstated unsupported findings for D and D-h55spec.
- **Recomputed:** the counts were recomputed from the saved key findings and markers. The recomputation reproduces the stored values exactly before the correction.
- **Fixed in code:** `scoreRun` in `model-bench.js`.

**Standard (13 cases, 1 trial each):**

| Metric                                        | current  | D        | D-h55spec |
| --------------------------------------------- | -------- | -------- | --------- |
| Completion                                    | 100%     | 100%     | 100%      |
| Objective completion                          | 93.0%    | 97.7%    | 95.3%     |
| Numerical support (traced numbers)            | 97.2%    | 99.6%    | 99.4%     |
| Sentences with untraced numbers, per run      | 1.46     | 0.23     | 0.31      |
| Citation validity                             | 97.8%    | 100%     | 100%      |
| Citation coverage (findings cited)            | 80.0%    | 90.0%    | 84.6%     |
| Unsupported findings per run, **corrected**   | 0.46     | **0.31** | 0.46      |
| Unsupported findings per run, as stored (bug) | 0.46     | 1.62     | 1.77      |
| Valid cross-dataset insights per run          | **0.54** | 0.08     | 0.23      |
| Cross-dataset join / period failures          | 1 / 1    | 2 / 0    | 0 / 0     |
| Retrieval complete                            | 76.9%    | 76.9%    | 76.9%     |
| Truncated share of role calls                 | 69.7%    | 16.1%    | 19.4%     |
| $ per run (list)                              | 0.030    | 0.065    | 0.041     |
| p50 latency                                   | 34 s     | 19 s     | 19 s      |

**Deep (4 cases × 2 trials):**

| Metric                               | current | D     |
| ------------------------------------ | ------- | ----- |
| Objective completion                 | 93.8%   | 87.5% |
| Numerical support                    | 99.6%   | 100%  |
| Untraced-number sentences per run    | 0.38    | 0.00  |
| Citation validity                    | 83.8%   | 100%  |
| Valid cross-dataset insights per run | 0.88    | 1.75  |
| Truncated share                      | 22.6%   | 1.5%  |
| $ per run                            | 0.352   | 0.423 |
| p50 latency                          | 187 s   | 75 s  |

**Paired by case** (exact sign test over cases; seeded case-resampling bootstrap, 95% CI):

| Comparison                    | Metric               | Mean difference [95% CI] | Sign (+ / − / =)   | p     |
| ----------------------------- | -------------------- | ------------------------ | ------------------ | ----- |
| Standard, D − current         | Untraced numbers     | −1.54 [−2.69, −0.54]     | 1 / 6 / 6          | 0.125 |
|                               | Valid cross insights | **−0.46 [−0.85, −0.08]** | 1 / 6 / 6          | 0.125 |
|                               | Objective rate       | +0.04 [0.00, 0.11]       | 2 / 0 / 11         | 0.50  |
| Standard, D-h55spec − current | Untraced numbers     | −1.46 [−2.54, −0.54]     | 1 / 7 / 5          | 0.07  |
|                               | Valid cross insights | −0.31 [−0.69, 0.08]      | 1 / 4 / 8          | 0.38  |
| Standard, D − D-h55spec       | All three metrics    | CIs span 0               | at most 1 / 2 / 10 | 1.0   |
| Deep, D − current             | Valid cross insights | +0.88 [0.63, 1.00]       | 4 / 0 / 0          | 0.125 |
|                               | Objective rate       | −0.05 [−0.10, 0.00]      | 0 / 2 / 2          | 0.50  |

**What the deterministic metrics add to the judges' verdicts:**

- **Standard D is cleaner** than current: fewer untraced numbers, fully valid citations, fewer truncations.
- **But standard D makes fewer valid cross-dataset relationships** than current. The CI excludes zero. The LLM judges did not surface this, and the human review should check it.
- **D and D-h55spec are indistinguishable** on every deterministic metric at standard depth. The judges' 32–20 preference for D was weak (order consistency 0.69).
- **Deep D** makes more valid cross-dataset relationships in all 4 cases, with fully valid citations, but meets slightly fewer objectives.

**Uncertainty:**

- **Few independent cases:** 13 standard and 4 deep.
- **Judge verdicts are not independent:**
  - The "48–4" current-vs-D result comes from 84 verdicts over only 17 independent cases.
  - Opus and Sonnet agree on 37 of 42 verdict pairs (88%). Both are Anthropic models, so they are close to one rater.
  - Order consistency is 1.00 / 0.95 for current vs D, 0.69 / 0.69 for D vs D-h55spec, and 0.63 / 1.00 for the deep writer comparison.
- **Deep results are directional:** with 4 deep cases, even 4 of 4 gives p = 0.125.
- **Trials share frozen evidence,** so trials within a case are not independent either.

## 7. Benchmark budget controls

**Execution paths audited:**

- The cron worker (`/api/cron/sonar-model-bench`).
- The admin route (manual availability, capture, run, judge and pair steps).
- The offline scripts (`scripts/sonar-analyst-quality.mjs`, `scripts/sonar-analyst-snapshot.mjs`). These need a key passed on the command line and are never scheduled.

**Before:** a suite in `MODEL_BENCH_SUITES` ran as soon as a lane was scheduled, limited only by its own expiry and spend cap.

**Now** (`src/lib/sonar/engine/eval/bench-budget.js`, enforced on every step):

| Control                               | Implementation                                                                                                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit authorization for paid calls | `SONAR_BENCH_PAID_CALLS=authorized` on the deployment. The cron route refuses before any read without it. `SONAR_BENCH_DISABLED=1` is a kill switch.                                                       |
| Per-suite authorization               | `authorization: { by, at, maxUsd, expiresAt }` is required. **No defined suite has one,** so none can run again as written (tested).                                                                       |
| Maximum per-suite spend               | `min(suite.maxUsd, authorization.maxUsd)`, counting spend plus in-flight reservations plus this step's estimate.                                                                                           |
| Maximum overall evaluation spend      | `SONAR_BENCH_GLOBAL_CAP_USD` across all model-bench suites (manual included) over a rolling 30 days. **Default 0, which blocks.**                                                                          |
| In-flight reservation                 | Each step reserves a conservative estimate before it starts (deep run $0.60, standard $0.10, pair $0.08, judge $0.04). The reservation counts until its result row exists or it is 10 minutes old.         |
| Expiry                                | Suite `until` and authorization `expiresAt`, checked before every step.                                                                                                                                    |
| Concurrency                           | `maxConcurrent` per suite (default 2); manual runs 1.                                                                                                                                                      |
| Manual cancellation                   | Admin `POST { action: 'cancel', suite }` writes a cancel row. Every later step is refused.                                                                                                                 |
| Disabled-by-default scheduling        | No lane in the cron dispatcher or `vercel.json` (tested). Re-adding one still runs nothing without the authorizations above.                                                                               |
| Persistent usage accounting           | Spend is recomputed on every step from result rows; reservations are attempt rows carrying `reservedUsd` (existing table, no schema change).                                                               |
| Manual admin steps                    | Require `confirmPaid: true` in the request, `SONAR_BENCH_MANUAL_CAP_USD` (default 0, which blocks), the global cap and the same gate. "Run all" on the admin page is now refused until all of that is set. |

**Tested with mocked usage:**

- Every gate condition.
- The ledger (spend, reservations, staleness, cancellation).
- An unauthorized worker reads and writes nothing.
- An authorized worker reserves before its step.
- Cancellation stops the next tick.
- A suite at its cap writes no reservation.
- No lane is scheduled.

## 8. Human review preparation

The blind queue is preserved. New: a prepared **ten-pair review set** (`HUMAN_REVIEW_SET`, admin page button "Load the 10-pair review set", `GET ?action=human-set`).

**Standard (5):**

| Case                            | Comparison     |
| ------------------------------- | -------------- |
| Macro contradiction             | current vs D   |
| Valuation (incomplete evidence) | current vs D   |
| Multi-dataset screen            | current vs D   |
| Company fundamentals            | D-h55spec vs D |
| Stale filings                   | D-h55spec vs D |

**Deep (5):**

| Case                   | Comparison            |
| ---------------------- | --------------------- |
| Export controls        | current vs D          |
| Deep research, trial 1 | current vs D          |
| DCF sensitivity        | current vs D          |
| Deep valuation         | Sonnet vs Opus writer |
| Deep research, trial 2 | Sonnet vs Opus writer |

These were chosen where the judges and the deterministic metrics disagree, or where a decision is open.

**What reviewers see:**

- **Identical evidence:** each pair is shown with the evidence both answers were written from. All 10 pairs have matching deterministic fingerprints (verified read-only).
- **Anonymized identity:** A/B order is a stable hash, and model and configuration names are scrubbed from the text.
- **Rubric:** overall, factual correctness, research objective completion, analytical insight, financial reasoning, evidence support, unsupported conclusions. Earlier verdict keys stay readable.
- **No AI judge.**

## 9. Files changed

**New:**

- `src/lib/sonar/composer/stages.js`: typed stages, chain runner, seed plan, composed universe.
- `src/lib/sonar/engine/eval/bench-budget.js`: paid-evaluation gate and ledger.
- `src/lib/sonar/engine/eval/stored-analysis.js`: sign test and seeded bootstrap.
- `scripts/check-sonar-hardening.mjs`: 42 deterministic tests; `npm run test:sonar-hardening`, part of `npm test`.
- `scripts/lib/no-llm-guard.mjs`: network guard for tests.
- `scripts/sonar-stored-reanalysis.mjs`: prints the paired re-analysis.
- `sonar-evals/d4-per-case-2026-11-28.json`: per-case fixture.
- `docs/sql/SQL_sonar_d4_deterministic_reanalysis.md`: read-only re-analysis queries.

**Changed:**

- **Routing:** `src/lib/sonar/model-routing.js` (D-efficient; `PROFILES` exported).
- **Composer:**
  - `analytics-server.js`: seed stage, chained filters, window contracts, 13F change, stage records.
  - `intents.js`, `registry.js`, `screen.js`.
- **Parser:** `src/lib/sonar/semantic/compositional.js` ("ownership rose").
- **Engine:**
  - `engine.js`: composed universe, stored-close lookup, repaired-reply outcomes.
  - `output-contracts.js`: single field list; repaired output counts as truncated.
- **Analysts:** `orchestrator.js` (template fields, repaired flags).
- **Valuation:** `model.js` (capex plan, capex sensitivity, WACC disclosure, no-price conclusion, v2), `history.js` (capex history, price provenance), `fetch.js` (`storedClose`, `priceLookup`, override), `metrics.js`.
- **Adaptive:** `src/lib/sonar/adaptive/data-deps.js` (stored close).
- **Benchmark:**
  - `model-bench.js`: scorer fix, rubric, review set, run-step depth.
  - `model-bench-runner.js`: gate, reservations, `cancelSuite`, `globalEvalSpend`, `humanReviewSet`.
  - `model-bench-active.js`: authorization note.
- **Routes:** cron route (deployment gate) and admin route (paid-step gate, cancel, review set).
- **Page:** `src/app/admin/sonar-model-bench/page.js` (review set, evidence, rubric).
- **Test helpers:** `scripts/lib/fake-supabase.mjs` gains rpc, failure injection, `like`, `insert` and JSON-path projection, all backward compatible. `scripts/check-sonar-valuation.mjs` gains a test.

**Regression run:**

- All 181 `test:*` scripts were run individually.
- **All Sonar suites pass,** as do security, OAuth gate and middleware.
- **Seven scripts fail, and all seven also fail on the commit before this task.**
  - Six fail with identical test names: `test:rls` (34), `test:reliability` (19), `test:quant`, `test:council-echo`, `test:research-company`, `test:e2e`.
  - `test:titans-2` has one additional failure, caused by another session's commit `be53e2f2`: the XBRL revenue concept map grew from 3 to 5 entries and the test still expects 3. Not touched here.

## 10. Unresolved issues

1. **No live confirmation.** The chaining fix, the DCF price and capex changes and the contract fixes are unit-verified only. A funded benchmark run of `screen_congress_contracts_13f`, `deep_valuation` and `model_dcf_sensitivity` is still needed.
2. **The capex fade is a modelling choice** that moves MSFT from $80 to about $250. It is attributed to history and editable, and the sensitivity shows the full range. It needs analyst sign-off.
3. **Standard D makes fewer valid cross-dataset relationships than current** (deterministic, CI excludes 0). This is unexplained and should be checked in human review before any canary.
4. **D vs D-efficient is unresolved:** indistinguishable deterministically, and the judges' preference is weak. The human review set includes two such pairs.
5. **Human review not yet done.** The 10-pair set is ready on `/admin/sonar-model-bench`.
6. **Data quality:** future-dated `action_date` rows in `contract_awards_resolved` (excluded by the new reads, not repaired at source); the FMP quote key returns 402; no insider (Form 4) data for the contradiction case.
7. **13F coverage:** the 13F read is capped at 150 companies a stage (alphabetical), so a large seeded universe is reported as bounded.
8. **Engine universe cap:** the composed universe handed to the planner is capped at 12 companies.
9. **Offline scripts:** they can still call a model when run by hand with a key. They are documented as paid, not gated in code.
10. **Pre-existing test failures** listed in section 9.
