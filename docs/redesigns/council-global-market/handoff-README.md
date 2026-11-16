<!-- Transcribed from Claude Design project d2cce7e8-0826-44c1-804f-a3ed5ec32624, file design_handoff_council_view/README.md (94 lines), read with get_page_text while paging the editor. Wrapped lines re-joined. -->

# Handoff: Global market analysis, Council view

## Overview

A third view, **Council**, for the organizational version of Ezana Global Market Analysis (`/market-analysis`), used by university student-managed investment funds. It sits beside **The map** and **The chain** in the view toggle and is shown only to council members. The map and the chain are unchanged and are out of scope.

## About the design files

The files in this bundle are **design references created in HTML**: prototypes showing intended look and behavior, not production code to copy directly. Recreate them in the target codebase (the Ezana Next.js app: Tailwind, `theme-variables.css`, shadcn-style primitives) using its established patterns. Use the existing navigation bar component rather than rebuilding it.

## Fidelity

**High fidelity.** Final colors, type, spacing and interactions. Recreate pixel-accurately at 1440px desktop width, dark mode default, with light mode via the existing `.light-mode` token overrides.

## Files

- `CouncilPage.dc.html`: the page (template + logic). Props: `theme` (`dark` | `light`), `dialog` (`none` | `event` | `agenda` | `send` | `note`).
- `Council Market Analysis.dc.html`: review board. 1a dark page, 1b light page, 1c states board, 1d to 1g dialogs, 1h audit list.
- `tokens.css`: design system tokens (copy of `colors_and_type.css`; light overrides also scoped to `.light-mode` on any element).
- `assets/ezana-nav-logo.png`: stand-in brand mark (see Assets).

Open either `.dc.html` file in a browser next to `support.js` to view. All styling is inline and references only `var(--*)` tokens from `tokens.css`.

## Layout (1440px)

- Content gutters: 32px. Everything aligns from x=32 (left edge of logo) to x=1408 (right edge of logout icon).
- **Navigation bar**: 72px tall, 3-column grid `auto 1fr auto`, bottom hairline.
  - Left (gap 40px): logo 44px tall; bell (`bi-bell`, 20px) with red counter `9+`; `bi-flag` with emerald counter `5/19`. Counters: 18px tall pill, JetBrains Mono 10px/700, text `--bg-primary`.
  - Center (gap 36px, 14px/500): Team Hub (`bi-building`, `--purple`), Research (`bi-search` + `bi-chevron-down`), Trading (`bi-graph-up` + chevron), **Sonar** filled pill (40px tall, 0 20px padding, `--radius-pill`, `--emerald` fill, `--bg-primary` text, 600, `bi-broadcast`), Watchlist (`bi-bookmark`), Learning Center (`bi-mortarboard`).
  - Right (gap 28px, 22px icons): `bi-person-circle` and `bi-gear-fill` in `--emerald`; `bi-box-arrow-right` in `--negative`.
- **Index strip**: 44px, gap 64px. Each item: name 12px `--text-muted`, value JetBrains Mono 14px `--text-primary`, change Mono 14px `--positive`. S&P 500 4,813.62 +0.42%, Nasdaq 15,310.97 +0.61%, Dow 37,418.06 +0.36%, Russell 2000 1,943.29 +0.74%. Right-aligned "Delayed quotes" 12px muted. No LIVE label.
- **View toggle**: 64px row, centered, gap 40px, 14px/500 text only. The map, The chain (`--text-muted`, hover `--text-primary`), **Council** selected (`--emerald`, 600), Global empire rankings (`--gold`, `bi-globe2`). No box, pill, track or underline.
- "Sample content" 12px muted, 24px below toggle hairline.
- **KPI strip**: 12px below; 48px tall; 6 equal flex cells. Cell: 28px icon tile (icon 18px, `--text-secondary`, no fill), gap 12px, label 12px `--text-muted`, value 18px JetBrains Mono `--text-primary`. 1px `--border-primary` vertical rules between cells with 24px padding each side. Cells: Sample council / Sample council (`bi-people`), Fund value / $240,050.00 (`bi-stack`), Since inception / +46.73% positive (`bi-graph-up-arrow`), Benchmark / SPY +10.08% positive (`bi-bullseye`), Positions / 12 positions (`bi-layers`), Next meeting / Thu, Nov 19 (`bi-calendar3`). Hairline 24px below.
- **Body grid**: `grid-template-columns: minmax(0,1fr) 1px 368px; column-gap: 32px` (main about 943px, full-height 1px `--border-primary` rule, side 368px; 64px between columns, 32px clear each side of the rule).
- Sections: `padding: 32px 0`, 1px `--border-primary` bottom hairline (none on last main section). Heading 24px (`--fs-xl`) 600, letter-spacing -0.01em, `--text-primary`. "Sample content" labels 12px muted, right-aligned on heading baseline.
- Tables: header row 12px/500 `--text-muted` sentence case, 20px below heading, 10px bottom padding, hairline. Rows min-height 44px (events 46px), 14px, `--text-secondary`, hairline between. First cell 600 with 8px emerald dot, gap 12px. Column gap 16px.
- **Footer**: top hairline, `24px 0 40px`, 12px muted: "Sample content shown for demo accounts only. Nothing on this page is saved from sample interactions."

