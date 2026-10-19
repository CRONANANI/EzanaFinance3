# Prediction Markets, measured spec

All sizes in px unless noted. Colours are `03-TOKENS.css` names. Every number
in the UI is `--pmk-mono` with `font-variant-numeric: tabular-nums`; every
question, name, label and paragraph is `--pmk-sans`. Max two weight levels per
card (600 for titles and key values, 400 or 500 for the rest).

## 1. Page grid

| Property            | Desktop 1440                        | Tablet 768        | Mobile 375 |
| ------------------- | ----------------------------------- | ----------------- | ---------- |
| Content max width   | 1392                                | fluid             | fluid      |
| Side gutter         | 24                                  | 24                | 16         |
| Card gap (row, col) | 24                                  | 24                | 16         |
| Columns             | 12                                  | 1 (cards stack)   | 1          |

Row spans at 1440: Pulse 12 · Chart 8 + Movers 4 · Edge 12 · Traders 7 + Map 5
· Closing 6 + Conviction 6 · Table 12 · Legislation 12 · Sign-up 12.

Breakpoints: below 1200 Chart/Movers and Traders/Map stack; below 1100
Closing/Conviction stack; below 900 everything is one column and Pulse tiles go
2 x 2; at 640 and below the mobile rules in section 13 apply. No horizontal page
scroll at any width; wide content scrolls inside its own box.

Paired cards in a row stretch to equal height (`align-items: stretch`), and
each card's footer pins to the bottom (`margin-top: auto`).

## 2. Header

- Top padding 28, bottom 20. Two blocks, wrapping: left `flex: 999 1 520px`,
  right `flex: 1 1 260px`, right block right-aligned on desktop.
- Kicker: eyebrow, `--pmk-mute`, margin-bottom 10.
- Title: 1.875rem / 700, tracking -0.02em, line-height 1.15, `--pmk-ink`.
  Mobile 1.5rem.
- Lead: 14 / 1.6, `--pmk-mute`, max-width 680, margin-top 10.
- Right: `Odds as of` 12 mono `--pmk-mute` with the time in `--pmk-ink`; under
  it, gap 10, the two venue chips (section 3.4).

## 3. Filter bar and primitives

### 3.1 Bar

Sticky under the shared chrome. Full bleed: negative side margins equal to the
gutter, padding 12 and the gutter. Background `--pmk-bg`, 1px `--pmk-card-rule`
top and bottom, `--shadow-sm`. Margin-bottom 24. One row on desktop
(`flex-wrap: wrap`, gap 12): chips take `flex: 1 1 auto` and scroll
horizontally if they overflow; the controls group sits right.

### 3.2 Category chip `.pmk-chip`

Min-height 32 (44 inside the mobile sheet), padding 0 12, radius 4, 1px
`--pmk-card-border`, transparent, 13 / 500 `--pmk-mute`, gap 6 to a mono 11
count in `--pmk-faint`. Hover: border `--pmk-card-border-hover`, text ink.
Selected: background `--pmk-selected-bg`, border `--pmk-accent`, text and
count `--pmk-accent-text`.

### 3.3 Segmented `.pmk-seg`

Container padding 2, gap 2, 1px border, radius 8. Buttons 28 tall, padding
0 10, radius 4, 12 / 600 `--pmk-mute`; selected `--pmk-selected-bg` with
`--pmk-accent-text`. The `--mono` variant sets the buttons in mono (window and
range controls).

### 3.4 Venue chip `.pmk-venue`

20 tall (18 inside rows, 10px text), padding 0 7, radius 4, 1px border,
11 / 600 `--pmk-body`, a 7px dot (`--pmk-poly` or `--pmk-kalshi`) gap 5.

### 3.5 Change pill `.pmk-pill`

22 tall (20 in rows), padding 0 7, radius 4, mono 12 / 600. Up: `--pmk-up` on
`--pmk-up-bg` with `bi-arrow-up-right`; down: `--pmk-down` on `--pmk-down-bg`
with `bi-arrow-down-right`. Text always signed: `+8.0 pts`, `-6.0 pts`.

