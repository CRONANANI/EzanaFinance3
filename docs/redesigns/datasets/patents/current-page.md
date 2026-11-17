# Ezana Patent Activity page: how it works today

Page: Patent Activity. Route: /datasets/patents. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

Patent Activity shows which public companies are being granted more U.S. patents than a year ago, and in which technology fields. One of the four Eyes Above datasets.

- Who uses it: retail investors, student analysts and journalists reading corporate research output by ticker. Nothing is gated.
- How they get there: the Eyes Above menu in the green band, the Eyes Above hub, the datasets overview, search and shared links.
- What they do next: open one company's grant history, open a single patent on an outside public patent viewer, or follow the EzanaQL link to the Eyes Above hub.
- Data connected today: yes, live. Granted patents load once a week from U.S. Patent and Trademark Office grant records and are matched to tickers by company name. The page shows no sample data to anyone. Whether the live tables are currently full was not checked.
- Sample data rule for the redesign: every figure in the wireframe is sample content with invented names. On the live page, only admin and demo accounts may ever see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, the honest empty state "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop, top to bottom, on the shared dataset canvas (about 1400px, centred).

| Section                          | What it shows and does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Green band and ticker            | Drawn by the shared chrome. The page feeds up to 20 companies: lead "Patent grants, 12 mo", ticker, signed change. A click opens a small generic dialog with the same values, not the company.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Header (centred)                 | Eyebrow "DATASETS · EYES ABOVE", title "Patent Activity", one lead sentence, "Data through (latest grant date)", then three centred stats: Grants loaded, Matched to a ticker, Companies tracked.                                                                                                                                                                                                                                                                                                                                                                                                              |
| EzanaQL row                      | "Query this data with EzanaQL on the Eyes Above hub" with a Share action.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Company panel (only when opened) | Appears above the Momentum table, not beside it. Title: ticker plus company name, and a bordered Close button. Two boxed cards: "Grants per month, last 36 months" (cyan bar chart with hover count) and "Latest grants" (patent number linking out, title, granted date; up to 20). Loading: three skeleton bars. Error: "This company's grants could not be loaded. Try again shortly." Each card has a one-line empty state.                                                                                                                                                                                |
| Momentum                         | Caption ("at least 25 grants in the last 12 months, against the 12 months before"), a search field ("Search by ticker or company"), then a sortable table of up to 100 companies: Ticker (a button that opens the company panel), Assignee, Grants last 12 mo, 12 mo before, Change (signed percent, green or red), Top CPC section (letter plus field name, for example "G Physics"), Last grant. Default sort: grants in the last 12 months, highest first. The open company's row is highlighted. Empty: "No company matches that search." or "No company has 25 grants matched in the last 12 months yet." |
| Two cards side by side           | "Recent grants to public companies": the 50 newest grants that matched a ticker (patent number linking out, ticker, title, date). "Grants by CPC section, last 12 months": a ranked bar list of the nine technology sections with counts. Each has a one-line empty state.                                                                                                                                                                                                                                                                                                                                     |
| Source footer                    | Two lines: grants by first assignee matched by company name, subsidiaries and foreign filers may be missed; the public source and the outside patent viewer.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Page states: while loading, the shared dataset skeleton (title bars, pill shapes, a table silhouette). If the read fails: "Patent data could not be loaded right now. Please try again shortly." with no Retry. If nothing is loaded: "No patent grants are loaded yet. Grants issue on Tuesdays and load weekly."

Tablet and phone: the two side-by-side cards stack below about 1000px. Below 640px the side padding drops to 16px, the search field goes full width and tables scroll sideways inside their wrapper.

## 3. What the user can do

- Search the momentum table by ticker prefix or company name.
- Sort the momentum table by any column (click again to reverse).
- Open a company's 36-month grant history and latest 20 grants (ticker button), and close it.
- Open any patent on an outside public patent viewer (new tab).
- Hover the monthly chart; click a ticker item in the band for a small dialog.
- Share the page, or go to the Eyes Above hub to query with EzanaQL.
- Not possible today: deep-linking an open company, filtering by technology section, exporting, paging.

## 4. Data we have

