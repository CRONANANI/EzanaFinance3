# Community (organizational): what exists today, for a new page

Page: Community. Version: organizational. Brief from the owner: "a custom community page for the organizational version of the web application... it should be a page button beside Learning Center in the top navigation bar menu."

Written from the code at commit a2de444 on main (16 November 2026). The page is new: this file describes what a council member gets today, the council data that could feed the page, and what does not exist. Nothing was run (no browser, no database); the database description comes from the repository's history, and production may differ.

## 1. Summary

The council Community page is a private social space for one university investment council: members discuss ideas, share pitches and research for feedback, see who has been recognised, see what is coming up, and optionally look across to other councils on Ezana.

| Who                                                   | What they use it for                                                      | Decision it supports                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| Analysts (junior, regular, senior, quant)             | Ask questions, share drafts for feedback, react, see recognition          | Is my idea ready to pitch                 |
| Portfolio managers                                    | Post team updates, answer analysts, surface their team's work             | Which ideas deserve committee time        |
| Executives                                            | Announce, pin, remove posts that break council rules, keep events in view | What the council needs to know this week  |
| Faculty advisor (an executive titled Faculty Advisor) | Read along, encourage good work, step in on conduct                       | Is the council learning and behaving well |

- How they get to it: a new "Community" item in the top navigation bar, placed directly before Learning Center (the slot retail members already have), and the same item in the phone menu.
- What they do next: open a pitch, a research note, a position's discussion, the Org Chart, Recognition, Meetings, Competitions or Council Rankings.
- Master admin and demo accounts see a full sample council, labelled "Sample content".

## 2. What is on the page today

There is no council Community page. This is what a council member meets today.

**Top navigation bar.** Council members see Team Hub, Research, Trading, Sonar, Watchlist and Learning Center. The Community item is hidden from them on purpose. The phone menu also drops its Community group (Community feed, Messages) and shows a Team Hub group in its place.

