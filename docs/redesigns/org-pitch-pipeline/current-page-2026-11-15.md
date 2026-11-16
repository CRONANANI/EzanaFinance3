# Ezana Pitch Pipeline page (organizational): how it works today

Page: Pitch Pipeline (titled "Stock Pitch Pipeline" on the page). Version: organizational (university student-managed investment funds). Route: /org-team-hub/pitches. A pitch opens as a dialog on the same page; the older per-pitch address redirects into it. The new-pitch form is also a dialog, not a route.
What I want from the redesign: open brief.
Keep or drop: nothing specified.
Written from the code at commit 741e755 (main, November 15, 2026). The page was not run while writing this.

## 1. Summary

The Pitch Pipeline is where a council turns a stock idea into a committee decision. A pitch is one record that moves through fixed stages. Each stage has a checklist ("gates") the server re-checks before a move.

- Who uses it: analysts submit pitches and add research. Portfolio managers (PMs) sign off, review other desks' pitches, log desk meetings and vote. Executives run investment committee (IC) meetings and vote. Faculty advisors have no role in the code; they sign in as one of those three.
- Decision it supports: should the fund buy this, and is the pitch ready for its next step?
- How they get to it: "Pitch Pipeline" in the Team Hub sidebar, the Team Hub home and notifications.
- What they do next: clear a gate, vote, or record the position on the Trading Desk.
- Shell: the page sits inside the shared Team Hub shell, a 200px sidebar of 17 icon-and-text links beside one hairline, already redesigned and live. The redesign covers only the page body.

The lifecycle as the code defines it:

