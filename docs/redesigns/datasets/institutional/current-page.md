# Ezana Institutional holdings page: how it works today

Page: Institutional holdings. Route: /datasets/institutional. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main, November 16, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The page reads every quarterly Form 13F-HR filed by managers above $100M in US equities: holdings at quarter end, changes against the prior quarter, who is buying against who is selling, and who has filed for the quarter underway. Ten analysis cards, two tables and two side panels.

- Who uses it: retail investors, students and journalists asking "what are big managers buying, and who owns this stock?"
- How they get there: the Titans Shadow menu, the hub, search engines and shared links (including links to a panel).
- What they do next: open a manager or stock panel, follow cross-signal links to other datasets, open a filing, or open EzanaQL.
- Data connected today: yes, live. Filings are collected from SEC EDGAR several times an hour and summarised per quarter; the page caches about 15 minutes. Whether the latest quarter is loaded today was not checked.
- Sample data: a sample set exists but shows only in local development, with a "SAMPLE DATA" chip. Figures in the wireframe are sample content with invented names; on the live page only admin and demo accounts will see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, the honest empty state "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop. Cards are white rounded panels with soft shadows, two per row, each with an icon tile, mono eyebrow, a question as title, a quarter chip ("Q4 2026 · partial" in amber) and a source footer.

**Frame.** Green category band and a ticker strip of up to 12 signals (NET BUYERS, NEW POSITION, EXIT, (quarter) FILED); an item opens its panel.

**Quarter ledger.** Four tiles above the header: Filers, Reported value, Positions, Filers with a prior quarter, each with a signed quarter change.

**Header (centred).** Eyebrow "DATASETS · SEC EDGAR FORM 13F-HR", title "Institutional Holdings", a lede. Then the EzanaQL row with Share.

**Toolbar.** A quarter control (complete quarter, and the open quarter with a "filing · 42.0% filed" badge), a grouped search "Find a manager, ticker, issuer or CUSIP" (four managers and five securities, keyboard, Enter opens a panel) and a "How we source it" link.

**Filing season bar.** Deadline and days left, filed against expected filers with a marker at last quarter's pace ("61.2% · ahead of pace"), "Updated (time) ET"; after the deadline "Season closed".

**Partial banner.** With the open quarter: managers filed so far, figures partial until the deadline; some cards read "Available for completed quarters." Page empty: "The latest 13F filings are still being indexed."

**Cards, in rows.**

| Card                               | Contents                                                                                                                                               | Controls                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Filing season clock (open quarter) | Managers filed by day of 45 against last quarter, a cumulative curve, early movers                                                                     | A mover opens its panel                                        |
| Net flow board                     | Eight tickers: sellers bar, buyers bar, net count                                                                                                      | Tabs: net buyers, net sellers, newly entering; row opens stock |
| Consensus vs conviction            | Scatter of holders against median weight, dot size by value, four quadrants (Hidden conviction, Crowded core, Index ballast, Long tail), hover readout | Sector chips; dot opens stock                                  |
| Sector rotation                    | Per sector: share of value then and now (dumbbell), dollar flow (diverging bar)                                                                        | None                                                           |
| Fresh conviction and clean exits   | Five largest new positions and five full exits over $100M: manager, ticker, percent of book, value, Whale Score                                        | Open panels                                                    |
| Signal convergence                 | Eight tickers with dots for 13F net buyers, insider buys, Congress buys, activist stake, "(n) of 4"                                                    | Dots link to other datasets                                    |
| The lag tax                        | Ten most net-bought tickers, price change since quarter end                                                                                            | Row opens stock                                                |
| Manager universe                   | Every filer by value against effective positions, top 25 labelled                                                                                      | Dot opens manager                                              |
| Hedge overlay                      | Eight tickers: put and call notional, put to call ratio                                                                                                | Row opens stock                                                |
| Find a manager                     | Rank, name and CIK, value, positions, top holding, filed date and lag                                                                                  | Filter; opens panels                                           |
| Find a security                    | Ticker or issuer, CUSIP, holders and change, value, shares, net breadth                                                                                | Filter; opens stock                                            |

Each card asks its question as the title and has its own skeleton and empty line.

**How we source it.** Six notes (Lag, Long only, Options are notional, Value moves with price, Coverage, Amendments) and a not-advice line.

**Manager fingerprint panel (480px, right).** Identity, value, positions, filed date, filing link; concentration (top 10 share, effective positions); sector tilt; turnover by change type; top adds and cuts; holdings; twin funds by overlap.

**Security X-ray panel.** Ticker, sector, CUSIP, price since quarter end; largest holders (shares, percent of outstanding, quarter change); ownership and net breadth; holder ladder paged by 25; who is new and who left; cross-signals to Insider trading, Politician Tracker, Whale Moves and ETF holdings. Errors offer Retry.

**Loading.** The shared dataset skeleton, not this layout.

**Tablet and phone.** Card rows stack under about 1,250px; under 640px gaps tighten and panels go full width.

## 3. What the user can do

- Switch between the complete quarter and the open (partial) quarter
- Search managers and securities; filter the two tables
- Switch the net flow tabs; filter the scatter by sector
- Open a manager or stock panel from almost any row, dot or ticker item, page the holder ladder, expand twin funds
- Follow cross-signal links; open filings; share; open EzanaQL
- Easy to miss: the ticker strip items are clickable.
- Not available: sorting tables, export, time ranges beyond two quarters, comparing managers.

