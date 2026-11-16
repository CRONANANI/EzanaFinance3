# Handoff: Alternative markets (council member view)

## Overview

Redesign of the Ezana route `/alternative-markets`, organizational version. It is the existing crypto and commodities research page plus council-only cards shown to members of a university student-managed investment fund (the sample fund is called **Sample council**) on the same route. Non-members see the same page without the council band, the Council research context column and the Council rankings card.

## About the design files

The files in this bundle are **design references created in HTML**: prototypes showing intended look and behavior, not production code to copy. Recreate them in the Ezana Next.js codebase (React + Tailwind + the existing theme variables in `src/app/theme-variables.css`) using its established components and patterns.

## Fidelity

**High fidelity.** Final colors, type, spacing and interactions. Recreate pixel-accurately with existing primitives.

## Files

- `Alternative Markets.dc.html`: canvas with the dark page (1a), light page (1b), dialogs (2a to 2c), council card states (3a) and the audit list (4a).
- `Alt Markets Page.dc.html`: the page itself. Markup is plain HTML with inline styles; the logic class at the bottom holds all sample data and state.
- `colors_and_type.css`: Ezana tokens. One edit: the light-mode block also matches `.light-mode` on any element so the light artboard can sit beside the dark one. Use the codebase's own theme files in production.
- `assets/ezana-nav-logo.png`: nav logo.
- `support.js`: runtime that lets the `.dc.html` files open in a browser. Not part of the design.
  Note on the logo: the brief refers to a Walia ibex mark. The design system ships only `ezana-nav-logo.png` (pegasus), which is what the mock uses, mirrored with `scaleX(-1)` at 30px height. Swap in the ibex asset from the codebase if that is current.

## Global rules (from the audit)

- Canvas 1440px. Content spans x=32 to x=1408 (32px side padding). Left edge = logo left edge, right edge = logout icon right edge.
- Cards are flat: no fill, no border, no shadow, no radius. Sections are separated by spacing and 1px hairlines only.
- 64px gap between side-by-side sections. 24px clear space on each side of every vertical rule (1px, `--border-primary`).
- 56px vertical gap between section rows; 32px below the header row.
- Tabs, toggles and selectors are text only. Selected = `--emerald` text; unselected = `--text-muted`. No underline bar, pill or track.
- One solid emerald primary button per group; every other button is plain text.
- Search and text fields are borderless and transparent; placeholder `--text-ghost`.
- No boxes around chips or labels. "Sample content" is plain 12px `--text-faint` text.
- Table and list rows are flush: 1px `--border-secondary` divider, no padding inset. Hover changes text color to `--emerald-hover`; never a background wash or accent bar.
- Plus Jakarta Sans for text. JetBrains Mono for every number, ticker, date, time and address.
- Sentence case. No em dashes. Percentages always signed (`+1.84%`, `-0.62%`). Missing values show `N/A` in `--text-muted`.
- Bootstrap Icons only (`bootstrap-icons@1.11.3`).
- No live indicators, no "updated" or "delayed" timestamps; all market figures are fixed demo data labelled Sample content. No fund alternatives exposure figure anywhere (council holdings have no asset-class field).

## Layout (top to bottom)

1. **Navbar**, 64px tall, 3-column grid (`1fr auto 1fr`), bottom hairline `--border-primary`.

- Left: logo (30px) + "Ezana" 20px/700/-0.02em `--text-primary`; 24px gap; `bi-bell`, `bi-list-check` 18px `--text-muted`, 16px apart.
- Centre, 24px gaps, 14px/500 `--text-muted`, icon + label 6px apart: Team Hub (`bi-people`), Research (`bi-search`, `bi-chevron-down`), Trading (`bi-graph-up`, `bi-chevron-down`), **Sonar** (`bi-broadcast`) as a filled pill: background `--emerald`, text `--bg-primary`, radius `--radius-pill`, padding 6px 14px, 600. Watchlist (`bi-bookmark`), Learning Center (`bi-mortarboard`).
- Right, 20px gaps, 20px icons: `bi-person-circle`, `bi-gear` (`--text-muted`), `bi-box-arrow-right` in `--negative`.

