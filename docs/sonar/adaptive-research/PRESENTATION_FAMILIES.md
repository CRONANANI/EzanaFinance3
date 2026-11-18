# Sonar presentation families (`families-v1`)

Nov 18, 2026. Code: `src/lib/sonar/adaptive/presentation-families.js`.

The 30 research scenarios (`profiles.js`) decide what is researched. A presentation family decides how the answer reads: which analytic zone opens it, which section types it composes, what data a block needs before it renders, and which follow-ups it offers. Families are a separate registry so a scenario can present in more than one family (C04 reads as macro intelligence for a rates question and as an explainer for a definitional one). Every rendered answer has exactly one primary family.

## How a family is chosen

1. **Plan.** `planAdaptive` adds `plan.presentation = { version, presentationFamily, analyticalSubtype, supportingFamilies }` from the primary scenario and the plan's intent flags: `plan.explainer` (family 08), `plan.fx` (01), `plan.geo` (03). Otherwise the family that lists the scenario as primary, then as supporting, then the scenario letter's default.
2. **Report.** After execution and validation, `composePresentation` confirms the family against the sections that came back. If the proposed family's first zone did not render, the answer is demoted to the family whose first zone did. The report gains `presentation = { version, presentationFamily, familyLabel, analyticalSubtype, supportingFamilies, firstZone, composedSections, sourceCoverage: { dataBlocks, sourcedBlocks, gaps } }`.
3. **Renderer.** `SonarAdaptiveReport` reads `report.presentation`: the family label heads the answer when the lead has no kicker, and the root carries `data-family`. Sections render from the validated `arie-report-v1` contract, unchanged; `presentation` is an optional, backwards-compatible field, so stored answers without it render as before. The model never chooses markup: it produces typed sections and this registry plus the renderer's curated mapping place them.

Council overlays (D01 to D04) get the same metadata, computed from section types and counts only: no organization records enter it.

## The eight families

| # | Family | Label over the answer | First zone (first present) | Primary scenarios | Supporting | Subtypes |
|---|---|---|---|---|---|---|
| 01 | `sovereign_macro` | Currency intelligence / Country intelligence | `fx_overview`, `series_chart`, `macro_timeseries` | C01, C04, C05 | C09 | currency_pressure, external_liquidity, policy_rates, country_overview |
| 02 | `company_equity` | Company research | `fundamentals`, `metric_table`, `valuation`, `ranking`, `series_chart`, `data_table` | B02 to B08 | B01, A04 | government_dependence, ownership, valuation, fundamentals |
| 03 | `geopolitical_event` | Event-driven intelligence | `kpi_strip`, `verified_event_status`, `event_timeline`, `market_comparison` | A08, A01, A07, C06 | C03, C10 | energy_shock, sanctions_trade, event_verification |
| 04 | `comparative_rankings` | Comparative intelligence | `ranking`, `metric_table` | C02, C09 | B09 | country_ranking, peer_comparison |
| 05 | `portfolio_quant` | Portfolio intelligence | `portfolio_attribution`, `price_comparison`, `metric_table` | B10, D03, D01 | B09, D02, D04 | fund_risk, fund_fit, strategy_analytics |
| 06 | `prediction_scenarios` | Event probability intelligence | `forecast_market`, `candidate_table`, `verified_event_status` | C08, A02 | A06, A09 | succession, contract_pricing |
| 07 | `news_evidence` | News and evidence intelligence | `price_comparison`, `verified_event_status`, `news_timeline` | A05, A10, C10 | A01, A09 | market_move, narrative |
| 08 | `financial_explainer` | Financial explainer | `ex_definitions`, `ex_equations` | none (rides on the entry's scenario) | C04, C01 | concept |

Scenarios B01, C03, C07 and A03, A04, A06, A09 present through their supporting family or their letter default.

## Composition rules in force

- Charts render only from at least two real, dated observations; schema rules per section type enforce it, and the technical chart keeps its 30-bar minimum. A missing series is one short line, never a placeholder chart.
- All charts in the currency answer and the long-run chart use `SonarResearchChart` (home comparison chart language, `CHART` props). Charts in one grid share a crosshair by period (`syncId`, matched by value, so only aligned periods sync). Comparison lines are dotted and neutral.
- Follow-ups are two to four text links under the question (Explore), carrying thread context; the follow-up box closes the report.
- Anchor tabs exist only for sections that rendered, as emerald text.
- Sections are flat (Branding and UI Guide sections 4 and 22): no fill, border, radius or shadow; hairlines divide; 64px between side-by-side sections.

## Family 08: financial explainer

`explainer.js` answers a definitional question from a reviewed, versioned entry in `methodology-glossary.js` (definitions, formulas with conventions, which measure answers which question, a conceptual diagram, method notes, kinds of source to verify). No numbers: a follow-up naming a country or company goes to that scenario. Entries carry `version`, `reviewed` and `changes`; answers record the entry version in telemetry. Entries today: `nominal_vs_real_rates` (C04), `fx_quote_convention` (C01).

## Migration state per family

| # | State |
|---|---|
| 01 | Migrated: fx-pressure-v3 on the flat contract; opening row is country intelligence beside the pressure breakdown, four charts two by two with a shared crosshair. |
| 02 to 07 | Registry, plan and report metadata, family label, Explore links and flat shell apply. Their executors' existing sections render as before; family-specific first zones in the wireframes that need new data (agency obligations table, contract matching, price-and-benchmark move window) are in the ingestion backlog or need new section types. |
| 08 | New: explainer route and six section types, rendered flat. |
