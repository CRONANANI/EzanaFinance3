<!-- Transcribed from Claude Design project 8b13fb0d-8c9f-4a07-8a0f-7b29008e0ef1, file design_handoff_us_equities_council/README.md (87 lines), read with get_page_text while paging the editor. Wrapped lines re-joined; blank lines restored. -->

# Handoff: US Equities, council view (/company-research)

## Overview

Organizational (council) version of the Ezana US Equities page. Members of a university student-managed investment fund see this on the same route as the retail page; council cards layer on top of the unchanged retail content. All figures are sample content for "Sample council".

## About the design files

`US Equities Council.dc.html` is a design reference built in HTML, not production code. Recreate it in the target codebase (the Ezana Next.js app, src/app/company-research) using its existing components, Tailwind config and theme variables. Open the file in a browser to inspect; it renders dark and light mode side by side.

## Fidelity

High fidelity. Colours, type, spacing and copy are final. Match pixel values below.

## Global layout (1440px desktop)

- Page: background var(--bg-primary), text var(--text-secondary), Plus Jakarta Sans 14px/1.5.
- Content edges: x=32 (left edge of the logo) to x=1408 (right edge of the logout icon). 1376px content width, 32px side padding.
- Side-by-side sections: 64px apart. When a vertical rule separates them, the rule (1px, var(--border-primary)) sits in the middle with 32px clear space each side (minimum 24px).
- Sections are flat: no fill, no border box, no shadow, no radius. Separation is by 1px horizontal rules (var(--border-primary)) and type hierarchy only.
- Main grid under the KPI strip: `grid-template-columns: 960px 1px 351px; gap: 32px` (main, rule, right rail). Below the coverage gaps card everything is full width (1376px).

## Sections, top to bottom

1. **Navigation bar** (72px, bottom rule). Left: logo 44px tall (mirrored scaleX(-1)), bell with "9+" in var(--negative) mono 12px, task icon with "5/19" in var(--emerald) mono 12px. Centre, 32px gaps, 15px/500: Team Hub, Research (active, emerald, chevron), Trading (chevron), Sonar (filled emerald pill, 40px tall, 20px side padding, radius-pill, text var(--bg-primary) 600), Watchlist, Learning Center. No Community link. Right, 24px gaps, 22px icons: profile (emerald), settings (text-primary), logout (var(--negative)).
2. **Search row** (20px vertical padding). Search icon 18px muted, borderless transparent input 15px, then text toggle Company / Industry / Portfolio (icons + labels, 28px gap; selected = emerald text, others muted; no pill, track or underline), filter icon (bi-sliders).
3. **Council KPI strip** (rules above and below, 16px padding, 24px gaps, vertical rules between groups): "Sample content" 16px/600 + rule + "Show council data" (emerald text button); caption "Sample data only, for demonstration within your council." Then Fund value $240,050.00, Gain on cost +46.73% (Not time-weighted), SPY +10.08% (Benchmark history), Positions 12, Teams 4. Labels 12px muted; **values JetBrains Mono 18px/600**; captions 12px faint.
4. **Company hero** (main column). NVIDIA mark (bi-nvidia 48px emerald), name 28px/700 -0.02em, meta row: NVDA mono 600, Nasdaq, Sector: Technology separated by 14px vertical rules with 24px gap. Right: text actions Heatmap, Add to watchlist, Send chart (14px/500, text-secondary, hover emerald). Body grid 270px + 626px, gap 64px.
   - Left: price $155.65 mono 40px/600; change -$7.21 -4.43% mono 14px negative with bi-arrow-down-right (no box); "Illustrative price as of Nov 16, 2026" 12px muted with emerald dot; metric rows (8px padding, top rules): P/E (TTM) 19.53, EPS (TTM) $7.97, Dividend yield 0.33%, Cap type Mega cap.
   - Right: -19.42% YTD (negative mono 13px), range selector 1D 1W 1M 3M 6M 1Y 3Y 5Y 10Y ALL Custom (mono 13px, 16px gap, selected emerald, others muted). Chart 626x212: dashed gridlines at $150/175/200/225/250 (var(--border-hover), dash 3 4), line var(--chart-line) 1.6px, area fill emerald 30% to 0% gradient, end label $155.65 emerald mono 13px (no box). Month labels Nov 25 to Nov 26, mono 11px faint.
