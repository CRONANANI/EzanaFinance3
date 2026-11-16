# Ezana dimension hubs: how they work today

Page: Dimension hubs (one template, seven hubs). Route: /datasets/(hub), for capitol-watch, titans-shadow, eyes-above, consumer-whispers, the-hive, global-empire-lighthouse and regulatory-winds. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main, November 16, 2026). The pages were not run while writing this.

## 1. Summary

Each data dimension has a hub: its datasets, the EzanaQL bar scoped to it, and cards linking datasets (for example trades near contract awards). Five hubs share one template; Capitol Watch is bespoke; the Lighthouse address is served by another page.

- Users: investors and students exploring a theme, often signed out. They arrive from "Open dimension" on the overview, every dataset page's EzanaQL row and the green band, and go on to a dataset page, a detail or a query result.
- Data connected today: Capitol Watch, Titans Shadow, Eyes Above and The Hive: yes, live. Regulatory Winds: partly (preview cards only when rows exist). Consumer Whispers: no, source not connected.
- Sample data rule: figures in the wireframe are sample content with invented names. Only admin and demo accounts ever see sample data on the live page, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet." The hubs carry no sample data today.

## 2. What is on the page today

### 2.1 Shared template (Titans Shadow, Eyes Above, Consumer Whispers, The Hive, Regulatory Winds)

Below the green band (dimension active, no ticker):

| Section | What it shows and does |
| --- | --- |
| Header | "Datasets · (Dimension)" eyebrow, a large title, tagline, blurb, and a stat strip: Live datasets "N of M", Records, Latest data |
| EzanaQL | A split editor: the hub's seed query loaded but not run, an "Ezana AI" field ("Describe a report in plain English"), example prompt chips, Run, Edit, Saved reports; on the right the result table ("Run a query to see results here.") with Save report, CSV and JSON for accounts. Without queryable data: "EzanaQL queries open when this dimension's first dataset goes live." |
| Card canvas | A 12-column canvas, empty for every visitor at first: three cards show faintly under a veil beside "Your canvas is empty." and "Open the card drawer" |
| Card drawer and cards | A "Cards" tab opens "Customize this hub": every card with Add, On page or Members (locked). Guests may place three; a locked card opens a waitlist dialog. Placed cards drag by a grip (or arrow keys), resize from a corner, remove with X; the layout is saved in this browser |
| Sources | One line listing every public source |

Cards a template hub can offer:

- Datasets: a compact card per dataset (name, Soon or Preview tag, lead and second figure, freshest date, Open); Soon shows the planned source.
- Linkage cards: title, a "why" sentence, ranked rows of labelled figures, each with Watchlist or Save (account), Query this (loads it into EzanaQL) and Share; window and sources. Error "This signal could not be loaded just now..."; an honest "Appears as ..." empty line.
- Dataset cards: up to eight rows from a dataset page. Roadmap: "What this dimension will show".

Reads are cached 15 minutes; each card streams with its own skeleton.

### 2.2 Capitol Watch (bespoke)

Header: eyebrow, title, a purpose sentence; the EzanaQL bar with "Members who bought stock in the last 90 days" loaded, not run, and a result card ("Open full table", Watchlist, Save, CSV, JSON for accounts). Then the same empty canvas and drawer, with these cards:

- Top signals this week: one event at a time with kind filters (Trade before award, Committee overlap, Lobbied then won, Same month as insiders, Late filing, My signals), arrows and swipe, "Why it is flagged", a 60-day price chart.
- Signal rule builder: pick two or more datasets to overlap, conditions and a window; a live match count. Saving and alerts need an account ("Email alerts start soon.").
- Signals across datasets: tabs for trades near contract awards, who reads awards best, committee overlap, lobbying and contracts, top raisers who trade.
- Oversight and ownership heatmap (committee by sector, House or Senate); Who reads contract awards best (trades within 30 days of an award, scored); Trades by state (US map); Congress's portfolio (16 most held stocks, value ranges, party and chamber filters); The five datasets (tiles); Most held companies; House vs Senate.

Member drawer (own address): identity, committees, four stats, tabs Signals, Trades, Holdings, Committees, Donors. Company card: price chart with member purchases, recent news, ten years of contracts, largest member positions.

### 2.3 Per hub

