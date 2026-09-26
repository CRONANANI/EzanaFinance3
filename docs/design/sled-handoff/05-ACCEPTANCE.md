# Ship checklist

Definition of done for the rebuilt social ledger section. Every box is checkable
without asking the designer. Numbers come from `04-SPEC.md`.

## Structure

- [ ] `src/components/landing/SocialLedgerSection.jsx` replaces the current
      section in the landing page, in the same slot.
- [ ] All CSS is prefixed `sled-` and scoped to the section. Nothing leaks.
- [ ] Section vertical rhythm comes from `--landing-gap`. No bespoke section
      padding was added.
- [ ] Tokens are declared per `03-TOKENS.css`. No raw hex in the component except
      the two documented chart gradient stops.
- [ ] No new dependency appears in `package.json`. The chart is recharts, already
      present.
- [ ] Nothing from the prototype's tool chrome shipped: no width switcher, no
      shell switcher, no scrubber, no redline overlay.
- [ ] The section scrolls normally. No scroll lock, no continue arrows, no
      viewport-height sizing.

## The grid

- [ ] Both zones are CSS grids with `minmax(0, Nfr)` columns, not fixed widths.
      Resize the browser slowly from 1920 to 380: the columns should move
      continuously, with one collapse at 1000px and one column drop at 560px.
- [ ] The record zone is 5fr / 7fr and the sheets zone is 7fr / 5fr. The mirror is
      deliberate; do not "fix" it to match.
- [ ] The inner container caps at 1440 and centres, so 1920 does not stretch.
- [ ] Both tables are grids, so every cell lines up down its column. Put a ruler
      on the delta column and the rating column.
- [ ] 1024 x 768 landscape still reads as two intentional columns, not a squeeze.
- [ ] 1280 x 720 and 1536 x 864 look designed, not merely unbroken.

## The shared baseline

- [ ] The tier ladder is pinned to the bottom of the rating column and its
      baseline meets the chart's x-axis labels. This is the fix for the old
      "columns only align by force" defect; check it with a ruler.
- [ ] The ledger and standings tables start on the same y and their column heads
      share a baseline.
- [ ] **The ledger and standings sheets are exactly the same height** at every
      width above 1000px. Measure both columns' bounding boxes; the numbers must
      match to the pixel, not "close". This comes from `align-items: stretch` on
      the grid plus `flex: 1 1 0` standings entries, per `04-SPEC.md` section 4.
      If you find yourself tuning a padding value to make them meet, the structure
      is wrong.
- [ ] Each standings entry is two ledger rows tall and carries the tier name and
      rating bar on its second line. Your bar is emerald; the others are grey.
- [ ] Both sheets close with a matching foot row, so their bottom rules land on
      the same y.
- [ ] Under 1000px, where the sheets stack, standings entries return to their
      natural height instead of stretching to fill.
- [ ] No column dangles noticeably shorter than its neighbour in either zone.

## Rules

- [ ] Exactly three rule weights are used, for the three jobs in `04-SPEC.md`
      section 5: 1px hairline, 2px thick, 1px dotted. Grep for `border` and check
      nothing else crept in.
- [ ] No card borders, no box shadows, no radius above 3px anywhere in the section.
- [ ] The only filled surface is your own standings row.

## The rating block

- [ ] The rating figure is the largest object in the section, roughly twice the
      headline. Measure both at 1440.
- [ ] It is mono, 700, tabular, with negative tracking, and it does not reflow
      while counting.
- [ ] The tier ladder uses six equal segments, not a linear 0 to 10,000 scale.
- [ ] The marker sits at 22.2% for 1498. Compute it, do not eyeball it.
- [ ] All six tier names are legible, centred in their segments, and none collides
      with its neighbour at any width above 1000px. Master and Grandmaster are the
      pair that touch first.
- [ ] The next-tier countdown and the rating figure are driven by the same value,
      so they can never disagree.

## The chart

- [ ] Monotone area, dashed 3 3 horizontal grid, 11px mono tabular ticks, emerald
      gradient 0.25 to 0, 400ms draw. Platform chart contract.
