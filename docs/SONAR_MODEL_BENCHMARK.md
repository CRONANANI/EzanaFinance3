# Sonar model benchmark and routing (Nov 28 2026)

This page covers the model-quality benchmark that has to pass before Sonar's production
models change, every place a Sonar model is chosen, and the feature-flagged rollout.
**Production is unchanged:** the default routing profile is `current`, which picks
exactly the models Sonar used before this change.

## 1. What decides a model now

`src/lib/sonar/model-routing.js` is the single routing table for the research engine.

| Role                              | Used by                                                  | current (default)    | A                      | B                     | C                       |
| --------------------------------- | -------------------------------------------------------- | -------------------- | ---------------------- | --------------------- | ----------------------- |
| `quick`                           | quick synthesis                                          | Haiku 4.5            | Haiku 5.5              | Haiku 5.5             | Haiku 5.5               |
| `standard`                        | standard synthesis                                       | Haiku 4.5            | Haiku 5.5              | Sonnet 5.5            | Sonnet 5.5              |
| `standard_specialist`             | standard specialists                                     | Haiku 4.5            | Haiku 5.5              | Haiku 5.5             | Haiku 5.5               |
| `deep_director`                   | deep synthesis                                           | Sonnet 4.5           | Sonnet 5.5             | **Opus 5.5**          | Sonnet 5.5              |
| `deep_specialist`                 | deep specialists                                         | Sonnet 4.5           | Sonnet 5.5             | Sonnet 5.5            | Sonnet 5.5              |
| `deep_red_team`                   | critical review                                          | Sonnet 4.5           | Sonnet 5.5             | Sonnet 5.5            | **Opus 5.5**            |
| `deep_resolve`                    | director's final pass                                    | Sonnet 4.5           | Sonnet 5.5             | **Opus 5.5**          | Sonnet 5.5              |
| `deep_auditor`                    | methodology audit                                        | Sonnet 4.5           | Sonnet 5.5             | Sonnet 5.5            | **Opus 5.5**            |
| `cross_domain_director`           | deep synthesis when the question spans 2+ analyst groups | none                 | none                   | none                  | **Opus 5.5**            |
| `legacy_standard` / `legacy_deep` | older `/api/sonar/query` route                           | Haiku 4.5 / Sonnet 5 | Haiku 5.5 / Sonnet 5.5 | Sonnet 5.5 / Opus 5.5 | Sonnet 5.5 / Sonnet 5.5 |

`current` still reads the legacy variables (`SONAR_FAST_MODEL`, `SONAR_DEEP_MODEL`,
`SONAR_LANDING_MODEL`, `SONAR_ANALYST_FAST_MODEL`, `SONAR_ANALYST_STRONG_MODEL`), so
nothing that is set today changes behaviour. Each run records `modelProfile` and
`crossDomain` in `researchMetadata`.

### Flags (Vercel env; Vercel applies an env change on the next deployment, so redeploy after changing one)

| Variable                     | Effect                                                                                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SONAR_MODEL_PROFILE`        | Global profile: `current` (default), `A`, `B`, `C`. Setting it back to `current` is the kill switch.                                                        |
| `SONAR_MODEL_CANARY_PROFILE` | Profile served to the canary.                                                                                                                               |
| `SONAR_MODEL_CANARY_PERCENT` | 0 to 100. A stable hash of the user id picks the bucket, so a user stays in or out across runs. Anonymous runs never join the canary.                       |
| `SONAR_MODEL_CANARY_USERS`   | Comma-separated user ids always in the canary (staff first).                                                                                                |
| `SONAR_MODEL_ROLE_<ROLE>`    | Pin one role to a model id, for example `SONAR_MODEL_ROLE_DEEP_RED_TEAM=claude-opus-5-5`. This keeps specialist routing configurable without a code change. |

## 2. Audit of every model configuration path

| Path                                                                              | Before                                                   | Now                                                                                                                                                 |
| --------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine/engine.js` depth profiles, specialists, red team, director final, auditor | env plus hardcoded defaults                              | routing table (all roles)                                                                                                                           |
| `api/sonar/query/route.js` `modelForDepth`                                        | hardcoded `claude-sonnet-5` / Haiku 4.5                  | routing `legacy_deep` / `legacy_standard` (same models under `current`)                                                                             |
| `analysts/orchestrator.js` cost estimate                                          | own price table (Opus $15/$75, every Haiku at 4.5 rates) | routing price table. This matters: the old table made Opus 5.5 look three times dearer and would trip the $0.60 deep cost ceiling early.            |
| `llm-providers.js` Anthropic call with no model (adaptive executors)              | sent no model, took a 400, retried on Haiku              | sends Haiku 4.5 directly (same model, one round trip less)                                                                                          |
| `llm-providers.js` 400 retry                                                      | silently answers on Haiku                                | still retries, but records `fellBackFrom` and the served model. The benchmark flags any call where the served model differs from the requested one. |
| `router.js:422`, `landing-research.js:27,553`                                     | Haiku 4.5 hardcoded                                      | unchanged (landing ping; latency-bound, out of scope)                                                                                               |
| `landing-pipeline.js:168` `BRIEF_MODEL`                                           | `SONAR_LANDING_MODEL` or Sonnet 4.5                      | unchanged (landing brief)                                                                                                                           |
| `composer.js:17`                                                                  | `SONAR_V2_MODEL` or Sonnet 4.5                           | unchanged (v2 composer)                                                                                                                             |
| `understand/llm.js`                                                               | `SONAR_UNDERSTAND_MODEL`                                 | unchanged: deterministic half, the same for every cell                                                                                              |
| `rag/rerank.js`, `rag/query-rewrite.js`                                           | Haiku, direct fetch                                      | unchanged (retrieval, not synthesis)                                                                                                                |
| `api/sonar/attachment`, `api/sonar/health`                                        | direct fetch                                             | unchanged                                                                                                                                           |
| `api/cron/ingest-disclosures`                                                     | `SONAR_DISCLOSURE_MODEL` or Haiku                        | unchanged (ingestion)                                                                                                                               |
| `lib/ai/models.js`, help centre, EzanaQL, research copilot, Centaur               | own settings                                             | not Sonar; untouched                                                                                                                                |

