# House Financial Disclosures, measured spec

Implementation numbers for the page at `/datasets/house/disclosures`. Values are
what the two wireframes render at 1440 wide; the layout below 1000px is
described in section 9. Read `06-SHARED-CHROME.md` first for the top 76px, which
is not this page's to change.

All numbers are px.

---

## 1. Vertical structure at 1440

| Zone | Height | Notes |
|---|---:|---|
| Shared chrome | 76 | nav 44 + ticker 32, see 06 |
| Top padding | 28 | |
| Eyebrow row | 14 | with the `SAMPLE DATA` chip when applicable |
| Gap | 10 | |
| Title | 36 | 32px / 700, `letter-spacing -.025em`, centred |
| Gap | 14 | |
| Builder pill | 44 | 720 wide, centred |
| Query line | 14 | mono 10px under the pill, 2px gap |
| Gap | 30 | |
| Body | flows | rail + main, scrolls normally |

This page is not a takeover. It scrolls. There is no viewport budget to balance.

## 2. Horizontal grid

```css
.hfd-body { display: grid; grid-template-columns: 232px minmax(0, 1fr); gap: 36px; padding: 0 40px; }
```

Content box 1360 inside 40px gutters, capped at 1440 and centred on wider
screens. Rail 232, gap 36, main 1092.

## 3. The builder, quiet by design

The EzanaQL builder is a single light row. It is not a panel and it is never
dark.

| Property | Value |
|---|---|
| Size | 720 x 44, centred under the title |
| Shape | `border-radius: 9999px; border: 1px solid rgba(10,14,19,.12); background: #fff` |
| Left | Ezana AI mark (12px sparkle glyph) + `Ezana AI` 12px / 600 in `#047857`, then a 1px 18px-tall divider |
| Middle | placeholder `Describe a report in plain English`, 13px, `#8a9a95` |
| Right | `Generate EzanaQL` button, 32px tall, `background: rgba(16,185,129,.12); color: #047857`, 12.5px / 700, pill |
| Under it | the current query as one line of JetBrains Mono 10px in `#8a9a95`, then `Edit · Run · CSV · JSON` as text links in `#047857` |

Clicking Edit or Generate expands an editor **in place under this line**, on
the same white ground, with the same mono at 12.5px, a 1px `rgba(10,14,19,.1)`
border and 8px radius. It never becomes a dark block and it never exceeds
720 wide. Keywords in the query are `#047857`; everything else is ink. The
query is seeded from the rail's current filters and re-seeds when they change,
until the user edits it by hand.

## 4. The rail

232 wide, `gap: 20px` between groups, no borders around the rail itself.

| Control | Spec |
|---|---|
| Member search | 38px input, 8px radius, 1px `rgba(10,14,19,.12)`, magnifier glyph, placeholder `Member name` |
| Ticker search | same, mono placeholder `Ticker, e.g. NVDA` |
| Year | mono-caps label, then a 34px select in the active style: 1px `rgba(16,185,129,.4)`, `rgba(16,185,129,.06)` fill, `#047857` text, mono |
| Transaction | 4-segment control `ALL / BUY / SELL / EXCH`, 5px radius, mono 10px, active segment `#0a0e13` on white text |
| Amount bracket | six checkboxes, mono 11px, 13px emerald squares, hairline dividers, then the one-line note: `Amounts are the ranges members disclose. Nothing on this page shows an exact figure.` |
| Disclosure lag | 3-segment `ANY / ≤45D / >45D` |

Labels: JetBrains Mono 10px, `.16em`, `#8a9a95`, uppercase.

## 5. The main column

### 5.1 Metric row

Four cells, ruled not carded: `border-top` and `border-bottom` 1px
`rgba(10,14,19,.1)`, 1px vertical rules between cells, 14px block padding,
20px between the rule and the text.

| Cell | Figure | Caption |
|---|---|---|
| FILINGS | `45,000+` | 2008 to 2026, 19 index years |
| PTRS IN 2026 | `400` | periodic transaction reports to date |
| TRANSACTIONS EXTRACTED | `[N]` | in current selection, buys [X]% sells [Y]% |
| MOST RECENT FILING | `Sep 24` in `#047857` | PTRs post within days, annuals in mid June |

Figure: JetBrains Mono 28px / 700, `letter-spacing -.03em`, tabular. Label:
mono 10px `.16em` `#8a9a95`. Caption: 12px `#5a6b65`.

### 5.2 View tabs

