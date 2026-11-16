# Ezana Supply Chain Monitoring page: how it works today

Page: Supply Chain Monitoring. Route: /datasets/supply-chain. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The page shows ship traffic through the world's maritime chokepoints and busiest ports against the year before, framed by a global supply chain pressure index and a North American freight index. One of the four Eyes Above datasets.

- Who uses it: retail investors watching shipping, energy and trade exposure, student analysts, journalists covering disruptions (a canal closure, a strait blockade). Nothing is gated.
- How they get there: the Eyes Above menu in the green band, the Eyes Above hub, the datasets overview, search and shared links.
- What they do next: open a chokepoint's or port's daily history, search ports, or go to the Eyes Above hub to query with EzanaQL.
- Data connected today: yes, live. Port calls and chokepoint transits load daily from IMF ship-tracking estimates (published with a lag of several weeks); the pressure index (Federal Reserve Bank of New York) and the freight index load monthly. The page shows no sample data to anyone. Whether rows are loaded right now was not checked.
- Sample data rule for the redesign: every figure in the wireframe is sample content with invented names. On the live page only admin and demo accounts may ever see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop, top to bottom, on the shared dataset canvas (about 1400px, centred).

| Section | What it shows and does |
| --- | --- |
| Green band and ticker | Drawn by the shared chrome. Up to 12 chokepoints: lead "7-day transits vs 1 year", name, signed change. A click opens a small generic dialog, not the chokepoint. |
| Header (centred) | Eyebrow "DATASETS · EYES ABOVE", title "Supply Chain Monitoring", one lead sentence, "Data through (date)", then four boxed tiles: Supply chain pressure (the index value with month and "above" or "below average"), Freight shipments year over year, Biggest chokepoint move over 7 days (with its name), and Data through. Each reads a dash and "Not loaded yet" when empty. |
| EzanaQL row | "Query this data with EzanaQL on the Eyes Above hub" with Share. |
| Chokepoints | Caption with the window and as-of date. A boxed daily chart for the selected chokepoint (the biggest mover by default): daily transits as a thin grey line and a 7-day average in cyan, last 365 days, with skeleton, error ("This series could not be loaded. Try again shortly.") and empty states. Then a table of every chokepoint, ordered by size of move: Chokepoint (button), 7-day average, 1-year average, Change (signed, green or red), Tankers, Containers. The selected row is highlighted. Not sortable. |
| Ports | Caption: the 100 busiest ports by calls over 12 months, 28-day daily averages, change against the year before. A bordered search ("Search by port or country"). A daily chart opens above the table when a port is clicked (click again to close). Table: Port (button), Country, Calls per day, Year before, Change, Imports tonnes per day, Exports tonnes per day. Ordered by 12-month calls, not sortable. Empty: "No port matches that search." |
| Global Supply Chain Pressure Index | Caption explaining standard deviations from average. Boxed monthly line chart in cyan with a dashed zero line. |
| Freight | Caption on the freight index (North American shipments and expenditures, index, January 1990 = 1). Two boxed monthly line charts side by side. |
| Source footer | Ship-position estimates published with a lag; the three public sources. |

Page states: shared dataset skeleton while loading. If the read fails: "Supply chain data could not be loaded right now. Please try again shortly." (no Retry) and the sections are hidden. If nothing at all is loaded, a page message says so and every section also shows its own "not loaded yet" line.

Tablet and phone: tiles reflow to two or one per row; the freight charts stack; tables scroll sideways; below 640px the side padding drops to 16px.

## 3. What the user can do

- Select a chokepoint to see its 365-day daily history (one is always selected).
- Open and close a port's 365-day daily history; search ports by name or country.
- Hover any chart for dated values.
- Click a band ticker item for a small dialog.
- Share the page; go to the Eyes Above hub for EzanaQL.
- Not possible today: sorting either table, filtering ports by country or region, deep-linking a selection, a map view, changing chart ranges, exporting.

