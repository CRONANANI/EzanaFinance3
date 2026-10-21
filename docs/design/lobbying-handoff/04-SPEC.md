# Lobbying Activity, measured spec

All sizes in px unless noted. Colours are `03-TOKENS.css` names. Every number
is `--lbx-mono` with tabular numerals; prose and names are `--lbx-sans`. The
reference boards are `08-wireframe/Lobby-Main.dc.html` (1440 dark; light,
phone and phone-light via its props) and the per-card `Lbx*.dc.html` files;
every card's five states are in the `States-Lbx*.dc.html` boards.

## 1. Page grid

| Property          | Desktop 1440 | Phone 390 |
| ----------------- | ------------ | --------- |
| Content max width | 1392         | fluid     |
| Side gutter       | 24           | 16        |
| Card gap          | 28 vertical, 24 in a row | 20 |
| Columns           | 12           | 1         |

Spans: Pulse 12 · Leaderboard 7 + Issues 5 · Pressure 12 · Rhythm 6 + Door 6
· Lens 12 · Ratio 6 + Members 6 · Table 12. Below 1100 pairs stack; the
Pressure Map scrolls horizontally inside its card. Paired cards stretch to
equal height; footers pin with `margin-top: auto`. No horizontal page scroll
at any width.

## 2. Header and filter bar

- Header: kicker eyebrow, title 1.875rem / 700 tracking -0.02em (1.5rem on
  phone), lead 14 / 1.6 `--lbx-mute` max-width 700, `Filings as of {date}`
  mono 12 right-aligned (left on phone).
- Filter bar: sticky under the chrome, full-bleed hairlines `--lbx-row-rule`
  top and bottom, padding 12 + gutter, two rows, gap 10.
  - Row 1: period segmented, entity segmented, min slider (140 track, 3px
    rail `--lbx-input-border`, filled left side and 13px thumb in
    `--lbx-accent`, stop label mono 11 in `--lbx-accent-text`), the
    public-only toggle chip (24 x 13 switch drawn inside, `aria-pressed`),
    search pill (36 tall, radius 9999), `Reset` link right.
  - Row 2: issue chips 28 tall, radius 4, live mono counts; selected chip
    `--lbx-selected-bg` + `--lbx-accent` border; trailing `All 79 issues…`
    chip. Chips scroll horizontally, no wrap.
- Phone: scrolling issue chips at 36 tall plus a `Filters` chip with the
  non-default count; the bottom sheet holds the rest at 44-tall controls
  with Reset and `Show N filings`.

## 3. Card skeleton

`.lbx-card`: fill `--lbx-card-bg` (transparent on dark), radius 12, padding
24, **no border, no shadow** (ds-cards rule). Header `.lbx-head`:
padding-bottom 14, margin-bottom 16, 1px `--lbx-head-rule` under it; title
1rem / 600 tracking -0.01em; subtitle mono 11 / 600 uppercase .08em
`--lbx-mute` restating the active filters. Inner tiles use `--lbx-tile-bg`
at radius 8. Partial chip: `.lbx-note`, 22 tall, `--lbx-partial` on
`--lbx-partial-bg`.

## 4. The ten cards

### 4.1 Influence Pulse (12)

Padding 20 24. Five tiles `repeat(5, 1fr)` gap 12 (1-up phone), tile padding
14 16, min-height 104: kicker 10px; value 1.5rem / 700 mono; YoY pill 20
tall mono 11 with arrow and sign (`--lbx-up` / `--lbx-down`); note 11px
`--lbx-faint` (spend tile carries the registrations note verbatim).

### 4.2 Spend Leaderboard (7)

Clients/Firms segmented right. 15 rows, grid `24px 1fr 84px 52px`, gap 10,
min-height 37, bleeding 8 into the padding. Row: rank mono 11 faint; name
13 / 500 ink ellipsis + ticker chip (`.lbx-tick`, 20 tall mono 11 emerald);
5px bar vs rank 1 in `--lbx-bar`; spend mono 13 / 600 right; share mono 11
faint. Footer: drawer hint left, `{period} total $2.14B` mono right. Rows
open the client drawer (480 wide, right side, `--lbx-overlay` scrim,
`--lbx-modal-shadow`).

### 4.3 Issue Landscape (5)

Heading exactly `Share of filings by issue`. 12 rows, grid
`minmax(0,132px) 1fr 72px`, min-height 42: name 12.5 ellipsis; 10px bar in
`--lbx-bar` (selected `--lbx-accent`), share mono 12.5 / 700 with the filing
count mono 10 faint beneath. Selected row `--lbx-selected-tint` fill,
`aria-pressed`. Both footnotes from the brief at the foot.

### 4.4 Pressure Map (12)