### Main column

1. **This week's events matched to sector teams**. Columns `1.9fr 1.35fr 1fr 1.15fr 0.95fr`: Event (sample content), Topic, Sector match, Owner / desk, Action. Rows: Fed holds policy rate / Rates and policy / Financials / Amara Tesfaye / Add to agenda; Brent crude moves higher / Oil and energy / Industrials / Mikael Bekele / Open chain; Stronger US dollar in FX / Currency and funding / Technology / Selam Haile / Add to agenda; ECB policy commentary / Central bank outlook / Financials / Chidi Okoye / Open chain; Industrial production surprise / Industrial activity / Industrials / Daniel Park / Add to agenda. Action = emerald text button.
2. **Fund against benchmark**. Three metrics (label 14px with dot, value 24px Mono `--positive`): Sample council +46.73%, SPY +10.08% (grey dot `--text-muted`), Alpha +36.65%; 24px each side of the two vertical rules. Range selector right: 1M 3M YTD 1Y ALL, Mono 12px/600, gap 20px, selected `--emerald`, others `--text-muted`. Chart SVG viewBox 944x276: plot x 56 to 944, y 10 to 244; dashed (3 5) gridlines `--border-hover`, solid zero line; y labels Mono 11px muted, signed; council line `--chart-line` 2px with area fill gradient `--chart-line` 35% to 0%; SPY line `--text-muted` 1.75px; 5 x labels Mono 11px (Nov 2024 ... Nov 2026; `Mon D` when range under 120 days). Legend 12px below: Sample council (since inception), SPY (since inception).
3. **Sleeve weights beside market moves**. Columns `1fr 0.9fr 1.3fr 1.9fr`: Sector team, Sleeve weight (Mono), Top tickers (sample) (Mono), Related market watch (sample content). Financials 25.0% JPM, SCHW, BAC; Healthcare 25.0% LLY, UNH, MRK; Technology 30.0% NVDA, MSFT, AAPL (**warning**: dot, weight and `bi-exclamation-triangle` in `--warning`); Industrials 20.0% CAT, GE, HON. Then "Market context (sample content)" 12px muted and a dotted list (gap 8px): key 600 `--text-primary` + value.
4. **Council macro research** with primary **New note**. Columns `1.75fr 1.1fr 0.9fr 0.7fr 0.6fr`: Research note (sample content), Topic, Author, Status (Published `--positive`, In review `--warning`, 600, no box), Date (Mono 13px). Dates Nov 13, Nov 11, Nov 10, Nov 6, 2026.
5. **Agenda builder from events** with primary **Send to meetings**. Columns `2fr 1fr 1fr 0.5fr`: Agenda item (sample content), Owner, Type, Time est. (Mono number + "min").
6. **Council versus council**. Columns `40px 2fr 1.3fr 0.6fr 1fr 0.5fr`: Rank, Council, Return (since inception), Sharpe, Alpha (vs SPY), Rating. Rank muted Mono; returns and alpha `--positive` Mono; rating Mono 600 `--text-primary`. Sample council row name 600.
7. **Policy and exposure check**. Icon list, gap 12px, 16px icons: warning `bi-exclamation-triangle` `--warning` (Technology sleeve near recorded sector cap: 30.0% of fund value.), `bi-check-circle` `--positive` (No prohibited sectors...), `bi-info-circle` `--warning` (HON unpriced, counted at cost in book summaries.), `bi-check-circle` (Position sizes are within recorded limits...).

### Side column

1. **Coverage and owners**, "Sample content" below heading. Two-column rows (14px vertical padding, hairlines between): team 600 `--text-primary` with dot; owners.
2. **Debrief queue**. Items: dot + headline 14px/600 + meta 12px muted (date Mono, " · ", topic). Harbor Lane Bancorp opens a regional lending desk, Nov 16, 2026 · Macro and markets; Regional lenders slip after Corvan Bank payments delay, Nov 16, 2026 · Financials. Then text buttons Add to debrief and Send to team, gap 32px.

## Components

- **Primary button**: 36px tall, `0 16px`, `--radius-md`, `--emerald` fill, text `--bg-primary` 14px/600, hover `--emerald-deep`. Max one per group.
- **Text button**: no background, border or underline, 14px/500 `--emerald`, hover `--emerald-hover`. Cancel uses `--text-muted`, hover `--text-primary`.
- **Text option (selector)**: 14px; selected `--emerald` 600; unselected `--text-secondary` 500; hover `--emerald`. No pill, box or bar.
- **Text field**: borderless, transparent, `8px 0` padding, 16px (tags 14px) `--text-primary`, placeholder `--text-faint`, 12px muted label above.
- **Dot**: 8px circle `--emerald` (status variants use `--warning`).
- **Dialog**: absolute, top 120px, centered, 560px wide, 32px padding, `--bg-primary` surface, 1px `--border-primary`, no radius or shadow, over full-page `--bg-overlay` scrim. Close `bi-x-lg` 16px top-right 24px. Clicking the scrim closes.

