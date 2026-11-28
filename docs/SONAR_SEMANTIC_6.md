# Sonar Semantic Intelligence 6.0 (Nov 28 2026)

Canonical Research Intent, structural query equivalence, and what changed in the pipeline.

## 1. Audit of the existing semantic architecture

| Stage | Where | What it did before 6.0 |
| --- | --- | --- |
| Composer intent detection | `src/lib/sonar/composer/intents.js` (`OPS`) | One regular expression per capability. Institutional ownership needed one of eight exact phrasings. |
| Server-side inference | `src/app/api/sonar/research/route.js` | Ran `inferComposition` when the page sent no composition; only an ownership attachment with a subject ran. |
| Semantic family scores | `src/lib/sonar/insight/semantic.js` | gte-small embeddings through `embedViaSupabaseCached`, cosine to 2 to 5 exemplars per family, 700 ms cap, standard and deep runs only. Lexical cues must agree, otherwise only a very close exemplar (0.86 or higher) counts. |
| Analytical intent | `src/lib/sonar/insight/intent.js` | Objective and family for the writer's plan. It did not decide whether a composer analysis runs. |
| Research spec | `src/lib/sonar/engine/research-spec.js` | Ranking metric = the first metric word found (`holdings_value` for any ownership wording). |

**Root cause of the Query A / Query B divergence.** The two questions split at the **first** stage, composer intent detection, before embeddings, the spec or synthesis were involved:

- Query A, "...that are **most owned by** investment firms", matched `most owned by <firms>` and attached Institutional Ownership Analysis (managers) for "Nancy Pelosi".
- Query B, "...are also **owned the most by** investment firms", matched none of the eight phrases. `extractSubject` also returned null ("stocks owned by X" was not a subject pattern). No attachment, so the route's server-side inference skipped it, no ranking ran, and the engine wrote a generic Pelosi disclosure report.

The embedding layer was not at fault: it only scores report families for the writer and never decided whether the ranking runs.

## 2. Canonical Research Intent (schema v1)

`src/lib/sonar/semantic/canonical-intent.js`, `canonicalIntent(question, { semanticMeasure })`:

```
intent_version, original_query, normalized (tokenized text), family, report_family, capability,
primary_entity { text, key, role, type, id, status }   id only from verified resolution
secondary_entities[], subject_universe, comparison_universe, measure, measure_source,
operations[], ranking { metric, direction, top_n }, time_scope, filters,
explicit_parameters, inferred_defaults[{ field, value, why }], ambiguities[], unsupported,
required_datasets[], required_outputs[], method_version, canonical_paraphrase
```

Stages: normalization (politeness, typos, quote marks; holder classes become `<inst>`, `<congress>` and `<insiders>` tokens), subject extraction, slots (comparison universe, measure, direction, holdings or trades, time, top N), optional embedding candidates, capability validation, then the typed intent.

Ownership measures and defaults:

| Measure | Metric | Composer metric | Supported |
| --- | --- | --- | --- |
| breadth (default when nothing is stated) | distinct_reporting_manager_count | managers | yes |
| value | aggregate_reported_value | value | yes |
| change (increase or decrease) | distinct_manager_count_change | change | yes |
| percentage | institutional_ownership_pct | none | no: recorded as unsupported, never swapped |

The defaults: the reporting period is the latest adequately covered 13F quarter, the holdings universe is estimated disclosed public equities, and the direction is descending.

## 3. Equivalence, signatures, plans

- `compareIntents(a, b)` compares entity (verified id, or name key while pending resolution), family, both universes, measure, ranking, time, explicit parameters and operations. Cosine similarity is not an input.
- `planSignature(intent)` is a hash of the material fields only (no raw text): `cri1-<16 hex>`. `resolved: false` until the entity has a verified id, and an unresolved signature must never be used for result reuse.
- `requiredTasks(intent)` is the task graph the plan may not drop. For the Pelosi ranking: resolve_holder, retrieve_estimated_holdings, match_securities, select_13f_period, aggregate_distinct_managers, rank_securities, validate_coverage, generate_findings, render_institutional_ownership_intelligence.
- `buildResearchSpec` now carries `canonicalIntent`, `planSignature` and `requiredTasks`. For a supported ownership ranking it sets `objective.primary = 'rank'` and `ranking.metric` from the intent.

## 4. Composer and route integration

