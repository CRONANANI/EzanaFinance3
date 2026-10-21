# Lobbying Activity: data inventory and Claude Design brief

Page: `/datasets/government/lobbying`
Status in `docs/datasets/BUILD_QUEUE.md`: `todo`
Audited against `CRONANANI/cronanani` main at `a69a1dc` and the live database on Oct 21, 2026.

This file has two parts. Part 1 is the factual inventory of what data we hold. Part 2 is the prompt to paste into Claude Design. Every card in Part 2 is drawn only from data listed in Part 1. Nothing is invented.

---

## Part 1. What data we have

### 1.1 Source

Senate Lobbying Disclosure Act database (lda.gov). Two filing families:

- **LD-1 / LD-2**: registrations and quarterly activity reports. Who is paid, by whom, on which issues, contacting which parts of government, and how much.
- **LD-203**: semiannual contribution reports. Political contributions made by registrants and individual lobbyists, and who they honoured.

User-visible attribution is always "Senate LDA (lda.gov)". Never name the storage layer in UI copy.

### 1.2 Volumes (live, Oct 21, 2026)

| Dataset | Rows | Notes |
| --- | --- | --- |
| Filings, 2024 | 49,167 | 35,897 carry a dollar amount. About $2.06B disclosed spend in our copy |
| Filings, 2025 | 49,473 | 34,593 with an amount. About $2.14B disclosed spend. 17,624 distinct clients, 3,963 distinct registrants |
| Filings, 2026 (Q1 to Q3 so far) | 41,183 | 29,005 with an amount. About $1.83B disclosed spend |
| LD-203 contribution reports | 87,905 | 2024 mid-year through 2026 mid-year, five periods |
| LD-203 itemised contributions | 341,148 | About $1.08B total. Every item names an honoree |
| Client to ticker map | 329 | 29 hand-verified, 300 exact-name matches (unverified) |
| Filter vocabularies | 386 | 79 issue areas, 257 government entities, 50 filing types |

"Disclosed spend" means the sum of reported amounts on non-registration filings with amount above zero. It is our copy of what was filed, not an official total, and the brief must label it that way.

### 1.3 Fields per filing (`lobbying_filings`)

| Field | What it holds |
| --- | --- |
| `filing_year`, `filing_period` | Year and quarter (1st to 4th Quarter) |
| `dt_posted` | When the filing was posted |
| `amount` | Reported income (firm) or expenses (in-house), USD |
| `filing_type` | Registration, quarterly report, amendment, termination |
| `registrant_name` | The lobbying firm, or the company itself when in-house |
| `client_name`, `client_description` | Who paid for the lobbying |
| `issues` | Array of issue areas cited (code plus label) |
| `entities` | Array of government bodies contacted (Senate, House, agencies) |
| `lobbyists` | Array of lobbyists with covered position text and a revolving-door flag |
| `lobbyist_count` | Lobbyists named on the filing |
| `document_url` | Link to the original filing on lda.gov |

Derived per row by the API: `ticker`, `exchange`, `companyLabel`, `isPublic` (from the ticker map).

### 1.4 Fields per LD-203 contribution item

`contribution_type` (FECA 338,383 items; honorary expenses 2,251; meeting expenses 310; presidential inaugural 121; presidential library 83), `contributor_name`, `payee_name` (committee paid), `honoree_name` (member or official honoured, free text as filed), `amount`, `contribution_date`. The parent report adds year, period, filer type (lobbyist or organisation), registrant, lobbyist name, and document link.

### 1.5 API routes already built

| Route | Returns | On the page today |
| --- | --- | --- |
| `/api/lobbying/summary` | Period spend, filings, distinct registrants and clients, revolving-door lobbyists | Yes, stat cards |
| `/api/lobbying/top-spenders?by=client\|firm` | Ranked spenders with coverage note | Yes, leaderboard |
| `/api/lobbying/by-issue` | Share of filings per issue (activity, not dollars) | Yes, donut |
| `/api/lobbying/filings` | Filtered, paged filings (year, issue, entity group, registrant, client, type, min amount, public only, sort) | Yes, table |
| `/api/lobbying/filing/[uuid]` | One filing in full | Yes, modal |
| `/api/lobbying/constants` | Issue, entity, filing type vocabularies | Yes, filter rail |
| `/api/lobbying/ingest-status` | Per-quarter coverage and last run | Yes, footer |
| `/api/lobbying/contributions` | LD-203 itemised contributions, filterable by honoree, payee, registrant, lobbyist, type, period, min amount | **No. Data exists, no UI** |
| `/api/lobbying/feed?ticker=` | Latest filings with spend, optionally for one ticker | Used on Home, Sonar, Inside the Capitol, not here |
| `/api/datasets/capitol/lobbying-ratio?years=1\|2` | Lobbying spend vs federal contract awards per ticker | Capitol hub only |
| `/api/market-data/quotes`, `/api/market-data/stock-candles` | Live quote and price history for mapped tickers | Yes, company card |

