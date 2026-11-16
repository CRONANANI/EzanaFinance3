# Build report: org Competitions (/org-competitions)

Branch `redesign/org-competitions`, commit `78e5575` (not pushed). No SQL needed (no sql.md).

## Built

- Landing (`CompetitionsPage`): KPI strip (entered, hosting, open to join, next deadline, fund challenges), then Sample content, Council Rankings, Pitch circuit and one filled New competition button. Text tabs Pitch competitions / Fund challenges (`?tab=fund`). Main column: current obligations, entered competitions (stage, next deadline, placement, format), open to join (registration window, admission, Apply/Join/Request), hosting (stage, readiness, next milestone, format). Side column behind one rule: circuit deadlines (the real hand-kept pitch circuit), fund challenge standing, member trophies this season (Winner in gold). Loading skeletons (route and page), one-line empty states with one action, inline errors with Retry per section.
- Fund challenges tab: only the challenges the council entered, with the Fund Analytics block's columns (competition rank N of M, return since entry, councils entered, ends). A row opens that challenge's standings (rank, council, return; no dollars). "Open to enter" list with Enter (managers, confirmed in a dialog). Links to Council Rankings and to the council rating and fund ratios page.
- Event workspace on every `[slug]` sub-page (`_frame.js`, `WorkspaceHeader`): back link, event name at section size, stage, role, Switch event, text tabs linking to the existing addresses. Host tools row: Structure, Invitations, Rubric (`?tab=`), Join requests, Scoreboard. Entrant overview: entry, slot, deliverables checklist, result, entry rules, announcements. Host overview: figures, readiness, the one step forward, host actions, event dates and rules link, announcements. Dates and rules link dialog (new).
- Sample content: `src/lib/org-competitions-sample.js` via `GET /api/org/pitch-competitions/sample` (master admin and demo accounts, `isCommunityDemoViewer`). Same sample council and people as the other org pages; fund standing #1 is the Fund Analytics bundle's (3 of 12); scores from the real `weightedTotal` (0 to 100); trophies by the real award rule. Sample events open a sample workspace (`sample-` slugs) with every tab; actions apply on the page only.

## Fixes

- Fund Analytics link now opens `/org-competitions?tab=fund` (label "Open fund challenges"); old `/org-team-hub/competitions` redirects there. Test added.
- Entrant feedback: comment text only, sorted, no name/firm/label, in the API (`anonymousFeedback`) and UI.
- Leaderboard returns no fund value in dollars; Enter refused (409) unless the challenge is active.
- Rules link validated as http(s), dates validated, on create and edit.
- `window.confirm`/`prompt` replaced by dialogs; "VPs" copy fixed; stale "Phase 3" copy removed.

## Guide over design

Table headers 11px caps (design drew sentence case). Primary button `--btn-primary-*`. KPI values 18px mono. Row hover is a text colour change; the canvas table wash and dotted rows overridden. Claude Design's nav and logo not copied. Rail fund table abbreviates headers (Rank, Return) and folds councils entered into "N of M" for width.

## Left out

Withdraw (no data path), archive/reopen, field size beside an entrant's rank (entrants cannot read other teams), moving the rating tiles and fund ratio form into Council Rankings (kept at `/org-competitions/council`, linked from the Fund challenges tab), the pitch circuit pages' own redesign, any change to who may register a team (flagged, unchanged). A competition created while sample content shows is page-only and has no workspace.

## Untested

Real database, auth and RLS (harness mocks fetch; policies read from repo migrations, production may differ); the overview loader's embedded badge join (`org_members!inner`); `npm run build`; touch devices. Phone page edge vs the harness's stand-in nav differs by its padding only.

## Files

New: `landing/{CompetitionsPage,Dialogs}.jsx`, `landing/useCompetitionsData.js`, `landing/landing.css`, `WorkspaceHeader.jsx`, `WorkspaceParts.jsx`, `SampleWorkspace.jsx`, `[slug]/_frame.js`, `api/org/pitch-competitions/{overview,sample}/route.js`, `lib/org-competitions-{model,sample}.js`, `lib/competitions/{overview,fund-challenges}.js`, `scripts/check-org-competitions.mjs`. Changed: every org-competitions page.js and loading.js, the competitions clients and `competitions.css`, results/PATCH/create/leaderboard/enter routes, `fund-analytics/Sections.jsx` (link only), `org-team-hub/competitions/page.js` (redirect), `package.json` (test:org-competitions). Deleted: `CompetitionsListClient.jsx`, `academic2/CompetitionHub.jsx`. No shell, sidebar, nav or layout file touched. Harness: `/home/claude/harness-org-competitions/`.
