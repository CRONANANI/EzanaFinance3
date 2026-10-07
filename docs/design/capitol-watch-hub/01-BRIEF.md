# Capitol Watch hub, build brief (final hybrid)

## 1. What the page is for

Capitol Watch is the political money and power dimension. The hub is its front
door: how members of Congress trade, which committees they sit on, who funds
them, who lobbies them, which companies win federal contracts, and how all of
it connects to the market. The original brief (`09-...`) describes every
module and its data; this file describes what the approved design changes.

Three jobs, now in this order of weight:

1. **Connect.** Cross-dataset signals lead the page, starting with one
   high-signal event at a time.
2. **Ask.** EzanaQL sits at the top, left-aligned, with its result visible
   immediately to the right.
3. **Summarise.** The five datasets close the page as cards.

Audience: retail investors following Congress, students in university
investment funds, journalists and analysts. Tone: institutional and
evidence-first.

## 2. What changes

| Today | Final hybrid |
|---|---|
| Centred header, three stat boxes, EzanaQL bar centred under them | Left column: eyebrow, title, one-line purpose, the stat strip, the EzanaQL bar, prompts and the generated query. Right column: the result table |
| EzanaQL results appear below the bar | Results render in a card beside the bar: 12 visible rows, ticker links to the company card, Save, CSV, JSON, Watchlist, Open full table |
| Dataset cards right after the header | Moved to the end of the page |
| No event-level view | **Top signals this week**: one high-signal event per view, full width, with arrows, a counter, a five-item preview strip and type filters |
| No user control over what counts | **Tell us what high signal means to you**: pick overlapping datasets, set conditions, preview matches, save as My signals |
| Five stacked linkage cards | One tabbed **Signals across datasets** panel (A to E); A opens by default |
| No committee by sector view | **Where oversight and ownership overlap** heatmap with selected-cell detail |
| Quick Step badge in a ranking card | Kept in **Who reads contract awards best**, icon in Ezana gold, with an explainer |
| No portfolio view | **Congress's portfolio**: 16 most widely held stocks, member counts and estimated value ranges |

## 3. What stays

- The shared dimension nav, exactly as today (`06-SHARED-NAV.md`).
- EzanaQL behaviour: Capitol-scoped, run and view signed out, export and
  watchlist gated behind the account modal, Saved reports for this hub.
- The five linkage signals, their row fields, measurement rules and sources
  (original brief section 2.4). A keeps its per-row price chart.
- Row actions everywhere: Watchlist / Save, Query this, Share.
- The states: loading per module, empty, error, signed out, preview.
- The sources footer.

## 4. The design, as approved

### 4.1 Header (two columns)

Left (560 wide): eyebrow `DATASETS · CAPITOL WATCH` with the bank icon, title
`Capitol Watch`, purpose line, stat strip (Live datasets, Records, Latest
data), the EzanaQL bar (active state shows the question and a solid Generate
EzanaQL button), Try prompts, the generated EzanaQL in a quiet mono block with
Edit, Run and Saved reports, and the scope line.

Right (fills): the result card. Header row with the question and `N ROWS ·
0.4S`; the table (Member, Party, State, Ticker, Type, Traded, Amount
disclosed); a footer line explaining the ticker click, then Save, CSV
(locked), JSON (locked), Watchlist (locked) and Open full table. Before the
first query, the card shows the default query's result (members who bought
in the last 90 days), never an empty box.

### 4.2 Top signals this week

Heading, type filters (All, Trade before award, Committee overlap, Lobbied,
then won, Same month as insiders, My signals · N), the counter `1 OF 14`,
and previous and next buttons.

One event card, full width:
- Left: event mark and type, flagged date, 26px headline, `WHY IT IS FLAGGED`
  with one checked reason per linked dataset (fact, date, amount, dataset
  label), the linked dataset chips, strength (`3 OF 5 DATASETS`), actions.
- Right (700 wide): ticker and company, a 210px daily close chart over 60
  days with the dashed award line, the trade marker and the 30 days after the
  trade in green or red, date ticks, four facts (30D return, Award, Oversight,
  Agency), a legend and the measurement note with sources.

Below it, a strip of five preview cards (type, 2-line headline, sparkline,
position number). The active one has an emerald border and halo.

### 4.3 Tell us what high signal means to you

Heading with My signals chips on the right. Panel in three columns:

1. **Pick the datasets that must overlap.** Five Capitol dataset tiles
   (check box top right, selected tiles tinted emerald) plus chips for other
   dimensions (Form 4 insiders, 13F institutions, 13D/G whales, Prediction
   markets). An OVERLAP preview shows the chosen chain.
2. **Set what makes it high signal.** Condition rows, each with a check and
   an inline value dropdown: trade within N days of an award; award at least
   $X; member's committee oversees the sector; trader types; trade amount at
   least (disclosed range floor); party; window. A link offers "Describe it
   in plain English instead", which hands the rule to EzanaQL.
3. **Preview and save.** Live match count for the window, the first three
   matches with 30-day return, "+N more", a name field, Save to My signals
   (account-gated), Alert me (account-gated), and the honesty note.

