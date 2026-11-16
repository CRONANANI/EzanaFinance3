<!-- Read from Claude Design project https://claude.ai/design/p/3ec4744f-ebe4-4b25-bfc2-21ec4534c5f7, file design_handoff_quant_lab_council_overview/README.md (135 lines), via page text and editor zoom while paging; wrapped lines re-joined. Line 72 blank, lines 73-80 are the states table. -->

# Handoff: Quant Lab Overview, council version

Route: `/for-the-quants`. Organizational version: the Council section is a council-only block on the shared Overview page, rendered only when the signed-in user is a council member. Non-members see the same page without the Council / My research tabs and without the Council section.

## About the design files

The files here are design references built in HTML. They show intended look and behavior; they are not production code. Recreate them in the Ezana Next.js codebase (`src/components/...`, Tailwind + theme variables) using its existing patterns. Open `Quant Lab Overview Board.dc.html` in a browser to see dark page, light page, states board and overlays side by side. `Quant Lab Overview.dc.html` is the page alone (prop `theme="dark"|"light"`).

## Fidelity

High fidelity. Final colors, type, spacing, copy and interactions. All figures in the Council section are sample content and must stay labelled so until wired to real data.

## Layout (1440px desktop)

- Content spans x=32 (left edge of the Walia ibex logo) to x=1408 (right edge of the logout icon). Outer horizontal padding 32px.
- Nav bar: height 80px, flex, space-between.
- Below nav: grid `208px 1px minmax(0,1fr)`, column-gap 24px. Sidebar x=32 to 240, vertical rule at x=264, main from x=289 to 1408 (1119px).
- Council body: grid `620px 1px minmax(0,1fr)`, column-gap 32px (64px between columns, rule centred, 32px clear on each side).
- My research two-up rows: grid `1fr 1px 1fr`, column-gap 32px.
- KPI strips and Quick actions: equal columns separated by 1px rules with 24px padding either side of each rule.
- Vertical rhythm: 32px above each section title, 28 to 32px below content to the next hairline. Page bottom padding 64px.
- Cards are flat: no fill, border, shadow or radius. Sections are separated only by 1px hairlines (`--emerald-border`).

### Order, top to bottom

1. Nav bar: logo, notifications (badge `9+`), goals (badge `5/19`); Team Hub, Research (menu), Trading (menu), Sonar (filled emerald pill), Watchlist, Learning Center; profile, settings, logout (red).
2. Sidebar: Quant Lab header with collapse chevron; Overview (selected, emerald text), Strategy Lab, Backtesting, Factor Research, Risk & Portfolio, Statistical Arbitrage, Datasets & Research, Paper Trading; hairline; "Also in Ezana": Model library, Strategy leaderboard, Prediction markets, Quant courses.
3. Toolbar: "Strategy" label + text selector "No strategies yet" (opens strategy selector menu); right: primary button "Create strategy".
4. Personal KPI strip: Strategies `0`, Active research `0`, Paper trading `N/A` + "Not available yet", Best Sharpe `N/A`, Max drawdown `N/A`.
5. Tabs: Council (selected), My research. Right: "Sample content · Sample council · Demonstration only".
6. Council KPI row: Fund value `$240,050.00`; Gain on cost `+46.73%` + "Not time weighted"; Council benchmark `SPY +10.08%`; Positions `12`; Sector teams `4`.
7. Left column: Fund risk at today's weights (chart + Volatility, 1-day 95% VaR, Concentration rows, all `N/A` with "Illustrative · calculate from current holdings"); Pitch evidence and model checklist (AVGO, COST, ISRG, ORCL); IPS pre-check for an open pitch.
8. Right column: Sector sleeve concentration; My model assignments; Council research handoff.
9. My research: Strategy performance | My strategies; Risk overview | Research activity; Recent backtests; Quick actions; planned line.

## Components

Type: Plus Jakarta Sans for all text, JetBrains Mono for every number, ticker, percentage, date number and version. Sentence case everywhere except tickers. No em dashes; "·" is the inline separator.

