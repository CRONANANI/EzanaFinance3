# Sonar 6.4: Financial Intelligence and Analytical Quality

Nov 28 2026. From Sonar 6.3 (`2ff32eee`). Commits: `49ff4b9c` (held-out cases and
baseline, before any 6.4 code), `2c0a5f2e`, `16c9f025`, `12b29d21`, `0b857008`, and
`3a551f1d` (deploy fix). Routing, semantic intent and the execution graph are unchanged in
structure; 6.4 adds executors, data and verification.

## 1. What is now implemented (calculations run and render)

| Capability | Calculation | Data | Verified |
|---|---|---|---|
| **Valuation screens and comparisons**: P/E, P/S, earnings yield, market cap | TTM = latest 10-K + later 10-Q quarters - the same quarters a year earlier (no Q4 needed, no look-ahead, gaps never filled); market cap = authorized price x latest filed share count | `sec_fundamentals` (quarterly net income 5,260 tickers, revenue 4,003, shares 5,323) + FMP quote (per symbol; the bulk endpoint answers 402 on the plan) | Live: AMPY P/E 5.71 = $141.2M / TTM $24.7M (10-K $44.0M + Q1-Q3 2026 -$39.7M - Q1-Q3 2025 -$20.4M), $3.53 x 40.0M shares |
| Negative earnings, stale inputs | P/E not meaningful (shown with negative earnings yield, listed by name); filed periods > 270 days, share counts > 200 days, prices > 7 days withhold the ratio and are named | | Live: 41 Energy loss-makers listed; AR withheld (no quarterly net income filed after its 10-K) |
| **Industry universes** | SEC SIC codes (13 industries); defense = SIC defense codes + companies with >= $100M of DoD prime awards, >= 50% of their federal awards; exact GICS sectors kept; unknown industries (solar, cybersecurity, AI) unsupported | `company_industry` (new, from EDGAR submissions) + `company_contract_history` | Live: "defense contractors" = 31 companies, ranked; semiconductors honestly refused (table not filled yet, section 5) |
| **Macro executors** | Inflation y/y (t vs t-12, both observed), 3-month annualised, y/y six months earlier, trend; real policy rate on a paired month; policy changes from BIS daily (effective dates) or monthly | IMF CPI (monthly, 210 countries), BIS policy rates (monthly, daily) | Live: US 3.74% y/y Sep 2026 = 154.520/148.953; 3m 3.63%; Oct 2025 missing in the IMF series, said so; trend "mixed" |
| **Claim-level verification** | Sentence removal for mislabeled numbers, unverified negative assertions, contradictions, unsupported numbers; claim kept ("rewritten") or removed | Report claims vs cited sources | Tests reproduce both live Palantir errors; live runs show sentences removed before display |
| **Screen quality** | Size column (market cap or revenue), FY end, notes: small base, revenue more than doubled (acquisitions), stale filing, negative earnings; rows never dropped | | Live: AVAV +140.9% flagged "revenue more than doubled (check for acquisitions)" (BlueHalo acquisition) |

## 2. Authenticated production validation

Run in the account holder's own signed-in Chrome session (plan tier 2) through
`/api/sonar/research`, standard mode, deployment `12b29d21`; every run counted against that
account's quota. Source records were recomputed with read-only SQL.

| Question | Result | Objective | Latency | Claim support (kept / claims; sentences rewritten) |
|---|---|---|---|---|
| Energy stocks with P/E below 10 | 212 → 132 filed → 25 pass (75 without a valuation, each reason listed) | met | 30.3 s | 7/7; 5 rewritten |
| Compare AMD, Intel, Qualcomm on P/E | AMD 91.4, QCOM 14.1, INTC not meaningful (losses) | met; **bug found and fixed** (below) | 26.8 s | 6/7; 2 |
| Semiconductors with margin > 25% | Refused: "No companies are classified as Semiconductors (SIC 3674) ... Sonar does not substitute a broader sector" | correct refusal (data not loaded) | 17.2 s | 3/3 |
| Rank defense contractors by revenue growth | 31-company universe (contract-defined), 23 with filings, ranked, acquisition flag | met | 33.2 s | 6/7; 3 |
| Is US inflation re-accelerating? | 3.7% y/y (Sep), 3m 3.6%, mixed; gap disclosed | met | 30.1 s | 7/7; 7 (one false positive, fixed) |
| Has the Bank of Canada cut rates this year? | **Wrong: 75 "changes"** | not met; **bug found and fixed** | 2.0 s | |
| How dependent is Palantir on government revenue? | $1.34B FY2026 awards (+31.3%); 22.8% paired indicator; recognized share "not available in this research"; no mislabeled ratio, no "does not disclose" | met | 26.3 s | 12/13 |