5. **Tabs** Overview, Models, Valuation, Earnings, News, Peers: 15px/500, 40px gap, selected emerald text, no underline bar. Bottom rule.
6. **Council position and sleeve**: table (Holding, Shares, Cost / share, Latest price, Market value, Unrealized P&L, Team (sleeve)); rows NVDA 200 @ $121.40, $155.65, $31,130.00, +28.21%; MSFT 60 @ $310.00, $415.20, $24,912.00, +33.94%; AAPL 150 @ $150.00, $228.40, $34,260.00, +52.27%; total row Technology sleeve, 3 names, $65,380.00 cost, $90,302.00, +38.12%, 37.6% of fund.
7. **Coverage and research lineage**: "Open research library" link right. Columns Date, Version, Title, Author, Scope. Three rows (Amara Tesfaye, Selam Haile, Chidi Okoye).
8. **Pitch pipeline and decision history**: NVDA long thesis, Amara Tesfaye, Deep dive (emerald text, no pill), +28.0%, Updated Nov 12, 2026.
9. **IPS idea check | Contribution to fund** (two columns, rule between). IPS rows: Max single position, Max sector (Technology), Max trade, Min and max positions, Min market cap, Prohibited ticker or sector; results in var(--positive). Note with bi-info-circle: "Cash floor: recorded only, not checked. This is not a trading control or order blocking." Contribution: Return on cost (holding) +28.21%, Fund return (all positions) +46.73%, Contribution to fund return +4.19 pp, Weight in fund 13.0%, Coverage analyst Amara Tesfaye.
10. **Coverage gaps and stale names**: HON Honeywell Corp., Industrials, Uncovered (var(--warning) text, no pill), last coverage N/A, note "Held, not yet priced. Held at cost, value N/A."
11. **Right rail**: Council on this name (8 key/value rows, 13px, then Open pitch primary button + Open dossier text button, 32px apart), Analyst recommendations (8px stacked bar 96/3/1, legend, street-consensus avg. price target $205.00 +31.7%), Key metrics (3x3 grid), News and sentiment (source code in mono, no box; sentiment dot + label), Pins (count 2 in mono, no badge).
12. **Research workbench**: five items (DCF, 3 statement, GRPV growth, Earnings, Comps) with bi-play-fill emerald, minutes mono 12px faint, 20px vertical rules, 24px gaps.
13. **Industry research | Portfolio tools** (rule between). Portfolio tools has text selector "Input: Sample council fund" with chevron.
14. **Learning Center: fundamental analysis mastery**: four courses in a row, "View all courses" link.
15. **No-ticker view (illustrative)**: KPI context strip (same values), then heatmap (static YTD reference) | Industry view (borderless search, sector YTD table) | Portfolio view (input selector, metric table), columns `1fr 1px 236px 1px 220px`, gap 32px. Heatmap tiles use color-mix of var(--positive)/var(--negative) with var(--bg-primary) at 60% (strong) or 38% (mild); 2px gaps; no radius; sector labels as plain text above.
16. Executive perspective note + "Sample data only · No real-time quotes · No trading".
17. Company-level Loading / Empty / Error row.
18. **Council card states board** and **Dialogs** (documentation boards, not part of the live page).

## Components

- **Section title** 18px/600, -0.01em, text-primary. Description 13px muted.
- **Flush table**: header 12px/500 text-faint, 8px padding, bottom rule; rows 10px padding, bottom rule, 14px. Hover: text colour changes to var(--emerald) only. No background wash, no bar.
- **Primary button** (one per group): 44px tall, 24px side padding, radius var(--radius-md), background var(--emerald), hover var(--emerald-hover), text var(--bg-primary) 15px/600. See token note below.
- **Text button**: no background, no border. 15px/500 text-secondary (or emerald for links like View all, Retry), hover emerald.
- **Text toggle / tabs / range selector / selectors**: text only, selected var(--emerald), unselected muted. No underline, pill or track.
- **Inputs**: borderless, transparent, no underline; placeholder var(--text-faint).
- **Chips / status labels**: coloured text only (Deep dive emerald, Uncovered warning, sentiment dot + text).
- **Dialog**: overlay var(--bg-overlay); panel 440px, background var(--bg-primary), var(--shadow-xl), 24px padding, no radius, no border. Actions right-aligned: Cancel (text) then one primary.

