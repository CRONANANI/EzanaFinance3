# Build report: org Recognition

Branch `redesign/org-recognition`, commit 0daa9a1 (one commit, not pushed). Route `/org-team-hub/recognition` (from the Team Hub nav config, unchanged).

## What was built

- KPI strip: Awards (7D), Rated members (rated of ratable, advisors excluded), Top mover (30D, signed, opens the scorecard), Last recompute, Auto-awards (term). Actions on its right: Sample content label and switch, Recompute ratings, Auto-award, Weights (text), Award (the one filled button). Analysts see no manager actions.
- Left column: Latest recognition (icon, title, reason shown, recipient opens scorecard, giver or "From pitch outcomes", period, date, Badge / Gold award / Auto, linked pitch ticker; show more); Rankings (six lists as text tabs, 30D/QTD/YTD on Top movers, You marker, selected row emerald text, provisional dimmed); Term honour roll (badges and awards per member in the term, team, gold count, previous and next term).
- Centre: the scorecard (default: the address, else the viewer if rated, else top of the full ranking). Name, You, Provisional, role and team, rating, tier, council and all-funds percentiles, Copy link, Export (print, scorecard only), Rating history, Rating breakdown (display weights, pending without bar), Scored pitches, Calibration, Badges and awards. Chosen member kept in `?member=`.
- Right column: Awards by sector team (term; only when members have teams, Unassigned group), How the rating is worked out, links to Fund Analytics and Pitch Pipeline.
- Dialogs on the ds `Modal`: Award a badge (recipient from active members, period, badge type as text options with Bootstrap icons, title follows badge type until edited, reason, gold award), Display weights (role tabs, defaults, reset, total), confirmations for Recompute and Auto-award explaining what they do. Loading, empty and error states built for each; the design's "States (examples)" strips and footer notes were annotations and were not drawn.
- Sample content (`GET /api/org/recognition/sample`, master admin and demo accounts only, the shared sample council and shared sample pitches; ratings computed with the real rules; actions applied on the page only).
- Route loading state in the final layout.

## Fixes (section 7)

- Bug 2 (dates): recompute writes each scored-pitch change with `created_at` and `metadata.scored_on` = decision + 30 days (the outcome row's computed_at is refreshed every weekday and is not a date). History is rebuilt from deltas in date order (stored rating_after ignored). Recompute only moves `updated_at` (the decay clock) when the rating or count changed. Existing production changes are undated until the next recompute: the page then shows the history without the 30D/QTD/YTD switch with a note, and Top movers says a recompute will date them, rather than showing wrong figures.
- Bug 3: decay never raises a rating (`decayTarget`).
- Bug 4: label is "Excess vs market".
- Bug 5: auto-award reads only accepted pitches scored in the named quarter; Best Call needs positive excess; Most Accurate needs at least 3 scored pitches in the quarter; non-quarter periods are refused (400).
- Bug 6: only accepted pitches are rated (the engine's own stated intent).
- Bug 7: badges no longer feed engagement (engagement = research notes).
- Bug 8: faculty advisors are skipped by recompute and left out of rankings; they can still award.
- Bug 9: award dialog lists active members only. Unknown badge types refused by the POST route.
- Bug 1 (weights do not move the rating): kept, labelled "display weights" everywhere (default 4).
- Bug 10 (no automatic recompute): not fixed; the page says ratings move only when a manager recomputes.

## Left out

- Manager free-text notes (no table; no sql.md written).
- "Auto-award coverage" figure (no source).
- Peer nominations (database change; not drawn).
- Link from the Fund Analytics leaderboard back to Recognition (would touch another page).

## Open decision for the owner

- Scorecard privacy: every active member can still open every scorecard. Not widened, not narrowed.

## Checks

lint:branding, lint:ds, lint:css, lint:a11y, lint:arch (0 errors), test:page-canvas, test:em-dash, check:org-emdash, check:no-em-dash, check:vendor-copy, test:security, test:rls, test:org-recognition (new, 10 tests), test:org-command-center, test:org-meetings, test:org-a, test:org-b, eslint and prettier on changed files. Harness `/home/claude/harness-org-recognition/`: screenshots at 390, 1024, 1280, 1440 (dark, light), 1568, 1920, analyst, PM, faculty advisor, live, undated, empty, error, loading, non-member; scrollWidth equals viewport width everywhere; 22 scripted interaction checks pass.

## Untested

- Real routes against the database (no database here): the engine changes (explicit `created_at` on insert, upsert without `updated_at`), the scorecard's giver and team reads, `org_teams` read under RLS. Repo and production schema may differ.
- Print output in a real browser print dialog.
- The real navigation bar (stand-in in the harness).

## Shared files touched

- `src/lib/org-rating-engine.js` (fixes above), the recognition API routes (`route.js`, `ratings`, `auto`, `scorecard/[memberId]`, new `_loader.js` and `sample`), `package.json` (test script).
- Deleted the old `src/components/org/social2/` Recognition files (RecognitionWall, AwardModal, EzanaRatingScorecard, RatingLeaderboard, WeightsEditor, recognition2.css); nothing else imported them.
- No Team Hub shell file, layout.js, nav config or top navigation bar was touched.
