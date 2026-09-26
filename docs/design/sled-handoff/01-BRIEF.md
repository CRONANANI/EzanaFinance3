# Social ledger section, build brief

## 1. Where it sits and what it must do

Page order: Hero, Getting Started, **Social investing**, Integrations, Sonar (the
green locked band), Portfolio Intelligence, Why Ezana Finance, FAQ.

It sits on the standard canvas, immediately before the bank-logo Integrations
strip and two sections above the deep-green Sonar band. It is the platform's
editorial surface, not a second green spectacle, and it is not a takeover: normal
scrolling, no scroll lock, no continue arrows.

Job: in five seconds, make a visitor understand that on Ezana your investing is a
rated, visible, social record. Every action writes a line in a ledger, your rating
moves because of it, and you can measure yourself against friends, 13F whales and
members of Congress.

## 2. Product truths

Design against these. Do not invent others.

- **ELO rating.** Every user carries an ELO-style rating that moves with real
  actions: passing courses in the Learning Center, quiz results, research posts,
  portfolio outcomes (weekly P&L percentile), streaks and competition results.
  Ratings are numeric, four digits, mono, tabular, and tiered:

  | Tier        | Floor |
  | ----------- | ----: |
  | Novice      |     0 |
  | Apprentice  |  1000 |
  | Strategist  |  2500 |
  | Tactician   |  5000 |
  | Master      |  7000 |
  | Grandmaster |  8500 |

  Cap 10,000. Ratings decay with inactivity but never below a floor.

- **The ledger.** A chronological feed of rated events carrying the delta and the
  rating before and after. Wins, streaks and research are the three verbs.
- **Cohorts.** You compare your rating line against Friends (your circle), Whales
  (13F institutional filers tracked on Ezana) and Politicians (members of Congress
  via disclosure data). Switching cohort swaps the comparison lines. Your line
  stays constant.
- **Seasons and standings.** Competition runs in seasons. A standings table ranks
  your circle with rank, name, rating and week-over-week delta, your own row
  highlighted and newcomers flagged NEW.
- **Compliance.** Ratings measure engagement and outcomes. Nothing here is advice.
  No "beat the market" claims, no invented performance beyond fixture
  illustration.

## 3. What exists today, and what is wrong with it

Eyebrow, headline and subhead centred. A two-column block: left, an eight-row
event feed that staggers in and fades on loop, stretched to match the chart's
height; right, a "Your rating" header with cohort pills, the rating figure with a
delta, and a recharts area chart. Below, a "Season 4 standings" band of four
compact single-row tiles.

It works, but like the old Sonar band it was assembled incrementally:

1. The two columns only align by force. Nothing establishes a shared baseline.
2. The chart reads as a generic dashboard widget rather than part of an argument.
3. The standings band feels bolted on, in a different visual language from the
   block above it.
4. There is no single idea the eye can grab. The rating number, which is the whole
   product, is smaller than the headline.
5. The feed and the chart do not visibly relate. Nothing shows that the events
   caused the line.

## 4. The design direction

**One idea: the ledger itself.** The section is a single editorial ledger sheet, a
rated record of a person's investing life, in Ezana's broadsheet language, the
same one the logged-in home page uses. Hairline rules instead of boxed cards.
Uppercase mono labels. Thick-ruled table headers. Dotted row dividers. Big mono
numerals. Emerald as the only accent. Terminal-adjacent restraint: no
glassmorphism, no glows, no radii above 3px, no card shadows.

**The composition** is two mirrored splits, which is what makes it read as one
document rather than three stacked blocks:

- A masthead: hairline, eyebrow row with `SOCIAL INVESTING` left and a
  `SEASON 4 / LIVE` stamp right, then a 2px rule. Headline and subhead below it,
  left aligned, not centred.
- **The record**, 5/7: the rating figure and its tier ladder on the left, the
  rating line chart on the right.
- **The sheets**, 7/5: the ledger table on the left, the standings table on the
  right, both in the same rule system so the standings stop feeling bolted on.
- A foot: hairline, the compliance line left, `Start your ledger` right.

The eye crosses the page twice, and the narrow column under the wide one keeps the
page from reading as two separate grids.

**The rating number is the hero.** At 1440 it is about 124px, roughly twice the
headline, and the largest object in the section. The chart supports it rather than
competing with it.

**The tier ladder** is the device that makes the rating mean something. A rule
across the rating column with six equal segments, one per tier, labelled, with a
marker at your position inside your segment and a `1002 to strategist` countdown.
Equal segments rather than a linear 0 to 10,000 scale, because linear crushes four
tiers into the right half and puts an apprentice at 15%. The ladder pins to the
bottom of its column so its baseline meets the chart's x axis. That shared
baseline is what stops the two columns drifting.