### 4.4 Signals across datasets

Tabbed card: A Trades near contract awards (default), B Who reads awards
best, C Committee overlap, D Lobbying and contracts, E Top raisers who trade.
Tab A shows the module head with trader-type filters, the table with per-row
price chart, and the measurement note plus sources. Tabs B to E render the
modules from the original brief in the same card frame.

### 4.5 Oversight and ownership, and the leaderboard

Two cards side by side, equal height.

- **Heatmap**: committees by sectors, cell shade = share of members holding,
  value printed in the cell. House / Senate toggle. Selecting a cell outlines
  it and fills the detail box below: committee by sector, share and
  `N of M members`, the holders with tickers and last trade date, and Query
  this cell.
- **Leaderboard**: rank, trader with type and party tags, Quick Step badge
  when earned, score, N, average 30D, hit rate, best ticker. A locked badge
  sits in the card head as a legend. A gold-tinted explainer box says how the
  badge is earned and that linked brokerage accounts see their progress.

### 4.6 Congress's portfolio

Two columns of eight: rank, ticker, bar for members holding, member count,
estimated value range. Party and chamber filters. The note says values are
the sum of disclosed ranges.

### 4.7 Dataset cards and sources

Five cards as today's content (lead figure, second figure, freshness, Open),
then the sources footer.

## 5. Copy

```
Eyebrow         DATASETS · CAPITOL WATCH
Title           Capitol Watch
Purpose         What Congress is doing with money right now: trades, committees, campaign cash, lobbying and the contracts that follow.
Stats           LIVE DATASETS 5 of 5 · RECORDS 192,336 · LATEST DATA Oct 7, 2026
EzanaQL         Ask Capitol data in plain English · Generate EzanaQL
Prompts         Try  Top 10 contractors by award value this fiscal year · Members who raised the most money this cycle · Who holds LMT?
Scope           Scoped to Capitol data: congressional trades, inferred holdings, contracts, lobbying, committee seats and campaign finance.
Result foot     Select a ticker for its company card: federal contracts and which members hold it.
Top signals     Top signals this week · 1 OF 14
Why             WHY IT IS FLAGGED
Strength        3 OF 5 DATASETS
Chart note      Return from the first close after the trade to the close 30 days later. Amount is the disclosed range. Sources: ...
Builder head    Tell us what high signal means to you · Your rules add events to the carousel under My signals.
Step 1          Pick the datasets that must overlap · An event qualifies only when every selected dataset has a matching record for the same company or member.
Step 2          Set what makes it high signal · Describe it in plain English instead
Step 3          Preview and save · N events match in the last 90 days · Save to My signals · Alert me
Builder note    Your rule filters public records; it does not predict prices. Saving and alerts need an account. Preview works signed out.
Signals head    Signals across datasets · five linkage views, one panel
Heatmap head    Where oversight and ownership overlap
Heatmap note    Holdings are inferred from disclosures: a purchase not followed by a full sale. Members report up to 45 days late.
Leaders head    Who reads contract awards best · Insight score = average 30-day return × hit rate, scaled down for small samples.
Quick Step      Quick Step is earned with 3+ measured trades near awards, 60%+ ahead 30 days later, averaging +5% or better. Linked brokerage accounts can track their own progress.
Portfolio head  Congress's portfolio · The stocks most widely held across Congress, from inferred open positions, with the estimated value range across members.
Portfolio note  Positions are inferred from disclosures. Value ranges are the sum of each holder's disclosed range, so they are estimates, not exact values.
Empty           Appears once a trade near an award has 30 days of price history. New awards and disclosures arrive daily.
Error           This signal could not be loaded just now. It refreshes on its own; reload in a minute.
```

## 6. Hard constraints

- Shared nav mounted, never restyled here.
- Every module ends with its window and public sources.
- Disclosed ranges, "inferred" holdings, stated return measurement.
- Strength is a count of linked datasets.
- Gold only on the Quick Step icon and its explainer.
- Emerald for brand, gain, selection; red for losses only; party marks blue
  and orange.
- Plus Jakarta Sans for UI, JetBrains Mono with tabular figures for numbers,
  tickers, dates, percentages.
- Cards: 12px radius, thin border, 2px emerald top border.
- 375 wide with no horizontal page scroll; tables scroll inside their card.
- Reduced motion respected. Bootstrap Icons only. No em dashes. No backend
  names in the UI. Page prefix `cwh-`.

## 7. Decisions for you before or during the build

1. **Gold.** Confirm it stays as the one exception to the gold/emerald rule,
   or swap to an emerald-on-ink badge.
2. **Rule builder storage.** Saved rules need a per-user store and an alert
   job. If neither exists, ship the builder as preview-only with Save gated,
   and add storage as a follow-up.
3. **Other-dimension datasets in rules** (Form 4, 13F, 13D/G, prediction
   markets) depend on those joins existing by company. Show chips only for
   joins the data layer supports; the rest render as Preview.
