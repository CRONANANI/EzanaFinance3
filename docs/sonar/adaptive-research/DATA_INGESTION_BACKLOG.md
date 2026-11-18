# Sonar data ingestion backlog (by presentation family)

Nov 18, 2026. What the eight presentation families need that the repository does not hold, in the order to build it. Nothing here is ingested yet. Each item lists the source type, the checks before ingestion, how it is normalized, how provenance is kept, backfill order and freshness. Source types are named generically; a provider is chosen only after its licence is checked.

Rules for every item:

- **Licence first.** Confirm redistribution and display rights, attribution text and any caching limits before the first request. Record the licence and its review date with the adapter.
- **Definitions, units, frequency.** Record each series' definition, unit, scale, frequency, geography and revision policy. A series whose definition differs from an existing one is a new series, not a replacement.
- **Provenance per observation.** Every stored row carries source, series key, observation period, publication or retrieval time, and a source link. Sonar shows the public source type, never the vendor or table name.
- **No synthetic rows.** Gaps stay gaps. No interpolation, no carried-forward values presented as new observations.
- **Migrations are additive.** New tables and columns only; no destructive change to production. RLS on anything organization-scoped.

## 01 Country and macro

| Need | Source type | Checks | Normalization | Backfill | Freshness |
|---|---|---|---|---|---|
| Net usable reserves (reserve template) | IMF international reserves template, central-bank releases | Template coverage per country; definitions of predetermined drains | USD, monthly; kept apart from gross reserves (`fx_reserves` stays gross) | 10 years for the countries with FX pages first | Monthly, flag lagged after 45 days |
| Short-term external debt | Joint external debt hub, BIS, national statistics | Residual vs original maturity definition | USD, quarterly | 10 years | Quarterly |
| Sovereign spreads / CDS | Licensed market data only | Display licence is usually restrictive; may be unavailable | bps, daily | 2 years | Daily, or show as unavailable |
| Inflation expectations | Central-bank surveys, market breakevens where published | Survey horizon and population | %, monthly | 5 years | Monthly |
| Rankable reserves | IMF IFS reserves for all economies | Same unit and month across the cohort | USD, monthly, ISO3 | Current year plus 5 | Monthly |

## 02 Company and equity

| Need | Source type | Checks | Normalization | Backfill | Freshness |
|---|---|---|---|---|---|
| `industry_metrics`, `industry_facilities` (empty in the Nov 17 audit) | Issuer filings, regulator registries | Primary source per metric; a reviewer approves each metric definition | As-of date, measure definition, geographic scope, issuer link | Top issuers by research volume | Per filing |
| Company disclosures beyond about 20 tickers | Issuer filings | Same review workflow | Per filing | Expand by coverage demand | Per filing |
| 13F quarterly history | SEC 13F filings | Amendment handling and completeness check must pass before a quarter materializes (already enforced) | Holdings per filer per quarter | Quarter by quarter, oldest last | Quarterly |
| Lobbying identity | Senate LDA filings | Name-identity matches carry their verification tier | Per filing | Ongoing | Quarterly |

Government obligations are never divided by issuer revenue.

## 03 Event and geopolitics

| Need | Source type | Checks | Normalization | Backfill | Freshness |
|---|---|---|---|---|---|
| Strait and shipping transits | Official port and canal authority statistics; licensed AIS only if licensed for display | Licence; observation window; geography | Vessels or tonnes per period | 3 years | Weekly or as published |
| Freight and insurance rates | Licensed indices | Display licence | Index points, weekly | 2 years | Weekly, or unavailable |
| Sanctions to bilateral trade | Official trade statistics (UN Comtrade class), sanctions registries | HS level and partner reporting | USD, monthly or annual | 5 years | As published |
| Legal dockets | Court record services with display rights | Licence | Docket events with dates | As needed | Daily |
| Brent and benchmark crude | Exchange or official energy statistics | Licence | USD per barrel, daily | 10 years | Daily; an outage renders the oil chart unavailable |

Event existence is verified before effects are reported.

## 04 Comparison and rankings

- ISO3 identity table shared by every rankable series.
- Same-unit, same-period comparison engine: rank only within one unit and one period, or label the period mix explicitly per row.
- Cohort coverage shown with every ranking (how many economies report the period).
- Source revision metadata (vintage) per observation.
- Add reserves and broad energy consumption as rankable only after official observations are stored. No padded rows.

## 05 Portfolio and quant (council)

- Market-valued weights from a daily price history, kept apart from cost-based weights.
- Correlation and factor analytics only on adequate price histories, with the method recorded.
- Time-weighted return only with cash flows and benchmark alignment.
- Organization data resolved server-side from signed-in membership, RLS intact, never sent to a model or the web without an approved privacy design. IPS wording stays informational.

## 06 Probability and scenarios

- Contract metadata: venue-native ID, event family, settlement conditions, status, open and close time, last indexed time.
- Contract price history and bid and ask spreads where the venue permits storage and display.
- Schema checks so incompatible contracts are never aggregated; a candidate appears only with a verified source.

## 07 News and evidence

- Source-availability flag and citation-quality state on every answer (web search off means a degraded citation state, said on the answer).
- Canonical URL dedupe, source hierarchy (issuer filing, market close, independent news, social), timezone-normalized event times, conflicting-evidence handling.
- No sentiment score until a validated model and representative data exist.

## 08 Financial explainer

- Grow `methodology-glossary.js` entry by entry, each reviewed, versioned, with a change log. Candidates: real effective exchange rate, gross vs net reserves, ex-ante vs ex-post real rate, 13F holdings vs flows, obligations vs revenue.
