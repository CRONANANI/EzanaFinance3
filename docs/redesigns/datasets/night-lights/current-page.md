# Ezana Satellite Imagery (night lights) page: how it works today

Page: Satellite Imagery: Night Lights. Route: /datasets/night-lights. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The page shows how bright 20 tracked places glow at night, month by month, as seen by NASA's night-light satellites. Brightness is a proxy for activity (industry, shipping, flaring, outages, conflict), not a measure of it. One of the four Eyes Above datasets.

- Who uses it: retail investors, student analysts and journalists looking for an outside read on activity at ports, industrial areas, energy basins and cities. Nothing is gated.
- How they get there: the Eyes Above menu in the green band, the Eyes Above hub, the datasets overview, search and shared links.
- What they do next: compare regions, open one region's monthly history, or go to the Eyes Above hub to query with EzanaQL.
- Data connected today: yes, live. Monthly composites are processed once a month by a scheduled background job, a few weeks after each month ends. The page shows no sample data to anyone. Whether rows are loaded right now was not checked; the job depends on a satellite-data access key being set.
- Sample data rule for the redesign: every figure in the wireframe is sample content with invented names. On the live page only admin and demo accounts may ever see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop, top to bottom, on the shared dataset canvas (about 1400px, centred).

| Section | What it shows and does |
| --- | --- |
| Green band and ticker | Drawn by the shared chrome. The page feeds every region with a year-over-year figure: lead "Night lights vs year ago", region name, signed change. A click opens a small generic dialog with the same values; it does not select the region. |
| Header (centred) | Eyebrow "DATASETS · EYES ABOVE", title "Satellite Imagery: Night Lights", one lead sentence, "Data through (month and year)". |
| EzanaQL row | "Query this data with EzanaQL on the Eyes Above hub" with Share. |
| Map and chart, side by side | Left, a boxed card "Regions, coloured by change against a year ago": a world outline with light grid lines and one dot per region, green for brighter, red for dimmer, grey for no comparison yet, with a three-item legend. Dots are keyboard focusable and have a hover title. Clicking a dot selects the region and scrolls its card into view. Right, a boxed card with the selected region's name, a type tag (Port, Industrial, Energy, City), the unit line "Mean radiance, nW/cm²/sr, monthly" and a cyan line chart of every loaded month with a hover tooltip. The first region with data is selected by default. |
| Regions | Section title, a caption, then a grid of 20 boxed cards (about four per row). Each card: name and type tag, latest mean radiance in mono with the unit, the latest month, the country, "vs year ago" and "vs prior 3 mo" signed changes in green or red, and a 24-month sparkline. Clicking a card selects it for the chart (it does not scroll to the chart). A region with no data shows a dash and "Not loaded yet" and is disabled. The selected card gets a cyan border and tint. |
| Source footer | Two paragraphs: what the brightness means and how it is averaged; the public sources and the land-outline source. |

Page states: while loading, the shared dataset skeleton. If the read fails: "Night-lights data could not be loaded right now. Please try again shortly." with no Retry. If no month is loaded: "No night-lights months are loaded yet. Monthly composites are processed once a month, a few weeks after each month ends."

Tablet and phone: the map and chart stack below about 1000px; the region grid reflows to fewer columns; below 640px the side padding drops to 16px.

## 3. What the user can do

- Select a region from the map (also scrolls to its card) or from its card.
- Hover a map dot for its change; hover the chart for a month's value.
- Read every region's latest value, year-over-year and three-month changes at a glance.
- Click a band ticker item for a small dialog.
- Share the page; go to the Eyes Above hub for EzanaQL.
- Not possible today: deep-linking a selected region, filtering by region type or country, sorting regions, comparing two regions on one chart, exporting.

## 4. Data we have

