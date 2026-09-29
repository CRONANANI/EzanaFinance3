# Politician Tracker, build brief for the P3 redesign

## 1. What this page is

`/datasets/politician-tracker`, in the Capitol Watch dimension. One list of
every member of the U.S. House and Senate with disclosed stock trades under
the STOCK Act, ranked by disclosed volume, with the member's official portrait
carried everywhere their name appears. Chamber is a column, not a switch.
Selecting a member opens the existing side panel.

Audience: retail investors following congressional trading, journalists and
researchers, SMIF students. A research surface, not a trading signal.

Tone: Bloomberg/FT, data first. Every figure is a count or a sum of disclosed
ranges. Nothing is estimated, inferred or editorialised.

## 2. What the redesign changes

| Today | P3 |
|---|---|
| Two comparison cards on top, then a plain table | Ranked portrait gallery (top eight) beside a comparison rail, then the rest of the ranking as a dense list |
| Default sort: most trades | Default sort: disclosed volume, with rank shown |
| 28px portrait in a row | 88px portrait on cards, 32px in the list, 96px in the panel |
| Party ring, red for R | Ring means chamber; party is a neutral letter tag |
| Name search plus a sort select | Search, chamber, party, and a RANK BY segmented control |
| Loaded window invisible | Window date range shown in the rail heading |
| Loading is a line of text | Shimmer skeletons for cards, rail and rows |
| Panel shows 10 trades, contractor section can load forever | "Show all N trades" expander; real failure state for contractors |

## 3. What stays exactly as it is

- The shared green chrome and ticker (drawn by the datasets layout). The page
  only publishes ticker items: the 12 most recent trades as
  `TICKER · Member name · BUY/SELL/EXCH`.
- The centred header: eyebrow `DATASETS · CONGRESS`, title `Politician
  tracker`, one subline.
- `EzanaQLBar`, cross-dataset scope, shared size and placement.
- The data contract in the spec's section 3, and every model function in
  `tracker-model.js`. New computations are added there as pure functions.
- The member panel's content and behaviour: `?member=` deep link, one history
  entry per panel, swap-in-place from "Trades most like", Escape, scrim,
  focus return, panel top measured from the chrome.
- The compliance line, word for word.

## 4. The design, as approved

**Toolbar.** One row under the builder: member search (200 wide), a
Both / House / Senate segmented control with chamber dots, an ALL / D / R / I
control in mono, then on the right a `RANK BY` label and a
Disclosed volume / Most trades / Latest trade segmented control. The active
segment is ink on white; there is no dropdown.

**The gallery.** Heading "Top eight by disclosed volume" with the caption
"ring colour is chamber, letter tag is party". Four columns, two rows of
cards. Each card: a rank badge top-left (`#1` is ink on white, the rest are
ink on a 6% tint), the chamber chip top-right, the 88px portrait centred with
a 3px ring in the chamber colour, the name, the party tag and seat, the
disclosed volume as a 26px mono figure with the caption "disclosed volume,
midpoints", a buy/sell split bar, the buys / trades / sells line, and up to
three ticker chips. The first card carries an emerald hairline and a soft
3px emerald halo. Cards are buttons: they open the panel.

**The rail.** 380 wide, a hairline on its left. Heading
`HOUSE VS SENATE, LOADED WINDOW` with the window's date range and disclosure
count under it. Two tinted chamber cards (House emerald tint, Senate blue
tint) with the chamber's volume, members and trades. The four split rows
from today (Active members, Disclosed trades, Trades per member, Disclosed
volume). The footnote naming which chamber trades more per member and
defining volume. The monthly House vs Senate bar chart, 110 tall, captioned
"counts, not dollars". Most traded tickers: five rows, ticker, ink bar,
count.

**The dense list.** From rank 9 to the end. A 2px ink rule on top, mono-caps
heads, rows of 46px with dotted dividers: rank, 32px portrait with name and
party tag and seat, chamber chip, volume figure plus an ink bar relative to
rank 1, trades, buys / sells, last trade, top tickers. Footer: "The rest of
the ranking continues here, same order. Select a row or a card for the full
profile." and `9 TO N OF N · SHOW ALL`. The list shows 8 rows by default and
Show all expands in place.

**The member panel.** As today, opened from cards and rows, 480 wide under
the chrome over a scrim. Identity block gains the chamber ring and the party
tag. Under the 10 most recent trades, a "Show all N trades" text button
expands the table in place. The contractor section has three states:
loading skeleton, empty (names the fiscal year), failed ("Contract data is
unavailable right now.").

## 5. Copy

```
Eyebrow        DATASETS · CONGRESS              (+ SAMPLE DATA chip when the fixture is live)
Title          Politician tracker
Subline        Every member of the House and Senate with disclosed trades, in one list.
Builder        Describe a report in plain English   ·   Generate EzanaQL     (EzanaQLBar, unchanged)
Toolbar        Search a member · Both | House | Senate · ALL | D | R | I · RANK BY  Disclosed volume | Most trades | Latest trade
Gallery head   Top eight by disclosed volume      ring colour is chamber, letter tag is party
Card caption   disclosed volume, midpoints
Card line      N buys · N trades · N sells
Rail head      HOUSE VS SENATE, LOADED WINDOW     2026-06-14 TO 2026-09-26 · 600 DISCLOSURES
Rail rows      Active members · Disclosed trades · Trades per member · Disclosed volume
Rail note      {Chamber} trades more per member in this window. Volume is the sum of the midpoints of disclosed ranges.
Chart head     TRADES BY MONTH                    counts, not dollars
Tickers head   MOST TRADED TICKERS
List heads     # · POLITICIAN · CHAMBER · DISCLOSED VOLUME · TRADES · BUYS / SELLS · LAST TRADE · TOP TICKERS
List foot      The rest of the ranking continues here, same order. Select a row or a card for the full profile.
               9 TO N OF N · SHOW ALL
Loading        (skeletons; no text)
Unavailable    Disclosures are temporarily unavailable. Try again shortly.
Empty filter   No members match. Try clearing <filter>.
Panel expander Show all N trades
Panel failure  Contract data is unavailable right now.
Compliance     Disclosures are public records filed under the STOCK Act. Amounts are the ranges members disclose. Nothing here is investment advice.
```

No em dashes anywhere. Unknown values are a middle dot, never a dash and
never a zero. When the window has fewer than eight members, the gallery
shows what there is and the dense list is empty with its footer reading
`ALL N SHOWN`.

## 6. Hard constraints

- **Volume is the sum of disclosed-range midpoints**, captioned as such
  wherever it is shown. Never "portfolio", "net worth", "holdings",
  "returns" or "performance".
- **Zero data invention.** Counts and midpoints only. Percent of first is a
  ratio of two midpoint sums and is labelled `% of #1`.
- **Portraits** are official public-domain congressional portraits by
  BioGuide ID with an initials fallback. Ring colour is chamber. Party is a
  letter tag with a hairline border, never a colour.
- **Real people**: factual presentation only, no implied wrongdoing, no
  suggestion to follow their trades. Fixture names are `[Member name]`.
- **Tokens only** from `theme-variables.css` through the `ptk-` properties in
  `03-TOKENS.css`. Dark (default) and light both checked.
- **Mono tabular numerals** for every figure, ticker, date, rank, percent.
- **Shared chrome and EzanaQLBar** are mounted, never restyled.
- **Computation lives in `tracker-model.js`.** Components render.
- Bootstrap Icons only. No em dashes. No new dependencies. `ptk-` prefix.
- Responsive to 375 with no horizontal scroll; the gallery becomes two
  columns at 1000, one at 640; the rail stacks under the gallery at 1000.
