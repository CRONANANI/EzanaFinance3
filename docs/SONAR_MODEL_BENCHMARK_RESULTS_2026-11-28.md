# Sonar model benchmark: results (Nov 28 2026)

Production routing is unchanged (profile `current`). These results come from production
data, frozen once per question and replayed for every model, with the live database
blocked. Raw rows: `sonar_research_evaluations`, suites `model-bench-2026-11-28` (the seven
cases) and `model-bench-2026-11-28-deep2` (deep follow-up). Side-by-side answers with
every judge's verdict and reason: `/admin/sonar-model-bench` → Load results → Answers side
by side.

## 1. Answer

**Opus 5.5 is justified as the Deep Research writer, and not elsewhere yet.**

- **Opus writer vs Sonnet writer, deep.** Same evidence, raised output caps, and only the
  writer changed. Opus won 22 of 24 paired judgments. Each judge independently picked Opus
  in 11 of its 12 judgments, across three questions and two trials. The gain is in
  objective completion (+0.54 net), insight (+0.54) and financial reasoning (+0.42). It does
  not show in factual correctness (+0.04) or cross-dataset relationships (+0.08). Cost
  rises by $0.08 a run (+29%) and p90 latency by 19 s.
- **Opus in the deep review steps (red team, audit).** The gain is smaller and inconsistent:
  +0.29 to +0.33 net, positive on two questions and negative on the Microsoft valuation.
  It isn't worth $0.07–0.08 a run as a default.
- **Opus at standard depth.** Quality ties Sonnet 5.5 (57.7 vs 57.8). Opus wins on insight
  and financial reasoning but loses on evidence support (−0.42), and the Sonnet judge was
  close to split (7–5). At 1.8× the cost this isn't justified.
- **Sonnet 5.5 at standard depth** is the clearest upgrade over today. It beat Haiku 5.5 in
  19 of 24 judgments and scored 57.8 against 45.2 for current production (Haiku 4.5).
- **Haiku 5.5** is 8× cheaper than Haiku 4.5. It was more accurate (correctness +0.83) but
  less complete (objective −0.50). It lost every quick comparison, and every one of its
  writer calls hit the output cap, so it was partly judged on cut-off answers.

**Recommended routing: profile `D`.** It is added to the routing table but not served.

| Role                 | Current                           | D            |
| -------------------- | --------------------------------- | ------------ |
| Quick writer         | Haiku 4.5                         | Haiku 4.5    |
| Standard writer      | Haiku 4.5                         | Sonnet 5.5   |
| Standard specialists | Haiku 4.5                         | Sonnet 5.5   |
| Deep writer          | Sonnet 4.5                        | **Opus 5.5** |
| Deep specialists     | Sonnet 4.5 (all time out, see §5) | Sonnet 5.5   |
| Deep red team, audit | Sonnet 4.5                        | Sonnet 5.5   |

None of the three proposed configurations should ship as specified. A and B put Haiku 5.5
on quick, which lost 8 of 8 comparisons. C's "selective Opus" escalated on every deep
question, because each one spanned two or more analyst groups, so in practice C was an
Opus writer plus Opus review. D is B with quick kept on Haiku 4.5 and Sonnet 5.5
specialists at standard depth (fewer unsupported claims than Haiku 5.5 specialists: 0.2 vs
1.7 a run).

**Before any canary, fix the three production problems in §5.** The worst is that today's
Deep Research runs with no specialists.

## 2. Run health

|                                        | Suite 1 (7 cases)                      | Suite 2 (deep follow-up) |
| -------------------------------------- | -------------------------------------- | ------------------------ |
| Runs                                   | 52                                     | 24                       |
| Completed                              | 52 (100%)                              | 24 (100%)                |
| Timeouts                               | 0                                      | 0                        |
| Partial results                        | 0                                      | 0                        |
| Fallback to the no-model report        | 1 (A, deep, trial 3)                   | 0                        |
| Served model ≠ requested               | 0                                      | 0                        |
| Live-database leaks in replay          | 0                                      | 0                        |
| Absolute grades (2 judges)             | 104 (7 recovered from cut-off replies) | 48                       |
| Paired judgments (2 judges × 2 orders) | 152                                    | 96                       |
| Spend, runs + judging                  | $5.12 + $6.52 = $11.64                 | $8.75 + $5.24 = $13.99   |

All four intended models answered as themselves. The deterministic half of each replay made
no model calls, so every dollar shown is synthesis.