- [ ] One y axis. No dual axis.
- [ ] Your line is the only one with a fill, so the three series are
      distinguishable without relying on colour.
- [ ] Leader and median are directly labelled at the right end with a background
      halo, and the labels stay legible where they cross the fill.
- [ ] Cohort tabs are mono-caps with a 2px underline on the selected one, not
      pills.
- [ ] Switching cohort redraws only the two comparison lines. Your line and the
      entire left column do not move.
- [ ] Axis labels name values the chart actually reaches.

## Motion

- [ ] The loop is 7.2s and matches the beat table within about 100ms.
- [ ] The ledger line writes by animating **height**, so the rows below are pushed
      down. If it fades in place, it reads as a card appearing, not a line being
      written.
- [ ] The same `+24` appears in the ledger row, the rating delta and the standings
      week cell within 1.5s of each other. This is the whole point of the
      choreography; if a viewer cannot connect them, the section has failed.
- [ ] The rating does not finish counting before the ledger line has typed.
- [ ] The chart extends by growing a clip rect, not by re-pathing per frame. A
      wobbling curve means the monotone solve is being re-run.
- [ ] Everything derives from one clock. Grep for `setInterval` and for separate
      CSS animation durations on the rating, chart and standings.
- [ ] `grep -rn "Math.random" src/components/landing/` returns nothing.
- [ ] SSR and client markup are byte identical. No hydration warning.

## Reduced motion

- [ ] With `prefers-reduced-motion: reduce` forced, the section shows the composed
      frame at once: eight ledger rows with the top one fully typed, rating 1498,
      week delta +38, tier caption 1002 to strategist, chart complete through W08,
      standings week cell +24, gap 14 to first.
- [ ] Nothing is at zero height or zero opacity in that state. The ledger row
      animates height, so this is the most likely thing to break.
- [ ] Cohort switching still works with reduced motion on; it just does not tween.

## Viewport gating

- [ ] Animation is paused while the section is out of view. Confirm with a
      performance profile.
- [ ] Scrolling back does not restart mid-sequence in a way that looks broken.
      Pause, do not unmount.

## Both shells

- [ ] The section renders correctly in light and dark, and in the system default
      where no `data-theme` attribute is set at all. Test all three: no attribute
      with a dark OS, no attribute with a light OS, and each explicit choice.
- [ ] No colour is defined only inside a media or `[data-theme]` block.
- [ ] `--sled-pos-mark` (`#10b981`) is never applied to text. Grep the component
      for it and check every hit is a stroke, fill or background.
- [ ] Deltas, tier names and the CTA are legible in light mode. If any looks
      washed out, the mark token has been used on text.
- [ ] The dotted row dividers are visible in both shells without being loud.

## Typography

- [ ] Every numeral in the section is mono with `tabular-nums`: ranks, deltas,
      ratings, week labels, axis ticks, timestamps, countdowns.
- [ ] Mono-caps labels carry `.18em` tracking; table column heads carry the same
      at 9.5px.
- [ ] The headline wraps to two lines at desktop by design and does not wrap to
      three at any width above 1000px.
- [ ] The subhead holds at or under 62ch.

## Content

- [ ] Copy matches `01-BRIEF.md` section 7 exactly.
- [ ] `grep -n "—"` across the section returns nothing.
- [ ] Unrated ledger events show a middle dot, never a dash and never a zero.
- [ ] Fixture data matches `04-SPEC.md` section 11, stored with the component, and
      no live call is made.
- [ ] The compliance line is present, says the data is sample, and is not
      truncated at any width.
- [ ] No "beat the market" style claim appears anywhere.

## Accessibility

- [ ] Cohort tabs are real buttons with `role="tab"` and `aria-selected`, reachable
      and operable by keyboard.
- [ ] The chart SVG has `role="img"` and an `aria-label` describing the trend and
      the comparison, not just "chart".
- [ ] Both tables are readable in source order: delta, event, rating, when. If they
      are built with real `<table>` semantics rather than a grid of divs, better.
- [ ] The animated ledger row is not announced as a live region.
- [ ] The CTA is a real `<a href>` with a visible focus state in both shells.
- [ ] Keyboard focus is visible on every interactive element in both shells.
