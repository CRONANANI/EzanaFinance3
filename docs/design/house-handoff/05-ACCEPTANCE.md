# Ship checklist

Definition of done for the House Financial Disclosures page. Every box is
checkable without asking the designer. Numbers come from `04-SPEC.md`; the top
76px comes from `06-SHARED-CHROME.md`.

## Shared chrome, the uniformity rule

- [ ] The dimension bar and ticker come from the one shared datasets chrome
      component. This page passes ticker items and nothing else.
- [ ] Nav 44 + ticker 32 = 76px, measured, identical to the Contracts page.
- [ ] Capitol Watch is the pilled dimension, dot colours match the table in 06,
      Log in and Sign up are the two pills on the right.
- [ ] Ticker items are `MEMBER · TICKER · BUY/SELL · bracket` or
      `MEMBER · TYPE · FILED date`, styled exactly like the Contracts ticker,
      each a real link, paused on hover and under reduced motion.
- [ ] Eyebrow reads `DATASETS · HOUSE CLERK`, centred, in the shared size;
      title is 32px / 700, centred.
- [ ] Open Contracts and House side by side at 1440: the top 76px and the
      centred title block are pixel-identical apart from the words.
- [ ] Grep this page's styles for anything targeting the nav or ticker. There
      is nothing.

## The builder

- [ ] One 720 x 44 light pill under the title. White ground, 1px border, pill
      radius. No dark surface anywhere in the builder at rest or expanded.
- [ ] Under it, one line of grey mono showing the current query, with Edit,
      Run, CSV and JSON as text links.
- [ ] The query re-seeds when a rail filter changes, until the user edits it.
- [ ] Expanded, the editor stays under 720 wide, on white, and closes back to
      the single line.
- [ ] The builder is visibly not the focal point: the metric row and the trades
      table carry more weight at first glance.

## Layout

- [ ] Rail 232, gap 36, main fills; 40px gutters; content capped at 1440 and
      centred on wider screens.
- [ ] Metric row is ruled, not carded: 1px top and bottom, 1px between cells,
      28px mono figures.
- [ ] Tabs in the order Trades, Filings, Members, Tickers, Coverage; Trades
      active by default with the 2px emerald underline; Coverage carries the
      amber dot.
- [ ] Exactly one chart on the page: transactions by month, buys versus sells,
      in counts, with the caption saying so.
- [ ] The leaderboard is 240 wide beside the chart with a 1px left rule.

## The trades table

- [ ] Column template matches the spec; head row under a 2px rule; rows 42
      tall with dotted dividers.
- [ ] Every row has a working link to its source PDF at the Clerk.
- [ ] Amount cells show the bracket verbatim and never wrap.
- [ ] Sorting by amount shows `~est.` beside the column head; the midpoint is
      never displayed anywhere.
- [ ] Lag over 45 days renders in `#b45309` 600.
- [ ] BUY, SELL and EXCH chips use the three treatments in the spec; sell is
      not red.
- [ ] A trade with no ticker shows a middle dot, not a blank and not a dash.
- [ ] Member names and tickers are real links.
- [ ] `grep -n "—"` across the page returns nothing.

## The member panel

- [ ] Opens from any member name anywhere on the page, including the ticker
      and the leaderboard.
- [ ] 480 wide, from 76px down, so the shared chrome stays visible and
      clickable above it.
- [ ] The clicked row takes the selected treatment; only one row is selected.
- [ ] Opening pushes `/datasets/house/members/[slug]`; back closes; loading
      that route directly renders the full-page profile; `Open page` links to
      it.
- [ ] Esc, the close button and the scrim all close it. Clicking another
      member swaps content in place. There is never a second panel or a modal
      on top of it.
- [ ] Focus moves to the panel heading on open and returns to the trigger on
      close. Page scroll is locked behind it on desktop.
- [ ] Contents in order: head row, identity, four stats, most-traded chips,
      lag dot plot with the 45-day line, filings and trades with PDF links,
      two actions and the account note.
- [ ] A scanned filing row reads `Scanned filing, trades pending extraction`;
      an in-flight fetch shows a spinner; a filing with no trades reads `none`.
- [ ] On phones the panel is full width from the top and back still closes it.

## States

- [ ] `SAMPLE DATA` chip is in the eyebrow row whenever the ingest has not run,
      and cannot be missed.
- [ ] Per-row loading for trade extraction; no whole-page spinner for one row.
- [ ] Pending extraction is worded, not an empty table.
- [ ] Empty filter result names the filter and offers a one-click clear.
- [ ] A filing with no usable date shows `no date`; typo dates from the source
      are never corrected into a plausible date.
- [ ] An undocumented legacy filing type shows its raw letter.

## Responsive

- [ ] At 1000px the rail becomes a Filters button and the leaderboard drops
      under the chart.
- [ ] At 760px the trades table is a card list with no horizontal scroll and
      all of the same fields.
- [ ] The builder pill goes full width with 16px gutters.
- [ ] Tap targets are at least 44px on the phone layout.

## Honesty and compliance

- [ ] No exact dollar figure appears anywhere on the page.
- [ ] No real member is attached to an invented trade in the fixture or in any
      demo content.
- [ ] No copy implies wrongdoing or suggests following a member's trades.
- [ ] The compliance line is present and untruncated on every view and at
      every width.
- [ ] The source is named as the Clerk of the House; no backend names appear.

## Accessibility

- [ ] Tabs are real tab controls with `aria-selected`.
- [ ] Tables are readable in source order and, ideally, use real table
      semantics.
- [ ] The chart has `role="img"` and an `aria-label` naming what it shows.
- [ ] The panel is a dialog with an accessible name, focus trapped while open.
- [ ] Every icon-only control has an `aria-label`.
- [ ] Keyboard focus is visible on the white canvas.

## Typography

- [ ] Every figure, ticker, date, bracket, lag and rank is JetBrains Mono with
      `tabular-nums`.
- [ ] Mono-caps labels carry `.14em` to `.18em` tracking per the spec.
- [ ] Nothing wraps or clips in the rail, the metric row or the panel at 1440.