## 4. Data we have

| Field | What it means | Public source | Freshness | Gaps |
| --- | --- | --- | --- | --- |
| Chokepoint name | One of about 28 maritime chokepoints (straits, canals) | IMF ship-tracking estimates | Daily load, data lags several weeks | No map coordinates are used on the page |
| Daily transits, tankers, containers | Ships passing per day, in total and by two vessel types | Same | Same | Estimated from ship positions; other vessel types not split out |
| 7-day and 1-year averages, change | Mean daily transits over the last 7 days of data against the 365 days before, percent | Calculated | Same; page cache one hour | "Last 7 days" means the latest loaded dates, not this week |
| Port name, country | The 100 busiest tracked ports by calls in 12 months | Same | Same | Ports outside the top 100 not shown |
| Port calls per day, year before, change | 28-day mean against the year before | Calculated | Same | Same lag |
| Imports and exports | Estimated tonnes per day, 28-day mean | Same | Same | Estimates, not customs figures |
| Daily history | 365 days of daily counts for one chokepoint or port, with a 7-day average | Same | Same | Loaded on demand |
| Supply chain pressure index | Monthly, in standard deviations from its average | Federal Reserve Bank of New York | Monthly | Global, one number |
| Freight shipments and expenditures | Monthly index, January 1990 = 1 | A North American freight-payment index | Monthly | North America only |
| Year-over-year freight change | Latest month against the same month a year earlier | Calculated | Monthly | Blank without a year of history |

## 5. Data we do not have

Do not design around these:

- Live ship positions, vessel names, routes or a moving ship map.
- Freight rates, container prices, charter rates or delivery times.
- Company or ticker links (shipping lines, ports operators, importers).
- Cargo by commodity, or trade by country pair.
- Reasons for a change (weather, conflict, closures): no event data is joined.
- Anything newer than the source's lag; any forecast or disruption score.
- Sample data rule: the wireframe uses invented port and chokepoint names labelled "Sample content". Real visitors never see sample rows; with no source they would see "This dataset's source is not connected yet."

## 6. Must keep working

- Chokepoint table with 7-day and 1-year averages, signed change, tankers and containers; the biggest mover selected by default; its 365-day chart with the 7-day average.
- Ports: top 100, search by port or country, all seven columns, the per-port 365-day chart.
- Pressure index chart with the zero line and its plain explanation; both freight charts.
- The headline figures: pressure index with month and above or below average, freight year over year, biggest chokepoint move, data through.
- The lag caveat and the three public sources, with each section's as-of date.
- Add URL parameters for the selected chokepoint and port, so selections deep-link.
- The band ticker feed, the EzanaQL row to the Eyes Above hub, Share, the shared footer, public access.
- No sample data for ordinary visitors; sample content, if ever added, only for admin and demo accounts, labelled "Sample content".

## 7. Problems with the current page

Design problems:

- Centred hero with an intro sentence and four boxed tiles, instead of the compact identity row and a ruled stat strip.
- Boxed charts and a bordered search box.
- A long single column: chokepoints, ports, pressure and freight all stacked, no ranked hero and no side-by-side pairs.
- Charts open above their tables, pushing rows down; no side panel.
- The two macro indexes sit at the bottom, though they frame the whole page.
- Cyan main series where the family uses emerald.

Bugs:

- Neither table can be sorted, although the columns invite it.
- If nothing is loaded, the page message and every section's own empty line all show at once.
- Band ticker items open a generic dialog instead of the chokepoint.
- No URL state; the failure message has no Retry.

## 8. Design rules the mock must follow

From the dataset page master prompt and the Ezana Branding and UI Guide. The rules outside tools break most often come first.

Dataset family look:

