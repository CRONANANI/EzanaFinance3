# Social ledger band, measured spec

Implementation numbers for `src/components/landing/SocialLedgerSection.jsx`.

**Read this first.** Unlike the Sonar band, this section is not a takeover. It
scrolls normally, so there is no viewport budget to balance. The layout is
**fluid by construction**: proportional grid columns and `clamp()` type, so the
numbers interpolate continuously between breakpoints rather than snapping at
them. The tables below give the formula and then the value it computes to at each
named width. Implement the formula, not the table. The table is for checking your
work, and for the widths the brief calls out that sit between the named four.

---

## 1. The formulas

```css
--sled-gap: clamp(48px, 6vw, 96px); /* section padding-block, the --landing-gap contract */
--sled-pad: clamp(16px, 2.8vw, 40px); /* inner padding-inline */
--sled-colgap: clamp(24px, 3.2vw, 48px); /* gap between the two columns in both zones */
--sled-row: clamp(38px, 3.4vw, 46px); /* table row height */

.sled-inner {
  max-width: 1440px;
  margin-inline: auto;
  padding-inline: var(--sled-pad);
}
.sled-record {
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
} /* rating | chart */
.sled-sheets {
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
} /* ledger | standings */
```

The two zones use mirrored 5/7 and 7/5 splits. That mirror is the composition:
the rating is small and heavy on the left with a wide chart beside it, then the
wide ledger sits under the rating with the narrow standings under the chart. The
eye crosses the page twice.

## 2. Computed geometry

|                      | 1920 | 1536 | 1440 |   1366 |   1280 |        768 | 390 |
| -------------------- | ---: | ---: | ---: | -----: | -----: | ---------: | --: |
| Frame width          | 1920 | 1536 | 1440 |   1366 |   1280 |        768 | 390 |
| `--sled-pad`         |   40 |   40 |   40 |   38.2 |   35.8 |       21.5 |  16 |
| Inner (capped 1440)  | 1440 | 1440 | 1440 |   1366 |   1280 |        768 | 390 |
| Content width        | 1360 | 1360 | 1360 | 1289.5 | 1208.3 |        725 | 358 |
| `--sled-colgap`      |   48 |   48 | 46.1 |   43.7 |   41.0 |       24.6 |  24 |
| `--sled-gap` (block) |   96 | 92.2 | 86.4 |   82.0 |   76.8 |         48 |  48 |
| `--sled-row`         |   46 |   46 |   46 |     46 |   43.5 | 26.1 -> 38 |  38 |

**Zone B, the record** (5fr / 7fr of `content - colgap`):

|               |  1920 |  1440 |  1366 |  1280 |  768 |  390 |
| ------------- | ----: | ----: | ----: | ----: | ---: | ---: |
| Rating column | 546.7 | 547.5 | 519.1 | 486.4 | full | full |
| Chart column  | 765.3 | 766.4 | 726.7 | 680.9 | full | full |

**Zone C, the sheets** (7fr / 5fr of `content - colgap`):

|                  |  1920 |  1440 |  1366 |  1280 |  768 |  390 |
| ---------------- | ----: | ----: | ----: | ----: | ---: | ---: |
| Ledger column    | 765.3 | 766.4 | 726.7 | 680.9 | full | full |
| Standings column | 546.7 | 547.5 | 519.1 | 486.4 | full | full |

Both grids collapse to one column at `max-width: 1000px`, which covers 768 x 1024
portrait tablets and everything below. 1024 x 768 landscape stays two columns and
is the tightest two-column case: check it.

## 3. Section height

There is no fixed height. The section is the sum of its content, which is what a
scrolling section should be. Measured on the prototype, for sanity only:

|                        | 1920 | 1440 | 1366 | 1280 |  768 |  390 |
| ---------------------- | ---: | ---: | ---: | ---: | ---: | ---: |
| Approx. section height | 1105 | 1088 | 1062 | 1034 | 1560 | 1985 |

If the desktop figure grows past about 1150 the section starts to feel like two
sections. Trim ledger rows before you trim anything else.

## 4. Table columns

Both tables are CSS grids, not flex rows, so every cell lines up down the column.

**The ledger** (`delta | event | rating | when`):

```css
grid-template-columns: clamp(44px, 4.4vw, 58px) minmax(0, 1fr) clamp(96px, 9vw, 124px) clamp(
    34px,
    3.4vw,
    44px
  );
gap: clamp(10px, 1.1vw, 16px);
```

