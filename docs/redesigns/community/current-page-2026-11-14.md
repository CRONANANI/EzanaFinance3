# Ezana Community page: how it works today

Page: Community. Version: retail. Brief: open brief (no goals or keep/drop notes were given).
Written from the code at commit ee58357 (main, November 14, 2026). The page was not run while writing this; a screenshot of the live page is supplied separately.

## 1. Summary

The Community page is the social home of the app. Signed-in members read posts from other investors, post their own takes, reply in discussions, follow people and topics, and glance at what the community is talking about and who is leading the performance leaderboard.

- Who uses it: retail investors. Verified partners (creators) post here too and carry a verified badge.
- How they get to it: "Community" in the top navigation bar, the mobile tab bar, links from profile pages, the Dashboard news area, the Learning Center, and the Getting Started checklist (stage 4, "Join the community").
- What they do next: open a member's profile, open Messages, open the full Leaderboard, open Company Research for a ticker, or stay and discuss.
- Master admin and demo accounts see sample activity mixed in, marked with a "Sample data" tag. Regular members never see it.

## 2. What is on the page today

Desktop, top to bottom. The page is three columns: a left navigation column (240px), a centre column, and a right rail (400px) split off by a vertical hairline.

### Top row (tools)

| Element         | What it does                                                                                                                                                                                                                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search field    | Placeholder "Search for people, posts or discussions". Shortcut Cmd K or Ctrl K. After two characters it opens a results menu with up to five People and five Posts. Arrow keys move, Enter opens, Esc closes. A person opens their profile. A post opens its discussion in the feed. States: "Searching", "No matches for (term)". |
| Sample data tag | Only for admin and demo accounts.                                                                                                                                                                                                                                                                                                   |
| Messages        | Link to the Messages page. Shows a dot when there are unread messages.                                                                                                                                                                                                                                                              |
| New post        | The primary button. Opens the New post dialog.                                                                                                                                                                                                                                                                                      |

### Left column (navigation)

| Group        | Items                                                                         | Behaviour                                                                                                                                        |
| ------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Main         | Feed, Trending, Active discussions, Community insights                        | Feed and Trending switch the feed. The other two scroll to that card in the right rail.                                                          |
| My community | My profile, Friends (count), Following (count)                                | My profile opens the member's profile (hidden if they have no username). Friends opens Messages. Following switches the feed to Following.       |
| Topics       | A plus button, All topics, then up to six topics, then Show more or Show less | Clicking a topic filters the feed. Followed topics are listed first with a small dot. The plus button opens a menu to follow or unfollow topics. |

### Centre column

**Stat strip (four tiles):** Total members, Active this month, Discussions, Your rank. Your rank shows a number or "Unranked", with an info tooltip explaining it is based on portfolio return for the leaderboard period and hidden if the member opted out. Loading: four skeleton tiles. Error: "Couldn't load this section" with Retry.

**Community feed card:**

| Element           | What it does                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tabs              | Following, Trending, Latest. Default is Following. A member who follows nobody lands on Trending with a hint: "Follow investors to build your feed. See people to follow".     |
| Topic dropdown    | Same filter as the left column topics.                                                                                                                                         |
| Shared post       | When the page is opened from a shared link, that post shows at the top with its discussion open and a close button. If it no longer exists: "That discussion isn't available". |
| Post list         | 20 posts at a time. More load automatically on scroll, with a "Load more" button as a fallback.                                                                                |
| Empty state       | "No posts yet", "No posts from people you follow yet" or "No posts in (topic) yet", with a New post button.                                                                    |
| Loading and error | Three skeleton posts. "Couldn't load this section" with Retry.                                                                                                                 |

**Each post shows:** author avatar and name (links to profile), verified badge for partners, relative time, a save (bookmark) button, a three-dot menu, the topic label (click to filter), the title (click to open the discussion), a text excerpt of up to about 240 characters, one ticker chip (links to Company Research), an optional thumbnail image, then like count, comment count, share count, and "View discussion".

- Three-dot menu on your own post: Copy link, Delete (confirmed with a browser prompt).
- Three-dot menu on someone else's post: Report (with a reason), Block user (confirmed in a dialog). Blocking removes that person's posts from the list.
- Like and save update instantly and roll back with a short message if they fail. "Link copied" shows as a short inline message.

**Discussion (inline under a post):** replies oldest first (up to 50), each with avatar, name and time. A reply field (500 characters) and a Reply button. Empty: "No replies yet. Start the discussion." Error with Retry. There is no separate post page.

### Right rail