**Noise floor.** At standard depth, `current` and `model:haiku45` are the same routing.
Their quality scores differed by 1 to 12 points per case (mean 5.4) but by only 0.8 points
when averaged over six cases. Read single-case gaps under about 10 points as noise; the
paired, order-swapped judgments are the more sensitive measure.

## 3. Standard depth (6 cases, 1 trial)

Quality, 0 to 100 (objective 25, financial reasoning 20, insight 15, evidence support 20,
factual correctness 20; latency and cost excluded). Judge scores are the mean of Opus 5.5
and Sonnet 5.5, on a 1 to 5 scale.

| Cell                                                | Quality  | Objective | Financial | Insight | Evidence | Correct | Cross-data | Unsupported/run | p50  | p90  | $/run  |
| --------------------------------------------------- | -------- | --------- | --------- | ------- | -------- | ------- | ---------- | --------------- | ---- | ---- | ------ |
| Sonnet 5.5                                          | **57.8** | 2.17      | 2.33      | 2.33    | 3.58     | 3.58    | 2.50       | 0.2             | 24 s | 34 s | $0.058 |
| Opus 5.5                                            | 57.7     | 2.25      | 2.42      | 2.50    | 3.25     | 3.33    | 2.33       | 0.2             | 32 s | 35 s | $0.105 |
| B/C standard (Sonnet writer, Haiku 5.5 specialists) | 54.1     | 2.08      | 2.17      | 2.08    | 3.17     | 3.33    | 2.17       | 1.7             | 21 s | 31 s | $0.036 |
| Haiku 4.5                                           | 46.0     | 1.75      | 2.08      | 1.83    | 2.33     | 2.25    | 2.08       | 1.2             | 32 s | 36 s | $0.029 |
| Current (Haiku 4.5)                                 | 45.2     | 1.75      | 1.92      | 1.58    | 2.83     | 2.58    | 1.67       | 1.2             | 35 s | 37 s | $0.028 |
| Haiku 5.5                                           | 43.3     | 1.50      | 1.58      | 1.58    | 2.83     | 3.17    | 1.58       | 1.5             | 17 s | 17 s | $0.003 |

Head to head: right cell's net win rate, from −1 to +1, over 24 judgments.

| Comparison              | Objective | Financial | Insight | Evidence  | Correct   | Cross-data | Overall   | Order-consistent |
| ----------------------- | --------- | --------- | ------- | --------- | --------- | ---------- | --------- | ---------------- |
| Opus 5.5 vs Sonnet 5.5  | −0.08     | +0.58     | +0.54   | **−0.42** | 0.00      | +0.08      | +0.33     | 83%              |
| Sonnet 5.5 vs Haiku 5.5 | +0.54     | +0.67     | +0.67   | +0.71     | +0.42     | +0.42      | **+0.58** | 92%              |
| Haiku 5.5 vs Haiku 4.5  | −0.50     | −0.42     | −0.29   | +0.50     | **+0.83** | −0.25      | −0.21     | 50%              |
| B/C standard vs current | 0.00      | −0.17     | +0.08   | +0.75     | +0.63     | +0.17      | +0.33     | 100%             |

## 4. Deep Research

### 4a. At production output caps (suite 1, NVIDIA question, 3 trials)

| Config                                   | Quality | Financial | Insight | Cross-data | Cross findings | Dataset pairs linked | p50   | p90   | $/run  |
| ---------------------------------------- | ------- | --------- | ------- | ---------- | -------------- | -------------------- | ----- | ----- | ------ |
| C: Opus writer (escalated) + Opus review | 61.8    | 2.83      | 3.17    | 3.00       | 92%            | 9.3                  | 74 s  | 81 s  | $0.395 |
| B: Opus writer, Sonnet review            | 60.9    | 3.17      | 3.17    | 2.50       | 89%            | 6.3                  | 82 s  | 83 s  | $0.371 |
| Current: Sonnet 4.5, no specialists      | 51.0    | 2.50      | 1.83    | 1.67       | 11%            | 1.0                  | 160 s | 161 s | $0.151 |
| A: Sonnet 5.5 everywhere                 | 47.4    | 2.00      | 2.00    | 1.83       | 56%            | 2.7                  | 72 s  | 73 s  | $0.262 |

Paired, overall: C beat current 12–0. C beat B 11–1, with both judges agreeing. B beat A
9–3, and C beat A 10–2. Every deep writer call in this suite stopped at the 6,000-token
cap, and one A trial lost all but one finding to it. That is why suite 2 was run.

### 4b. Output caps raised 1.75× (suite 2, three deep questions, 2 trials each)

Cells change one variable at a time, with no escalation.

