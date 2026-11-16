# ChatGPT notes: org Community wireframe

ChatGPT ("Worked for 2m 34s") returned one image (1086 x 1448) with NO chat text. It did not
write the requested list of sections, decisions to reverse, or things drawn beyond section 4.
Everything below is my own reading of the image (Claude, not ChatGPT).

## Layout (dark mode)

Navigation bar: ibex logo with an "Ezana" wordmark (stand-in, do not copy), bell 9+, checklist
6/19, Team Hub, Research, Trading, Sonar (filled emerald pill), Watchlist, Community (selected,
emerald text with a people icon), Learning Center, profile, settings, red logout. No Team Hub
sidebar.

1. Action row: borderless search "Search council posts, pitches, notes or members...", then
   "Sample content" label (drawn as a small grey chip), "Show council data" switch, then text
   actions Messages, Add event, Announce, and one filled emerald "New post" button.
2. KPI strip (mono values): Members 9, Active this week 7, Open for feedback 2, Upcoming 3,
   Unread mentions 2, Inbox unread 3, then a vertical rule and Fund value $240,050.00,
   Return +46.73% (emerald), Positions 12.
3. Info line: "Executive view. Analysts can post discussions, questions and updates. Executives
   and faculty advisor can announce, pin, remove posts and add events."
4. Left column (about two thirds), right column split by a full-height hairline.
   - Text tabs: Feed (selected, with an underline bar), Pitches open for feedback, Research
     notes, Mentions, Inbox, Cross-council.
   - Filter row: All council (selected), Financials, Healthcare, Technology, Industrials,
     Announcements, Questions, Updates.
   - Pinned announcement: Daniel Park, Mar 25 10:14, "Executive announcement . All council",
     title "Investment committee agenda, week 13" (drawn with an em dash), body with three
     dated bullet lines, reactions thumbs-up 12 and trophy 3, Pin and Remove text actions on
     the right.
   - "This week in the council" digest strip: 2 new pitches shared, 1 research note published
     (the rest is hidden behind the dialog).
   - Feed rows: Amara Tesfaye "Pitch for feedback . Technology", "NVDA, add to core holdings",
     NVDA | Stage: Cross-desk review | Vo(tes...), likes 2, comments 6, "Open pitch".
     Elena Rossi "Research note . Healthcare", "HCA, earnings and margin outlook", HCA |
     Status: Published | Sector: Healthcare, views 14, comments 8, "Open note".
     Chidi Okoye "Question . Financials", "How are members framing bank NIM risk next
     quarter?", likes 4, a second icon 2, "Replies not available yet".
     Ingrid Lindqvist "Update . Technology", "Technology desk coverage update, week 12",
     "Open note (MSFT)", "Open pitch (NVDA)".
   - Analyst view note: analysts get the same feed, pitches, notes, mentions, inbox,
     recognition and read-only cross-council, without Announce, pin, remove or Add event;
     New post stays.
   - State examples at the bottom: empty "No posts yet in Industrials" with a building icon
     and "Be the first to start a discussion, share a note or post an update"; loading
     "Loading council inbox..." with a spinner and two skeleton bars.
5. Right column, top to bottom:
   - Recognition (View all): Best pitch to Selam Haile by Daniel Park, Mar 24; Collaboration
     to Tomas Alvarez by Amara Tesfaye, Mar 23; Gold research note to Elena Rossi by Hana
     Girma, Mar 22 (gold text and trophy). Each with a reason line.
   - Coming up (Add event): Healthcare stand-up Tue Mar 26 10:00 to 10:30 Healthcare; Pitch
     memo due Wed Mar 27 17:00 All council; Faculty advisor review Thu Mar 28 15:00 to 15:30.
   - Mentions (View all): Mikael Bekele mentioned you, in a position discussion on JPM, 2h
     ago; Selam Haile mentioned the council, in the NVDA pitch discussion, 4h ago; Ingrid
     Lindqvist mentioned you, in a council post on technology coverage, Mar 24. Unread dots.
   - Council inbox (View all): Hana Girma "IC prep and reminders" 10:37 with paperclip;
     Daniel Park "Re: NVDA feedback" 09:12; Jonas Weber "Healthcare meeting notes" Mar 24.
   - Across Ezana: Sample council, Council rankings #4 of 18, Tier: Tier 1; Other councils
     (read only) 1 Northshore Investment Council +52.18%, 2 Westbridge Capital Forum +48.07%;
     Spring stock pitch challenge, Open, pitches due Apr 5 17:00, View competitions.
   - Faculty advisor view note: Hana Girma can read, encourage, announce, pin and remove posts
     and add events; cross-council posting not available.
6. New post dialog (overlay, drawn over the middle of the page): title "New post", close X;
   type tabs Discussion, Question, Update, Announcement (selected); Team: All council
   (selected), Financials, Healthcare, Technology, Industrials; "Share context (optional)"
   select "Attach a pitch"; text area with sample text; checkboxes "Pin this post" and "Post
   as announcement"; note "Analysts cannot create announcements or pin posts."; Cancel (text)
   and Post (filled emerald).

## Things that break the description or the guide (for Claude Design and the build)

- Em dashes in post titles; "Ezana" wordmark beside the logo; an underline bar under the
  selected tab; the "Sample content" label drawn as a filled chip; filled avatar circles.
- Drawn from section 5 (not available): post titles (posts are text, type and team tag
  only), tickers and attached pitch on a post ("Share context, Attach a pitch"), pin and
  remove (need the database change; must read "not available yet" until then), a reply or
  comment count on a council post (second icon "2" on the question).
- Not in section 4 as drawn: "Tier 1" label (the ranking has a tier, wording unverified),
  other councils' percentage returns (ranking has an overall rating, not a return).
- The state examples at the bottom are annotations: build real loading, empty and error
  states per section, not this strip.