| Field                                   | What it means                                                                             | Public source             | Freshness                        | Gaps                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Patent number                           | The grant number, links to the public patent page                                         | U.S. patent grant records | Weekly load after Tuesday grants | Patents without an organisation assignee are dropped                                                  |
| Grant date                              | Date the patent issued                                                                    | Same                      | Weekly                           | None                                                                                                  |
| Title                                   | Patent title                                                                              | Same                      | Weekly                           | Can be missing                                                                                        |
| Assignee                                | First assignee organisation name as filed                                                 | Same                      | Weekly                           | Only the first assignee                                                                               |
| Ticker                                  | Listed company matched from the assignee name, plus a short list of known IP subsidiaries | Name matching by Ezana    | Re-matched each load             | Subsidiaries, foreign filers and renamed companies can be missed; name match, not verified            |
| CPC section                             | One of nine top-level technology sections (A to H and Y)                                  | Same                      | Weekly                           | Only the first classification, section level only                                                     |
| Grants last 12 months, 12 months before | Counts per ticker                                                                         | Calculated                | Hourly cache over weekly data    | Companies under 25 grants are not listed; top 100 only                                                |
| Change                                  | Percent change between the two 12-month windows                                           | Calculated                | Same                             | Blank when the earlier window is zero; unclear whether loaded history fully covers the earlier window |
| Top CPC section, last grant             | Most common section in the last year, newest grant date                                   | Calculated                | Same                             | None                                                                                                  |
| Grants per month                        | Monthly count for one ticker, 36 months                                                   | Calculated                | Same                             | Empty months are omitted rather than shown as zero                                                    |
| Grants by section                       | Count per section, last 12 months, all assignees                                          | Calculated                | Same                             | Includes unmatched companies                                                                          |
| Totals                                  | Grants loaded, grants matched to a ticker, companies tracked                              | Calculated                | Same                             | Totals cover everything loaded, not a fixed period                                                    |
| Filing date                             | Application filing date                                                                   | Stored                    | Weekly                           | Stored but not shown anywhere                                                                         |

## 5. Data we do not have

Do not design around these:

- Patent applications (only grants), citations, claims, abstracts, inventors, families, litigation, or classes below the nine sections.
- Any patent quality, value or "innovation score", and R and D spend.
- Company logos, sector or market cap.
- Non-U.S. patent offices.
- Price reaction or returns next to grants.
- Alerts or saved views for patents.
- Sample data rule: the wireframe uses invented companies and tickers labelled "Sample content". Real visitors never see sample rows; if the source were disconnected they would see "This dataset's source is not connected yet."

## 6. Must keep working

- The momentum table: search, sort on every column, up to 100 companies, the 25-grant floor stated on the page.
- Company detail: 36-month monthly chart and latest 20 grants, opened from any ticker. Add a URL parameter (for example ?company=TICKER) so it deep-links and Back closes it.
- Every patent number links to its public patent page in a new tab, with the screen-reader note.
- Recent grants to public companies (50) and grants by section.
- The data-through date, totals and the matching caveat ("subsidiaries and foreign filers may be missed").
- The band ticker feed, the EzanaQL row to the Eyes Above hub, Share, the shared footer.
- Public access for signed-out visitors. Sample content, if ever added, is for admin and demo accounts only, labelled "Sample content".
- The honest load-failure and nothing-loaded messages.

## 7. Problems with the current page

Design problems:

- Centred hero header with an intro sentence and centred stats, instead of the compact identity row.
- Boxed cards with borders and rounded corners, a bordered Close button, a bordered search box.
- The company panel opens above the table and pushes it down, instead of a side panel.
- "Change" is the most interesting number but the table is sorted by size, so the biggest risers are not visible without a click.
- The section bar list is not clickable and does not connect to the table.
- Section names like "Y Emerging cross-sectional" need a definition tooltip.
- Cyan main series where the family uses emerald.

Bugs:

- Clicking a company in the green ticker opens a generic dialog instead of that company.
- No URL state: an open company, a search or a sort cannot be shared.
- The load-failure message has no Retry.
- Sort indicators are text triangles, not icons.
- Zero-grant months are skipped in the monthly chart.

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

Page note: name the nine technology sections in text, never by colour alone.

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. What should the ranked hero rank, size or acceleration? Default: a leaderboard of the biggest risers by Change (with the 25-grant floor), with total grants as the second view.
2. Should the company detail be a side panel? Default: yes, a 480px right panel with ?company= in the URL.
3. Should the technology sections filter the page? Default: yes, as text-only filters mirrored to the URL (front end only, using existing data).
4. Show the filing date? Default: yes in the company panel's latest grants, since it is stored.
5. Should a CSV export be added? Default: yes, as a text action for the filtered momentum table.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Patent Activity. Route: /datasets/patents. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example an accelerating-companies leaderboard, technology-section filters, a company side panel, links to Ezana company research, new-this-week grants and CSV export. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