| Card               | What it shows                                                                                                                                                                                                                                                                                                  | Controls                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Community insights | Three views. Most discussed: up to four tickers with company name, post count this week and the day's price change. Trending topics: up to four topics with post count and change versus the prior week, or "New". Sentiment: a bullish and bearish split bar, the hottest ticker, and posts in the last hour. | View tabs. A ticker row opens Company Research. A topic row filters the feed.      |
| Active discussions | The top three discussions, ranked 1 to 3, with reply count and a badge: Hot, Rising or Popular.                                                                                                                                                                                                                | A row opens that discussion in the feed. "View all" switches the feed to Trending. |
| Leaderboard        | The top three members by portfolio return for the year, with avatar, name and signed return. The member's own row is pinned below if they rank lower. If unranked: "You are not on the leaderboard" with a link to privacy settings.                                                                           | A row opens that member's profile. "View all" opens the full Leaderboard page.     |
| People to follow   | Two suggested members with avatar, name, verified badge, type (investor or partner type) and follower count. Hidden when there is nobody to suggest.                                                                                                                                                           | Follow or Following button per person.                                             |

Each rail card has its own skeleton, empty line and error with Retry.

### New post dialog

Title (3 to 160 characters, required), body text, and a topic (required). Optional attachments: Image (upload), Poll (question and options), Ticker (up to three symbols with a period of 1D, 1W, 1M, 3M or 1Y). A "Your conviction" slider from 0 to 100 percent. Partners can also choose a post format (Analyst take, Trade idea, Market brief) and add a position or sponsorship disclosure; a standard disclaimer is then shown. A Quote tool exists but is disabled on this page. First-time posters must accept the community guidelines in a dialog before posting. Button: "Post take". After posting, the feed switches to Latest.

### Tablet and phone

- Under 1280px: the right rail moves under the feed as two columns, and its vertical rule becomes a horizontal one.
- Under 1024px: the left column is hidden. Its destinations become a horizontally scrolling row of chips above the stat strip. Topics are reached only through the feed's dropdown.
- Under 768px: search goes full width, the New post button becomes a floating round button above the mobile tab bar, the stat strip becomes two by two, rail cards stack in one column, and post thumbnails move above the text at full width.

## 3. What the user can do