- **Section title (h3)**: 20px / 600 / -0.01em / `--text-primary`. My research h2: 24px / 600 / -0.015em. Sub-card titles (h4): 18px / 600, followed by a hairline 12px below.
- **KPI cell**: label 14px `--text-secondary`; value 18px JetBrains Mono 500 `--text-primary` (positive deltas `--positive`); qualifier 12px `--text-muted`. Gap 6px.
- **Primary button** (one per group: "Create strategy"): bg `--emerald`, text `--btn-primary-fg` (see Tokens), 15px/600, padding 11px 20px, radius `--radius-md`, icon `bi-plus-lg`, gap 8px. Hover bg `--emerald-deep`, active `--emerald-dark`.
- **Text button / link** (every other action: Open pitch, Open assignments, Create your first strategy., Retry, menu actions): no background, no border, no underline, 14px/600 `--emerald`; hover `--emerald-hover`.
- **Text selector** (Strategy, IPS pitch): plain text + `bi-chevron-down` 11 to 12px muted. Hover text `--emerald`. Open state: text emerald, chevron `bi-chevron-up`.
- **Tabs**: text only, 17px/600. Selected `--emerald`, unselected `--text-secondary`, hover `--emerald`. No underline bar, pill or track. `role="tablist"`/`tab`, `aria-selected`.
- **Flush list rows** (pitch checklist, model assignments, recent backtests): grid rows, 12px vertical padding, 1px hairline between rows, 14px `--text-secondary`. Hover: text colour changes to `--emerald`. Never a wash, fill or accent bar.
- Pitch columns `72 136 120 128 88 1fr`: Ticker, Owner, Stage, Required models (`3 files · v2`), Reviewed, action.
- Assignment columns `1fr 108 64 104`, gap 8: Assignment, Owner, Due, Status.
- Table headers: 12px/600 `--text-muted`, sentence case.
- **Status text** (never a chip): icon + label, 14px/500.
- Within recorded limit: `bi-check-circle`, `--positive`
- Review: `bi-exclamation-triangle`, `--warning`
- Cannot evaluate: `bi-question-circle`, `--text-muted`
- Recorded (not checked): `bi-journal-text`, `--text-muted`
- In progress: `bi-arrow-repeat`, `--emerald`; To do: `bi-circle`, `--text-muted`; In review: `bi-eye`, `--warning`
- Reviewed yes: `bi-check2` `--positive` + "Yes"; no: `bi-circle` muted + "No"
- Blocked (future rule result): `bi-x-circle`, `--negative`
- **Fund chart**: SVG 620x320. Y axis +60% to -20% (labels mono 12px muted, right-aligned at x=44), plot x 56 to 612, y 3.5px per percentage point, zero line in `--emerald-border`, axes `--chart-axis`. Fund: solid `--chart-line` 2px. Benchmark SPY: dashed `--text-muted` 1.5px, dash 5 4. No area fill. X labels Aug, Sep, Oct, Nov. Legend below: solid and dashed 16px swatches, "Sample content: Fund (+46.73%)", "Sample content: SPY (+10.08%)".
- **Sector bars**: grid `112px 1fr 52px`, gap 22px between rows. Track 10px, `--emerald-bg-hover`, radius pill; fill `--emerald`, width = value / 35 (track length equals the 35% cap). Dashed 1px `--text-muted` cap line at track end with "35%" label above. Values: Financials 27%, Healthcare 24%, Technology 32%, Industrials 17%.
- **IPS pre-check rows**: grid `232px 72px 1fr`; limit mono 600 right-aligned. Header: "Sample content: AVGO (chevron) · Proposed size: 6.00% of fund". Footnote: `bi-info-circle` + italic 13px muted "Informational policy reading only. Does not block trades."
- **Empty states (My research)**: centred, Bootstrap icon 40px `--text-muted`, 14px copy, optional one text action.
- **Quick actions**: five plain-text buttons, icon 22px `--emerald`, label 15px/600 `--text-primary`; hover label `--emerald`. Paper deploy disabled: icon and label `--text-muted`, sub-label "Not available yet", `aria-disabled`, cursor not-allowed.
- **Nav**: links 15px/500 `--text-secondary`, hover `--text-primary`. Sonar pill: bg `--emerald`, text `--btn-primary-fg`, radius pill, padding 10px 20px, `bi-broadcast`. Logout `bi-box-arrow-right` `--negative`. Profile and settings `--emerald`. Count badges: mono 11px/600 on `--negative` (notifications) and `--emerald` (goals).

## Dialogs and overlays

