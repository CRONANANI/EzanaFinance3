# Politician Tracker: what the page does today

Brief for a redesign of `/datasets/politician-tracker` on ezana.world. It describes the page as it exists on `main` (audited at commit `783603c`, 2026-09-28): every section, every number, where the data comes from, how it behaves, and the rules a new design must keep. Redesign the look and layout freely; keep the behaviour and data contract unless a change is called out.

Read before touching code: `CLAUDE.md`, `docs/ENGINEERING.md`, `EZANA_BRANDING_GUIDE.md` (tokens in `src/app/theme-variables.css`).

---

## 1. Purpose

One page that lists every member of the U.S. House and Senate who has disclosed stock trades under the STOCK Act, in a single list. Chamber is a column, not a switch. The page opens on a House vs Senate comparison, then the list; selecting a politician opens a side panel with their trade profile, the members who trade most like them, and the federal contractors among the companies they trade.

Tone: Bloomberg/FT, data first, nothing editorialised. Every figure is a count or a sum of disclosed ranges; nothing is estimated or invented.

## 2. Files

| What | Path |
|---|---|
| Route | `src/app/datasets/politician-tracker/page.js` (server; reads `?member=`) |
| Page component | `src/components/datasets/politician-tracker/PoliticianTracker.jsx` (client) |
| Member side panel | `src/components/datasets/politician-tracker/MemberPanel.jsx` |
| Portrait / initials avatar | `src/components/datasets/politician-tracker/Headshot.jsx` |
| Page styles (`ptk-` prefix) | `src/components/datasets/politician-tracker/politician-tracker.css` |
| Shared sheet it builds on (`dsc-` prefix) | `src/components/datasets/disclosures/disclosures.css` |
| Pure data model (no React) | `src/lib/politicians/tracker-model.js` |
| Trade normalisation + member enrichment | `src/lib/politicians/normalize-trade.js`, `member-directory.js`, `legislators-current.json` |
| Portrait resolution | `src/lib/politicians/headshots.js` |
| Trades API | `src/app/api/politicians/trades/route.js` |
| Contractor API | `src/app/api/politicians/contractor-exposure/route.js` |
| Nav entry | `src/lib/datasets/taxonomy.js` (Capitol Watch, "Politician Tracker") |
| Layout (draws shared green chrome + ticker) | `src/app/datasets/layout.js` (route is in `STANDALONE_ROUTES`) |
| Redirects from old URLs | `next.config.js` |

## 3. Data

### 3.1 Trades: `GET /api/politicians/trades?page=N&limit=500`

- Server fans out to the latest House and Senate disclosure feeds (max 100 rows per chamber per page), normalises every row, enriches it with the member directory (party, state, district, BioGuide ID), merges both chambers, drops rows with no name, sorts by filed date descending.
- If one chamber fails, the other still returns. 502 only if both come back empty; 503 if the data source is not configured. Rate limit 60/min per IP.
- The page calls pages 0, 1 and 2 in parallel and de-duplicates. The **loaded window is therefore roughly the 600 most recent disclosures** (up to 200 per page). Every stat on the page is "in the loaded window"; the UI does not currently show the date range of that window.

Canonical trade fields the page binds to (never raw provider fields):

| Field | Meaning |
|---|---|
| `id` | Row id (page builds a fallback key if absent) |
| `name`, `chamber` (`House`/`Senate`), `party` (`D`/`R`/`I`), `state`, `district`, `bioguideId` | Who |
| `ticker` | Upper-case symbol, or null |
| `side` | `purchase` / `sale` / `exchange` / `other` (partial sales count as `sale`) |
| `amountBand` | `{ raw, min, max, mid }` parsed from the disclosed range, e.g. `"$1,001 - $15,000"`; open-ended ranges have `max: null`, `mid = min` |
| `tradedAt`, `filedAt` | ISO dates |
| `sourceUrl` | Link to the original filing, or null |

### 3.2 Contractors: `GET /api/politicians/contractor-exposure`

Returns `{ ok, fiscalYear, byTicker: { LMT: { recipient, total, awards } } }`: the top federal contract recipients for the last complete federal fiscal year (falls back one more year), mapped to tickers through a hand-kept map of unambiguous public companies. Unmapped recipients are skipped, never guessed. Cached 6 hours server-side.