Bugs the live checks found, all fixed in `0b857008` (with tests):

1. **Bank of Canada: 75 policy "changes".** BIS daily series carry `null` on weekends and
   `Number(null)` is 0, so every weekend read as a cut and a hike. Missing now stays missing.
2. **TTM P/E attributed to a fiscal year end.** The comparison table showed the fiscal year
   end (Dec 2025) beside a TTM P/E through Sep 2026, and the writer repeated it. Valuation
   comparisons now show the TTM end date and the price date, align on them, show earnings
   yield beside P/E, and no longer report a loss-maker's P/E as "missing data".
3. **Contradiction false positive.** A sourced US unemployment rate (4.4%) was removed for
   sharing the label kind "rate" with the policy rate. A contradiction now needs the same
   label kind and subject, and the other value must be in no source.
4. **Macro fulfillment wording** said "companies with filed financials"; now "countries".

Provider costs are not stored per production run yet (the model-usage capture writes to
the benchmark records); the benchmark's measured cost for the current standard profile is
about $0.02 to $0.03 per research run (Haiku 4.5 writer), Sonnet 5.5 about $0.05 and Opus
5.5 about $0.10 on the same evidence (`docs/SONAR_MODEL_BENCHMARK_RESULTS_2026-11-28.md`).
6.4's executors add no model calls; they add up to 150 quote requests on a valuation screen.

## 3. Independent evaluation (before and after)

15 new held-out cases (valuation, industry, macro) were written and committed with their
fixtures **before any 6.4 code** (`49ff4b9c`); routing was not tuned on them.

| | 6.3 baseline (`2ff32eee`) | 6.4 |
|---|---|---|
| Objective met (55 cases) | 35 | **45** |
| Planned correctly | 40 | 49 |
| Executed (29 executable) | 14 | 23 |
| Correct numbers | 11 | 21 |
| Lead analyst (14) | 12 | 12 |
| Analyst eval (routing, 253) | 143 | 143 |
| Held-out routing (20) | 15 | 15 |

Gains: V01, V02, V04, V05 (valuation), I01, I04 (industry), M01 to M04 (macro).

Unresolved, left unfixed on purpose (no tuning on held-out cases):

- Phrasing gaps in the screen grammar: "Energy stocks with debt to equity below 0.6",
  "Semiconductor companies with operating margin above 25%", "Energy stocks with a price to
  sales ratio under 1", a two-filter screen, "Which defense contractors grew revenue the
  fastest?" (no screen verb, or "grew revenue"). The executors handle these once parsed
  (I01 passes with "Which ... have").
- S08 "Which tech stocks grew revenue more than 20%?" lists every tech stock: the growth
  filter is not parsed. It passed in 6.3 only because the fixture sector had one company.
- Comparison phrasing: "How does TTT compare with AAA" and "Compare the free cash flow of
  AAA, BBB and CCC" (drops the first company).
- Two engine questions get no lead analyst (Bridgewater 13F activity; cloud market share).

Development tests: `npm run test:sonar-execution` 31 pass (valuation, TTM, staleness,
industries, macro incl. nulls and daily dates, claim checks, bench scorer). All Sonar
suites, the analyst eval, lint, branding and architecture checks pass.

## 4. Model benchmark integrity

| Failure | Cause | Kind |
|---|---|---|
| `multi_dataset_screen` "members" missed by every model | The objective required "Rep.", "Sen.", "Representative" or "Senator". The frozen evidence names members without titles ("Kevin Hern", "Lisa C. McClain") and every model named them that way: 20 of 20 runs named a member, 0 used a title | **Expected-outcome error.** Fixed: members named in the frozen evidence meet the objective (`evidenceTerms` from the snapshot) |
| Haiku 5.5 misses "institutional" on the Pelosi ownership case | Output stopped at exactly the output budget (1,500 tokens quick, 2,900 standard); the truncated answer fell back to the records-only report, which has no ranking narrative | **Model or budget failure**, not the scorer: Haiku 5.5 is more verbose than 4.5 at the same caps |

## 5. Data actions needed

- `company_industry` exists in production (migration run) but is **empty**. The hourly
  sync cron was removed to fix the deploy: another session's commit took `vercel.json` to
  101 crons (limit 100) and the build failed (`3a551f1d` restored 100). Fill it by calling
  the sync until `remaining` is 0 (about 7 calls; SQL and command in
  `claude/sonar-6-4/SQL_01_company_industry.md`):
  `curl -H "Authorization: Bearer $CRON_SECRET" "https://ezana.world/api/cron/sync-company-industry?max=900"`.
  Until then industry screens refuse; defense works from contract data.