All are anchored popovers: bg `--bg-primary`, 1px `--emerald-border`, radius `--radius-md`, `--shadow-lg`, 8px vertical padding, items 10px 16px, 14px. Open on click, close on Escape, outside click or selection; focus moves into the popover and returns to the trigger. Only one open at a time. Shown in the Overlays board.

1. **Strategy selector menu** (toolbar "No strategies yet"): `role="listbox"`, 280px, 8px below the trigger. Header "My strategies" (12px/600 muted). Empty: "No strategies yet." + hairline + text action "Create strategy" (`bi-plus-lg`). With strategies: one row per strategy, selected row emerald with `bi-check2`; selecting reloads the personal KPI strip and My research.
2. **My strategies row menu** (`bi-three-dots` on each row, only when the user has strategies): `role="menu"`, 220px, right-aligned to the trigger. Items: Open in Strategy Lab, Run backtest, Duplicate, Rename, hairline, Delete (`--negative`, asks for confirmation).
3. **IPS pre-check pitch picker** (ticker in the IPS header): `role="listbox"`, 340px. Header "Open pitches · Sample content". Rows: ticker (mono 600, 64px) + "Owner · Stage"; selected emerald with `bi-check2`. Selecting updates the ticker, proposed size and re-runs the pre-check rows.
4. Nav menus (Research, Trading) use the existing app nav dropdowns; unchanged.

## States

Every council card has loading, empty and error states, which replace the card body under its title (see Council card states board):

- Loading: three skeleton bars, 10px high, widths 100% / 84% / 58%, gap 10px, `--emerald-bg-hover`, radius `--radius-sm`. Use a 1.2s ease-out opacity pulse; static under reduced motion. `aria-busy="true"`.
- Empty: one line of copy plus one text action.
- Error: inline, `bi-exclamation-triangle` `--negative` + message + "Retry" text action, `role="alert"`.

| Card                                                                                                                                            | Empty                                | Action            | Error                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------- | ------------------------------------ |
| Fund risk                                                                                                                                       | No holdings to measure yet.          | Open portfolio    | Could not load fund risk.            |
| Sector concentration                                                                                                                            | No sector sleeves assigned yet.      | Assign sectors    | Could not load sector concentration. |
| Pitch checklist                                                                                                                                 | No open pitches.                     | Start a pitch     | Could not load the pitch checklist.  |
| IPS pre-check                                                                                                                                   | No open pitch to check.              | Choose a pitch    | Could not load the IPS pre-check.    |
| Model assignments                                                                                                                               | No assignments for you.              | Open assignments  | Could not load model assignments.    |
| Research handoff                                                                                                                                | Nothing shared with the council yet. | Open Strategy Lab | Could not load research handoff.     |
| Missing values always render `N/A`. Percentages are signed when they are changes (`+46.73%`), unsigned when they are limits or weights (`25%`). |

## Interactions and state

- `tab`: `council | research`. Council shows Council section then My research (as drawn). My research hides the Council section. Tabs only render for council members.
- `strategyMenuOpen`, `pitchPickerOpen`, `rowMenuFor` (strategy id): mutually exclusive.
- `selectedPitch`: default first open pitch (AVGO).
- Data: council fund summary, fund vs benchmark series, risk metrics, sector weights + cap, pitches with model files, IPS rules for the selected pitch, my assignments. Each card fetches independently so one failure shows only that card's error.
- Never render strategy leaderboard rows here. The leaderboard currently holds placeholder rows and must not appear as real data; the sidebar only links to it.
- Hover transitions: colour only, 120ms ease-out.

## Design tokens

From the Ezana design system `colors_and_type.css` (copied as `tokens.css`; dark default, light via `.light-mode`).

