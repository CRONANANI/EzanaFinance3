# Ezana Campaign Finance Records page: how it works today

Page: Campaign finance records (titled "Campaign Finance Intelligence" on the page). Route: /datasets/campaignfinancerecords. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main). The page was not run while writing this; screenshots are supplied separately.

## 1. Summary

Receipts, spending, cash, debt and outside money for every member of Congress: a leaderboard, eight numbered editorial sections and a research drawer per member. One of the four reference pages and the model for numbered sections.

- Who uses it: retail investors, student analysts and journalists, many signed out.
- How they get there: the Capitol Watch menu and hub, Echo articles, search engines, shared member links.
- What they do next: open a member's drawer, jump to the Politician Tracker, export, or query on the hub.
- Live data connected today: partly. The leaderboard and 12 other cards are wired to federal campaign finance filings refreshed hourly (each shows "Not available yet" if the rows are missing; whether rows are present today was not verified). 14 of the 27 cards are permanently in "Not available yet" because their data is not built.
- Sample data rule: wireframe figures are sample content with invented names. On the live page only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, "This dataset's source is not connected yet." This page has no sample data today.

## 2. What is on the page today

Desktop, top to bottom. The app draws the navigation bar and the green category band (Capitol Watch active). There is no ticker in the band; a "Latest filings" strip exists but renders nothing because it is given no items.

### Header

Breadcrumb, title "Campaign Finance Intelligence" and a three-line lead. Right: Cycle select (2026, 2024, 2022; empty cycles disabled "(not available yet)"), a bordered "Query in EzanaQL" button (to the hub), a bordered Export (leaderboard CSV in current order, disabled until ready), and "Totals updated (time, Eastern) · Latest period through (date)". No EzanaQL row, no Share.

### Sticky section navigation

Anchor tabs tracking the scroll (Leaderboard, Overview, Campaign money, Outside money, Political ads, Committees and votes, Elections, Disclosures, Filings) and a "Research a member" picker that opens the drawer.

### Sections and cards

Cards are bordered, rounded boxes on a 12-column grid: title, subtitle, controls, footer "Updated (time) · (n) of 538 members". States: skeleton, "No records for this selection", "Not available yet", "This card could not load." with Retry. Sections open with a hairline, emerald mono number, 22px title and muted question.

