# Ezana Consumer Whispers (alternative signals) page: how it works today

Page: Consumer Whispers: consumer and alternative signals. Route: /datasets/alternative. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

This is the single page behind the Consumer Whispers dimension. Its stated purpose is alternative demand signals for listed companies: on-air stock mentions, analyst rating changes, search interest, app trends and consumer-interest proxies, matched to tickers. Every item in the Consumer Whispers menu (Search Interest Data, Web Traffic Analytics, App Download Velocity, Consumer Spending Trends) points here, and all four are marked "not live" in the menu.

- Who uses it: retail investors and student analysts curious about attention and demand signals; signed-out visitors from search. Nothing is gated.
- How they get there: the Consumer Whispers menu in the green band, the datasets overview, search and shared links.
- What they do next: today, only the call to action "Explore in the app", which goes to the login page.
- Data connected today: no, source not connected. Every row on the page is a fixed, hand-written sample shown to every visitor, with a small note "Sample of recent signals, full live dataset available in the app." No live source feeds it and no equivalent dataset exists in the app.
- Sample data rule for the redesign: every figure in the wireframe is sample content with invented names and tickers. On the live page only admin and demo accounts will see sample data, labelled "Sample content"; everyone else will see the honest empty state "This dataset's source is not connected yet." A parallel change is moving the page to exactly this rule.

## 2. What is on the page today

Desktop, top to bottom. The page uses the generic shared dataset template (a narrower, centred marketing layout).

| Section                                    | What it shows and does                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Green band                                 | Drawn by the shared chrome with Consumer Whispers active. No ticker.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Hero (centred)                             | Eyebrow "Datasets", title "Consumer & alternative signals", a long lead sentence promising signals "entity-resolved to tickers so attention shows up before it moves price".                                                                                                                                                                                                                                                                                                          |
| EzanaQL row                                | "Query this data with EzanaQL on the Eyes Above hub" with Share. It points at the wrong dimension's hub.                                                                                                                                                                                                                                                                                                                                                                              |
| Search row                                 | Two labelled, boxed fields: "Stock search" (by ticker) and "Signal search" (by signal or source). They filter the table as you type. Icons are from a non-Bootstrap icon set.                                                                                                                                                                                                                                                                                                         |
| Most-mentioned tickers on air (boxed card) | Badge "New", title, one-line description ("The names financial TV is talking about most this week"), then five ranked rows: ticker, company name and mention count, and a sentiment word (Bullish, Bearish, Neutral) on the right. Not clickable.                                                                                                                                                                                                                                     |
| Recent alternative signals                 | Section title, the sample note, then a table of 12 rows: Source, Signal (for example "On-air mention", "Rating upgrade", "Price-target raise", "App download trend", "Search-interest spike", "App rating decline"), Ticker (mono chip), Sentiment (coloured badge: green, red or neutral), Score (a number from 0 to 1, unexplained), Date (all in May and June 2026). Some Source cells literally read "[CONFIRM source]". Not sortable. Empty after search: "No matching records." |
| How we source it (boxed card)              | Two paragraphs naming third-party data vendors and explaining the "[CONFIRM source]" placeholder.                                                                                                                                                                                                                                                                                                                                                                                     |
| Call to action                             | A solid emerald button "Explore in the app" to the login page.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Shared dataset footer                      | Drawn by the layout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

Page states: the shared dataset skeleton while loading. Because the data is fixed in the page, there is no empty, error or not-connected state today.

Tablet and phone: one column; the two search fields stack; the table scrolls sideways.

## 3. What the user can do

- Filter the sample table by ticker, or by signal or source text.
- Share the page; follow the EzanaQL row (to the wrong hub); click "Explore in the app" (login).
- Nothing else: rows, tickers and the top-five list are not clickable; there is no sorting, paging, detail, export or link to company research.

## 4. Data we have

Nothing is connected. The fields below are what the page displays from its fixed sample, and what a future source would need to supply. None has a real public source or freshness today.

