# Handoff: Ezana Recognition page (organizational)

(Transcribed from the Claude Design handoff folder `design_handoff_recognition_page/README.md`, 84 lines, read
with get_page_text because JavaScript is blocked on claude.ai. Wrapped lines re-joined. Project:
https://claude.ai/design/p/adb03cf7-9cfe-42ae-8b3b-43fe49d975b4)

## Overview

Redesigned Recognition page for the Team Hub, route `/org-team-hub/recognition`, used by university student-managed investment councils. Managers award badges, recompute ratings and review one member's scorecard; analysts see the same page read only.

## About the design files

The files here are **design references built in HTML**, not production code. Recreate them in the target codebase (the Ezana Next.js app: `src/app/theme-variables.css`, `src/components/ui/*`) using its existing patterns. All names, numbers and tickers are **sample content** (marked `data-sample="true"` in the HTML) from one invented nine-member council.

## Fidelity

High fidelity. Final colors, type, spacing and interactions. Desktop canvas 1440px wide, dark mode default, light mode via the `.light-mode` token scope.

## Files

- `Recognition Page.dc.html` — the page (props: `theme` dark|light, `dialogOpen`, `analystView`). Template markup is plain HTML with inline styles; the logic class at the bottom holds tab and dialog state.
- `Recognition Board.dc.html` — canvas showing 1a dark, 1b dark with award dialog, 1c light.
- `colors_and_type.css` — Ezana design-system tokens (copy of `colors_and_type.css`; `.light-mode` selector added and `--gold: #b8922f` in light scope for contrast).
- `assets/ezana-nav-logo.png` — nav brand mark (stand-in, see Assets).

## Layout (1440px)

- Content edge: x = 32 to x = 1408 (logo left edge to logout icon right edge). Page padding 0 32px.
- **Nav**: height 72, bottom 1px `--border-hover`. Left: logo (40px tall, mirrored `scaleX(-1)`), gap 32, bell (20px, red count badge 18px pill, mono 11px) and flag with `6/19` (mono 12 emerald), 1px x 32px rule, links gap 28 (14px/500). Selected "Team hub" emerald 600. "Sonar" is a filled emerald pill (padding 9px 20px, text `--bg-deep`). Right: person-circle and gear-fill emerald, box-arrow-right `--negative`, 22px, gap 24.
- **Body grid**: `176px 1px 1fr`, column-gap 32 (64px between sidebar and main, 32px clear each side of the rule). Rule is a 1px `--border-hover` column, full height.
- **Sidebar** (existing Team Hub): profile (40px avatar circle `--emerald-bg-hover`, mono initials emerald; name 14/600; role 12/600 emerald), 1px rule, 17 items, 40px tall, 14px, icon 12px gap, counts mono 12 muted right. Active "Recognition" emerald 600.
- **KPI strip** (main top, padding-top 28, bottom 28 + 1px `--border-hover`): flex, space-between, gap 64.
  - Left: 5 metrics, gap 24 with 1px rules between (24px clear). Label 12/500 `--text-faint`; value JetBrains Mono 18/500 `--text-primary` (top mover `--positive`, last recompute 16px).
  - Right (right-aligned, gap 10): actions row gap 20 (Recompute ratings, Auto-award, Weights as text buttons 14/500; Award solid emerald, radius `--radius-md`, padding 9px 20px); analyst note 12px faint; "Sample content" label + "Show council data" + On/Off text toggle.
- **Three columns**: grid `330fr 1px 440fr 1px 236fr`, column-gap 32 (64 between sections, 32 clear of each rule). Each column padding-top 32, sections gap 32, sections separated by 1px `--border-hover` with 32px padding below.
  - Left: Latest recognition (cols `1fr 50 50 30 42 32`), Rankings (list tabs, period tabs, cols `16 1fr 54 48 84`), Term honour roll (`16 1fr 84 44`), States (examples).
  - Centre: scorecard head (48px avatar, name 22/700, provisional amber with star icon, role line, tier/percentiles with rules, Ezana rating mono 40/600 right), Rating history (SVG 452x210), How the rating is worked out (13px, lh 1.65), Rating breakdown (`120 92 1fr 28`, 8px bars, no radius, track `--emerald-bg`, fill `--emerald`, Learning reads "pending" with no bar), Pitch impact log (`40 1fr 72 34 50 50 60 40`), Calibration (SVG 452x230, dashed ideal y = x), Badges and awards (`1fr 82 30 42 120 34`, pitch ticker is an emerald link, N/A when missing).
  - Right: Awards by sector team (`20 1fr 80`), Rating method (5 bullets, bold lead-ins), Manager notes (label/value rows), States (examples).
- **Wireframe notes** footer: margin-top 64, 1px top rule, 3 columns with rules.
- **Award dialog**: overlay `--bg-overlay` over the whole page; dialog 520px wide, top 200px, centred, `--bg-primary`, padding 32, gap 24, no border/shadow/radius. Fields: Recipient and Period (two columns, selector text + chevron-down), Badge type (text options, selected emerald), Title (follows badge type), Reason (textarea), Gold award (check-square icon in gold), footer right: Cancel (text) and Award badge (solid emerald).

## Tables

Header row 11/500 `--text-faint`, sentence case, 8px bottom padding, 1px `--border-primary`. Body rows 12px `--text-secondary`, padding 9 to 10px, 1px `--border-primary` divider. Numbers, dates, periods and tickers in JetBrains Mono (`tabular-nums`), right-aligned when numeric. Gains `--positive`, losses `--negative`, gold awards `--gold`. Selected member row (Selam Haile) emerald 600.

## Typography

Plus Jakarta Sans for text; JetBrains Mono for every number, date and ticker. Section titles 20/600 (left/right columns) and 18/600 (scorecard subsections), letter-spacing -0.01em, `--text-primary`. Body 13 to 14px. No all-caps.

## Design tokens used

- Surface: `--bg-primary` (#0a0e13 / #ffffff), `--bg-deep` (text on emerald), `--bg-overlay`.
- Text: `--text-primary` #f0f6fc, `--text-secondary` #e2e8f0, `--text-muted` #8b949e, `--text-faint` #6b7280 (light: #0f172a, #1e293b, #64748b, #94a3b8).
- Brand/semantic: `--emerald` #10b981 (light #059669), `--emerald-hover`, `--emerald-deep` (button hover), `--emerald-bg`, `--emerald-bg-hover`, `--positive`, `--negative` #ef4444 (light #dc2626), `--warning` #fbbf24 (light #d97706), `--gold` #d4a853 (light #b8922f).
- Lines: `--border-hover` (section and column rules), `--border-primary` (row dividers), `--chart-line`, `--chart-fill-start`, `--chart-fill-end`, `--chart-axis`.
- Radius: `--radius-md` (primary buttons), `--radius-pill` (Sonar, notification count). Nothing else is rounded except avatars.
- Spacing: 4-base scale; 64 between side-by-side sections, 32 between stacked sections, 24 inside KPI groups.

## Icons (Bootstrap Icons 1.11.3)

Nav: building, search, graph-up, broadcast, bookmark, mortarboard, chevron-down, bell, flag, person-circle, gear-fill, box-arrow-right. Sidebar: speedometer2, bank, graph-up, clipboard-check, diagram-3, easel, archive, broadcast, camera-video, trophy, bar-chart, award, list-ol, people, shield-check, file-earmark-text, key. Badges: Analyst of the Month trophy, Best Call bullseye, Most Accurate crosshair, Rising Star star, Clutch Contributor lightning-charge, Best Deep Dive search. States: arrow-repeat (loading), file-earmark (empty), exclamation-triangle (error, `--negative`). Misc: arrow-right, star (provisional), x-lg, check-square / square.

## States and interactions

- Ranking list tabs (Top movers, All members, Vice presidents, Portfolio managers, Analysts, Quant traders), ranking periods and rating-history periods (30D, QTD, YTD): text only, selected emerald 600, others muted 500. No underline, pill or track.
- Show council data: On/Off text toggle (on = emerald). Off should swap sample content for the council's data source.
- Award button opens the dialog; Cancel, close and Award badge close it. Badge type selection updates Title. Gold award toggles; gold awards render in `--gold` with "Gold" type.
- Analyst view (`analystView`): hides Recompute ratings, Auto-award, Weights and Award; page is read only.
- Text buttons hover to emerald; primary hovers to `--emerald-deep`.
- Loading / empty / error examples are shown in both outer columns; Retry is an emerald text button.
- Data needed: recognition feed, rankings by list and period, term honour roll, member scorecard (rating series, breakdown, resolved theses, calibration points, awards), awards by sector, manager notes, recompute status.

## Assets

- Logo: the brief calls for the Walia ibex mark; the design system only ships the pegasus (`assets/ezana-nav-logo.png`), used here as a stand-in. Swap in the ibex asset from the codebase.

## Audit against the Ezana branding and UI guide

1. Replaced Ria Kapoor, Jordan Vale and Prof. Mehta with Priya Raman, Tomas Alvarez and Daniel Park; all people come from one nine-member council.
2. Rated members 24/26 to 8/9; provisional members 3/26 to 3/9; auto-award coverage 38 members to 8 members.
3. Badge types limited to Analyst of the Month, Best Call, Most Accurate, Rising Star, Clutch Contributor, Best Deep Dive (Best Pitch to Best Call, Collaboration to Analyst of the Month, Research Impact to Best Deep Dive, Execution to Clutch Contributor).
4. Latest recognition row 1 recipient set to Selam Haile so it matches her scorecard awards.
5. Letter tiers (A, B) replaced with Senior Analyst and Analyst; "Evaluated as Analyst" to "Evaluated as Senior Analyst".
6. "Bench return" renamed "Market return" and a note added that excess return is versus the broad market.
7. Tab labels in sentence case (Vice presidents, Portfolio managers, Quant traders); all-caps KPI labels, table headers, eyebrows and "EXECUTIVE"/"PROVISIONAL" converted to sentence case; nav and sidebar labels to sentence case (Team hub, Learning center, Command center, etc.).
8. Abbreviations expanded: "Council pctl" to "Council percentile", "All funds pctl" to "All funds percentile", "Δ rating" to "Change", "Title & reason" to "Title and reason".
9. Missing pitch ticker "—" replaced with N/A; em dashes removed throughout.
10. Calibration axis labels and +10%/+20% values signed; all percentages and deltas signed.
11. Every number, date, period and ticker set in JetBrains Mono (KPIs, counts, chart axes, inline numbers in copy).
12. Toggle switch with track replaced by an On/Off text toggle with emerald selected.
13. Period and list tabs: no underline or background; selected state is emerald text only.
14. Initials avatars removed from table rows (no filled chips); kept only for the profile and scorecard head.
15. Team hub nav item changed from purple to emerald (selected state); Sonar kept as filled emerald pill; logout kept red.
16. Award-type icons: amber and gold accent icons limited to gold awards; other badge icons muted.
17. Icons mapped to Bootstrap Icons only.
18. Spacing: 64px between side-by-side sections, 32px clear beside every vertical rule (min 24), 24px clear around KPI rules; content aligned to x = 32 and x = 1408.
19. "Sample content" control moved from the KPI row into the action column because six KPIs plus actions do not fit at 1440px with the required spacing.
20. All colors from design-system tokens; light-mode gold set to the system's darker gold (#b8922f) for contrast on white.
21. Dialog built flat: no border, shadow or radius; borderless fields; one primary button.
