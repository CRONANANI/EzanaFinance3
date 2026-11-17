# Ezana Congressional trading data page: how it works today

Page: Congressional trading data. Route: /datasets/political. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main, November 16, 2026). The page was not run while writing this.

## 1. Summary

A leaderboard and table of stock trades disclosed by members of Congress under the STOCK Act, with a ticker lookup and a campaign finance section.

- Users: retail investors, students and journalists, often signed out.
- How they reach it: URL, search engines, the sitemap. It is not in the Capitol Watch menu (the Politician Tracker is the main trades page); the only menu entry pointing here is "New Laws & Policy Legislation" under Regulatory Winds, marked Soon, so label and page do not match.
- Data connected today: partly. Trades are live (the newest 300 disclosures from the last year). Excess return, portfolio value, win rate and sector allocation are not connected and show a dash. Campaign finance is live where filings have been loaded.
- Sample data rule: figures in the wireframe are sample content with invented names. Only admin and demo accounts ever see sample data on the live page, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet." A bundled sample exists only for local development.

## 2. What is on the page today

Desktop, top to bottom. The green band has no ticker; the page draws its own strip below it.

- Page strip: white, emerald underline; per top member a party letter in party colour, name, ticker and excess (always a dash).
- Header: eyebrow "DATASETS · HOUSE & SENATE DISCLOSURES", title "Congressional trading data", and a lead sentence that promises excess-return context. Then the EzanaQL row to the Capitol Watch hub with Share.

### Left filter rail (148px) and main column