| Field                | What it means                                                                                                                    | Public source                   | Freshness    | Gaps                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------ | ------------------------------------------- |
| Source               | Where a signal came from                                                                                                         | None connected (sample text)    | Fixed sample | Some cells are placeholders                 |
| Signal               | The kind of signal (on-air mention, rating change, target change, app trend, search spike)                                       | None connected                  | Fixed sample | No definitions                              |
| Ticker               | The listed company the signal is about                                                                                           | None connected                  | Fixed sample | Sample uses real tickers; the mock must not |
| Sentiment            | Bullish, Bearish or Neutral                                                                                                      | None connected                  | Fixed sample | Method unknown                              |
| Score                | A 0 to 1 number                                                                                                                  | None connected                  | Fixed sample | Meaning undefined                           |
| Date                 | Signal date                                                                                                                      | None connected                  | Fixed sample | Five or more months old                     |
| Top mentions         | Ticker, company name, mention count for the week, sentiment                                                                      | None connected                  | Fixed sample | None                                        |
| Planned sub-datasets | Search interest, web traffic, app downloads, consumer spending (the last from official aggregate retail and spending statistics) | Named in the category menu only | Not started  | No data, no ingest                          |

## 5. Data we do not have

Do not design around these, except as clearly marked future features:

- Any live signal, mention count, sentiment or score.
- Search-interest, web-traffic, app-download or card-spend time series.
- Price reaction next to a signal, or "attention before price" evidence.
- Company names joined from Ezana's company data on this page.
- Alerts, watchlists or saved views.
- Sample data rule: the wireframe uses invented companies and tickers labelled "Sample content". Ordinary visitors will see "This dataset's source is not connected yet." with one text action back to the datasets overview; admin and demo accounts see the full layout with labelled sample content.

## 6. Must keep working

- The route and its place behind all four Consumer Whispers menu items.
- Public access and the shared green band and footer.
- Known change (in progress in a parallel commit): sample rows and the top-mentions list are shown only to admin and demo accounts, labelled "Sample content"; everyone else gets "This dataset's source is not connected yet." The redesign must keep that split and draw both states.
- Search by ticker and by signal once data exists.
- Share and an EzanaQL row (pointing at the Consumer Whispers hub).
- Nothing on the page may claim a live dataset exists.

## 7. Problems with the current page

Design problems:

- Generic marketing template: centred hero with a long promotional lead, boxed cards with radius and shadow, a "New" badge, a big call-to-action block. Not the dataset family look.
- Labelled, boxed search fields with non-Bootstrap icons.
- Sentiment shown as coloured badges; Bullish and Bearish read as advice.
- No structure for the four planned sub-datasets the menu promises.

Bugs:

- Sample rows are shown to every visitor, with a note implying a full live dataset exists in the app. It does not.
- "[CONFIRM source]" placeholders are visible to the public.
- The source card names third-party data vendors.
- Real companies and tickers appear in fabricated signals.
- The EzanaQL row points at the Eyes Above hub instead of Consumer Whispers.
- Sample dates are months old; the score has no definition.

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

Page note: draw the not-connected frame as prominently as the full layout; it is what most visitors see today. Show tone of a signal in words, never as Bullish or Bearish badges.

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. One page or four sub-datasets? Default: one page with four text-only sections (Search interest, Web traffic, App downloads, Consumer spending), each with its own not-connected state.
2. Keep on-air mentions and analyst rating changes? Default: keep as a fifth section, marked "Not available yet".
3. Keep sentiment and score? Default: drop the score; replace sentiment badges with a neutral "Tone: positive, negative, mixed" word, shown only once a real method exists.
4. What does the not-connected visitor see? Default: the identity row, EzanaQL row, the one-line message "This dataset's source is not connected yet." and a text link back to the datasets overview.
5. Title? Default: "Consumer and alternative signals" in sentence case, no ampersand.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Consumer Whispers: consumer and alternative signals. Route: /datasets/alternative. Version: retail, public dataset page. Data connected today: no, source not connected. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a per-ticker attention timeline, search and web-traffic sections with year-over-year change, a ticker side panel linking to Ezana company research, a most-mentioned leaderboard, a watch on chosen tickers and CSV export, all marked as future work until a source is connected. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
