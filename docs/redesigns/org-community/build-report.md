# Build report: council Community (/community for council members)

Branch `redesign/org-community`, commit 5cb4117 (not pushed). Built 16 November 2026 from main at a2de444.

## What was built

- **Same route, two audiences.** `src/app/(dashboard)/community/page.js` renders the council page when `useOrg().isOrgUser` is true and the unchanged retail `CommunityPage` otherwise. Nothing is drawn until membership is known, so neither audience sees the other's page flash. The council page is loaded with `next/dynamic`, so the retail bundle does not grow.
- **Navigation (owner's explicit request, minimal change).** `Navbar.js`: the Community item is no longer hidden for council members; it stays directly before Learning Center (Team Hub is still leftmost for them). `MobileAuthNavDrawer.js`: one Community item added to the council members' Team Hub group.
- **Page** (`src/components/org/community/`): search, Sample content / Show council data, Messages, Add event and Announce (managers), one emerald New post (`--btn-primary-bg` / `--btn-primary-fg`); KPI strip (members, posts this week, open for feedback, coming up in 14 days, unread mentions, inbox unread | fund value, return on cost, positions); one role line; main column tabs Feed (team and type filters, up to three pinned posts, This week in the council, posts with Like and Useful reactions drawn as Bootstrap icons with mono counts, replies), Pitches open for feedback, Research notes, Mentions (marked seen when opened), Inbox (expand to read, marks read; New message opens the existing Send to team dialog when the viewer has that permission), Cross-council; side column behind one full-height hairline: Recognition (gold text and icon for gold awards), Coming up, Mentions, Council inbox, Across Ezana. Dialogs use the ds `Modal`: New post / Announce / Edit, New event, Remove post, Delete my post.
- **Data, as the signed-in member** (`src/lib/org-community-server.js`, routes under `src/app/api/org/community/`): feed from `org_posts` with authors, teams and post reactions; Coming up from `org_events` plus scheduled meetings; mentions (with the thread or pitch ticker), the viewer's received council messages with sender names (readable under the existing rule, so the Inbox tab is in), recent awards with giver, open pitches with discussion counts, published notes with views and comments, fund headline from `getOrgPositionBook`, council ranking (rating and tier from `council_elo`, public read) and live competitions. Reactions, mark-seen and mark-read reuse `/api/org/reactions`, `/api/org/mentions`, `/api/org/messages/:id/read`. The weekly digest reuses `/api/org/digest`. No service-role reads were added.
- **Rules** (`src/lib/org-community-model.js`, enforced by the routes before every write, RLS underneath): every active member posts discussions, questions and updates; announcements from executives and portfolio managers; executives (faculty advisor included) pin up to three and remove; authors edit and delete their own; managers add events (the existing database rule).
- **Not available yet.** Replies, titles, tickers, edit, delete, remove and pin need `sql.md`. The loader asks for the new columns and falls back to the original ones on 42703, reporting every extra as off; a write the database lets through but that changes no row answers 409 `not_available`. The page hides those controls, says "Replies not available yet" on questions, says in the composer that titles, tickers, pinning and replies are not available yet, and the executive role line says pinning and removing are not available yet.
- **Leak closed.** `src/lib/community/council-member-gate.js` + `POST /api/community/posts`: an active council member is refused (403) before any retail insert, top-level or reply. If the membership read itself fails the post is allowed (as before) and logged, so a database hiccup never blocks retail posting.
- **Sample content** (`src/lib/org-community-sample.js`, `GET /api/org/community/sample`, master admin and demo accounts only, labelled, local-only actions using the same rules): the shared sample council. Members, teams and awards from Recognition, pitches from Pitch Pipeline, notes from Research Library, meetings from Meetings, fund headline ($240,050.00, +46.73%, 12 positions) and digest from Command Center and Trading Desk, ranking from Council Rankings, competitions from Competitions. Adds posts, replies, reactions, events, mentions and inbox, plus faculty advisor Hana Girma (as on the Grades sample). Invented names only.

## Fixes against the design (description and guide win)

- No post titles, tickers, Attach a pitch, Pin or Remove shown as live before the database change.
- No invented "Votes: 4 of 9"; no "author will be notified" in the Remove dialog.
- Other councils show rating and tier, not a percentage return; the sample council's real derived rank (#3 of 12) instead of "#4 of 18".
- Primary button text uses `--btn-primary-fg`; KPI values 18px mono; no stand-in nav or logo copied; filled avatar circles, chips and underline bars dropped; the state examples strip built as real per-section states.
- KPI strip follows the retail Community (label over value, no icon tiles) so nine figures fit at 1440.

## Checks run

`lint:branding`, `lint:ds`, `lint:css`, `test:page-canvas`, `test:em-dash`, `test:org-community` (new, 15 tests: post, change and event rules; pre-change detection with a fake client; feed shaping; sample; retail gate with mock Supabase plus the route calling it before insert; route switch and nav order; copy rules), `test:community-redesign` (retail, unchanged), eslint (0 errors, 0 warnings), prettier, `lint:arch` (no new warnings). Not run: `npm run build` (blocked here).

Harness `/home/claude/harness-org-community/` (bundles the real route page with stubbed nav, auth and fetch): 390, 1024, 1280, 1440 dark and light, 1568, 1920; analyst, portfolio manager, live with and without the database change, empty, error, loading; retail at 1440 and 390. Content runs from the logo line to the logout line and `scrollWidth` equals the viewport width everywhere, with no element past the right edge. Interactions checked: post, react, pin (the three-pin limit is covered by unit tests), remove, reply, add event, Esc closes dialogs, every tab, analyst sees no Announce / Add event / Remove, Show council data switch.

## Left out (and where it lives)

- Attach a pitch or note to a post (no column; pitches and notes have their own tabs).
- Mentions created from posts (nothing parses them yet; mentions from position discussions still show).
- Task and assignment due dates in Coming up (they stay in the Command Center's Upcoming dates).
- Council members' access to the retail Messages and profile sub-pages is unchanged (only the main feed and posting are council-only).
- social2 `ReactionBar`, `ActivityDigest`, `OrgMemberProfileModal` not reused: emoji reactions and card styling break the guide; new parts were built.
- Notifications for posts or replies (none exist).

## Untested

- Against a real database: the column detection, RLS answers and the zero-row "not available" path were exercised only with fakes. Production may differ from the repo's migrations.
- `sql.md` itself (never run). The org_posts policy names are taken from the repo.
- Real Next.js rendering (dynamic import, CSS order) and the real navigation bar.

## Shared files touched

`src/components/Layout/Navbar.js`, `src/components/Layout/MobileAuthNavDrawer.js`, `src/app/(dashboard)/community/page.js`, `src/app/api/community/posts/route.js`, `package.json` (one script). No Team Hub shell file (TeamHubShell, TeamHubSidebar, team-hub-nav, team-hub-shell.css) and no layout.js was touched.