One row, `border-bottom: 1px solid rgba(10,14,19,.1)`. Tabs at 13.5px with
10px 14px padding. Active tab 700 weight with a 2px `#10b981` underline that
sits on the row's rule (`margin-bottom: -1px`). Order: **Trades** (default),
Filings, Members, Tickers, Coverage. Coverage carries a 6px `#f59e0b` dot so
the honest map is discoverable without being loud. Right side: current sort,
with `~est.` in mono beside Amount whenever the sort is by bracket.

### 5.3 The one chart plus the leaderboard

Two blocks side by side, 28px gap, the leaderboard fixed at 240 wide with a
1px left rule and 24px left padding.

**Transactions by month, buys versus sells.** Grouped bars, 128px tall, months
on the x axis in mono 10px, three dashed horizontal gridlines
(`stroke-dasharray: 3 3`, `rgba(10,14,19,.08)`), a 1px baseline. Buy bars
`#10b981`, sell bars `rgba(10,14,19,.55)`. Bars 26 wide, 2px apart within a
month, 3px radius on the top corners. Legend inline in the head row; a caption
`counts, not dollars` right-aligned. This is the only chart on the page.

**Most traded, last 30 days.** Five rows: ticker (mono 700 `#047857`), a 6px
two-tone split bar buy/sell on a `rgba(10,14,19,.06)` track, count right.
Dotted dividers. Each row links to the ticker view.

### 5.4 The trades table

```css
grid-template-columns: minmax(0,1.8fr) 64px minmax(0,1.6fr) 62px 92px 92px 56px 150px 30px;
gap: 12px;
```

Columns: MEMBER · TICKER · ASSET · TYPE · TRADED · FILED · LAG · AMOUNT
DISCLOSED · source link. Head row mono 9.5px `.14em` `#8a9a95` under a 2px
ink rule. Rows 42 tall, `border-bottom: 1px dotted rgba(10,14,19,.2)`.

| Cell | Spec |
|---|---|
| Member | 12.5px / 600 link, then party-state-district in mono 10px `#8a9a95` (`D-CA-12`) |
| Ticker | mono 700 `#047857` link; a middle dot when the asset has none |
| Asset | 12.5px `#5a6b65`, one line, ellipsis |
| Type | chip, mono 10px `.1em`: BUY `rgba(16,185,129,.14)` on `#047857`; SELL `rgba(10,14,19,.08)` on ink; EXCH 1px outline `rgba(10,14,19,.16)` on `#5a6b65` |
| Traded, Filed | mono 12.5px `#5a6b65`, ISO dates |
| Lag | mono, right-aligned, `16d`; over 45 days: `#b45309` 600 |
| Amount | mono 12.5px, right-aligned, the bracket verbatim, `nowrap` |
| Source | 13px external-link glyph, `aria-label="Open source filing"` |

The **selected member's** row (the one whose panel is open) takes
`background: rgba(16,185,129,.07); box-shadow: inset 3px 0 0 #10b981;` and its
member name goes to 700. Only one row is selected at a time.

Footer row under a 1px rule: the lag note on the left (`Lag is days from
transaction to filing; the law allows 45. Every row links to the original PDF
at the Clerk of the House.`) and mono pagination on the right.

### 5.5 Compliance line

11.5px `#8a9a95`, 1.55 line height, last thing in the main column:
`Disclosures are public records, shown as filed with the Clerk of the U.S.
House. Amounts are the ranges members disclose. Nothing here is investment
advice.`

## 6. The member panel

Opens from any member name anywhere on the page. It replaces the two-deep
modal stack the Contracts page uses today.

| Property | Value |
|---|---|
| Width | 480 |
| Position | fixed, right 0, from `top: 76px` to the bottom, so the shared chrome stays visible and usable |
| Surface | `#fff`, `border-left: 1px solid rgba(10,14,19,.1)`, `box-shadow: -30px 0 70px rgba(10,14,19,.18)` |
| Scrim | `rgba(10,14,19,.22)` over the page from 76px down; click closes |
| Enter | slide from the right, 220ms ease-out; scrim fades in over the same time; reduced motion: appear |
| Close | the X, Esc, the scrim, or browser back. Clicking another member swaps content in place, no second panel |
| Scroll | the panel body scrolls; the page behind does not |
| URL | opening the panel pushes `/datasets/house/members/[slug]`; the same route standalone renders the profile as a full page, which is what `Open page` links to |

Panel contents, top to bottom, 20px padding, 18px between blocks:

1. **Head row**, 14px 20px, 1px bottom rule: `MEMBER` mono label, the route
   in mono 10px `#8a9a95`, `Open page` link with an external glyph, and a 28px
   round close button.
