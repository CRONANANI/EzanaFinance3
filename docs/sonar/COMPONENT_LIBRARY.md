# Sonar financial research component library

Nov 28, 2026. The adaptive component library for Ezana Sonar answers, the unified research shell, and the rules that keep every chart honest. Code: `src/lib/sonar/presentation/`, `src/components/sonar/{layout,cards,charts}/`. Tests: `npm run test:sonar-presentation`, `npm run test:sonar-contents`.

## 1. Render paths audited

| Path | Host | Shell before | Shell now |
| --- | --- | --- | --- |
| Quick ping (company, topic) | `landing/SonarPingBoard.jsx` | `SonarAnswerFrame` | unchanged |
| Country / macro ping | `landing/SonarCountryBoard.jsx` | `SonarAnswerFrame` | unchanged |
| Congress profile ping | `congress/CongressProfileReport.jsx` inside the ping board | `SonarAnswerFrame` | unchanged |
| Standard / deep research with an answer | `research/ResearchReport.jsx` to `ResearchBoard.jsx` | `SonarAnswerFrame` | composed results moved under the Desk Summary |
| Research Composer result, 13F ownership report | `CompositionReport.jsx`, `OwnershipReport.jsx` | above the Desk Summary (board `lead`) or at the top of the legacy report | first cell after the Desk Summary |
| Investment memo (positioning, fund fit, risk) | `ResearchReport.jsx` legacy branch | separate markup with `ReportContents`, no Desk Summary | `SonarAnswerFrame` + `ReportDeskSummary` |
| Run in progress, partial, failed, unsupported | `ResearchReport.jsx` legacy branch | separate markup, legend hidden under 3 sections | `SonarAnswerFrame` + `ReportDeskSummary` |
| Saved research, history (past runs) | `workspace-pages/SavedItemClient`, `PastRunClient`, `SavedAnswerView` | via `ResearchReport` / frame | inherits the above |
| Organizational Sonar report | `org/sonar/SonarReportPage.jsx` | via `ResearchReport` | inherits the above |

`ReportContents.jsx` and `report-sections.js` were removed: the legend returned `null` below three sections, so a short report lost its navigation and shifted left. The frame's persistent navigation (`answer-sections.js`) replaces it, with stable `sa-<key>` anchors in live and saved reports.

## 2. Existing Ezana chart inventory

| Component | Location | Type | Data | Interaction | Styling | Reuse | Sonar use |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `EzDonut` | `components/charts/` | donut | segments `{key,label,value}` | hover, controlled active | `ez-donut.css`, tokens | reusable | `SonarExposureBreakdown` wraps it |
| `EzRadar` | `components/charts/` | radar (Recharts) | rows per axis, series | legend isolate, tooltip | tokens, glow | reusable | factor profiles (future registry entry) |
| `EzScatterBrush` | `components/charts/` | canvas scatter + marginals | points `{x,y}` | brush, keyboard | tokens | reusable | correlation (future entry) |
| `EzSentimentBar` | `components/charts/` | segmented share bar | parts with tone | none | tokens | reusable | buy/sell distribution (future entry) |
| `EzContourStrata` | `components/charts/` | canvas band (drawdown) | stations base/top | crosshair, pin | tokens | reusable | backtest drawdown (quant template) |
| `GradientAreaChart` | `components/ui/` | area (Recharts) | rows + dataKey | tooltip | `CHART` theme | reusable | price and metric trends |
| `StockHeatmap` | `components/company-research/` | treemap | hardcoded sector data | hover, keys, click | tokens | coupled to its page | layout extracted to `lib/charts/squarify.js` and shared |
| Research board `LineChart`, `RankingModule` | `sonar/research/ResearchBoard.jsx` | SVG line, ranked bars + table view | analysis visualizations | chart/table toggle | `research-board.css` | mature, kept | still render line and single rankings |
| `ResearchChart` | `sonar/research/ResearchReport.jsx` | fallback SVG | any vis | none | `research-report.css` | fallback | unknown types |
| `CHART` | `lib/chart-theme.js` | Recharts props | | | | shared | all Recharts charts |

## 3. Supplied 21st.dev components: compatibility and mapping

The source files were referenced but not attached to the request; the adaptations follow the brief's description of each and the earlier 21st.dev ports already in the repo (`StockHeatmap`, `EzScatterBrush`, `EzContourStrata`). The repo is JavaScript, no TypeScript, no Tailwind, no shadcn (CLAUDE.md and the branding guide), so every adaptation is plain JSX with scoped CSS and JSDoc contracts. No dependency was added.

