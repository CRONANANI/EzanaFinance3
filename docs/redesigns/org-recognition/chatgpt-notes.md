# ChatGPT notes: org Recognition wireframe

ChatGPT ("Worked for 2m 11s") returned one image (1024 x 1536) with no chat text. The written
list the prompt asked for was drawn INSIDE the image, in a three-column footer. Transcribed below,
followed by my own reading of the image (labelled as mine).

## Text drawn in the image footer (ChatGPT's)

**Sections shown:** KPI strip, latest recognition, rankings (with tabs and periods), term honour
roll, member scorecard (rating history, rating breakdown, pitch impact log, calibration, badges and
awards), awards by sector team, rating method, manager notes, states, and award dialog.

**Decisions you may reverse:**

- Awards-first information hierarchy (vs. rankings-first).
- Visible pitch impact log in the scorecard (vs. a collapsed view).
- Open award dialog (vs. a closed state).
- Inclusion and wording of the analyst-view note.

**Drawn beyond section 4:**

- Time-series rating chart, calibration scatter plot, and examples of loading/empty/error states
  for clarity.
- "Sample content" switch in the KPI strip (illustrative control not specified in section 4).

## My reading of the image (Claude, not ChatGPT)

Layout: real nav bar and Team Hub sidebar (viewer "Daniel Park, Executive"), then a content area of
three columns split by full-height hairlines (left about 370px, centre about 600px, right about
290px).

1. KPI strip across the top: Awards (7D) 12; Rated members 24/26; Top mover (30D) +178 Ria Kapoor;
   Last recompute 2026-01-14; Auto-awards (term) 38; Sample content label with "Show council data"
   toggle. Right side: text buttons Recompute ratings, Auto-award, Weights, and one solid emerald
   Award button; under them a muted note "Analyst view: read only. Award, recompute, auto-award and
   weights hidden."
2. Left column:
   - Latest recognition: table (Title and reason, Recipient, Giver, Period, Date, Type). Rows: Best
     Pitch (gold, trophy icon), Rising Star, Collaboration, Research Impact, Execution; each with a
     one-line reason, giver (for example "Prof. Mehta", Ingrid Lindqvist, Elena Rossi, Jordan Vale),
     period T26, date, type Gold or Award. "View all recognition" link.
   - Rankings: text tabs Top movers (selected, emerald), All members, Vice Presidents, Portfolio
     Managers, Analysts, Quant Traders; period text tabs 30D (selected), QTD, YTD; table # / Member
     (initials avatar) / Role / Delta rating / Tier, five rows, selected row (Selam Haile) in emerald.
     "View full rankings" link.
   - Term honour roll (T26): "Top recognized members, by number of awards." # / Member / Team /
     Awards, five rows.
   - States (examples): Loading latest recognition..., No recognition yet for this period., Could not
     load rankings. Retry.
3. Centre column, scorecard for Selam Haile: initials, name, star "Provisional" in amber text,
   "Analyst · 6 rated theses", Tier / Council pctl 88% / All funds pctl 76%, Ezana rating 1,428 large
   on the right.
   - Rating history line chart with 30D / QTD / YTD text tabs (dated x-axis Dec 15 to Jan 14).
   - How the rating is worked out: a two-line plain explanation (starts at 1250, moves with scored
     pitches and a conviction adjustment, daily decay after 30 idle days, display weights do not
     change the rating).
   - Rating breakdown, "Evaluated as Analyst": Category / Display weight / Score (0-100) bar and
     number; Learning shows "pending" with no bar.
   - Pitch impact log (resolved theses): Ticker, Company, Sector, Hold days, Excess return, Bench
     return, Conviction, Points (MSFT, UNH, CAT; signed, coloured).
   - Calibration scatter with dashed ideal line.
   - Badges and awards table: Title, Giver, Period, Date, Reason, Pitch (linked ticker or dash).
4. Right column: Awards by sector team (Technology 14, Healthcare 11, Financials 8, Industrials 7);
   Rating method bullets (what counts, inactivity, display weights, what does not count, awards do
   not change the rating); Manager notes (last recompute, auto-award coverage, provisional members
   3/26, a free-text note); States (examples): Recomputing ratings..., No provisional members.,
   Action failed. Retry.

Problems to correct in build (my notes):

- The award dialog is listed as drawn but does NOT appear in the image.
- Names not in the shared sample council: Ria Kapoor, Jordan Vale, "Prof. Mehta". Swap for council
  members (for example Priya Raman, Tomas Alvarez, Noor Haddad, Jonas Weber).
- Badge types Collaboration, Research Impact, Execution are not among the six real types (Analyst of
  the Month, Best Call, Most Accurate, Rising Star, Clutch Contributor, Best Deep Dive); "Best Pitch"
  should be "Best Call".
- Tier "A"/"B" is invented; real tiers are Unranked, Trainee, Junior Analyst and so on.
- Rating history drawn with true dates and a 30D/QTD/YTD switch: real dates are unreliable today
  (bug 2). Calibration axes drawn as returns, real calibration is conviction 1-5 vs share beating the
  benchmark.
- Manager notes free-text note and "Auto-award coverage 38 members" have no data source; "Rated
  members 24/26" exceeds a nine-member council.
- Rankings tab labels are title case (sentence case required).
- Excess and bench return are vs the broad market (column label must not say sector).
