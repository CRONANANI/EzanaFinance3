# Committee Assignments, measured spec

All sizes in px unless noted. Colours are `03-TOKENS.css` names. Numbers,
tickers, dates and committee codes are `--cmx-mono` tabular; prose and names
are `--cmx-sans`. Reference boards: `08-wireframe/Cmx-Main.dc.html` (1440
dark; light and phone via its props), the per-card `Cmx*.dc.html` files, and
the `States-Cmx*` boards for every state.

## 1. Page grid

| Property          | Desktop 1440 | Phone 390 |
| ----------------- | ------------ | --------- |
| Content max width | 1392         | fluid     |
| Side gutter       | 24           | 16        |
| Card gap          | 28 vertical, 24 in a row | 20 |

Spans: Glance 12 · Atlas 8 + Gavels 4 · Profile 12 · Oversight 7 + Seat Load
5 · Trades 12 · Matrix 7 + Hearings 5 · Lookup 12. Below 1100 pairs stack.
Paired cards stretch to equal height; footers pin with `margin-top: auto`.
No horizontal page scroll at any width.

## 2. Header and controls

- Header: kicker eyebrow, title 1.875rem / 700 (1.5rem phone), lead 14 / 1.6
  `--cmx-mute` max-width 720, `Rosters as of {date}` mono 12 right.
- Sticky controls: full-bleed hairlines, padding 12 + gutter, one wrapping
  row, gap 12: view segmented (Committees | Members), chamber segmented,
  party segmented (mono), sector chips 28 tall scrolling, search pill 36
  tall min-width 220 right. Phone: chamber chips 36 tall + Filters chip and
  the bottom sheet.

## 3. Card skeleton and shared pieces

`.cmx-card`: fill `--cmx-card-bg`, radius 12, padding 24, no border, no
shadow. `.cmx-head`: padding-bottom 14, margin-bottom 16, 1px
`--cmx-head-rule`; title 1rem / 600; mono uppercase subtitle restating the
scope. Shared pieces:

| Piece        | Spec                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Avatar       | circle, `--cmx-avatar-bg` + 1px `--cmx-input-border`, initials 600; 52 (lookup), 32 (gavels), 26 (roster, seat load), 22 (trade rows) |
| Party tag    | min 18 x 18, radius 4, 1px `--cmx-party-border`, mono 10 / 600 `--cmx-party-ink`; identical for D, R, I |
| Code chip    | 20 tall, radius 4, mono 11 / 600, 1px `--cmx-code-border`; selected variant emerald                 |
| Ticker chip  | 20 tall, emerald set                                                                                |
| Lead badge   | 18 tall, radius 4, 10 / 700 uppercase, `--cmx-lead-bg` / `--cmx-lead-ink`; text Chair or Ranking    |
| Sector chip  | 22 tall, radius 4, 11 / 600, `--cmx-sector-bg`                                                      |
| Split bar    | 6px (10px in Glance), radius 4, 1px gap; majority `--cmx-majority`, minority `--cmx-minority`; always beside text labels with mono counts |
| Side pill    | 20 tall, mono 10.5 / 700; BUY on `--cmx-buy-bg` / `--cmx-buy`, SELL on `--cmx-sell-bg` / `--cmx-sell` |

## 4. The ten cards

### 4.1 Congress at a Glance (12)

Padding 20 24. Four KPI tiles + the split tile, `repeat(5, 1fr)` gap 12
(1-up phone). Tile: `--cmx-tile-bg`, radius 8, padding 14 16, min-height 92;
kicker 10; value 1.5rem / 700 mono; note 11 `--cmx-faint`. Split tile: 10px
bar + legend row with swatches and mono counts.

### 4.2 Committee Atlas (8)

Three chamber groups, each a kicker row (name left, `N committees · N
subcommittees` mono right) over a 4-column grid, gap 8 (1-col phone). Tile:
`--cmx-tile-bg`, radius 8, padding 12 14, 1px transparent border; 55+ seats
spans 2 columns at 13px name, else 12px. Contents: name ellipsis + code
chip; split bar; `N seats · N sub` mono 10 + up to 2 sector chips (18 tall,
10px) with `+N`. Unmapped tiles at 72% opacity, no chips. Hover border
`--cmx-head-rule`; selected 1px `--cmx-accent` border + `--cmx-selected-tint`
fill + emerald code chip. A `+N more` tile per group expands in place.
Footer: the select hint and the sector note, 11 `--cmx-faint`.

### 4.3 Gavels (4)

Chairs/Ranking segmented right. 9 rows, min-height 52, padding 8: avatar
32, name 13 / 600 + party tag + state mono 10, committee line 11
`--cmx-mute`, code chip right. Footer: lookup hint + `All 49 committees`
link.

### 4.4 Committee Profile (12)

Header row: committee name 1.125rem / 600 + emerald code chip + chamber
chip; subtitle `COMMITTEE PROFILE · N SEATS · N SUBCOMMITTEES`; `Official
site` outbound link right. Body two blocks, gap 24, wrapping:

