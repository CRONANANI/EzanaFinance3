# Sonar model benchmark remediation and Profile D validation (Nov 28 2026)

This report answers "EZANA SONAR — MODEL BENCHMARK REMEDIATION & PROFILE D VALIDATION". Global production routing is unchanged: every production run on Nov 28 served the `current` profile (from `sonar_research_runs.plan->models`).

---

## 0. For ChatGPT (planner): read this first

**The Anthropic API credits are used up. Do not write prompts that call a model to test or benchmark Sonar.**

- **Spend:** the benchmark work on Nov 28 spent **$96.39** at list price, on top of normal Sonar traffic. That used nearly all of the account's API credit. Anything further is billed at standard rates.
- **What is switched off:** every benchmark lane is unscheduled (`src/lib/cron/dispatch-registry.js`) and every suite is past its expiry. The route and admin page still exist, but nothing runs them.

Until Noah says the account is funded again, prompts for Claude Code must follow these rules.

**Not allowed (each call bills the Anthropic API):**

- New benchmark suites, re-running suites, or adding entries to `MODEL_BENCH_SUITES`.
- Re-adding the `sonar-model-bench` lanes to the dispatcher or to `vercel.json`.
- Model-graded evaluation: LLM judges, paired comparisons, "run the eval set", `scripts/*eval*` that call a provider.
- Scripts that call `runResearch`, `anthropicSynthesize`, or any `/api/sonar/research` request just to measure quality.
- Asking Claude Code to generate fresh Sonar answers in order to compare them.
- Switching production to a more expensive profile. Profile D costs about 2× per standard run; see §8.

**Allowed (no model calls):**

- **Deterministic code changes,** for example to the planner, retrieval, domain scoring, the valuation model, composition, metrics, layouts and UI. Verify them with unit tests on fixtures (`node --test`, the existing `scripts/check-sonar-*.mjs` pattern) and no network calls.
- **Re-scoring stored runs without a model.** Every benchmark run is saved in `sonar_research_evaluations`: frozen evidence (`engine = 'model-bench-snapshot'`), the full outputs (`model-bench`), and the judge verdicts. These deterministic checks can be re-run in plain JS over the stored rows: `retrievalCheck`, `calcCheck`, `relationshipScore`, citation and number-support checks.
- **Replaying planner and retrieval decisions against the frozen snapshots.** Which datasets would now be planned, and does the plan now cover `requiredDatasets`? This needs no LLM.
- **SQL against Supabase:** data coverage, freshness, joins, missing tickers. Put each query in its own `.md` file.
- **Human review** in the blind queue at `/admin/sonar-model-bench`.
- **Data ingestion and sync jobs** that call data vendors (FMP, SEC, USAspending), not Anthropic. Mind each vendor's own limits.

**Every Claude Code prompt must state** "This task makes no Anthropic API calls" and say how the change is verified without a model.

---

## 1. Root cause: specialist timeouts

| Cause                                                                                                                                                    | Effect                                                                                               | Fix                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deep specialists had a 70 s window, but each call fell back to the provider's default 25 s hop. Only `maxHopMs > 25 s` overrides it, and nothing set it. | Sonnet 4.5 needed more than 25 s for 1,600 tokens, so calls were aborted.                            | Role budgets in `output-contracts.js` (`ROLE_BUDGETS`): standard specialist window 14 s, hop 13 s; deep window 70 s, specialist hop 55 s, red team 45 s, resolve 40 s, audit 40 s. The writer's synthesis time is held back from the window.                |
| Prompts had no length target.                                                                                                                            | Calls ran to their caps.                                                                             | Bounded output contracts per role (§2).                                                                                                                                                                                                                     |
| Calls are not streamed.                                                                                                                                  | An aborted call returned nothing, not a partial result.                                              | Completed specialist results are kept when another one fails. Each call records `{requested, served, outcome, ms, outputTokens}`.                                                                                                                           |
| The red team's 900-token cap was always cut.                                                                                                             | Its JSON never parsed, so `director_final` never ran.                                                | Red team, resolve and audit contracts. Red team ok 100%; `director_final` now runs (100% ok in d4).                                                                                                                                                         |
| 5.x models think by default; `max_tokens` covers thinking plus text.                                                                                     | Thinking used up the budget, giving empty or truncated replies that were logged as "provider_error". | `requestShape` + `ROLE_THINKING`: specialists and reviewers run with thinking off or minimal at low effort. The deep writer is adaptive at medium effort with a 6,000-token reserve. Sonnet 5.5 cannot fully turn thinking off, so it uses `between_tools`. |
| Specialists filled their caps with fields from their skill contracts that `validateSpecialist` throws away.                                              | Haiku 4.5 specialists were 100% truncated.                                                           | Specialists are told to return only the fields Sonar reads.                                                                                                                                                                                                 |

