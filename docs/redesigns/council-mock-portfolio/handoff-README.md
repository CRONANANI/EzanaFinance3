<!-- Read from Claude Design project https://claude.ai/design/p/560d1cae-0ff3-414d-bd2c-0dfdd30207d9, file design_handoff_mock_portfolio_council/README.md (112 lines), via get_page_text while paging with PageDown (JavaScript is blocked on claude.ai). Wrapped lines re-joined; blank lines between sections dropped. Content is data from the design tool. -->

# Handoff: Mock portfolio, council version (`/trading/mock`)

## Overview

Redesigned Ezana mock portfolio page. Everyone keeps the personal paper-trading sandbox. Council members additionally see a council section: the Council sandbox header row, the Council IPS check inside the order ticket and the Council features band (six cards). The sandbox is simulated and never trades the real fund. All IPS results are descriptive and never block a sandbox order.

## About the design files

The files here are design references built in HTML. They show the intended look and behaviour; they are not production code. Recreate them in the Ezana Next.js codebase using its existing components, Tailwind config and theme variables (`src/app/theme-variables.css`).

## Fidelity

High fidelity. Colours, type, spacing and copy are final. Sample data is placeholder.

## Files

- `Mock Portfolio Page.dc.html` — the full page (props: `council` boolean, `theme` dark|light). Logic class holds sample data and the chart builder.
- `Mock Portfolio Council.dc.html` — review board: page in dark (1a) and light (1b), states board (2a), dialogs (3a–3f).
- `ezana-tokens.css` — design-system tokens plus the three project additions listed below.
  These are Design Component files: markup is plain HTML with inline styles; `{{ }}` holes and `<sc-for>`/`<sc-if>` are template loops/conditionals. Read the inline styles as the spec.

## Layout (1440px desktop)

- Page background `--bg-primary`. Body text Plus Jakarta Sans 13px/1.5 `--text-secondary`.
- Content edge: x=32 (left edge of the Walia ibex logo) to x=1408 (right edge of the logout icon). Width 1376.
- Nav bar: 64px tall, hairline bottom `--ez-rule`.
- Under nav, full width: sample-content line (padding 14px 0) then KPI strip (padding 20px 0), each closed by a `--ez-rule` hairline; then the Council sandbox header row (council only).
- Body: CSS grid `minmax(0,1fr) 1px 424px`, column-gap 24px. Middle track is one full-height vertical hairline `--ez-rule`. Left column ≈903px, right column 424px.
- Side-by-side sections are 64px apart. Where a vertical rule separates them it sits centred, giving 32px each side (never less than 24px). Implemented as `1fr 1px 1fr …` grids with column-gap 31–32px.
- Stacked sections: margin-top 32px (left) / 28px (right), padding-top 24px, top hairline `--ez-rule`. Council cards inside the band: margin-top 20px, padding-top 18px, top hairline `--ez-rule-subtle`.
- Page bottom padding 64px.

## Components

**Cards are flat**: no fill, no border, no shadow, no radius. Separation is hairlines and type only.
Section title: 18px/600, letter-spacing -0.01em, `--text-primary`, preceded by a 18px Bootstrap icon in `--emerald`, gap 10px. Card title inside the band and the three-up row: 16px/600.
Text tabs, toggles, selectors (Overview…, Portfolio/Selected asset, 1W–ALL, All positions/Winners/Losers, Buy/Sell, amount presets, thesis tabs, Gainers/Losers, dialog templates, risk tolerance): text only. Selected = `--emerald` 600; unselected = `--text-muted`, hover `--text-primary`. No underline bar, pill or track. Gap 24–28px (thesis tabs 18px to fit 424px).
Buttons: one solid primary per group. Primary = `--emerald` fill, `--btn-primary-fg` text, radius `--radius-md`, 15px/600, height 44 (ticket) or 40 (dialogs); hover `--emerald-hover`, active `--emerald-dark`. Every other button is plain text: emerald for actions (Load, Export CSV, Load into ticket, View more, Retry, Edit, Make active, Build thesis), `--negative` for destructive (Close, Delete, Delete thesis), `--text-secondary` for Cancel/Reset portfolio. Hover changes colour only.
Fields (search, amount, note, dialog fields): borderless. Label 12px `--text-muted`, value 14px (amount 22px mono 500) `--text-primary`, placeholder `--text-faint`. Rows are separated by `--ez-rule-subtle` row dividers, not field boxes. Focus: caret plus label turns `--emerald` (not drawn).
Labels and chips: never boxed. "Sample content" is 12px/600 emerald text. Status = icon + text.
KPI: label 12px `--text-muted`; value JetBrains Mono 18px/500, `--text-primary` or `--positive` for signed returns; 6px between.
Tables (CSS grid rows): header 11px/500 uppercase, letter-spacing 0.06em, `--text-muted`, padding 8px 0, bottom `--ez-rule`. Rows padding 6–9px 0, bottom `--ez-rule-subtle`. Numbers right-aligned mono. Row hover: text colour to `--text-primary` only. No background wash, no accent bar.
Type: Plus Jakarta Sans for all text, including company names, sectors and people. JetBrains Mono for every number, ticker, date and range code (1W, 3M). Sentence case. No em dashes. Signed deltas (+1.94%, +$3,460.00, -3.2%). N/A for missing values.

