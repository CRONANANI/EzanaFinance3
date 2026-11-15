<!-- Read from the Claude Design project editor (design_handoff_trading_page/README.md, 102 lines) on November 15, 2026.
     Lines 1 to 80 came from page text, lines 81 to 101 from a zoomed screenshot. Blank lines were re-inserted and wrapped lines re-joined by the Stage 2 agent.
     The two bullet characters before the bank digits are written here as two dots. -->

# Handoff: Ezana Trading page (/trading, retail)

## Overview

Redesigned brokerage account page. One account strip, three flat columns (Accounts, Positions + Orders, Order entry + Transfers), and a State examples strip. Dark mode is default; light mode uses the same markup under the `.light-mode` token scope.

## About the design files

The files here are **design references built in HTML**, not production code. Recreate them in the Ezana Next.js codebase using its existing patterns (Tailwind, `src/components/ui/*`, `theme-variables.css`). Do not ship the HTML directly.

## Fidelity

High fidelity. Colors, type, spacing and interactions are final. Sample data is placeholder.

## Global layout rules

- Page width 1440px. Content spans x=32 to x=1408 (1376px): 32px side padding. Bottom padding 96px.
- Sections are flat: no fill, border, shadow or radius. No cards, no card grid.
- Side-by-side sections are 64px apart. A vertical hairline sits centered in that 64px gutter (31.5px clear each side, minimum 24px).
- Hairlines: structural rules and table header rules `1px var(--border-hover)`; table row separators `1px var(--border-primary)`.
- Fonts: Plus Jakarta Sans for all text; JetBrains Mono for every number, ticker, account digit, date and timestamp.
- Sentence case. No em dashes. No arrow characters or arrow icons in links. Missing values render as `N/A`. Percentages and deltas are always signed. Never use the word "real-time".

## Screen: Trading

### 1. Navigation bar (height 80px, bottom hairline)

- Left (gap 28px): brand mark 44px tall (asset `ezana-nav-logo.png`, mirrored with `scaleX(-1)`; swap for the Walia ibex mark when that asset is available, same 44px height, left edge at x=32). Bell `bi-bell` 22px with red pill count `9+` (bg `--negative`, mono 11px/600). Upload tray `bi-upload` 22px with emerald pill `3/19` (bg `--emerald`, text `--bg-primary`).
- Center (gap 24px, 15px/500, `--text-secondary`): Dashboard `bi-grid`, Research `bi-search` + `bi-chevron-down` 11px, Trading `bi-graph-up-arrow` (active, `--emerald` text), Sonar `bi-broadcast` (filled pill: height 40, padding 0 16, bg `--emerald`, text `--bg-primary`, 600), Watchlist `bi-bookmark`, Community `bi-people`, Learning Center `bi-mortarboard`.
- Right (gap 28px, 24px icons): `bi-person-circle` emerald, `bi-gear-fill` emerald, `bi-box-arrow-right` `--negative` (logout; right edge at x=1408).

### 2. Account strip (padding 20px 0, bottom hairline, flex, gap 32px)

- "Brokerage account" 20px/700, letter-spacing -0.015em, `--text-primary`; marker `bi-circle-fill` 6px + "Sample content" 12px `--text-muted`.
- Vertical hairline (stretch).
- Four figures (flex 1, min-width 0, gap 24px). Label 11px/600 caps, tracking 0.06em, `--text-muted`. Value mono 18px `--text-primary`.
  - Equity `$147,562.48`, change mono 12px `--positive`: `+$2,318.75` `+1.60%`
  - Buying power `$52,417.20` · Cash `$18,204.35` · Open positions `5`
- Vertical hairline.
- Actions (right-aligned column, gap 10px): row gap 24px: primary button "Deposit funds" (height 38, padding 0 16, radius `--radius-md`, bg `--emerald`, text `--bg-primary` 14px/600, hover bg `--emerald-hover`), then text actions Withdraw, Link account, Mock trading (14px/500 `--text-secondary`, hover `--emerald`). Under it: "Last synced" 12px muted + mono `Jan 26, 2025 16:24 UTC`.

### 3. Three columns

`grid-template-columns: 264px 64px minmax(0,1fr) 64px 368px` (centre resolves to 616px), padding-top 32px. Tracks 2 and 4 hold 1px full-height rules.

Shared type: section title 24px/700 -0.015em `--text-primary`; sub-section 18px/600 -0.01em; minor title 16px/600; description 14px `--text-muted`; caption 13px `--text-muted`.

**Table spec:** `border-collapse: collapse; width:100%`. Header 11px/600 caps, tracking 0.06em, `--text-muted`, padding-bottom 10px, one `--border-hover` hairline. Header cells nowrap. Cells padding 14px 0 (12px in Transfers), 8px padding-left on every column after the first; numeric cells mono 12px, row hairline `--border-primary`. Numbers right-aligned, mono 13px `--text-secondary`; tickers mono 14px/600 `--text-primary`. Positive `--positive`, negative `--negative`.

**Left: Accounts**

- Ezana brokerage account; "Active" `--positive` 500; key/value grid (96px label column, row gap 6): Submitted `Jan 10, 2025`, Approved `Jan 13, 2025`, Account `EZB-****4827` (values mono `--text-primary`); caption "United States residents only".
- Hairline (margin 24px 0).
- Linked accounts, empty state: "No linked accounts yet", sentence, primary "Link account" (height 38, padding 0 24), caption "Home still has a shortcut to connect an outside account."
- Hairline.
- Institution directory + caption. Rows (grid 28px / 1fr / auto, gap 12, padding 10px 0): mono letter (16px/600 muted, no tile), name 14px/600, "United States" 13px muted, access label 13px muted. Charles Schwab / Trade-capable, Fidelity / Trade-capable, Vanguard / Read-only. Text link "Open connect dialog" 14px/600 emerald.

