# Ship checklist, Lobbying Activity

Every box is checkable without asking the designer. Numbers from
`04-SPEC.md`, behaviour from `02-INTERACTIONS.json`, data from `06-DATA.md`,
honesty rules from `07-DATA-INVENTORY.md` section 1.6.

## Brand and chrome

- [ ] `grep -rn "lucide" src/app/datasets/government/lobbying` returns
      nothing; Bootstrap Icons only, decorative ones `aria-hidden`.
- [ ] No gold: `grep -rniE "gold|#d4a853|#d4af37" src/app/datasets/government/lobbying` returns nothing.
- [ ] Cards draw no outline and no shadow; `lbx-card` is on the ds-cards
      list and nothing re-adds a border.
- [ ] Tokens only: `npm run lint:branding` and `lint:css` pass; the
      `--echo-chart-*` palette resolves on this page in dark and light.
- [ ] Every number, ticker and date is mono tabular; no prose is mono.
- [ ] Shared chrome and ticker belt untouched; belt items are
      `CLIENT · $AMOUNT · ISSUE`.
- [ ] Dark (default) and light both checked at 1440 against the wireframe
      boards; phone 390 matches, no horizontal scroll.

## Honesty

- [ ] No dollars-per-issue anywhere: the Issue Landscape and Pressure Map
      payloads and UI carry counts and shares only, with the LDA footnote.
- [ ] Dollar figures come only from non-registration filings with amount
      above zero; the Pulse spend note is present verbatim.
- [ ] Verified (29) vs Name match (300) is visually distinct everywhere a
      ticker appears: solid check vs dashed badge with the tooltip.
- [ ] Honoree and committee names render exactly as filed, never link, and
      the "Names as filed" note is present.
- [ ] Contribution dates are clamped to the filing period
      (`clampToPeriod` tested against a 2004-dated item in a 2025 report).
- [ ] Empty states name the active filters; no placeholder numbers anywhere;
      sample data never renders in production.
- [ ] No invented amounts or positions attach to a real person in any
      fixture, story or screenshot ([Name as filed] placeholders only).
- [ ] YoY shows a middle dot when the prior period is empty, never Infinity.
- [ ] `npm run check:copy` passes; attribution is only
      "Senate LDA (lda.gov)"; `grep -rn "—"` over the new files is clean.

## Filters and URL

- [ ] Period, issue, entity, min, public-only and search drive every card
      per `filters_apply_to` and round-trip through the URL.
- [ ] Issue chip counts are live under the other filters; the issue sheet
      exposes all 79.
- [ ] Issue Landscape rows and Pressure cells set the page issue filter.
- [ ] The min slider moves over the discrete stops with keyboard arrows and
      announces the stop label.
- [ ] Reset clears everything and the URL.

## Cards

- [ ] Pulse: five tiles with YoY pills (sign and arrow, never colour alone).
- [ ] Leaderboard: top 15, bars vs rank 1, share of period total, coverage
      chip in partial periods, client drawer with filings, issues, firms.
- [ ] Issue Landscape: ranked bars (no donut anywhere), both footnotes.
- [ ] Pressure Map: 12 x 10, row and column totals, hover with top three
      clients, hidden table fallback, horizontal scroll under 1100.
- [ ] Rhythm: 12 quarters, ghost "Not yet filed" bars, the received-percent
      flag from ingest-status (never hardcoded), filings line, summary
      caption.
- [ ] Revolving Door: lead share, firm ranking, covered positions as filed
      on expand, the non-accusatory footnote.
- [ ] Lens: badges per mapping, live price and day change, 6-month
      sparkline; company modal is emerald-only with quarterly spend bars
      overlaid on price, largest filings, firms hired.
- [ ] Ratio: log-log scatter, 1y/2y, awards-per-dollar list, the correlation
      caption.
- [ ] Money to Members: totals, three tabs, five type chips with counts,
      both notes, no links on honorees.
- [ ] Disclosures: three modes, spec columns, filing modal with the lda.gov
      link kept, CSV signed-in only (disabled with tooltip signed-out).

## States, a11y, gates

- [ ] All five states per card, sized so filter changes never move layout.
- [ ] Retry refetches only its card. Partial periods are amber, never error.
- [ ] Focus ring 2px emerald everywhere; modals and the drawer trap focus,
      close on Escape and return focus; `npm run lint:a11y` passes.
- [ ] Charts carry accessible summaries; motion off under
      `prefers-reduced-motion`.
- [ ] `page-model.js` functions are pure with `npm run test:lobbying-page`
      green and wired into `npm test`; components contain no arithmetic.
- [ ] `npm run lint`, `lint:arch`, `test:security` pass; new aggregates are
      cache-only, rate limited, honest-zero.
