# Politician Tracker, measured spec (P3 Portrait gallery)

All numbers measured from the approved board at 1440 wide. Colours are named
by their `03-TOKENS.css` property. Fonts: Plus Jakarta Sans for words,
JetBrains Mono `tabular-nums` for every figure, ticker, date, rank, percent.

## 1. Page frame

| | |
|---|---|
| Shared chrome | 76px (nav 44 + ticker 32), from the datasets layout. Not drawn here. |
| Gutters | 40px each side; content max 1440, centred on wider screens |
| Header block | padding-top 26; eyebrow, 10 gap, title, 10 gap, subline, 18 gap, builder, 10 gap, query line |
| Body | padding-top 24 under the query line; vertical rhythm 18 between blocks |
| Compliance | 11.5px / 1.55, `--ptk-faint`, 18 above, 40 below |

## 2. Header and builder (unchanged from the datasets family)

- Eyebrow: mono 10.5px, tracking .18em, `--ptk-house-text`, centred. Reads
  `DATASETS · CONGRESS`. When the fixture is live, a `SAMPLE DATA` chip
  follows: mono 10.5px, tracking .12em, padding 2 7, radius sm, sample colours.
- Title: 32px / 700, tracking -.025em, line-height 1.1.
- Subline: 14px, `--ptk-mute`.
- `EzanaQLBar`: mounted as is. The board shows the resting state: a 720 x 44
  white pill, 1px `--ptk-hair-strong`, the Ezana AI mark, the placeholder,
  a tinted Generate button; under it one mono 10px line with Edit, Run, CSV,
  JSON as text links. Do not restyle.

## 3. Toolbar

One flex row, gap 8, all items 36 tall.

| Item | Spec |
|---|---|
| Search | 200 wide, radius md, 1px `--ptk-seg-border`, search icon 13px, placeholder 13px `--ptk-faint`, padding 0 12 |
| Chamber segmented | radius md, 1px border, segments padding 8 12, 12.5px / 600, House and Senate carry a 7px dot in their chamber colour before the label |
| Party segmented | same, mono 12.5px / 600, segments ALL D R I |
| Spacer | flex-grow 1 |
| RANK BY label | mono 9.5px, tracking .14em, `--ptk-faint`, 2px right margin |
| Rank-by segmented | Disclosed volume, Most trades, Latest trade |

Active segment: `--ptk-seg-active-bg` with `--ptk-seg-active-fg`. Inactive:
`--ptk-seg-fg`. Segments never wrap (`white-space: nowrap`). Below 1000 the
toolbar wraps to two rows: search and chamber first, party and rank-by
second.

## 4. Gallery and rail grid

```
grid-template-columns: minmax(0, 1fr) 380px;
column-gap: 28px;
align-items: start;
```

The rail has `border-left: 1px solid --ptk-hair; padding-left: 28px;
padding-top: 4px`.

### 4.1 Gallery heading

16px / 700 "Top eight by disclosed volume", 12px gap, 12.5px `--ptk-faint`
caption "ring colour is chamber, letter tag is party". 12 below to the grid.
When rank-by is Most trades or Latest trade the heading reads "Top eight by
most trades" / "Top eight by latest trade".

### 4.2 Card grid

```
grid-template-columns: repeat(4, minmax(0, 1fr));
gap: 14px;
```

At 1440 each card is about 228 wide and 278 tall.

### 4.3 Card anatomy (top to bottom, centred, gap 10)