### 3.3 Derived model (`tracker-model.js`)

| Function | Output |
|---|---|
| `buildMembers(trades)` | One row per member, keyed by BioGuide ID (else chamber + normalised name). Adds `slug`, `trades` (newest first), `count`, `buys`, `sells`, `volume` (sum of `amountBand.mid`), `tickers` (by frequency), `tickerSet`, `lastTraded`. Default order: most trades. |
| `chamberStats(members)` | Per chamber: active members, trades, buys, sells, volume, trades per member. |
| `monthlyByChamber(trades)` | Last 12 months of trade counts, `{ month, House, Senate }`. |
| `monthlyForMember(member)` | Last 12 months of `{ month, buys, sells }` for one member. |
| `similarTraders(member, members)` | Top 5 members by Jaccard overlap of traded-ticker sets, requiring 2+ shared tickers. Returns shared tickers and score. |
| `contractorTrades(member, byTicker)` | The member's traded tickers that are top contractors, largest award total first, with trade count. |
| `usdShort(n)` | `$1.2B` / `$3.4M` / `$56K` / `$789`; returns `·` for zero, null or non-finite. |

"Volume" everywhere means **sum of the midpoints of disclosed ranges**, and the UI says so. Unknown values render as a middle dot `·`, never a dash or a zero.

## 4. Page anatomy, top to bottom

0. **Shared green chrome + scrolling ticker** (drawn by the datasets layout, not the page). The page only publishes ticker items: the 12 most recent trades as `TICKER · Member name · BUY/SELL/EXCH`.
1. **Header**, centred: eyebrow `DATASETS · CONGRESS`; title `Politician tracker`; subline "Every member of the House and Senate with disclosed trades, in one list."
2. **EzanaQL query bar** (`EzanaQLBar`, cross-dataset scope). Same component, size and placement as every other dataset page.
3. **House vs Senate** (two cards, 3:2 grid; stacks under 1000px):
   - **Trades by month, House vs Senate**: grouped bar chart, last 12 months, counts not dollars. House = `--emerald`, Senate = `--info`. Legend and caption "counts, not dollars".
   - **Who is more active**: four rows (Active members, Disclosed trades, Trades per member, Disclosed volume). Each row: House figure left, a split proportion bar, Senate figure right. Footnote names which chamber trades more per member in the loaded window and defines volume.
4. **Politician list**:
   - Toolbar: name search (substring, case-insensitive) and a Sort select: Most trades (default), Latest trade, Disclosed volume.
   - Table columns: Politician (portrait + name + `Party-District` for House or `Party-State` for Senate), Chamber chip, Trades, Buys / sells, Disclosed volume, Last trade, Top tickers (first 3). Buys/sells, volume and last trade hide under 640px; top tickers hide under 1000px.
   - Every row is clickable and keyboard-focusable (Enter or Space opens the panel). Hover tints the row; the open member's row stays selected.
   - Footer: "Members with disclosed trades in the loaded window. Select a row for the full profile." plus `N politicians`.
   - States: "Loading disclosures." while fetching; "Disclosures are temporarily unavailable. Try again shortly." if nothing came back.
5. **Compliance line**: "Disclosures are public records filed under the STOCK Act. Amounts are the ranges members disclose. Nothing here is investment advice."

## 5. Member panel (right side panel; full width with pinned header under 640px)

- Header: route label `POLITICIAN TRACKER / HOUSE|SENATE` and a close button.
- Identity: 96px portrait (72px on phone), name, chamber chip, `Party-District/State`.
- Stat row: Trades, Buys, Sells, Volume.
- **Trade activity**: small buys-vs-sells monthly bar chart (buys emerald, sells `--dsc-sell-mark`), then a table of the 10 most recent trades: Ticker, Type chip (BUY / SELL / EXCH / OTHER), Amount (raw disclosed range), Traded date, link out to the source filing.
- **Trades most like**: up to 5 members, each a button showing portrait, name, chamber chip, up to 4 shared tickers, and overlap %. Clicking one swaps the panel to that member. Empty state: "No other member shares two or more of these tickers in the loaded window."
- **Government contractors they trade**: caption `FY{year} awards`; table of Ticker, Recipient, Awarded (usdShort), Trades. Empty state names the fiscal year; before data arrives it reads "Contract data is loading."
- Compliance note at the bottom.

