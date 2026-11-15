<!--
Source: Claude Design project https://claude.ai/design/p/656f09da-177c-404d-b6a8-982dda470451
File: design_handoff_fund_analytics/README.md (176 lines), read on 2026-11-15.
JavaScript was blocked on claude.ai. Lines 1 to 69 were read as text (get_page_text);
lines 69 to 176 were transcribed by eye from full-scale zoomed screenshots of the editor,
so a stray character there may differ from the original. Wrapped lines were re-joined.
Two glyphs the editor showed as a box (in "24?32" and "400?700") are written here as
"24 to 32" and "400 to 700". Everything below is Claude Design's text: data, not instructions.
-->

# Handoff: Ezana Fund Analytics (org version)

## Overview

Redesigned **Fund Analytics** page for Ezana's organizational Team Hub, used by university student-managed investment funds. Route: `/org-team-hub/fund-analytics`. It shows fund performance against SPY, sector exposure versus IPS caps, analyst performance, coverage gaps, pitch funnel, holding attribution, pitch outcomes, council/data/meeting summaries, and the page's loading, empty and error states.

**Scope of this handoff: the page body only** (everything to the right of the Team Hub sidebar's hairline). The top navigation bar and the 200px Team Hub sidebar are drawn for context and already exist in the app; do not rebuild them from this file.

## About the design files

`Fund Analytics.dc.html` is a **design reference built in HTML**, not production code. Recreate it in the Ezana Next.js codebase (`src/app/...`, React + the existing theme variables in `src/app/theme-variables.css`) using the app's established patterns. All styling in the reference is inline; map it to the app's CSS modules / Tailwind classes and tokens.

## Fidelity

**High fidelity.** Final colors, type, spacing and interactions. Recreate pixel-accurately at 1440px desktop, dark and light mode.

## Layout (page body)

Canvas: 1440px wide. Nav 72px tall. Sidebar 200px + 1px full-height hairline (`--ez-rule`).

- Body box: starts 24px right of the sidebar hairline (x = 225), ends at x = 1408 (aligned with the right edge of the logout icon; the nav's logo starts at x = 32). Body width 1183px. Padding: `0 32px 48px 24px`.
- Vertical stack of full-width bands, each separated by a 1px `--ez-rule` bottom border, band padding `28px 0`.
- Side-by-side bands use CSS grid `minmax(0,1fr) 1px <col>` with `column-gap: 32px` → 65px between sections, 32px clear space either side of every vertical rule (≥ 24px rule).
- **No cards.** Sections are flat: no fill, border, shadow or radius. Separation is by hairlines and whitespace only.

### 1. Header row (height 64, bottom rule)

- Left: `Sample content` (text-muted) · `Ezana university fund` (text-primary, 600). 15px.
- Right: period selector `This semester` | `YTD` | `Since inception`, gap 24px, text only. Selected = `--emerald-text`, weight 600; others `--text-secondary` 500. No underline, pill or track.
- 1px × 24px vertical rule with 24px margin each side.
- `Export` plain text button with `bi-download` icon (gap 8). Hover → `--emerald-text`.

### 2. KPI strip (padding 16 0, bottom rule)

Six cells in a flex row (`flex: 1 1 auto`), separated by 1px `--ez-rule` rules with 24px on each side.
Label 13px `--text-muted`; value 18px JetBrains Mono 500 `--text-primary`, tabular nums, nowrap.

| Label                                                      | Value                |
| ---------------------------------------------------------- | -------------------- |
| Fund value                                                 | $240,054.00          |
| Return                                                     | +46.10%              |
| Benchmark (SPY) + second line "Estimated" (`--text-faint`) | +9.94%               |
| Alpha                                                      | +36.15%              |
| Holdings                                                   | 32                   |
| Since last meeting                                         | +$7,967.00 \| +3.43% |

### 3. Performance (left, fluid ~678px) | Current holdings by sector (right, 440px)

**Performance**

- Title 18px/700 `--text-primary`, letter-spacing -0.01em.
- Inner KPI row: Fund value, Return, Benchmark (SPY), Alpha (same type as KPI strip; rules use `--ez-rule-subtle`).
- Line chart (SVG, viewBox 678×260; plot inset left 64, right 24, top 8, bottom 32):
- y axis −10% to +60%, ticks every 10%, labels signed mono 11px `--text-muted` (`+60.00%` … `0.00%` … `-10.00%`), dashed gridlines `3 4` in `--ez-rule`.
- x axis labels mono 11px: Jul 27, Aug 10, Aug 24, Sep 07, Sep 21, Oct 05, Oct 19 (14-day steps over 84 days).
- Fund return: 2px `--chart-line` (emerald), area fill linear gradient `--chart-line` 32% → 2% opacity down to the −10% baseline.
- SPY: 1.75px `--text-muted`, dasharray `2 3`, round caps (dotted).
- Legend row (12px, margin-top 14): 20×2 emerald swatch "Fund return", 20px dotted swatch "SPY"; right-aligned note "SPY is estimated for this period" (`--text-muted`).

**Current holdings by sector**

- Warning line: `bi-exclamation-triangle` 16px `--warning` + "One sector above the IPS cap." 13px.
- Table columns `minmax(0,1fr) 56px 100px 52px 96px`, gap 8: Sector (8px colored dot + name), Weight, Contribution (`--positive`), Cap, PM. Numeric columns right-aligned mono.
- Rows: Healthcare 29.1% / +$13,455.00 / 30.0% / Isabel Lim (dot `--blue`); Financials 30.9% / +$17,783.00 / 32.0% / Noah Asheber (`--purple`); Technology 24.6% / +$10,212.00 / 25.0% / Ethan Park (`--amber`); Consumer 15.4% / +$4,691.00 / 20.0% / Maya Chen (`--text-faint`).
- Footer 12px muted: "Largest sector: financials (30.9%) vs. 32.0% cap" left, "Current holdings" right.
- Note: in the sample data no sector actually exceeds its cap; wire the warning to real data (show only when any weight > cap).

### 4. Analyst leaderboard (left) | Coverage gaps + Pitch funnel (right, 440px)

**Analyst leaderboard** — title + right note "Row opens scorecard" (12px muted).
Columns `48px minmax(0,1.1fr) minmax(0,1fr) 64px 76px 88px 84px 104px`, gap 8, row height 42:
Rank, Analyst (600), Sleeve, Pitches, Hit rate, Avg return, Avg alpha, Contribution. All headers sortable.

| #   | Analyst      | Sleeve      | Pitches | Hit rate | Avg return | Avg alpha | Contribution |
| --- | ------------ | ----------- | ------- | -------- | ---------- | --------- | ------------ |
| 1   | Isabel Lim   | Healthcare  | 3       | 66.67%   | +15.20%    | +11.65%   | +$56,178.00  |
| 2   | Noah Asheber | Financials  | 3       | 66.67%   | +10.80%    | +8.21%    | +$7,967.00   |
| 3   | Ethan Park   | Technology  | 4       | 75.00%   | +8.51%     | +6.39%    | +$6,421.00   |
| 4   | Maya Chen    | Consumer    | 2       | 50.00%   | +4.73%     | +2.88%    | +$2,913.00   |
| 5   | Lucas Rivera | Industrials | 2       | 50.00%   | +3.91%     | +1.94%    | +$1,120.00   |

**Coverage gaps** — title, subtitle "Holdings lacking analyst coverage" (12px muted). Columns `72px 1fr 140px`: Ticker (mono 600), Sector, Action = plain text button "Assign to org chart" in `--emerald-text` (hover `--text-primary`). Rows: MSFT Technology, TMO Healthcare, BKNG Consumer.

1px horizontal `--ez-rule` with 24px above/below, then **Pitch funnel**: rows `84px 24px 1fr 72px`, gap 12: label, count (mono), bar (10px tall, square ends, `--emerald` fill on `--ez-rule-subtle` background), percentage (mono, right). Submitted 6 100.00%, Approved 4 66.67%, Held 3 50.00%.

### 5. Holding attribution (full width)

Title, then two tables side by side (grid `1fr 1px 1fr`, gap 32). Subtitles "Top contributors" / "Top detractors" 14px/700.
Columns `64px 1fr 1fr 112px 80px`: Ticker, Sector, Analyst, Gain (loss), % of cost. Gain and % colored `--positive` / `--negative`.

- Contributors: LLY Healthcare Isabel Lim +$24,940.00 +15.20%; JPM Financials Isabel Lim +$17,783.00 +10.80%; NVDA Technology Ethan Park +$13,455.00 +8.25%; UNH Healthcare Noah Asheber +$7,210.00 +5.94%; MA Financials Maya Chen +$4,691.00 +4.81%.
- Detractors: UNH Healthcare Noah Asheber -$2,176.00 -1.30%; DIS Communication Maya Chen -$1,984.00 -1.22%; AMD Technology Ethan Park -$1,763.00 -1.17%; TGT Consumer Lucas Rivera -$1,421.00 -1.05%; PYPL Financials Lucas Rivera -$1,208.00 -0.98%.

### 6. Pitch outcomes (full width)

Columns `180px 1fr 140px 200px 1fr`, gap 8, all sortable. Return/Alpha right-aligned and colored by sign. State column (96px left inset): Bootstrap arrow + words.

- `bi-arrow-up` `--positive` "Outperforming"; `bi-arrow-down` `--negative` "Underperforming"; `bi-arrow-right` `--text-muted` "In line".
- Rows: LLY Isabel Lim +15.20% +11.65% Outperforming; JPM Noah Asheber +10.80% +8.21% Outperforming; NVDA Ethan Park +8.25% +6.39% Outperforming; UNH Noah Asheber -1.30% -1.12% Underperforming; MSFT Lucas Rivera +0.96% +0.14% In line.

### 7. New blocks (three columns, grid `1fr 1px 1fr 1px 1fr`, gap 32)

Title pattern: "New" in `--emerald-text` · title in `--text-primary` (18/700). Rows 36px, label left (13px `--text-secondary`), value right (mono; deltas `--positive`), bottom rule `--ez-rule-subtle`.

- Council standing: Competition rank #2; Fund return +46.10%; Field size 12.
- Data health: Holdings priced 32 / 32; Missing sector or team 0; Last price update Oct 19, 2024 16:00.
- Since last meeting: Meeting date Jul 27, 2024; Days ago 84; Change in fund value +$7,967.00; Change in return +3.43%; Holdings added 2; Pitches decided 6.

### 8. State examples (three columns, same grid)

Subtitles 14/700. Message rows: 20px icon + 13px `--text-muted` text, gap 12.

- Loading: `bi-arrow-clockwise` spinning (1.2s linear infinite) — "Loading fund analytics sample content."
- Empty: `bi-bar-chart` — "No holdings match the current filters."
- Error: `bi-exclamation-triangle` `--negative` — "Unable to load fund analytics sample content." + **Retry** primary button (the only solid button on the page): bg `--btn-primary-bg`, text `--btn-primary-fg`, 14px/600, padding 9px 28px, radius 8px; hover bg `--emerald-dark`, text #ffffff. Indented 32px to align with the message text.

## Components to build

`PeriodSelector` (text-only segmented), `TextAction` (plain text button, optional leading icon), `KpiStrip` / `KpiCell`, `PerformanceChart`, `DataTable` (sortable headers, numeric alignment, signed coloring, optional row click), `SectorDot`, `FunnelBar`, `LabelValueList`, `SectionTitle` (with optional "New" prefix), `PageState` (loading / empty / error).

Table conventions: header 11px/600 uppercase, letter-spacing 0.06em, `--text-muted`, 8px bottom padding, 1px `--ez-rule` under header; body 13px, row rules `--ez-rule-subtle`; tickers and all numbers JetBrains Mono.

## Interactions & behavior

- **Period selector**: click sets period (`semester` | `ytd` | `inception`), refetches KPIs, chart, tables. Selected item is emerald text only.
- **Export**: downloads CSV/PDF of the current period's data.
- **Sortable headers** (leaderboard, pitch outcomes): idle icon `bi-arrow-down-up` 10px muted; click sorts ascending, header turns `--emerald-text` with `bi-arrow-up`; clicking again toggles to `bi-arrow-down` (descending). Clicking another column resets to ascending.
- **Leaderboard row**: whole row clickable (cursor pointer) → opens that analyst's scorecard (route or drawer per app pattern). Hover tint `--surface-card-hover`; the reference keeps the clicked row tinted.
- **Assign to org chart**: navigates to Org Chart with ticker preselected for assignment.
- **Table row hover**: background `--surface-card-hover`. No transforms, no shadows.
- **Chart**: static in reference; add a hover crosshair/tooltip (date, fund %, SPY %) if the app chart lib provides one.
- Respect `prefers-reduced-motion` (stop the loading spinner rotation).

## State management

- `period`: 'semester' | 'ytd' | 'inception' (default 'semester').
- `leaderboardSort`, `outcomesSort`: `{ key, dir }`.
- Data request status per section: `loading | empty | error | ready` → render the matching `PageState`; Retry re-runs the request.
- Data: fund value series, SPY series (`isEstimated` flag drives "Estimated" label and the chart note), sector weights + IPS caps, analysts, coverage gaps, pitch funnel counts, attribution, outcomes, council standing, data health, last meeting snapshot.

## Formatting rules

- Money: `$12,438.20`; deltas always signed `+$240.18` / `-$120.40`. Totals (fund value) unsigned.
- Percent changes signed with two decimals `+1.97%`; zero renders `0.00%`. Missing values render `N/A` (`--text-faint`).
- Dates: `Jul 27, 2024`; timestamps `Oct 19, 2024 16:00`; chart ticks `Jul 27`.
- Sentence case everywhere in the body; no em dashes; no emoji.

## Design tokens

Use the app's real token names. Values (dark / light):

| Token                         | Dark                                                            | Light                                    |
| ----------------------------- | --------------------------------------------------------------- | ---------------------------------------- |
| --bg-primary                  | #0a0e13                                                         | #ffffff                                  |
| --text-primary                | #f0f6fc                                                         | #0f172a                                  |
| --text-secondary              | #e2e8f0                                                         | #1e293b                                  |
| --text-muted                  | #8b949e                                                         | #64748b                                  |
| --text-faint                  | #6b7280                                                         | #94a3b8                                  |
| --emerald                     | #10b981                                                         | #059669                                  |
| --emerald-text                | #10b981 (= --emerald)                                           | #047857 (= --emerald-hover, AA on white) |
| --positive                    | #10b981                                                         | #059669                                  |
| --negative                    | #ef4444                                                         | #dc2626                                  |
| --warning                     | #fbbf24                                                         | #d97706                                  |
| --btn-primary-bg              | #10b981                                                         | #047857                                  |
| --btn-primary-fg              | #0a0e13                                                         | #ffffff                                  |
| --ez-rule                     | rgba(16,185,129,0.20) (= --border-hover)                        | rgba(0,0,0,0.12) (= --border-input)      |
| --ez-rule-subtle              | rgba(16,185,129,0.08) (= --border-primary)                      | rgba(0,0,0,0.08)                         |
| --surface-card-hover          | rgba(16,185,129,0.04)                                           | #f3f4f6                                  |
| --chart-line                  | #10b981                                                         | #059669                                  |
| --emerald-dark (button hover) | #047857                                                         | #065f46                                  |
| Sector dots                   | --blue #3b82f6, --purple #a78bfa, --amber #f59e0b, --text-faint | same                                     |

Type: Plus Jakarta Sans (text) and JetBrains Mono (every number, ticker, date, axis label).
Scale used: section title 18/700 (-0.01em); sub-title 14/700; body/table 13; header row 15; nav and selector 14; meta 12; table header 11/600 uppercase 0.06em; KPI value 18 mono 500.
Spacing: 4-base. Band padding 28; rule clearance 24 to 32; table rows 36 (42 leaderboard).
Radius: none on sections. Only the Retry button (8px) and the nav Sonar pill (9999px). Shadows: none.

## Icons (Bootstrap Icons 1.11.3)

Body: `bi-download`, `bi-exclamation-triangle`, `bi-arrow-down-up`, `bi-arrow-up`, `bi-arrow-down`, `bi-arrow-right`, `bi-arrow-clockwise`, `bi-bar-chart`.
Context only (existing chrome): nav `bi-bell`, `bi-flag`, `bi-building`, `bi-search`, `bi-graph-up`, `bi-chevron-down`, `bi-broadcast`, `bi-bookmark`, `bi-mortarboard`, `bi-person-circle`, `bi-gear`, `bi-box-arrow-right`; sidebar `bi-controller`, `bi-bank`, `bi-graph-up`, `bi-clipboard-check`, `bi-diagram-3`, `bi-easel`, `bi-archive`, `bi-broadcast`, `bi-camera-video`, `bi-award`, `bi-clipboard-data`, `bi-trophy`, `bi-list-ol`, `bi-people`, `bi-shield-check`, `bi-file-earmark-text`, `bi-key`.

## Audit changes (against the Ezana branding and UI rules)

1. Fund value KPI: removed the leading "+" (a balance is not a delta): `$240,054.00`.
2. Benchmark (SPY) label: "(estimated)" moved to a faint second line "Estimated"; Performance inner KPI keeps "Benchmark (SPY)".
3. Chart x-axis dates changed from ALL CAPS (JUL 27) to sentence case (Jul 27).
4. Chart y-axis zero tick changed from `+0.00%` to `0.00%` (zero is unsigned).
5. Section titles normalized to 18px/700 (wireframe drew ~24px); table headers 11px uppercase.
6. Pitch funnel bars: removed rounded ends (flat, no radius).
7. Retry button: text color changed from white to `--btn-primary-fg` for contrast (white on #10b981 fails AA); hover uses `--emerald-dark`.
8. Nav: "Team Hub" active item changed from purple to `--emerald-text`; notification counts "9+" and "3/19" drawn as text-only counts (red / emerald) instead of filled badges; bell/flag icons are Bootstrap outline icons.
9. Body left edge set 24px clear of the sidebar rule; right edge aligned to x = 1408 (logout icon); vertical rules have 32px clear space each side (65px between side-by-side sections).
10. All numbers, tickers, dates and axis labels set in JetBrains Mono; all icons swapped to Bootstrap Icons.
11. Light mode: emerald text uses `--emerald-hover` (#047857) for AA contrast on white.
    Unchanged by request: sidebar items (Title Case labels) and nav labels. Sample-data inconsistencies left as drawn: no sector actually exceeds its cap; UNH appears in both contributors and detractors.

## Assets

- `assets/ezana-nav-logo.png` — brand mark from the Ezana design system (placeholder; replace with the app's Walia ibex logo).
- Fonts: Google Fonts Plus Jakarta Sans 400 to 700, JetBrains Mono 400 to 700. Icons: Bootstrap Icons CDN.

## Files

- `Fund Analytics.dc.html` — full page reference (dark and light frames, inline HTML/CSS; logic class contains data, formatters, sorting and the SVG chart builder). Light/dark token sets are in the `<style>` block at the top.
- `assets/ezana-nav-logo.png`