## 3. How the benchmark works

Code: `src/lib/sonar/engine/eval/model-bench.js` (cases, cells, scorers),
`src/lib/sonar/engine/eval/replay.js` (frozen evidence),
`src/app/api/admin/sonar/model-bench/route.js` (runner), page `/admin/sonar-model-bench`.

1. **Availability.** One tiny call per model id. A model counts as available only if the
   API answers with that model. The usual silent fallback to Haiku is disabled for this
   check, so a model the account can't use shows up as a failure.
2. **Freeze.** For each case, understanding, resolution and every retrieval runner run
   once against production data. The calls are recorded, and the run stops at the
   evidence event, before any synthesis. The snapshot is stored as a row.
3. **Replay.** Each cell runs the full engine on that snapshot. The live database is
   blocked and `now` is pinned to the capture time. Retrieval, metrics, valuation
   arithmetic and charts (the deterministic half) are therefore identical for every
   cell, and each row records a fingerprint to prove it. Only the model calls differ.
   Every provider call is captured: requested model, served model, input, output and
   cache tokens, web searches, latency, status and timeouts.
4. **Score.** All of these are pure functions, so they apply identically to every model:
   - research objectives met, against expected outputs written per case
   - caveats stated
   - forbidden claims (no conduct or "insider" allegations from disclosure data)
   - citation validity: markers that exist in the frozen evidence
   - citation coverage: findings that cite anything
   - numeric fidelity: each number in the answer traced to the evidence or computed
     metrics, allowing rounding, %, $ and B/M/K scaling
   - unsupported claims: findings with no valid citation, plus sentences carrying an
     untraced number
   - completion, partial, deterministic-fallback and timeout flags
   - cost from actual usage at list price
   - LLM spend split into the deterministic legs (`understand`, `resolve`) and the synthesis under test
5. **Optional blind judge.** Opus 5.5 grades each answer from 1 to 5 on correctness,
   objective completion, financial interpretation, insight and calibration. It sees the
   question, the expected objectives, the frozen evidence and the answer, and never the
   model or the cell. Limitation: an Opus judge may prefer Opus prose. Treat the judge
   score as secondary to the deterministic scores, and read the B-versus-C deep result
   with that in mind.

### Cases (the existing Sonar benchmark questions)

| Case                                                                                                                            | Source                                         | Depth              |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------ |
| Congressional institutional ownership: "Can you tell me what stocks Nancy Pelosi owns that are most owned by investment firms?" | semantic `pelosi-own-breadth`                  | standard (+ quick) |
| Multi-dataset screening: "Which defense stocks are members of Congress trading?"                                                | bench-v1 `defense_congress`                    | standard           |
| Company fundamentals: "Give me a fundamental analysis of Apple."                                                                | semantic `aapl-fundamentals`                   | standard           |
| Government contract exposure: "How dependent is Palantir on government revenue?"                                                | semantic `palantir-gov-dependence`             | standard           |
| Macroeconomic research: "Brazilian economy outlook for the next 2 years"                                                        | bench-v1 `brazil_outlook`                      | standard (+ quick) |
| Valuation: "Run a DCF on Microsoft."                                                                                            | semantic `msft-dcf`                            | standard           |
| Deep Research: NVIDIA three-year growth risks across financials, ownership, contracts, industry and competition                 | bench-v1 `nvidia_three_year_risks` (mandatory) | deep               |

### Cells

- **Standard cases:** Haiku 4.5, Haiku 5.5, Sonnet 5.5 and Opus 5.5, each pinned to every role (the per-model comparison); then B/C standard (Sonnet 5.5 writer, Haiku 5.5 specialists); then current.
- **Deep case:** current, A, B, C.
- **Quick:** current against Haiku 5.5, on two cases.