1. Draw the 64px Ezana navigation bar as it is. Under it, the full-bleed green category band (about 48px, emerald gradient, white labels: Home, the seven dimensions, sign-in on the right; the active dimension a soft translucent white highlight). When the page has a stream of records, the slow ticker sits inside the same band (small caps mono lead, white name, mint mono value, thin white rules). Draw the shared light grey dataset footer. Do not redesign any of these.
2. Light mode as rendered: white ground, dark ink, using only colours that exist as tokens in both themes.
3. Compact identity row, no hero: small caps mono eyebrow (11px, tracking 0.08em, muted) above the dataset name (22px, weight 700, sentence case); on the right, the mono freshness line and at most one primary action. Explanations go in an info tooltip (bi-info-circle). No intro paragraph.
4. Under it, the slim EzanaQL row: bi-terminal, "Query this data with EzanaQL", a muted "on the (dimension) hub", plain-text Share on the right.
5. Mono (JetBrains Mono, tabular) for every figure, ticker, date, rank, eyebrow, table header and axis label; Plus Jakarta Sans for names and prose. Card title 18px, section 22px, body 14px, caption 12px, KPI 18px mono, headline figure 24 to 28px mono.
6. Ruled tables: no header fill, 11px caps mono grey headers over one hairline, 1px row hairlines, rows 42 to 48px, no zebra, no boxed wrapper, numbers right aligned. Sort by clicking a header (emerald text plus bi-arrow-up or bi-arrow-down). Quiet pagination footer.
7. Entity detail in a right side panel (480px) or drawer (up to 720px) with its own URL parameter; Back closes it.
8. An honest source line in public terms at the bottom, ending "Nothing here is investment advice."

Corrections to the current pages (these override the screenshots):

9. Flat cards: no fill, border, shadow, glow or radius. Hairlines (primary text at about 8 percent) divide, never enclose. Only overlays have a surface.
10. Tabs, toggles, segmented controls, filters and time selectors are text only; selected is emerald text, the rest grey. Time ranges 12px mono caps.
11. No outlined or pill buttons. One solid emerald primary per group (white text, 8px radius); every other action is plain text.
12. Borderless search: bi-search icon, grey placeholder, no outline ever.
13. Nothing below 11px.
14. Content from x=32 to x=1408 at 1440px wide. 64px between side-by-side cards, 20px between stacked rows, 24px beside vertical rules.
15. Bootstrap Icons only; no emoji, logos or illustrations; skeletons, never spinners.
16. No em dashes. Sentence case. Describe, never advise. Never "real-time": show the last-updated time. No vendor or database names in the interface.
17. Selected rows: emerald text or a faint wash with 12px clearance; no edge bar; no mark touches text.
18. Signed changes, N/A for missing values, colour never the only signal.
19. Every card has a loading skeleton, a one-line empty state with one action, and an inline error with Retry.

Colours, light (dark): ground #ffffff (#0a0e13); primary text #0f172a (#f0f6fc); secondary text #1e293b (#e2e8f0); muted grey #64748b (#8b949e); faint grey #94a3b8 (#6b7280); emerald #059669 (#10b981); emerald text #047857 (#34d399); negative #dc2626 (#ef4444); warning #d97706 (#fbbf24); cyan #06b6d4; purple #a78bfa; hairline primary text at 8 percent; green band an emerald gradient with white text.

Page note: always print each section's as-of date; the data lags several weeks and must never look current.

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. What is the ranked hero? Default: a leaderboard of chokepoints by size of move (signed, with proportional bars), beside the pressure index.
2. Add a map? Default: no live map; a simple world tile map of chokepoints only as a marked future feature, since coordinates are not used today.
3. Make both tables sortable? Default: yes, header sorting.
4. Detail in a side panel? Default: yes, one panel for a chokepoint or a port with ?chokepoint= or ?port= in the URL.
5. Filter ports by country? Default: yes, text-only selector built from the country field.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Supply Chain Monitoring. Route: /datasets/supply-chain. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a chokepoint movers leaderboard, a tanker versus container split, sortable port table with country filter, a detail panel with the same period last year, a disruption watch on chosen chokepoints and CSV export. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