2. **Marquee ticker strip**, 40px, bottom hairline. JetBrains Mono 12px. Each item: ticker 600 `--text-primary`, price `--text-secondary`, signed change in `--positive`/`--negative`, "Sample content" in sans `--text-faint`; 40px between items. Track duplicated and animated `translateX(0 → -50%)`, 60s linear infinite. Respect `prefers-reduced-motion` (stop).
3. **Header row**: left, Crypto / Commodities text switch (16px/600, 24px gap). Right, 24px gap: Export (text button, `bi-download`, 14px/500 `--text-secondary`, hover `--emerald`) and Add to watchlist (primary: `--emerald` bg, `--bg-primary` text, `--radius-md`, padding 9px 16px, 14px/600, `bi-plus-lg`, hover bg `--emerald-hover`).
4. **Headline metrics**: grid of 4 cells with 1px rules between (`1fr 1px 1fr 1px 1fr 1px 1fr`, column-gap 24px). Each cell: name 14px/600 + ticker mono 12px emerald + "Sample content" right; value **18px JetBrains Mono 600**; change mono 12px signed with "(24h)"; 96×32 sparkline (1.5px stroke, emerald up / red down); caption 12px `--text-muted`.

- Crypto: Bitcoin BTC $67,412.50 +1.84%; Ethereum ETH $3,218.40 -0.62%; Total market cap $2.41T +0.91%; Fear and greed 64, Greed.
- Commodities: Oil WTI CL $78.42 +1.12%; Gold GC $2,384.70 +0.48%; Wheat ZW $6.18 -1.27%; CRB index 291.37 +0.64%.

5. **Council band** (council members only): top hairline, 24px padding-top, eyebrow "Council workspace, visible to Sample council members" 12px faint, then 4 columns with rules (same grid as metrics). Column titles 16px/600 with a `--text-muted` icon, 10px gap.

- **Policy review** (`bi-file-earmark-text`): description; borderless ticker input (mono 14px/600, uppercase, `bi-search` prefix); result line; note "No asset class rule set. This describes the recorded list and is not a recommendation or approval."; text action "Open full check" opens dialog 2a.
- **Research library** (`bi-stack`): three links with `bi-box-arrow-up-right`, each with author and mono date beneath.
- **Pitch pipeline** (`bi-diagram-3`): flush rows, title left and stage right as plain text (Deep dive in emerald, Screening muted); leads line; "Open pipeline".
- **Learning links** (`bi-book`): three external links.

6. **Market prices (880px) | 64px | Movers + Community sentiment (432px)**.

- Market prices: title 16px/600 + "Sample content"; category tabs right (13px/500, 20px gap). Crypto tabs: All, Top 20, DeFi, Layer 1, Tokenized commodities, Watchlist. Commodities tabs: All, Energy, Metals, Agriculture, Watchlist.
- Table grid: `40px 1fr 120px 84px 84px 120px 112px`, column-gap 12px. Header 12px faint sentence case: #, Asset, Last price, 24h, 7d, Market cap (Crypto) / Unit (Commodities), Chart (7d). Rows 48px; index mono 12px faint; name 600 + ticker mono 12px muted; numbers mono right-aligned; 96×28 sparkline. Selected row text `--emerald`. Clicking a row selects it for the chart.
- Movers: two columns with a rule (24px clear each side). Sub-heads 12px faint. Rows: ticker mono 600, change mono colored. Top 3 and bottom 3 by 24h change.
- Community sentiment: 48px below Movers. Rows: `bi-chat-square-text`, topic 500, "Bull 74%" positive and "Bear 26%" negative mono 12px; 4px bar split positive/negative, square ends.

7. **Selected asset chart (880px) | 64px | Council research context (432px)**.

