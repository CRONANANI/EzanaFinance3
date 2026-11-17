# Ezana Crowd Forecasts page: how it works today

Page: Crowd Forecasts (Crowdsourced Intelligence). Route: /datasets/crowd-forecasts. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The page lists open crowd forecasting questions on politics, markets and world events from a public play-money forecasting site, with the current crowd probability and how many people have forecast. Because the money is play money, a probability shows what the crowd expects, not money at stake. Part of The Hive dimension, next to Prediction Markets (real money).

- Who uses it: retail investors, students and journalists who want a broad crowd read on questions real-money markets may not list. Nothing is gated.
- How they get there: The Hive menu in the green band ("Crowdsourced Intelligence"), the datasets overview, search and shared links.
- What they do next: open a question on the forecasting site, or follow the call to action to the Prediction Markets page.
- Data connected today: yes, live. Open questions are re-indexed every six hours. The page shows no sample data to anyone. Whether rows are loaded right now was not checked.
- Sample data rule for the redesign: every figure in the wireframe is sample content with invented questions. On the live page only admin and demo accounts may ever see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop, top to bottom. The page uses the generic shared dataset template (a narrower, centred marketing layout), not a bespoke design.

| Section                       | What it shows and does                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Green band                    | Drawn by the shared chrome with The Hive active. This page publishes no ticker.                                                                                                                                                                                                                                                                                   |
| Hero (centred)                | Eyebrow "Datasets", title "Crowd forecasts", a long lead sentence.                                                                                                                                                                                                                                                                                                |
| EzanaQL row                   | "Query this data with EzanaQL on The Hive hub" with Share.                                                                                                                                                                                                                                                                                                        |
| Search row                    | One labelled search field, "Question search", placeholder "Search questions…". It filters the table as you type, matching the question text and the hidden category.                                                                                                                                                                                              |
| Most forecast (boxed card)    | Badge "Most forecast", a people icon, title "Questions with the most forecasters", a one-line description, then a numbered list of the top five: question, "(N) forecasters", and the probability on the right in mono. Rows are not clickable. Empty: "Questions appear here as they are indexed."                                                               |
| Open crowd forecasts          | Section title, a note "Probabilities as of (date)", then a table: Question (a link to the forecasting site in a new tab), Probability (whole percent), Forecasters, Closes. Up to 150 rows, ordered by number of forecasters, all on one page, no sorting, no paging. Empty: "No open questions indexed yet." After a search with no hits: "No matching records." |
| How we source it (boxed card) | Two sentences: the questions come from a public forecasting site and use play money; for real-money odds, see the prediction markets dataset.                                                                                                                                                                                                                     |
| Call to action                | A solid emerald button "See prediction markets" with an arrow.                                                                                                                                                                                                                                                                                                    |
| Shared dataset footer         | Drawn by the layout.                                                                                                                                                                                                                                                                                                                                              |

Page states: while loading, the shared dataset skeleton. If the read fails, the server quietly returns no rows, so a failure looks the same as an empty dataset ("No open questions indexed yet."). There is no error message and no Retry.

Tablet and phone: the layout is a single column already; the table scrolls sideways inside its wrapper on narrow screens.

## 3. What the user can do

- Search questions by text (also matches the category, which is not shown).
- Open a question on the forecasting site (new tab).
- Read the five most-forecast questions.
- Go to the Prediction Markets page; share this page; go to The Hive hub for EzanaQL.
- Not possible today: sorting, paging, filtering by category or close date, opening a question inside Ezana, seeing how a probability has moved, exporting.

## 4. Data we have

| Field               | What it means                                       | Public source                        | Freshness                                 | Gaps                                                      |
| ------------------- | --------------------------------------------------- | ------------------------------------ | ----------------------------------------- | --------------------------------------------------------- |
| Question            | The forecasting question as written                 | A public play-money forecasting site | Every six hours; page reads on each visit | Only open questions that have not passed their close date |
| Probability         | Current crowd probability, shown as a whole percent | Same                                 | Same                                      | Play money; not comparable with real-money odds           |
| Forecasters         | Number of people who have forecast                  | Same                                 | Same                                      | Can be blank                                              |
| Close date          | When the question closes                            | Same                                 | Same                                      | Can be blank (open-ended)                                 |
| Category            | The site's topic label                              | Same                                 | Same                                      | Stored and searchable but not displayed                   |
| Link                | The question's page on the site                     | Same                                 | Same                                      | Can be missing                                            |
| Probabilities as of | Newest refresh time across the rows                 | Calculated                           | Same                                      | Date only                                                 |
| Top five            | The five questions with most forecasters            | Calculated                           | Same                                      | Same ordering as the table                                |

Only the 150 questions with the most forecasters are loaded.

## 5. Data we do not have

Do not design around these:

- Probability history, change over a day or week, or sparklines (only the current value is stored for the page).
- Trading volume, liquidity or money at stake.
- Resolution outcomes or forecaster accuracy records.
- Individual forecasters, comments or arguments.
- Ticker or company links.
- Matching of a crowd question to the same question on a real-money market (no matching exists).
- Ezana's own forecasts or any composite score.
- Sample data rule: the wireframe uses invented questions labelled "Sample content". Real visitors never see sample rows; with no source they would see "This dataset's source is not connected yet."

## 6. Must keep working

- The table of open questions with probability, forecasters and close date, each linking to its page on the forecasting site in a new tab, with an accessible label.
- Search across question and category.
- The most-forecast top five.
- The plain statement that this is play money and the link across to Prediction Markets.
- "Probabilities as of" freshness.
- The EzanaQL row to The Hive hub, Share, the shared footer, public access.
- No sample data for ordinary visitors; sample content, if ever added, only for admin and demo accounts, labelled "Sample content".

## 7. Problems with the current page

Design problems:

- Generic marketing template: a centred hero with a long lead, boxed cards with borders, radius and shadow, a "Most forecast" badge, a big call-to-action block. It does not look like the dataset family.
- No ranked hero beyond a static top-five list; no filters; no breakdown by category or by close date.
- A labelled, boxed search field.
- 150 rows in one unpaged table, unsortable.
- The category is used by search but never shown.
- Everything is a link off-site; there is no detail view in Ezana.

Bugs:

- A failed data read is shown as "No open questions indexed yet.", which is misleading; there is no error state and no Retry.
- The top-five rows look like list items but do nothing.
- The freshness note shows a date only, though the data refreshes every six hours.

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

Page note: always say "play money" near the probabilities, so they are never read as real-money odds.

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. Should the page move off the generic template onto a bespoke dataset layout? Default: yes, the family look.
2. Show the category? Default: yes, as a column and as text-only filter chips mirrored to the URL.
3. Add a question side panel? Default: yes, with the fields we have and the outbound link, and ?question= in the URL; probability history shown as "Not available yet".
4. Add a band ticker? Default: yes, the most-forecast questions with their probability.
5. Keep the call to action to Prediction Markets? Default: yes, as a plain-text link, not a big button block.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Crowd Forecasts (Crowdsourced Intelligence). Route: /datasets/crowd-forecasts. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example category filters with counts, a closing-soon timeline, a probability distribution view (near 50 percent versus decided), a question side panel, a crowd-versus-real-money comparison marked as future work and CSV export. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
