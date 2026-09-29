# Ship checklist, Politician Tracker P3

Every box is checkable without asking the designer. Numbers come from
`04-SPEC.md`; the top 76px from `06-SHARED-CHROME.md`; behaviour from
`02-INTERACTIONS.json`.

## Shared chrome and builder

- [ ] The page draws no nav and no ticker. It publishes 12 ticker items via
      `usePublishTicker` and nothing else.
- [ ] Open Contracts, House and Politician Tracker side by side at 1440: the
      top 76px and the centred title block are pixel-identical apart from words.
- [ ] `EzanaQLBar` is the shared component at the shared size and placement.
      Grep this page's CSS for anything targeting it: nothing.

## Ranking and honesty

- [ ] Default sort is Disclosed volume; rank numbers follow the active sort.
- [ ] Every volume figure has "midpoints" or "sum of the midpoints of
      disclosed ranges" within the same block.
- [ ] `grep -rn "portfolio\|net worth\|holdings\|return" src/components/datasets/politician-tracker` returns nothing in UI copy.
- [ ] No percent on the page other than `% of #1`, and that is a ratio of two
      midpoint sums.
- [ ] Unknown values render as a middle dot. `grep -n "—"` returns nothing.
- [ ] Fixture names are `[Member name]`; no real member has invented trades in
      any fixture, story or screenshot.
- [ ] `rankMembers`, `loadedWindow`, `filterMembers`, `topTickers` live in
      `tracker-model.js` with tests; components contain no arithmetic.

## Portraits and party

- [ ] Portraits resolve by BioGuide ID; initials fallback renders on error or
      no ID; a shimmer circle shows while loading.
- [ ] Ring colour is the chamber colour everywhere (card 3px, list 2px, panel
      3px, similar-traders 2px). No red ring exists.
- [ ] Party is a bordered letter tag, identical style for D, R and I.

## Layout at 1440

- [ ] Gallery + rail grid is `1fr 380px` with a 28 gap and a hairline on the
      rail's left.
- [ ] Eight cards in a 4-column grid, gap 14; card padding 20 18 16; portrait
      88; volume 26px mono.
- [ ] Rank 1 card carries the emerald hairline and 3px halo; its badge is ink
      on white text.
- [ ] Rail order: heading with window line, chamber cards, four split rows,
      footnote, monthly chart (110 tall), most traded tickers.
- [ ] Dense list starts at rank 9, 46px rows, dotted dividers, column template
      per spec, bars relative to rank 1 of the current sort.
- [ ] Footer reads `9 TO N OF N · SHOW ALL`; Show all expands in place.

## Toolbar and filters

- [ ] Search, chamber, party and rank-by controls present; segments are
      `role=radio` inside `role=radiogroup`, arrow keys work.
- [ ] Filters update the gallery, list, rail counts, chart and top tickers.
- [ ] `?chamber=house` and `?chamber=senate` from the old redirects preselect
      the chamber filter.
- [ ] Sort, party and query round-trip through the URL; defaults are omitted.
- [ ] Empty filter result names the last-changed filter and offers Clear filters.

## Member panel

- [ ] Opens from a card or a row; the opener takes the selected treatment and
      only one thing is selected.
- [ ] `?member=` deep link, one history entry per panel, swap replaces, Back
      closes, Escape closes, scrim closes, focus returns to the opener.
- [ ] Panel top sits under the shared chrome at every scroll position.
- [ ] Identity shows 96px portrait with chamber ring and the party tag.
- [ ] "Show all N trades" appears when the member has more than 10 trades and
      expands in place.
- [ ] Contractor section has loading, empty and failed states; a rejected
      request never leaves it loading.

## States

- [ ] Loading uses shimmer skeletons (cards, rail, rows), static under
      `prefers-reduced-motion`.
- [ ] Both feeds empty: the unavailable line with Retry; rail shows dots.
- [ ] One feed down: the other renders and the rail heading carries the chip.
- [ ] `SAMPLE DATA` chip appears whenever the fixture is served.

## Responsive

- [ ] 1000: rail stacks under the gallery, gallery 2 columns, toolbar wraps,
      list hides TOP TICKERS.
- [ ] 640: gallery 1 column in the horizontal card layout, list hides
      BUYS / SELLS, volume bar and LAST TRADE, panel full width.
- [ ] 375: builder pill full width, segmented rows scroll inside themselves,
      no horizontal page scroll, tap targets 44.

## Theme and typography

- [ ] Tokens only through `ptk-` properties; no hard-coded hex in the page CSS.
- [ ] Dark (default) and light both screenshotted; chamber chips read at 3:1
      on both grounds; emerald text is the positive token, never the mark.
- [ ] Every figure, ticker, date, rank and percent is JetBrains Mono with
      `tabular-nums`.
- [ ] Mono-caps labels carry .14em to .18em tracking.
- [ ] Nothing wraps or clips in the toolbar, cards, rail or list at 1440.

## Accessibility

- [ ] Cards are real buttons with an `aria-label` naming member, rank and volume.
- [ ] The list is readable in source order; rows open on Enter and Space.
- [ ] The chart has `role="img"` and an `aria-label`; a visually hidden table
      carries the monthly numbers.
- [ ] The panel is a dialog with an accessible name and a focus trap.
- [ ] Every icon-only control has an `aria-label`; focus is visible on both grounds.

## Cleanup

- [ ] `.dsc-chamber` removed from `disclosures.css`.
- [ ] `/datasets/house/members/[slug]` and `/datasets/senate/members/[slug]`
      redirect to `/datasets/politician-tracker?member=<slug>`.
- [ ] `npx eslint src/components/datasets/politician-tracker src/lib/politicians` passes.
