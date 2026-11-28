# Sonar 6.3: Validation, corrected metrics, entitlement audit and data readiness

Nov 28 2026. Builds on Sonar 6.2 (`ee8afd13`, `6930cdb4`). Routing and semantic intent are
unchanged except one rule (section 4).

## 1. Live validation

**Status: not yet run on an authorized account.** The four benchmark questions need a
signed-in tier-1+ session (the free plan does not include SEC fundamentals, and the
analyses are gated on it). The built-in browser has no Ezana session, passwords are never
entered on the user's behalf, and no entitlement or guest limit was bypassed. The section
below is filled in once a signed-in run is done; until then the results are verified two
other ways:

- **Frozen-fixture execution** (`npm run test:sonar-execution`, 16 tests): every number is
  worked out by hand from `scripts/lib/sonar-exec-fixtures.mjs`.
- **Production data, read-only SQL**: the same tables the executors read, recomputed by
  hand (section 2 for Palantir).

| Question | Expected on production | Verified so far |
|---|---|---|
| Energy, operating margin > 15%, ranked by insider buying (90 days) | Funnel from 212 Energy tickers (132 with filed annual revenue in the window); ranked by Form 4 code P purchases | Fixture E2E; universe counts by SQL |
| Compare AMD, Intel, Qualcomm on revenue growth and operating margin | AMD, INTC, QCOM resolved from filed names (whole word); filed annual ratios; latest filed years end 2025-12-27 (AMD, INTC) and 2026-09-27 (QCOM), so the periods overlap only in part, stated | Fixture E2E; name resolution and year ends checked by SQL |
| How dependent is Palantir on government revenue? | Corrected output in section 2 | SQL + 10-K |
| Bank stocks with P/E below 10 | Unsupported notice, no screen | Intent check |

## 2. Palantir government dependence: audit and corrected metrics

### What was wrong
The 6.2 report described the contract figures as "federal obligations in FY2026". That is
not what the data holds. `company_contract_history` is built from USAspending
`spending_by_award` rows (`backfill-usaspending`, `ingest-usaspending`,
`bigquery-company-contracts.js`): **each prime award is counted once, in the federal fiscal
year its period of performance starts, at its total obligated amount to date** (the
"Award Amount" field). So a year's figure is the value of awards that *began* that year (a
vintage), not money obligated or paid during that year, and recent vintages keep growing as
options are exercised.

The 6.2 ratio also divided the FY2026 vintage (Oct 2025 to Sep 2026) by revenue for the
year ending Dec 2025, which share only 3 months.

### Corrected figures (production data, recomputed Nov 28 2026)

| Metric | Value | Source and period |
|---|---|---|
| Value of federal prime awards starting in FY2026, obligated to date | $1.340B | USAspending via Ezana, Oct 2025 to Sep 2026 start dates |
| Same, FY2025 vintage | $1.021B (FY2026 is +31.3%) | Oct 2024 to Sep 2025 |
| Filed revenue | $4.475B | 10-K, year ending Dec 31 2025 |
| **Award value to revenue (exposure indicator)** | **22.8%** = FY2025 vintage / 2025 revenue; the periods share 9 of 12 months | Was reported as 29.9% in 6.2 (FY2026 vintage, 3 months shared) |
| **Recognized government revenue share** | **53.7%**: Government segment $2.402B of $4.475B | 10-K FY2025 segment note (all government customers, US and international) |
| Recognized US government revenue share | 41.4%: $1.855B of $4.475B | Q4 2025 release (US government customers only) |
| Department of Defense share of FY2026 award value | 73.0% ($978M of $1.340B) | USAspending via Ezana |

The award-value ratio (22.8%) and recognized revenue share (53.7%) measure different things
and are reported side by side, never substituted. Awards understate government revenue
for Palantir because classified work, other transaction agreements, subcontracts and
non-US governments are not prime US contract awards matched by recipient name.

### Code changes
- `screen.js governmentDependence`: names the measure, pairs revenue with the federal year
  that shares the most months with the company's fiscal year (`federalFyForCompanyYear`),
  returns both periods and the overlap.
- `analytics-server.js runGovDependence`: labels, text and limitations describe the vintage
  measure exactly; recognized government revenue comes only from the company's segment
  disclosure (FMP revenue segmentation of the 10-K, already used by the engine) **for the
  same fiscal year as the filed revenue**; another year is never paired.
- Report tiles: "Awards started, FY2026 (obligated to date)", "FY2025 awards to revenue
  (periods share 9 of 12 months)", "Recognized government revenue share".
- Writer rule: say plainly that the figure is neither obligations made in the year nor
  recognized revenue, and do not state a recognized share without evidence.

