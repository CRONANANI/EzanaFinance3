# Ship checklist, Committee Assignments

Every box is checkable without asking the designer. Numbers from
`04-SPEC.md`, behaviour from `02-INTERACTIONS.json`, data from `06-DATA.md`,
honesty rules from `07-DATA-INVENTORY.md` section 1.7.

## Brand and chrome

- [ ] Cards draw no outline and no shadow; `cmx-card` is on the ds-cards
      list and nothing re-adds a border.
- [ ] No gold: `grep -rniE "gold|#d4a853|#d4af37" src/app/datasets/committees` returns nothing.
- [ ] Party is the neutral letter tag everywhere; no red or blue encodes a
      party: the only sided colours are majority/minority and buy/sell,
      each always beside a text label.
- [ ] Tokens only: `npm run lint:branding` and `lint:css` pass; the
      `--echo-chart-*` palette resolves on this page in dark and light.
- [ ] Numbers, tickers, dates and thomas codes are mono tabular; no prose
      is mono.
- [ ] Headshots lazy-load with initials fallback and shimmer circle, as on
      Politician Tracker.
- [ ] Shared chrome untouched; belt items are
      `MEMBER (P-ST) · SIDE · TICKER · $RANGE · COMMITTEE` with ranges as
      disclosed.
- [ ] Dark and light checked at 1440 against the wireframe; phone 390
      matches; no horizontal page scroll.

## Honesty

- [ ] The disclosure-pattern footnote renders on Cards 7, 8 and 10
      verbatim.
- [ ] The sector note renders wherever sector links show (atlas, profile,
      oversight map, footer), from one shared string.
- [ ] "Holdings inferred from disclosures" labels the matrix; its payload
      and UI carry no dollar values.
- [ ] Trade amounts render as disclosure ranges everywhere; no point
      values.
- [ ] Unmapped tickers are counted and shown quietly, never guessed into a
      sector.
- [ ] Hearings ships the not-yet-available default; the populated layout
      is unreachable while `hearingsAvailable` is false; no dateless rows
      render.
- [ ] No invented trade, holding or position attaches to a real member in
      any fixture, story or screenshot ([Member name] only).
- [ ] Empty states name the active filters; no placeholder numbers;
      `npm run check:copy` passes; no em dashes in new UI copy.

## Controls, URL, selection

- [ ] View, chamber, party, sector and search drive the cards per
      `controls_apply_to` and round-trip through the URL.
- [ ] `?committee=HSIF` and `?member=BIOGUIDE` deep links keep working and
      scroll their card into view.
- [ ] Every committee click (atlas, gavels, matrix, trades, search) loads
      Card 4; every member click (gavels, roster, seat load, trades,
      search) loads Card 10.
- [ ] The Members view moves Member Lookup under the controls; nothing
      else breaks.
- [ ] "Open in Politician Tracker" lands on
      `/datasets/politician-tracker?member=<slug>`.

## Cards

- [ ] Glance: four KPI tiles + the labelled seat-split bar; counts follow
      the chamber control.
- [ ] Atlas: chamber groups, tiles sized by seat count (2-col span at
      55+), split bars, codes, sector chips, calmer unmapped tiles,
      selected treatment, `+N more` expansion.
- [ ] Gavels: Chairs/Ranking toggle; rows per spec.
- [ ] Profile: jurisdiction, sector chips + note, subcommittee chips that
      swap the roster, facing majority/minority columns by rank with
      Chair/Ranking badges, official-site link, the trades strip linking
      to Card 7 filtered.
- [ ] Oversight map: hover and focus highlighting both directions, sector
      click filters the page, hidden table fallback, phone fallback
      without drawn links.
- [ ] Seat load: 1..10+ histogram and the most-seated list.
- [ ] Trades: summary with buy/sell split and the quiet unmapped line;
      filterable feed with ranges as disclosed.
- [ ] Matrix: heat cells with counts, hover tooltip (holders, buyers,
      sellers since 180 days), row click loads Card 4, phone ranked list.
- [ ] Lookup: seat chips with rank and badges, the 24-month dot timeline
      (colour by side, size by range), unmapped count.

## States, a11y, gates

- [ ] Loading, populated, filtered-to-empty and error per card, sized so
      filter changes never move the layout; Retry refetches only its card.
- [ ] Focus ring 2px emerald everywhere; segments and chips are
      radiogroups; search results are a listbox; map and matrix have
      hidden table fallbacks; tooltips show on focus.
- [ ] Motion off under `prefers-reduced-motion`; `npm run lint:a11y`
      passes.
- [ ] `committees-page-model.js` is pure with
      `npm run test:committees-page` green and wired into `npm test`;
      components contain no arithmetic.
- [ ] `npm run lint`, `lint:arch`, `test:security` pass; the three data
      extensions are cache-only, rate limited, honest-zero.