| Stage             | What must be true to leave it                                                                                                                                                                | Who moves it on                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Idea              | Ticker, a thesis of 20+ characters, a desk                                                                                                                                                   | Any PM or executive              |
| Screening         | Six thesis sections (short and full thesis, why now, base valuation, catalysts, risks); senior sign-offs (the desk's minimum, one from the pitching desk); no open challenges                | Senior PM tier or any executive  |
| Deep Dive         | Desk meeting with 3+ attendees; required models uploaded and reviewed; all eleven thesis sections (adds variant perception, falsification condition, bull and bear valuation, position size) | Senior PM tier or any executive  |
| Cross-Desk Review | Thesis is frozen from here. A majority of the other desks' senior PMs approve and none object                                                                                                | Any PM or executive              |
| Pitch Scheduled   | Attached to an IC meeting; a deck is listed                                                                                                                                                  | Vice president or president tier |
| IC Vote           | Quorum met, meeting closed, vote carried                                                                                                                                                     | Any PM or executive              |
| Approved          | A live position in the same ticker exists in the fund's position book                                                                                                                        | Any PM or executive              |
| In Portfolio      | Left only by "Mark exited" with a post-mortem note                                                                                                                                           | PM (own team) or executive       |
| Exited, Rejected  | End states, read only                                                                                                                                                                        | Nobody                           |

Who can do what:

| Action                                     | Who                                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Submit                                     | Any member. Blocked while required onboarding tasks are unfinished, or when the pitch breaches a hard investment policy limit                                 |
| Sign off at Screening                      | Senior analyst tier and above, never the author                                                                                                               |
| Vote                                       | PMs and executives: Buy, Pass or Abstain, with a rationale                                                                                                    |
| Approve                                    | Nobody alone. The vote decides: simple majority (more Buy than Pass) or supermajority (two thirds Buy), set per meeting. Abstentions count toward quorum only |
| Schedule a meeting, attach a pitch, reject | PMs and executives. Only executives open the session and close the vote                                                                                       |
| Override failing gates                     | Vice president or president tier, with a recorded reason. Never at IC Vote                                                                                    |
| Record an outcome                          | The system: return and alpha against the S&P 500, on weekdays, for pitches decided 30+ days ago. Exit is recorded by hand                                     |

Accepting a pitch does not create a position (confirmed; the code that would is a placeholder). A member adds the position on the Trading Desk. The Approved gate then finds a holding with the same ticker and lets the pitch move to In Portfolio. The two are matched by ticker only.

## 2. What is on the page today

Desktop, top to bottom:

1. Title block: "Stock Pitch Pipeline" and an intro sentence. On its right, three buttons: Pitch Archive, Team Hub, Submit New Pitch.
2. Stat strip: Active pitches, In portfolio, Aging over 30 days, Archived.
3. Toolbar: a view switch (Kanban, Tracker, IC Vote); four dropdown filters (sector, analyst, conviction, aging); a stale-price warning; the active and aging counts again.
4. Kanban: seven columns, Idea to Approved, each with a coloured dot, name and count. A card is a link showing ticker, upside to target, company, sector, short thesis, then chips: analyst first name, five conviction dots, days in stage (amber past 30), price and target, catalyst date. A blocked card adds a lock line. Cards cannot be dragged.
5. Archive lane: rejected and exited counts, small cards, "Open archive".
6. Tracker: a table of every active, held and exited pitch: Ticker, Stage, Conviction, Pitch price, Current, P&L, Target, Upside, Review ("Due" 90 days after the last thesis review).
7. IC Vote: for PMs and executives, a form to schedule a meeting (date, open or blind ballot, simple or supermajority, quorum percent). Then the count of eligible voters and agenda cards for pitches at Pitch Scheduled or IC Vote: ticker, company, analyst, status, Buy, Pass and Abstain tallies, a quorum bar, "Cast ballot" or "Open record".

Submit New Pitch dialog, four steps: Identity (ticker with search, company, type, horizon, target price, expected return, current price); Thesis (short thesis, full thesis, why now, catalysts, risks); Attachments (only a note that files come later); Review. Earlier pitches on the ticker are listed and must be acknowledged. A policy check runs on submit.

Pitch dialog (emerald outline, closes on Esc or backdrop):

- Header: ticker, company, desk, type, horizon, stage.
- Tabs: Thesis, Supporting Data, Deliverables, Discussion, Voting, Decision.
- Actions box (PMs and executives): a rationale field with "Reject pitch" or "Mark exited (post-mortem)".
- Gate panel: each gate with pass or fail, a detail such as "2 of 3" and a "Fix" link. One button reads "Advance to (next stage)" or "N gates failing"; "Override" shows for members allowed to.
- Stage panel: sign-offs; desk meeting record and required models; cross-desk decisions; the ballot with quorum, recusals and votes; performance for held pitches (entry, current, benchmark, return, alpha, falsification condition, review clock).
- Tab content. Thesis: read only. Supporting Data: research reports, company profile, quote, ratios, peers. Deliverables: a title and type (model, memo, deck, one-pager, supporting). Discussion: flat messages. Voting: meeting assignment, session controls, a second vote form. Decision: outcome, rationale, hindsight.

States: a seven-column skeleton under the title; "Could not load the pipeline." with no retry; "No pitches yet. Submit the first idea to seed the pipeline." No toasts; several errors are browser alert boxes.

Tablet and phone: the board keeps seven columns and scrolls sideways under 900px; the pitch dialog fills the screen under 1024px.

## 3. What the user can do

- Switch view; filter by sector, analyst, conviction and aging.
- Submit a pitch.
- Open a pitch from a card, row or shared link.
- Advance a pitch, override failing gates with a reason, reject with a rationale, or mark a held pitch exited.
- Sign off (model or qualitative) or request changes; approve or object as another desk's senior PM.
- Log a desk meeting; add a model link; mark a model reviewed; add a deliverable title; post a message.
- Schedule a meeting; attach a pitch; open the session; close the vote; cast a ballot.
- Refresh hindsight; open the Pitch Archive (search, compare, report).

In the code with no button: edit a thesis; record a decision by hand (accept, reject, watchlist, defer); answer the falsification review, which restarts the 90-day clock and can raise a red flag on the Trading Desk; see stage history; change a ballot; reply to a message; raise a challenge. A "withdraw" right is named but not implemented.

## 4. Data we have

| Field                                                                                                             | Source                        | Freshness                         | Missing for                  |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------- | ---------------------------- |
| Ticker, company, sector, type, horizon, target price, expected return                                             | Submitter, company lookup     | At submission                     | Optional fields              |
| Pitch price; current price, upside to target, change since pitch                                                  | Market quote                  | At submission; on load, not live  | Unknown tickers              |
| Short and full thesis, why now, catalysts, risks                                                                  | Submitter                     | At submission                     | Optional parts               |
| Variant perception, falsification condition, bull, base and bear values, position size, conviction, catalyst date | Stored, but no form sets them | N/A                               | Almost every pitch           |
| Analyst, desk, approving PM                                                                                       | Council roster                | On load                           | Unassigned                   |
| Stage, days in stage, aging over 30 days                                                                          | Stage record                  | On load                           | None                         |
| Gates: status, detail, progress, who may advance or override                                                      | Computed by the server        | On open                           | End stages                   |
| Stage history, overrides and reasons                                                                              | Stage record                  | On change                         | Not shown today              |
| Sign-offs, desk meeting, required models, cross-desk decisions                                                    | Members                       | On open                           | Stages not reached           |
| Deliverables (title, type); discussion messages                                                                   | Members                       | On open                           | No file behind a deliverable |
| IC meetings: time, ballot type, threshold, quorum, status                                                         | PMs and executives            | On load                           | Councils with none           |
| Votes (member, choice, rationale, recused), tallies, quorum, eligible voters                                      | Voters, roster                | On open                           | Hidden in a blind ballot     |
| Decision, date, rationale, archive reason                                                                         | Vote or rejection             | On change                         | Undecided                    |
| Hindsight: return, benchmark return, alpha, state                                                                 | Daily prices                  | Weekdays, 30+ days after decision | Recent decisions             |
| Last thesis review, review due; whether the fund holds the ticker                                                 | Stage record, position book   | On load                           | Not held                     |
| Prior pitches on a ticker                                                                                         | Archive                       | While typing                      | New tickers                  |
| Research reports, company profile, ratios, peers                                                                  | Research tool, market data    | On open                           | Thin coverage                |

How pitches feed other pages:

- Fund Analytics funnel: Submitted (all pitches), Approved (accepted by vote), Executed (accepted and the ticker is held).
- Analyst leaderboard: per author, pitch count, average return, average and total alpha from hindsight, ranked by total alpha. Scorecards add hit rate and votes cast.
- Attribution by pitch; holdings nobody pitched.
- Trading Desk: a holding's covering analyst and "thesis on file" come from the latest pitch on its ticker.

## 5. Data we do not have

Do not design around these:

- A link between a pitch and a position: no shares, entry price, actual size or realized profit.
- Attached files. Deliverables are titles; models are links.
- Dragging cards between stages; live prices, price charts or sparklines.
- Rubric scores, grades or a faculty advisor view.
- A per-stage compliance check, pre-read tracking or straw poll.
- Threads, mentions, reactions or challenges in discussion.

## 6. Must keep working

- A pitch opens over the pipeline from an address carrying its id. Older per-pitch links, notifications and emails redirect there. Esc and the backdrop close it.
- Every gate, role and tier rule, the thesis freeze, and no override of a vote.
- Blind ballots stay hidden until the meeting closes.
- The onboarding block, policy check and prior-pitch acknowledgement on submit.
- Stage-change notifications.
- Links to the Pitch Archive and the sidebar's active-pitch count.
- The fields other pages read (section 4).
- The 90-day review clock and hindsight.
- Every council member can read every pitch.

## 7. Problems with the current page

Design problems:

- A title block, intro sentence and outlined buttons.
- Seven columns beside the sidebar leave about 150px a card.
- Nothing answers "what needs me": no list of pitches awaiting my sign-off, review or ballot.
- A card never shows gate progress.
- In a pitch, actions, gates and a stage panel stack above the tabs' content and repeat it.
- The submit form has an empty step.
- Scheduled meetings are never listed.
- Tracker mixes ideas with holdings under "P&L".
- No pointer from Approved to the Trading Desk.
- No sample content for demo and admin accounts.

Bugs:

- A thesis cannot be edited after submission, and six gated fields (base valuation and the Deep Dive additions) have no input. The Screening and Deep Dive thesis gates cannot pass without an override.
- Conviction and catalyst date are never set, so the dots, that filter and the date chip stay empty.
- Blind ballots leak: agenda cards show live tallies and the pitch dialog lists every ballot.
- Two vote forms in one dialog; one says "final" though a ballot can be replaced.
- A missing P&L is coloured as a gain; a missing price reads "stale".
- Two messages name a data vendor. Errors are browser alerts; a failed load has no retry.
- Reject shows for every PM and executive; the server refuses some by tier.
- A deck title passes the deck gate with no file.
- Watchlist and deferred outcomes show nowhere on the page.

## 8. Design rules the mock must follow

The page must match the rebuilt Command Center and Trading Desk: the same KPI strip with page actions on its right, flat sections with 18px titles, text toggles, one-line states, and a "Sample content" label with a "Show council data" switch.

1. Cards are flat: no fill, border, shadow, glow or rounded panel, in dark or light mode. That includes pitch cards and stage columns.
2. Content runs from the Ezana logo's left edge to the logout icon's right edge (x = 32 to 1408 at 1440px). Draw the sidebar as it is, start content 24px after its rule, end on the right line.
3. Tabs, view switches and filters are text only. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, one per group. Secondary: plain text. Destructive: red text, confirmed in a dialog.
5. Search has no border, fill or focus ring. No page title block, eyebrow or intro sentence.
6. Bootstrap Icons only. No emoji, stars or logos.
7. Plus Jakarta Sans for interface text; JetBrains Mono for numbers, tickers, dates and counts.
8. Sentence case. No em dashes. Describe, never advise: Buy and Pass are members' votes. Never say "real-time".
9. Dark mode first; light mode must work.
10. Nothing drawn touches text; hover is a colour change.
11. Side-by-side sections 64px apart, stacked 20px. A side column sits behind one grey hairline.
12. KPI strip: 12px grey label, 18px mono value, hairlines between cells.
13. Tables: 11px caps grey headers, hairlines between rows, numbers right-aligned in mono, no zebra.
14. Stages differ by name and position, not colour. Pass, fail, aging and blocked carry an icon and words.
15. No chart without real data. Money has two decimals; changes are signed; missing values read N/A.
16. Only overlays (dialogs, menus) have a solid surface, border, shadow and radius. No emerald outline.
17. Every section has a skeleton, a one-line empty state with one action, and an inline error with Retry. Do not redesign the navigation bar or the sidebar.

| Name            | Dark    | Light   |
| --------------- | ------- | ------- |
| Page ground     | #0a0e13 | #ffffff |
| Primary text    | #f0f6fc | #0f172a |
| Muted text      | #8b949e | #64748b |
| Emerald         | #10b981 | #059669 |
| Emerald as text | #34d399 | #047857 |
| Negative        | #ef4444 | #dc2626 |
| Warning         | #fbbf24 | #d97706 |

## 9. Open questions for me

Each carries the default that will be used.

1. Keep a seven-column board? Default: no. A stage strip with counts over one list, with an "Awaiting you" list first.
2. One layout for all roles? Default: yes, scoped by role and tier.
3. Let authors edit the thesis before the freeze, including the missing fields? Default: yes.
4. Hide tallies and ballots during a blind vote? Default: yes.
5. One vote form, changeable until the vote closes? Default: yes.
6. Keep the pitch as a dialog? Default: yes.
7. Create a position on approval? Default: no. Link to the Trading Desk instead.
8. Fold the archive into this page? Default: no.
9. Sample content for demo and admin accounts? Default: yes.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Pitch Pipeline. Route: /org-team-hub/pitches (a pitch and the submit form open as dialogs on the same route). Version: organizational (university student-managed investment funds). The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Label all numbers, names and tickers as sample content. Show the key loading and empty states.

Page-specific asks. First, draw the Team Hub sidebar as it is and do not redesign it; the page must look like a sibling of the rebuilt Command Center and Trading Desk. Second, draw the open pitch (gates, thesis, ballot) and the submit form in the same image. Third, include 4 to 8 features tailored to university investment councils, built only on section 4 data, for example: an "Awaiting you" queue by role, gate progress and next owner on every pitch, an IC agenda with quorum and ballot type, aging pitches by desk, thesis reviews due, each analyst's pitch record with hindsight for grading, prior pitches on a ticker, and the step from Approved to the Trading Desk. Show how the page differs for an analyst, a portfolio manager and an executive.

Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
