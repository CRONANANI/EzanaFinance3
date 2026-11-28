# Sonar 6.5.1 baseline (before)

Recorded Nov 28, 2026 on `c9fd32d` (HEAD at the start of 6.5.1), before any 6.5.1 code, with
`canonicalIntent`, `inferComposition` and `extractRequirements` (no model calls). Fixtures and
hand-worked expected outputs: `scripts/fixtures/sonar-6-5-1-research.mjs`.

| Query | Intent family | Attachment | Filters | Universe | Rank | Unsupported requirements | Ranking measure parsed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A: Rank publicly traded companies by federal contract obligations relative to annual revenue. | none | none | - | - | - | - | contracts_to_revenue (not a screen measure) |
| A2: Which defense companies have the highest federal contracting exposure compared with annual revenue? | multi_stage_screen | financial-screen | - | defense | revenue | - | - |
| A3: How significant are government obligations relative to Palantir's reported revenue? | none | none | - | - | - | - | - |
| A4: Compare federal obligations relative to revenue for Lockheed Martin, RTX, and Northrop Grumman. | none | none | - | - | - | - | - |
| B: Which publicly traded companies received new DoD contract awards in the last 12 months? | none | financial-screen | new awards in window | contracts seed | new awards | agency | - |
| B2: Which publicly traded contractors receive the most obligations from the Department of Energy? | multi_stage_screen | financial-screen | - | energy sector | FY awards | - | - |
| C: Congress purchases + DoD contracts + increased institutional ownership | multi_stage_screen | financial-screen | congress, FY awards, 13F change > 0 | congress seed | 13F managers (level) | agency | - |
| D: Increasing federal contract obligations over the last two comparable periods | government_contract_acceleration | none | - | - | - | - | - |
| E: Defense contractors with increasing federal obligations but declining operating margins | multi_stage_screen | financial-screen | any FY award, margin change < 0 | defense | margin | - | - |
| M: High interest rate sensitivity and rising revenue | fundamental_analysis | financial-screen | revenue growth > 0 | - | revenue growth | rate_sensitivity | - |

Root causes:
1. No obligations-to-revenue measure: the ranking parses to `contracts_to_revenue`, which no
   executor computes, so A, A3 and A4 produce no plan; A2 silently ranks by revenue.
2. The Department of Defense condition is recognized but has no executor (B, C stay
   "agency unsupported"); "Department of Energy" becomes the energy *sector* (B2).
3. No comparable-period obligations measure: "increasing obligations" is read as "any award
   in the latest fiscal year" (E) or produces nothing (D).
4. C ranks by the 13F level, not the change the question asked about, and reads the
   fiscal-year contract measure instead of the same-period window.
5. Congressional trades are keyed by ticker string only: a PARA trade from March 2025
   (Paramount Global) and one from 2026 are the same row key.
6. `ticker_sectors` lists one company under PSKY and SKYD: a sector screen can rank it twice.
7. The 13F stage evaluates the first 150 companies in seed (alphabetical) order.
8. `contract_awards_resolved.action_date` holds the award's USAspending Start Date (the
   ingest maps "Start Date" into it); 6.5 described rows dated after today as invalid
   action dates. They are awards whose period of performance has not started yet.
