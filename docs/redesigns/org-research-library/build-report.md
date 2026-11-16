# Build report: Research Library (organizational)

Branch `redesign/org-research-library`, commit `57daf70`, worktree `/home/claude/wt/org-research-library`. Not pushed. Route `/org-team-hub/research-library`.

## IMPORTANT: "My team" visibility is not enforced

The read rule in the migrations only separates private documents from everything else, so a document saved as "My team" is readable by the whole council (and so are its versions, files and comments). The build does not claim otherwise: the editor's visibility hint says "Saved as your team, but not enforced yet: the whole council can currently read it", shown in the warning colour, and the document panel repeats it under Visibility. The policy change is written in `sql.md` in this folder (a helper `auth_team_ids()` and four rewritten SELECT policies). It was NOT run. Nothing in the build depends on it; after it runs, two strings should change (listed in sql.md).

## What was built

Code in `src/components/org/research-library/` (classes `orl-`, on the Command Center's shared `tcc-` atoms). Rules in `src/lib/org-research-library-model.js` (pure: the server search, the sample, the page and the tests all read it). Sample in `src/lib/org-research-library-sample.js`.

1. KPI strip with hairlines between cells: Published, Under review, My drafts, Open review blocks, Stale tickers (amber when above zero). Right: "Sample content" with "Show council data" (same text switch as the other org pages), Export (CSV or print of the listed documents, formula-safe), New note (the one filled button). Wraps to three then two columns on narrow widths.
2. Text tabs Library, Ticker, Lineage; on the right one line saying what the viewer's role can do.
3. Borderless search; six filter menus (Type, Sector, Status, Term, Author, Ticker) with live counts, multi-select, "Clear filters"; the search mode as a read-only label ("Semantic search" or "Keyword search", with a tooltip saying it is a deployment setting).
4. Needs review (managers): every document under review, longest waiting first, author, version, updated, open block count, Review (opens the panel on the review thread). Analysts get "Your work in progress" (their drafts and documents under review) instead.
5. Research library: one flat row per document, pinned first, then newest (or relevance while searching). Status as text with an icon; visibility; term; version; files; comments; updated. Under the title: type, ticker, author, Exemplar, Alum. Superseded and archived rows dimmed. "Summarize this set" (first 40 listed). A footer line when the 1,000-document load limit is reached.
6. Published exemplars: published documents flagged as exemplars.
7. Side column: Sonar research reports (latest four the viewer may read: report, kind, ticker, status, version, share of claims verified; All reports), Coverage handoffs (latest per ticker; ticker opens the chain; Record handoff for managers), Stale coverage (no document in 90 days, days since), Quick dossier (documents, distinct authors, covered since, linked pitches; Open dossier, Summarize ticker).
8. Document panel (ds Modal): ticker (opens the dossier), type, version, status, Exemplar, Pinned; a publish readiness checklist for drafts and documents under review (abstract, template sections, open review blocks; Publish disabled while one is known to fail; if the server still refuses, its 409 reasons are listed); superseded and archived notices; tabs Document (abstract, assistant summary on request, Markdown body, sources, details: author and role when written, alum, published, updated, sector, term, visibility, tags, views, downloads, linked pitch), Files (name, uploader, kind, size, uploaded, Download, confirmed Delete, Attach file), Versions (current plus history; earlier text cannot be opened), Review (thread, Open block / Block resolved / Resolved, Resolve and Reopen for the comment's author or a manager, comment box, "Blocks publish until resolved" for managers). Footer: Open, Export PDF, Delete or Archive (red, confirmed), Pin, Mark exemplar, Supersede (confirmed), Edit, Back to draft, Submit for review, and Publish (or Submit for review) as the one filled button.
9. Editor (ds Modal): type, template (fills an empty body), title, abstract (required to publish), body (Markdown rendered), ticker with suggestions, sector (the 11 standard sectors, shared with the Org chart), term (free text), visibility as text options with what each does, tags, linked pitch (active pitches), sources. Save draft and Save and publish (Save changes for published work). The draft note says exactly who can see drafts. After a save the document opens so files can be attached.
10. Ticker view: ticker field, five figures (documents, analysts, covered since, pitches, first pitch's expected return, signed), Summarize all, every document newest first (the wording says so).
11. Lineage view: coverage table (ticker, current analyst, documents, handoffs, last document, latest pitch's expected return, Stale or Current), the handoff chain per ticker, Record handoff (managers, existing route) with ticker, from, to, term, handoff document.
12. View, search, filters, open document, dossier ticker and chain ticker are in the page address (`?view=ticker&symbol=NVDA`, `?type=pitch_memo&q=margin`, `?d=<id>`); the server page reads them so the first paint matches.

Sample content: `GET /api/org/research-notes/sample` (new; `isCommunityDemoViewer` plus council membership). The same council as the other org pages (the same nine members, four sector teams, holdings and pitches NVDA follow-on, CAT, AAPL, LLY), plus two invented alumni who handed coverage over. 20 documents across all nine real document types and all five statuses, private and team documents, exemplar and pinned flags, versions, comments with open and resolved blocks, files of every real kind, five handoffs, four Sonar reports, two templates. Drafts of others are hidden from an analyst viewer and private documents from everyone but their author, as live. Every action on sample rows is applied on the page with the server's rules (scripted checks confirm no request is sent); summaries and file downloads say they are not available for sample content.

## Conflicts decided (in the commit as defaults)

All as briefed: hairlines restored between KPI cells; search mode read-only; publish and pin follow the server (author or manager sees Pin; Publish for authors on their own work, executives always, portfolio managers only with the approval right, now returned by the search as `viewer.canApprove`); supersede unchanged and confirmed; file delete confirmed; every section 6 control kept; real types and kinds, exemplar as a flag, no mentions, term free text; drafts copy exact; "My team" labelled honestly; Markdown rendered with the existing react-markdown (raw HTML skipped, only text elements allowed, images dropped, link URLs filtered by the renderer); dossier wording "Newest first"; every failed action has a message and every error a Retry.

Decisions of mine worth a look:

- Delete or Archive added: the DELETE route existed and works (drafts and documents under review removed; published or superseded archived; archived offers nothing).
- Record handoff added on the existing manager-only POST route (the description flagged the missing control).
- Linked pitch: the Pitch Pipeline opens `?pitch=<id>` today (PitchModalHost), so "View pitch" links there. Sample rows link to the pipeline itself. The other agent is rebuilding the pipeline; if that address changes, this link must follow.
- Linked pitch can now be set in the editor: POST already accepted it; PATCH now accepts it too, and both check the pitch belongs to the same council with the member's own client (POST did not check before).
- The side column shows on the Library view only.
- Filter menus are a small page component on the ds menu surface, because the ds Dropdown closes on every click and cannot be a multi-select.
- KPI "Open review blocks" counts unresolved blocks on drafts and documents under review.

## Left out, and why

- Pinned library documents as Trading Desk flag evidence: not wired, as briefed. For the owner.
- Paging: the server has none. It loads the newest 1,000 documents (pinned first) and filters within them; the page now says so when the limit is hit.
- Collections and saved searches, links to positions and assignments, comparing or restoring versions, a successor choice when superseding: no data or no route.
- Sort by views or title, pinned-only and tag filters, creating templates: routes exist, no control added (not in the design; sort order and the six filters cover the page).
- The design's "State examples" strip and role annotation (built as real states and the role line), and its stand-in navigation and sidebar.
- The graduation check's "handoff" type bug and the Sonar page's collection filing: other pages, not edited.

## Shared files touched

- `src/app/api/org/research-notes/_shared.js` (opt-in extras; other callers unchanged), `search/route.js`, `bootstrap/route.js` (comment), `route.js` (pitch check), `[id]/route.js` (pitch on PATCH), `coverage-lineage/route.js` (latest handoff). Em dashes in those files' comments were replaced.
- `scripts/check-branding.mjs`: the standalone-document exemption now points at `research-library/export-document.js` (the old file is deleted).
- `scripts/check-page-canvas.mjs`: `.orl-page` added to the fixed roots. `package.json`: one script.
- Deleted (only this page used them): `social2/ResearchLibrary.jsx`, `social2/NoteComposer.jsx`, `social2/research2.css`, `sonar/LibrarySonarStrip.jsx`.
- No shell file and no Pitch Pipeline file: `git diff --stat main...HEAD` lists none of TeamHubShell, TeamHubSidebar, team-hub-nav, team-hub-shell.css, the four layouts, `src/components/org/pitch*`, `src/app/api/org/pitches` or the pitches route.

## Checks (all pass)

`lint:branding`, `lint:ds`, `lint:css`, `lint:a11y`, `test:page-canvas` (3), `test:em-dash` (5), `check:org-emdash`, `check:no-em-dash`, `check:vendor-copy`, `test:org-research-library` (new, 10), `test:org-command-center` (9), `test:org-trading-desk` (10), `test:org-fund-analytics` (16), `test:org-assignments` (13), `test:org-chart` (10), `test:org-a`, `test:org-b`, `test:security` (20), `test:org-sonar` (38), eslint on changed folders (0 errors, 0 warnings), prettier on changed files, pre-commit hook. `lint:arch`: 0 errors, 12 warnings, as on main. No existing assertion was changed.

Preview harness `/home/claude/harness-org-research-library/` (real global CSS and Team Hub shell, stubbed link, router and org context, fetch mocked with a server simulation built from the sample rules; the navigation bar is a stand-in): no page errors; `scrollWidth` equals the viewport at 390, 1024, 1440 and 1920 in sample, live, empty and error states and with the panel open on a phone. 43 scripted checks pass (`interact.mjs`): sample actions send nothing; live actions send one request each with the expected route and body; failed writes show a message with Retry; supersede and file delete confirmed; readiness disables Publish while blocked; editor validation, honest team and draft copy, create then open; analyst cannot publish, edit or mark others' work and has no block checkbox or Record handoff, but can publish and pin their own; a portfolio manager without the approval right cannot publish others' work; error states heal on Retry; filters and the open document go into the address; handoff recorded; sample and council data switch both ways.

Screenshots here: `preview-dark.png`, `preview-light.png`, `preview-tablet.png`, `preview-phone.png`, `preview-document-panel.png`, `preview-document-review.png`, `preview-document-files.png`, `preview-document-phone.png`, `preview-editor.png`, `preview-ticker.png`, `preview-lineage.png`, `preview-lineage-chain.png`, `preview-role-analyst.png`, `preview-role-portfolio-manager.png`, `preview-empty.png`, `preview-error.png`, `preview-loading.png`.

## Untested

- `npm run build` and the real Next.js runtime; nothing ran against the database: the changed search (counts read from comments and attachments, `memberHasPermission` for the approval right), the latest-handoff field, the pitch checks, the new sample route, the server page's address parsing and demo-viewer check.
- Production may differ from the policies in the migrations (not checked, by rule). In particular the counts rely on the comment and attachment read policies.
- Real upload, signed download links and their refresh, the assistant summaries, the print window and CSV download in a real browser.
- The server-side 409 path in live mode was exercised only through the editor and the sample rules, not against the real publish route.
- The real navigation bar beside the page; partner (gold) scope; touch devices; screen readers. Two dialogs open at once (panel plus confirmation) both trap Tab; focus behaviour there was not checked with a screen reader.
