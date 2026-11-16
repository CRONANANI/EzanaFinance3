# Ezana Commercial Real Estate Activity page: how it works today

Page: Commercial Real Estate Activity. Route: /datasets/commercial-real-estate. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The page tracks U.S. commercial real estate as a whole through eight official indicators: prices, bank credit, loan delinquency and construction spending. These are market-wide statistics, not property-level data. One of the four Eyes Above datasets.

- Who uses it: retail investors and student analysts watching office, REIT and regional-bank exposure, and journalists covering the commercial property cycle. Nothing is gated.
- How they get there: the Eyes Above menu in the green band, the Eyes Above hub, the datasets overview, search and shared links.
- What they do next: open an indicator's 10-year chart, compare indicators by eye, or go to the Eyes Above hub to query with EzanaQL.
- Data connected today: yes, live. The indicators load daily from Federal Reserve, Bank for International Settlements and Census Bureau statistics; each updates on its own weekly, monthly or quarterly schedule. The page shows no sample data to anyone. Whether rows are loaded right now was not checked.
- Sample data rule for the redesign: every figure in the wireframe is sample content. On the live page only admin and demo accounts may ever see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop, top to bottom, on the shared dataset canvas (about 1400px, centred).

| Section | What it shows and does |
| --- | --- |
| Green band and ticker | Drawn by the shared chrome. The page feeds every loaded indicator: lead is its frequency code (for example a short letter for weekly, monthly or quarterly), the official series title, and the latest value. A click opens a small generic dialog with the same values; it does not open the chart. |
| Header (centred) | Eyebrow "DATASETS · EYES ABOVE", title "Commercial Real Estate Activity", one lead sentence, "Data through (latest observation date across all indicators)". |
| EzanaQL row | "Query this data with EzanaQL on the Eyes Above hub" with Share. |
| Open chart (only when an indicator is selected) | Appears at the top, above the groups. Boxed card with the official series title, a bordered Close button, a meta line (the series code in mono, frequency, units, "last 10 years"), and a cyan line chart of 10 years with year ticks and a hover tooltip. Rates get a dashed zero line. No loading state (the data is already on the page). |
| Prices | Two indicator cards: commercial property prices as a percent change from a year ago, and a commercial property price index level. |
| Credit | Two cards: commercial real estate loans at all commercial banks (weekly), and the delinquency rate on those loans (quarterly). |
| Construction | Four cards: nonresidential, commercial, manufacturing and office construction spending (monthly). |
| Other indicators | Only appears if a loaded indicator is not in the three groups. |
| Each indicator card | A boxed button: official series title, latest value (rates as a percent, levels compact such as 1.23M, with the unit after), latest date and frequency, "vs prior" and "vs year ago" signed changes in green or red (rates change in percentage points, written "pts"; levels in percent), and a cyan sparkline of the last 40 observations. Clicking toggles the open chart. The open card gets a highlighted border. |
| Source footer | Two paragraphs: market-wide indicators, not property data; the public sources by publisher. |

Page states: while loading, the shared dataset skeleton. If the read fails: "Commercial real estate data could not be loaded right now. Please try again shortly." with no Retry. If nothing is loaded: "No commercial real estate series are loaded yet. They load daily."

Tablet and phone: the card grid reflows to fewer columns; below 640px the side padding drops to 16px.

## 3. What the user can do

- Read every indicator's latest value and two changes at a glance.
- Open an indicator's 10-year chart (click its card), close it, or click the card again to close.
- Hover the chart for a dated value.
- Click a band ticker item for a small dialog.
- Share the page; go to the Eyes Above hub for EzanaQL.
- Not possible today: choosing a time range, overlaying two indicators, deep-linking an open chart, exporting, reading a plain-language definition of an indicator.

## 4. Data we have