- Chart header actions (text, emerald, 13px/600): Start a pitch (`bi-lightbulb`, opens 2b), Send to team (`bi-send`, opens 2c).
- Asset "Bitcoin / USD" + ticker; price 18px mono; change mono 12px "(24h)". Range text tabs (mono 12px/600, 16px gap): 1D 5D 1M 3M 6M YTD 1Y Custom; default 3M.
- Area chart 220px tall: 2px `--chart-line` stroke, vertical gradient emerald 30% → 0%; y-axis labels column 56px mono 11px faint; x-axis labels mono 11px faint. No grid.
- Rule + 24px each side, stats column 160px: "Sample content", then Open, High, Low, Volume rows (label muted, value mono primary).
- Council research context (council only): title 16px/600; four blocks with 20px gap, block titles 600 with muted icon, content indented 26px:
- Coverage owners (`bi-people`): Amara Tesfaye, Tomas Alvarez, Selam Haile (plain text, 16px gap).
- Sector sleeves (`bi-grid`), "Sample council" faint: Financials JPM SCHW BAC; Healthcare LLY UNH MRK; Technology NVDA MSFT AAPL; Industrials CAT GE HON with HON in `--text-faint` and "not yet priced".
- Open research asks (`bi-check2-square`): three lines, switch with mode.
- Relevant meetings (`bi-calendar-event`): Alternatives research roundtable, Nov 19, 2026; Tokenization working session, Nov 26, 2026; "Open meetings" link with `bi-arrow-up-right`.

8. **Four-card row**, `repeat(4, 1fr)` with 64px gaps (296px each).

- On-chain snapshot: Bitcoin and Ethereum columns with a rule; 12px labels, mono values. Whale activity below a hairline: address mono emerald, amount mono right, description muted.
- Commodity research board: 4 flush rows, icon column 22px (`bi-boxes`, `bi-radioactive`, `bi-truck`, `bi-droplet`, muted), title 13px/600, description, source faint.
- Council rankings (council only): Sample council fund value $240,050.00 (18px mono), +46.73% vs SPY +10.08%, "Since inception". Table `1fr 64px 44px 40px`: Council, Return, Sharpe, Rating. Sample council +46.73% 1.42 A (row in emerald); Northshore Investment Council +31.20% 1.18 B+; Westbridge Capital Forum +22.64% 0.97 B. Link "Open council rankings".
- Learning Center and community: Recommended lessons (`bi-book`) and Community discussions (`bi-chat`), external links.

9. **News wire**: grid `120px 160px 1fr 200px`, column-gap 24px; header Time, Topic, Headline, Source; rows 44px; time mono muted; topic 13px/600 emerald text (no pill); source muted.
10. **Footer note**: `bi-info-circle` + "All figures and headlines on this page are sample content for product design purposes." 12px muted, 32px above, 40px below.

## Dialogs

All dialogs: scrim `--bg-overlay`; panel 480px wide, `--bg-primary`, `--shadow-xl`, padding 32px, no border, no radius; title 20px/600; close `bi-x-lg`; fields borderless with flush row dividers; actions right-aligned, one primary plus a text button. Esc and scrim click close. Focus moves to the first field.

- **2a Check a ticker against policy**: ticker input; rows Prohibited list (On the prohibited list in `--negative`, or Not on the prohibited list in `--text-primary`), Recorded sector, Recorded by, Asset class rules ("No asset class rule set"). Footnote that this is descriptive, not a recommendation or approval. Actions: Close, Check another.
- **2b Start a pitch from this asset**: Asset (prefilled), Pitch title, Stage text selector (Screening, Deep dive, Committee vote), Lead select, Due date, Thesis. Actions: Cancel, Create pitch.
- **2c Send to team**: member search, selectable member rows (selected = emerald + `bi-check-lg`), note, attachment line. Actions: Cancel, Send to N.

## States (every council card)

Council cards: Policy review, Research library, Pitch pipeline, Learning links, Council research context, Council rankings.

- **Loading**: card title stays; 4 skeleton bars 12px tall at 90/72/80/48% width, `--emerald-bg`, no radius.
- **Empty**: one line in `--text-muted` + one emerald text action. Copy per card is in canvas section 3a.
- **Error**: inline `bi-exclamation-circle` + "Could not load …" in `--negative`, then emerald text action Retry (`bi-arrow-clockwise`).