| Field | What it means | Public source | Freshness | Gaps |
| --- | --- | --- | --- | --- |
| Region name | One of 20 tracked places (9 cities, 6 ports, 3 industrial areas, 2 energy basins) | Ezana's region list | Changes only when the list is edited | 20 regions only; no user-defined areas |
| Region type | City, Port, Industrial or Energy | Same | Same | None |
| Country | Country of the region | Same | Same | Can be blank |
| Map position | Centre of the region's bounding box | Same | Same | A dot, not the area outline |
| Mean radiance | Average night-time brightness over the region, nW/cm²/sr, cloud-free monthly composite | NASA satellite night-light composites | Monthly, a few weeks after month end; page cache one hour | Months lost to cloud or snow can be missing |
| Monthly history | Every loaded month for the region | Same | Same | About the last 26 months are read |
| Change vs a year ago | Latest month against the same month a year earlier, percent | Calculated | Same | Blank until a year of history exists |
| Change vs prior 3 months | Latest month against the average of the three before, percent | Calculated | Same | Blank if any of the three is missing |
| Sparkline | Last 24 months | Calculated | Same | Decorative, no axis |
| Data through | Latest month loaded across all regions | Calculated | Same | Regions can lag the headline month |
| Summed radiance, valid pixel count | Total brightness and the number of clear pixels behind the average | Same | Monthly | Stored but not shown |

## 5. Data we do not have

Do not design around these:

- Satellite images, tiles or heat maps of the light itself. The page has one number per region per month, not pictures.
- Daily or weekly brightness; anything newer than the last processed month.
- Regions beyond the 20, user-drawn areas, or company-level facilities.
- Links from a region to tickers, companies or sectors (no mapping exists).
- Economic output, GDP or trade figures for the regions on this page.
- Explanations of why a region changed (outage, conflict, flaring): no event data is joined.
- Any activity score, ranking model or forecast.
- Sample data rule: the wireframe uses invented region names labelled "Sample content". Real visitors never see sample rows; with no source they would see "This dataset's source is not connected yet."

## 6. Must keep working

- All 20 regions visible with latest value, unit, month, country, both changes and the 24-month trend.
- The world map with one dot per region, brighter, dimmer and no-comparison states told apart by words or shape as well as colour, keyboard selectable.
- The selected region's full monthly chart with the unit stated. Add a URL parameter (for example ?region=) so the selection deep-links.
- The honest caveat that brightness is a proxy, plus cloud-free composites and the averaging method.
- The band ticker feed, the EzanaQL row to the Eyes Above hub, Share, the shared footer, public access.
- No sample data for ordinary visitors; sample content, if ever added, only for admin and demo accounts, labelled "Sample content".
- The load-failure and nothing-loaded messages.

## 7. Problems with the current page

Design problems:

- Centred hero header with an intro sentence instead of the compact identity row.
- Twenty boxed, bordered cards with cyan selected borders and tinted tags; a boxed map and chart.
- No ranked hero: the visitor cannot see at a glance which regions brightened or dimmed most. The cards are in alphabetical order.
- The map's dots are small (about 3px at the map scale) and green means "brighter", which reads as "good" even for flaring or conflict.
- The chart has no comparison line (same month last year) and no type filter.
- The unit nW/cm²/sr is unexplained.

Bugs:

- Clicking a card selects it but leaves the chart off screen; clicking a map dot scrolls to the card, not the chart.
- Band ticker items open a generic dialog instead of selecting the region.
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

Page note: brighter and dimmer must carry words or a sign, not only green and red. Avoid implying brighter is better.

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. What leads the page, the map or a ranked list? Default: a ranked list of regions by change against a year ago (largest moves first), with the map beside it.
2. Keep green and red for brighter and dimmer? Default: keep, always with a signed number and the words "Brighter" or "Dimmer".
3. Should region type filter the page? Default: yes, text-only filters (All, Ports, Industrial, Energy, Cities) mirrored to the URL.
4. Show the clear-pixel count as a data-quality note? Default: yes, as a small "Coverage" line in the region panel.
5. Region detail in a side panel? Default: yes, with ?region= in the URL.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Satellite Imagery: Night Lights. Route: /datasets/night-lights. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a ranked movers list, region-type filters, a region side panel with the same month last year overlaid, a two-region comparison, a coverage note and CSV export. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
