# 08 · Testing report

Run on 24 Nov 2026 against the commit that adds Alpha Intelligence.

## Automated checks

| Check                                                                                    | Result                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:api` (all eight API suites, including the new `check-ezana-api-alpha.mjs`) | **104 pass, 0 fail** (84 existing + 20 new)                                                                                                                                                                                  |
| `node --test scripts/check-ezana-api-alpha.mjs`                                          | 20 pass                                                                                                                                                                                                                      |
| ESLint on every touched file                                                             | clean                                                                                                                                                                                                                        |
| `npm run test:security`                                                                  | 20 pass                                                                                                                                                                                                                      |
| `npm run test:em-dash`                                                                   | 5 pass                                                                                                                                                                                                                       |
| `npm run lint:ds`, `npm run lint:a11y`                                                   | pass                                                                                                                                                                                                                         |
| `npm run lint:arch` (dependency-cruiser)                                                 | 0 errors; 12 warnings, identical to main                                                                                                                                                                                     |
| `npm run lint:css`                                                                       | 1 failure, pre-existing on main (`src/components/echo/home/echo-home.css:2369`), not touched here                                                                                                                            |
| knip                                                                                     | the alpha catalog exports are reported like every other catalog (read through a namespace import); no other unused exports                                                                                                   |
| `npm run build`                                                                          | **Compiled successfully**; page-data collection then stops at `/ezana-echo` because this workspace has no `NEXT_PUBLIC_SUPABASE_URL` / service key (the known eager-client constraint). Vercel builds with the variables set |
| Gateway spec (`scripts/gcp/export-gateway-spec.mjs`)                                     | Valid OpenAPI 3.0.3, 107 paths including the 3 Alpha routes, 475 KB                                                                                                                                                          |

## What the new suite covers

- **Registry and entitlements**: the three routes are live, `insight`, scoped `alpha`, state their method, have
  handlers; `alpha` is in Quant Firm and Institution only; routed signals resolve to their route ids; OpenAPI
  carries the sort and direction enums.
- **Estimators**: median, MAD, robust z (outlier-proof baseline, null on flat or short baselines), percentile
  rank with ties, arc growth bounds and zero handling, HHI.
- **Statistical validity on synthetic data**: robust z's fat null tail at n = 8 (documented reason for
  calibration); `null_exceedance` calibrated at 5% and 1% on fresh noise for n = 5 and 8; `rank_p` uniform under
  exchangeability; BH q-values on a known vector and on 300 noise companies; power against a planted shift.
- **Point in time**: a fiscal year is unreadable before its reporting window closes; an under-reported year is
  excluded; rewriting a later year leaves earlier evaluations unchanged; the baseline ignores the evaluated year.
- **Contract**: every shared field present; unknowns are `null` with a stated limitation, never zero; persisting
  level shifts are visible in the prior-year z; all sort orders are monotone.
- **Readiness**: with the coverage measured on 24 Nov 2026 each signal gets its honest status; once 13F parsing
  completes the 13F signals move to `ready_descriptive` without a code change.

## Real-data verification

The production contract-history panel (786 tickers, 5,582 ticker-years) was run through
`procurementAcceleration` with the same code the route uses: FY2025, 299 companies evaluated, results in 05.
The live HTTP route could not be called from this workspace (no network path to the deployment); after deploy,
check with a Quant Firm or Institution key:

```bash
curl.exe -s -H "Authorization: Bearer <key>" "https://ezana.world/v1/alpha/signals"
curl.exe -s -H "Authorization: Bearer <key>" "https://ezana.world/v1/alpha/procurement-acceleration?limit=5"
```

## Not tested (not built)

Alerts, subscriptions, webhooks, snapshot history, model rollback and backfills: none exist yet (06, 09).