- Titans Shadow (5 of 5 live): EzanaQL open. Linkages: Confluence (funds adding while insiders, activists or Congress act), Insider buying into fund adds, Most crowded adds, Activist targets. Cards: Most widely held by funds, Largest insider buys.
- Eyes Above (4 of 4 live): EzanaQL open. Linkages: Chokepoints moving off normal, Patent momentum leaders (with member holders), Supply chain pressure.
- Consumer Whispers (0 of 4 live): EzanaQL closed. Every dataset is Soon; the only other card is the roadmap.
- The Hive (2 of 4 live): EzanaQL open. Linkages: biggest prediction markets by dollars traded, most traded markets on a second exchange, markets tied to tickers, questions a play-money crowd is forecasting.
- Regulatory Winds (0 of 4 live): EzanaQL closed. Two preview linkages (bills with the newest actions, committee meetings) appear only when rows exist; roadmap card.
- Global Empire Lighthouse: the address is served by the Global Empire Rankings page, not this template, so its configured linkages and card never render. Out of scope here.

### States, tablet and phone

No hub has its own loading screen; the shared dataset skeleton shows (centred title, pills, a table). Under 900px the canvas is one column and the Cards tab, a fixed tab on the right edge, moves near the bottom; dataset card grids collapse under 1100px and 640px.

## 3. What the user can do

- Write, generate, run, edit and save EzanaQL queries; export results (account)
- Open the card drawer; add, move, resize and remove cards; layout kept in the browser
- Open a dataset page from its card; Query this, Share, Watchlist or Save on linkage rows
- Capitol Watch: flip and filter signals, preview a signal rule, open member and company details
- Easy to miss: the canvas is empty until cards are added; guests get three.

## 4. Data we have

| Field | What it means | Public source | Freshness | Gaps |
| --- | --- | --- | --- | --- |
| Dimension, datasets, live state | Catalogue | Ezana dataset catalogue | Each release | None |
| Live datasets, Records, Latest data | Hub totals | Each dataset's source | 15 minutes | Missing datasets count as zero |
| Dataset lead and second figure, freshest date | Per dataset | Same | 15 minutes | Soon datasets |
| Linkage rows | Cross-dataset matches with labelled figures | Congressional disclosures, federal awards, lobbying and campaign filings, SEC ownership filings, shipping and patent records, prediction markets, bill actions | 15 minutes; windows named per card | Empty until both datasets have rows |
| Query results | Rows from the dimension's queryable datasets | Same | On run | Closed for Whispers and Regulatory |
| Capitol Watch modules and details | Events, heatmap, leaderboard, states, portfolio; member and company detail | The same public filings, plus market prices and news | 15 minutes; details on open | Holdings inferred; ranges |

## 5. Data we do not have

Do not design around these; show them only as clearly marked future features.

- Any data for Consumer Whispers, and live legislation, rulings or lawsuits for Regulatory Winds.
- Activity trends per hub; layouts across devices; email alerts; real-time updates; returns outside the award-reader score.
- Live sample content: wireframe figures are invented and labelled "Sample content"; only admin and demo accounts would see sample data live.

## 6. Must keep working

- Capitol Watch keeps every module; the Lighthouse address keeps its page.
- Scoped EzanaQL, seed not auto-run, account gates on save and export, the closed line.
- Arrangeable canvas, drawer, three-card guest cap and waitlist gate, keyboard move and resize.
- Address parameters on Capitol Watch for the open member, signal and tab.
- Cards stream and fail on their own; honest empty lines; the sources line and "Nothing here is investment advice."
- Sample data rule (known change): only admin and demo accounts may see sample content, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 7. Problems with the current page

### Design problems

- The canvas opens empty, so a first visit shows a header, a query editor and a veiled teaser; the datasets hide behind the drawer.
- Large title, tagline and blurb instead of a compact identity row.
- Bordered cards with coloured top edges; a bordered Cards tab and pill-shaped card controls.
- Consumer Whispers and Regulatory Winds are almost blank pages.
- Two layouts: Capitol Watch looks unlike the other hubs.

### Bugs and gaps

- The Lighthouse hub address never shows the hub; its linkage cards are dead configuration.
- Blurbs in the drawer are cut with three dots; the route skeleton does not match.

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

Page-specific: the canvas controls (grip, remove, resize) are small grey icons, visible on hover; the drawer is a right side panel.

## 9. Open questions for me

1. Should the canvas open empty? Default: no; open with a default layout (datasets strip plus the first three cards), still arrangeable.
2. One design for all hubs? Default: one shared template with an optional bespoke band for Capitol Watch.
3. Hubs with no data? Default: draw the full layout and a separate "This dataset's source is not connected yet." frame.
4. Lighthouse? Default: out of scope, flagged.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Dimension hubs (shared template, drawn for Titans Shadow, with a Capitol Watch variant). Route: /datasets/titans-shadow and /datasets/capitol-watch. Version: retail, public dataset page. Data connected today: partly. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a default layout with a dataset index, a "new since last visit" strip, saved queries as cards, and a watch on a ticker across the dimension. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