## Interactions and state

- `mode`: crypto | commodities. Switches metrics, tabs, table rows, last column, movers, sentiment topics, research asks. Resets tab and selection.
- `tab`: active category (text color only in the mock; filter in production).
- `sel`: selected table row, drives the chart and Open/High/Low/Volume.
- `range`: chart range, default 3M.
- `policy`: ticker string. Empty → prompt; on recorded list → "TICKER: On the prohibited list (recorded sector: X)."; otherwise "TICKER: Not on the prohibited list." Never wording like approved, allowed or recommended.
- Hover on rows, tabs and links: text color only, `--emerald-hover`. No transforms.
- Council-only elements render only for members of the viewer's council.

## Design tokens used

Dark (light in parentheses):

- `--bg-primary` #0a0e13 (#ffffff); `--bg-overlay` rgba(0,0,0,0.6)
- `--text-primary` #f0f6fc (#0f172a); `--text-secondary` #e2e8f0 (#1e293b); `--text-muted` #8b949e (#64748b); `--text-faint` #6b7280 (#94a3b8); `--text-ghost` #4b5563 (#cbd5e1)
- `--emerald` #10b981 (#059669); `--emerald-hover` #34d399 (#047857); `--emerald-bg` rgba(16,185,129,0.08) (0.06)
- `--positive` #10b981 (#059669); `--negative` #ef4444 (#dc2626)
- `--border-primary` rgba(16,185,129,0.08) (rgba(0,0,0,0.08)); `--border-secondary` rgba(16,185,129,0.06) (rgba(0,0,0,0.05))
- `--chart-line` #10b981 (#059669)
- `--shadow-xl` (dialogs only); `--radius-md` 8px (buttons); `--radius-pill` (Sonar only)
- `--font-sans` Plus Jakarta Sans; `--font-mono` JetBrains Mono
- Type sizes: 11, 12, 13, 14, 16, 18, 20px.
  **Missing token:** the design system defines no token for primary button text. The mock uses `var(--bg-primary)` on `--emerald` (Add to watchlist, dialog primaries, the Sonar pill). The production app uses `--btn-primary-fg` for this; use that.

## Audit changes against the wireframe

1. Removed the page title, the Sample research environment pill and the intro sentence.
2. Replaced invented assets with Bitcoin, Ethereum, Total market cap, Fear and greed (Crypto) and Oil WTI, Gold, Wheat, CRB index (Commodities); every figure labelled Sample content.
3. No live dots, "updated" or "delayed" claims, and no fund alternatives exposure figure.
4. Flattened all cards (no fill, border, shadow, radius).
5. Content aligned x=32 to x=1408.
6. 64px between side-by-side sections; 24px clear beside every vertical rule.
7. Crypto/Commodities switch made text-only and moved left of the header row.
8. Removed filled pills from category and range tabs.
9. Export became a text button; Add to watchlist is the single primary.
10. Removed boxes from ticker badges, Sample content labels, the Bullish pill, pipeline stage pills, coverage owner chips and news topic pills.
11. KPI values set to 18px JetBrains Mono (and the chart price).
12. Flush rows with text-only hover; removed Movers dots.
13. Bootstrap Icons replace Lucide-style and illustrated icons.
14. Mono for every number and ticker, including dates, times and addresses.
15. Sentence case for table headers, Bull/Bear, library titles, stage names and the Learning Center and community title.
16. Removed em dashes from meeting rows.
17. Signed percentages; N/A for missing values.
18. Council member navbar (checklist icon, Sonar pill, Community removed, red logout, muted settings).
19. Policy review rebuilt as a descriptive ticker check.
20. Added sector sleeves with HON not yet priced; invented coverage owners.
21. Council rankings shows return, Sharpe and rating for three councils plus the Sample council fund value.
22. "· sample content" suffixes became separate faint Sample content labels.
23. Square-ended sentiment bars.
24. Added Start a pitch and Send to team actions to the chart.
25. Noted the missing primary button text token (see above).