### 3.6 Confidence chip `.pmk-conf`

22 tall, padding 0 8, radius 4, 11 / 600, 1px border. High / Medium / Low per
the tokens. Text label always present (colour is never the only signal).

### 3.7 Search

36 tall pill (`border-radius: 9999px`), 1px border, transparent fill, padding
0 14, min-width 220, `bi-search` 14 in `--pmk-mute`, input 13px.

## 4. Card skeleton `.pmk-card`

Fill `--pmk-card-bg`, 1px `--pmk-card-border`, radius 12, padding 24,
`--pmk-card-shadow`. Hover: fill and border to the hover tokens over 0.2s, no
transform. Header `.pmk-head`: flex, space-between, wrap, gap 12; padding-bottom
14, margin-bottom 16, 1px `--pmk-card-rule` under it. Title 1rem / 600 tracking
-0.01em `--pmk-ink`; subtitle 11 mono 600 uppercase .08em `--pmk-mute`,
margin-top 4. Subtitles state the active filters, e.g. `ELECTIONS · ALL VENUES
· 24H`.

Tabs `.pmk-tabs`: gap 20, rule under, buttons 13 / 600, padding 8 0 10, 2px
bottom border, selected ink with `--pmk-accent` underline.

## 5. Card 1, Market Pulse

- Padding 20 24. Four tiles, `grid-template-columns: repeat(4, 1fr)`, gap 12
  (2 x 2 below 900).
- Tile: 1px `--pmk-card-rule`, radius 8, padding 14 16, column gap 8, min
  height 118.
- Tile kicker eyebrow; value 1.5rem / 700 mono line-height 1.1.
- **Open markets**: value, then a 6px split bar (two segments, 2px gap, radius
  4) flexed by Polymarket and Kalshi counts, then a mono 11 legend row with
  dots.
- **Volume traded · {window}**: two halves separated by a 1px rule, each a
  1.25rem / 700 mono value with an 11px label (`Polymarket, USD` / `Kalshi,
  contracts`), then the 11px faint note.
- **Biggest mover · {window}**: change pill (14px, 26 tall), 88 x 26
  sparkline of 8 points (1.5px stroke, up or down colour), probability 13 / 600
  right; question 12px single-line ellipsis. Whole tile is a button.
- **Closing this week**: count, then 7 bars 7 wide, gap 3, max 28 tall, radius
  2, height proportional to the day count; today `--pmk-accent`, others
  `--pmk-volume-bar`; mono 11 note `Next 7 days · peak Thu 31`.

## 6. Card 2, Price Chart (hero)

- Radius 16. Column layout.
- **Toolbar** (margin-bottom 14): left kicker `PRICE CHART`, 32px icon button
  (prev), the switcher chip `7 / 8 Movers` with a chevron, 32px icon button
  (next); right the range segmented control 1D 1W 1M All (mono).
- **Header** (padding-bottom 16, rule, margin-bottom 16): question 1.25rem / 600
  tracking -0.02em line-height 1.3, max two lines; under it the venue chip and
  a mono 12 meta line (`24h vol $552K · Vol $9.3M · Closes Oct 27, 2026`).
  Right: probability 2rem / 700 mono with the `%` at 1.125rem `--pmk-mute`; the
  change pill for the range under it.
- **Plot**: height 300 (mobile `aspect-ratio: 16 / 10`), left gutter 40 for
  y labels (mono 11 faint at 0, 25, 50, 75, 100%). y fixed 0 to 100%.
  Gridlines at 25/50/75 `--pmk-grid`; top and bottom rules `--pmk-card-border`.
  Line 2px `--pmk-line`, round joins; area fill `--pmk-area`. Live end dot 8px
  with a 4px `--pmk-selected-tint` halo.