**Motion tells the story.** One rated event, three consequences. A ledger line
writes itself at the top of the table, the rating ticks up by the same delta, the
chart's last point extends, and the standings row updates, all inside 1.5s. The
same `+24` appears in three places, which is what makes the mechanic legible
without reading the subhead. Loop is 7.2s with a composed resting frame.

## 5. Palette

Standard canvas and tokens. Full detail and the contrast working in
`03-TOKENS.css`. The one thing to carry in your head:

**Brand emerald `#10b981` is a mark colour, not a text colour.** It is 2.21:1 on
white. So the positive token splits: `--sled-pos` for text (`#047857` light,
`#34d399` dark) and `--sled-pos-mark` for strokes, fills and dots (`#10b981` in
both). Every delta, tier name and CTA uses the text token. Every chart stroke,
gradient, live dot and ladder marker uses the mark token.

Red only for negative deltas. The existing greys for comparison lines. Both shells
must work; this section is not mode-locked.

## 6. Typography

Plus Jakarta Sans for copy. JetBrains Mono with tabular numerals for every rating,
delta, timestamp, week label, rank, axis tick and countdown. No exceptions: a
proportional numeral anywhere in this section is a bug, because every one of them
sits in a column that has to line up.

## 7. Copy

```
Eyebrow      SOCIAL INVESTING
Stamp        SEASON 4 · LIVE
Headline     Every move is on the record.
Subhead      Add a friend and your ratings start writing themselves: wins, streaks
             and research, each one a line in the ledger.
Column heads YOUR RATING (@axum) · RATING LINE · THE LEDGER (last 8 events)
             SEASON 4 STANDINGS (live)
Table heads  DELTA · EVENT · RATING · WHEN   /   # · MEMBER · WEEK · RATING
Cohorts      Friends (vs. 3 friends) · Whales (vs. 13F whales) · Politicians (vs. Congress)
Line labels  Circle leader / Circle median, Whale leader / Whale median,
             Chamber leader / Chamber median
Countdown    1002 to strategist   ·   14 to first
Foot         Ratings measure engagement and outcomes on Ezana. Sample data shown.
             Nothing here is investment advice.
CTA          Start your ledger  ->  /signup
```

No em dashes anywhere. Unrated ledger events carry a middle dot, not a dash and
not a zero: a zero would claim the event was rated and scored nothing.

## 8. Hard constraints

- Design tokens only. Page-scoped CSS prefix `sled-`. No raw hex outside the
  scoped token block, with one documented exception for the chart gradient stops.
- Section vertical rhythm from the shared `--landing-gap` system, 96px desktop and
  48px mobile. No bespoke section padding.
- No `Math.random`. Seeded sin for any pseudo-randomness so SSR output is
  deterministic. This section needs none.
- `prefers-reduced-motion`: the loop resolves to a composed static frame with all
  content visible.
- Animation ticks only while the section is in the viewport, IntersectionObserver
  pattern, pause rather than unmount.
- Charts follow the platform chart contract: recharts, monotone area, dashed 3 3
  grid, 11px ticks, emerald gradient 0.25 to 0, 400ms draw. CSS and SVG for
  everything else. No new dependencies, no framer-motion or GSAP in this section.
- Bootstrap Icons only.
- Not a takeover: normal scrolling section, no scroll lock, no arrows.

## 9. Responsive mandate

The layout is fluid by construction: proportional grid columns and `clamp()` type,
so the numbers interpolate continuously rather than snapping at breakpoints.
Implement the formulas in `04-SPEC.md` section 1, not the computed tables.

Both grids collapse to one column at `max-width: 1000px`, which covers 768 x 1024
portrait tablets and below. 1024 x 768 landscape stays two columns and is the
tightest two-column case, so check it specifically. At 560px and below the ledger
drops its rating column, because `1462 -> 1474` cannot survive a phone column and
truncating it would be worse than losing it; the standings keep all four columns.

1280 x 720 and 1536 x 864 must look intentional, not merely unbroken. They do if
the formulas are implemented, which is the reason for the formulas.

## 10. Fixture

Illustrative, cached, never live. Full table in `04-SPEC.md` section 10. One
correction to the brief's fixture is documented there: the standings story has you
passing Priya S. to reach #2, but at your pre-event 1474 you are already ahead of
both Priya (1441) and Maya (1470), so no reorder is possible. The standings
animation updates your row in place instead of claiming a rank change the numbers
do not support.