**Typing the Community address.** Nothing stops a council member from opening the retail Community page by its address. It is the public Ezana community, shared by every retail member, with nothing council-specific: search, the retail Messages inbox and New post; a KPI strip (members, active this month, discussions, the viewer's retail leaderboard rank); a feed with tabs Following, Trending, Latest and Saved, topic filters, likes, saves, replies, report and block; and a right column of Community insights, Active discussions, a leaderboard by personal portfolio return and People to follow.

A student's post there is public to all of Ezana. Admin and demo accounts see retail sample posts, not the sample council.

**Where council conversation lives today, scattered across other pages:**

| Place                          | What exists                                                                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trading Desk, each position    | Discussion: comments, one level of replies, mentions with a member picker, reactions                                                                                       |
| Pitch Pipeline, each pitch     | Discussion tab, committee votes, stage history                                                                                                                             |
| Research Library, each note    | Comments, views, versions, visibility council, team or private                                                                                                             |
| Recognition                    | Awards and badges with title, reason, period, giver                                                                                                                        |
| Meetings                       | Scheduled, live and closed meetings with agenda and minutes                                                                                                                |
| Command Center                 | "This week in the fund": new pitches, votes, positions opened, notes, awards, top movers                                                                                   |
| Send to team                   | A direct message to one member with an optional attachment, from research cards, the Watchlist and the Org Chart. It notifies the recipient; no page lists these messages. |
| Competitions, Council Rankings | The only cross-council surfaces: competitions with scoreboards, and a ranking of all councils with a page each                                                             |

**Built and never shown.** A position thread, a reaction bar, a weekly digest and a member profile dialog exist with no page using them. Stores for council posts and council events exist with nothing reading or writing them (section 4).

**States and smaller screens.** None yet. The retail page stacks its right column below 1280px and floats New post on phones.

## 3. What the user can do

- Today, on other pages: comment, reply, mention and react on a position's discussion; discuss and vote on a pitch; comment on a research note; give awards (managers); schedule meetings; send one member a direct message; post in public on the retail Community by address.
- In the code with no button anywhere: read one's own mentions and mark them seen; read the council inbox, sent and unread messages; read the weekly digest as a list; post to the council posts store; read and write council events (managers).
- On the new page, all of the above should be reachable or summarised, plus posting inside the council.

## 4. Data we have

Council data that exists today and can feed this page. Everything is private to one council unless marked cross-council.

| Field                                                                                         | What it means                                                                                                            | Where it comes from                                                  | Freshness                       | Missing when                                           |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------ |
| Member name, role, title, sector team, rank                                                   | Who is in the council                                                                                                    | Council roster and org chart                                         | Live                            | Name reads "Member" if blank                           |
| Council post: author, text, type (discussion, announcement, update, question), team tag, time | A post inside the council                                                                                                | Council posts store; any member adds, all read                       | Live                            | Always empty: nothing writes here yet                  |
| Reactions                                                                                     | Emoji counts per post, note, thread comment or pitch, and the viewer's own                                               | Council reactions                                                    | Live                            | Zero                                                   |
| Mentions                                                                                      | Who mentioned whom, on what, seen or not                                                                                 | Written today only by position discussions                           | Live                            | No mentions from posts until posting exists            |
| Position discussion                                                                           | Ticker, comment, replies, author, role, time                                                                             | Trading Desk                                                         | Live                            | Undiscussed positions                                  |
| Research note and its comments                                                                | Title, ticker, sector, author, published or draft, visibility, views, comments with author and time                      | Research Library                                                     | Live                            | Private and team notes                                 |
| Pitch                                                                                         | Ticker, company, analyst, stage, created, votes, discussion messages, outcome and excess return after 30 days            | Pitch Pipeline, priced each weekday against a broad market benchmark | Weekdays for outcomes           | Blind votes are hidden while a vote is open            |
| Award or badge                                                                                | Recipient, title, type, reason, period, giver, gold flag, auto flag, time                                                | Recognition                                                          | Live                            | None this term                                         |
| Ezana Rating and tier                                                                         | Rating from scored pitches                                                                                               | Recognition                                                          | On recompute                    | Provisional under 10 pitches                           |
| Meeting                                                                                       | Title, status (scheduled, live, closed), time, team, agenda, minutes                                                     | Meetings                                                             | Live                            | None scheduled                                         |
| Council event                                                                                 | Title, description, type (meeting, presentation, deadline, review, other), date, team, creator, deliverables with status | Council events store; managers write, all read                       | Live                            | Nothing writes here yet                                |
| Task and assignment due dates                                                                 | What is due and when                                                                                                     | Team calendar from tasks and assignments                             | Live                            | Nothing due in 60 days                                 |
| Weekly digest                                                                                 | New pitches, votes, positions opened, notes, awards, top movers by excess return, last 7 days                            | Computed                                                             | On load                         | Quiet week                                             |
| Direct messages                                                                               | Sender, recipient, subject, text, attachment, read or unread                                                             | Send to team                                                         | Live                            | Junior analysts cannot send                            |
| Fund headline                                                                                 | Fund value, return, positions                                                                                            | Council position book                                                | Prices each weekday             | No positions                                           |
| Cross-council: council ranking                                                                | Every council's name, overall rating, tier, fund and competition parts                                                   | Council Rankings                                                     | When councils report or compete | A council that never reported reads 1000               |
| Cross-council: competitions                                                                   | Name, status, entrants by university, scoreboard, results                                                                | Competitions                                                         | Live                            | No open competition                                    |
| Permissions                                                                                   | Grants such as create posts, create events, send to team, manage members                                                 | Council permission tiers                                             | Live                            | "Create posts" is granted to analysts only (section 7) |

## 5. Data we do not have

Do not design around these.

- Replies to council posts. The posts store has no reply link; only position discussions, pitch discussions and note comments have replies.
- Post titles, tickers, attachments, images, polls or conviction on council posts. A council post is text, a type and an optional team tag.
- Editing, deleting, pinning, reporting or hiding a council post. No rule allows any of these, so no moderation exists yet.
- Team-only privacy for posts. The team tag is a label; every council member can read every post.
- Saves, follows, topics, hashtags, trending topics or sentiment inside a council.
- Any way to post, comment, message or react across councils. Cross-council data is read-only rankings and competitions.
- RSVPs, attendance, locations or calendar export for events. Message threads, group chats or channels.
- Member profile pages, photos, follower counts, online status, view counts or read receipts.
- Notifications for posts, replies or mentions from posts. Only direct messages notify today.
- Sample content for this page. None exists yet.

## 6. Must keep working

- The retail Community page, its address, tabs, topics, shared-post links, messages and profile pages, unchanged for retail members.
- The top navigation for retail members: Community stays before Learning Center. Council members gain the same item in the same place; Team Hub stays leftmost for them.
- Council privacy: a council member reads and writes only their own council's posts, reactions, mentions, events and messages. Every write is checked on the server.
- Position and pitch discussions, note comments, Recognition, Meetings, Send to team, mentions and the Command Center digest stay where they are. Community links to them; it does not replace them.
- Sending a direct message still needs the "send to team" permission.
- Council Rankings and Competitions keep their own pages and addresses.
- Sample content only for master admin and demo accounts, labelled, never saved or mixed with real rows.
- Dialogs close on Esc. Each section loads and fails on its own.

## 7. Problems with the current page

**Design problems**

1. No Community item for council members, yet the address opens the public retail community, where a student can post in public by accident.
2. Council conversation is split across five pages; nowhere shows what the council is talking about this week.
3. No way to post an announcement, question or discussion not tied to one ticker, pitch or note.
4. Recognition, meetings and the weekly digest are hidden one click deep in Team Hub.
5. Direct messages can be sent but never read back.
6. Councils connect only through a rankings table and competitions.

**Bugs and gaps found in the code**

1. The council posts store and the council events store exist with no route and no screen. Whether they exist in production is not verified.
2. Council posts cannot be deleted or edited by anyone, not even the author, so posting cannot launch responsibly without a moderation rule.
3. The permission tiers grant "create posts" to analysts only, not to portfolio managers or executives, though no code checks it today.
4. Mentions are stored and never shown; the API to read them is unused.
5. The position thread, reaction bar, activity digest and member profile components are orphaned.

## 8. Design rules the mock must follow

A top navigation page like Learning Center: no Team Hub sidebar. It must match the rebuilt org pages and the retail Community: a KPI strip first with actions on its right, flat sections, text tabs, a "Sample content" label with its "Show council data" switch.

1. Sections, rows and tiles are flat: no fill, border, shadow, glow or rounded panel, in either mode.
2. Content runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408). Text inside sections sits on those two lines.
3. Tabs, filters and period selectors are text only: no track, pill, fill or border. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, 30 to 36px tall, one per group (New post). Secondary: plain text.
5. Search is borderless: an icon and grey placeholder.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only. No emoji in the interface chrome, no logos, no illustrations, no avatars with photos (initials only). Draw a reaction as a Bootstrap icon with a mono count.
8. Plus Jakarta Sans for interface text. JetBrains Mono for every number, date, time, count, rating and ticker.
9. Sentence case. No em dashes. Describe, never advise. Never say "real-time".
10. Dark mode first; light mode must work.
11. Nothing drawn touches text. A selected row is emerald text only. Vertical rules keep 24px from text, horizontal rules 12px.
12. Side-by-side sections 64px apart; stacked sections 20px apart. A side column is split off by one full-height hairline.
13. Role, team, post type and award type are text with an optional icon, never a filled chip. Gold only as text or icon colour for a gold award.
14. Missing values read N/A. Changes are signed. No chart without data from section 4.
15. Draw the real navigation bar with Community selected between Watchlist and Learning Center; do not redesign it. Only overlays (dialogs, menus, tooltips) have a surface, border, shadow and radius.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Secondary text           | #e2e8f0          | #1e293b          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative                 | #ef4444          | #dc2626          |
| Warning                  | #fbbf24          | #d97706          |
| Gold (awards)            | #d4a853          | #b8922f          |

