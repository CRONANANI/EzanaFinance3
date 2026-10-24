# Titans Shadow: four dataset pages removed (Oct 2026)

Removed pages: Activist (13D/13G), Fund Holdings Data, SEC EDGAR and Prices &
Fundamentals. The pages and their navigation are gone. The data, ingests,
crons, migrations and read functions stay. No migration in this change.

Fund Holdings Data and SEC EDGAR were two taxonomy items pointing at the same
page, `/datasets/sec-filings`. Prices & Fundamentals was `/datasets/markets`.

## Redirect map (`next.config.js`, all 308)

| Old URL                                                 | New URL                                 | Why                                                                                                                            |
| ------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/datasets/activist`, `/datasets/activist/:path*`       | `/datasets/whale-moves`                 | Whale Moves already lists every Schedule 13D/13G stake (kind filter "Activist"). Closer than Institutional, which is 13F only. |
| `/datasets/sec-filings?manager=<cik>`                   | `/datasets/institutional?manager=<cik>` | Opens Manager Fingerprint for that filer.                                                                                      |
| `/datasets/sec-filings`, `/datasets/sec-filings/:path*` | `/datasets/institutional`               | 13F filings are the Institutional page.                                                                                        |
| `/datasets/markets`, `/datasets/markets/:path*`         | `/datasets/institutional`               | No remaining fundamentals page; Institutional is the dimension's lead page.                                                    |

Checked against `next dev`: each old URL answers 308 to the target above,
including the `?manager=` forward.

## Activist (`/datasets/activist`)

|                       |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Files deleted         | `src/app/datasets/activist/` (ActivistClient, ActBoards, ActCards, ActPanels, activist.css, activist-fixture.sample.json, loading.js, page.js); page-only APIs `src/app/api/titans/activist/` (route, after, filings, investor, target)                                                                                                                                                                                        |
| Files kept            | `src/lib/titans/activist-store.js`, `activist-model.js`, `src/lib/sec/schedule13-meta.js`, `src/lib/whale-score.js`, `src/components/datasets/titans/ui.jsx` (shared with Institutional), `scripts/check-activist.mjs` (tests the shared model and `purposeSentences`)                                                                                                                                                         |
| Inbound links changed | taxonomy item removed (Navbar, CategoryBar dropdown, hubs, Sonar orbital, landing visuals all read it); `src/app/datasets/layout.js` standalone list; `src/app/sitemap.js`; Institutional convergence board "13D or 13G stake" dot and Security X-ray cross-signal row now go to Whale Moves; Titans hub "activist targets" card rows now go to Whale Moves; EzanaQL JOINS chip `titans.activist_stakes` now names Whale Moves |
| Snapshot builder      | `compute-whale-moves` cron no longer calls `refresh_titans_activist` (its only reader was this page). The SQL function and the existing `titans_snapshots` rows stay.                                                                                                                                                                                                                                                          |
| Redirect              | `/datasets/whale-moves`                                                                                                                                                                                                                                                                                                                                                                                                        |

## Fund Holdings Data and SEC EDGAR (`/datasets/sec-filings`)

|                       |                                                                                                                                                                                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files deleted         | `src/app/datasets/sec-filings/` (SecFilingsClient, sec-filings.css, sec-filings-sample.js, loading.js, page.js); page-only API `src/app/api/sec-filings/detail`                                                                                                      |
| Files kept            | `src/lib/sec-filings-store.js` (`getSecFilings` still feeds the datasets pulse), `ingest-sec-filings` cron, `sec_filings` tables, `/api/titans/fund` (`getFundHoldings`, used by Manager Fingerprint)                                                                |
| Inbound links changed | both taxonomy items removed; layout standalone list; sitemap; `DatasetsSubnav` "SEC filings" tab now "Institutional holdings"; Sonar `SAME_READ_AS` emptied and `rollup` takes the map as a parameter; hub stat strip dedupe uses that map instead of the two labels |
| Redirect              | `/datasets/institutional` (with `?manager=` forwarded)                                                                                                                                                                                                               |

## Prices & Fundamentals (`/datasets/markets`)

|                       |                                                                                                                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files deleted         | `src/app/datasets/markets/` (FundamentalsClient, fundamentals.css, markets-sample.js, layout.js, loading.js, page.js); page-only API `src/app/api/titans/fundamentals`                                                      |
| Files kept            | `src/lib/titans/fundamentals-store.js` (`getFundamentalsTable` feeds the pulse), XBRL frames ingest, `sec_fundamentals` table, EzanaQL `titans.fundamentals`                                                                |
| Inbound links changed | taxonomy item removed; layout standalone list; sitemap; dataset page footer "Markets" link; `DatasetsSubnav` "Markets & equities" tab; EzanaQL JOINS chip for `titans.fundamentals` now shows the catalog name with no link |
| Redirect              | `/datasets/institutional`                                                                                                                                                                                                   |

## Feeds, panels and search

- **Conveyor belt and ticker.** The four pulse adapters keep running under
  neutral labels (Activist stakes, 13F filings, SEC filings, Company
  fundamentals) with `dimensionId: 'titans'`. Their items open the existing
  event panel; the panel shows the dataset name with no page link
  (`href: null`). They do not count toward the "live datasets" figure.
- **Sonar.** Sweeps (`activist`, `sec-filings` ids) and match blocks are
  data ids, not links, and are unchanged. Dataset links in Sonar come from the
  taxonomy, so the removed pages no longer appear.
- **EzanaQL.** `titans.activist_stakes` and `titans.fundamentals` stay in the
  catalog and stay queryable.
- **Target File "Prices and fundamentals" link.** Lived in the deleted
  `ActPanels.jsx`; gone with it. Manager Fingerprint had no link into the
  removed pages.
- **Help center, tours, emails, analytics.** No references found.
- **Hub summaries.** The label-keyed hub stat readers for the four removed
  items were deleted from `src/lib/datasets/hub-data.js` (they only fed the
  removed hub rows). The underlying tables are untouched.
- **CSS.** `.act-card` removed from both lists in `ds-cards.css`; no other
  `act-` classes existed outside the deleted page. `.fndx-card` stays (used by
  the insider, ETF, exec-comp and prediction-markets styles).
- **Perf.** Route entries removed from `docs/perf/budgets.json`,
  `docs/perf/datasets-baseline.md` and `docs/datasets/BUILD_QUEUE.md`.

## Crons and ingests

None was triggered only from these pages. `ingest-sec-filings`,
`compute-whale-moves`, the XBRL frames ingest and the 13D/13G ingest keep
running. The only change is the activist page snapshot call noted above.

## Unused now, could go later (only if the data is dropped too)

Nothing below was deleted.

- `getActivistOverview`, `getActivistFilings`, `getInvestorDossier`,
  `getTargetFile`, `getEventPricePaths`, `raisedFrom` (activist-store),
  `getActivistFiling` (store.js): no callers left.
- `controlShare`, `intentShifts`, `ladderSteps`, `switches` in
  `activist-model.js`: only `scripts/check-activist.mjs` uses them.
  `medianPath` and `windowRange` are still used by activist-store.
- `G_RULE_BASIS` in `schedule13-meta.js`: no callers.
- `getFundamentalsHistory` (fundamentals-store): no callers.
- `get13FHoldings`, `getActivistPosition` (sec-filings-store): no callers.
- SQL function `refresh_titans_activist` and the `activist:%` rows in
  `titans_snapshots`.
