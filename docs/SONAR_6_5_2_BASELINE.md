# Sonar 6.5.2 baseline (before)

Recorded Nov 28, 2026 on `29cad62` (Sonar 6.5.1), before any 6.5.2 code, by running the 6.5.1
contract functions over the frozen fixtures in `scripts/fixtures/sonar-6-5-2-contracts.mjs`
(no model calls, no network).

| Check | 6.5.1 result | What the records say |
| --- | --- | --- |
| Label of `federal_obligations_current_period` | "Federal obligations (latest complete federal FY)" | The value is the award-start cohort: obligated to date on awards that STARTED in the year. |
| XALP FY2026 "obligations" | 80,000,000 (only AW-2, which started in FY2026) | Signed obligation changes dated in FY2026: 120M + 40M - 10M (AW-1) + 80M (AW-2) = 230,000,000 |
| XALP FY2025 "obligations" | 300,000,000 (AW-1's whole cumulative amount, placed in its start year) | Actions dated in FY2025: 100M + 50M = 150,000,000 |
| XALP growth FY2026 vs FY2025 | change -220M, growth -73.3%, reported as a decline | Flow change +80M, growth +53.3% |
| XALP obligations / revenue | 0.0348 labelled as FY2026 obligations over revenue | Flow ratio 0.10; the 0.0348 figure is the award-start cohort ratio |
| XDEL award with agency "Department of Defence Logistics" | silently fails a DoD filter (counted as not DoD) | The agency is unresolved: the DoD condition is unknown |
| Transaction records | none stored; none read | USAspending `/api/v2/transactions/` carries `id`, `action_date`, `federal_action_obligation`, `modification_number` per action |

Root cause: the ingest stores one row per award with the USAspending search field "Start Date"
(written into a column named `action_date`) and "Award Amount" (obligated to date). Summing
those rows by the year of the start date measures a cohort of awards with their cumulative
amounts, not obligations incurred in the year. 6.5.1 disclosed this as a proxy in its notes but
kept measure ids and labels that read as fiscal-year obligations, and used the cohort for
year-over-year growth, where the start-year placement produces false declines and false rises.