| Field | What it means | Public source | Freshness | Gaps |
| --- | --- | --- | --- | --- |
| Indicator title | The official long series title | Federal Reserve, BIS and Census Bureau statistics | Checked daily | Titles are long and technical |
| Series code | The publisher's short code | Same | Same | Means little to a visitor |
| Units, frequency | For example percent, millions of dollars, index; weekly, monthly, quarterly | Same | Same | Units are short codes |
| Observations | Dated values for the last 10 years | Same | Weekly (bank loans), monthly (construction), quarterly (prices, delinquency); loaded daily, page cache one hour | Quarterly series lag by months; the office series is checked at load time and may be absent |
| Latest value and date | Newest observation | Same | Same | Indicators end on different dates |
| Change vs prior | Against the previous observation (percent for levels, points for rates) | Calculated | Same | Period length differs by indicator |
| Change vs a year ago | Against the observation about a year earlier | Calculated | Same | Blank without a year of history |
| Sparkline | Last 40 observations | Calculated | Same | Covers different spans per frequency |
| Group | Prices, Credit, Construction | Ezana's grouping | Fixed | Eight indicators only |

## 5. Data we do not have

Do not design around these:

- Property-level or deal-level data: addresses, sales, rents, cap rates, vacancy, occupancy, foot traffic.
- City, metro or property-type breakdowns beyond the four construction categories.
- REIT prices, bank exposure by company, or any ticker link.
- Loan maturities, refinancing walls or CMBS data.
- Forecasts, recession odds or any composite stress score.
- News or commentary on the indicators.
- Sample data rule: the wireframe's numbers are labelled "Sample content". Real visitors never see sample values; with no source they would see "This dataset's source is not connected yet."

## 6. Must keep working

- All eight indicators with latest value, units, date, frequency, both changes and the trend line.
- The rule that rates change in points and levels in percent, signed.
- The 10-year chart per indicator with the zero line for rates. Add a URL parameter (for example ?series=) so it deep-links.
- The grouping into prices, credit and construction, and the catch-all for any extra indicator.
- The caveat that these are market-wide indicators, not property data, and the per-publisher source line.
- The band ticker feed, the EzanaQL row to the Eyes Above hub, Share, the shared footer, public access.
- No sample data for ordinary visitors; sample content, if ever added, only for admin and demo accounts, labelled "Sample content".
- The load-failure and nothing-loaded messages.

## 7. Problems with the current page

Design problems:

- Centred hero header with an intro sentence instead of the compact identity row.
- Eight boxed, bordered cards and a boxed chart with a bordered Close button.
- Official series titles are long and technical; there is no short plain name or definition.
- The open chart appears at the top of the page, far from the card that opened it.
- No headline: the visitor cannot see in one glance whether conditions are tightening (delinquency up, credit down, prices falling).
- One fixed 10-year range; no way to compare two indicators.
- Cyan main series where the family uses emerald.

Bugs:

- The band ticker lead is a bare frequency code, and items open a generic dialog instead of the chart.
- No URL state; the failure message has no Retry.
- "Data through" takes the newest date across all indicators, so it can suggest quarterly series are fresher than they are.

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

Page note: rates and levels must be visibly different (percent and "pts" versus compact values with units).

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. Plain names for the indicators? Default: yes, a short name ("Office construction spending") with the official title in the panel.
2. What should the hero be? Default: a ruled stat strip of the four headline indicators (price change, bank loans, delinquency rate, nonresidential construction), each with its own as-of date.
3. Chart in a side panel with time ranges? Default: yes, a 720px drawer with text-only ranges (1Y 5Y 10Y) and ?series= in the URL.
4. Allow overlaying two indicators? Default: yes, as a new front end on existing data, with separate axes labelled.
5. Show each indicator's own as-of date instead of one "data through"? Default: yes.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Commercial Real Estate Activity. Route: /datasets/commercial-real-estate. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a headline stat strip with per-indicator dates, plain-language definitions, a chart drawer with time ranges, a two-indicator overlay, a year-over-year direction summary and CSV export. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