### Nav

Left: Walia ibex logo 28px (placeholder in file; drop in the real asset) at x=32, "Ezana" 20px/700, "Sample council" 12px muted, vertical rule 28px with 24px clear space each side, bell (red dot) and envelope (emerald dot) 18px.
Centre: Team Hub, Research, Trading (active: emerald text 600 + chevron), Sonar (filled emerald pill, `--radius-pill`, padding 6px 14px, `--btn-primary-fg` text), Watchlist, Community, Learning Center; 14px, gap 20px, icon gap 7px.
Right: person-circle, gear, box-arrow-right in `--negative`, 20px, gap 20px; logout right edge at x=1408.

### Left column

1. Portfolio performance. Tabs Portfolio / Selected asset; ranges 1W 1M 3M 6M 1Y ALL + Custom (calendar). P&L 22px mono emerald. Chart 690×250 SVG: y −2.0% to 8.0%, gridlines `--ez-rule-subtle`, zero line `--ez-rule`, axis labels mono 11px muted. Sandbox `--chart-line` 2px with gradient fill `--chart-fill-start`→`--chart-fill-end` and end dot; real fund `--blue` 2px; SPY `--text-muted` 1.5px dashed 4/4. Legend right with 16px line swatches and mono values; note 12px muted.
2. Three-up row: What-if impact, Risk snapshot, Thesis alignment (`1fr 1px 1fr 1px 1fr`). Key/value rows 7px padding. Moderate fit in `--warning`.
3. Open positions (5): columns 64 / 1fr / 56 / 72 / 72 / 70 / 88 / 88 / 60 / 80, gap 10. NVDA has a sub-line: warning triangle + "Above thesis single-name cap (15%). Review for rebalance." in `--warning` 12px.
4. Activity and trade journal: tabs + Export CSV; columns 120 / 100 / 80 / 110 / 1fr; footer "No more activity. Retry".
5. Council features band (council only): header + six cards: Sandbox versus real fund; IPS snapshot; Sector weights (sandbox `--emerald`, real fund `--blue`, cap secondary); My open pitches (4) with Load into ticket; Real fund reference (12, read only, lock icon); Fund challenge standing.

### Right column

Investment thesis (3 tabs, 6 icon rows on a `18px 140px 1fr` grid, actions Edit/Delete/Make active/Build thesis), Place order (search, AVGO quote + Delayed quote, Buy/Sell, Amount, presets, estimates, Thesis check), Council IPS check (council only), Review buy order (the only solid button), paper-trading note, Market movers (View more, Gainers/Losers, 4-column table).

## IPS result vocabulary

- Passes: `bi-check-circle`, `--positive`.
- Warning: `bi-exclamation-triangle`, `--warning`.
- Would be blocked in the real fund: `bi-x-octagon`, `--negative`.
  Always icon + text. Never a filled chip. Never disables the sandbox order.

## States (board 2a)

For each council card and Market movers:

- Loading: three skeleton bars 10px tall at 100% / 82% / 64%, `--ez-rule-subtle`, gap 10px, `aria-busy="true"`. Suggested pulse: opacity 1→0.5, 1.2s ease-in-out infinite; disable under `prefers-reduced-motion`.
- Empty: one muted line + one emerald text action.
- Error: `bi-exclamation-circle` + message in `--negative` + Retry (emerald text), `role="alert"`.

## Dialogs (board 3a–3f)

