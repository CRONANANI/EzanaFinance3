# Ezana New laws and policy legislation page: how it works today

Page: New laws and policy legislation. Route: /datasets/legislation. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit 9191552 (main). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The page is meant to track bills moving through Congress and new federal laws, and to show which sectors and listed companies each one touches. It is one of the four Regulatory Winds datasets and was just created.

- Who will use it: retail investors, student analysts and journalists who want to know which bills are advancing and what they could affect. Nothing is gated.
- How they get there: the Regulatory Winds menu in the green band, the Regulatory Winds hub, the datasets overview, search and shared links.
- What they will do next: open a bill, follow its sponsor to the Politician Tracker or its committee to Committee Assignments, or go to the hub to query with EzanaQL.
- Data connected today: no, source not connected. The page reads nothing. Separately, Ezana already stores a small set of current-Congress bill records (about 90 bills, with their actions and subjects) that feed a preview card on the Regulatory Winds hub and a sector momentum card on another page. That data exists but is not connected to this page.
- Sample data rule: wireframe figures are sample content with invented names. Live, only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 2. What is on the page today

The page is new: one shared template filled with this dataset's settings, with no logic of its own. What a visitor sees depends on who they are.

Admin and demo accounts, desktop, top to bottom (shared dataset canvas, about 1400px centred with a 32px gutter):

| Section      | What it shows and does                                                                                                                                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Green band   | Shared chrome with Regulatory Winds lit. No ticker.                                                                                                                                                                                          |
| Identity row | Eyebrow "DATASETS · REGULATORY WINDS", name "New laws and policy legislation", and on the right a grey "Sample content" label with an eye icon (hover: shown to admin and demo accounts only). No freshness line, no action.                 |
| EzanaQL row  | "Query this data with EzanaQL on the Regulatory Winds hub" with Share.                                                                                                                                                                       |
| One table    | Title "Recently moved bills" with "Sample content" on the right. Columns Bill, Title, Latest action, Sectors touched and Date. Five invented rows. No sorting, filters, search, paging, row click or detail panel. Missing values print N/A. |
| Source line  | "Planned source: congressional bill records and federal legislative publications." plus a sample-content note and "Nothing here is investment advice."                                                                                       |

Everyone else, signed in or out: the identity row without the label, then a plug icon, "This dataset's source is not connected yet." and a text link "Back to datasets". No EzanaQL row, no description, nothing else.

States: the shared route skeleton, then a small skeleton (title bar and eight-row table) while the server says whether the viewer may see sample content. If that check fails the viewer gets the empty state. There is no data request, so no error state. Tablet and phone: the identity row wraps and the table scrolls sideways inside its section. On the Regulatory Winds hub and menu the dataset carries a "Not connected" tag and its planned source.

## 3. What the user can do

- Ordinary visitors: read that the source is not connected; go back to the datasets overview.
- Admin and demo accounts: read the sample table; use Share; follow the EzanaQL row to the hub.
- Everyone: use the green band menus to reach other datasets.
- Not possible today: sort, filter, search, open a record, export, follow, set an alert, see when data was last updated, or be told when the source connects.

## 4. Data we have

Live data: none. Nothing on this page is a real record today. The only thing rendered is the layout skeleton below, filled with invented rows for admin and demo accounts. These columns are the layout skeleton, not fields we hold:

| Column (skeleton) | What it would mean                                                           | Planned public source                      |
| ----------------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
| Bill              | Bill number, such as H.R. 9001 or S. 4410                                    | Congressional bill records                 |
| Title             | Short title of the bill                                                      | Same                                       |
| Latest action     | Latest step, such as Introduced, Hearing held, Passed House, Signed into law | Same                                       |
| Sectors touched   | Market sectors the bill could affect                                         | Ezana's mapping from policy area to sector |
| Date              | Date of the latest action                                                    | Same                                       |

Freshness and gaps for every skeleton column: not connected, sample rows only.

Data that exists in Ezana but is not connected to this page (it could be wired with little new collection work):