- Left (1 1 320): jurisdiction paragraph 13 / 1.6; `OVERSEEN SECTORS`
  kicker + chips + the sector note 11 faint; `SUBCOMMITTEES` kicker + chips
  28 tall (Full committee first, selected emerald) that swap the roster;
  pinned trades strip: tile with count 1.25rem / 700 mono + sentence +
  chevron, linking to Card 7 filtered.
- Right (1.4 1 420): two facing columns (1-col phone), each headed by a
  side swatch + name + `N seats` mono over a rule; rows min-height 42: rank
  mono 10 right-aligned (16 wide), avatar 26, name 12.5 / 500, party tag,
  state mono 10, lead badge on rank 1. `All N members` link under each
  column expands in place.

### 4.5 Oversight Map (7)

Two fixed 198px columns (committees left, sectors right) with an SVG layer
between drawing cubic links. Rows 27 min-height, 11.5px labels, mono
9.5 meta (code left, `N com.` right). Idle links `--cmx-bar` at 18%
opacity, 1px; the hovered or focused side turns its links `--cmx-accent`
at 75%, 1.6px, and tints the connected rows `--cmx-selected-tint` with ink
labels. The wireframe pins Tech hovered. Sector click sets the page filter;
committee click loads Card 4. Footer: the sector note + the inherit note,
11 faint. Phone: the map becomes two stacked chip lists with counts; links
are not drawn.

### 4.6 Seat Load (5)

Histogram: 10 bars (1..9, 10+), max height 118, gap 6, `--cmx-bar` at 75%,
count mono 9.5 above each bar, x labels mono 9.5; caption sentence 11.5.
Then `MOST SEATS HELD` kicker over 5 rows: avatar 26, name, party tag,
state, 64px mini bar vs rank 1, count mono 13 / 700.

### 4.7 Trades in Overseen Sectors (12)

Header right: side segmented (All | Buys | Sells) + committee chip. Body
two blocks, gap 24: summary (1 1 240): tile with `TRADES IN WINDOW` kicker,
count 1.75rem / 700 mono, buy/sell split bar 8px, legend with mono counts;
below, two quiet lines (members traded, unmapped count); the footnote
pinned at the bottom. Feed (2.4 1 520): table, head eyebrow 11, rows:
date mono 11.5, member cell (avatar 22, name ellipsis 150 max, party tag,
state), side pill, ticker chip, range mono right (as disclosed), sector 12,
code chip. Footer `1 to N of N` mono + `View all in the window` link.
Phone: the table becomes stacked rows.

### 4.8 Committee Holdings Matrix (7)

Grid `150px repeat(7, 1fr)`, gap 3, min content width 640 in a horizontal
scroll box. Column heads mono 10 centred (tickers); row labels 11.5 / 500
ellipsis. Cell 30 tall radius 3: `--cmx-heat` layer at `heatScale` opacity,
count mono 10.5 / 700 inside when above zero, ink flipping dark past 0.5.
Pinned hover example tile: `SSAS × LMT · 6 members hold it`, buyers and
sellers since 180 days with buy/sell colours, holder names +N. Header
right: `Holdings inferred from disclosures` mono 10.5 faint; footnote at
the foot. Phone: ranked list per committee (top tickers with counts).

### 4.9 Hearings (5)

Default (ships first): centred message block (calendar icon 20, heading
15 / 600 `Hearing schedules are not available yet.`, detail 13, link
`Open the committee profile`) over a ghost timeline at 35% opacity (5 day
rows: mono day label 9.5 `--cmx-ghost` + dashed 34-tall slot). Future
state (gated on `hearingsAvailable`): day rows, each a tile row: code
chip, title 12.5 ellipsis, optional bill ticker chip, time mono 10.

### 4.10 Member Lookup (12)

Header right: the shared search pill, min-width 260. Body two blocks, gap
24: identity and seats (1.3 1 380): avatar 52, name 1.125rem / 600 + party
tag + `CA-12` mono 11, meta line 12; `Open in Politician Tracker` link
right; `SEATS` kicker + chips 30 tall (code mono 10 faint, name, `#rank`
mono, lead badge when titled). Timeline (1 1 360): kicker +
`38 trades · 5 unmapped` mono 11; 72-tall dot field over a baseline rule,
dot per trade, `--cmx-buy` or `--cmx-sell` at 75% opacity, diameter 5 to 14
by `rangeDotSize`; month labels at the ends mono 9.5; legend (Buy, Sell,
`Size: disclosure range`); the footnote pinned at the bottom.

## 5. Sign-up band and footer

Band: 1px `--emerald-border`, `--cmx-selected-tint` fill, radius 16,
padding 28 32 (20 phone): kicker `FREE ACCOUNT`, title `Follow the
committees that move your sectors` 1.25rem / 600, line 14, primary + ghost
buttons. Footer: the source line and the sector note, `.cmx-legal` 11
faint.

## 6. States

Every card ships loading (shape-matched shimmer), populated,
filtered-to-empty naming the live filters, and error with per-card Retry,
sized to the populated card so nothing jumps. Profile and Lookup use
select prompts as their empty states. Hearings' default IS its
not-yet-available state, with the populated layout on its states board as
the future state. Visuals per card in `States-Cmx*`.
