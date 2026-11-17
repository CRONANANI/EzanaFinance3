# Ezana Global and Macro page: how it works today

Page: Global and Macro (shown as "Global, macro & wealth data"). Route: /datasets/global. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.

Written from the code at commit caa179e (main). The page was not run while writing this.

## 1. Summary

A placeholder page. Two items in the Global Empire Lighthouse menu point here: "Global & Macro" (macro indicators, global markets and wealth tracking) and "GDELT Global Events Database" (global news events and geopolitical developments). Both are marked Soon in the menu. Whichever a visitor clicks, they get the same page: a static macro snapshot and a static table of billionaires.

- Who: visitors exploring the lighthouse menu, and anyone arriving from search (the page's search description promises sovereign wealth fund positioning and cross-border flows, which the page does not show).
- How they arrive: the lighthouse menu (two items), the lighthouse hub's dataset cards (both marked Soon).
- What next: today, nothing useful; the only action is "Explore in the app", which goes to log in.
- Data connected today: no, source not connected. Every figure on the page is hard-coded sample content, shown to everyone. A parallel change replaces it: admin and demo accounts will see invented sample content labelled "Sample content", and everyone else will see "This dataset's source is not connected yet."
- Sample data: wireframe figures are sample content with invented names. Because two menu items share this route, the redesign must decide what the page is (see section 9).

## 2. What is on the page today

Desktop, top to bottom, in the generic older dataset layout.

- Frame: navigation bar and green band with Global Empire Lighthouse and the "Global & Macro" item active. No ticker.
- Hero: small eyebrow "Datasets", a large centred title "Global, macro & wealth data", and a lead paragraph ("The wider lens, macro indicators, global markets, and billionaire wealth tracking...").
- EzanaQL row: terminal icon, "Query this data with EzanaQL" linking to the Global Empire Lighthouse hub, "on the Global Empire Lighthouse hub", and a Share button.
- Search row: two bordered boxes with labels, "Person search" (placeholder "Search by name", matches name or ticker) and "Country search". They filter the table below as you type.
- Highlight card (filled, rounded): a "New" badge, title "Macro snapshot", a sentence, and five ranked rows: US real GDP growth, US CPI, US unemployment, China real GDP growth, Euro area inflation, each with a meta line ("United States · annual") and a value, growth values tinted green. Static figures, no date.
- Table "Billionaire & wealth tracking": Name, Net worth, Primary source (a ticker chip), Country, YTD (signed, coloured). Ten rows naming real people with made-up figures. A note above: "Sample of tracked wealth, full live dataset available in the app." Rows do not open anything. The table sits in a bordered, shadowed box.
- "How we source it": two paragraphs that name several commercial data vendors and a public list of the rich, and say records are joined to tickers and sectors (they are not).
- A large "Explore in the app" button to log in.
- Footer.

States: route skeleton (centred title, five pills, a ten-row table). Search with no match: "No matching records." Tablet and phone: the search boxes stack, the table scrolls sideways; breakpoints not verified.

## 3. What the user can do

- Filter the wealth table by name or ticker, and by country
- Open EzanaQL on the lighthouse hub; share the page
- Click "Explore in the app" (log in)
- Nothing else: no row detail, no sorting, no export.

## 4. Data we have

| Field               | Meaning                                             | Public source           | Freshness     | Gaps       |
| ------------------- | --------------------------------------------------- | ----------------------- | ------------- | ---------- |
| Macro snapshot rows | Five headline readings                              | None: hard-coded sample | Never updated | Everything |
| Wealth rows         | Name, net worth, linked ticker, country, YTD change | None: hard-coded sample | Never updated | Everything |

No source is connected. For a design, the closest real data Ezana already has elsewhere in this dimension is annual country indicators (World Bank and OECD pages) and the monthly geopolitical risk index; none of it feeds this page today.

## 5. Data we do not have

Do not design around these.

- Any live wealth or billionaire data, rankings, net worth history or holdings.
- Global market prices, indexes, currencies or commodities on this page.
- News events or event counts by country (the events database named in the menu is not connected).
- Sovereign wealth fund positions or cross-border flows (named in the page's search description only).
- Ticker or sector joins.
- Sample data rule: a wireframe uses invented names and fictional tickers, labelled sample content. On the live page only admin and demo accounts may see sample data, labelled "Sample content"; everyone else sees "This dataset's source is not connected yet." with one link back to the datasets overview.

## 6. Must keep working

- The route stays reachable from both menu items that point at it.
- The EzanaQL row to the lighthouse hub and the Share action.
- The green band highlighting the right item.
- Known change: the hard-coded samples (real people, named vendors) are removed; admin and demo accounts see invented, labelled sample content; everyone else sees the not-connected state. Sample rows are never presented as real.

## 7. Problems with the current page

### Design problems

- Generic older layout: centred title with lead paragraph, filled highlight card, bordered search boxes, boxed table, big call-to-action button.
- One page stands in for two unrelated datasets (macro and wealth, and a global events database).
- The highlight card ranks five unrelated indicators as if they were comparable.

### Bugs and gaps

- Real people with invented net worths are shown to everyone as if tracked; the note claims a "full live dataset available in the app", which does not exist.
- The sourcing paragraph names commercial vendors, which the brand rules forbid, and claims ticker and sector joins that do not exist.
- The search description promises content the page does not have.
- The macro snapshot has no dates or source.

## 8. Design rules the mock must follow

From the dataset page master prompt and the Branding and UI Guide; the ones outside tools get wrong most often first.

1. Draw the family frame as it is: the 64px Ezana navigation bar, the full-bleed green category band (emerald gradient, about 48px, white labels, Global Empire Lighthouse as the active dimension in soft translucent white), and the shared light grey dataset footer.
2. Light mode, as rendered on the live site: white ground, dark ink, only colours that exist as tokens in both themes.
3. Compact identity row on the left line: 11px small caps mono eyebrow "DATASETS · GLOBAL EMPIRE LIGHTHOUSE", the dataset name as a 22px weight 700 heading in sentence case, the freshness line in mono and at most one primary action on the right. No hero, no centred title, no intro paragraph. One sentence may sit in a bi-info-circle tooltip. A small grey "Sample content" label sits near this row.
4. Under it, the slim EzanaQL row: bi-terminal, "Query this data with EzanaQL", muted "on the Global Empire Lighthouse hub", plain-text Share on the right.
5. Content runs from x=32 to x=1408 at 1440px, text on those lines with zero side padding.
6. Flat cards: no fill, border, outline, shadow, glow or radius; KPI tiles and scorecards too. Separate with whitespace and 1px hairlines. Only overlays (side panel, drawer, menus, tooltips, dialogs) have a surface.
7. Tabs, toggles, filters and time selectors are text only, no border, track, chip or fill; selected is emerald text, the rest grey; time ranges in 12px mono caps.
8. No outlined, ghost or pill buttons. One solid emerald primary button per group; every other action is plain text, emerald on hover.
9. Borderless search: bi-search icon, grey placeholder, no outline at rest, hover or focus.
10. JetBrains Mono for every figure, ISO code, date, rank, eyebrow, table header and axis label; Plus Jakarta Sans for names and prose. 11px minimum. Card title 18px, section title 22px, body 14px, caption 12px, KPI 18px mono.
11. Ruled tables: no header fill, 11px caps mono grey headers over one hairline, 1px row hairlines, 42 to 48px rows, numbers right in mono, sort by clicking a header (emerald with an arrow). No zebra, no boxed wrapper, no accent bar on a selected row.
12. Entity detail in a right side panel (480px) or drawer (up to 720px) with its own URL parameter; Back closes it.
13. Flat charts: no background or border, faint dashed gridlines, 11px mono ticks, direct labels. Emerald is the main series, comparison neutral grey dotted, decline in negative red, extra categories from the chart tokens. Partial or provisional periods drawn lighter or hatched and labelled.
14. 64px between side-by-side cards, 20px between stacked rows, 24px beside any vertical rule. Nothing drawn touches text.
15. Bootstrap Icons only; no emoji, flags, logos, photos or illustrations. Skeletons, never spinners.
16. Sentence case, no em dashes, describe never advise, never "real-time", no vendor or database names in the interface. Signed changes, missing values read N/A, colour never the only signal.
17. Every card has a skeleton, a one-line empty state with one action, and an inline error with Retry. Close with an honest source line and "Nothing here is investment advice."

Colours, light as rendered (dark in brackets): ground white #ffffff (#0a0e13); primary text #0f172a (#f0f6fc); secondary text #1e293b (#e2e8f0); muted grey #64748b (#8b949e); faint grey #94a3b8 (#6b7280); emerald #059669 (#10b981); emerald text #047857 (#34d399); negative red #dc2626 (#ef4444); warning amber #d97706 (#fbbf24); cyan #06b6d4; purple #a78bfa; hairline = primary text at about 8 percent; green band = emerald gradient with white text.

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. What is this page? Default: a "Global events and macro" page designed for the global events database (events and tone by country over time), with a compact macro context strip; wealth tracking is dropped.
2. Should the two menu items keep sharing one route? Default: yes for now; the page names both and says which parts are not connected.
3. Show any real data from other lighthouse datasets meanwhile? Default: no; link to the World Bank, OECD and geopolitical risk pages instead of copying their figures.
4. Keep "Explore in the app"? Default: no; replaced by the honest not-connected state and the EzanaQL row.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Global and Macro. Route: /datasets/global. Version: retail, public dataset page. Data connected today: no, source not connected. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, such as an event count map by country, an event timeline with tone, a country side panel linking to the risk, sanctions and conflict pages, and a watch-a-country alert, each marked as future work until the source connects. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
