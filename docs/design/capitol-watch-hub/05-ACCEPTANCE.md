# Ship checklist, Capitol Watch hub (final hybrid)

## Nav

- [ ] The top nav is the shared component; this page only marks Capitol Watch
      active. Side by side with any dataset page, the nav is pixel-identical.
- [ ] Grep the page's styles for selectors targeting the nav: none.

## Header and EzanaQL

- [ ] Two columns: 560px left (title, stats, bar, prompts, query block,
      scope line), result card right, equal height.
- [ ] The result card is never empty on load (default query result).
- [ ] Generating a query updates the query block and the result table.
- [ ] Ticker opens the company card; member opens the drawer.
- [ ] CSV, JSON and Watchlist show a lock signed out and open the account
      modal; Open full table never wraps.
- [ ] The table scrolls inside the card with a sticky head.

## Top signals

- [ ] One event per view, full width; arrows, counter and preview strip all
      move the same carousel; Left and Right keys work when focused.
- [ ] Type filters and My signals change the set and reset to 1 of N.
- [ ] Each event shows one reason per linked dataset, the linked chips, the
      strength as "N OF 5 DATASETS", and actions.
- [ ] The chart shows the award line, the trade marker and the 30 days after
      in green or red, with date ticks, four facts, a legend and the
      measurement note with sources.
- [ ] No auto-advance; reduced motion removes slide animation.

## Rule builder

- [ ] Dataset tiles toggle; at least two required; OVERLAP preview updates.
- [ ] Conditions appear only when their datasets are selected.
- [ ] The match count and first three matches update within 300ms of a change.
- [ ] Unsupported cross-dimension joins show PREVIEW and cannot be selected.
- [ ] Save and Alert are account-gated; preview works signed out.
- [ ] A saved rule appears as a My signals chip and its events join the
      carousel.
- [ ] The honesty note is present.

## Signals across datasets

- [ ] Five tabs, A by default, real tablist semantics with arrow keys.
- [ ] Tab A rows carry the per-row chart, trader type and party tags, and
      Watchlist / Query this / Share.
- [ ] Every tab ends with its window, named sources and measurement note.

## Heatmap and leaderboard

- [ ] Equal-height cards side by side at 1440.
- [ ] Heatmap cells are buttons; the highest-share cell is selected by
      default; selecting fills the detail box; arrow keys move across cells.
- [ ] Leaderboard shows the Quick Step badge on qualifying traders with a
      gold (#d4a853) bolt on an ink pill; the locked legend sits in the head;
      the gold explainer is present.
- [ ] Gold appears nowhere else on the page.

## Congress's portfolio

- [ ] Sixteen rows in two columns with member counts and estimated ranges.
- [ ] Party and chamber filters work; rows open the company card.
- [ ] The note says ranges are sums of disclosed ranges.

## Honesty and copy

- [ ] Amounts are disclosed ranges; holdings say "inferred"; returns say what
      they are measured from (institutions and whales from the filing date).
- [ ] No composite score anywhere; strength is a count.
- [ ] Fixture people are placeholders; no real person has an invented trade.
- [ ] Only public sources are named; no backend names.
- [ ] `grep -n "—"` over the page and its copy returns nothing.

## States

- [ ] Every module streams in with its own skeleton.
- [ ] Empty, error, signed-out and preview states as in 02-INTERACTIONS.

## Responsive

- [ ] 1200, 1000, 640 and 375 per 04-SPEC section 10.
- [ ] No horizontal page scroll at any width; tables scroll inside cards.
- [ ] Tap targets 44 on phones.

## Theme, type, a11y

- [ ] Tokens only through `cwh-` properties; light and dark both checked.
- [ ] Every number, ticker, date and percentage is JetBrains Mono with
      tabular figures.
- [ ] Charts have role="img" and an aria-label; the carousel has
      aria-roledescription and "N of TOTAL" slide labels.
- [ ] Icon-only buttons have aria-labels; focus is visible on both grounds.
- [ ] The drawer is a dialog: Escape and scrim close, focus returns.

## Cleanup

- [ ] Old stacked linkage cards and the old header layout removed with their
      styles. No new dependencies. Bootstrap Icons only. Lint passes.