| Element               | What it does                                                                                                                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Export data           | CSV of the filtered rows (with an empty excess return column)                                                                                                                                                                      |
| Party                 | All, Democrat, Republican, Independent, with member counts and colour dots                                                                                                                                                         |
| Chamber               | All, House, Senate                                                                                                                                                                                                                 |
| Transaction           | All, Purchases, Sales                                                                                                                                                                                                              |
| Min trade value       | Slider $0 to $5M, against the bottom of each range                                                                                                                                                                                 |
| Period                | Last 90 days, Year to date, All time (from the newest trade)                                                                                                                                                                       |
| Stat cards            | Disclosed volume (range midpoints), Disclosed trades, Top performer (the volume leader's surname, in red, excess a dash), Members tracked                                                                                          |
| Party legend chips    | Democrat, Republican, Independent: a second party filter                                                                                                                                                                           |
| Top traders · (party) | Leaderboard or Share of volume. Eight portrait cards (rank, party badge, headshot with party ring, name, chamber, state, a dash for excess, an empty sparkline, "Portfolio" with no value), or a donut of midpoint volume by party |

None of the filters are in the address.

### Ticker lookup (full width)

Field "Search a ticker, e.g. AAPL" with up to eight symbol suggestions. Result: symbol, company, "N members disclosed trades", then one row per member (headshot, party letter, chamber, state, up to three trades with side, date and range, "+N more", an inferred position status). A row opens the member dialog; X clears. Empty: "No disclosed congressional trades found for (ticker). STOCK Act filings can lag trades by up to 45 days."

### Recent trades table

"Recent trades · (party)" with "N shown". Columns Stock, Transaction (pill), Politician, Filed, Traded, Amount range, Excess return (a dash). Every filtered row at once (up to 300), no sorting, no paging. A row opens the member dialog.

### Campaign finance section

"Campaign finance · 2026", a source label naming a provider web address, and a 2026 or 2024 cycle toggle. A strip (Total raised, Total PAC money, Avg cash on hand, Members with filings); Top raisers (All, House, Senate; Raised and Cash on hand sortable; individual versus PAC share); Top donor industries by Occupation or Employer; Outside money (For, Against, Net). Empty: "No campaign-finance filings ingested for this cycle yet." Rows open the member dialog.

### Member dialog

A centred two-column dialog: headshot, name, party, chamber, state; Portfolio value, Excess · 90d and Win rate (dashes), Disclosed trades, Most traded ticker; sector allocation and holdings "Not available in the public disclosure tier."; an excess chart that always reads "Not enough dated trades to chart."; Legislative context (up to four sectors where the member trades and bills moved in 90 days, labelled "Oversight overlap", with stage and momentum); the member's campaign finance; dead Follow member and Full dossier buttons. Escape or the backdrop closes it; no address.

### States

Route skeleton: centred title, pills, table. Then "Loading live congressional disclosures…", error "Live congressional data is temporarily unavailable, try again shortly.", empty "No members match the current filters."

### Tablet and phone

Under 900px the rail becomes a wrapped chip row above the main column; cards stack further down. The table scrolls sideways in its card.

## 3. What the user can do

- Filter by party, chamber, transaction, minimum value and period; switch to share of volume
- Look up a ticker; open a member from any portrait or row; export CSV
- Change campaign finance cycle, chamber, sort and donor grouping; share the page
- Buttons that do nothing: Follow member, Full dossier. JSON export exists in the code with no button.

## 4. Data we have

| Field                                       | What it means                                                                                           | Public source                                    | Freshness                                       | Gaps                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------- | -------------------------------- |
| Ticker, transaction, traded and filed dates | One disclosed trade                                                                                     | House Clerk and Senate STOCK Act disclosures     | Daily; last good copy served if a refresh fails | Newest 300 of the last year only |
| Amount range, midpoint                      | Disclosed range and its midpoint                                                                        | Same                                             | Daily                                           | Ranges, never exact              |
| Member name, party, chamber, state          | Who traded                                                                                              | Same, plus the congressional roster              | Daily                                           | Some states missing              |
| Headshot                                    | Member photo                                                                                            | Official photos                                  | Static                                          | Initials when missing            |
| Totals (volume, trades, members, per party) | Sums over loaded rows                                                                                   | Derived                                          | On load                                         | Loaded rows only                 |
| Ticker lookup results                       | Every member trade in one ticker with inferred position status                                          | Same disclosures                                 | Daily                                           | Inferred, not reported holdings  |
| Legislative context                         | Sectors with moving bills in 90 days, stage, momentum, matched to the member's tickers                  | Congress.gov bill actions and Ezana's sector map | Daily                                           | Tickers outside the map          |
| Campaign finance                            | Raised, PAC money, cash on hand, spent, donors by occupation or employer, outside money for and against | Federal Election Commission filings              | As loaded; 2026 and 2024 cycles                 | Empty when not loaded            |

## 5. Data we do not have

Do not design around these; show them only as clearly marked future features.

- Excess return, returns of any kind, sparklines of performance, "top performer" rankings.
- Portfolio value, win rate, sector allocation, holdings by sector.
- Full trade history beyond the newest 300 disclosures of the last year on this page.
- Committee seats on this page (they live on the Committee assignments page).
- Prices, charts or news for tickers.
- Legislation as a dataset (bills, sponsors, votes): only the per-sector momentum above.
- Follow or alerts (the button is dead) and a full member dossier page.
- Real-time updates; disclosures arrive daily and lag trades by up to 45 days.
- Live sample content: wireframe figures are invented and labelled "Sample content"; only admin and demo accounts would see sample data live.

## 6. Must keep working

- The route stays reachable by URL and in the sitemap, even if the menu entry changes.
- Every number comes from real disclosure rows; missing measures read N/A, never invented.
- Ticker lookup, its 45-day lag message and inferred-position note; CSV export with formula protection.
- Member detail (legislative context, campaign finance) reachable from every list; campaign finance cycles, filters and sorting.
- Overlap wording: "not a claim of influence or investment advice".
- Sample data rule (known change): only admin and demo accounts may see sample content, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 7. Problems with the current page

### Design problems

- It duplicates the Politician Tracker without a clear job, and its only menu entry is labelled as legislation.
- Five fields promise performance and show dashes (strip, Top performer in red, portrait excess, Portfolio, excess column).
- Boxed, shadowed cards; filled chips and toggle; outlined Full dossier; a large title with a lead.
- Two party filters; party meaning carried by colour dots and rings.
- The table dumps up to 300 rows with no sort or paging.
- Non-Bootstrap icons; a triangle glyph as sort marker.

### Bugs and gaps

- "All time" is really the last year; the 300-row cap is not disclosed.
- Follow member and Full dossier do nothing; the dialog has no address. Filters are not in the address.
- A source label names a provider web address; loading messages end in an ellipsis.

## 8. Design rules the mock must follow

From the dataset page master prompt and the Branding and UI Guide; the rules outside tools break most often come first.

1. Flat cards: no fill, border, shadow, radius or coloured top edge. Whitespace and 1px hairlines (primary text at about 8 percent) only. Only overlays (side panel, dialog, menu, tooltip, sheet) have a surface.
2. Tabs, toggles, filters and time selectors are text only, no track, pill or fill; selected is emerald text. Time ranges are 12px mono caps.
3. No outlined, ghost or pill buttons: one solid emerald primary per group, every other action plain text.
4. Borderless search: icon and grey placeholder, no outline at rest, hover or focus.
5. Nothing below 11px. Content runs from x=32 to x=1408 at 1440px; 64px between side-by-side cards, 20px between stacked rows, 24px clear beside vertical rules. Nothing touches text; a selected row is emerald text or a faint wash with 12px clearance.
6. Bootstrap Icons only; no emoji, logos, illustrations or spinners (skeletons only). Member headshots are the one data image.
7. No em dashes. Sentence case. Describe, never advise; never "real-time", show the update time. No vendor or database names in interface text.
8. Frame drawn as it is: the 64px Ezana navigation bar, the full-bleed green category band (about 48px, emerald gradient, white labels, Home, the seven dimension menus, sign-in actions, active dimension as a soft white highlight), an optional ticker of latest records inside the band, and the light grey dataset footer.
9. Light mode as rendered (white ground, dark ink), using only tokens that exist in both themes.
10. Compact identity row: 11px mono caps eyebrow, dataset name at 22px weight 700, freshness line in mono and at most one primary action on the right. No hero or intro paragraph; explanation goes in an info tooltip. Directly under it the EzanaQL row: terminal icon, "Query this data with EzanaQL", muted "on the [dimension] hub", plain-text Share.
11. Mono (tabular) for every figure, ticker, date, rank, count, eyebrow, header and axis label; Plus Jakarta Sans for names and prose. Card title 18px, section 22px, body 14px, caption 12px, KPI 18px mono.
12. Ruled tables: no header fill, 11px caps mono headers over one hairline, 1px row rules, rows 42 to 48px, no zebra or cell borders, entity first with a mono meta line, numbers right aligned, header-click sorting with an emerald arrow.
13. Entity detail in a right side panel (480px) or drawer (up to 720px) with its own URL parameter; Back closes it.
14. Party and chamber as text (D, R, I; House, Senate), never colour alone. Signed changes, compact money ($4.92M), missing values N/A.
15. Every card: a skeleton, a one-line empty state with one action, an inline error with Retry. Charts flat: dashed faint gridlines, 11px mono ticks, direct labels, emerald main series, grey comparison.
16. All names and figures are invented sample content, labelled "Sample content" near the identity row.

Colours (light, as rendered; dark in brackets): ground #ffffff (#0a0e13); primary text #0f172a (#f0f6fc); secondary text #1e293b (#e2e8f0); muted grey #64748b (#8b949e); faint grey #94a3b8 (#6b7280); emerald #059669 (#10b981); emerald text #047857 (#34d399); negative #dc2626 (#ef4444); warning #d97706 (#fbbf24); cyan #06b6d4; purple #a78bfa; hairline primary text at about 8 percent; green band emerald gradient with white labels and mint values.

Page-specific: party is always a D, R or I text tag; party colour may support it but never replace it. No performance figure appears anywhere.

## 9. Open questions for me

1. What is this page for, given the Politician Tracker? Default: the congressional trades record, ticker first ("who in Congress traded this stock"), with the lookup and full trade table as the hero.
2. Should the Regulatory Winds legislation entry keep pointing here? Default: leave the menu alone and flag it; do not design a legislation page here.
3. Keep campaign finance on this page? Default: yes, below the trade table, as a compact section.
4. Remove every performance field? Default: yes; replace Top performer with Most active member by trade count.
5. Member detail as a side panel with its own address parameter? Default: yes, 480px.
6. Follow member? Default: show it as "Not available yet" text, not a live button.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Congressional trading data. Route: /datasets/political. Version: retail, public dataset page. Data connected today: partly. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a ticker-first hero ranking the most traded stocks by members, a filing-lag view (traded versus filed), a buy versus sell split per ticker, a sortable paged trade table with filters in the address, and a citation line with CSV export. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