No retries were added and no timeout was raised arbitrarily. Every hop has an explicit budget, and the run deadline still applies.

## 2. Output contracts

Defined in `src/lib/sonar/engine/output-contracts.js`. Each target is at most 60% of its cap, at 1.6 tokens per word; a test enforces this. 5.x caps are scaled ×1.3 for the 5.x tokenizer.

| Role                | Cap (tokens) | Target (words) |
| ------------------- | ------------ | -------------- |
| quick writer        | 1,500        | 350            |
| standard writer     | 2,900        | 850            |
| deep writer         | 3,100        | 1,000          |
| memo writer         | 6,000        | 1,900          |
| positioning writer  | 8,000        | 2,500          |
| standard specialist | 700          | 240            |
| deep specialist     | 1,600        | 550            |
| red team            | 900          | 300            |
| resolve             | 900          | 300            |
| auditor             | 800          | 260            |

Every role call is classified as one of `ok`, `truncated`, `invalid_output`, `timeout`, `skipped_deadline` or `provider_error` (`classifyOutcome`). Truncation is recorded separately from timeout and provider failure. Runs store `roleOutcomes` and `outcomes`. Fallback is explicit: replies carry `requestedModel` and `fellBackFrom`, and `SONAR_MODEL_STRICT=1` turns off the silent fallback to Haiku.

**Share of role calls truncated:**

| Depth    | current | D    |
| -------- | ------- | ---- |
| standard | 0.70    | 0.16 |
| deep     | 0.23    | 0.01 |

## 3. Evidence retrieval audit

| Case                              | Gap                                                                                                                | Class                          | Status                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Apple fundamentals                | Only news and Echo were planned.                                                                                   | Retrieval omission             | **Repaired:** fundamentals and valuation cues, plus the company prior (`withSubjectPrior`).                                              |
| Palantir government revenue       | FMP has no government/commercial segments for PLTR.                                                                | Absent at source               | Not repairable; Sonar now says so.                                                                                                       |
| Palantir government revenue       | Contracts dataset dropped by the planner depth cap; no cue.                                                        | Retrieval omission             | **Repaired:** contracts cue; government dependence scores contracts 0.95.                                                                |
| Palantir government revenue       | The production composition (government dependence) was skipped in the benchmark.                                   | Freezing loss                  | **Repaired:** composition is frozen with the evidence.                                                                                   |
| MSFT DCF (standard)               | The valuation model runs only on deep.                                                                             | Entitlement / depth            | By design; standard answers use multiples.                                                                                               |
| MSFT DCF (deep)                   | The valuation result was never frozen, and never reached the writer. The writer said "no DCF" next to a DCF panel. | Freezing loss + wiring         | **Repaired:** frozen in replay; results are now citable metrics (`valuation/metrics.js`). **Not confirmed by a benchmark run (see §5).** |
| Pelosi ownership                  | 13F needs tickers and was not planned.                                                                             | Retrieval omission             | **Repaired:** ownership composition frozen; institutional cue for "investment firms" and "owned by funds".                               |
| Congress + contracts + 13F screen | `congress_activity` was empty; contracts and 13F were unmet.                                                       | Planner chaining gap           | **Not repaired.** Failed retrieval in every cell. Fixable without model calls (§0).                                                      |
| Valuation model inputs            | Price is null (FMP 402), and capex is held at 39% of revenue, giving a base DCF of about $80/share.                | Entitlement + model assumption | Not repaired. No inputs were fabricated.                                                                                                 |
| Insider vs institutions           | No Form 4 insider data.                                                                                            | Absent at source               | Not repaired.                                                                                                                            |

Cases built to be incomplete are in their own category (`evidenceClass: 'incomplete'`): `government_contract_exposure`, standard `valuation`, `partial_private_company`, `partial_stale_filings`.

## 4. Profile D model IDs

Availability was checked in suite d3. Every model was served as requested, with no fallbacks: `claude-haiku-4-5-20251001`, `claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5`, `claude-sonnet-5`, `claude-sonnet-4-5`.

| Role                                | Profile D model |
| ----------------------------------- | --------------- |
| Quick writer                        | Haiku 4.5       |
| Standard writer + specialists       | Sonnet 5.5      |
| Deep writer (director, resolve)     | Opus 5.5        |
| Deep specialists, red team, auditor | Sonnet 5.5      |

## 5. Results (suite `profile-d4`)

**About the suite:**

- 84 runs, 168 absolute grades and 236 paired verdicts, all parsed. Cost $21.82.
- Evidence was frozen once (suite d3) and replayed identically for every cell, so differences between cells come from models, contracts and specialists, not retrieval.
- The screen case is excluded from quality averages because retrieval failed in every cell.
- Two Anthropic judges (Opus 5.5 and Sonnet 5.5) graded blind, in both orders.