### 1.6 Honesty rules (binding on design)

1. The LDA does not itemise dollars per issue. Any issue view is a count or share of filings, never dollars.
2. Dollar figures only come from non-registration filings with amount above zero.
3. Unverified ticker matches (exact-name) must look different from the 29 verified ones, or be excluded where precision matters.
4. LD-203 honoree names are free text as filed. They cannot be joined to a member record with certainty, so they are shown as filed, never linked to a member profile automatically.
5. Contribution dates contain filer typos (some dated 2004 and 2029). Charts clamp to the filing period.
6. Empty states are honest: "No filings match these filters", never placeholder numbers.

### 1.7 Gaps

- No time series per client beyond quarterly filings (fine, quarters are the native grain).
- The Quiver ticker harvest wrote zero rows; ticker coverage is the 329 above.
- No mapping from issue areas to congressional committees yet.
- The current page imports `lucide-react` icons and uses gold accents in `CompanyCard.jsx`; both violate the brand guide and must go in the redesign.

---

## Part 2. Prompt for Claude Design

Paste everything below the line into Claude Design.

---

You are designing a new layout and a new set of component cards for the **Lobbying Activity** page of Ezana Finance (ezana.world), a financial intelligence platform for retail investors and university student-managed investment funds. The page lives at `/datasets/government/lobbying` inside the Capitol dimension. It answers one question: **who is paying to influence Washington, on what, and how does that touch public companies and the people they fund.**

Tone: Bloomberg or FT data desk. Data first, calm, precise. No exclamation marks, no hype, no em dashes anywhere in copy (use commas, colons, periods or parentheses).

### Design system (non-negotiable)

- Dark mode first, light mode must work through tokens. Backgrounds `--bg-primary`, cards `--surface-card`, hover `--surface-card-hover`, nested `--bg-tertiary`.
- Text tokens: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-faint`, `--text-ghost`. The tokens `--border-color` and `--text-tertiary` do not exist; never use them.
- Brand emerald `#10b981` (`--emerald`) is for positive values and every interactive hover, selected and focus state. Dark emerald `#047857` for pressed.
- Charts use the `--echo-chart-*` palette: blue neutral, green positive or live, orange watch, `--echo-chart-red` for decline (never `--danger`), purple tertiary.
- No gold anywhere on this page. Gold is reserved for partner products.
- Fonts: Plus Jakarta Sans for all UI text; JetBrains Mono with `tabular-nums` for every number, ticker and date; never mono for prose. One sans weight plus one emphasis weight per card at most.
- Cards follow the Ezana standard card (radius 12px, 1.5rem padding, header with title and uppercase muted subtitle, bottom divider in `--border-secondary`), **with one dataset-page rule: no outline border on the outside of any card.** Separation comes from fill and spacing.
- Page width: the shared dataset canvas (`--marketing-shell-max`), identical to Politician Tracker, Government Contracts and Prediction Markets.
- Icons: Bootstrap Icons only (`bi-*`). Decorative icons are `aria-hidden`.
- Loading: shimmer skeletons in each card's own shape, never spinners. All motion respects `prefers-reduced-motion`. Durations: hover 0.15s, card 0.2s, modal 0.35s.
- Never mention backend infrastructure in UI copy. Attribute only "Senate LDA (lda.gov)".
- No Tailwind, no TypeScript, no shadcn. Page-scoped CSS prefix `lbx-`.

### Reference pages to match in aesthetic, not in cards

Politician Tracker and Government Contracts are the finished benchmark. Match their header, chrome, ticker belt and spacing rhythm. Every card on this page must be unique to lobbying; do not reuse their card shapes.

### What stays

- Shared datasets chrome and ticker belt. The ticker publishes the latest posted filings as `CLIENT · $AMOUNT · ISSUE`.
- The filing detail modal content (restyle only) and its link to the original filing.
- The data health footer (per-quarter coverage), restyled to a single quiet line.

### Global filter bar (sticky, drives every card)

Period: FY2024, FY2025 (default, fully populated), 2026 YTD, single quarter, last 90 days. Issue area (79, searchable, top 12 as chips with live counts). Government entity group (Congress, executive agencies, independent agencies). Minimum amount slider. Toggle "Public companies only". Search over client and firm. Reset link. Every card's empty state names the active filters.

### Page order (desktop)