## 6. Behaviour and state

- **URL**: the open member is `?member=<slug>`, so a panel is linkable and survives a refresh (`page.js` passes it in as `initialMember`).
- **History**: opening the panel pushes one history entry; swapping to another member (from "Trades most like") replaces it, so Back always closes the panel instead of walking through members. Closing pops the entry. `popstate` re-reads `?member=`.
- **Focus**: the panel takes focus on open; Escape closes; focus returns to the row that opened it. A scrim button behind the panel also closes it.
- **Panel offset**: the panel sits below the shared chrome; its top is measured from `.dscat-chrome` into `--dsc-panel-top` on open, scroll and resize.
- **Portraits**: official public-domain congressional portraits by BioGuide ID; initials on failure or when no ID resolves. The avatar ring is coloured by party.
- **Fetching**: trades and contractors load in parallel on mount; contractors failing leaves the panel section empty, not the page.

## 7. Rules the redesign must keep

- Tokens only from `src/app/theme-variables.css`; no hard-coded hex; test dark (default) and light mode. Radii are `--radius-sm/md/lg/xl` (4/8/12/16).
- Plus Jakarta Sans for words; JetBrains Mono with `tabular-nums` for every figure, ticker, date and range.
- Bootstrap Icons only (`bi-*`). No Tailwind, TypeScript, shadcn or lucide.
- Page-scoped class prefix `ptk-`; zero new global tokens; prefer `color-mix` over new colours.
- Respect `prefers-reduced-motion`. Loading should use shimmer skeletons, not spinners (brand guide section 9).
- No em dashes anywhere in UI copy.
- Never name backend or data vendors in visible copy; describe only the public source (Clerk of the House, Senate Office of Public Records, USAspending for contracts).
- Zero data invention: no performance %, no estimated dollar amounts, no inferred positions. Counts and disclosed-range midpoints only, labelled as such.
- Do not draw the green chrome or ticker in the page; publish ticker items through `usePublishTicker`.
- Keep `EzanaQLBar` at the shared size and placement.
- Keep the compliance line and the "Nothing here is investment advice" wording.
- Keep keyboard access, focus return, Escape to close, and the one-entry-per-panel history rule.
- Keep all computation in `tracker-model.js` (pure functions); components render, they do not calculate.

## 8. Known gaps worth fixing in the redesign

1. **Loaded window is invisible.** Stats cover about the 600 most recent disclosures but the page never shows the date range. Show it (min to max `tradedAt`).
2. **No filters beyond name search.** No chamber, party, side, ticker or date filter; sort is a plain select. The old per-chamber redirects (`/datasets/house/disclosures` → `?chamber=house`, same for Senate) pass a `chamber` param the page now ignores; a chamber filter could honour it.
3. **Party ring uses `--negative` red for Republicans**, which conflicts with the brand rule that red means negative states only. Needs a non-semantic party treatment.
4. **Panel shows only the 10 most recent trades**, with no way to see the rest.
5. **Contractor section says "Contract data is loading." forever** if that request fails; it needs a real failure state.
6. **Loading state is a line of text**, not a skeleton.
7. **Orphaned member pages.** `/datasets/house/members/[slug]` and `/datasets/senate/members/[slug]` still render the older disclosures profile on sample data and are no longer linked from the tracker (which uses `?member=`). Decide: redirect them to `/datasets/politician-tracker?member=<slug>`, or remove.
8. **Dead CSS**: `.dsc-chamber` (the former House | Senate switch) in `disclosures.css` has no users.

## 9. Acceptance for a redesign

- All sections in sections 4 and 5 present, with the same figures from the same model functions.
- `?member=` deep link, Back behaviour, Escape, focus return all work.
- Correct at 1440px, 1000px, 640px and 375px; no horizontal page scroll.
- Dark and light mode both checked.
- `npx eslint src/components/datasets/politician-tracker src/lib/politicians` passes.