- **Annotations**: 9px diamond (rotated square, 1.5px stroke in up or down
  colour, filled `--pmk-bg`), label above it mono 11 / 600 in the same colour on
  a `--pmk-bg` chip with 1px border.
- **Volume histogram**: 36 tall under the plot, bars flex evenly, gap 3,
  radius 2 2 0 0, `--pmk-volume-bar`; the hovered period's bar `--pmk-line`.
- **x axis**: mono 11 faint, day labels at midnight ET for 1W, hours for 1D,
  dates for 1M, months for All.
- **Caption**: 12px `--pmk-mute`, the accessible summary sentence.
- **Hover**: dashed 1px `--pmk-mute` vertical, dashed horizontal in
  `--pmk-annotation`, 10px dot with 2px `--pmk-bg` ring, tooltip 150+ wide
  (radius 8, 1px `--pmk-card-border-hover`, `--shadow-lg`, padding 8 10):
  mono 11 timestamp, mono 18 / 700 value, mono 11 change vs prior point, mono
  11 faint volume. A y-axis flag (mono 11 / 600 on `--pmk-line`) marks the
  value.
- **Multi-outcome**: header right shows `4 OUTCOMES SHOWN` and a legend (12px
  line swatches). Plot right gutter 96 for end labels `Bolsonaro 78.7%` mono
  11 / 600 in the line colour. Colours: `--pmk-line`, `--pmk-outcome-2`,
  `--pmk-outcome-3`, `--pmk-outcome-other` dashed 4 3.
- **Footer** (pinned, padding-top 14, rule): left `Source: Polymarket`, mono
  `Updated 14:05:12 ET`, mono `Bid 28 · Ask 29 · Spread 1 pt`, all 12px faint;
  right the outbound link with `bi-box-arrow-up-right`.

## 7. Card 3, Movers

- Header right: segmented `Biggest moves | Most traded`.
- 8 rows, list bleeds 8px into the card padding. Row is a button: grid
  `18px 1fr 64px 76px`, gap 10, padding 9 8, radius 8, height 62 (reserve it).
- Rank mono 12 faint right-aligned. Question 13 / 500 ink, line-height 1.35,
  2-line clamp; under it (gap 4) the small venue chip, the window volume mono
  11 faint, and when hot `bi-fire` 11 + `Hot` 11 / 600 in `--pmk-hot`.
- Sparkline 64 x 24, 24 points, 1.5px, up or down colour, `aria-hidden`.
- Right column: probability mono 14 / 600, change pill (20 tall, 11px) under it.
- Loaded row: background `--pmk-selected-tint`, `aria-current="true"`.
- Footer (pinned, rule): hot legend left, `Select a row to chart it` right,
  11px faint.

## 8. Card 4, Edge Board

- Header: title, subtitle `PRICE VS REFERENCE · NET OF HALF THE SPREAD`; right
  the Gap/Confidence segmented control and the `High only` toggle (a 26 x 14
  switch drawn inside the chip, `aria-pressed`).
- Tabs, then the method line 13px `--pmk-mute` (margin -4 0 16).
- Column heads: eyebrow at 10px, padding 0 12 8, rule under. Same columns as
  rows.
- Row: flex, gap 10 16, padding 12, 1px rule under, wraps on mobile.

| Column       | Width             | Content                                                                    |
| ------------ | ----------------- | -------------------------------------------------------------------------- |
| #            | 22                | mono 12 faint                                                              |
| Market/Event | flex 2.2, 280 min | question 13 / 500, 2-line clamp; meta line 11px faint (see below)          |
| Implied/Poly | 64 right          | mono 13                                                                    |
| Model/Kalshi | 64 right          | mono 13 / 600 ink                                                          |
| Track        | flex 1.2, 160 min | dumbbell, see below                                                        |
| Net gap      | 70 right          | mono 14 / 700; Tab A signed and coloured up/down, Tab B unsigned ink       |
| EV% / Match  | 64 right          | Tab A signed EV% one decimal; Tab B `3/3`                                  |
| Confidence   | 82                | `.pmk-conf`                                                                |
| Expand       | 28                | icon button, chevron rotates 180deg when open                              |