| Field                             | What it means                                                                                                                   | Public source                        | Gaps                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| Bill identity                     | Congress number, bill type (House or Senate bill, joint or concurrent resolution) and number                                    | Congressional bill records           | Current Congress only; about 90 bills, not the full set |
| Title, policy area                | Bill title and its one official policy area                                                                                     | Same                                 | One policy area per bill                                |
| Latest action and date            | Text and date of the newest action                                                                                              | Same                                 | None noted                                              |
| Introduced date, last update date | When filed and when the record last changed                                                                                     | Same                                 | None noted                                              |
| Sponsor and party                 | The sponsoring member's identifier and party (D, R, I)                                                                          | Same                                 | Name must be joined from member records                 |
| Cosponsors                        | Total cosponsors, and how many are Democrats and Republicans                                                                    | Same                                 | No cosponsor names stored                               |
| Cost estimate                     | The budget office's aggregate cost figure, where one exists                                                                     | Same                                 | Blank for most bills                                    |
| Stage                             | One of seven steps derived from the actions: Introduced, In committee, Reported, Floor, Passed chamber, Passed both, Became law | Calculated by Ezana from action text | Rule based; can misread unusual actions                 |
| Passage estimate                  | A transparent scorecard estimate of the chance the bill becomes law, with the factors behind it                                 | Calculated by Ezana                  | Labelled estimate; base rates are priors, not measured  |
| Subjects                          | Many legislative subject terms per bill                                                                                         | Same                                 | Not every bill has them                                 |
| Action history                    | Every action with date, code and text, in order                                                                                 | Same                                 | Up to 30 shown in the existing bill lookup              |
| House roll-call votes             | Question, result, yea and nay totals and the party split                                                                        | Same                                 | House only; Senate votes are not in this source         |
| Committee meetings                | Chamber, committee, date, title, related bills and document links                                                               | Same                                 | Recent meetings only                                    |
| Sector link                       | A curated map from policy areas and key subjects to sectors, sector funds and representative tickers                            | Ezana editorial mapping              | Representative tickers, not bill-specific companies     |
| Sector legislative momentum       | A per-sector score over 30 or 90 days, weighted by stage, cost and bipartisanship                                               | Calculated                           | Built on the small bill set                             |

All of these are refreshed by a scheduled background sync; its exact cadence and the current row count were not checked.

## 5. Data we do not have

Do not design around these:

- Live records of any kind on this page today.
- The full universe of bills: only a small current-Congress subset is stored, and earlier Congresses are absent.
- Bill text, summaries, amendments or section-by-section analysis.
- Senate roll-call votes; member-by-member vote records.
- Cosponsor names, sponsor photos or sponsor bios on the bill itself (members live on other pages).
- Company-specific impact: which named company a bill helps or hurts. The sector map gives representative tickers only.
- State legislation, executive orders, or laws from other countries.
- Lobbying spend tied to a specific bill (the lobbying dataset is separate and is not joined by bill).
- Price reaction of tickers after a bill moves, or any trading signal.
- A measured, back-tested passage probability: the existing estimate is a labelled scorecard, not a forecast.
- Hearing video, witness lists or transcripts.
- Alerts or follows: no watch mechanism exists for bills.
- Sample data rule: wireframe figures are sample content with invented names. Live, only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 6. Must keep working

- The route, its search title and description, and Regulatory Winds lit in the green band; public access with no sign-in.
- The sample gate: only master admin and demo accounts see sample rows, labelled "Sample content" in the identity row and on every section; nothing done to them is saved; a failed check means ordinary viewer.
- The empty state for everyone else, "This dataset's source is not connected yet.", with one text action back to the datasets overview. Known change: ordinary visitors should also get the EzanaQL row and a one-line note of what the dataset will show.
- The EzanaQL row to the Regulatory Winds hub, Share, the source line ending "Nothing here is investment advice.", the shared footer, and the "Not connected" hub tag until real rows exist.
- Bill data that already feeds the Regulatory Winds hub preview card and the sector momentum card must keep working when this page is wired to it.
- Party labelled in text (D, R, I), never colour alone; the passage estimate always labelled as an estimate with its factors shown.