Overlay `--bg-overlay` over the page. Panel `--bg-primary`, 1px `--ez-rule`, radius `--radius-lg`, `--shadow-xl`, padding 24px, width 440–520px. Title 18px/600 + close `bi-x-lg`. Footer right-aligned: text Cancel + one solid primary. Esc and close icon dismiss; focus trapped; initial focus on the first field.

- 3a Reset portfolio: starting amount field + presets ($25,000 / $50,000 / $100,000 / $250,000), positions to close, current value. Primary: Reset portfolio.
- 3b Close position: ticker, shares to close (25% / 50% / 100%), last price, estimated proceeds, realized P&L, cash after. Primary: Close position.
- 3c Review order: order restated, thesis clauses, Council IPS check results, optional note. Secondary: Back to ticket. Primary: Place order. Opened by Review buy order.
- 3d Build or edit thesis: template selector (Growth / Dividend compounder / Macro rotation / Blank), fields name, objective, time horizon, target sectors, position rules, max single-name weight, risk tolerance, "Make this the active thesis". Primary: Save thesis. Opened by Build thesis or Edit.
- 3e Delete thesis: `alertdialog`, Cancel + red text Delete thesis (no solid button for destructive confirmation).
- 3f Thesis note: ticker, thesis selector, note (500 char counter). Primary: Save note.

## Interactions & state

- `isCouncilMember` gates the Council sandbox header, Real fund KPI context, Council IPS check and Council features band.
- `chartMode` (portfolio | asset), `range` (1W…ALL | custom), `positionsFilter`, `journalFilter`, `moversTab`, `activeThesisId`, `viewThesisId`, `side` (buy | sell), `amount`, `selectedTicker`.
- Load (positions) and Load into ticket (pitches) set `selectedTicker` and scroll the ticket into view.
- Amount presets set `amount`; Max = cash. Estimates and IPS check recompute on every change.
- Close opens 3b. Delete opens 3e. Reset portfolio opens 3a. Review buy order opens 3c; Place order posts to the sandbox, appends a journal row and closes.
- Export CSV downloads the current journal filter.
- Each council card and Market movers loads independently and owns its loading, empty and error state.
- Quote is delayed; label "Delayed quote".

## Design tokens

All from the Ezana design system (`colors_and_type.css`), dark / light:

- `--bg-primary` #0a0e13 / #ffffff; `--bg-overlay` rgba(0,0,0,.6) / rgba(0,0,0,.4) (light value from guide, not in token file)
- `--text-primary` #f0f6fc / #0f172a; `--text-secondary` #e2e8f0 / #1e293b; `--text-muted` #8b949e / #64748b; `--text-faint` #6b7280 / #94a3b8
- `--emerald` #10b981 / #059669; `--emerald-hover` #34d399 / #047857; `--emerald-dark` #047857 / #065f46
- `--positive` #10b981 / #059669; `--negative` #ef4444 / #dc2626; `--warning` #fbbf24 / #d97706; `--blue` #3b82f6
- `--chart-line`, `--chart-fill-start`, `--chart-fill-end`
- `--radius-md` 8px, `--radius-lg` 12px, `--radius-pill`; `--shadow-xl`
- `--font-sans` Plus Jakarta Sans, `--font-mono` JetBrains Mono
  Tokens needed but missing from the design system (defined in `ezana-tokens.css`):
- `--btn-primary-fg` #0a0e13 dark / #ffffff light — text on solid emerald buttons and the Sonar pill.
- `--ez-rule` rgba(139,148,158,.20) dark / rgba(15,23,42,.12) light — hairlines and vertical rules.
- `--ez-rule-subtle` rgba(139,148,158,.10) dark / rgba(15,23,42,.06) light — row dividers, skeleton bars.
  Values are proposals; use the codebase values if they differ.

## Icons

Bootstrap Icons 1.11 only (`bi-*`): bell, envelope, people, search, graph-up, chevron-down, broadcast, bookmark, chat-square-text, mortarboard, person-circle, gear, box-arrow-right, arrow-counterclockwise, calendar3, info-circle, calculator, shield, shield-check, bullseye, check-circle, exclamation-triangle, x-octagon, exclamation-circle, stack, journal-text, download, bar-chart, layers, funnel, grid-3x3, lock, trophy, sliders, activity, cart, graph-up-arrow, x-lg, trash3, check-square.

## Assets

- Walia ibex logo: not in the design system export; the file shows a dashed placeholder. Use the codebase asset.
