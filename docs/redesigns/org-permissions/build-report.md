# Build report: Team Permissions (org), /org-team-hub/permissions

Branch `redesign/org-permissions`, commit `10b65f5` (not pushed). Worktree `/home/claude/wt/org-permissions`. Harness `/home/claude/harness-org-permissions/`.

## What was built

- **KPI strip:** direct reports, active extras, rights you can grant, rights you cannot grant, extras to review. On the right: "Sample content", Show council data, Refresh, and an Org chart link. There is no title block.
- **"Preview as" switch:** shows only with sample content. Options are you, Ingrid Lindqvist (PM), Selam Haile (Senior PM) and Mikael Bekele (analyst, view only).
- **Matrix of seven rights by direct report:** each cell is in one of five states, shown by text and an icon:
  - Role default
  - Granted extra (shows red "Revoke" on hover or focus; clicking revokes)
  - Grant
  - Needs a manager role
  - Cannot grant

  Upload deliverables is a single locked line below the matrix, followed by a legend. When there are more reports than fit, the matrix scrolls inside its own container.

- **Grant confirmation:** granting Manage positions or View fund analytics asks for confirmation in the ds Modal. Its primary button uses `--btn-primary-bg` / `--btn-primary-fg`. Other grants and revokes take one click. Success shows as a line of text; a refusal shows the server's message and the page goes back to the server's data.
- **"What you can grant":** the rule in plain language, plus a link to the activity log in Compliance (executives only). Beside it, **"Extras to review"**: stored extras that are now role defaults, need a manager role, or were granted by someone other than the current manager. Each one has a Revoke button.
- **Member details, role defaults for that member's role, and where each right is used.**
- **View-only "Your access" table** for viewers whose role cannot grant (analysts, junior PMs).
- **States:** loading skeletons in the final layout (both `loading.js` and the client), an empty state linking to the Org chart, and an inline error with Retry.

## Security fixes

- **Rules in one place:** `decideChange` in `src/lib/org-permissions-model.js` is the single rule set. `checkGrantChange` in `src/lib/org-permissions-server.js` re-reads the target and the grantor's own extras and calls it. A change is allowed only when:
  - the grantor's role defaults include grant permissions (a stored extra never counts, which also makes the "can grant" label and the server agree);
  - the target is an active direct report in the org chart, in the same council, and is not the grantor;
  - the right is one of the eight.
- **Extra conditions for a grant:** the grantor must hold the right themselves (executives hold all eight), and the right must not already be a role default or a manager-only right for an analyst.
- **Revokes:** any stored extra on a direct report can be revoked, whoever granted it.
- **Database rule:** the narrower policy is written in `sql.md` and has not been run. It uses SECURITY DEFINER helpers that mirror the role table, so legitimate supervisors can still grant through the existing user-client writes with no route change.
- **Audit:** log entries now also record the member's name.
- **`getManageableOrgPeers` is not used as a gate.** It works by team, so it would refuse legitimate reports from the org chart (for example, an executive's direct analysts). Direct reports from the org chart are the rule, as section 6 says.

## Kept working

- `canFlagPositions`, `PERMISSION_TIERS`, `memberHasPermission` and `ASSIGNABLE_PERMISSIONS` are unchanged. Manage positions shows as a role default for executives and PMs through `getExtendedPermissions`.
- `viewerCanGrant` and `canGrantTo` are still exported.

## Left out

- A per-member change history and a recent-changes feed. The audit log is executives only and is linked in Compliance instead.
- Any change to the Settings "My role and access" panel.

## Untested

- The live route against a real database.
- The SQL in `sql.md`.
- The server-rendered `page.js` (the harness bundles the client page only).

## Shared files touched

- `scripts/check-page-canvas.mjs`: the FIXED entry `.tpm-root` became `.tpm-page`.
- `package.json`: added `test:org-permissions`.
- `src/lib/org-permissions-server.js`

No Team Hub shell or layout files were touched.