Grid `170px repeat(10, 1fr) 64px`, gap 3, min content width 980 inside a
horizontal scroll box. Column heads mono 9.5 uppercase centred; row label
12 / 500 ellipsis; cell 30 tall radius 3, a `--lbx-heat` layer at
`heatScale` opacity, count shown inside (mono 10 / 700) when above 500, ink
flipping to the dark ground colour when opacity > 0.45. Row totals mono 11
right; column totals under a `--lbx-row-rule`. Legend: five-step swatch
`Fewer → More filings`. Footer note: counts are filings naming both, not
dollars. Hover tooltip: issue x body, count, top three clients.

### 4.5 Quarterly Rhythm (6)

Plot 240 tall, left gutter 40, gridlines at quarter values, y labels mono
10. Twelve bars gap 8, radius 3 3 0 0, `--lbx-bar` at 0.75 opacity (0.45 +
the amber `{pct}% filed` flag on the partial quarter); future quarters draw
dashed ghost outlines with `Not yet filed` in `--lbx-ghost`. Filings line
1.5px `--lbx-line` through bar centres. Quarter labels mono 9 (ghost
quarters in `--lbx-ghost`). Caption: one accessible summary sentence.

### 4.6 Revolving Door (6)

Title exactly `Former officials now lobbying`. Lead row: 2rem / 700 mono
share + sentence 13 + 8px track at the share + distinct count mono 11 faint.
Then firm rows, grid `1fr 110px 28px`, 44+ tall: firm 13 / 500, 56px mini
bar vs rank 1 + count mono 13 / 600, chevron expander. Expansion: tile at
`--lbx-tile-bg`, kicker `COVERED POSITIONS, AS FILED`, rows
`{lobbyist} · {position}` 12.5px split ink/mute. Footnote from the brief.

### 4.7 Public Company Lens (12)

Grid 4 x 2 (1-up phone), tiles at `--lbx-tile-bg` radius 8 padding 14 16:
ticker chip + name 13 / 600 + verified patch-check 13 in `--lbx-verified`
or the dashed `Name match` chip; spend 1.125rem / 700 mono beside
`{n} filings · {top issue}` mono 10.5 faint; 26 tall 6-month sparkline
(`--lbx-up` / `--lbx-down` by day change); price mono 13 / 600 + day-change
pill. Header right carries the two-badge legend. Footer: modal hint +
`Sparkline: 6 months · quotes delayed` mono.

### 4.8 Lobbying vs Contracts (6)

1y/2y mono segmented right. Scatter 280 tall, left gutter 40, log ticks
(x $8M to $32M, y $10M to $70B) mono 10; dots 8 to 19px at 0.6 opacity,
defense-heavy in `--lbx-scatter-a`, others `--lbx-scatter-b`, mono 9 ticker
labels beside dots. Right column (1 1 220): `AWARDS PER LOBBYING DOLLAR`
kicker, five rows rank + ticker chip + name + value mono 12.5 / 700.
Caption verbatim from the brief.

### 4.9 Money to Members (6)

Header right: total 1.25rem / 700 mono + `{n} reports` mono 11 faint. Tabs
(Top honorees | Top committees | Largest items), then type chips 28 tall
with mono counts. Six rows, grid `18px 1fr 90px`, min-height 46: rank; name
13 / 500 as filed with a mono 10 meta line; amount mono 13 / 600 right. Both
notes from the brief at the foot. Nothing in this card is a link.

### 4.10 Disclosures (12)

Mode segmented + `Export CSV` link right. Table head eyebrow 11; columns
Posted (mono 12), Client (ellipsis 280 max + ticker chip), Firm (ellipsis
220), Amount (right mono 600), Issues (max 3 sans chips + mono `+N`),
Lobbyists (right mono 12), View link. Rows 49 tall, `--lbx-row-rule`
dividers, hover `--lbx-tile-bg`. Footer: `1 to {n} of {total}` mono left,
the amounts note right. Phone: stacked rows (client + chip, then firm,
amount, posted, View).

## 5. Sign-up band and footer

Band: 1px `--emerald-border`, `--lbx-selected-tint` fill, radius 16, padding
28 32 (20 phone); kicker `FREE ACCOUNT`, title 1.25rem / 600, line 14px,
primary + ghost buttons 40 tall. Footer: source line and the coverage line,
both `.lbx-legal` 11px faint, coverage in mono 10.

## 6. States

Every card ships five states, sized to the populated card so the page never
jumps: shimmer skeletons in the card's own shape (no spinners), populated,
filtered-to-empty naming the live filters with a way out, partial period
(amber chip, and the rhythm bar flag), and error with a per-card Retry.
Copy patterns in `01-BRIEF.md`; visuals in the `States-Lbx*` boards.