## 9. Open questions for me

Each carries the default that will be used.

1. Route. Default: the same Community address, council version for council members (standing "same route" decision). The navigation already switches the item on membership, so no separate route is better. Retail sub-pages (messages, profiles) stay retail.
2. Can council members still reach the public retail community? Default: no, so nothing is posted in public by accident.
3. Council-private versus cross-council. Default: posts, reactions, mentions, events and messages are council-private. Cross-council is read-only: the council's ranking, open competitions, links to other councils' pages. No posting across councils.
4. Who may post? Default: every active member; announcements from executives and portfolio managers only.
5. Moderation. Default: authors delete their own posts; executives (faculty advisor included) remove any post and pin up to three. This needs a database change (sql.md, applied after merge); until then these read "not available yet".
6. Replies, titles and tickers on posts. Default: add them in the same database change; until applied, posts are text with reactions only and the reply field reads "not available yet".
7. Events. Default: one "Coming up" list from meetings, due dates and council events; managers add events from the page.
8. Direct messages. Default: a small council inbox section here, since no page shows them.
9. Mentions. Default: a "Mentions" filter, marked seen on open.
10. Sample content. Default: yes, the shared sample council, labelled, never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Community. Route: /community. Version: organizational. This is a new page: the attached screenshots show the retail Community page and the org navigation as they are today. Everything above this section is the description of what exists today. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Draw the real top navigation bar with a new Community item selected directly before Learning Center, and no Team Hub sidebar. Design the full council-only community: a KPI strip with New post on its right, a council feed of discussions, questions, updates and announcements with reactions, the pitches and research notes shared for feedback, a recognition strip, a "Coming up" list of meetings, deadlines and events, the viewer's mentions and council inbox, and a read-only cross-council section. Include 4 to 8 features tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors), built only on data in section 4: for example a "This week in the council" digest, pitches open for feedback with stage and vote status, newly published research with comment counts, recent awards with reason and giver, announcements pinned by executives, sector team filters, a faculty advisor view, and the council's place in Council Rankings with open competitions. Show the executive view (pin, remove, announce, add event) and say what an analyst sees instead, and draw the New post dialog. Mock data for demos must be the same sample council as the other org pages: "Sample council", fund value $240,050.00, return +46.73%, 12 positions, sector teams Financials, Healthcare, Technology and Industrials, invented members Amara Tesfaye, Mikael Bekele, Selam Haile, Chidi Okoye, Ingrid Lindqvist, Daniel Park, Elena Rossi, Jonas Weber and Tomas Alvarez, faculty advisor Hana Girma, and other councils such as Northshore Investment Council and Westbridge Capital Forum. Use invented sample names only. Label all numbers, names and tickers as sample content. Show the key loading and empty states, including a council with no posts yet. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