That is 38 runs per trial. Run 3 trials for the deep case before deciding.

## 4. Running it

1. Wait for the deploy, then sign in as an admin and open `/admin/sonar-model-bench`.
2. Click **1. Check model availability**. Stop if any intended model is not available.
3. Click **2. Freeze evidence**. This takes about 7 runs' worth of retrieval and makes no synthesis calls.
4. Click **3. Run all cells**. Each step is one request of 5 minutes or less. Results land in
   `sonar_research_evaluations` (engine `model-bench`), so a closed tab loses nothing: enter
   the suite id and click **Load results**.
5. Optionally click **4. Blind judge**, then **Download JSON**.

Expected spend for one trial, at list price, is roughly $3 to $8, driven by the Opus cells.

## 5. Decision gates (a profile ships only if all hold)

Each gate compares the candidate profile with `current` on the same frozen evidence:

- **Reliability:** completion rate of 100% at standard depth and at least 95% at deep, with timeout rate at or below current.
- **Correctness:** objective completion and numeric fidelity no lower than current. Citation validity at least 0.95. Zero forbidden hits.
- **Unsupported claims per run:** no higher than current.
- **Latency:** standard p90 at most 1.25 times current. Deep p90 inside the deep budget with at least 30 s of headroom below the 300 s function cap.
- **Cost:** standard at most $0.03 per run. Deep at most $0.60 per run (the existing ceiling) and at most 1.5 times current, unless the quality gain is clear in both the deterministic scores and the judge.
- **Labels:** zero served-not-equal-to-requested mismatches.

## 6. Rollout

1. **Shadow:** this benchmark, with no user traffic.
2. **Staff canary:** `SONAR_MODEL_CANARY_PROFILE=<winner>` and `SONAR_MODEL_CANARY_USERS=<staff ids>`, for 2 to 3 days. Watch `researchMetadata.modelProfile`, `partial`, `durationMs` and provider errors.
3. **5% canary:** `SONAR_MODEL_CANARY_PERCENT=5`, then 25% after 3 clean days. Compare partial rate, p90 latency and cost per run between the canary and control buckets.
4. **Global:** `SONAR_MODEL_PROFILE=<winner>`, with `SONAR_MODEL_CANARY_PERCENT=0`.
5. **Kill switch:** `SONAR_MODEL_PROFILE=current` and `SONAR_MODEL_CANARY_PERCENT=0`, then redeploy. This needs no code change.

To pin a single role without moving a whole profile, for example Opus only for the deep
red team, use `SONAR_MODEL_ROLE_<ROLE>`.

## 7. Paired comparison, cross-dataset relationships, quality first (added Nov 28 2026)

- **Quality score (0 to 100), research quality only.** Objective completion is 25, financial
  reasoning 20, insight 15, evidence support 20 and factual correctness 20. Deterministic
  and judge signals are blended where both exist. Latency and cost never enter the score;
  they are tie-breakers reported beside it.
- **Two judges.** Opus 5.5 and Sonnet 5.5 each grade every run on six criteria. The sixth
  is cross-dataset relationships. Their spread is reported, so self-preference shows up
  as disagreement between the judges.
- **Paired comparison.** For each pair of cells, both judges see the two anonymized
  answers (X and Y) and the same frozen evidence. They pick a winner per criterion and
  give a reason. Each pair is judged in both orders. The order-consistency figure shows
  how often a verdict survives the swap; a low value means position bias, not a result.
  - Standard pairs: Sonnet vs Opus, Haiku 5.5 vs Sonnet, Haiku 4.5 vs Haiku 5.5, and
    current vs B/C.
  - Deep pairs: C vs B (the Opus question), A vs B, A vs C, and current vs C.
- **Cross-dataset relationships (deterministic).** A finding counts as synthesis when it
  cites two or more datasets and uses relating language (cause, comparison, contrast,
  timing, exposure). Reported per run: datasets in the evidence, datasets cited, the share
  of cross findings, and the dataset pairs linked.
- **Unattended worker.** `/api/cron/sonar-model-bench?lane=0..5` runs every minute and walks
  `ACTIVE_MODEL_BENCH` (`src/lib/sonar/engine/eval/model-bench-active.js`). It works in
  phases: freeze evidence, then 52 replays (the deep case runs 3 trials), then judging.
  Lanes shard the plan, so no two work on the same step. A step is retried once. The
  worker stops on the expiry date or a $60 spend cap. Remove the six cron entries once
  the suite is complete.
- **Proposed next cases.** Ten cases in `MODEL_BENCH_PROPOSED_CASES` are defined but not yet
  run. They cover complex cross-dataset screening, financial modelling, contradictory
  evidence, causal reasoning, and partially available data.

## 8. Results

The first run (Nov 28 2026) and its recommendation: `docs/SONAR_MODEL_BENCHMARK_RESULTS_2026-11-28.md`.