| Part | Spec |
|---|---|
| Card | `button`, padding 20 18 16, radius lg, 1px `--ptk-card-border`, background `--ptk-card-bg`, position relative |
| First card | border `--ptk-card-first-border`, `box-shadow: 0 0 0 3px --ptk-card-first-halo` |
| Rank badge | absolute top 12 left 12; mono 12px / 700; padding 3 8; radius pill; `#N`. Rank 1: `--ptk-rank-first-bg` / `--ptk-rank-first-fg`. Others: `--ptk-rank-badge-bg`, ink text |
| Chamber chip | absolute top 12 right 12; mono 9.5px, tracking .1em, padding 3 7, radius sm; House `--ptk-house-chip` / `--ptk-house-text`; Senate `--ptk-senate-chip` / `--ptk-senate-text` |
| Portrait | 88 x 88, radius pill, `--ptk-avatar-bg`, 3px ring in the chamber colour, `object-fit: cover`; initials fallback mono 700 24px `--ptk-avatar-initials` |
| Name | 14.5px / 700, one line, ellipsis |
| Party + seat | flex, gap 6; party tag (mono 10px / 600, padding 1 5, radius 3, 1px `--ptk-party-border`, `--ptk-party-text`); seat mono 10px `--ptk-faint` (`CA-12` for House, `TX` for Senate) |
| Volume | mono 26px / 700, tracking -.03em, line-height 1 |
| Volume caption | 10.5px `--ptk-faint`, "disclosed volume, midpoints" |
| Split bar | full width, 6 tall, radius sm, track `--ptk-track`; buys share `--ptk-buy` left, sells `--ptk-sell` right |
| Buys / trades / sells | full width, space-between, mono 10.5px `--ptk-mute`; buy count in `--ptk-buy-text` 600, sell count ink 600, words in mute |
| Tickers | up to 3 chips, mono 9.5px, padding 2 6, radius sm, 1px `--ptk-chip-border`, gap 4, wrap |

Hover: border `--ptk-hair-strong`. Focus-visible: 2px `--ptk-focus` outline,
offset 2. Selected (member open): border and 3px halo in the chamber colour
at 100% and 12%.

## 5. Rail (380 wide, gap 14 between blocks)

| Block | Spec |
|---|---|
| Heading | mono 10px, tracking .16em, `--ptk-faint`, "HOUSE VS SENATE, LOADED WINDOW"; under it mono 10.5px tracking .06em `--ptk-faint`: `2026-06-14 TO 2026-09-26 · 600 DISCLOSURES` |
| Chamber cards | 2 columns, gap 12; padding 12 14, radius 10 (use lg if 10 is not a token); House on `--ptk-house-tint`, Senate on `--ptk-senate-tint`; label row mono 9.5px tracking .14em with a 7px dot and HOUSE / SENATE in the chamber text colour; figure mono 24px / 700 tracking -.02em; sub 11px `--ptk-mute`: `131 members · 412 trades` |
| Split rows | 4 rows, `grid-template-columns: 110px 54px minmax(0,1fr) 54px; gap 10`; label 11.5px `--ptk-mute`; House figure mono right-aligned; bar 6 tall radius sm, House share `--ptk-house` then Senate `--ptk-senate`; Senate figure mono |
| Footnote | 11px / 1.5 `--ptk-faint`: "{Chamber} trades more per member in this window. Volume is the sum of the midpoints of disclosed ranges." |
| Chart heading | mono 10px tracking .16em `--ptk-faint` "TRADES BY MONTH", right caption 11px `--ptk-faint` "counts, not dollars" |
| Chart | 352 x 110; 12 month groups; two bars per group, up to 14 wide with 2px between, radius 2; House `--ptk-house`, Senate `--ptk-senate`; one dotted midline `--ptk-hair` at 50%; baseline 1px at 20% ink; month labels mono 9.5px `--ptk-faint` centred, 3px above the bottom |
| Tickers heading | mono 10px tracking .16em `--ptk-faint` "MOST TRADED TICKERS" |
| Ticker rows | 5 rows, `grid-template-columns: 52px minmax(0,1fr) 30px; gap 10`; ticker mono 11.5px / 600; bar 6 tall `--ptk-bar` on `--ptk-track`, width relative to the first; count mono 11px `--ptk-mute` right |

## 6. Dense list

