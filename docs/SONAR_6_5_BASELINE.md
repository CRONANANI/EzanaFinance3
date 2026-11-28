# Sonar 6.5 baseline (before)

Recorded Nov 28, 2026 on `174a6d0`, before any 6.5 execution code, with `inferComposition` (no model calls). Fixtures and expected outputs: `scripts/fixtures/sonar-6-5-research.mjs`.

| Scenario | Question | Intent family | Attachment produced | Problem |
| --- | --- | --- | --- | --- |
| C | Find companies with congressional trading activity, significant federal contracts, and increasing institutional ownership. | multi_stage_screen | institutional-ownership (no subject) | Congressional condition not extracted; fiscal-year contract measure cannot seed; falls back to an analysis that ranks one holder's portfolio. Three-dataset objective unanswered. |
| C (variant) | Find companies traded by members of Congress that also received Department of Defense contracts and experienced increasing institutional ownership. | multi_stage_screen | financial-screen, sector "defense", rank by congress | The congressional condition became a ranking, not a filter; the DoD agency condition disappears silently. |
| A | Which companies traded by members of Congress have seen increased institutional ownership? | institutional_ownership (unsupported note) | none | Routed to a single-holder ownership ranking; nothing runs. |
| B | Which defense contractors receiving new DoD awards were also traded by members of Congress? | none | none | No plan. |
| D | Which semiconductor companies have operating margins above 25% and growing institutional participation? | multi_stage_screen | financial-screen, margin only | The 13F condition is dropped silently. |
| E | Which defense companies have growing federal award exposure but declining operating margins? | government_contract_acceleration | none | No plan; both conditions lost. |
| H | Find companies with revenue growth above 20% but declining operating margins. | multi_stage_screen | none | Declining margin not extracted; screen not attached. |
| G | Rank companies by federal contract exposure relative to their revenue. | government_contract_dependency | none | No universe; no plan, no stated reason. |
| 6.4 benchmark | Find companies where members of Congress bought shares in the last 12 months, ... same period, ... institutional ownership rose. | multi_stage_screen | financial-screen seeded from Congress | Works (6.4). |

Execution-level gaps in `runScreen` (6.4):
1. A company without data for a condition is removed (counted only as "no data"): unknown is treated as fail.
2. A source read that throws fails the whole screen; earlier stages' results are lost.
3. There is no per-requirement fulfillment: a condition the planner dropped never appears as unexecuted.
4. "Traded" is read as purchases without saying so; "institutional accumulation" and "more managers holding" are not distinguished.
5. Subsidiary awards and name look-alikes have no attribution rule.