## Dialogs

- **Event analysis**: "Event analysis" 12px muted, event name 20px/600, meta (Mono date · topic), summary 14px/1.6, hairline, **Council** 16px/600, note "Sector teams matched to this event by topic. This is a sector match, not an impact estimate.", rows of matched teams (team + "Sector match: {topic}", owners). Actions: primary Add to debrief, text Send to team (opens Send to team with the event as subject). Never show an impact estimate.
- **Add to agenda**: event name sub, Upcoming meeting options (Mono date 150px + name): Thu, Nov 19, 2026 Weekly council meeting; Thu, Dec 3, 2026 Weekly council meeting; Thu, Dec 10, 2026 Portfolio review. Item type: Discussion, Macro review, Research review, Vote. Primary Add to agenda, Cancel.
- **Send to team**: subject sub, Council conversation options with member counts (Full council 12, four sector teams 3 each). Primary Send, Cancel.
- **New note**: Title field, Type (Research note, Macro brief, Meeting memo), Sector (Financials, Healthcare, Technology, Industrials), Tags field. Primary Create note, Cancel.

## Interactions and behavior

- Event name click: Event analysis. Add to agenda (events): Add to agenda dialog. Open chain: switch to The chain view focused on the event. New note: New note dialog. Send to team (debrief or event dialog): Send to team dialog. Confirm and Cancel close the dialog.
- Range selector re-slices the series and rebases both lines to 0% at range start; metric values, y ticks and x labels recompute. Alpha = fund return minus SPY return.
- Row hover: text colour change only (`--text-secondary` to `--text-primary`; event names and debrief headlines to `--emerald`). No wash or accent bar.
- No animations beyond instant colour changes.

## States (board 1c)

Each card (KPI strip, events, fund against benchmark, sleeve weights, macro research, agenda builder, council versus council, policy check, coverage, debrief) has:

- **Loading**: three 10px bars at 70%, 92%, 54% width, `--radius-sm`, `--emerald-bg-hover`, `aria-busy`.
- **Empty**: one line + one text action (copy per card in the board).
- **Error**: `bi-exclamation-circle` `--negative` + one line + Retry text button.

## State management

`dialog`, `evt` (selected event index), `range`, `meeting`, `itemType`, `conv`, `noteType`, `noteSector`, `sendFrom`. Data: events, coverage, sleeves (ticker, sector, team, weight only), notes, agenda, councils, policy checks, debrief, fund and SPY series. Fetch each card independently so states are per card.

## Data rules

- The book stores only ticker, sector and team. Never show a country, region, currency or asset-class figure for holdings. A listing exchange, if ever shown, must be computed from the ticker's exchange and labelled as such.
- Money: `$12,438.20`. Percentages signed with two decimals in compact UI; sleeve weights one decimal. Missing values render `N/A`.
- Sample content only for demo accounts; nothing is saved.

## Design tokens

Colors (dark / light): `--bg-primary` #0a0e13 / #ffffff; `--text-primary` #f0f6fc / #0f172a; `--text-secondary` #e2e8f0 / #1e293b; `--text-muted` #8b949e / #64748b; `--text-faint` #6b7280 / #94a3b8; `--border-primary` rgba(16,185,129,0.08) / rgba(0,0,0,0.08); `--border-hover` rgba(16,185,129,0.20) / rgba(16,185,129,0.25); `--emerald` #10b981 / #059669; `--emerald-hover` #34d399 / #047857; `--emerald-deep` #059669; `--emerald-bg-hover` rgba(16,185,129,0.12); `--positive` #10b981 / #059669; `--negative` #ef4444 / #dc2626; `--warning` #fbbf24 / #d97706; `--gold` #d4a853; `--purple` #a78bfa; `--chart-line` #10b981 / #059669; `--bg-overlay` rgba(0,0,0,0.6).
Type: Plus Jakarta Sans (text), JetBrains Mono (numbers, tickers, dates). Sizes `--fs-xs` 12, `--fs-sm` 14, `--fs-base` 16, `--fs-md` 18, `--fs-lg` 20, `--fs-xl` 24.
Spacing: 4-base (8, 12, 16, 20, 24, 32, 40, 64). Radius: `--radius-sm` 4 (skeleton), `--radius-md` 8 (buttons), `--radius-pill` (Sonar, counters). No shadows.
**Missing token**: no token exists for text on emerald fills; `--bg-primary` is a stand-in and fails 4.5:1 in light mode. Add `--text-on-emerald`.

## Assets

- Icons: Bootstrap Icons 1.11.3 (CDN in prototype; use the package in code).
- Logo: `assets/ezana-nav-logo.png` is the design-system pegasus mark used as a stand-in. Replace with the Walia ibex logo from the codebase.

## Audit changes

The full numbered list is rendered on board 1h in `Council Market Analysis.dc.html`.