- Search people and posts (Cmd K or Ctrl K)
- Open Messages
- Write a post with title, topic, text, image, poll, ticker and conviction
- Switch the feed: Following, Trending, Latest
- Filter the feed by topic (left column, feed dropdown, a post's topic label, or a trending topic row)
- Follow or unfollow a topic
- Like, save, share (system share sheet or copy link) a post
- Open a discussion and reply
- Delete their own post
- Report a post, block a member
- Follow a suggested member
- Open a member profile, a ticker's Company Research page, the full Leaderboard
- Open a post directly from a shared link
- Easy to miss: Friends opens Messages rather than a friends list; "View all" on Active discussions only switches the feed to Trending.
- Exists in the code but has no button on this page: a list of saved posts (saving works, viewing saved does not); quoting another post; a legendary investors index; a "my network" view.

## 4. Data we have

| Field                          | What it means                                                          | Public source                     | Freshness                        | Missing for                                      |
| ------------------------------ | ---------------------------------------------------------------------- | --------------------------------- | -------------------------------- | ------------------------------------------------ |
| Total members                  | Count of members                                                       | Ezana community                   | About 1 minute                   | None                                             |
| Active this month              | Members active this month                                              | Ezana community                   | About 1 minute                   | None                                             |
| Discussions                    | Count of discussions                                                   | Ezana community                   | About 1 minute                   | None                                             |
| Your rank                      | Member's leaderboard rank for the year                                 | Ezana paper and linked portfolios | About 1 minute                   | Unranked or opted-out members                    |
| Post author                    | Name, avatar, username, partner flag                                   | Member profile                    | On load                          | Members with no username or avatar               |
| Post title, excerpt, time      | Post content                                                           | Member posts                      | On load and on return to the tab | None                                             |
| Post topic                     | One topic per post                                                     | Member posts                      | On load                          | Older posts without a topic                      |
| Post ticker                    | One mentioned ticker                                                   | Member posts                      | On load                          | Posts with no ticker                             |
| Post image                     | One optional image                                                     | Member upload                     | On load                          | Most posts                                       |
| Likes, comments, shares        | Counts per post                                                        | Ezana community                   | On load, likes update instantly  | None                                             |
| Liked by me, saved by me       | Member's own state                                                     | Ezana community                   | Instant                          | None                                             |
| Replies                        | Reply text, author, time (up to 50)                                    | Member posts                      | When a discussion is opened      | None                                             |
| Topics                         | List of topics and which ones the member follows                       | Ezana community                   | On load                          | None                                             |
| Following count, friends count | Member's own counts                                                    | Ezana community                   | On load and on return to the tab | None                                             |
| Unread messages                | Yes or no                                                              | Ezana messages                    | On load and on return to the tab | A count is not available, only yes or no         |
| Most discussed tickers         | Ticker, company name, posts in the last 7 days, the day's price change | Member posts plus market quotes   | About 1 minute                   | Name and change can be missing when quotes fail  |
| Trending topics                | Topic, posts in the last 7 days, change versus prior 7 days            | Member posts                      | About 1 minute                   | Change is "New" when there was no prior activity |
| Sentiment                      | Net bullish or bearish reading, hottest ticker, posts in the last hour | Member posts                      | Latest periodic snapshot         | Can be empty                                     |
| Active discussions             | Top three by activity, reply count, Hot, Rising or Popular             | Member posts                      | On load                          | None                                             |
| Leaderboard top three          | Rank, name, avatar, return for the year                                | Ezana portfolios                  | On load                          | Members who opted out                            |
| People to follow               | Two suggestions with type and follower count                           | Ezana community                   | On load                          | Can be empty                                     |
| Search results                 | Up to five people and five posts                                       | Ezana community                   | Live as typed                    | None                                             |

Data that is stored when someone posts but that this page does not show back today: the poll, the ticker chart embed and its period, the conviction percentage, the partner post format and the disclosure. These are real and available for a redesign, but showing them needs build work.

Data that exists elsewhere in the product for older versions of this page and is not on it today: a community pulse reading, bull versus bear debates, trending narratives, a conviction map, community events, creator open calls, featured creators, copy-trading requests and legendary investor takes. Treat these as "ask first": each would need checking before it is designed in.

## 5. Data we do not have

Do not design around these.

- Real-time or streaming updates. The page refreshes when the member returns to the tab. No live counters, typing indicators or "new posts" tickers.
- Online or presence status for members.
- A count of unread messages (only yes or no).
- Reputation scores, karma, accuracy or win-rate scores for members on this page.
- Per-post view counts or reach.
- Price charts or sparklines for tickers on this page. Only the day's percent change exists, and only in Most discussed.
- Analyst ratings, price targets or any score for a ticker.
- Sentiment history over time. Only the latest reading exists, so no sentiment chart.
- Sentiment per ticker or per topic.
- Notifications or an activity inbox on this page.
- Groups, clubs, private rooms or channels.
- Nested replies. A discussion is one flat list.
- Reactions other than a like.
- Leaderboard periods other than the year on this page, and leaderboard history.
- Reasons for a suggestion in People to follow (no "followed by" or "similar to you").
- Post drafts or scheduled posts.

## 6. Must keep working

- The feed tab, the topic filter and a shared post all live in the page address, so links and the back button restore them.
- Shared post links open that post with its discussion.
- Default feed logic: Following, or Trending with the hint when the member follows nobody.
- Every section loads and fails on its own. One failed card never blanks the page.
- New post requires a title and a topic, and first-time posters accept the community guidelines first.
- Report and Block on every post that is not the member's own. Delete on the member's own posts.
- Sample data for admin and demo accounts stays marked, and likes, follows and replies on sample content are never saved.
- Links out: Messages, member profiles, Company Research for a ticker, the full Leaderboard, privacy settings from the unranked note.
- The Getting Started checklist sends members here for three tasks: view the community feed, explore a legendary investor profile, and check the leaderboard. The feed and the leaderboard must stay findable on the page.
- Keyboard use: search shortcut, arrow keys on tabs, Esc to close menus and the dialog.
- Partner posts keep their verified badge. Partner-only post formats stay partner-only.
- The floating New post button on phones, clear of the mobile tab bar.

## 7. Problems with the current page

### Design problems

- The left column repeats the page. Feed and Trending duplicate the feed tabs, and two items only scroll to cards that are already visible. It spends 240px on navigation the page does not need.
- Topics can be changed in four places.
- The content does not run from the logo to the logout icon as one canvas. The three-column shell reads like a consumer social app, not a research terminal.
- The stat strip gives community vanity numbers the best position on the page. Only "Your rank" is personal.
- People to follow uses outlined buttons, and the mobile chip row uses filled pills. Both break the branding rules.
- Card titles carry a decorative icon, and titles and buttons use title case ("New Post", "View All") where the guide asks for sentence case.
- Posts are thin. A poll, a ticker chart, a conviction level and a partner post format can all be added when writing a post, but the feed shows none of them.
- Saving a post leads nowhere, because there is no saved list.
- Friends opens Messages, which is not what the label says.
- Only two people are suggested and only three discussions are listed, so the rail feels sparse while the feed is long.
- The composer has its own older look: pill tools, bordered fields and a different button style from the rest of the page.

### Bugs and gaps

- Deleting a post confirms with a browser prompt, and a failed delete shows a browser alert. The guide asks for a dialog.
- The search placeholder and several loading labels end in an ellipsis character, and the search empty state uses curly quotes; check against the copy rules.
- The Getting Started tasks for this page point at markers that could not be found in the current page's code, and there is no legendary investor card on the page at all. It is unclear whether those three tasks can still be completed here.
- The share count is displayed, but sharing only copies a link or opens the system share sheet. It is unclear whether the count ever increases.
- A missing change value reads "n/a" rather than "N/A".

## 8. Design rules the mock must follow

The rules outside tools get wrong most often come first.

1. Cards are flat. No fill, border, outline, shadow, glow or rounded panel, in dark or light mode. A card is a title and whitespace. Tiles inside a card are flat too.
2. Content runs from the left edge of the Ezana logo to the right edge of the logout icon. At 1440px that is x = 32 to x = 1408. The text itself sits on those lines, with no side padding at the outer edges and no second inner width.
3. Tabs, toggles, view switches and time selectors are text only. No track, pill, fill, border or divider. Selected is emerald text, the rest grey.
4. No outlined buttons. A primary button is a solid emerald fill, white text, 8px radius, no border, 30 to 36px tall, one per group. A secondary button is plain text. A destructive action is plain red text, confirmed in a dialog.
5. Search has no border, fill, outline or focus ring. A search icon on the left and grey placeholder text.
6. No page title block, eyebrow or intro sentence. Start with content.
7. Bootstrap Icons only. No emoji, no company logos, no illustrations. A ticker is text.
8. Two typefaces: Plus Jakarta Sans for interface text, JetBrains Mono for every number, ticker, date in a table and time label.
9. Sentence case for titles and buttons.
10. No em dashes anywhere.
11. Describe, never advise. No "should", "recommend", "good trade". Never say "real-time".
12. Dark mode first. Light mode must work.
13. Nothing drawn touches text. A selected list row is emerald text only, with no accent bar and no wash. A vertical rule keeps 24px from text, a horizontal rule 12px.
14. Side-by-side sections are 64px apart. Stacked sections are 20px apart with 20px above and below. A side column is split off by one full-height vertical hairline with 24px of clear space (grey on this page).
15. A KPI strip is about 48px tall and only as wide as its content: 28px icon tile, 12px grey label, 18px mono value, vertical hairlines between cells. Page actions share its row on the right.
16. Hairlines (1px, primary text at about 7 to 10 percent) divide content and never enclose it.
17. Draw the real navigation bar and do not redesign it: 64px tall, the emerald Walia ibex logo with bell and checklist on the left, Dashboard, Research, Trading, Sonar (filled emerald pill), Watchlist, Community, Learning Center in the centre, and profile, settings and red logout on the right, with one hairline below.
18. Values are signed (+9.33%, -0.92%). Missing values read N/A. Colour is never the only signal.
19. No chart, sparkline or statistic without real data behind it. All names, tickers and numbers in the mock are labelled sample content.
20. Only overlays (dialogs, menus, tooltips, toasts) have a solid surface, border, shadow and radius.

Colours:

| Name            | Dark    | Light   |
| --------------- | ------- | ------- |
| Page ground     | #0a0e13 | #ffffff |
| Primary text    | #f0f6fc | #0f172a |
| Secondary text  | #e2e8f0 | #1e293b |
| Muted text      | #8b949e | #64748b |
| Faint text      | #6b7280 | #94a3b8 |
| Emerald         | #10b981 | #059669 |
| Emerald as text | #34d399 | #047857 |
| Positive        | #10b981 | #059669 |
| Negative        | #ef4444 | #dc2626 |
| Warning         | #fbbf24 | #d97706 |
| Gold (partner)  | #d4a853 | #b8922f |

## 9. Open questions for me

This run is automated, so each question carries the default that will be used unless you say otherwise.

1. Should the left navigation column stay? Default: the designer may remove it if every destination stays reachable.
2. Should the stat strip stay at the top? Default: it may shrink or move.
3. Should saved posts get a view? Default: yes, as a feed filter, since saving already works.
4. Should polls, ticker embeds, conviction and partner post formats show in the feed? Default: yes where the data is already stored.
5. May older community data (pulse, debates, narratives, events, creator calls) come back? Default: no, not in this pass.
6. Is the legendary investor checklist task still wanted on this page? Default: leave the checklist alone and flag it.

## 10. Prompt to paste into ChatGPT

```
Read the attached file "ezana-community-current-page.md" in full, and look at the attached screenshot of the current Community page.

Redesign the Ezana Community page (retail version) following your standing Ezana page redesign instructions in this chat.

Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image.

Rules for this page:
- Follow section 8 of the file exactly. It restates the Ezana branding rules.
- Use only data listed in section 4. Draw nothing from section 5.
- Keep everything in section 6 working, and solve the problems in section 7.
- Use the defaults in section 9 for open questions.
- Label all numbers, names and tickers as sample content.
- Show the key loading and empty states.

Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
```