```
grid-template-columns: 36px minmax(0,2fr) 76px minmax(0,1.6fr) 60px 100px 90px minmax(0,1.2fr);
column-gap: 12px;
```

| Part | Spec |
|---|---|
| Top rule | 2px `--ptk-rule` |
| Head row | padding 8 0, mono 9.5px tracking .14em `--ptk-faint`, 1px `--ptk-hair` under; TRADES and LAST TRADE right-aligned |
| Row | 46 tall, `border-bottom: 1px dotted --ptk-dotted`, 12.5px |
| Rank | mono 12px `--ptk-faint`, zero-padded to two digits |
| Politician | 32px portrait with 2px chamber ring, gap 10; name 600 one line ellipsis; under it party tag + seat mono 10px `--ptk-faint` |
| Chamber | chip as on cards |
| Volume | mono 600 figure in a 58px right-aligned slot, gap 10, then a 6px bar `--ptk-bar` on `--ptk-track`, width = volume / first-ranked volume |
| Trades | mono, right |
| Buys / sells | mono 11.5px: buys in `--ptk-buy-text`, slash in `--ptk-faint`, sells ink |
| Last trade | mono `--ptk-mute`, right, ISO date |
| Top tickers | up to 3 chips, mono 10px, padding 2 6 |
| Footer | padding 12 0, 1px `--ptk-hair` above; left 11.5px `--ptk-faint` copy; right mono 10.5px `9 TO 184 OF 184 · SHOW ALL` with SHOW ALL a link in `--ptk-house-text` |

Hover `--ptk-row-hover`. Selected `--ptk-row-selected` plus `inset 3px 0 0`
in the chamber colour.

## 7. Member panel

As built today, with these additions. 480 wide, from 76px down, background
`--ptk-panel-bg`, `border-left: 1px --ptk-panel-border`, shadow
`--ptk-panel-shadow`, over `--ptk-scrim`.

- Identity: 96px portrait, 3px chamber ring; name 20px / 700; chamber chip;
  party tag + seat.
- Stat row: Trades, Buys, Sells, Volume, each mono 22px / 700 with a mono
  9.5px tracking .14em label; Volume's label reads `VOLUME, MIDPOINTS`.
- Trade activity chart and 10 most recent trades as today. Under the table a
  text button "Show all N trades" (12.5px / 600, `--ptk-house-text`) that
  expands in place; label becomes "Show fewer".
- Trades most like: portraits 40px with chamber ring.
- Government contractors: caption `FY{year} awards`; loading = three
  skeleton rows; empty = "No top federal contractors among the tickers
  traded, FY{year}."; failed = "Contract data is unavailable right now."
- Compliance note at the bottom, 11px `--ptk-faint`.
- Phone: full width from the top, pinned header, Back still closes.

## 8. Type scale

| Use | Font | Size / weight | Tracking |
|---|---|---|---|
| Title | Jakarta | 32 / 700 | -.025em |
| Gallery heading | Jakarta | 16 / 700 | |
| Card name | Jakarta | 14.5 / 700 | |
| Body, rows | Jakarta | 12.5 / 400 to 600 | |
| Captions | Jakarta | 10.5 to 11.5 / 400 | |
| Card volume | Mono | 26 / 700 | -.03em |
| Rail chamber figure | Mono | 24 / 700 | -.02em |
| Panel stat | Mono | 22 / 700 | |
| Rank badge | Mono | 12 / 700 | |
| Figures in rows | Mono | 12.5 / 600 | |
| Mono-caps labels | Mono | 9.5 to 10.5 | .14em to .18em |
| Eyebrow | Mono | 10.5 | .18em |
| Ticker chips | Mono | 9.5 to 10 | |

## 9. Responsive