**Standard (18-case suite, standard cases):**

| Cell                         | Quality  | Judge score | Unsupported claims/run | p50 / p90       | $/run  |
| ---------------------------- | -------- | ----------- | ---------------------- | --------------- | ------ |
| current                      | 51.7     | 2.24        | 1.9                    | 34 s / 39 s     | $0.030 |
| **D**                        | **61.1** | **2.68**    | 1.8                    | **19 s / 21 s** | $0.065 |
| D with Haiku 5.5 specialists | 60.4     |             |                        |                 | $0.041 |
| D with Haiku 4.5 specialists | 59.6     |             |                        |                 | $0.052 |

**Standard pairwise:**

- D beats current 48–4. Correctness 52–0, evidence 51–1.
- The Opus judge gave D 42–0 and the Sonnet judge 37–5. Order consistency was 1.00 and 0.95.
- D vs D with Haiku 5.5 specialists: 32–20 (consistency 0.69, weak).
- D vs D with Haiku 4.5 specialists: 27–25, a tie.

**Deep (8 runs per cell):**

| Cell                     | Quality  | Unsupported/run | Valid cross-dataset insights | p50 / p90       | $/run  |
| ------------------------ | -------- | --------------- | ---------------------------- | --------------- | ------ |
| current                  | 50.6     |                 |                              | 187 s / 221 s   | $0.352 |
| **D**                    | **60.6** | **0.0**         | **1.75**                     | **75 s / 90 s** | $0.423 |
| D with Sonnet 5.5 writer | 57.4     | 3.3             | 0.13                         | 60 s            | $0.300 |

**Deep pairwise:**

- D beats current 31–1, with 8 ties from the screen case.
- D beats D with Sonnet writer 25–7 (Opus judge 11–5, Sonnet judge 14–2). The Sonnet writer was judged slightly more correct (−0.30).

**Quick:** Haiku 4.5 in both profiles: 62.3, $0.012.

**Per case:** D won nearly every case. The exceptions were `government_contract_exposure` (2–2), `partial_stale_filings` (2–2) and the screen case (all ties). Completion was 100% in every cell.

**Cross-dataset checks (`relationshipScore`):** an insight counts only when every cited record shares an entity, the periods line up and the numbers are supported by the records. Citing several datasets in one paragraph earns nothing. Deep D averaged 1.75 valid cross-dataset insights per run, against 0.13 for the Sonnet-writer cell.

**Separating the effects:**

- **Retrieval:** identical evidence in every cell.
- **Truncation:** recorded per role (§2).
- **Specialists:** isolated by the Haiku-specialist cells.
- **Writer model:** isolated by the D vs D-sonnet-writer cell.

The gain from current to D is mostly the writer model, plus specialists that now finish. Current standard ran 70% of role calls truncated.

**DCF confirmation: not obtained.**

- Suite `profile-d-dcf` was launched before its variant was defined, so it ran the default plan. It cost $6.39 and is excluded.
- The corrected suite `profile-d-dcf2` was cancelled before it ran, when the credits ran out.
- The valuation-metrics fix is covered by unit tests only.

## 6. Side-by-side examples (from d4)

- **contradiction_insider_vs_institutions, current vs D:** both judges found current repetitive, with figures not in the evidence. D's figures matched the records. Neither had insider data (absent at source), and D said so.
- **deep_valuation, D vs D with Sonnet writer:** both declined to give a DCF value; this predates the valuation-metrics fix. D framed the valuation more completely. The Sonnet writer had fewer stray figures.

The full outputs are in `sonar_research_evaluations` (suite `model-bench-2026-11-28-profile-d4`, engine `model-bench`) and viewable on `/admin/sonar-model-bench`.

## 7. Human review

**Not done yet. Only the two LLM judges have graded, and both are Anthropic models.**

The blind queue is ready on `/admin/sonar-model-bench` (Blind human review panel). Pairs are shown in a stable random order without model labels. It needs no API calls.

**Ask:** Noah reviews at least 10 pairs (5 standard, 5 deep) before D goes past staff.

## 8. Cost

Prices are list prices computed from tokens, not the Anthropic invoice; Console → Usage is the source of truth. Completion was 100%, so cost per completed answer equals cost per run.

**Monthly cost (standard):**

| Standard runs/month | current | D      | D with Haiku 5.5 specialists |
| ------------------- | ------- | ------ | ---------------------------- |
| 1,000               | $30     | $65    | $41                          |
| 10,000              | $300    | $650   | $410                         |
| 50,000              | $1,500  | $3,250 | $2,050                       |
| 100,000             | $3,000  | $6,500 | $4,100                       |

