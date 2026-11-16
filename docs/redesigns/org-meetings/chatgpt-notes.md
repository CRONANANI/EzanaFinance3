# ChatGPT notes: org Meetings

ChatGPT returned the image only, with no written text (it "worked for 2m 23s"). The three
lists the prompt asked for were drawn INTO the image as a footer strip. Everything below is
my (the stage 2 agent's) reading of the image, labelled as mine, not ChatGPT's words.

## Layout (my reading)

- Real nav bar and Team Hub sidebar unchanged (Meetings selected, badge 2).
- KPI strip with page actions on the right: Next meeting (Jul 27, 2025 14:00), Upcoming
  (term) 5, IC open 2, Quorum at risk 1 (warning icon), Completed (term) 9, Analysis ready 12,
  then "Sample content" with a "Show council data" switch, a plain "Settings" (gear) action
  and one filled "New meeting" button.
- Three columns below the strip:
  - Left rail (about 220px): text tabs Upcoming / Past / Term view; Categories list (All 5,
    IC 2, Sector 1, General 1, Exec 1, Education 0) as radio-style rows with counts; Term
    navigator (Fall 2025, Jul 1, 2025 to Dec 19, 2025, prev and next arrows); a "States
    (examples)" annotation strip (Loading meetings, No meetings in this category, Failed to
    load meetings + Retry); "Pipeline IC sessions (read-only)" list (three sessions with
    date and link icon).
  - Centre: "Upcoming meetings (soonest first)" as a horizontal text strip of five meetings
    (Council meeting Jul 27 14:00 selected in emerald with underline, Weekly executive sync,
    Healthcare review, Industrials deep dive, Term kickoff (Exec)). Selected meeting header:
    "Council meeting" with a permalink icon, meta row (date and time range, location Miller
    Hall 3.02, IC, Scheduled, Quorum 60%). "Manager controls (analysts: reply only)" row of
    text actions: Edit details, Link pitch, Mark attendance, Set quorum, Mark completed, with
    a one-line role note. Agenda table (#, Topic, Type, Owner, Min, Pitch link e.g. HC-001).
    "Attendees and replies" table (Member, Role, Team, Reply) beside a "Quorum tracker (by
    role)" (PMs 2/2, Execs 0/1, Faculty 1/1, Analysts 2/3, Overall 5/7, "Meets quorum").
    "Your reply: Yes / Maybe / No" as text. Pre-read pack (three document rows). Investment
    Committee vote: Status Open (blind session), Ballots cast 4, Quorum met, Your vote: Pass;
    no counts or names.
  - Right rail: Next meeting brief (short paragraph), Quorum and replies by role table
    (Role, Invited, Replied, Reply rate), Read-only IC sessions (linked to pipeline, three
    rows with external arrow), Completed record (recent, three rows) and "View all completed
    meetings".
- Full-width completed meeting below: "Completed meeting | Weekly executive sync" with meta;
  Recording (source + watch link); AI meeting analysis summary; Tone by role bars;
  agenda recap with an Outcome column (mostly hidden by the dialog); Deliverables discussed
  table (Type, Label, link); Attendees (read-only) with an Attended column; Final IC vote
  ("N/A, this was not an IC session").
- New meeting dialog overlay: Category, Scheduled time (start to end), Location, Quorum
  (optional, %), Pitch link (optional), Invited members as removable chips, Cancel and
  Create meeting. (No Title field is visible.)
- Footer annotation strip: "Sections shown", "Decisions you may reverse", "Drawn beyond
  section 4".

## ChatGPT's in-image lists (paraphrased)

- Decisions you may reverse: which meeting is selected and its agenda items; quorum threshold
  (60% vs 50%); table columns (show or hide Team); placement of the dialog fields; level of
  detail in the next meeting brief.
- Drawn beyond section 4 (its own list): AI meeting analysis summary and tone by role; the
  new meeting modal design; detailed deliverables list in the completed meeting;
  hyperlinks and permalinks for meetings and pitch documents; role-based control nudges.

## Conflicts with the description that stage 3 must resolve (my notes)

- Draws from section 5: AI summary, tone bars, "Analysis ready 12" KPI, a recording with a
  vendor source and duration, an agenda "Outcome" column (decisions), a blind ballot on this
  page's vote, start and end times, invites at scheduling, an "Attended" column filled in.
  Description default 5 says one Recording line with a not available state.
- Pre-read pack shows PDF files; the data has only a linked pitch (ticker, company, thesis).
- Dialog drops the required Title field.
- Quorum by role counts analysts and faculty; default 8 counts voting members only.
- Uses em dashes and "Execs", "TECH", "IND" abbreviations; dates are 2025.
- The "States (examples)" strip is an annotation, not a section to build.