| Width | Change |
|---|---|
| 1440 | As drawn |
| 1200 | Gallery 4 columns still; rail 340; ticker chips in the list drop to 2 |
| 1000 | Rail stacks under the gallery (its own 2-column layout: cards + split rows left, chart + tickers right); gallery 2 columns; toolbar wraps to two rows; list hides TOP TICKERS |
| 640 | Gallery 1 column with the card as a horizontal layout (portrait 64 left, text right); list hides BUYS / SELLS, DISCLOSED VOLUME bar (figure stays) and LAST TRADE; panel full width |
| 375 | Builder pill full width with 16 gutters; segmented controls scroll horizontally inside their row, never the page; tap targets 44 |

No horizontal page scroll at any width.

## 10. Fixture (sample data, placeholders)

Names are `[Member name]`. Seats, tickers and counts are illustrative; the
fixture is served only when live feeds are off, with the SAMPLE DATA chip.

| Rank | Chamber | Party | Seat | Volume | Trades | Buys | Sells | Last | Tickers |
|---|---|---|---|---|---|---|---|---|---|
| 1 | House | D | CA-12 | $4.8M | 42 | 26 | 16 | 2026-09-24 | NVDA MSFT AAPL |
| 2 | Senate | R | TX | $3.1M | 18 | 5 | 13 | 2026-09-22 | XOM LMT |
| 3 | House | R | FL-19 | $2.6M | 27 | 15 | 12 | 2026-09-19 | AMZN NVDA TSLA |
| 4 | House | D | NY-14 | $1.9M | 11 | 9 | 2 | 2026-09-18 | LMT RTX |
| 5 | Senate | I | VT | $1.4M | 9 | 4 | 5 | 2026-09-15 | VTI AAPL |
| 6 | House | D | IL-07 | $960K | 14 | 8 | 6 | 2026-09-12 | AAPL GOOGL |
| 7 | Senate | D | WA | $820K | 7 | 3 | 4 | 2026-09-11 | MSFT AMZN BA |
| 8 | House | R | OH-04 | $610K | 12 | 7 | 5 | 2026-09-09 | CAT DE |
| 9 | House | D | TX-35 | $540K | 6 | 6 | 0 | 2026-09-05 | NVDA |
| 10 | Senate | R | UT | $470K | 8 | 2 | 6 | 2026-09-02 | JPM GS V |
| 11 | House | R | GA-14 | $390K | 5 | 3 | 2 | 2026-08-30 | TSLA PLTR |
| 12 | House | D | MA-04 | $330K | 9 | 4 | 5 | 2026-08-28 | UNH PFE |
| 13 | Senate | D | CO | $290K | 4 | 2 | 2 | 2026-08-25 | COST HD |
| 14 | House | R | NC-08 | $240K | 7 | 5 | 2 | 2026-08-21 | META AMZN |
| 15 | House | D | AZ-07 | $190K | 3 | 3 | 0 | 2026-08-19 | SPY |
| 16 | Senate | R | MT | $160K | 5 | 1 | 4 | 2026-08-14 | NEE DUK |

Chamber totals used on the board: House 131 members, 412 trades, $21M;
Senate 53 members, 188 trades, $15M; window 2026-06-14 to 2026-09-26, 600
disclosures, 184 members. Most traded: NVDA 48, AAPL 41, MSFT 36, LMT 22,
XOM 19. Monthly counts (Oct to Sep) House 36 44 52 40 58 50 62 46 54 60 42
28, Senate 20 24 30 18 32 26 36 22 28 34 20 14. Volumes are fixture midpoint
sums; the real page computes them from `amountBand.mid`.

## 11. New model functions (tracker-model.js, pure, tested)

```js
rankMembers(members, sortKey = 'volume')   // -> [{...member, rank, pctOfFirst}] sorted per 02-INTERACTIONS
loadedWindow(trades)                        // -> { from: ISO, to: ISO, count } or null when empty
filterMembers(members, { chamber, party, side, query })
topTickers(trades, n = 5)                   // -> [{ ticker, count }] excluding null tickers
```

`pctOfFirst` is `volume / first.volume` rounded to a whole percent; null when
the first has zero volume. Nothing else in the page computes.