## 3. 13F entitlement audit

`entitlements.js` puts `13f` in plan tier 2. Every server path that reads 13F data:

| Path | Who can call it | Plan check | Notes |
|---|---|---|---|
| `POST /api/sonar/research`: ownership analysis in a composition | Guests and every plan | **None.** `publicOnly` allows guests when all attachments are the ownership analysis; signed-in tier 0 and 1 run it too | The engine's own 13F evidence *is* gated (`planner.js institutional_13f -> '13f'`), but the composition text reaches the writer regardless |
| `POST /api/sonar/composer` `run` | Any signed-in user | **None** for ownership (6.3 adds the plan gate for screen, comparison, dependence) | |
| `POST /api/sonar/composer` `resolve` | Public | n/a | Returns a filer's name, latest period and holdings count |
| `POST /api/ezanaql/run` (dimension institutional) | Guests (IP rate limit) and users | None | Treats every live dataset as public data |
| `GET /api/titans/fund`, `/api/titans/security` | Public (rate limited) | None | Latest 13F holdings and changes per filer or security |
| `GET /api/quiver/sec13f` | Public | None | Proxies a paid Quiver feed with Ezana's key; a licensing and cost question beyond Sonar |
| `/api/research/company/[symbol]`, `/api/watchlist/institutions` | Signed in | None | |
| Ezana API (`/api/v1`, keyed) `institutional.*` | API key holders | API key tiers (`ezana-api/tiers.js`) | Separate commercial product |

**Finding.** SEC 13F data is public domain and most of the product already serves it
publicly. The tier-2 `13f` entitlement only gates the Sonar engine's own evidence, so
inside Sonar it is inconsistent: the composed ownership ranking runs for everyone while the
same data as engine evidence does not. No entitlement was changed.

**Public-preview contract (optional, built, off by default).**
`src/lib/sonar/composer/ownership-preview.js`, mode `SONAR_13F_UNENTITLED`:

- `full` (default): today's behaviour.
- `preview`: readers whose plan lacks `13f` get only the allow-listed fields: period, metric,
  universe total and eligible counts, number ranked, and the top 3 rows as rank, ticker,
  issuer and manager count. Values, weights, quarter-on-quarter changes, filer names,
  coverage detail and the rest of the table are dropped, and the writer reads text rebuilt
  from those fields only.
- `off`: no ownership analysis for those readers, with a notice.

It is applied in both the research and composer routes and tested
(`check-sonar-execution.mjs`). **Decision needed:** keep `full`, or set `preview` or `off`.
Separately: whether EzanaQL, Titans and the Quiver proxy should stay public.

## 4. Held-out objective evaluation

`sonar-evals/heldout/objective-cases.json` (40 cases, written independently; its rule is
never to tune on it) and `npm run test:sonar-objectives`. Unlike the analyst eval, it scores
whether the research objective was met: the right analysis planned (or nothing substituted
for an unsupported request), executed on frozen data with its required outputs, the
numbers correct, and the lead analyst.

| | Result |
|---|---|
| Planned correctly | 35 / 40 (first run) |
| Executed (16 executable cases) | 12 / 16, 6 of them with a stated data gap (a universe member with no filings) |
| Correct numbers | 11 / 16 |
| Lead analyst (14 engine cases) | 12 / 14 |
| **Objective met** | **32 / 40** first run |

Failures, left unfixed on purpose: screens on debt to equity, "semiconductor companies with
operating margin above 25%" and a two-filter screen were not recognised as screens (3);
"How does TTT compare with AAA" went to the portfolio comparison (1); "Compare the free cash
flow of AAA, BBB and CCC" dropped AAA (1); two engine questions got no lead (Bridgewater
13F activity, cloud market share).

One failure was a correctness bug of a general kind, so it was fixed and the case retired
into the development tests: "Compare Tesla and Ford on P/E" fell back to a default set of
metrics. A comparison on a measure filed figures cannot give is now unsupported. Replacement
case U11 added. After that: **33 / 40**.

Also run: the 20-question held-out routing set stays 15 / 20; the analyst eval stays 143 / 253.

## 5. Confidence and fulfillment

Checked against production: the two written runs on Nov 28 (11:55 and 11:57 UTC) were stated
**high** with citation coverage 1.0 but claim support of **0.29 and 0.43** (5 and 4 of 7
claims removed or downgraded by validation). Under the 6.2 audit they would have been
medium; 6.3 adds a rule that claim support under 50% means **low**, so a completed write-up
whose claims mostly failed validation cannot be high or medium. The audit is now persisted
(`report.confidenceAudit`) so production runs can be checked. No run since the 6.2 deploy
exists yet to verify end to end.

