# Ezana Echo page (council section): how it works today

Page: Ezana Echo. Version: organizational (a council-only section on the shared page, shown only to council members). Route: /ezana-echo (article pages, the archive and author pages are separate routes and stay as they are). Brief: keep the existing Echo front page working for everyone and add a council section for university investment councils.
Written from the code at commit a2de444 (main, November 16, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

Ezana Echo is Ezana's own publication: a newspaper-style front page of long-form articles on markets, policy, technology, commodities, crypto and global markets, written by Ezana Editorial and approved outside writers. It is public; anyone can read it without signing in.

- Who uses it today: every reader, signed in or not. Admins can also archive articles.
- Who in a council would use the council section: analysts (Echo coverage of the names they own or pitch), portfolio managers and executives (required reading for a team or cohort, council documents worth sharing), faculty advisors (reading for new members).
- Decision the council section supports: "what should our analysts read this week about the names we hold and the pitches in our pipeline", and "which of our own research is good enough to publish as a council read".
- How they get to it: Research menu, Ezana Echo. What they do after: open an article.

The redesign keeps the whole front page exactly as it works today and adds a council band (or a set of council cards) that only council members see.

## 2. What is on the page today

Desktop, top to bottom. This is the same for every reader.

**A. Masthead (replaces the app navigation bar here).** Ezana logo and the "Ezana Echo" wordmark on the left. Six section links in the middle: Markets & Companies, Politics & Policy, Tech & Founders, Commodities & Energy, Crypto, Global & Emerging Markets; a click filters the grid and scrolls to it. On the right: a search icon (opens the search field below and scrolls to it), "Archived" with a count (admins only, opens the archive page), "Login" (shown even when signed in), and "Subscribe" (scrolls to the newsletter sign-up).

**B. Dateline.** Today's date, Toronto time.

**C. Article of the Month.** A large banner (full-bleed photograph, or an inset image when the photo is too small) with a kicker (the month, or "Most read this month" or "Latest story" when no monthly pick resolves), section label, title, standfirst, byline, date, read time, and a "Read" link. A "Past picks" menu swaps the banner to an earlier month's pick and offers "Back to current".

**D. Latest Stories controls.** Title "Latest Stories", section tabs (All plus the six sections), a region menu (All regions, N. America, S. America, Europe, Africa, Asia, Oceania), time range options (24H, 7D, 30D, 90D, 1Y, ALL) and, when opened, a search field ("Search stories, tickers, topics", 80 characters) with a close button. Filters change only the grid, never the banner or Most read, and are written into the page address so a filtered link opens filtered.

**E. Feature block.** A lead story with image beside a list of three more stories (section tag, title, byline, date, read time).

**F. Row of three.** Three story cards.

**G. Most read.** The five stories with the most reads, numbered, with read counts. Stories with no reads never rank.

**H. More stories.** A packed grid of tiles of varying size; on the unfiltered page one tile is the "Chart of the Week". "Load more stories" adds a page and moves focus to the first new tile.

**I. The Evening Brief.** Newsletter sign-up: email, a consent tick box, "Subscribe", double opt-in, inline messages for errors.

**J. Footer.** Wordmark, "All stories" (resets filters), "Write for Echo" (opens the writer application), and the line "Ezana Echo is published by Ezana Finance. Nothing here is investment advice."

**Admin only.** An archive icon on each story card; a browser confirmation, then the story disappears for non-admins.

**States.** Skeletons while loading; "We couldn't load the latest stories" with Retry; an empty filter result names the filters and offers "Reset filters".

**Tablet and phone.** Section links drop to a scrolling row; the grid collapses to one column.

## 3. What the user can do

| Action                                           | Who               | Notes                                                                  |
| ------------------------------------------------ | ----------------- | ---------------------------------------------------------------------- |
| Read and open articles                           | Everyone          | No sign-in needed                                                      |
| Filter by section, region and time range; search | Everyone          | Kept in the page address                                               |
| Switch the Article of the Month to a past pick   | Everyone          |                                                                        |
| Load more stories                                | Everyone          |                                                                        |
| Subscribe to the Evening Brief                   | Everyone          | Double opt-in                                                          |
| Apply to write for Echo                          | Everyone          | Opens the writer application                                           |
| Archive a story                                  | Admins            | Confirmed, then hidden from non-admins                                 |
| Open the archive                                 | Admins            |                                                                        |
| Save, react to, comment on an article            | Signed-in readers | Only on article pages; the saved list is never shown on the front page |

There is nothing council-specific on this page today.

## 4. Data we have

Echo's own data, for everyone:

| Field                                                                      | What it means               | Source in public terms                | Freshness                     | Missing for                        |
| -------------------------------------------------------------------------- | --------------------------- | ------------------------------------- | ----------------------------- | ---------------------------------- |
| Story title, standfirst, author, section, sub-tag, date, read time, image  | One published article       | Ezana's article library               | Cached for up to five minutes | Image missing on some stories      |
| Tickers, sectors, industries, institutions, regions, asset classes, themes | What the article is about   | Tagged by the editor on every article | Fixed at publish              | Older articles may have fewer tags |
| Read count                                                                 | Cumulative reads            | Ezana's own reading tally             | Updates as stories are read   | Zero for new stories               |
| Article of the Month and past picks                                        | Editorial pick by month     | Ezana editorial                       | Monthly                       |                                    |
| Chart of the Week                                                          | One editorial chart         | Ezana editorial                       | Weekly                        |                                    |
| Saved articles                                                             | A reader's own reading list | Saved from article pages              | Immediate                     | Only for signed-in readers         |

Council data that exists and could connect (all scoped to the reader's council):

| Field                       | What it means                                                                                                                               | Source in public terms      | Freshness                                             | Missing for                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Positions                   | The council fund's holdings: ticker, name, sector, team, shares, cost, last price, value                                                    | The council's position book | Prices refreshed daily; unpriced rows carried at cost | Councils that have not imported holdings                                                           |
| Pitches                     | Every pitch with ticker, analyst, team, stage, expected return                                                                              | Pitch Pipeline              | Immediate                                             |                                                                                                    |
| Research library documents  | Council notes, memos, primers and post-mortems with ticker, sector, author, status (draft, in review, published), exemplar and pinned marks | Research Library            | Immediate                                             | Private drafts are visible only to their author                                                    |
| Coverage owner by ticker    | Current analyst per ticker, last document date, stale after 90 days                                                                         | Research Library handoffs   | Immediate                                             | Tickers with no documents                                                                          |
| Sector coverage             | Which member covers which sector                                                                                                            | Org chart                   | Immediate                                             |                                                                                                    |
| Assignments of type Reading | A task given to a member, team or cohort, with due date, status and submissions                                                             | Assignments                 | Immediate                                             | An assignment cannot point at a specific Echo article today; it holds a title and description only |
| Members and roles           | Name, role (analyst, portfolio manager, executive), title (faculty advisor), team                                                           | Council roster              | Immediate                                             |                                                                                                    |

## 5. Data we do not have

Do not design around these.

- Council members publishing directly to Echo. Council documents live in the Research Library; there is no path from a council document to an Echo article. Outside writers go through a separate application.
- Who in a council read which Echo article. Read counts are totals only, not per reader and not per council.
- A council-shared reading list. Saved articles are private to each reader.
- Linking an assignment to a specific Echo article, or marking an assignment done because an article was read.
- Council-only comments or discussion on an Echo article. Article comments are public.
- Analyst ratings, price targets, outside news, or any per-article performance figure.

## 6. Must keep working

- The whole public front page, for signed-out readers and for every retail account, exactly as described in section 2. The council section must never show to a signed-out reader or a non-council account.
- Filters in the page address (section, region, range, search), shared filtered links, and the rule that filters never change the banner or Most read.
- Article of the Month logic and Past picks.
- Load more with focus moving to the first new tile.
- The Evening Brief double opt-in with its consent line.
- "Write for Echo", admin archiving, the masthead, links to article, author and archive pages.

## 7. Problems with the current page

Design problems:

- Nothing connects Echo to a council's work; an analyst must search ticker by ticker.
- The saved list is invisible here, and article tags are used only by search.

Bugs:

- "Login" shows to signed-in readers.
- A council member on this route has no way back to the Team Hub except the browser.

## 8. Design rules the mock must follow

Echo is the sanctioned exception to the app look: its own masthead, the Newsreader serif for headlines, and photography. The council section follows the app rules below. Most often broken first.

1. Council sections are flat: no fill, border, shadow, glow or rounded panel, in either mode.
2. Content runs on the same left and right lines as the masthead.
3. Tabs, switches and filters are text only: no track, pill, fill or border. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, one per group. Secondary: plain text. Destructive: plain red text, confirmed in a dialog.
5. Search has no border, fill or focus ring.
6. No title block for the council section: a small section heading over a hairline is enough.
7. Bootstrap Icons only. No emoji, logos or illustrations in the council section.
8. Plus Jakarta Sans for interface text, Newsreader only for article headlines, JetBrains Mono for every number, date, count and ticker.
9. Sentence case. No em dashes. Describe, never advise.
10. Dark mode first; light mode must work.
11. Lists: 11px grey caps header, hairlines between rows, numbers right-aligned. Hover changes text colour only.
12. Status is text with an optional icon, never a filled chip and never colour alone.
13. Missing values read N/A. Only overlays have a surface, border, shadow and radius.
14. Each council card has a skeleton in its final layout, a one-line empty state with one action, and an inline error with Retry.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative                 | #ef4444          | #dc2626          |

## 9. Open questions for me

Each carries the default that will be used.

1. Where does the council section go? Default: a band under the Article of the Month, above Latest Stories, collapsible.
2. Show the app navigation bar for council members on this route? Default: no; add a "Team Hub" text link in the masthead for council members and hide "Login" when signed in.
3. Which council tickers drive "Echo on our names"? Default: held positions plus pitches in the pipeline, newest article first.
4. Required reading without an article link in assignments? Default: show Reading assignments as text with due date and status; an article link needs a database change, written up for the owner.
5. Council reading list? Default: show the viewer's own saved articles; a shared council list needs a database change, left out and listed.
6. Publish council research to Echo? Default: no; show "Council reads", the council's published and exemplar documents, linking to the Research Library.
7. Filter the main grid to council names? Default: yes, a text toggle "Our names" beside the section tabs, kept in the page address.
8. Sample content for master admin and demo accounts? Default: yes, labelled "Sample content", never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Ezana Echo. Route: /ezana-echo. Version: organizational (a council-only section on the shared page). The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design the council version of this page: one full-page desktop mock at 1440px wide in dark mode, output as an actual image. Keep the existing front page and all of its content (masthead, Article of the Month, Latest Stories controls, feature block, row of three, Most read, More stories with the Chart of the Week, the Evening Brief, footer) and add the council section that only council members see. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Include 4 to 8 council features as flat component cards, specifically tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors) and to Ezana's mission of institutional-grade tools for student-managed funds, built only on data in section 4: for example Echo on our names (articles tagged with the council's held and pipeline tickers), required reading (Reading assignments with due dates and status for my team or cohort), pitch prep reading for my open pitches, my saved articles, council reads (published and exemplar Research Library documents), sector coverage matched to Echo sections, and an "Our names" filter on the grid. Use mock data from the same sample council as the other org pages, with invented names only: Sample council, fund value $240,050.00, +46.73% since inception against SPY +10.08%, 12 positions (JPM, SCHW, BAC, LLY, UNH, MRK, NVDA, MSFT, AAPL, CAT, GE, HON) in four sector teams (Financials, Healthcare, Technology, Industrials), pipeline pitches on AVGO, COST, ISRG and ORCL, analysts Amara Tesfaye, Mikael Bekele, Elena Rossi and Jonas Weber, portfolio managers Selam Haile and Chidi Okoye, and research titles such as "JPM: net interest income after the rate cuts" and "LLY valuation refresh". Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
