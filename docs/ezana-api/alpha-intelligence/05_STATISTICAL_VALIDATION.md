# 05 · Statistical validation report

Every number below was produced on 24 Nov 2026 by the code in this commit: synthetic results by
`scripts/check-ezana-api-alpha.mjs` (seeded, reproducible), real results by running
`procurementAcceleration` on the production contract-history panel. No backtest, correlation, regression or
accuracy figure appears here because none has been run: no predictive claim is made.

## 1. Robust z is not a probability on short histories

Simulated: a new value against `n` baseline values, all i.i.d. standard normal, 100,000 draws per `n`.

| Baseline years n | P(\|z\| > 3) | P(\|z\| > 5) | 95th pct of \|z\| | 99th pct of \|z\| |
| ---------------- | ------------ | ------------ | ----------------- | ----------------- |
| 5                | 15.1%        | 6.75%        | 5.97              | 13.99             |
| 6                | 10.3%        | 3.36%        | 4.21              | 7.90              |
| 7                | 9.5%         | 3.06%        | 4.07              | 7.82              |
| 8                | 6.9%         | 1.59%        | 3.39              | 5.79              |

A standard normal gives 0.27% for \|z\| > 3. With 8 annual points the MAD is a noisy scale, so a raw threshold
would flag roughly one company in fifteen on pure noise. Decision: keep robust z as the descriptive `value`, but
publish a calibrated tail probability for each history length and correct it across companies.

## 2. Calibration of the published statistics (synthetic, tested on every run)

| Statistic                                                                   | Test                                                                                  | Result                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `null_exceedance` (simulated null per n, seed independent of the test data) | On fresh noise, share with p <= 0.05 and p <= 0.01, n = 5 and n = 8, 6,000 draws each | Within 1.2 points of 5% and 0.6 points of 1% (asserted)                         |
| `rank_p` (exchangeability)                                                  | Share with p <= 1/9 for n = 8, 9,000 draws                                            | Within 1.2 points of 11.1% (asserted)                                           |
| `q_value` (Benjamini-Hochberg)                                              | 300 pure-noise companies                                                              | At most 3 with q <= 0.05 (asserted)                                             |
| Power                                                                       | 8-sigma planted shift, n = 8                                                          | Robust z > 3 in over 95% of draws (asserted)                                    |
| Leakage                                                                     | Rewriting every FY2025 value                                                          | FY2024 results unchanged (asserted); baseline median ignores the evaluated year |
| Persisting shift                                                            | Level raised from FY2024                                                              | FY2025 z > 5 and prior-year z > 5 with small arc growth (asserted)              |

## 3. Real data: procurement acceleration, FY2025 (complete years FY2017 to FY2025)

- Panel: 786 tickers, 5,582 ticker-years. Evaluated: **299** (excluded: 75 with fewer than 5 baseline years,
  386 with a baseline median under $1M, 0 with a flat history).
- Direction: 155 above their median, 144 below.
- **39** companies have `null_exceedance` <= 0.05, against about 15 expected under the i.i.d. null. FY2025 has more
  unusual moves than noise alone would give, though procurement is lumpy and the normal null is only a reference.
- After Benjamini-Hochberg across all 299: **2** with q <= 0.05 and **4** with q <= 0.10. Read individual names as
  leads to investigate, not established effects.

Largest upward values (USD millions; prior-year z separates a new move from a persisting one):

| Ticker | Robust z | FY2025 | Baseline median | Arc growth | Prior-year z | q     | Reading                                                    |
| ------ | -------- | ------ | --------------- | ---------- | ------------ | ----- | ---------------------------------------------------------- |
| GEHC   | 92.8     | 179    | 2               | -0.14      | 118.8        | 0.015 | Shift in FY2024 that persisted (2023 spin-off from GE)     |
| LEU    | 26.1     | 204    | 41              | 0.82       | 9.0          | 0.065 | Rising for two years, faster in FY2025                     |
| FSNUY  | 15.3     | 89     | 5               | 1.71       | 1.7          | 0.037 | New in FY2025                                              |
| AVAV   | 11.3     | 499    | 148             | 0.26       | 10.7         | 0.071 | Persisting, still growing                                  |
| CEG    | 9.0      | 215    | 56              | 1.33       | -1.1         | 0.107 | New in FY2025                                              |
| C      | 8.5      | 62     | 1               | 1.45       | 2.6          | 0.108 | New in FY2025                                              |
| FMS    | 7.6      | 635    | 276             | 2.00       | -7.5         | 0.124 | Rebound after a year at or below zero (net de-obligations) |

Largest downward: CNC (z -7.6, FY2025 $1,427M against a $3,532M median, arc -0.85), BCRX (-6.2, net
de-obligation of $29M), T (-6.0).

Limits of this evidence: one snapshot of annual totals (no vintages), mapping by resolved recipient names, a
normal reference null for lumpy data, and no link to returns or revenue. The signal is descriptive.

## 4. What was not validated, and why

| Signal                                                                              | Reason no statistics were run                          |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Institutional divergence, ownership confirmation, capital crowding, sector rotation | Q3 2026 13F holdings 9.4% parsed; 29 comparable filers |
| Insider behaviour anomaly                                                           | 54 days of Form 4                                      |
| Lobbying to procurement lead-lag                                                    | 2 complete lobbying years; one usable lag year         |
| Innovation divergence                                                               | Patent table empty                                     |
| Macro regime shift                                                                  | No release dates or vintages                           |
| Event calibration                                                                   | 35 days of snapshots                                   |

Multiple-testing log for this release: one hypothesis family (procurement unusualness), one fiscal year, 299
tests, corrected by Benjamini-Hochberg; no alternative thresholds, lags or feature sets were tried.