| Source | Sonar component | Kept | Removed |
| --- | --- | --- | --- |
| `market-watchlist.tsx` | `SonarResearchSecuritiesMonitor` | sortable rows, selection, sparkline | 5 hardcoded assets, blue accent, live ticking |
| `creator-dashboard.tsx` | `SonarActivityTimeline` (activity family) | annotated series, period metrics, event markers, event feed | creator metrics, payouts, synthetic generators, full-page wrapper |
| `leads-data-table.tsx` | `SonarFinancialResearchTable` | sort, filter, search, column visibility, selection, pagination, export | CRM fields, probability scores, status pills, row animation |
| `bar-race-chart.tsx` | `SonarRankingEvolutionChart` | rank movement, play | interpolation; animates only across real snapshots, static for one |
| `c-chart-20.tsx` | `SonarExposureBreakdown` | donut + legend | its own donut (uses `EzDonut`); donut only for exclusive categories |
| `led-matrix-sales.tsx` (supplied twice, one design) | `SonarFinancialActivityMatrix` | dot-matrix per period | orange gradients, commerce styling; absent data is hatched, never zero |
| `progress-metric-card.tsx` (+ `metric-chart`, `metric-controls`) | `SonarFinancialMetricCard` | value, change, sparkline | goal/progress semantics; tone follows metric polarity |
| `market-heatmap.tsx` | `SonarInvestmentUniverseHeatmap` | treemap, hover, keys | second treemap engine (shares `squarify`); area and colour must be labelled measures |

## 4. Shell and spacing standard

- Left research menu: 212px wide, 24px gutter, sticky under the 64px nav, same order on every ping (Research, Current report, Deep research). Deep sections keep their entitlement states (Locked, Not run, Running, Complete); a deep section a report shows to everyone (a memo's methodology) is listed under Current report, never as a completed deep run.
- Composer to follow-ups 12px; follow-ups to Desk Summary 18px (was about 30px of stacked margins plus card padding); Desk Summary to the first row 16px (board grid gap).
- Library tokens, scoped on `.srl`: padding 20px, heading gap 12px, label gap 6px, legend gap 12px, table row padding 10px. No new global tokens.
- Grid: 12 columns at 1040px+ of report width, 6 at 720px, 1 below; spans come from the registry (`span.wide/mid/min`).

## 5. Contracts, registry and planner

- `contracts.js`: the normalized payload (component id, objective, dataset, entity, values, unit, currency, period, retrieval time, methodology, evidence, coverage, completeness, limitations, access, flags). Missing is `null`; N/A on screen.
- `registry.js` (`sonar-components-v1`): eight approved components with objectives, families, required data, sufficiency rule, spans, minimum height, interactions, accessibility, state copy, freshness, entitlement, evidence requirement and redundancy signature. The model never returns component code.
- `planner.js`: extends `insight/viz-plan.js` (same dedupe, off-measure drop, depth caps), then maps each result to a registry component, evaluates sufficiency, dedupes by component signature, reports requested analyses that could not render (`unavailable`), and orders by the family template.
- `templates.js`: company fundamentals, congressional trading, institutional ownership, government contracts and lobbying, macro, quant, cross-dataset.
- `table-views.js`: the table and screen-reader summary of every chart, from the same payload.
- `desk-status.js`: the Desk Summary for running, memo, partial, failed and unsupported states.

## 6. Live today vs ready

Live on real data now: the shell, navigation, Desk Summary in every state, spacing, composition placement, and the congressional monthly activity (`timeline`) drawn by the activity matrix with a table view. The other components render when the analysis layer emits their visualization types (`donut`/`composition`, rankings with `snapshots`, `heatmap`/`treemap`, `table`, `securities`, `annotated_series`, `metric`). The engine does not emit those yet; wiring each analysis to its payload is the next step and should be done per pipeline with real-provider validation.

## 7. Remaining limitations

- No screenshot regression or responsive browser pass was run in this environment (no app credentials or data); run the 1440/1920/1024/768/390 checks on a preview deploy.
- The 21st.dev source files were not attached; adaptations follow the brief.
- `OwnershipReport` keeps its own table; moving it onto `SonarFinancialResearchTable` is a follow-up.
- Existing-chart adapters for `EzRadar`, `EzScatterBrush`, `EzSentimentBar` and `EzContourStrata` are listed above as future registry entries, not yet registered.
- `npm test` stops early here on the database concurrency suites (no local Postgres); every Sonar suite passes individually.
