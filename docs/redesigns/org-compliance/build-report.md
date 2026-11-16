# Compliance (organizational) build report

Branch `redesign/org-compliance`, commit 284471b (not pushed). Worktree /home/claude/wt/org-compliance.

## Built

- New page at `src/components/org/compliance/` (CompliancePage, useComplianceData, ComplianceDialogs, ActivityLog, compliance.css); `page.js` and `loading.js` rewritten; old ComplianceClient and academic2 ComplianceMonitor/IPSPolicyEditor/IPSCheckBanner/compliance2.css removed (used only here).
- KPI strip + actions, info line, Breaches (Open/Resolved) | Policy summary, Rules in force | Sector headroom, Idea check, Council activity log (executives), sample footnote.
- Pure model `src/lib/org-compliance-model.js` (engine shared with `/api/org/ips/check`, readings, headroom, idea rows, plain audit names, sample actions); sample `src/lib/org-compliance-sample.js` (same council: Trading Desk positions under team sectors, 35% cap, 2 open breaches, invented people).
- APIs: check route uses the shared engine; portfolio mode now also returns sector weights and largest position (logs nothing). Violations GET `?state=resolved`, resolver names, `viewer.resolutionStorage`. PATCH accepts a reason (required once columns exist). Rule and resolve actions logged to `org_audit_log` via the existing `logOrgAction` service-role path. New `/api/org/ips/sample` (master admin/demo gate).
- New `test:org-compliance`.

## Honesty fixes

Every rule states how it is checked (pitch submission, pitch with size, idea check only, holdings on this page only, or "Recorded only, not checked"). Idea check: "This check saves nothing", untested rules say so. Not-advice line in policy summary. No blocking, enforcement or "all clear" wording. Detail objects rendered as text.

## Needs SQL

`sql.md`: three nullable columns on `org_ips_violations` + stamping trigger. Until applied: no reason field, "Not recorded" on resolved rows. Sample shows resolver/reason only once the live council could store them.

## Section 6 kept

Route, links in, any member access; server-side gates unchanged; check with four inputs saving nothing; resolve refreshes list and dispatches the sidebar count refresh; open-breach count unchanged for sidebar/Command Center/Trading Desk; rules still feed pitch form, Fund Analytics, Sonar fund fit, setup step; nine types and hard/soft stored as before; audit filter, paging, exec gate. Verdict chip replaced by KPIs.

## Left out

Acknowledged/waived states; pitch links (no source id written); fuzzy sector matching; Fund Analytics cap choice, pitch stage gate "Compliance", Settings permission text, Sonar severity default, analyst sidebar link (shell file, not touched); rule editing.

## Untested

Real Supabase: the head-only column probe, audit inserts, trigger. Next.js server render (npm run build not run). Harness used stubbed fetch, stand-in nav.

## Shared files touched

`package.json` (one script), `/api/org/ips/*` routes and loaders. No Team Hub shell, sidebar, nav or layout files.