- Meta line: Tab A venue chip + `Structural estimate`; Tab B three-bar match
  indicator (2px bars 4, 6, 9 tall, filled `--pmk-accent` up to the score) +
  `Matched event · same date, same outcome`.
- **Dumbbell**: 20 tall. Track 2px `--pmk-card-border` full width at 0 to
  100%, 10px tick at 50%. Connector 4px between the two values: Tab A
  `--pmk-up` when model > implied, `--pmk-down` when below; Tab B
  `--pmk-volume-bar`. Dots 12px: Tab A market hollow (2px `--pmk-mute` ring on
  `--pmk-bg`), model filled `--pmk-accent`; Tab B Polymarket ring
  `--pmk-poly`, Kalshi filled `--pmk-kalshi`. `role="img"` with an aria-label
  naming both values.
- Legend under the list, 11px: the two dot styles and `High 4+ pts · Medium 2
  to 4 · Low 1 to 2 · under 1 pt not shown`.
- **Expansion**: margin 0 12 14 50, padding 14 16, 1px border, radius 8.
  Left (flex 1 1 380): kicker `THE MATH`, five mono 12 lines on a
  `104px 76px 1fr` grid: label (uppercase 11 `--pmk-mute`), value (600 ink,
  right), working (faint). Tab A lines: Implied, Reference, Half spread, Net
  gap, EV%. Tab B: Polymarket, Kalshi, Half spreads, Net gap, Match. Right
  (flex 1 1 240): kicker `LIQUIDITY`, mono 18 / 700 value + mono 11 note, a 6px
  bar, one-sentence reading 12px, links `Chart this market` and `How we
  calculate this`.
- **Signed-out gate**: the expansion renders underneath an absolutely
  positioned veil (`--pmk-gate-veil`, `backdrop-filter: blur(6px)`, radius 8)
  with `bi-lock`, `Sign up free to open the math` 15 / 600, one 12px line, and
  the two buttons. Rows themselves are never gated.
- **Empty**: dashed 1px border box, min-height 240, centred: an illustration
  of the dumbbell with both dots overlapping at the same value (180 wide), then
  the two-line message.
- Footer: educational line 11 faint left, `How we calculate this` right.

## 9. Card 5, Top Traders

- Header without a rule, then tabs `● Polymarket` `● Kalshi` (venue dots).
- Controls row, gap 10: Polymarket window segmented (Day Week Month All), rank
  by (Profit Volume), category chip in selected style labelled `{Category}
  from page filter`. Kalshi: a disabled chip `30d Kalshi publishes a 30-day
  leaderboard`, then rank by.
- Column heads eyebrow 10px: `#`, `Trader` (indented 44), `PnL`, `Volume`,
  `PnL / volume`; Kalshi `#`, `Trader`, `Projected PnL` or `Volume`.
- Row: flex gap 12, padding 8, min-height 52 (reserve 53 with the rule).
  - Medal 22 circle, mono 11 / 700: rank 1 solid `--pmk-accent` with
    `--pmk-bg` text; 2 and 3 `--pmk-selected-bg` with `--pmk-accent-text` and
    an emerald border; 4+ plain faint number.
  - Avatar 32 circle, 1px border: profile image when present, else a 3 x 3
    mirrored identicon seeded by the wallet in one of blue, emerald, purple,
    orange.
  - Name 13 / 600 (wallet in mono when there is no username), verified
    `bi-patch-check-fill` 14 in `--pmk-poly`, X handle chip `X @handle`.
    Under the name, when a username exists, the truncated wallet
    `0x60a9…5a71` mono 11 faint + copy button (`bi-copy` 11).
  - PnL 92 right mono 13 / 600 `--pmk-up` (or `--pmk-down` if negative),
    signed with `+`.
  - Volume 92 right mono 12 `--pmk-mute`.
  - Efficiency 104: 6px track, bar `--pmk-accent` at `min(1, eff / 0.5)`,
    then mono 11 `48.6%`. `role="img"`, label `PnL is 48.6% of volume`.
  - Expand 28 (Polymarket only).