At 1440 that is 58 / 578.4 / 124 / 44 with 16 gaps. At 560px and below the rating
column is dropped (`.sled-hide-sm`) and the grid becomes `42px 1fr 40px`, because
`1462 -> 1474` cannot survive a phone column and truncating it would be worse than
losing it.

**The standings** (`rank | member | week | rating`):

```css
grid-template-columns: clamp(26px, 2.6vw, 34px) minmax(0, 1fr) clamp(54px, 5vw, 68px) clamp(
    48px,
    4.6vw,
    60px
  );
```

At 1440 that is 34 / 373.5 / 68 / 60 with 16 gaps. The phone keeps all four
columns; only the ledger sheds one.

Row: height `--sled-row`, `border-bottom: 1px dotted var(--sled-dot)`, none on the
last. Your own standings row adds `inset 3px 0 0` in emerald plus a 5.5% emerald
wash and 10px of left padding on its first cell.

**The two sheets are one height.** This is structural, not tuned:

```css
.sled-sheets {
  align-items: stretch;
} /* both columns take the taller height */
.sled-ledger,
.sled-stand {
  display: flex;
  flex-direction: column;
}
.sled-rows {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
}
.sled-stand .sled-tr {
  flex: 1 1 0;
  height: auto;
  min-height: calc(var(--sled-row) * 1.7);
}
```

The ledger sets the height with eight fixed rows. The standings fill the same
height with four entries that flex to share it, so each standings entry is exactly
two ledger rows tall, and the bottom rules of both sheets land on the same y at
every width above 1000px. Both sheets close with the same foot row (`.sled-footrow`,
10px mono caps, 10px top padding) so the footers match too. At 1440, measured:
ledger column 434px tall, standings column 434px tall.

Because the standings entries are double height, each carries a second line: the
member's tier name and a 2px **rating bar**, filled to `(rating - 1390) / 150` of
its track, the same domain as the chart. Your bar is emerald, the others grey.
It is derived from the rating alone, so it invents nothing, and it gives the
standings a reason to be taller than a list. The bar spans grid columns 2 to 4:

```css
.sled-stand .sled-tr {
  grid-template-rows: auto auto;
  row-gap: 9px;
}
.sled-bar {
  grid-column: 2 / -1;
}
```

Under 1000px the columns stack, there is nothing to match, and `.sled-stand .sled-tr`
returns to `flex: 0 0 auto` so entries take their natural height.

## 5. Rules, the structural system

Three rule weights, used for three different jobs. Do not add a fourth.

| Rule     | Weight                   | Job                                                                                                                                                   |
| -------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hairline | 1px `--sled-rule`        | Separates a label row from its content. Above the masthead, under every column head.                                                                  |
| Thick    | 2px `--sled-rule-strong` | Opens a table. Under the masthead, under each sheet's column head. This is the broadsheet move and it is what makes the section read as one document. |
| Dotted   | 1px dotted `--sled-dot`  | Between rows inside a table only.                                                                                                                     |

No card borders, no box shadows, no radii above 3px anywhere in this section. The
only filled surface is your own standings row.

## 6. The rating block

The largest object in the section, as the brief requires.

|                   | Value                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Figure            | `clamp(62px, 8.6vw, 124px)`, mono 700, `letter-spacing: -.045em`, `line-height: .88`, tabular |
| Week delta        | `clamp(13px, 1.15vw, 17px)`, mono 600, positive token                                         |
| Tier name         | `clamp(11px, .92vw, 13px)` mono caps, `.14em`                                                 |
| Next-tier caption | 11px mono, right-aligned on the same baseline                                                 |

At 1440 the figure is 123.8px. It is roughly twice the headline, which is the
intended relationship: the headline says what the section is, the number is what
it is about.

**The tier ladder.** A 1px rule across the full column with six ticks. The six
tiers get **equal segments**, not a linear 0 to 10,000 scale, because linear would
put an apprentice at 15% and crush four tiers into the right half. Equal segments
are honest as long as they are labelled as tiers, which they are.

```
segment i spans [i/6, (i+1)/6]
marker x = (i + (rating - tierFloor) / (nextFloor - tierFloor)) / 6
```

Thresholds: Novice 0, Apprentice 1000, Strategist 2500, Tactician 5000,
Master 7000, Grandmaster 8500, cap 10000. At 1498 that is segment 1 plus
0.332 of the way across it, so `x = 22.2%`.