- `inferComposition` attaches institutional ownership from the intent's slots and takes the metric from the intent. Unsupported measures (percentage, lowest first, recent trades only) and the members-of-Congress comparison attach nothing, rather than a different ranking. Manual composer edits were already preserved (`edited` attachments) and still are.
- The route computes the intent once. For an ownership question with no stated measure, it may retrieve embedding candidates (`intent-exemplars.js`, 500 ms cap). It tells the reader when a measure is unsupported. After the composition it adds the verified entity id and sends `payload.intent` (signature, paraphrase, defaults, ambiguities). It runs `intentFulfillment` and sends a notice when the ranking did not complete. The run's `canonicalIntent` telemetry (signature, family, measure, operations; no query text) goes into the run record.
- The three-resource Deep Research rule is unchanged. Every paraphrase produces exactly one ownership attachment, so equivalent wordings cannot land in different modes through duplicate attachments.

## 5. Embedding stage

`nearestExemplars` (in `insight/semantic.js`) shares the existing exemplar vector cache. `semanticMeasure` accepts a candidate only above 0.86 similarity and with a 0.04 margin over the best candidate of another measure. Both values are **provisional**: they have not been calibrated against the production embedder, because it is not reachable from the build environment. A candidate only fills a measure the question left unstated, and is recorded in `inferred_defaults`.

## 6. Result reuse rules (unchanged behaviour, documented)

Answer caching still keys on the question text, so paraphrases do not share cached answers. This is deliberate until the following hold, and the signature is ready for it:

1. reuse only when `planSignature.resolved` is true;
2. the dataset versions, the 13F period, the disclosure ingestion time, the method version and the model version all match;
3. the entitlements and organization scope match, and private portfolios or org research are never shared;
4. the result is complete (never a partial or failed run);
5. a request for fresh data forces a re-run.

Invalidate on a new disclosure, a newly covered 13F quarter, an identifier fix, a methodology or model version change, or a dataset reprocess.

## 7. Before and after traces

| | Query A | Query B, before | Query B, after |
| --- | --- | --- | --- |
| normalized | what stocks nancy pelosi owns that are most owned by `<inst>` | n/a | what stocks owned by nancy pelosi are also owned the most by `<inst>` |
| subject | Nancy Pelosi | null | Nancy Pelosi |
| attachment | institutional-ownership (managers) | none | institutional-ownership (managers) |
| family / measure | institutional_ownership / breadth | generic report | institutional_ownership / breadth |
| signature (resolved P000197) | cri1-51e5e6fac0a6e734 | n/a | cri1-51e5e6fac0a6e734 |

## 8. Tests and measurements

`npm run test:sonar-semantic` (`scripts/check-sonar-semantic.mjs`, benchmark `src/lib/sonar/semantic/benchmark.js`, version sem-bench-v1):

- 47 queries in 16 groups (ownership breadth, value and change, BlackRock, Palantir government dependence, NVIDIA growth risk, Microsoft AI infrastructure, Turkey lira, contract acceleration, fundamentals, DCF, GARCH, backtest, sanctions, lobbying, prediction markets), with noisy and typo variants.
- Equivalent recall 31/31 pairs. False equivalence 0/12 hard negatives (measure, direction, change direction, time window, top N, entity, holdings vs trades, buy vs sell, institutions vs Congress, dependence vs acceleration).
- Frozen-fixture ranking identical across all 13 breadth paraphrases. Plan, task graph, report family and spec ranking are identical for A and B.
- Deterministic stages take about 0.03 ms per query with no model call. The embedding stage runs only for ownership questions with no stated measure (one cached embedding, 500 ms cap).
- These existing suites still pass: sonar-ownership, sonar-composer, sonar-5, sonar-composer-v4, sonar-engine, sonar-research-mode, sonar-insight, sonar-understand, sonar-v2, and every other `test:sonar-*`.

## 9. Security review

- Semantic matching never reads or returns another user's research. No cross-user cache was added.
- Entity identity comes only from server resolution (`resolveSubject`). The name key (surname, or a country demonym) is used only while unresolved and never for reuse.
- Telemetry holds the signature, family, measure and operations, not the query text.
- Auth, RLS, entitlements, rate limits and guest rules in the route are unchanged. The ownership ranking was already public-data-only for guests.

## 10. Known limits

- Ownership percentage, lowest-first ranking and ranking only recent trades are not computed yet. The reader is told, and nothing else is substituted.
- Not handled: a person's name in lower case without a possessive ("which pelosi holdings..."), and a possessive with no apostrophe ("Pelosis").
- Families outside ownership are recognized by small cue sets. A question that matches none falls back to ordinary research, as before.
- Only English is supported; multilingual equivalence is not claimed.
- When a composition times out, its partial results are not kept; the failure is shown explicitly, as before.
- Embedding thresholds need calibration against production embeddings.