## 7. Problems with the current page

Design problems:

- The whole page is one bare table: no ranked hero, filters, freshness line, summary figures or detail panel.
- Ordinary visitors get one sentence and a link; nothing says what the dataset will hold or where it will come from.
- The 1400px canvas with its own inset instead of the x=32 to x=1408 lines; the source line is set at the micro size and is easy to miss.
- The sample column "Sectors touched" implies a bill-level company link the product does not have; it only maps policy areas to sectors.

Bugs:

- The EzanaQL row is hidden from ordinary visitors although the hub is public.
- A failed sample check shows an admin the empty state with no hint why.

## 8. Design rules the mock must follow

From the dataset master prompt and the Branding and UI Guide; the most often broken first.

1. Flat cards: no fill, border, shadow or radius; hairlines divide, never enclose. Only overlays have a surface.
2. Content from x=32 to x=1408 at 1440px. 64px between side-by-side cards, 20px between stacked rows, 24px beside vertical rules.
3. Tabs, toggles, filters and time selectors text only, selected in emerald text. No outlined or pill buttons: one solid emerald primary per group, the rest plain text. Borderless search.
4. Nothing below 11px. Bootstrap Icons only, no emoji or logos, skeletons not spinners.
5. No em dashes, sentence case, describe never advise, no "real-time", no vendor or database names.
6. Family look: the 64px Ezana bar and the full-bleed green category band (Regulatory Winds lit) as they are, a ticker in the band once records flow, the shared grey footer. Light mode as rendered, tokens that exist in both themes.
7. Compact identity row (11px mono eyebrow, 22px name, freshness line, "Sample content" label, at most one primary action), then the slim EzanaQL row to the Regulatory Winds hub with Share.
8. Mono for every figure, ticker, date, header and axis label; Plus Jakarta Sans for names and prose.
9. Ruled tables: no header fill, 11px caps mono headers, 1px hairlines, rows 42 to 48px, numbers right, sort by header click, quiet pagination.
10. Detail in a 480px side panel with its own URL parameter. Selected rows in emerald text or a cleared faint wash, no edge bar.
11. Signed changes, N/A for missing, colour never alone. Every card gets a skeleton, a one-line empty state and an inline error with Retry; draw the "source not connected" state as its own frame.
12. A source line in public terms ending "Nothing here is investment advice."

Colours, light (dark): ground #ffffff (#0a0e13); primary text #0f172a (#f0f6fc); secondary #1e293b (#e2e8f0); muted grey #64748b (#8b949e); faint grey #94a3b8 (#6b7280); emerald #059669 (#10b981); emerald text #047857 (#34d399); negative #dc2626 (#ef4444); warning #d97706 (#fbbf24); cyan #06b6d4; purple #a78bfa; hairline primary text at 8 percent.

Page note: the passage estimate, if shown, is labelled "Estimate" with its factors one click away. Stage is a word, not a colour. Never imply a bill is good or bad for a ticker.

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. Wire the existing bill records to this page in the redesign? Default: yes, design for them; ship with real bills when the small set is enough, otherwise the not-connected state.
2. Show the passage estimate? Default: yes, in the bill panel only, labelled "Estimate" with its factors, never in the main table.
3. What leads the page? Default: a stage tracker (count of bills at each of the seven stages) above the table of bills by latest action.
4. Sectors touched from the editorial sector map? Default: yes, labelled "Mapped sector" with representative tickers marked as such.
5. Bill detail in a side panel? Default: yes, with ?bill= in the URL, showing the action timeline, subjects, cosponsor split, votes and committee meetings.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: New laws and policy legislation. Route: /datasets/legislation. Version: retail, public dataset page. Data connected today: no, source not connected. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a bill stage tracker across the seven stages, sectors and representative tickers touched by each bill, sponsor and committee links into Committee Assignments and the Politician Tracker, a bill side panel with the action timeline and House vote split, a follow-this-bill alert shown as future work, and CSV export of the filtered list. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