## 4. Data we have

| Field                                  | What it means                                            | Public source                                               | Freshness                                    | Missing for                         |
| -------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------- | ----------------------------------- |
| Filers, reported value, positions      | Quarter totals and prior-quarter change                  | Form 13F-HR                                                 | Several times an hour; page cache 15 minutes | Partial during filing season        |
| Filing progress                        | Filed, expected, pace, deadline, last update             | Form 13F-HR                                                 | Same                                         | Prior pace when records are short   |
| Net breadth                            | Managers buying, selling, net, newly entering            | Calculated from share counts                                | Same                                         | Managers without a prior quarter    |
| Holders, median weight, combined value | Ownership breadth and depth per security                 | Calculated                                                  | Same                                         | Options lines excluded              |
| Sector shares and flow                 | Share of equity value and flow by sector                 | Calculated                                                  | Same                                         | Unmapped value ("Unclassified")     |
| New positions, exits                   | Manager, ticker, value, percent of book                  | Calculated                                                  | Same                                         | Under $100M                         |
| Whale Score                            | Ezana's 0 to 100 measure                                 | Ezana calculation                                           | Same                                         | None                                |
| Convergence                            | Insider buys, Congress buys, activist stake per ticker   | Form 4; House and Senate disclosures; Schedules 13D and 13G | Same                                         | Unmapped tickers                    |
| Price since quarter end                | Percent change                                           | Daily closing prices                                        | Daily                                        | Some tickers                        |
| Put and call notional                  | Underlying value and filer counts                        | Form 13F-HR                                                 | Same                                         | None                                |
| Manager detail                         | Holdings, turnover, sector tilt, twins, filing link      | Form 13F-HR                                                 | Same                                         | Prior quarter needed for changes    |
| Security detail                        | Holders, ladder, largest holders, percent of outstanding | Form 13F-HR; issuer cover pages                             | Same                                         | Outstanding shares for some issuers |
| Ticker, sector                         | Mapped from the security identifier                      | Identifier mapping                                          | Fills in over days                           | Unmapped securities                 |

## 5. Data we do not have

Do not design around these.

- Short positions, cash, most bonds or non-US listings.
- Positions between quarter ends, or anything live.
- History beyond the latest complete and open quarters.
- Manager performance or returns, fees or investor flows.
- Manager logos, photos or biographies.
- Option premiums, strikes or expiries.
- Analyst ratings or price targets; any "buy" verdict.
- Wireframe figures are sample content with invented names; only admin and demo accounts will see sample data live, labelled "Sample content".

## 6. Must keep working

- URL state: the quarter, and the manager or security panel; opening one panel replaces the other; Back closes a panel; shared links open the panel.
- Partial quarter handling, banner and "Available for completed quarters" cards.
- The filing season bar and clock.
- Every card loads and fails on its own.
- Grouped search with keyboard use; table filters.
- Clickable ticker strip items.
- Both panels with every section, Retry and paging.
- Cross-signal links to Insider trading, Politician Tracker, Whale Moves and ETF holdings; filing links.
- Method notes and the not-advice line.
- Sample data rule: admin and demo accounts may see sample content labelled "Sample content", never saved; everyone else sees real data or "This dataset's source is not connected yet." Known change: a parallel commit applies this rule to every dataset page.

## 7. Problems with the current page

### Design problems

- Ledger tiles sit above a centred title and lede, so the page has two heads.
- Cards have fills, shadows, rounded corners and icon tiles; chips are filled pills; the selected tab and quarter are filled.
- Ten cards with equal weight and no ranked hero; the strongest answer (net flow) is not first.
- Legends lean on colour dots.
- Tables cannot be sorted.

### Bugs and gaps

- Convergence dots link to other datasets without the ticker.
- Labels as small as 9.5 to 10.5px.
- The loading skeleton does not match the layout.
- The table searches only cover the loaded top rows, not every filer.

## 8. Design rules the mock must follow

Family look first, then the corrections outside tools get wrong most often.

1. Draw the frame as it is: the 64px Ezana navigation bar; the full-bleed green band (emerald gradient, white labels) with the dataset category bar, Titans Shadow active; under it the ticker strip of the newest holdings signals (small caps mono lead, white name, mint mono value); the shared light grey dataset footer. Do not redesign them.
2. Light mode as rendered on the live site: white ground, dark ink, only colours that exist in both themes.
3. Compact identity row on the left line: small caps mono eyebrow "DATASETS · TITANS SHADOW" (11px, muted) above "Institutional holdings" (22px, weight 700, sentence case); on the right a mono freshness line and at most one primary action. No centred title or intro paragraph; one sentence may go in a bi-info-circle tooltip.
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

1. Which card is the hero? Default: the net flow board, full width under the filters.
2. Keep all ten cards? Default: yes, regrouped into numbered editorial sections, none removed.
3. Quarter control? Default: text-only selector, "partial" marked in amber text.
4. Sortable tables? Default: yes, header click.
5. Where does the ledger go? Default: a ruled stat strip under the identity row.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Institutional holdings. Route: /datasets/institutional. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, such as follow a manager for its next filing, compare two managers, a "what changed since my last visit" marker, ticker-carrying cross-signal links, and a CSV export with a filing citation. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
