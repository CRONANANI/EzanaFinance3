# Sonar 6.5: multi-step research intelligence and execution reliability

Nov 28, 2026. No Anthropic API calls were made. No model benchmarks, live research, LLM judges
or model evaluations were run. Model routing, Profile D and Profile D-Efficient are unchanged.
No migrations were applied and no ingestion was scheduled. Verification is deterministic
(`npm run test:sonar-6-5`, 28 tests, fixtures committed first in `34c348a`).

## 1. Audit and root cause

The baseline (`docs/SONAR_6_5_BASELINE.md`, recorded on `174a6d0` before any 6.5 code) showed
two separate failures.

**Planning.** Requirement extraction depended on the canonical intent's exact wording.
- "congressional trading activity" produced no Congress condition.
- "growing institutional participation" and "declining margins" were dropped.
- A Congress condition was turned into a ranking.
- "Department of Defense" became a defense-sector universe, and the agency condition then disappeared.
- Five of the eight benchmark wordings produced no plan at all.

**Execution.** `runScreen` (6.4) did three things wrong:
- It treated a company without data for a condition as a fail and removed it.
- A source read that threw ended the whole screen, losing earlier stages.
- It kept no per-requirement record, so a dropped condition never appeared as unexecuted.

## 2. What was built

| Piece | Module | What it guarantees |
| --- | --- | --- |
| Result envelope | `execution/envelope.js` | Ten step statuses. Not-executed results need a reason. Usable results need source lineage. Frozen and deduplicated by canonical id. `outcomeOf` separates "none qualified" from "query failed", "no access" and "not executed". |
| Dependency graph | `execution/graph.js` | Validates unique ids, known dependencies, typed input/output links, cycles (Kahn) and a 24-step bound. Bounded parallelism. A failed step skips its dependants with the upstream reason. Dedupe by key. Deadline and cancellation. A 403 entitlement error becomes `permission_denied`. |
| Plan builder | `execution/plan.js` | Requirements or a Composer screen become one typed chain: a universe step, reads in question order with 13F last, then combine and rank. Each read takes the candidate set (passing or unknown) of the read before it. Automatic and Composer plans produce the same graph. |
| Conditions | `execution/conditions.js` | Three-valued logic: fail dominates, pass needs all passes, otherwise unknown. Unknown is never false. Per-company matrix with reasons. A failed source makes its condition unknown for everyone. Bounded and unchecked companies are explicit. A zero result is declared only when everything was evaluated. Set algebra by canonical id. |
| Temporal | `execution/temporal.js` | Period semantics per dataset (transaction date, action date and federal FY, 13F report period, each company's fiscal year end). Windows exclude future dates. Inclusive overlap test. Fiscal calendars reported, never merged. |
| Entities and awards | `execution/entities.js` | Attribution as direct, parent_group (verified subsidiary with a filing source), inferred (not joined), or unresolved (a name look-alike is never joined). Direct and group scopes. `historicalTicker` wraps the 6.4 registrant map. |
| Relationships | `execution/relationships.js` | Typed and classified relationships, with temporal comparability required. A causal-wording check catches co-occurrence presented as cause. Only non-interpretive relationships are chartable. |
| Requirements | `execution/requirements.js` | Every condition gets a resolution (exact, proxy with a note, or unsupported), along with the universe (sector, council fund gated on org id) and the ranking. `evaluateObjective` gives a per-requirement status and an overall objective of complete, partial or failed. |
| Gaps | `execution/gaps.js` | Gap kinds. At most one recovery attempt. No retry on 401 or 403. Never substitutes another dataset. |
| Synthesis | `execution/synthesis.js` | The writer receives qualified, failed, unknown and unavailable as separate lists, plus the objective and explicit rules. Claim classes. Telemetry holds counts only, with no tickers and no research text. |

**Wiring (existing files, extended, not replaced):**
- `composer/intents.js` `requirementsScreen`. The question's own requirements complete or create the screen attachment:
  - every condition the intent dropped becomes a filter, and unsupported conditions ride along in `params.requirements`;
  - a Congress condition stays a filter;
  - a DoD agency no longer turns into a sector;
  - the seeding condition is evaluated first.
- `composer/analytics-server.js` `runScreen`:
  - each source read is isolated and becomes `provider_error` or `permission_denied` with the chain continuing;
  - unknown companies stay in the candidate set but are never ranked;
  - it returns `conditionReport`, `outcome`, `unknownTickers`, `steps`, `objective`, `synthesis`, `rankingScope` and `telemetry`, and the text gains the synthesis block.
- `composer/calc.js` and `screen.js`: `operating_margin_prior` and `margin_change` (consecutive comparable years only).
- `composer/fulfillment.js`: every non-satisfied requirement is listed and keeps the screen `limited`.

## 3. Before and after

| Scenario | Before | After |
| --- | --- | --- |
| C: Congress activity, significant contracts, 13F rise | ownership analysis of one holder | screen seeded from Congress with 3 filters; "significant" and "traded" carry proxy notes |
| C (DoD variant) | defense sector, ranked by Congress, DoD silently lost | seeded from Congress, 3 filters, DoD agency listed as unsupported |
| A: Congress traded, 13F rise | nothing ran | screen, 2 filters |
| B: defense, new DoD awards, Congress | no plan | defense screen, Congress plus new awards, DoD agency unsupported |
| D: semis, margin > 25%, 13F growth | margin only | margin and 13F rise |
| E: growing award exposure, declining margin | no plan | declining margin runs; "growing award exposure" unsupported (not read as "any award") |
| H: growth > 20%, declining margin | no plan | 2 filters; asks for a universe (no sector, no seedable condition) |
| G: contracts relative to revenue | no plan | still no plan (see limitations) |
| 6.4 benchmark | worked | unchanged; all 6.4 assertions pass |

**Scenario C (release-blocking), on the frozen fixtures:**
- XAAA passes.
- XEEE is unknown on 13F, reported by name and not ranked.
- XBBB fails, because its award is future-dated.
- XPAR fails at direct scope; its subsidiary award joins only at group scope.

This holds for the pure screen and end to end through `runScreen`.

## 4. Integration with post-benchmark hardening (`cdc330a0`, `7f08a135`)

**Reused unchanged.**
- `stages.js`: `securityId`, `stageResult`, `runStageChain` and `planSeed` (the 6.5 intent path seeds through `planSeed`).
- The Congress, then contracts, then 13F chain and its readers in `runScreen`.
- `seedFromRows` future-date and ticker hygiene.
- `screenCoverage` with `MAX_UNIVERSE` and `MAX_VALUED`.
- The no-LLM guard and spending safeguards.
- The 6.4 registrant map (`tickerForFact`). The other session's `preferSuccessorFacts` addition is compatible: 6.5 imports only `tickerForFact`.

**Extended.**
- `runScreen` gained three-valued verdicts, isolated source reads and requirement objectives.
- `universeFromComposition` keeps full result identity.
- `fulfillment.js` gained per-requirement objectives.
- `calc.js` gained the prior-year margin.

**Superseded.** No 6.4 code was replaced. The 6.4 chain behaviour that removed a company with missing data at a later stage is superseded: that company is now unknown, kept in the candidate set and reported.

**Coverage limitations, item by item:**
1. **12-company planner handoff.** `universeFromComposition` now returns `allTickers`, `total` and `limit {applied, kept, total, order, reason}`. The label reads "the first 12 of the N companies that passed the screen (ranked by X; the other N-12 are in the screen table, not researched further)". The limit applies only to downstream research reads; the screen table keeps every company.
2. **13F cap of 150.** Companies past `MAX_RANKED_13F` are `uncheckedTickers`. The screen is `bounded`, `rankingScope` is `checked_companies_only`, and a limitation says the ranking covers checked companies only. Order beyond the cap is never presented as a ranking.
3. **Future-dated `contract_awards_resolved`.** A future `action_date` is invalid; a future performance end date is valid. `contractsInWindow` counts rows with `action_date` after the window end, excludes them, records `futureDatedExcluded` in lineage and states the count. Read-only sizing queries are in `docs/sql/SONAR_6_5_future_dated_awards.md` (not executed).
4. **Historical CIK relationships and provenance.** These are preserved through `historicalTicker`, which does no look-ahead. Financial-statement provenance from 6.4 is untouched.
5. **Microsoft DCF capex fade.** The default is held flat. The fade is `capexFadeScenario` with the label "Scenario: capex intensity fades to the history median (pending methodology approval)" and `approved: false`. It becomes the default only with `scenario: 'capex_fade'` or `SONAR_DCF_CAPEX_FADE_DEFAULT=1`.
6. **Benchmark spending safeguards.** Preserved. Nothing re-enables paid evaluation or changes routing.
7. **Composer, saved reports and org context.** Composer attachments run the same plan. New result fields are additive, so saved reports keep rendering. The council universe requires an authorized org id; without one it is `unavailable` and never guessed.

## 5. Remaining unsupported (stated to the reader, never silent)

- Awarding-agency filter (DoD). Award growth year over year. Rate sensitivity.
- Contracts-to-revenue ranking (scenario G): no screen measure yet and no universe.
- "Traded" is read as disclosed purchases. "Increasing institutional ownership" is read as comparable-manager breadth, not ownership share.

## 6. Security review

- No model calls. The suite fails on any provider request.
- Execution modules import no SDK and use no `Math.random` (static check).
- Telemetry carries counts only.
- Org ids are never logged.
- Entitlement 403s are never retried or substituted.
- No writes, migrations, schedules, trades, votes, pitch approvals or permission changes.

## 7. Rollout and rollback

Rollout is the deploy itself; there is no flag and no migration. Rollback means reverting the
6.5 commit. Result fields are additive, and saved reports written by 6.5 still render on 6.4,
which ignores the new fields.

## 8. Shared-file conflicts

The other session's `5a38ed8` (6.4 integration compatibility) overlapped only on
`package.json` scripts, and the rebase resolved it by appending. This work also edits
`check-sonar-hardening.mjs` and `check-sonar-valuation.mjs` (capex scenario assertions),
`analytics-server.js`, `model.js`, `calc.js`, `screen.js`, `intents.js`, `stages.js` and
`fulfillment.js`. None of these were changed upstream.