1. Header: kicker `DATASETS · LOBBYING ACTIVITY`, title `Lobbying activity`, lead, `Filings as of {date}` in mono.
2. Sticky filter bar.
3. Card 1 Influence Pulse, full width.
4. Card 2 Spend Leaderboard (7/12) beside Card 3 Issue Landscape (5/12).
5. Card 4 Pressure Map, full width.
6. Card 5 Quarterly Rhythm (6/12) beside Card 6 Revolving Door (6/12).
7. Card 7 Public Company Lens, full width.
8. Card 8 Lobbying vs Contracts (6/12) beside Card 9 Money to Members (6/12).
9. Card 10 Disclosures table, full width.
10. Sign-up band for signed-out visitors.
11. Source line and data health line.

Tablet collapses to 2 columns, phone to 1, filter bar becomes a bottom-sheet trigger.

### Cards (design each one; data source in brackets)

**1. Influence Pulse** `[summary]`
Five KPI tiles in one band: disclosed spend, filings, distinct clients, distinct firms, revolving-door lobbyists. Each with a change versus the same period last year in emerald or `--echo-chart-red`. A small note under spend: "Sum of reported amounts on activity reports. Registrations carry no dollar figure."

**2. Spend Leaderboard** `[top-spenders]`
Segmented toggle Clients / Firms. Top 15 as horizontal bars with rank, name, ticker chip when mapped, spend in mono, share of period total. Clicking a row opens a client drawer (filings over time, issues, firms hired). Show a coverage chip when the period is still being filed.

**3. Issue Landscape** `[by-issue]`
Not a donut. A ranked share view or treemap by share of filings citing each issue. Heading must read "Share of filings by issue". Footnote: "The LDA does not report dollars per issue, so this shows activity, not spend." Clicking an issue sets the page filter.

**4. Pressure Map** `[filings.issues x filings.entities]`
Heatmap: top 12 issues (rows) by top 10 government bodies contacted (columns), cell = number of filings. Answers "which issues are pushed at which part of government". Row and column totals in mono. Hover shows count and top three clients for that cell.

**5. Quarterly Rhythm** `[filings by year and quarter]`
Twelve quarters, 2024 Q1 to 2026 Q4. Bars for disclosed spend, a line for filing count on a second axis. Unfiled future quarters drawn as ghost bars labelled "Not yet filed". Respects the issue filter.

**6. Revolving Door** `[filings.lobbyists]`
Lobbyists who previously held a covered government position. Lead number: share of filings in the period that name at least one. Below, a list of firms ranked by revolving-door lobbyists, each row expandable to show the covered position text as filed (for example "Legislative Director, Sen. ..."). No accusatory framing; title copy: "Former officials now lobbying".

**7. Public Company Lens** `[filings onlyPublic + ticker map + quotes + candles]`
A grid of public companies that lobbied in the period: company, ticker, spend, filings, top issue, live price and day change, 6-month sparkline. Verified mappings show a solid check; exact-name matches show an outlined badge "Name match" with a tooltip. Clicking opens a company card modal (redesign of the current one, emerald only, no gold): price chart with quarterly lobbying spend overlaid as bars, largest filings, firms hired.

**8. Lobbying vs Contracts** `[lobbying-ratio]`
Scatter: x = lobbying spend, y = federal contract awards, log scales, each dot a public company. Toggle 1 year / 2 years. A ranked side list "Awards per lobbying dollar". Caption: "Correlation is not causation. Both figures are public disclosures."

**9. Money to Members** `[contributions]` (new, data never shown before)
LD-203 contributions. Lead: total itemised in the period and number of reports. Tabs: Top honorees, Top recipient committees, Largest single items. Contribution type chips (FECA, honorary, meeting, inaugural, library). Honoree names shown exactly as filed with the note "Names as filed by the contributor." No link to member profiles.

**10. Disclosures table** `[filings]`
Modes: Public companies (default), Largest, Most recent. Columns: Posted, Client (ticker chip), Firm, Amount, Issues (max 3 chips plus count), Lobbyists, View. Row opens the filing modal. Export CSV for signed-in users.

### States to design for every card

Loading skeleton, populated, filtered-to-empty (message names the filters), partial period ("2026 Q3 is still being filed, 64% received"), and error ("This data is unavailable right now. Try again in a moment." with Retry).

### Copy

| Where | Copy |
| --- | --- |
| Lead | Who pays to influence Washington, on which issues, through which firms, and how that reaches public companies and the members they fund. |
| Search placeholder | Search clients or firms… |
| Source line | Source: Senate LDA (lda.gov). Amounts are as reported by filers. For educational purposes only. Not financial advice. |

### Deliverables

1. Desktop (1440) and phone (390) full-page mockups, dark and light.
2. Each card at its own frame with all five states.
3. A short spec per card: grid span, data fields used, interactions, empty copy.
4. An interactions list (what each click, hover and filter change does).
5. A tokens sheet showing only existing tokens used; flag any value that would need a new token rather than inventing one.