| Cell                        | Quality | Objective | Financial | Insight | Cross-data | p50   | p90   | $/run  |
| --------------------------- | ------- | --------- | --------- | ------- | ---------- | ----- | ----- | ------ |
| Opus writes, Opus reviews   | 63.6    | 3.00      | 2.92      | 3.17    | 2.92       | 104 s | 139 s | $0.444 |
| Sonnet writes, Opus reviews | 61.2    | 2.58      | 2.58      | 3.00    | 2.50       | 93 s  | 125 s | $0.355 |
| Opus writes, Sonnet reviews | 59.0    | 2.50      | 2.50      | 2.83    | 2.17       | 93 s  | 133 s | $0.371 |
| Sonnet writes and reviews   | 57.7    | 2.33      | 2.42      | 2.58    | 2.58       | 87 s  | 114 s | $0.288 |

| Comparison (right vs left)                  | Objective | Financial | Insight | Evidence | Correct | Cross-data | Overall (wins)   |
| ------------------------------------------- | --------- | --------- | ------- | -------- | ------- | ---------- | ---------------- |
| **Writer: Opus vs Sonnet (Sonnet reviews)** | +0.54     | +0.42     | +0.54   | +0.29    | +0.04   | +0.08      | **+0.83 (22–2)** |
| Writer: Opus vs Sonnet (Opus reviews)       | +0.50     | +0.42     | +0.58   | −0.04    | −0.17   | +0.46      | +0.50 (18–6)     |
| Review: Opus vs Sonnet (Sonnet writes)      | +0.29     | +0.17     | +0.29   | +0.08    | +0.17   | −0.08      | +0.29 (15–8)     |
| Review: Opus vs Sonnet (Opus writes)        | +0.54     | +0.08     | +0.25   | −0.17    | −0.04   | +0.04      | +0.33 (16–8)     |

**Opus writer, per question and judge (wins out of 4):**

| Question       | Opus judge | Sonnet judge |
| -------------- | ---------- | ------------ |
| NVIDIA risks   | 3          | 3            |
| Defense screen | 4          | 4            |
| MSFT valuation | 4          | 4            |

The absolute rubric barely separates the writers (59.0 vs 57.7, inside the noise). The
paired comparison does: both judges, in both answer orders, preferred the Opus report.

### Side by side (deep defense screen, trial 1, opening of each report)

| Sonnet 5.5 writer                                                                                                                                                                        | Opus 5.5 writer                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "27 members disclosed 125 Defense trades in 12 months, led by TDG, PLTR, BA, GE, GD and LMT; trade sizes and timing remain unknown. … Three filers disclosed 25, 23 and 22 trades [S2]." | "Members of Congress made 125 defense trades in the past year, led by TransDigm, Palantir and Boeing … Activity is concentrated: Alan Armstrong, Gilbert Ray Cisneros, Jr. and April McClain Delaney each made more than 20 trades [S2]. LMT leaned to sales, with 8 of its 10 trades being sales [S1]." |

Reasons the judges gave (Sonnet 5.5 judge, Opus shown second):

- Defense screen: Y "names members and tickers and states buy/sell direction. X is more
  abstract and partly self-contradictory."
- NVIDIA: Y is "broader and more quantified, covering concentration, cash-flow funding,
  commitments versus RPO, and government exposure."
- MSFT: "Both decline to give a DCF, but Y is richer and better supported," with better
  framing on capex duration, backlog and what the price implies.

## 5. Production problems found (fix before any canary)

1. **Deep specialists time out today.** Under `current`, all 12 deep specialist calls
   (Sonnet 4.5) timed out at the provider's default 25-second hop limit. Production Deep
   Research therefore runs with no specialists, which also explains its 160-second
   latency. The specialist calls pass no `maxHopMs`. Sonnet 5.5 finished inside 25 s, but
   with no headroom.
2. **Output caps cut nearly every call.**
   - Deep memo writer: 12 of 12 hit 6,000 tokens, and 2 of 2 still hit 10,500.
   - Deep specialists (1,600), red team (900) and audit (800): every call.
   - Standard specialists (700) and quick writer (1,500): every call.
   - Standard writer: Haiku 5.5 hit the cap 6 of 6 times, Sonnet 6 of 12, Opus 4 of 6.

   The memo prompt has no length target, so it writes until it is cut off. Give the
   writers a length target, raise the caps (`SONAR_DEEP_TOKENS` covers the deep memo),
   then rerun this benchmark at the new caps.

3. **Evidence gaps in three cases.** Apple fundamentals froze only 2 retrieval calls. In the
   Microsoft DCF and the Palantir government share, every model said the required inputs
   were missing. Those cases currently test honest handling of gaps more than analysis.

