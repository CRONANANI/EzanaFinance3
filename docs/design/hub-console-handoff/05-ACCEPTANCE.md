# Ship checklist, Datasets hub console rail

Every box is checkable without asking the designer. Numbers come from
`04-SPEC.md`, behaviour from `02-INTERACTIONS.json`.

## Untouched surfaces

- [ ] The sonar deck renders pixel-identical before and after (rings, sweep,
      blips, hover cards).
- [ ] Search pill, Ping button, ping loader and results flow unchanged.
- [ ] `GlobeBackground` and the band ground unchanged.
- [ ] The page renders identically with the app in light mode and dark mode.

## The belt

- [ ] No pill and no ring: `grep -n "inset 0 0 0 1px" src/components/datasets/news-belt.css`
      returns nothing; items are divided by 1px mint hairlines only.
- [ ] One band at height 46, radius 12, `--dcr-belt-bg`, soft-edge masks kept.
- [ ] Marquee speed still comes from `useTickerSpeed`; hover pauses; reduced
      motion gives the hand-scrollable row.
- [ ] Both mounts restyled (the `/datasets` overview and `DatasetChrome`),
      and no other dataset page's chrome regressed.

## The rail

- [ ] Seven strips, taxonomy order, each a real `<button>` at least 44px tall.
- [ ] Counts, ticks and LIVE/ROADMAP derive from `DATASET_TAXONOMY` /
      `ORBIT_DIMS`; `grep` the rail components for hardcoded counts: nothing.
- [ ] Hue per strip matches the shared-chrome dot table exactly, declared
      once as the `--dcr-dim-*` tokens.
- [ ] Waveform is `aria-hidden`, no axes, no tooltip; amplitude follows live
      share; roadmap strips draw the flat dashed line.
- [ ] Roadmap strips: 62% opacity, hollow ticks, ROADMAP status, and clicking
      routes to the dimension's roadmap view.
- [ ] Selecting a strip drives the same `SonarSelection` state, URL param and
      panels as the old marks; selected treatment per spec; Escape clears.
- [ ] Bus: feed line + node under the deck, hairline, one stem per strip
      meeting the hairline exactly; stems brighten only for the selection.
- [ ] The old dimension marks and their CSS are deleted; `npm run lint:dead`
      does not regress.

## States, motion, responsive

- [ ] Count shimmer while figures load; no spinner anywhere.
- [ ] Waveform drift and stem pulse stop under `prefers-reduced-motion`.
- [ ] 1200, 900, 640 and 375 match spec section 6; no horizontal page scroll.

## Accessibility

- [ ] Strips tab left to right with a visible 2px mint focus ring.
- [ ] Strip `aria-label` is `{label}, {liveCount} of {total} datasets live`;
      selected strips carry `aria-pressed="true"`.
- [ ] Status is never colour alone: LIVE/ROADMAP text labels present.
- [ ] `npm run lint:a11y` passes.

## Gates

- [ ] `npm run lint`, `lint:branding`, `lint:css`, `check:copy` pass.
- [ ] No em dashes in new UI copy; no new dependencies; Bootstrap Icons only.