**Monthly cost (deep):**

| Deep runs/month | current | D      |
| --------------- | ------- | ------ |
| 100             | $35     | $42    |
| 1,000           | $352    | $423   |
| 5,000           | $1,760  | $2,115 |

**Quick:** $0.012 per run in both profiles ($120 per 10,000 runs).

**Against the $0.03 standard target:**

- D costs $0.065 per run, about double the target and above the earlier $0.058 estimate. D does not meet the target.
- Marginal quality: D adds 9.4 points for $0.035 more per run. D with Haiku 5.5 specialists adds 8.7 points for $0.011 more, the best value per point.
- D's remaining edge over the Haiku 5.5 variant is weak (32–20 at 0.69 consistency) and costs $0.024 per run.

**Cheaper options not yet measured:**

- Haiku 5.5 specialists ($0.041 measured).
- Prompt caching of the system and skill prompts: an estimate only, not measured; it mostly helps specialists and could take roughly 10–25% off.
- Lower writer effort.

None of these was benchmarked, and none should be until there is budget.

## 9. Go / no-go

- **Quality: GO for a staff-only canary of Profile D.**
  - D wins clearly at both depths, on two judges.
  - Standard latency is lower (34 s → 19 s) and deep latency is lower (187 s → 75 s).
  - Truncation fell sharply.
- **Budget: HOLD. Do not turn the canary on until the account has credits or billing is set up.**
  - Staff volume is small, but each D standard run costs about 2× current.
- **Global D: NO-GO.** It needs human review, a budget decision between D and D with Haiku 5.5 specialists, and canary telemetry first.

## 10. Staff-canary instructions (when funded)

Staff routing is implemented (`profileForUser`, `isAdminUser`).

1. In Vercel → Settings → Environment Variables (Production), set:
   - `SONAR_MODEL_CANARY_PROFILE=D`
   - `SONAR_MODEL_CANARY_STAFF=1`
   - Leave `SONAR_MODEL_CANARY_PERCENT` unset or 0, so only staff get D.
   - Optionally set `SONAR_MODEL_STRICT=1`, so a failing model errors visibly and doesn't silently fall back.
2. Redeploy. Vercel applies env changes on the next deployment.
3. **Monitor** with the two read-only queries in `docs/sql/SQL_sonar_profile_d_canary_monitor.md`. They cover per-role cost, latency, completion, truncation, fallback and unsupported claims, by profile, from `sonar_research_runs.plan->models`.
4. **Rollback:** unset `SONAR_MODEL_CANARY_PROFILE` and `SONAR_MODEL_CANARY_STAFF`, keep `SONAR_MODEL_PROFILE=current` (the default), then redeploy. Every user returns to the current profile.

## 11. Benchmark workers and spend

- **Benchmark lanes:** removed from the cron dispatcher (commit `2c0d22d7`). Every suite has a past expiry; dcf2 had expiry 16:45 UTC and cap $0.
- **Expiry and caps held:** the last write was 16:38 UTC. Each suite stopped at its expiry or spend cap. Profile-d's last write came one minute after its cutoff, from a run already in flight.
- **Results are kept** in `sonar_research_evaluations`.

| Suite                  | Spend      | Note                                            |
| ---------------------- | ---------- | ----------------------------------------------- |
| model-bench-2026-11-28 | $14.49     | Initial seven cases; includes manual admin runs |
| deep2                  | $13.99     |                                                 |
| profile-d              | $1.11      | Stopped: composition bug                        |
| profile-d2             | $18.85     | Stopped: 5.x thinking ate budgets               |
| profile-d3             | $10.96     | Its frozen evidence was reused                  |
| **profile-d4**         | **$21.82** | **The reported suite**                          |
| contract               | $8.78      | Another session: evidence contract              |
| profile-d-dcf          | $6.39      | Ran the wrong plan; excluded                    |
| profile-d-dcf2         | $0         | Cancelled                                       |
| **Total**              | **$96.39** |                                                 |

## 12. Remaining limitations

- Haiku 4.5 still truncates as the quick writer, and its standard writer was about 50% truncated.
- The screen case's planner chaining gap (congress → contracts → 13F) is not repaired.
- Valuation model: price is null (FMP 402) and the capex assumption pulls the DCF down. The valuation-metrics fix is unconfirmed by a benchmark run.
- No insider (Form 4) data.
- Both judges are Anthropic models, and there is no human review yet.
- Trials are small: 8 deep runs per cell, and 2 per case per cell at standard.
- Suites d2 and d3 are superseded by d4.
- Current deep latency rose because its specialists now finish; it stays within the 280 s budget.
- Costs are list-price estimates, not invoice figures.