## 6. Cross-dataset relationships

- **Measured two ways:** a deterministic count (findings citing 2+ datasets with relating
  language) and a judge criterion.
- **Standard depth:** few cross-dataset findings for any model (17–21% of findings).
  Current production had none.
- **Deep:** the Opus-writer configurations linked the most dataset pairs in suite 1 (6.3
  to 9.3 a run, against 1.0 for current).
- **Opus writer, suite 2:** no edge on relationships when Sonnet reviewed (+0.08). There
  was an edge when Opus also reviewed (+0.46).
- **Reading:** the Opus writer's advantage is mainly completeness, financial reasoning and
  insight, not more cross-dataset linking. Linking across datasets is weak at every depth
  and is a prompt and evidence-routing problem as much as a model one.

## 7. Per-run cost at list price (actual usage)

| Depth                 | Configuration                         | $/run   |
| --------------------- | ------------------------------------- | ------- |
| Quick                 | Haiku 4.5                             | $0.0105 |
| Quick                 | Haiku 5.5                             | $0.0012 |
| Standard              | Haiku 5.5                             | $0.003  |
| Standard              | Haiku 4.5 (current)                   | $0.028  |
| Standard              | Sonnet writer + Haiku 5.5 specialists | $0.036  |
| Standard              | Sonnet 5.5 (profile D)                | $0.058  |
| Standard              | Opus 5.5                              | $0.105  |
| Deep, production caps | Current (no specialists)              | $0.151  |
| Deep, production caps | A                                     | $0.262  |
| Deep, production caps | B                                     | $0.371  |
| Deep, production caps | C                                     | $0.395  |
| Deep, caps ×1.75      | Sonnet everywhere                     | $0.288  |
| Deep, caps ×1.75      | Opus writer (D)                       | $0.371  |
| Deep, caps ×1.75      | Opus writer + Opus review             | $0.444  |

Profile D against current: standard rises from $0.028 to $0.058. That exceeds the $0.03
gate, which you asked to rank below quality. Deep rises from $0.151 (current, which runs
without specialists) to about $0.37, inside the $0.60 deep ceiling. Opus writer plus Opus
review reached $0.607 on the NVIDIA question at raised caps.

## 8. Rollout (unchanged mechanics, see SONAR_MODEL_BENCHMARK.md §6)

1. Fix §5 items 1 and 2 behind their own change, then rerun both suites.
2. Staff canary: `SONAR_MODEL_CANARY_PROFILE=D` with `SONAR_MODEL_CANARY_USERS`. Compare
   `researchMetadata.modelProfile` buckets on partial rate, p90, cost and provider errors,
   and human-review 10 side-by-sides.
3. 5%, then 25%. Then `SONAR_MODEL_PROFILE=D`. Kill switch: `SONAR_MODEL_PROFILE=current`.
4. A narrower first step is possible with role pins alone, e.g.
   `SONAR_MODEL_ROLE_DEEP_DIRECTOR=claude-opus-5-5` and
   `SONAR_MODEL_ROLE_DEEP_SPECIALIST=claude-sonnet-5-5`, which moves only Deep Research.

## 9. Proposed next cases (defined in `MODEL_BENCH_PROPOSED_CASES`, not yet run)

| Category                        | Cases                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Complex cross-dataset screening | Congress buying + new federal awards + rising 13F ownership (deep); lobbying growth vs award growth vs margins                  |
| Financial modelling             | Three-scenario NVIDIA DCF with WACC and terminal sensitivity (deep); Palantir revenue covered by awarded contracts vs consensus |
| Contradictory evidence          | Tesla insiders selling while institutions buy; Turkey's inflation falling while the lira weakens                                |
| Causal reasoning                | Export controls vs NVIDIA China revenue (deep); rates vs regional-bank institutional ownership                                  |
| Partially available data        | Anduril's Pentagon exposure vs listed peers (private company); Super Micro after its delayed 10-K                               |

## 10. Limits

- Three deep questions with two to three trials each, and six standard questions with one
  trial.
- Both judges are Anthropic models. Self-preference was checked (the Sonnet judge also
  prefers Opus deep reports 11–1), but a human review of the side-by-sides is the next
  check.
- Absolute rubric scores sit low (2 to 3 out of 5) because the judges are strict; compare
  them across cells, not to a target.
- Deterministic citation validity and numeric fidelity are close to 100% everywhere,
  because the engine's validator removes unsupported claims before output. They catch
  regressions but don't separate the models.
