# Ezana Alpha Intelligence

Mission: convert fragmented financial, institutional, political, corporate and economic data into testable
statistical signals, and publish only what the data can support.

Built 24 Nov 2026 on the existing API architecture (registry, catalogs, handlers, insights, OpenAPI, bearer keys,
tier scopes, delay controls). No second API server, no new database objects.

## What shipped

| Route                                    | What it returns                                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /v1/alpha/signals`                  | Every designed signal: version, hypothesis, what it measures and does not, dependencies, maturity, limitations, and readiness gates with the figure observed in the database at request time                 |
| `GET /v1/alpha/signals/{signal_id}`      | One signal                                                                                                                                                                                                   |
| `GET /v1/alpha/procurement-acceleration` | Companies whose federal obligations in a complete fiscal year are unusual against their own history, with sector-relative growth, agency drivers, a calibrated tail probability, BH q-value and rank p-value |

Scope `alpha` (Quant Firm and Institution). Code:

- `src/lib/ezana-api/alpha/stats.js`: robust z, MAD, percentile rank, arc growth, HHI, simulated null
  calibration, exchangeable rank p-value, Benjamini-Hochberg
- `src/lib/ezana-api/alpha/signals.js`: versioned signal registry and readiness gates
- `src/lib/ezana-api/insights/alpha.js`: complete-fiscal-year rule and procurement acceleration (pure)
- `src/lib/ezana-api/catalog/alpha.js`, `src/lib/ezana-api/handlers/alpha.js`: routes and handlers
- `scripts/check-ezana-api-alpha.mjs`: 20 tests (part of `npm run test:api`)
- `scripts/gcp/export-gateway-spec.mjs`: rebuilds the Google API Gateway spec from the registry

## What did not ship, and why

Institutional divergence and ownership confirmation were two of the three priority signals. They are not
published because the Q3 2026 13F holdings are 9.4% parsed (148 of 1,575 filers; 29 filers comparable with Q2).
A quarter-over-quarter comparison on that sample would report unparsed filers as exits. Both are in the
registry with live gates that open when parsing completes.

## Reports

| #   | Report                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------- |
| 01  | [API inventory](01_API_INVENTORY.md): all 105 routes, generated from the registry, plus 8 routes with no data behind them |
| 02  | [Dataset feasibility](02_DATASET_FEASIBILITY.md): measured coverage, history, freshness, PIT suitability                  |
| 03  | [Cross-dataset opportunity matrix](03_CROSS_DATASET_MATRIX.md)                                                            |
| 04  | [Signal research catalog](04_SIGNAL_RESEARCH_CATALOG.md)                                                                  |
| 05  | [Statistical validation](05_STATISTICAL_VALIDATION.md): calibration and real FY2025 results                               |
| 06  | [Alert architecture](06_ALERT_ARCHITECTURE.md) (designed, not built)                                                      |
| 07  | [Security and licensing](07_SECURITY_AND_LICENSING.md)                                                                    |
| 08  | [Testing report](08_TESTING_REPORT.md)                                                                                    |
| 09  | [Roadmap](09_ROADMAP.md)                                                                                                  |

The implemented endpoint library (deliverable 6) is the code above plus the public docs at
`/ezana-api#alpha-intelligence` and the generated OpenAPI at `/v1/openapi.json`.