Seven ticks sit at the segment boundaries (0, 1/6 ... 6/6). The six labels are
**centred in their segments**, not placed at the ticks, because they name bands
rather than points, and because tick-anchored labels collide at Master and
Grandmaster on any column under about 620px.

The ladder is pinned to the **bottom** of its column (`justify-content:
space-between`), so its baseline meets the chart's x-axis labels. That shared
baseline is what stops the two columns from drifting.

## 7. The chart

Follows the platform chart contract. In production this is recharts; the prototype
hand-draws the identical geometry so the spec is checkable.

| Property         | Value                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Type             | Monotone area, Fritsch-Carlson interpolation                                                                                               |
| Your line        | 2.25px, `#10b981`, round caps and joins                                                                                                    |
| Your fill        | Vertical gradient `#10b981` at 0.25 to 0                                                                                                   |
| Comparison lines | 1.5px, `--sled-cmp-a` leader and `--sled-cmp-b` median, no fill                                                                            |
| Grid             | Horizontal only, 1px, `stroke-dasharray: 3 3`, `--sled-rule`                                                                               |
| Ticks            | 11px mono, tabular, `--sled-faint`                                                                                                         |
| Y domain         | 1390 to 1540, ticks at 1400 / 1440 / 1480 / 1520                                                                                           |
| X                | W01 to W08, eight points, labels 11px mono                                                                                                 |
| Padding          | top 14, right 20, bottom 26, left 44 (in a 760 x 260 viewBox)                                                                              |
| Draw             | 400ms on the extending segment                                                                                                             |
| Endpoint         | 4r dot, 2.5px emerald stroke, background fill                                                                                              |
| Direct labels    | Leader and median named at the right end, 10px mono, `paint-order: stroke` with a 3.5px background halo so they stay legible over the fill |

One axis. Two comparison series plus yours is three lines, which is why they are
directly labelled and there is no legend box. Color is not the only channel: your
line is the only one with a fill.

**Cohort switching** swaps the two comparison series over 400ms. Your line never
moves. Tabs are mono-caps with a 2px emerald underline on the selected one, not
pills: pills read as filters, underlines read as a table's column head, which is
the language this section is written in.

## 8. Type scale

| Role                 | Face        | Size                        | Notes                                                      |
| -------------------- | ----------- | --------------------------- | ---------------------------------------------------------- |
| Eyebrow, caps labels | Mono 500    | 11px                        | `.18em`, uppercase                                         |
| Table column head    | Mono 500    | 9.5px                       | `.18em`, uppercase                                         |
| Headline             | Jakarta 800 | `clamp(30px, 4.2vw, 60px)`  | `-.035em`, `max-width: 17ch`, wraps to two lines by design |
| Subhead              | Jakarta 400 | `clamp(14px, 1.15vw, 17px)` | 1.55, `max-width: 62ch`                                    |
| Rating figure        | Mono 700    | `clamp(62px, 8.6vw, 124px)` | tabular, `-.045em`                                         |
| Table body           | Jakarta 400 | `clamp(13px, 1.02vw, 15px)` |                                                            |
| Table numerals       | Mono 400    | `clamp(11px, .92vw, 13px)`  | tabular                                                    |
| Timestamps           | Mono 400    | 10px                        | `.1em`, uppercase, `--sled-faint`                          |
| Ladder tick labels   | Mono 400    | 8.5px                       | `.1em`, uppercase                                          |
| Foot note            | Jakarta 400 | 12px                        | `max-width: 64ch`                                          |

Every numeral in the section is mono with `tabular-nums`. That includes ranks,
deltas, ratings, week labels, axis ticks and the next-tier countdown.

## 9. Spacing

4-base. Used: 8, 10, 12, 16, 24, 32, 48.

| Where                      | Value                      |
| -------------------------- | -------------------------- |
| Masthead row padding-block | 10                         |
| Headline top margin        | `clamp(18px, 2vw, 30px)`   |
| Subhead top margin         | `clamp(12px, 1.2vw, 18px)` |
| Record zone top margin     | `clamp(28px, 3.2vw, 48px)` |
| Sheets zone top margin     | `clamp(36px, 4vw, 64px)`   |
| Column head padding-bottom | 9                          |
| Foot rule top margin       | `clamp(28px, 3vw, 44px)`   |

## 10. Choreography

Total 7200ms, looping, with a composed resting frame. See `02-TIMELINE.json` for
the machine-readable version.

