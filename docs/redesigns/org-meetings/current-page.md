# Ezana Meetings page (organizational): how it works today

Page: Meetings. Version: organizational (university student-managed investment funds). Route: /org-team-hub/meetings (one route, no sub-routes). Brief: open brief.
Written from the code at commit 8ffb5a2 (main, November 15, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

Meetings is the council's session library. A meeting is one dated record: a title, a category (IC, Sector, General, Exec or Education), a time, a location, an ordered agenda, an invited list with replies, and a status of scheduled or completed. A completed meeting can carry a recording link, a summary, a tone score and a list of documents discussed. An IC meeting also carries a Buy, Pass or Abstain vote.

- Who uses it: analysts (reply, read the agenda), portfolio managers and executives (schedule, build the agenda, invite, close, vote). A faculty advisor is an executive by role.
- Decision it supports: what are we meeting about and am I expected; for the chair, is the agenda ready and is there quorum.
- How they get to it: the Team Hub sidebar, the Command Center (calendar rows, the "Next meeting" row), the home cards, and "Since last meeting" on Fund Analytics. Next they go to the Pitch Pipeline or back to the Command Center.
- The page sits inside the shared Team Hub shell, a 200px sidebar of 17 icon-and-text links beside one hairline, already redesigned and live. This redesign covers only the page body to its right.

Important: the product has two unconnected kinds of meeting. This page owns the library meeting above. The Pitch Pipeline owns a separate "IC session" with its own date, ballot type (open or blind), threshold (simple majority or supermajority), quorum percent and status (scheduled, in session, closed). Pitches are attached to IC sessions, never to library meetings, and an IC session never appears here. There, managers schedule sessions and attach pitches, and only executives open a session or close its vote. Blind ballots, thresholds and opening or closing a session do not exist on the Meetings page.

| Action                                                       | Analyst           | Portfolio manager                                          | Executive, faculty advisor |
| ------------------------------------------------------------ | ----------------- | ---------------------------------------------------------- | -------------------------- |
| See every meeting and its detail                             | Yes               | Yes                                                        | Yes                        |
| Reply yes, maybe or no                                       | Own, once invited | Own                                                        | Own                        |
| Schedule a meeting                                           | No                | Only with the "create events" grant (Senior PM by default) | Yes                        |
| Edit agenda, add attendees, mark completed, link a recording | No                | Yes                                                        | Yes                        |
| Record a document discussed                                  | No                | Needs the "upload deliverables" grant                      | Yes                        |
| Vote at an IC meeting                                        | No                | Yes                                                        | Yes                        |

## 2. What is on the page today

Desktop, top to bottom.

**Header.** A caps eyebrow, a large "Meetings" title and the sentence "A recording library and AI analysis for your committee, sector and team sessions." On the right, for managers: a gear icon button and a filled "New meeting" button.

**Left rail, 210px, four bordered cards.** A mode dropdown ("Upcoming" or "Past sessions" with a count; upcoming means not completed). Categories: "All" plus the categories present, each with a coloured dot and a count, filtering the strip. Transcription queue: meetings whose recording is transcribing, analyzing or ready, or "Nothing queued." Meeting sentiment: up to six bars, one per analyzed meeting, with an average tone, or "Not enough analyzed sessions yet to show a tone trend."

**Meeting strip.** A heading with a count, previous and next arrows, and a row of 184px bordered cards: category pill, "Scheduled" or "Completed" pill, title, short date, location. A card loads its detail below; the first is selected on arrival. Latest date first in both modes.

**Detail, upcoming meeting.** Badges (category, Scheduled, and for IC "Quorum 3/5"), title, date and time, location. Managers see "Mark completed".

| Section                   | What it shows                                                                                                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agenda                    | Numbered items: label, type (discussion, pitch, review, vote, update, other), owner as free text, minutes. Managers get up, down and remove icons and an add form; every change saves at once.                       |
| Attendees                 | Initials, name, role, reply. The viewer's own row has yes, maybe, no buttons. Managers add one member at a time from a roster dropdown.                                                                              |
| Pre-read pack             | Only when tied to a pitch: ticker, company, short thesis. Not a link.                                                                                                                                                |
| Investment Committee vote | IC meetings only: a three-colour tally bar, "Buy 2, Pass 1, Abstain 0", three vote buttons (own choice highlighted, changeable), and "Quorum 3/5 present, needs 50%, quorum met" or "quorum not met, voting locked". |

**Detail, completed meeting.** The same header, with a "Recording" button when a link exists, then four sections. AI meeting analysis: a summary or a waiting line ("Not analyzed yet..."), then tone for three tiers (executives, portfolio managers, analysts) as bars from minus 1 to plus 1. Attendees: read only. Deliverables discussed: coloured chips that managers add (type plus label) and remove; types are model, memo, report, deck, sheet, primer, news, earnings call. Recording: only when no link exists; managers paste a link and pick a source. The agenda and the vote are not shown once a meeting is completed.

**New meeting dialog.** Title (required), Category, Scheduled time (optional), Location (free text). Cancel and "Create meeting".

**Recorder popover (gear).** A line saying no recorders are available yet and four rows reading "Not connected".

**States.** Loading: a skeleton of title, rail, strip and detail. Errors: one red line with no Retry ("Failed to load meetings."). No meetings: "No meetings yet" with "New meeting" for schedulers. Empty lists: "No agenda items yet.", "No attendees added yet.", "No upcoming meetings in this category." No toasts; a failed save shows nothing.

**Tablet and phone.** Under 900px the sidebar moves above the page. Under 780px the rail stacks above the rest.

## 3. What the user can do

- Switch Upcoming or Past; filter by category; page the strip; open a meeting
- Reply yes, maybe or no on their own row
- Managers: schedule; add, reorder and remove agenda items; add attendees; mark completed; link a recording; add and remove documents discussed
- IC voters: vote Buy, Pass or Abstain and change the vote; anyone: open the recording in a new tab
- Easy to miss: completing cannot be undone.
- In the code with no button: editing title, time, location, category or quorum percent; tying a meeting or agenda item to a pitch; marking who attended; inviting people while scheduling. Deleting or cancelling is not possible anywhere.

## 4. Data we have

| Field                          | Meaning                                                                                                                                    | Public source            | Freshness                  | Missing for                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | -------------------------- | ---------------------------------- |
| Title, category, status        | Name, one of five kinds, scheduled or completed                                                                                            | Managers                 | On load, after each action | None                               |
| Time, location, team           | When, where (free text), sector team                                                                                                       | Managers                 | On load                    | All optional; no control sets team |
| Agenda                         | Ordered items: label, type, owner, minutes                                                                                                 | Managers                 | On each change             | Often empty                        |
| Attendees                      | Name, role, reply (pending, yes, maybe, no), attended flag                                                                                 | Roster, replies          | Detail open                | Attended is never set here         |
| Quorum                         | Invitees who replied yes (or were marked attended), against the count of executives and portfolio managers; percent needed (50 unless set) | Calculated               | Detail open                | IC meetings only                   |
| IC vote                        | Counts of Buy, Pass, Abstain; the viewer's own vote                                                                                        | Voters                   | After each vote            | IC meetings only                   |
| Linked pitch                   | Ticker, company, short thesis                                                                                                              | Pitch Pipeline           | Detail open                | No page control sets it            |
| Recording                      | Link and source                                                                                                                            | Manager paste            | On load                    | Most meetings                      |
| Analysis status, summary, tone | Four states; a paragraph; scores from minus 1 to plus 1 by tier and per meeting                                                            | Stored values            | On load                    | Nothing in the code writes them    |
| Documents discussed            | Type and label                                                                                                                             | Managers                 | Detail open                | A label, not a file                |
| Minutes                        | Short notes per meeting                                                                                                                    | Stored on older meetings | Not read by the page       | No screen writes or shows them     |

From the Pitch Pipeline, not shown here: IC sessions (date, ballot type, threshold, quorum percent, status), the pitches attached to each (ticker, company, analyst, stage), the number of eligible voters, and each pitch's yes, no and abstain counts.

## 5. Data we do not have

Do not design around these.

- Recording, transcription or automatic summaries. No recorder can be connected, files cannot be uploaded, and nothing produces a transcript, summary or tone score.
- Minutes, action items or decisions captured on this page.
- Real attendance (only replies exist), a live or "in session" state, a timer, start and end times.
- Blind ballots, thresholds or a pass or fail result for this page's vote. It is a running count only.
- A link between a library meeting and an IC session, or between an agenda item and a pitch record.
- Duration, recurrence, invites, video links, reminders (a preference exists; nothing sends it).
- Who scheduled a meeting, an edit history, comments, vote rationale, sample content for demo accounts.

## 6. Must keep working

- Only council members reach the page; others are sent to the home page.
- The role rules in section 1, enforced by the server as well as in the interface.
- Scheduling, the agenda (add, reorder, remove, saved at once), own replies, adding attendees from the roster.
- Mark completed, which removes a meeting from every upcoming list.
- The IC vote: one vote per voter, changeable, executives and portfolio managers only, locked until quorum.
- Recording link (web links only); documents discussed; recorder status for managers only, never credentials.
- Connections that read this data. Sidebar: the badge counts scheduled meetings. Command Center: scheduled meetings dated within 60 days sit on its calendar, count toward "Due this week", and the earliest future one is the "Next meeting" row; all link here. Home cards: the next three or four scheduled meetings. Fund Analytics: "Since last meeting" takes one meeting's date and reports the change in fund value and return, positions added and pitches decided since.
- The Pitch Pipeline keeps its own IC sessions, ballots and stage gates; this redesign must not change them.
- Dialogs close on Esc.

## 7. Problems with the current page

Design problems:

- An eyebrow, title and intro sentence open the page, and everything is boxed: bordered cards and panels, filled pills, outlined buttons, a dropdown where two text tabs would do.
- The page calls itself a recording and analysis library, yet none of that can be filled: two rail cards and the first section of every completed meeting stay empty.
- What a council needs before a meeting (agenda, who is coming, what will be voted) sits below a strip of three or four cards.
- Upcoming is sorted latest first, so the meeting selected on arrival is the furthest away, and it is by status, not date, so a past meeting nobody closed stays upcoming.
- Two kinds of meeting never reference each other. A chair schedules the IC twice.
- An agenda item of type "pitch" is only text. Completing a meeting hides its agenda and vote.

Bugs and gaps:

- Ballot secrecy. On this page every member, analysts included, sees the running Buy, Pass and Abstain counts while voting is open, and the data rules let any member read each ballot with the voter's identity. In the Pitch Pipeline, a blind session hides each voter's choice, rationale and conviction until it closes, but the pitch's running yes, no and abstain counts still show on the IC view and the pitch detail to every member during the blind vote. The new page must not repeat either leak.
- Quorum counts every invitee who replied yes, analysts included, against the number of executives and portfolio managers, so confirming non-voters can unlock the vote. It is a reply, not presence, and the lock is only in the interface: the server accepts a vote without quorum and after completion.
- The vote has no outcome. No majority rule is applied here, and no code was found that applies the pipeline's threshold either.
- "Since last meeting" on Fund Analytics orders by a start time this page never sets, so it can pick an arbitrary meeting, even a future one, and use the day it was created.
- On first load "New meeting" shows to every manager; a portfolio manager without the grant is refused silently, as with documents discussed. No save shows an error, no error has Retry, and missing times read "TBD", not N/A.
- Nothing is in the page address, so other pages cannot link to one meeting.

## 8. Design rules the mock must follow

The new page must match the four rebuilt organizational pages (Command Center, Trading Desk, Fund Analytics, Assignments): a KPI strip first with page actions on its right, flat sections, text tabs, a "Sample content" label with a "Show council data" switch, and the same sample council (teams Financials, Healthcare, Technology, Industrials; members Amara Tesfaye, Mikael Bekele, Selam Haile, Chidi Okoye, Ingrid Lindqvist, Daniel Park, Elena Rossi; meetings "Weekly executive sync", "Council meeting"). The most often broken rules come first.

1. Sections, rows and tiles are flat: no fill, border, shadow or rounded panel, in either mode.
2. Content runs from the sidebar's rule to the logout icon's right edge (x = 1408 at 1440px). No inner width.
3. Tabs, mode, category and reply choices are text only: no track, pill, fill or border. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, one per group. Secondary: plain text. Destructive: plain red text.
5. Search and text fields have no border, fill or focus ring.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only. No emoji, logos or illustrations.
8. Plus Jakarta Sans for text. JetBrains Mono for every number, date, time, count and ticker.
9. Sentence case. No em dashes. Describe, never advise. Never say "real-time".
10. Dark mode first; light mode must work.
11. Rules keep 24px (vertical) or 12px (horizontal) from text. Side-by-side sections sit 64px apart, stacked sections 20px.
12. KPI strip: about 48px tall, 12px grey label, 18px mono value, hairlines between cells. Tables: 11px grey caps header, hairlines between rows, numbers right-aligned.
13. Status, category and reply are text with an optional icon, never a filled chip, never colour alone.
14. Draw the real navigation bar and sidebar; redesign neither. Only overlays (dialog, menus) have a surface, border, shadow and radius.
15. Missing values read N/A. No chart or figure without data from section 4.
16. Every section has a skeleton, a one-line empty state with one action, and an inline error with Retry.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative                 | #ef4444          | #dc2626          |
| Warning                  | #fbbf24          | #d97706          |

## 9. Open questions for me

Each carries the default that will be used.

1. Show the pipeline's IC sessions here? Default: yes, read only, with attached pitches linking to the pipeline; no session controls move here.
2. What may show during an open blind session? Default: only "N of M ballots cast" and quorum; no counts, names or choices until it is closed.
3. Hide this page's running vote count until completion? Default: yes; voters see their own vote and the number cast.
4. Keep the agenda and final vote count on completed meetings? Default: yes.
5. Recording, summary and tone? Default: one "Recording" line with a not available state; drop the queue and trend.
6. Sort upcoming soonest first, mark past-dated open meetings "Not closed", and keep the open meeting in the page address? Default: yes.
7. Add controls the server already supports (edit details, mark attendance, set quorum percent, link a pitch) and show stored minutes read only? Default: yes.
8. Count only voting members toward quorum, and fix which meeting "Since last meeting" picks? Default: yes, flagged.
9. Sample content for master admin and demo accounts? Default: yes, labelled, never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Meetings. Route: /org-team-hub/meetings. Version: organizational. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Keep the existing Team Hub sidebar and design only the content to its right, matching the rebuilt organizational pages named in section 8. Show how the page differs for an analyst and for a portfolio manager, executive or faculty advisor, respecting the role table in section 1, and draw one upcoming IC meeting, one completed meeting and the new meeting dialog. Include 4 to 8 features tailored to university investment councils, built only on data in section 4: for example a next meeting brief, a quorum and reply tracker by role, a read only list of IC sessions with attached pitches, a record of completed meetings, a term view by category. Never show vote counts, voter names or choices for a blind session that is still open. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
