# 04 · Signal research catalog

The machine-readable source of truth is `src/lib/ezana-api/alpha/signals.js`, served live (with gates measured
from the database) at `GET /v1/alpha/signals`. This page adds the research plan for each signal. Status is as of
24 Nov 2026.

Maturity levels: **descriptive** (a validated calculation), **statistical** (a tested relationship with stated
uncertainty), **predictive** (out-of-sample skill over a baseline). No signal is predictive today.

---

## procurement_acceleration · v1.0.0 · descriptive · **LIVE**

- **Route**: `GET /v1/alpha/procurement-acceleration` (scope `alpha`, delayed per key)
- **Hypothesis**: a company's federal obligations in a complete fiscal year far outside its own history mark a
  change in its government business.
- **Features**: net obligations by FY and agency; baseline = up to 8 prior complete FYs from the company's first
  appearance (gaps after first appearance are real zeros).
- **Outputs**: robust z (median/MAD), own-history percentile, prior-year robust z (to separate a persisting
  shift from a new one), arc growth, sector-relative arc growth (5+ peers), agency HHI and the agencies that
  drove the change, calibrated `null_exceedance`, Benjamini-Hochberg `q_value`, exchangeable `rank_p`.
- **Linear baseline**: not applicable to a descriptive univariate measure; the baseline comparison is the
  company's own history and its sector.
- **Nonlinear candidates**: none warranted (one annual observation per company per year).
- **Target**: none. Candidate predictive targets for a future version: next-FY obligation arc growth; 20 and
  60 trading-day residual returns after `available_at` (internal research only, licensed prices).
- **Validation plan for a predictive upgrade**: freeze v1 outputs per FY from now on (see roadmap: signal
  snapshots), then walk-forward by fiscal year against sector-only and momentum baselines, with purging around
  the reporting window and BH across tickers.
- **Known failure mode**: corporate actions (spin-offs, mergers) appear as level shifts. Observed on real data:
  GEHC (spun off from GE in 2023) has robust z 92.8 for FY2025 but prior-year z 118.8 and arc growth -0.14:
  the shift happened in FY2024 and persisted.

## institutional_divergence · v0.1.0 · descriptive · blocked (ingestion)

- **Hypothesis**: holder-breadth and share changes diverging from the sector's change mark repositioning.
- **Features**: per ticker, among filers parsed in both quarters: holders new, added, trimmed, exited; net
  reported shares; ownership HHI change; each as a robust z within sector for the quarter.
- **Gate**: 80% of indexed 13F-HR filings parsed for the latest complete quarter, and 500+ filers in both quarters.
  Observed: 9.4% (148 of 1,575) for Q3 2026; 29 comparable filers.
- **Overlap**: extends `/v1/institutional/confluence` and `/whale-moves` (top moves without a peer baseline);
  must not duplicate them.
- **Next step**: finish Q3 holdings parsing; then build as descriptive with `first_filed_at` as `available_at`.

## ownership_confirmation · v0.1.0 · descriptive · blocked (ingestion, history)

- **Hypothesis**: open-market insider direction (codes P and S only) agreeing with 13F holder change in the same
  quarter is stronger than either alone.
- **Gates**: the 13F gates above, and Form 4 covering a full quarter (92+ days). Observed: 54 days.
- **Overlap**: the composite's `confirmation` counts both as stated rules; this signal would add a peer baseline
  and, once history exists, the historical alignment frequency.

## insider_behavior_anomaly · v0.1.0 · descriptive · blocked (history)

- **Features**: issuer's open-market value, buyer count and role mix against its own trailing history.
- **Gate**: 730 days of Form 4. Observed: 54 days. Overlap: `/v1/insider/clusters` (co-timing only).

## lobbying_procurement_leadlag · v0.1.0 · statistical · blocked (history)

- **Model**: fixed-effects panel regression, contract arc growth(t+1, t+2) on lobbying change(t), company and
  year effects, errors clustered by company, alternative lags, verified mappings only.
- **Gate**: 5 complete lobbying years. Observed: 2 (2024, 2025). With contracts complete to FY2025, only one lag
  year exists: no panel can be estimated honestly.
- **Overlap**: `/v1/lobbying/spend-vs-awards` (same-period ratio).

## innovation_capital_divergence · v0.1.0 · blocked (ingestion)

- Patent grants table is empty (0 rows), and the 13F gates fail.

## capital_crowding · v0.1.0 · blocked (ingestion; licensing for outcomes)

- Concentration and common-holder overlap need full 13F quarters; testing against drawdowns needs licensed
  prices and stays internal.

## sector_rotation_pressure · v0.1.0 · blocked (ingestion)

- Sector aggregates of 13F and Form 4 change; same 13F gates.

## macro_regime_shift · v0.1.0 · statistical · blocked (point in time)

- Macro values carry only a fetch time, not a first-release date or vintage, so any historical regime would use
  revised data. Needs release calendars and vintage storage before research.

## geopolitical_exposure · v0.1.0 · blocked (mapping)

- No verified company to geography or counterparty table; exposure must not be inferred from country alone.

## event_probability_divergence · v0.1.0 · covered by existing

- Cross-venue disagreement is served by `/v1/predictions/consensus` (and `/cross-venue` once its view is applied,
  see 01). Calibration needs a year of snapshots (observed: 35 days).

---

## Candidate with history today: congressional flow to forward returns (not yet a registered signal)

Congressional trades span 2014 to 2026 with a disclosure date on every row, and 368 tickers have daily prices
from 2009. That is enough for an internal predictive study of the existing `insider-flow` score: target 20 and
60 trading-day residual returns measured from `disclosure_date`, baselines market-only and 12-1 momentum,
walk-forward by year with an untouched final period, BH across horizons. Outputs could be published as
descriptive statistics only (prices are not redistributable).