The alignment check was month-only, so two December year ends a year apart counted as aligned; it now requires year ends within 45 days.

A failed analysis now keeps its key and capability, so the fulfillment contract attributes
the failure to the right step (it previously showed as an unnamed failure).

## 6. Production performance (all recorded runs)

`sonar_research_runs` holds 41 engine runs (Nov 2 to Nov 28); `sonar_queries` 288 completed
queries in 60 days (163 guest).

| Week | Runs | Written | Fallback | Partial | p50 | p90 |
|---|---|---|---|---|---|---|
| Nov 2 | 13 | 4 | 8 | 3 | 89.9 s | 385.5 s |
| Nov 9 | 5 | 2 | 3 | 2 | 28.2 s | 91.0 s |
| Nov 16 | 9 | 5 | 4 | 0 | 25.9 s | 32.5 s |
| Nov 23 | 14 | 2 | 12 | 1 | 23.5 s | 31.1 s |

By mode (`sonar_queries`, completed): quick p50 9.5 s (53), standard p50 22.5 s (47), deep
p50 90.7 s (6). Engine legs: synthesis averages 32.6 s (p90 52.5 s) and is the latency
bottleneck; data tasks are 0.1 to 0.7 s except prediction markets (3 of 11 failed). No
provider errors recorded. Models: Haiku 4.5 for standard, Sonnet 4.5 for deep.

The sample is small (two regular readers) and mostly one subject, so these are not rates.
Model token usage per call is captured only from `1ce67edb` (today); costs before that are
not measurable. No composition run with a timed-out step has been recorded in production
yet, so partial-result recovery is verified by tests only.

## 7. Data-readiness matrix

| Capability | Data in Ezana today | Gap | Feasibility | Value | Priority |
|---|---|---|---|---|---|
| P/E, earnings yield, P/S, EV-based ratios | `shares_outstanding` (5,323 tickers), quarterly net income (5,260), annual revenue (4,558), cash and debt; prices from FMP live (daily bars) and `price_data_cache` (372 tickers) | Batch price per universe; TTM sums; EV needs total debt (long-term debt only, 2,907) | High: FMP batch quote + filed figures; P/E and P/S first, EV later | High (most asked unsupported screen) | **1** |
| Sub-industry screening (semiconductors, banks, defense) | `ticker_sectors`: 11 GICS sectors only | Industry classification | Medium: SEC submissions give SIC codes per filer (public), or FMP profile industry | High (removes the "broader GICS sector" caveat) | **2** |
| Recognized government revenue share | FMP segment revenue (live, already used by the engine); 6.3 uses it for the same fiscal year | US-only government revenue is a separate disclosure (not in segments) | Done for segment share; US share needs text extraction | High for contractors | Done (verify live) |
| Award value by year (true obligations) | Award-level vintages only | Transaction-level obligations by action date | Medium: USAspending transactions or the BigQuery corpus if it has transactions | Medium | 3 |
| Macro analysis (inflation trend, real rates, policy path) | IMF monthly CPI (210 countries, to Oct 2026), BIS policy rates (daily), WEO, OECD, Eurostat, ECB, BoE and others; no FRED/BLS/BEA | US-specific series beyond IMF | High for cross-country inflation and real-rate executors from existing data | Medium-high | **3** |
| Index universes (S&P 500, Nasdaq 100) | None | Constituent lists | Low to medium: licensing; FMP constituent endpoints depend on plan | Medium | 5 |
| Ownership as % of shares outstanding | 13F shares + filed `shares_outstanding` | Same-date alignment | Medium | Medium | 4 |
| Short interest, ESG, beta | None (beta derivable from prices for cached tickers only) | Sources | Low | Low-medium | 6 |

## 8. Sonar 6.3 roadmap (evidence-based order)

1. **Live validation** of the four benchmark questions on a tier-1+ account; fill section 1.
2. **Valuation ratios** (P/E, P/S, earnings yield) in screens and comparisons from FMP batch
   prices + filed shares and TTM figures, with price date and filing date shown.
3. **Sub-industry** from SEC SIC codes; retire the inexact-sector mapping.
4. **Held-out failures as development work** (then replace the cases): screen recognition for
   debt to equity and multi-filter phrasing, "compare X with Y" and "compare the M of A, B
   and C", and the two engine questions with no lead.
5. **Macro executors** on IMF CPI and BIS rates: inflation trend (YoY, 3-month annualised),
   real policy rate, and cross-country comparison.
6. **13F decision** (section 3) and, if chosen, set `SONAR_13F_UNENTITLED`.
7. **Synthesis latency**: synthesis is 33 s on average; per-component writers for computed
   sections, with the measured usage from the model-routing capture.