- Kalshi value: mono 13 / 600 ink, plain number with one decimal, **no
  currency symbol** until units are confirmed (`06-DATA.md`).
- **Expansion**: margin 0 8 12 46, padding 12 14, 1px border, radius 8. Kicker
  `TOP 3 OPEN POSITIONS BY SIZE`, then three rows (padding 7 0, rule on top):
  question 13px ellipsis (link, loads chart), side chip 44 wide mono 11 / 700
  bordered, size mono 13 / 600 84 right, `avg 88.0` mono 11 faint 64 right.
  Signed out: the same veil as the Edge Board with `Sign up free to see open
  positions`.
- Footer: Kalshi footnote (Kalshi tab only) and the rankings line, 11 faint.
- Mobile: Volume and efficiency columns hide.

## 10. Card 6, Category Map

- Header right: venue segmented `Polymarket | Kalshi | Both`, default
  Polymarket.
- Treemap 440 tall, squarified (`squarify()` in the model) over volume in the
  window. Each tile is a button with 2px inset gap; the inner box has radius 8
  and a 1px `--pmk-card-border`, selected 2px `--pmk-accent`.
- Fill: a solid layer `--pmk-firming` (avg move >= 0) or `--pmk-fading`, at
  opacity `0.10 + min(|move|, 3) / 3 x 0.38`. Text sits above the layer.
- Large tile (w > 96 and h > 72): padding 12, name 14 / 600, volume mono 12
  `--pmk-body`, bottom row `{n} mkts` mono 11 `--pmk-mute` and the move mono
  11 / 700 in up/down colour. Small tile: padding 6 8, name 11 / 600 only.
- aria-label per tile: `Elections, $121M, 218 markets, average move up 3.2
  points`.
- Legend row: `Fading` + six-step swatch (3 red, 3 emerald, opacities .55 .3
  .12 .12 .3 .55) + `Firming` + mono `±3 pts`; right `Select a tile to filter
  the page · Polymarket volume in USD` (or `Kalshi volume in contracts`, or
  `Kalshi counted at $1 per contract` for Both).
- Mobile: a 28 tall stacked bar (segments flex by volume, gap 2, opacity +0.15)
  and a list of 44 tall row buttons: swatch, name, volume, count, move.

## 11. Card 7, Closing Soon

- Header right: a 72 x 8 four-step swatch `Near 50% → Decided`.
- Callout (margin-bottom 16): 1px `--pmk-card-border-hover`, radius 8, padding
  12 14. Title row `bi-signpost-split` in `--pmk-hot`, `This week's most
  uncertain` 13 / 600, `closest to 50%` mono 11 faint. Three row buttons in a
  3-column grid (1 on mobile): dot, question 12 ellipsis, probability mono 12
  / 700, day mono 10 faint.
- Timeline: `grid-template-columns: repeat(7, minmax(0, 1fr))`, gap 6; on
  mobile `minmax(124px, 1fr)` inside a horizontal scroll box.
- Day column: padding 8 6, radius 8, 1px `--pmk-card-rule`, min-height 300.
  Today: `--pmk-selected-tint` fill, `--pmk-selected-bg`-strength border, label
  `TODAY` in `--pmk-accent-text`. Head row: day `MON 19` mono 11 / 700 .06em
  and the count mono 11 faint, rule under.
- Pill: a button, padding 6 7, radius 4, 1px border, overflow hidden, with a
  solid `--pmk-decided` layer at opacity `0.06 + |p - 0.5| / 0.5 x 0.5`.
  Question 11 / 1.3 2-line clamp; then a 6px venue dot and probability mono
  12 / 700.
- Three pills per day, then `+N more` link 11px pinned to the column bottom.

## 12. Card 8, Price Conviction