**Centre: Positions + Orders**

- Positions table: Symbol, Qty, Avg entry, Current, Market value, Cost basis, Unreal $, Unreal %, Today %. Six rows (AAPL, MSFT, NVDA, AMZN, JPM, SPY) + Total row (600 weight, `--border-hover` bottom rule, N/A for Avg entry and Current).
- Orders (margin-top 56px): text tabs All / Open / Closed (15px/600, gap 32; selected `--emerald`, others `--text-muted`; no underline, pill or track). Table: Symbol, Side (Buy positive, Sell negative), Type, Quantity / amount, Avg fill, Submitted (mono, nowrap), Status (padding-left 24, `--positive`), action column. Open order shows "Cancel" as plain `--negative` text.

**Right: Order entry + Transfers**

- Search: `bi-search` + borderless input "Search symbol or company", height 40.
- Market closed notice: `bi-circle-fill` 7px `--warning` + 13px text.
- Toggles row: Buy | Sell, 1px×24px rule (24px clear), Market | Limit. Same text-toggle styling as tabs.
- Fields, label 13px/500 `--text-secondary`, borderless mono 15px input height 36: Quantity (e.g. 10), Limit price (only when Limit selected), Dollar amount (e.g. 1,000.00), Time in force selector as text "Day" + `bi-chevron-down`.
- Hairline. Order summary (grid 160px/1fr): Action, Order type, Quantity, Estimated value (N/A when empty).
- Primary "Review order" full width, height 44, 15px/600. Note: `bi-info-circle` `--warning` + market closed sentence.
- Hairline. Transfers table: Date (mono 12), Direction, Amount (mono, right), Status (`--positive`), Bank ("Chase" + mono "..4821", right). Legal caption 12px/1.6 muted.

### 4. State examples (top hairline, padding-top 32)

Grid `1fr 64px 1fr 64px 1fr` with centered rules.

- Loading state: description + header row (Symbol, Qty, Avg entry, Current, Market value) and 5 skeleton rows: 12px pill bars, bg `--text-ghost` at 0.5 opacity.
- Empty state: "No linked accounts yet", sentence, primary "Link account".
- In review state: "Application received and in review", sentence, text link "Go to mock trading", hairline, `bi-info-circle` + email note.

## Interactions & behavior

- Orders tabs filter: All = every order, Open = status Open, Closed = everything else.
- Buy/Sell and Market/Limit are single-select; selection updates Order summary. Limit reveals Limit price.
- Quantity input mirrors into summary; Dollar amount formats to `$0,000.00` as Estimated value; empty shows N/A.
- Market closed: both notices visible when closed; hidden when open.
- Hover: text actions go `--emerald`; primary buttons go `--emerald-hover`. No transforms. Transitions 150ms ease-out.
- Cancel opens a confirm flow (not designed). Deposit/Withdraw/Link account open existing dialogs.
- Loading, empty and in-review states replace the respective live sections.

## State

`side: 'Buy'|'Sell'`, `orderType: 'Market'|'Limit'`, `ordersTab: 'All'|'Open'|'Closed'`, `qty`, `amount`, `limitPrice`, `marketOpen` (from market clock), plus fetched account, positions, orders, transfers, linked accounts, application status, `lastSyncedAt`.

## Design tokens (dark / light)

- `--bg-primary` #0a0e13 / #ffffff (page; also primary-button text)
- `--text-primary` #f0f6fc / #0f172a · `--text-secondary` #e2e8f0 / #1e293b · `--text-muted` #8b949e / #64748b · `--text-faint` #6b7280 / #94a3b8 · `--text-ghost` #4b5563 / #cbd5e1
- `--emerald` #10b981 / #059669 · `--emerald-hover` #34d399 / #047857
- `--positive` #10b981 / #059669 · `--negative` #ef4444 / #dc2626 · `--warning` #fbbf24 / #d97706
- `--border-primary` rgba(16,185,129,.08) / rgba(0,0,0,.08) · `--border-hover` rgba(16,185,129,.20) / rgba(16,185,129,.25)
- Radius: `--radius-md` 8px (buttons), `--radius-pill` (nav badges, Sonar, skeleton bars)
- Spacing used: 4, 8, 10, 12, 16, 20, 24, 32, 56, 64, 96
- Type sizes: 11, 12, 13, 14, 15, 16, 18, 20, 24
- Shadows: none

## Assets

- Icons: Bootstrap Icons 1.11.3 only (`bi-bell, bi-upload, bi-grid, bi-search, bi-chevron-down, bi-graph-up-arrow, bi-broadcast, bi-bookmark, bi-people, bi-mortarboard, bi-person-circle, bi-gear-fill, bi-box-arrow-right, bi-circle-fill, bi-info-circle`).
- `assets/ezana-nav-logo.png` brand mark (placeholder for the Walia ibex mark).
- No company logos; institutions use a mono letter.

## Files

- `Trading Page.dc.html` the page (HTML template with inline styles + logic class)
- `Trading Page Board.dc.html` dark and light side by side
- `colors_and_type.css` token source (light scope extended to `.light-mode`)
- `assets/ezana-nav-logo.png`