|       t (ms) | Beat                                                                                                              |
| -----------: | ----------------------------------------------------------------------------------------------------------------- |
|     0 to 600 | Resting. Rating 1474, chart ends at W07, ledger shows seven rows, standings delta is a dot, gap reads 38 to first |
|  600 to 1400 | The new ledger line writes itself: row height 0 to full, opacity in                                               |
|  800 to 1700 | Its event text types in character by character                                                                    |
| 1200 to 2100 | Rating odometer 1474 to 1498, ease-in-out. Week delta counts 14 to 38                                             |
| 1400 to 2000 | Tier ladder marker slides, next-tier caption counts 1026 down to 1002                                             |
| 1800 to 2600 | Chart extends: the clip rect grows from x(W07) to x(W08), the endpoint dot rides the curve                        |
| 2600 to 3300 | Standings: your ELO ticks to 1498, the week cell flips from a dot to +24, the gap counts 38 down to 14            |
| 3300 to 6400 | Composed hold                                                                                                     |
| 6400 to 7200 | Reset and loop                                                                                                    |

The mechanic is legible because the same `+24` appears in the ledger row, the
rating delta and the standings week cell, within 1.5s of each other. That is the
point of the whole choreography: one event, three consequences.

**Reduced motion** resolves to the composed frame at 60% of the loop: the new row
present and fully typed, rating 1498, chart complete through W08, standings
updated. Nothing hidden, nothing mid-transition.

## 11. Fixture

Illustrative, cached, never live.

- **Your series**: 1408, 1416, 1410, 1428, 1440, 1452, 1484, 1498 (W01 to W08).
- **Friends**: leader 1452, 1460, 1466, 1472, 1484, 1494, 1504, 1512; median 1418
  to 1466. The leader ends at 1512 because the circle leader is Daniel R., who is
  1512 in the standings. The brief said "near 1524"; 1524 would put an unnamed
  fifth person above the whole standings table.
- **Whales**: leader 1470 to 1528, median 1430 to 1480.
- **Politicians**: leader 1440 to 1502, median 1402 to 1452.
- **Ledger**, newest first. Row 0 is the one the loop writes.

| Delta | Event                                            | Rating       | When |
| ----- | ------------------------------------------------ | ------------ | ---- |
| +24   | Won 'Q3 Momentum Sprint'                         | 1474 to 1498 | Mon  |
| +12   | Top 10% weekly P&L                               | 1462 to 1474 | Fri  |
| +8    | Research post upvoted, consensus signal          | 1454 to 1462 | Thu  |
| .     | Priya S. challenged you to 'Season 4 Sprint'     | .            | Thu  |
| +5    | 7-day login streak                               | 1449 to 1454 | Wed  |
| +6    | Passed 'Options Greeks I' in the Learning Center | 1443 to 1449 | Tue  |
| .     | Maya K. joined your circle                       | .            | Tue  |
| -5    | Weekly P&L below median                          | 1448 to 1443 | Mon  |

Unrated events carry a middle dot, not a dash, and not a zero. A zero would
claim the event was rated and scored nothing.

- **Standings**: 01 Daniel R. 1512 (flat), 02 You @axum 1498 (+24), 03 Maya K.
  1470 (NEW), 04 Priya S. 1441 (-5). All four are Apprentice. Rating bars at
  81.3% / 72.0% / 53.3% / 34.0%. Foot row: `4 members` left, `14 to first` right.
- **Ledger foot row**: `Net this week +38` left, `Full ledger` link right.

> **Fixture correction.** The brief's standings story has you passing Priya S. to
> reach #2, but with the given ratings you are already ahead of both Priya (1441)
> and Maya (1470) at your pre-event 1474, so no reorder can happen. Rather than
> change the ratings, the standings animation now ticks your rating, flips your
> week cell to +24 and counts the gap to first down from 38 to 14. It shows
> movement without claiming a rank change the numbers do not support.

## 12. What this replaces

1. The two columns only aligned by force. Both zones are now proportional grids
   with a shared baseline: the tier ladder pins to the bottom of the rating column
   so it meets the chart's x axis.
2. The chart read as a generic dashboard widget. It is now a ruled figure with
   direct labels, no card, no box, and mono-caps tabs instead of pills.
3. The standings band felt bolted on. It is now the second sheet in the same table
   system, beside the ledger, sharing its rule weights, its column-head treatment,
   its foot row, and, by construction, its exact height.
4. Nothing for the eye to grab. The rating figure is now roughly twice the headline
   and the largest object in the section.
5. The feed did not visibly cause the chart. The same +24 now lands in the ledger,
   the rating and the standings inside 1.5s.