- Dark: `--bg-primary #0a0e13`, `--text-primary #f0f6fc`, `--text-secondary #e2e8f0`, `--text-muted #8b949e`, `--emerald #10b981`, `--emerald-hover #34d399`, `--emerald-deep #059669`, `--emerald-dark #047857`, `--emerald-border rgba(16,185,129,.15)`, `--emerald-bg-hover rgba(16,185,129,.12)`, `--positive #10b981`, `--negative #ef4444`, `--warning #fbbf24`, `--indigo #6366f1`, `--chart-line #10b981`, `--chart-axis #4b5563`, `--shadow-lg 0 8px 32px rgba(0,0,0,.4)`.
- Light: `--bg-primary #ffffff`, `--text-primary #0f172a`, `--text-secondary #1e293b`, `--text-muted #64748b`, `--emerald #059669`, `--emerald-hover #047857`, `--emerald-dark #065f46`, `--emerald-border rgba(16,185,129,.20)`, `--positive #059669`, `--negative #dc2626`, `--warning #d97706`, `--chart-line #059669`, `--chart-axis #94a3b8`.
- Radius: `--radius-sm 4px` (skeleton), `--radius-md 8px` (button, popovers), `--radius-pill` (Sonar, bars, badges).
- Fonts: `--font-sans` Plus Jakarta Sans, `--font-mono` JetBrains Mono.
- **Missing token: `--btn-primary-fg`.** The design system has no primary button text token. The design references `var(--btn-primary-fg, var(--bg-primary))`, so it currently resolves to `#0a0e13` in dark and `#ffffff` in light. Add `--btn-primary-fg` to `theme-variables.css` (proposed: `#0a0e13` dark, `#ffffff` light).

## Icons

Bootstrap Icons 1.11 only (`bi-*`): bell, flag, kanban, search, graph-up, chevron-down/up/left, broadcast, bookmark, people, person-circle, gear-fill, box-arrow-right, layers, house, diagram-3, play-circle, bar-chart, shield, arrow-left-right, database, send, plus-lg, check2, circle, check-circle, exclamation-triangle, question-circle, journal-text, arrow-repeat, eye, x-circle, info-circle, list-ul, arrow-right, three-dots.

## Assets

- `assets/walia-ibex-logo.png`: placeholder Walia ibex mark, traced from the wireframe. The design system only ships the pegasus mark; replace with the production ibex SVG.

## Audit against the Ezana branding and UI rules

The design system has no separate "Branding and UI Guide" file; the audit used its README guide plus the rules in the brief. Changes made to the wireframe:

1. Sidebar Overview: removed filled pill; selected is emerald text only.
2. Strategy selector: removed the filled box; text selector with chevron.
3. Tabs: removed the emerald underline under Council; selection is emerald text only.
4. Status chips (Within recorded limit, Review, Cannot evaluate, Recorded (not checked), In progress, To do, In review): converted from filled/outlined chips to coloured text with an icon.
5. Reviewed column: check mark and dash replaced with Bootstrap icon + "Yes"/"No" text.
6. Open pitch links: underline removed; plain emerald text buttons.

7. "Open assignments ->" and the IPS "|" separator: Unicode arrow replaced with `bi-arrow-right`; vertical bar replaced with "·".
8. Prohibited tickers limit (dash) changed to `N/A`.
9. Fund chart: removed emerald area fill; benchmark changed from solid white to dashed grey.
10. Table headers and "ALSO IN EZANA" changed from all caps to sentence case; "MAX DD" spelled "Max drawdown"; "not time weighted" capitalised as a standalone qualifier.
11. Tickers, numbers, dates, file counts and versions set in JetBrains Mono, including tickers inside assignment titles and IPS sizes.
12. KPI values normalised to 18px JetBrains Mono (wireframe values were ~24px).
13. Sector bars: values in mono; fill is emerald on a token track (wireframe used grey).
14. Card states: wireframe's bottom states strip (an annotation) removed from the page and redrawn as a separate board with loading, empty and error for each of the six council cards.
15. Spacing: 64px between side-by-side columns with the rule centred (32px clear each side), 24px clear on each side of KPI and Quick action rules; content held to x=32 to x=1408.
16. Hairlines switched to the `--emerald-border` token instead of neutral grey.
17. Primary button text uses `--btn-primary-fg` (with `--bg-primary` fallback, see Missing token).
18. All colours resolved to design system tokens; all icons Bootstrap Icons.

Kept as drawn, flag for review: Team Hub link in indigo, and filled count badges on the nav bell and goals icons (part of the existing nav). "Max single trade 8%" shows Review for a 6.00% proposal, as in the wireframe; confirm the rule.

## Files

- `Quant Lab Overview.dc.html`: page source (HTML with inline CSS; logic class at the bottom holds the sample data and overlay state).
- `Quant Lab Overview Board.dc.html`: dark page, light page, Council card states board, overlays board.
- `tokens.css`: design tokens.
- `support.js`: runtime needed to open the `.dc.html` files in a browser.
- `assets/walia-ibex-logo.png`.