## States (every council card)

Replace the card body under its title.

- Loading: two skeleton bars (12px at 85%, 10px at 50%) filled var(--emerald-bg-hover), no radius.
- Empty: one line, bi-info-circle muted + message + one emerald text action with bi-arrow-right.
- Error: bi-exclamation-circle var(--negative) + message + "Retry" emerald text button.

Copy per card is in the `states` array in the file (KPI strip, Council on this name, position and sleeve, research lineage, pitch history, IPS check, contribution, coverage gaps).

## Interactions

- Company / Industry / Portfolio toggle, range selector, tabs: click selects (emerald text). Range changes chart data; tabs switch the main column content.
- Add to watchlist opens the Add to watchlist dialog; Send chart opens Send to team. Esc / Cancel / close icon dismisses.
- Show council data switches sample content to the council's saved fund.
- Open pitch, Open dossier, Open research library, View all: navigate.
- Hover: text colour to emerald (rows, actions, nav). No transforms, no washes.

## State

mode ('Company'|'Industry'|'Portfolio'), range ('1Y' default), tab ('Overview'), dialog (null|'watchlist'|'send'), per-card status ('loading'|'ready'|'empty'|'error').

Data: council fund summary, holding for ticker, sleeve rows, research notes, pitch, IPS rules (only stored rules: max single position, max sector, max trade, min and max positions, min market cap, prohibited ticker or sector; cash floor is recorded but not checked), contribution, coverage gaps.

Never show: country, currency or asset-class figures for council holdings, council target prices or ratings, trade history, or another council's holdings.

## Design tokens (all from ezana-tokens.css)

Dark: --bg-primary #0a0e13, --text-primary #f0f6fc, --text-secondary #e2e8f0, --text-muted #8b949e, --text-faint #6b7280, --emerald #10b981, --emerald-hover #34d399, --emerald-bg-hover rgba(16,185,129,0.12), --border-primary rgba(16,185,129,0.08), --border-hover rgba(16,185,129,0.20), --positive #10b981, --negative #ef4444, --warning #fbbf24, --chart-line #10b981, --bg-overlay rgba(0,0,0,0.6), --shadow-xl 0 20px 60px rgba(0,0,0,0.45), --radius-md 8px, --radius-pill 9999px.

Light (.light-mode): --bg-primary #ffffff, --text-primary #0f172a, --text-secondary #1e293b, --text-muted #64748b, --text-faint #94a3b8, --emerald #059669, --emerald-hover #047857, --border-primary rgba(0,0,0,0.08), --border-hover rgba(16,185,129,0.25), --positive #059669, --negative #dc2626, --warning #d97706, --bg-overlay rgba(0,0,0,0.4) (not overridden in tokens file; dark value used).

Type: Plus Jakarta Sans for text; JetBrains Mono for every number, ticker and date. Sizes used: 11, 12, 13, 14, 15, 16, 18, 20, 28, 40px.

Spacing: 4-base (8, 12, 16, 20, 24, 32, 48, 64).

**Token note:** the design system has no primary button text token (no --primary-foreground or equivalent). The file uses var(--bg-primary) as a stand-in. In light mode that gives white on #059669 (about 3.8:1, below 4.5:1). Add a dedicated token, e.g. --text-on-emerald.

## Icons

Bootstrap Icons 1.11.3 only: bell, list-check, buildings, search, chevron-down, graph-up, broadcast, bookmark, mortarboard, person-circle, gear, box-arrow-right, building, grid-3x3, pie-chart, sliders, nvidia, grid-3x3-gap, plus-lg, send, arrow-down-right, circle-fill, arrow-right, info-circle, exclamation-circle, pin-angle, play-fill, x-lg.

## Assets

- assets/ezana-nav-logo.png from the Ezana Finance Design System. It is the pegasus mark; no Walia ibex logo exists in the design system. Swap in the ibex asset from the codebase.

## Files

- US Equities Council.dc.html: the design (template + logic class with all sample data).
- ezana-tokens.css: design-system tokens (light-mode selector extended to `.light-mode` on any element).
