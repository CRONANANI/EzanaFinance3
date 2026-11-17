# Ezana Executive compensation page: how it works today

Page: Executive compensation. Route: /datasets/executive-compensation. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main, November 16, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The page compares CEO pay with company performance, from the "pay versus performance" table US public companies publish in their annual proxy statement. It shows total pay (summary compensation table) and "compensation actually paid" (the SEC's adjusted figure that moves with the share price) beside total shareholder return (TSR) for the company and its peers.

- Who uses it: retail investors, students and journalists asking "is this CEO paid in line with what shareholders got?"
- How they get there: the Titans Shadow menu in the green category bar, the Titans Shadow hub, search engines and shared links.
- What they do next: open a company's history, its proxy statement on SEC EDGAR, or EzanaQL.
- Data connected today: yes, live. Companies are read daily from proxy statements on SEC EDGAR and revisited about monthly; the page caches for about 15 minutes. Coverage is not every company: it is stocks widely held by large institutions, stocks traded by members of Congress in the last two years, and stocks on any user's watchlist. Whether rows exist today was not checked.
- Sample data: none on this page today. Figures in the wireframe are sample content with invented names; on the live page only admin and demo accounts will see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, the honest empty state "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop, top to bottom.

**Frame.** The navigation bar, the full-bleed green category band, and a ticker strip of the 20 highest-paid CEOs: lead "FY 2025 CEO pay", ticker or company, total pay. Items are not clickable. The shared dataset footer closes the page.

**Header (centred).** Eyebrow "DATASETS · TITANS SHADOW", title "Executive compensation", one paragraph defining "Total pay" and "Compensation actually paid", and two stats: "Companies" (count) and "Latest fiscal year". With no data each reads a dash.

**EzanaQL row.** Terminal icon, "Query this data with EzanaQL" linking to the Titans Shadow hub, and Share.

**Company detail (when a company is open).** A bordered card here, above the search, not a side panel.

- Head: name, ticker, a bordered "Close" button.
- Two small line charts side by side: "Compensation actually paid, CEO" and "Company TSR, value of $100", by fiscal year, emerald line, hover tooltip; under two points, no chart.
- A history table, newest year first: Fiscal year, CEO (name), Total pay, Actually paid, Other NEOs total, Other NEOs paid, TSR, Peer TSR, Net income, Company measure (the measure's name and value). Missing values read "Not reported".
- A link "Proxy statement on SEC EDGAR" (new tab).
- Loading: two skeleton bars. Error: "History could not be loaded."

**Search.** A bordered field, "Search by ticker or company". It matches tickers that start with the text and company names that contain it, as you type.

**Main table.** One row per company, its latest fiscal year, every company at once (no paging).

| Column                     | Content                                                  |
| -------------------------- | -------------------------------------------------------- |
| Ticker                     | Mono text button; clicking opens the company detail      |
| Company                    | Name                                                     |
| Fiscal year                | Year of the latest table                                 |
| CEO total pay              | Compact dollars ($24.6M)                                 |
| Compensation actually paid | Compact dollars; can be negative                         |
| Company TSR ($100)         | Value of $100 invested at the start of the period ($184) |
| Peer TSR ($100)            | Same for the company's chosen peer group                 |
| Net income                 | Compact dollars                                          |

Every header sorts (a small triangle marks it). Default: CEO total pay, highest first; missing values sort last. Missing cells read "Not reported". When a company had two CEOs in a year, the one with the larger total pay represents it.

Empty: "No pay versus performance data loaded yet. Companies are added daily from their proxy statements on SEC EDGAR." A search with no match shows an empty table body.

**Source footer.** "Source: SEC EDGAR XBRL, pay versus performance disclosures in proxy statements (DEF 14A)." and "TSR is the value of $100 invested at the start of the period, as each company reports it."

**Loading.** The shared dataset skeleton, which does not match this layout.

**Tablet and phone.** The charts stack below about 990px. Under 640px padding drops to 16px and search goes full width. Tables scroll sideways inside their wrapper.

## 3. What the user can do

- Search by ticker or company; sort any column
- Open a company's multi-year history (charts and table) and close it
- Open the proxy statement on SEC EDGAR
- Share the page; open EzanaQL
- Easy to miss: the detail opens at the top of the page, out of view from lower rows.
- Not available: filters (year, size, sector), export, paging, comparison, and any URL state. An open company cannot be linked or bookmarked, and Back does not close it.
- Stored but not shown in the main table: the CEO's name, the other named officers' average pay, the company's chosen measure.

## 4. Data we have

| Field                                                 | What it means                                     | Public source                      | Freshness                         | Missing for                   |
| ----------------------------------------------------- | ------------------------------------------------- | ---------------------------------- | --------------------------------- | ----------------------------- |
| Ticker, company                                       | Identity                                          | SEC filer records                  | Daily collection, monthly revisit | A few filers without a ticker |
| Fiscal year                                           | Year of each row                                  | Proxy statement                    | Same                              | None                          |
| CEO name                                              | The principal executive for that year             | Proxy pay versus performance table | Same                              | Some filings ("Not reported") |
| CEO total pay                                         | Summary compensation table total                  | Same                               | Same                              | Some years                    |
| Compensation actually paid                            | SEC-defined adjusted pay                          | Same                               | Same                              | Some years                    |
| Other named officers, average total and actually paid | Average for the other named executives            | Same                               | Same                              | Some years                    |
| Company TSR                                           | Value of $100 invested at the start of the period | Same                               | Same                              | Some years                    |
| Peer group TSR                                        | Same for the company's peer group                 | Same                               | Same                              | Companies that report none    |
| Net income                                            | As reported in the table                          | Same                               | Same                              | Some years                    |
| Company-selected measure                              | Name and value of the measure the company chose   | Same                               | Same                              | Many companies                |
| History                                               | Up to about five fiscal years per company         | Same                               | Same                              | Newer filers have fewer years |
| Proxy link                                            | Filing index                                      | SEC EDGAR                          | Same                              | None                          |
| Filed date                                            | Proxy filing date                                 | SEC EDGAR                          | Same                              | Stored, not shown             |
| Company count, latest fiscal year                     | Page stats                                        | Calculated                         | Page cache                        | None                          |

## 5. Data we do not have

Do not design around these.

- Every named executive by name with their own pay; only the CEO by name and the others as an average.
- A breakdown of pay into salary, bonus, stock awards, options and other pay.
- Equity grants, vesting schedules or option details.
- CEO pay ratio to the median employee.
- Say-on-pay vote results.
- Sector, industry or market cap; peer group members by name.
- Share price charts or market data.
- Every listed company: coverage is the universe described in section 1.
- Pay for years before the pay versus performance rule (before about fiscal 2020).
- Any "overpaid" score, grade or ranking verdict.
- Wireframe figures are sample content with invented names; only admin and demo accounts will see sample data live, labelled "Sample content".

## 6. Must keep working

- Both pay figures, clearly labelled, with the definition one tooltip away.
- TSR shown as the value of $100, as the company reports it, with peer TSR beside it.
- "Not reported" for missing values; missing values sort last.
- Search by ticker prefix and company name.
- Sorting on every number column.
- The company history (charts and table) and the link to the proxy statement.
- The larger-paid CEO represents a year with two CEOs (or a note if both show).
- The ticker strip, the EzanaQL row and Share.
- Sample data rule: admin and demo accounts may see sample content labelled "Sample content", never saved; everyone else sees real data or "This dataset's source is not connected yet." Known change: a parallel commit applies this rule to every dataset page.

## 7. Problems with the current page

### Design problems

- A centred title and intro paragraph instead of the compact identity row.
- The detail is a bordered card pushed in above the table instead of a side panel, with an outlined Close button.
- A bordered search field.
- Sort state is a small triangle, not an emerald header with an arrow.
- The main question (pay against shareholder return) has no picture: no ranked hero, no scatter of pay against TSR, no distribution.
- The CEO's name is missing from the main table.
- One wide eight-column table with no grouping.

### Bugs and gaps

- The detail opens at the top without scrolling, so from a lower row nothing seems to happen.
- The history table labels the other named officers' columns "Other NEOs, total" and "Other NEOs, paid", but the figures are averages.
- The company-selected measure's value is always shown in dollars, even when the measure is a ratio or percentage.
- A year with two CEOs appears twice in the history and may give two chart points for the same year.
- The open company is not in the URL; Back does not close it.
- A search with no match shows no empty line.
- Every company renders at once.
- The category menu promises equity awards, which the page does not show.

## 8. Design rules the mock must follow

Family look first, then the corrections outside tools get wrong most often.

1. Draw the frame as it is: the 64px Ezana navigation bar; the full-bleed green band (emerald gradient, white labels) with the dataset category bar, Titans Shadow active; under it the ticker strip of the highest reported CEO pay (small caps mono lead, white name, mint mono value); the shared light grey dataset footer. Do not redesign them.
2. Light mode as rendered on the live site: white ground, dark ink, only colours that exist in both themes.
3. Compact identity row on the left line: small caps mono eyebrow "DATASETS · TITANS SHADOW" (11px, muted) above "Executive compensation" (22px, weight 700, sentence case); on the right a mono freshness line and at most one primary action. No centred title or intro paragraph; one sentence may go in a bi-info-circle tooltip.
4. Under it, the slim EzanaQL row: bi-terminal, "Query this data with EzanaQL", muted "on the Titans Shadow hub", plain-text Share on the right.
5. Content runs from x=32 to x=1408 at 1440px, text on those lines with no side padding.
6. Flat cards: no fill, border, shadow or radius; whitespace and hairlines only. 64px between side-by-side cards, 20px between stacked rows, 24px beside vertical rules. Only overlays (side panel, menus, tooltips) have a surface.
7. Tabs, toggles, filters and time selectors are text only, selected in emerald text, the rest grey; time ranges in 12px mono caps.
8. No outlined or pill buttons: one solid emerald primary per group, everything else plain text, emerald on hover.
9. Borderless search: bi-search icon, grey placeholder, no outline at rest, hover or focus.
10. JetBrains Mono with tabular figures for every figure, ticker, date, rank, eyebrow and table header; Plus Jakarta Sans for names and prose. 11px minimum. Card title 18px, section title 22px, body 14px.
11. Ruled tables: 11px caps mono headers over one hairline, no header fill, 1px row hairlines, 42 to 48px rows, no zebra, cell borders or boxed wrapper, numbers right-aligned, sort by clicking a header (emerald with bi-arrow-up or bi-arrow-down).
12. Entity detail opens in a 480px right side panel with its own URL parameter; Back closes it.
13. Bootstrap Icons only; no emoji, logos or photos; tickers as mono text; colour is never the only signal.
14. Selected rows: emerald text or a faint wash with 12px clearance; no edge bar; no mark touches text.
15. Skeletons in the final layout, never spinners; a one-line empty state with one action; an inline error with Retry.
16. Sentence case. No em dashes. Describe, never advise. Never "real-time": show the last update. No vendor names in interface text. Signed changes, compact headline money ($4.92M), N/A or "Not reported" for missing values.

Colours, light (dark): ground white #ffffff (#0a0e13); primary text #0f172a (#f0f6fc); secondary text #1e293b (#e2e8f0); muted grey #64748b (#8b949e); faint grey #94a3b8 (#6b7280); emerald #059669 (#10b981); emerald text #047857 (#34d399); negative red #dc2626 (#ef4444); warning amber #d97706 (#fbbf24); cyan #06b6d4; purple #a78bfa; hairline = primary text at about 8 percent; green band = emerald gradient with white text.

## 9. Open questions for me

Each question carries the default that will be used.

1. Side panel or inline detail? Default: a 480px side panel with its own URL parameter, opened from any row.
2. Which pay figure leads? Default: CEO total pay leads the table and the hero; compensation actually paid sits beside it with a tooltip.
3. Add a pay against TSR scatter? Default: yes, one dot per company from data already on the page.
4. Show the CEO's name in the main table? Default: yes, as the mono meta line under the company.
5. Rename the officer columns to averages? Default: yes, "Other named officers, average".
6. Page the table? Default: 25 rows per page with a quiet footer.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Executive compensation. Route: /datasets/executive-compensation. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, such as a pay against shareholder return scatter, a ranked hero of the highest-paid CEOs, a company side panel with multi-year pay and TSR, a pay gap view (total pay versus actually paid), a two-company comparison, and a CSV export with a proxy citation. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