2. **Identity**: 46px round initials mark (`rgba(16,185,129,.14)` on
   `#047857`), name 19px / 700, then `D · CA-12 · MEMBER SINCE [YEAR]` in mono
   10.5px. State and district only when known; never invented.
3. **Four stats**, ruled row like the page's metric row but 20px figures:
   FILINGS, PTRS, TXNS, MEDIAN LAG.
4. **Most traded**: ticker chips, mono 11px, 1px outline, count in `#8a9a95`.
   Each links to the ticker view.
5. **Disclosure lag, last 12 months**: a 60px dot plot, one dot per trade,
   y = days, dashed `#f59e0b` line at 45, dots `#10b981` under the line and
   `#b45309` over it, a plain count top right (`2 of 15 past 45 days`).
6. **Filings and trades**: table under a 2px rule, 36px rows, columns
   TICKER · TYPE · AMOUNT DISCLOSED · FILED, filed cell doubling as the PDF
   link. Non-trade filings show a middle dot and the filing type. A scanned
   filing shows `Scanned filing, trades pending extraction` in `#b45309` with
   a small spinner glyph. An in-flight fetch shows a spinner in the count cell.
7. **Actions**: `Set an alert` (solid `#10b981`, `#04261c` text) and
   `All filings, 2008 on` (outline), equal width. A 10.5px note under them:
   `Alerts need a free account. Everything else here is open.`

## 7. Type scale

| Role | Face | Size |
|---|---|---|
| Title | Jakarta 700 | 32 |
| Eyebrow | Mono 500 `.18em` | 10.5 |
| Metric figure | Mono 700 `-.03em` tabular | 28 |
| Panel figure | Mono 700 tabular | 20 |
| Panel name | Jakarta 700 | 19 |
| Tabs | Jakarta 500 / 700 active | 13.5 |
| Table body | Jakarta 400 / 600 names | 12.5 |
| Table numerals, dates, brackets | Mono 400 tabular | 12.5 |
| Table head, rail labels | Mono `.14em` to `.16em` | 9.5 to 10 |
| Chips | Mono `.1em` | 10 |
| Captions | Jakarta 400 | 11.5 to 12 |

Every figure, ticker, date, bracket, lag and rank is mono and tabular.

## 8. Spacing

4-base. Used: 8, 10, 12, 14, 18, 20, 22, 28, 30, 36, 40.

| Where | Value |
|---|---|
| Page gutters | 40 |
| Rail to main | 36 |
| Rail groups | 20 |
| Main blocks | 22 |
| Chart to leaderboard | 28 |
| Panel padding | 20 |
| Panel blocks | 18 |

## 9. Responsive

The trades view is the part that has to work on a phone, so it does not become
a sideways-scrolling table.

- **1000px and below**: the rail collapses to a `Filters` button that opens the
  same controls in a sheet; the main column goes full width; the leaderboard
  drops under the chart.
- **760px and below**: the trades table becomes a **card list**. Each trade is
  one card: member and district on line one, ticker chip + type chip + bracket
  on line two, traded, filed and lag on line three in mono. Same data, same
  colours, no horizontal scroll. Coverage, Filings, Members and Tickers tabs
  keep their tables but scroll inside their own container.
- **Panel on phone**: full width, from the top, with the chrome hidden behind
  it; the route still changes, so back closes it.
- The builder pill goes full width with 16px gutters; the query line wraps.

## 10. Fixture

Illustrative, cached, never live. Real figures where the brief gives them:
45,000+ filings, 19 index years, 2013 holds about 2,300 PTRs, 2026 holds 400 to
date, 2014 holds 11 filings as published.

- Member names are `[Member name]` with a real-shaped district code. **Do not
  attach invented trades to real people**, in the fixture or in a demo.
- Tickers: NVDA, MSFT, AAPL, LMT, XOM, AMZN, plus a T-bill and an ETF row so the
  no-ticker case is designed.
- Brackets exactly as the law states them, from `$1,001 to $15,000` up.
- Lags: mostly under 45 days, with one row at 55d to show the late treatment.
- Ticker items: two trades and two filings, per `06-SHARED-CHROME.md`.

## 11. What this page fixes relative to the Contracts page

1. The builder no longer competes with the title: one light 44px row instead
   of a panel.
2. Drilling is one panel with a URL, not two stacked modals.
3. Coverage is a tab with a marker, so honesty about 2014 and pre-2012 is one
   click away without being the first thing a visitor reads.
4. The 45-day lag is a table column and a rail filter, not a buried detail.
5. Trades survive a phone as cards; nothing scrolls sideways.
