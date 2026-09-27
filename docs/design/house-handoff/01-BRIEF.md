# House Financial Disclosures, build brief

## 1. What this page is

The public face of Ezana's U.S. House financial-disclosure dataset, part of the
Capitol Watch dimension, at `/datasets/house/disclosures`. Members of Congress,
their senior staff and candidates must disclose holdings annually and report
each securities transaction within 45 days. This page is where a visitor sees
**who filed what, when, and what they traded.**

It is the second page in the datasets family after Government Contracts. It
must feel like a member of that family: the same shared chrome up top
(`06-SHARED-CHROME.md`), the same centred eyebrow and title, the same EzanaQL
builder pattern, the same filter rail on the left. It should not copy the
Contracts page's structure where the data differs, and it does not inherit the
two-deep modal stack.

Audience: retail investors tracking congressional trading, journalists and
researchers, SMIF students. It is a research surface, not a trading signal.

## 2. Two layers of data, and the design respects the difference

- **The filing index**: one row per disclosure document (who, type, year,
  filing date, document ID, link to the original PDF). Complete and loaded.
- **The trade detail**: the transactions inside a Periodic Transaction Report:
  asset, ticker, buy/sell/exchange, transaction date, and a disclosed **amount
  bracket**. Extracted from filing PDFs; available for electronic filings,
  pending for older scanned ones.

## 3. The data, honestly

- Source: the Clerk of the U.S. House. Nineteen yearly index files, 2008 to
  2026, about 45,000 filings.
- 2008 to 2011 are small, before transaction reporting existed. 2012 onward
  carries the STOCK Act's PTRs, roughly 2,000 to 7,000 filings a year. 2013
  alone holds about 2,300 PTRs; 2026 to date holds 400.
- **Gaps the page states rather than hides**: 2014 has only 11 filings, which
  is what the Clerk published. A handful of filings carry typo dates in the
  source and are stored without a date. Withdrawals carry no date by
  convention. Older filings are scanned images and their trades are marked
  pending, never shown as empty.
- **Amounts are brackets, never exact.** `$1,001 to $15,000`, `$15,001 to
$50,000`, up to `Over $50,000,000`. The page may sort on a bracket midpoint
  internally but never displays one. A `~est.` marker sits beside any size sort.
- PTRs post within days of filing; annual reports arrive in a mid-June wave.

## 4. The jobs, in priority order

1. See what was traded recently, in which tickers.
2. Look up one member: filing history and every disclosed transaction.
3. Look up one ticker: which members traded it, when, which direction.
4. Browse the filing record and open any original document.
5. Understand coverage: which years have trade detail and which only filings.

## 5. The design, as approved

**Trades first.** The page opens on the trades view because that is what people
come for. The other views are tabs: Filings, Members, Tickers, Coverage. The
record stays one click away; coverage carries a small amber marker so honesty
about 2014 and the pre-2012 era is discoverable without being the first thing
a visitor reads.

**The builder is quiet.** One 44px light pill under the title, 720 wide: the
Ezana AI mark, "Describe a report in plain English", and a tinted Generate
button. The current query sits under it as one line of small grey mono with
Edit, Run, CSV and JSON as text links. That is the whole builder at rest. It
expands in place, on white, never as a dark panel, and it is never the focal
point of the page. The data is.

**The rail** carries what matters for trades: member search, ticker search,
year, buy/sell/exchange, the amount brackets as a checklist, and a disclosure
lag toggle at 45 days, with the one-line note that amounts are ranges.

**One chart.** Transactions by month, buys versus sells, with a most-traded
leaderboard beside it. Counts, not dollars, because dollars would be a lie
built on brackets. No other chart on the page.

**The trades table** carries member, ticker, asset, type, traded, filed, lag,
the bracket verbatim, and a link to the source PDF on every row. Lag over 45
days is marked amber. The 45-day lag is a column and a filter, not a footnote.

**The member panel.** Clicking any member name opens a 480px panel from the
right, under the shared chrome, over a light scrim. It carries identity, four
stats, most-traded chips, a disclosure-lag dot plot against the 45-day line,
the member's filings and trades with PDF links, and two actions. It has its own
URL, so it is shareable and the same route renders as a full page. Clicking a
different member swaps the content in place. There is never a second layer.

## 6. Copy

```
Eyebrow      DATASETS · HOUSE CLERK          (+ SAMPLE DATA chip when applicable)
Title        House financial disclosures
Builder      Describe a report in plain English   ·   Generate EzanaQL
Metric heads FILINGS · PTRS IN 2026 · TRANSACTIONS EXTRACTED · MOST RECENT FILING
Tabs         Trades · Filings · Members · Tickers · Coverage
Chart head   TRANSACTIONS BY MONTH, 2026      counts, not dollars
Leaderboard  MOST TRADED, LAST 30 DAYS
Table heads  MEMBER · TICKER · ASSET · TYPE · TRADED · FILED · LAG · AMOUNT DISCLOSED
Rail note    Amounts are the ranges members disclose. Nothing on this page shows an exact figure.
Table foot   Lag is days from transaction to filing; the law allows 45. Every row links to
             the original PDF at the Clerk of the House.
Pending      Scanned filing, trades pending extraction
Empty        No trades match. Try clearing <filter>.
Panel head   MEMBER   /datasets/house/members/[slug]   Open page
Panel stats  FILINGS · PTRS · TXNS · MEDIAN LAG
Panel lag    DISCLOSURE LAG, LAST 12 MONTHS   45D LINE   N of M past 45 days
Panel CTAs   Set an alert   ·   All filings, 2008 on
Panel note   Alerts need a free account. Everything else here is open.
Compliance   Disclosures are public records, shown as filed with the Clerk of the U.S.
             House. Amounts are the ranges members disclose. Nothing here is investment advice.
```

No em dashes anywhere. Unrated or unknown values are a middle dot, never a
dash and never a zero.

## 7. Hard constraints

- **Amount brackets, never invented precision.** Any size comparison is visibly
  an estimate.
- **Every claim traceable**: each trade row reaches the source PDF at the Clerk.
- **Mono tabular numerals** for every figure, ticker, date, lag and rank.
- **No backend or infrastructure names** in visible copy. The source is the
  Clerk of the House.
- **Real people**: factual presentation only, no editorial framing, no implied
  wrongdoing, no performance claims about following their trades. The fixture
  uses `[Member name]` placeholders; do not attach invented trades to real
  members in any demo.
- The compliance line is present on every state of the page.
- Page-scoped CSS prefix `hfd-`. Design tokens only, per `03-TOKENS.css`.
- The shared chrome is mounted from the shared component, never restyled here.
- Guests see everything; sign-in is only for saving, watchlists and alerts.
- Responsive: the trades view becomes a card list on phones, never a
  sideways-scrolling table.
- Bootstrap Icons only. No em dashes. No new dependencies.

## 8. Open questions from the brief, and how the design answers them

| Question                          | Answer                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| Trades or filings first?          | Trades. Filings is the second tab and the filings view expands a row to its trades. |
| How prominent is coverage?        | A tab with an amber marker. One click away, never the opening read.                 |
| Is there a chart worth having?    | One: transactions by month, buys versus sells, in counts.                           |
| Member profile: overlay or route? | Both. A side panel that pushes a route; the route alone renders the full page.      |
| How is the 45-day lag surfaced?   | A table column, a rail filter, an amber mark over 45, and a dot plot in the panel.  |