- Quarterly net income is missing for some companies with quarterly revenue (AR), which
  withholds their P/E as stale; worth a fundamentals backfill check.
- FMP segment revenue answers 402 (6.3); recognized government revenue share stays
  unavailable until segments come from SEC XBRL.

## 6. Institutional data entitlements: unified policy (recommendation; access unchanged)

Paths that read 13F data, re-audited:

| Path | Access today | Gate |
|---|---|---|
| Sonar research, ownership analysis | guests and every plan | none (`publicOnly`) |
| Sonar engine 13F evidence | tier 2 | `entitledDatasets` |
| Research Composer `run` | any signed-in user | none for ownership; plan gate for screen, comparison, dependence, macro (6.3/6.4) |
| Research Composer `resolve` | public | filer name, period, holdings count |
| EzanaQL `titans.holdings_13f` | guests (20/min per IP) and users | none |
| Titans `/api/titans/fund`, `/security` | public (60/min per IP) | none |
| Quiver `/api/quiver/sec13f` | public, no auth, global 100/min per IP | none; each call can make 5 upstream requests on Ezana's paid key |
| Ezana API `institutional.*` | API keys | key tiers |

Recommended policy, one server function (`institutionalAccess(path, access)`) every path calls:

1. **Public preview (no account):** aggregate fields only (counts, period, top 3 by
   manager count), the `preview` contract in `ownership-preview.js`; EzanaQL and Titans
   return capped row counts.
2. **Signed in, below the 13F tier:** the same preview everywhere, including Sonar and the
   Composer, so a guest never sees more than a free member.
3. **13F tier:** full analysis, raw rows, exports.
4. **Quiver proxy:** require a session and cache responses for 15 minutes regardless of the
   commercial decision; it is a paid feed with redistribution terms (security and cost
   finding, below).

The switch is `SONAR_13F_UNENTITLED` (full, preview, off) for Sonar and the Composer today;
the other paths need the shared function. **Nothing changes until the commercial decision.**

## 7. Security findings

| Severity | Finding | Status |
|---|---|---|
| Medium | `/api/quiver/sec13f` is unauthenticated and proxies a paid feed (up to 5 upstream calls per request); exposure is the global 100/min per-IP limit only; redistribution terms unchecked | Reported; not changed (commercial access) |
| Low | `/api/sonar/composer` `resolve` returns filer and member resolution publicly (name, period, holdings count) | Reported |
| Low | Composer `run` had no plan check for public analytics (fixed in 6.3 for screen, comparison, dependence; macro gated on `macro` in 6.4) | Fixed |
| Info | `company_industry`: RLS on, read-only for anon and authenticated, writes by service role only | By design |
| Info | Prices come only from the server (FMP key never leaves it); no user input reaches a query except validated tickers and ISO codes | By design |

## 8. Changed files

New: `src/lib/sonar/composer/industries.js`, `src/lib/sonar/composer/macro.js`,
`src/lib/sonar/engine/claim-check.js`, `src/app/api/cron/sync-company-industry/route.js`,
`supabase/migrations/20261130090000_company_industry.sql`,
`sonar-evals/heldout/results/*.json`, `docs/SONAR_6_4.md`.
Changed: `calc.js` (TTM, valuation), `analytics-server.js` (quotes, valuation, universes,
macro executor, screen quality, comparison), `screen.js` (measures, unsupported list,
universes), `intents.js` (macro inference, comparison metrics), `registry.js`
(macro capability, datasets), `execute.js`, `required-outputs.js`, `fulfillment.js`,
`semantic/compositional.js` (valuation measures, industries), `semantic/canonical-intent.js`,
`engine/findings.js` (sentence-level verification), `engine/confidence.js` (rewritten caps
high), `engine/eval/model-bench.js` and `model-bench-runner.js` (evidence-grounded
objective), `api/sonar/research/route.js`, `api/sonar/landing-query/route.js`,
`scripts/check-sonar-execution.mjs`, `scripts/check-sonar-objectives.mjs`,
`scripts/lib/sonar-exec-fixtures.mjs`, `sonar-evals/heldout/objective-cases.json`,
`vercel.json`.

## 9. Remaining limitations

- Industry screens need `company_industry` filled (section 5).
- Screen grammar gaps listed in section 3.
- EV/EBITDA, price to book, dividend yield, beta, short interest, ESG, index universes:
  unsupported (named, never substituted).
- Valuation is computed for at most 150 companies per screen (largest by filed revenue,
  said so) because quotes are one request per symbol on the current FMP plan.
- Inflation uses the unadjusted IMF index (3-month rates are noisy; stated); no core
  inflation or expectations.
- Claim checks cover percentages; dollar figures are checked for support, not for label.
- Per-run provider cost is not stored for production research runs yet.
