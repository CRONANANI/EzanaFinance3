# ChatGPT notes: org Competitions wireframe

ChatGPT (chat "Redesign Map Fix Prompt", worked 1m 38s) returned one image (1024 x 1536) and no text
outside it. The written lists it was asked for are drawn inside the image, in three columns at
the bottom. They are transcribed below, followed by my own reading of the image (labelled as mine).

## Lists drawn in the image (transcribed)

Sections shown

- KPI strip (entered, hosting, open to join, next deadline, fund challenges)
- Landing: obligations, entered competitions, open to join, hosting
- Right rail: circuit deadlines, fund challenges standing, member trophies
- Competition workspace: event tabs (overview, entry rules, deliverables, live board, results, host tools)
- Entrant view: basics, deliverables, roster, uploads, results, criteria, feedback
- Host view: readiness checklist, host actions, live board, results workspace
- Loading and empty states

Decisions you may reverse

- Withdraw from a competition (if allowed by rules)
- Edit team roster or change lead
- Replace or re-upload deliverables (before deadline)
- Advance a round (host)
- Recompute or un-reveal results (host)
- Update rules and key dates (host)

Drawn beyond section 4

- Due strip for current obligations
- Entry checklist (derived from host rules)
- Host readiness checklist
- Judged results with criterion breakdown
- Anonymous judge feedback
- Member trophies (winner / top 3 / participant)
- Fund challenge standing (event-based)
- Circuit deadlines timeline

## My reading of the image (Claude, not ChatGPT)

Top: real nav bar and Team Hub sidebar (left), then a KPI strip: Entered 3, Hosting 1, Open to
join 6, Next deadline NOV 18, 2026 (emerald), Fund challenges 2. On its right: "Sample content"
label, "Show council data" switch, plain text links "Council Rankings" and "Pitch circuit", and one
filled emerald "New competition" button.

Text tabs under the strip: "Pitch competitions" (selected, but drawn with an emerald underline bar,
which breaks the rules) and "Fund challenges".

Landing, two columns separated by a vertical rule:

- Left (main): "Current obligations" (what is due list: event name, item, mono due date; icons for
  deck, thesis, presentation slot "Room B" with time 14:30 ET). "Entered competitions 3" table:
  competition, role (Entrant), stage (Submission, Research, Presentation), next deadline, placement
  (N/A), format. "Open to join 6" table: competition, registration window (mono range), admission
  (Application, First come), format. "Hosting 1" table: event, readiness ("Ready (4/5)" in emerald
  with a tick), next milestone ("Confirm judges, NOV 22, 2026"), format ("2 rounds, 8 teams").
- Right rail: "Circuit deadlines" vertical timeline of four dated items (note: it lists the
  council's own events, not the external pitch circuit). "Fund challenges standing" (2 active
  challenges; challenge, return signed, rank #2 and #3). "Member trophies (this season)": Winner 1
  member, Top 3 3 members, Participant 11 members.

Competition workspace (one event, "North Shore Spring Invitational"): back link "Competition
workspace", large title with a "Sample content" chip, "Switch event" selector on the right. Text
tabs: Overview, Entry rules, Deliverables, Live board, Results, Host tools. Below, two columns:

- Entrant view: key value rows (event, admission, registration window, ticker rule, side rule);
  "Deliverables (you)" checklist with due dates; "Team roster 4" with a "Recruiting consent" switch
  and a Yes per member; "Deliverables upload / paste" rows with Upload and View text actions;
  "Results (revealed)" with a large "#2 of 8 teams" and a criterion breakdown (Thesis 28/30,
  Analysis 26/30, Presentation 27/30, Q&A 17/20); "Anonymous feedback 2" quotes.
- Host view: "Readiness checklist 4/5" (five items, rubric unticked); "Host actions" as emerald
  text links (Advance stage, Approve requests, Post announcement, Add rules dates, Generate judge
  scoring link); "Live board, Round 1" table (time ET, room, team, status Completed / In progress /
  Scheduled); "Results workspace" with Recompute and Reveal results and a table of rank, team,
  per criterion scores and total, the council's row highlighted with a fill.

Bottom: "Loading state (example)" spinner and "Empty state (example)" (trophy icon, "No
competitions yet", one line, "New competition" text action).

Problems to correct in build (my notes): underline bar on selected tab; header chip "Sample
content" is boxed; row highlight wash on the results table; feedback attributed to "Judge A/B"
(entrants must not see per-judge attribution); total scores above 100 (score is on a 0 to 100
scale); "Circuit deadlines" should come from the external pitch circuit entries; fund challenge
standing should match the Fund Analytics block (rank of field, return since entry, councils
entered, end date); large page title on the workspace breaks the no page title rule; "Withdraw",
"Edit team lead" and "un-reveal" are listed as reversible decisions but withdraw has no data path
today. Sample council name drawn as "Westbridge Investment Council" instead of "Sample council".
No dialogs were drawn (new competition, join, decline confirm, hide results confirm, judge link
shown once, dates and rules link).