- Header: title, subtitle `LIQUIDITY VS SPREAD · {window} · {n} MARKETS`,
  explainer 13px `--pmk-mute`.
- Plot 320 tall, left gutter 44, left and bottom axis rules. x log scale $1K to
  $10M (ticks $1K $10K $100K $1M $10M, mono 11 faint); y spread 0 to 10+ pts
  (ticks every 2, top tick `10+`).
- Trust zone: liquidity >= $250K and spread <= 2 pts, filled `--pmk-trust-zone`,
  label `Deep and tight: prices worth trusting` 11 / 600 `--pmk-accent-text`
  above it, right-aligned. `Thin and wide: treat with care` 11 / 600 muted at
  top-left.
- Dots: diameter 6 to 18 by window volume (sqrt scale), colour by category
  group: Politics and Elections `--pmk-poly`, Sports `--pmk-outcome-2`,
  Crypto `--pmk-kalshi`, Other `--pmk-mute`; fill at 0.55 opacity with a 1.5px
  ring. Kalshi dots are hollow and plotted on volume (no liquidity field).
- Hover: 20px ring on the dot and a 210 wide tooltip: question 12 / 600, then
  three mono 11 columns Prob, Liq (or Vol), Spread.
- Footer: category legend, `Kalshi: volume on x` with a hollow dot, `Dot size:
  7d volume` right.

## 13. Existing sections and mobile

- **Open markets table**: card with title `Open markets`, subtitle `SOURCE:
  POLYMARKET, KALSHI · 2,808 OPEN`, right an emerald chip `Category: {x}` with
  a clear button and `Sorted by volume`. Head cells eyebrow 11, padding 10 12,
  rule; cells 13px padding 12, rule; row hover `--pmk-card-bg-hover`.
  Probability and volume right-aligned mono, probability 600 ink; Kalshi volume
  as `1.24M ct`. Footer `Showing 7 of 2,808` mono 12 faint + `View all open
  markets`. Mobile: stacked rows (question, then chip, probability, volume,
  close date right).
- **Legislation markets**: card, subtitle `BILLS PAIRED WITH MARKETS ·
  STRUCTURAL ESTIMATE VS MARKET`, `How we calculate this` right. Populated:
  table Bill (mono), Market, Model, Market, Confidence. Empty: 44px icon tile
  (`bi-bank`, emerald tint), 15 / 600 heading, one sentence, two links; beside
  it a dashed box at 60% opacity drawing one example pair row. Educational
  line at the foot either way.
- **Sign-up band**: 1px `--emerald-border`, `--pmk-selected-tint` fill, radius
  16, padding 28 32 (20 mobile). Kicker `FREE ACCOUNT` in accent text, 1.25rem
  / 600 title, 14px line, buttons right (primary + ghost, 40 tall, radius 8).
- **Mobile (375)**: header stacks; filter bar keeps only the scrolling chips and
  a `Filters` chip with a count; the bottom sheet (radius 16 16 0 0, 36 x 4
  grabber, padding 10 16 20) holds search, venue and window as full-width
  44-tall segments, category chips wrapped, then `Reset` and `Show N markets`.
  Chart keeps 16:10. Edge rows wrap: question full width, then values with
  inline `IMPLIED` / `MODEL` labels, dumbbell, gap, chip. Treemap becomes the
  stacked bar. Closing Soon scrolls horizontally inside its card.

## 14. Loading, empty and error per card

Loading skeletons reserve the final size: Pulse four tiles of four bars;
Chart header bars, a 300 block and a 36 strip; Movers 8 rows of 62; Edge 4
rows of 64; Traders 10 rows of 53 with circles; Map a 3 x 3 grid of five
blocks; Closing a 72 callout and 7 columns of three 44 pills; Conviction 14
ghost dots in the plot frame. Empty and error states use a 1px dashed
`--pmk-card-border` box at the card's default body height so the page never
jumps. Exact copy in `01-BRIEF.md`; examples per card in `07-wireframe/States-*`.