| Section                             | Card (grid span)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | What it shows                                                                                                                                                                              | Controls                                                                                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01                                  | Financial position leaderboard (12)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Totals Raised, Cash, Debt. Table: rank, member, party, seat, Raised, Spent, Cash, Debt, Individual / PAC mix bar, Detail ("Full detail" or "Totals only"). 20 rows a page, numbered pager. | Pill tabs Top fundraisers, Most cash, Highest debt, Spending intensity (with a note). Search member or state. Filters toggle: party, chamber. Money headers sort. A row opens the drawer. |
| 02 The money behind Congress        | Congressional money map (8)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Raised, Spent, Cash on hand, Debt, PAC money as KPIs, then bars scaled to receipts with percentages.                                                                                       | None.                                                                                                                                                                                     |
|                                     | Funding composition (4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Itemized individual, PAC, all other receipts, as a split bar with shares.                                                                                                                  | None.                                                                                                                                                                                     |
|                                     | Party financial comparison (6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Raised, Cash on hand, Spent, Debt for D, R, I on one shared scale.                                                                                                                         | Pills Totals, Median per member, Average per member.                                                                                                                                      |
|                                     | House versus Senate (6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | The same measures per chamber, with a note on six year Senate terms.                                                                                                                       | None.                                                                                                                                                                                     |
| 03 Campaign financial performance   | Receipts, spending and cash trajectory (12)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Receipts, Spent, Cash on hand, Debt through the latest period. The chart area reads "Not available yet": a trend is never drawn from one snapshot.                                         | None.                                                                                                                                                                                     |
|                                     | Contribution size fingerprint (6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Share of money in five size bands (under $200 to $2,000 and above) for Congress and groups.                                                                                                | Pills Dollars, Count.                                                                                                                                                                     |
|                                     | Campaign spending fingerprint (6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Spending by reported purpose, Congress or one member.                                                                                                                                      | Member picker ("All of Congress").                                                                                                                                                        |
| 04 The political money network      | Outside money pressure (12)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Supporting, Opposing, Net, Members with records; top 15 members as diverging bars (opposing left, supporting right, net).                                                                  | Pills All, House, Senate, Democratic, Republican. A row opens the drawer.                                                                                                                 |
|                                     | Who is spending on whom (7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Outside groups around a member, or a group's members.                                                                                                                                      | Pills By member, By group; a member opens the drawer.                                                                                                                                     |
|                                     | Donor geography (5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | US map tinting a member's top donor states, with the in-state share of itemized money.                                                                                                     | Member picker (default: top fundraiser).                                                                                                                                                  |
| 04 to 09                            | 14 cards in "Not available yet": Donor industry atlas, Lobbyist contributions and clients (04); Digital ad observatory, Advertising momentum, Broadcast ad filings (05, Political advertising intelligence); Money from industries a committee oversees, Voting ideology and campaign money, Committee and sector landscape (06, Money, committees and voting records); The race behind the member, Money versus margin, District economic context (07, Elections and district context); Campaign money and disclosed wealth, Beyond campaign committees (08); Campaign finance filings (09) | An empty box with a title and subtitle.                                                                                                                                                    | None.                                                                                                                                                                                     |
| 08 Additional financial disclosures | Loans and campaign debt (4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Members with the most campaign debt, with a committee count.                                                                                                                               | Pills Most debt, Largest loans (disabled). A row opens the drawer.                                                                                                                        |
| 09 Latest filings                   | Reporting calendar (4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | The next filing deadlines and election day, the first tagged "Next".                                                                                                                       | None.                                                                                                                                                                                     |

A footnote closes the page: records are public filings, Ezana shows aggregates and never a searchable directory of individual donors, associations are not evidence of influence, nothing here is investment advice.

### Member research drawer (right, 720px)

Opened from the leaderboard, outside money, group explorer, loans or the section picker. Header "Member research", a link to this member in the Politician Tracker, a disabled "Full profile", previous and next (leaderboard order), close. Identity: avatar, name, party, seat, "next up 2026" for House members, Rank raised and Rank cash. A section rail 01 to 10 jumps within the drawer, and each section is collapsible with a one-line stat:

- 01 Financial position: Raised, Spent, Cash on hand, Debt, each against the chamber median.
- 02 Funding and sizes: itemized individual, PAC, other; size bands against the chamber.
- 03 Geography and industry: top donor states (loads per member); top sectors "Not available yet".
- 04 Outside spending: groups with Support or Oppose and amounts.
- 05 to 10 (lobbyist contributions, advertising, ideology and committees, elections, personal disclosures, filing history): "Not available yet".

Focus is trapped, Esc closes. Unknown member: "No records for this selection".

### Loading, tablet and phone

Route loading shows title, pill and table skeletons. Under 1200px every card spans full width. Under 768px the leaderboard becomes a stacked list with "show more" (eight at a time) and the drawer a full-screen sheet.

## 3. What the user can do

- Change the cycle; export the leaderboard to CSV (current order)
- Jump to a section; research a member from the section picker
- Switch leaderboard views; search; filter by party and chamber; sort money columns; page
- Switch party comparison statistics, contribution size units, outside money groups, explorer mode
- Pick a member for spending purposes and donor geography
- Open the drawer from five places; step previous and next; jump within it; open the member in the Politician Tracker
- Query on the Capitol Watch hub
- Built but empty: the "Latest filings" strip.

## 4. Data we have

| Field                                                               | Meaning                                        | Public source                            | Freshness                      | Gaps                                         |
| ------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- | ------------------------------ | -------------------------------------------- |
| Member identity, party, chamber, seat, photo                        | Who                                            | Congressional member records             | Periodic                       | None                                         |
| Raised, spent, cash, debt; itemized individual, PAC, other receipts | Committee totals and composition for the cycle | Federal campaign finance filings         | Hourly; overview cached 10 min | Unfiled committees; some members totals only |
| Contribution size bands (dollars and counts)                        | Five size bands                                | Federal campaign finance filings         | Hourly                         | Members without itemized detail              |
| Spending by purpose                                                 | Largest reported purposes                      | Federal campaign finance filings         | Hourly                         | Members without spending detail              |
| Donor states                                                        | Top states of itemized donors, in-state share  | Federal campaign finance filings         | Per member on request          | Members without state detail                 |
| Outside spending                                                    | Support and oppose amounts by group            | Independent expenditure reports          | Hourly                         | Members with no records                      |
| Party and chamber roll-ups, medians, averages, ranks                | Group comparisons and positions                | Ezana aggregates                         | Per load                       | None                                         |
| Latest period through, updated time                                 | Freshness                                      | Filing metadata                          | Hourly                         | None                                         |
| Reporting calendar                                                  | Deadlines and election day                     | Published reporting dates, kept by Ezana | Updated each cycle             | Only the current cycle                       |
| Cycles                                                              | 2026, 2024, 2022                               | Filing metadata                          | Per load                       | Earlier cycles may be empty                  |

## 5. Data we do not have

Do not design around these. Wireframe figures are sample content; only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

- Everything behind the 14 "Not available yet" cards (industries, lobbyists, advertising, committees and ideology, races and districts, wealth, organizations, filing lists).
- A trajectory over reporting periods (only the latest snapshot exists), so no trend line or cycle-over-cycle change.
- Loan amounts, creditors and terms.
- Individual donor names; the page deliberately never lists them.
- Real-time updates, a donor search, or any influence score linking money to votes.

## 6. Must keep working

- ?member= with a member ID opens the drawer and restores on load (today it replaces history rather than pushing; the redesign should push so Back closes it). Shared links carry the member ID.
- Cycle switching, with unavailable cycles disabled and labelled.
- CSV export in the leaderboard's current order, with formula-safe cells.
- Leaderboard tabs, search, party and chamber filters, sorting, paging, and previous and next in the drawer following that order.
- Every card's honest state: "Not available yet", "No records for this selection", error with Retry; coverage "(n) of 538 members" and update time on each card.
- Notes that prevent misreading (intensity is not a burn rate, totals versus per member, Senate terms, outside money is separate, no trend from one snapshot).
- Link from the drawer to the Politician Tracker; links to the Capitol Watch hub.
- The closing footnote, including "never a searchable directory of individual donors".
- Phone: the stacked leaderboard list and full-screen drawer.

## 7. Problems with the current page

Design problems:

- A breadcrumb, a large title and a lead paragraph instead of the compact identity row; no EzanaQL row or Share, unlike the other reference pages; the band has no ticker.
- Every card is a bordered, rounded box; buttons are outlined; tabs and filters are bordered pills.
- More than half the cards are empty boxes saying "Not available yet", so sections 05 to 07 are entirely empty and the page feels unfinished.
- The section nav is a second bar under the green band; the section picker duplicates the leaderboard search.
- Party and chamber filters hide behind a toggle; missing values read "n/a" instead of "N/A".

Bugs and gaps:

- Neither the cycle, the leaderboard view nor its filters are in the URL.
- The drawer's ?member= replaces history, so Back leaves the page instead of closing the drawer.
- "Full profile" is a disabled button with no explanation beyond a tooltip.
- The "Latest filings" strip is built but always empty.

## 8. Design rules the mock must follow

1. Draw the frame as it is: 64px navigation bar, full-bleed emerald green category band (about 48px, white labels), the shared light grey footer. A ticker only as a future feature.
2. Light mode as rendered: ground #ffffff, primary text #0f172a, muted grey #64748b, faint grey #94a3b8; tokens that exist in both themes.
3. Compact identity row on the left line: 11px mono caps eyebrow "DATASETS · CAPITOL WATCH" (tracking 0.08em), name at 22px weight 700, the freshness line in mono and at most one primary action at the right. Then the EzanaQL row with Share. No breadcrumb or lead paragraph.
4. Content from x=32 to x=1408 on a 1440px artboard.
5. Flat cards: no fill, border, shadow or radius; hairlines (primary text at about 8 percent). Numbered sections keep the hairline, emerald mono number, 22px title and muted question. 64px between side-by-side cards, 20px between stacked rows, 24px beside vertical rules.
6. Tabs, filters, statistic switches and the cycle are text only; selected emerald text #047857, the rest grey.
7. No outlined buttons: one solid emerald #059669 primary per group, others plain text. Borderless search with bi-search.
8. Mono for every figure, rank, date, eyebrow, header and axis label. 11px minimum.
9. Ruled tables: no header fill, 11px caps mono headers, 1px row rules, 42 to 48px rows, numbers right, sort by clicking a header (emerald with bi-arrow-up or bi-arrow-down).
10. The member drawer stays on the right (up to 720px) with ?member= in the URL; Back closes it.
11. Party as D, R, I in text, never colour alone. Debt in warning #d97706, negative #dc2626, extra series info blue, cyan #06b6d4, purple #a78bfa.
12. Bootstrap Icons only, no logos or emoji; skeletons, never spinners; selected rows emerald text or a cleared faint wash.
13. Sentence case, no em dashes, never advice, no "real-time", no vendor names, signed changes, N/A for missing.

## 9. Open questions for me

1. What to do with the 14 "Not available yet" cards? Default: collapse each empty section to one line listing what is coming, instead of empty boxes.
2. Keep the sticky section navigation? Default: yes, as text-only anchors in the identity area.
3. Page title? Default: "Campaign finance" in sentence case.
4. Add a ticker of latest filings? Default: only as a marked future feature.
5. Put cycle and leaderboard filters in the URL? Default: yes.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Campaign finance records. Route: /datasets/campaignfinancerecords. Version: retail, public dataset page. Data connected today: partly. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example comparing two or three members side by side, cash on hand against the chamber median, outside money around a member beside their disclosed trades, alerts when a member's next report lands, and a CSV and citation export of the filtered view. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
