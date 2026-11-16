# ChatGPT notes: Sonar Research (organizational)

ChatGPT returned the image with NO text (the reply was only the image, "Worked for 2m 5s"). It did not write the requested list of sections, reversible decisions, or items outside section 4. Everything below is my own reading of the image (written by the stage 2 agent), not ChatGPT's words.

Image: 1015 x 1550 px, portrait, dark mode (not 1440 wide as requested). Captured in three overlapping slices, wireframe-part1.jpg (top) to wireframe-part3.jpg (bottom).

## Reading of the image, top to bottom

- Navigation bar and Team Hub sidebar drawn as a stand-in ("Ezana Finance" wordmark, member "Nolan Reed, Executive", Sonar Research selected in emerald). Not to be copied.
- KPI strip across the top, with hairlines between cells: Awaiting review 12, My drafts 5, Returned to me 3, Approved this term 37, Budget left 64 / 100, Stale coverage 8 (warning icon), Sample content switch (on). On its right: "Open main Sonar" and "Budget settings" as text, and one solid emerald "Run deep research" button.
- Role legend line under the strip: analyst view (run, save, submit), reviewer view (approve, return, comment), executive view (set budget pool and allocations).
- Text-only tabs: Reports (selected, emerald, but drawn with an underline bar), Research, Analytics. Budget tab removed.
- Filter row: borderless search "Search reports, questions, tickers, authors", text menus Status, Kind, Visibility, Ticker, Mine, then "58 results" and "Clear filters".
- Two columns split by a full-height hairline.
- Left column, "Needs you":
  - "Awaiting my review (4)" table: Report, Kind, Ticker, Author, Version, Claims verified (18 / 20), Pitch link (P-143 style), Updated, Action "Review".
  - "Returned to me (3)" table: Report, Kind, Ticker, Author, Version, Note (reviewer note), Updated, Action "Edit".
  - "Research archive (37)" table: Report, Status (icon plus word: Approved, Under review, Draft, Superseded), Visibility, Author, Version, Collections, Challenges (1 / 1), Claims verified, Updated. One row carries "mandate screen: fits (superseded)" under it.
  - "Recent research attached to pitches (5)" table: Pitch, Report, Ticker, Kind, Added by, Updated.
  - State examples strip: "Loading more results...", "No reports match your filters. Try adjusting your filters.", "Couldn't load reports. Retry".
- Right column:
  - "Start research": text tabs Fund fit / Open question; borderless fields Company or ticker, Notes (optional), Linked pitch (optional, e.g. P-143); line "One deep run is used from the monthly fund pool."; full-width emerald "Run deep research".
  - "Fund budget" with "Edit allocations" link: pooled deep-research budget 64 / 100 left, reset date, my allocation 10, my runs 6 / 10, six monthly usage bars (Aug to Jan) with mono counts.
  - "Coverage at risk": approved research stale after 120 days (8): Ticker (warning icon), Last approved, Days stale (amber), Owner.
  - "Research quality": council members (executives and managers see all): Member, Reports approved, Claims verified, Challenges upheld.
- Overlays drawn at the bottom:
  - Single report view (drawn as an overlay panel): kind, ticker, status Approved, visibility Council; title; Author, Reviewer, Approved version v2.1; Review note; Pitch P-143 and Collections links. Action row: one emerald "Review" button, then text actions Submit for review, Withdraw to draft, Mark superseded, Challenge conclusion, Sharing and links (menu), Collections (menu), Delete draft. Version selector "v2.1 (approved)". Left: a placeholder block "Finished Sonar answer block. Existing Sonar answer layout preserved. Not redesigned here." Right, behind a hairline: Comments with Part selector (whole report), Add a comment field, comment list with Resolve / Reply, Resolved marker with Reopen / Reply, "Show resolved".
  - Save to fund dialog: Save as (New report / New version, radio), Title field, Visibility select (Council), checkboxes "Supports a pitch (link after saving)" and "Save as draft (do not submit for review)", Cancel text and emerald Save.

## Things in the image that conflict with the description (for the build stage)

- "Edit" action on returned reports: reports cannot be edited (section 5); the real action is open the report and save a new version from a new run.
- "Reply" on comments: replies exist in code but have no button today; showing it is new.
- "Approved this term" KPI: there is no term concept in the data; use the analytics window.
- "Ticker" filter and "Visibility" filter: ticker filter exists in code without a button; visibility filter is new.
- Kind values drawn as "company" and "thematic": the real kinds are research, fund fit and challenge.
- The Reports tab has an underline bar (the guide says text only, no bar).
- Several boxes remain: bordered selects in the dialog and version picker, filled save dialog checkboxes (acceptable inside an overlay), a framed Sonar answer placeholder.
- The single report is drawn as an overlay; in the app it has its own address.
- "Save as draft (do not submit for review)" as an option: saving always creates a draft today.
- Budget "Edit allocations" link and "Budget settings": executive only.
- Research quality per member is restricted: analysts see only their own line.
