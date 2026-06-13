---
description: Thorough security sweep of the web app — report findings and ship low-risk fixes via an auto-merge-on-green PR.
---

# /security-sweep — scheduled security sweep

You are running as an **unattended, scheduled** security sweep of this Next.js
app (cronanani/cronanani). Goal: find real vulnerabilities, write a report, and
ship fixes automatically — **without ever deploying a broken or insecure build
to production**. Be precise and conservative: a wrong "fix" here ships straight
to prod via the Vercel `main` deploy.

## 0. No-op guard (do this first)

The schedule runs every 4 hours, but the code rarely changes that often. Avoid
churn:

1. `git fetch origin main` and read the latest commit on `main`.
2. Read `security-reports/.last-sweep` if it exists (it holds the SHA of the
   commit swept last time).
3. If `main`'s HEAD SHA **equals** `.last-sweep` AND there is no open
   `security-sweep` PR, **stop now** — reply "No changes since last sweep
   (<sha>); skipping." and end the turn. Do not write a report, do not open a PR.
4. Otherwise continue.

## 1. Scope — sweep the whole app, but prioritize the hot zones

This repo's real attack surface (review these first, by pattern):

- **API authz** — every `src/app/api/**/route.js`. Confirm `withApiGuard`
  (`@/lib/api-guard`) is used and `requireAuth` is set correctly. Flag any
  mutating route (POST/PATCH/DELETE) that is `requireAuth: false` or skips a
  role/ownership check.
- **Supabase RLS boundary** — `createServerSupabase` (`@/lib/supabase-server`)
  is RLS-scoped; `createServerSupabaseClient` (`@/lib/supabase-service-role`)
  **bypasses RLS**. Flag: (a) any import of the service-role client from a
  client component or anything under a `'use client'` file; (b) service-role
  queries that don't re-check org/user ownership in code (RLS is off, so the
  route MUST authorize).
- **Org hierarchy / role gating** — `@/lib/org-trading-server`
  (`assertOrgRole`, `getCurrentOrgMember`) and `@/lib/org-hierarchy`
  (`canEditMember`, `assignableTiers`). Flag privilege-escalation paths: a
  lower tier editing a higher tier, missing server-side tier checks, trusting
  a client-supplied role/tier/`member_id` without re-deriving from the session.
- **IDOR** — dynamic routes (`[id]`, `[memberId]`, `[ticker]`, `[pitchId]`).
  Confirm the resource is re-scoped to the caller's `org_id`/`user_id` before
  read/write.
- **Secret leakage** — anything server-only (`SUPABASE_SERVICE_ROLE_KEY`, API
  keys, FMP/Quiver keys) must never be read in client code or exposed via a
  `NEXT_PUBLIC_*` var. Flag new `NEXT_PUBLIC_` vars holding secrets.
- **Injection** — raw SQL via `execute_sql`/string-built queries; unparameterized
  `.rpc`/filters built from request input.
- **XSS** — `dangerouslySetInnerHTML`, unsanitized markdown/HTML render of
  user/external content (incl. webhook/FMP/Quiver payloads).
- **SSRF** — server-side `fetch()` to a URL derived from request input.
- **Dependencies** — `npm audit` criticals/highs.

## 2. Run the checks

- `npm audit --json` (triage critical/high only — match the existing
  `.github/workflows/security-audit.yml` threshold).
- `npx next lint` for lint-level issues.
- Invoke the built-in **`/security-review`** skill for a diff-scoped AI review
  of what changed since `.last-sweep` (or the last ~50 commits on first run).
- Manually review the hot-zone patterns in §1 with `Grep`/`Read` across the
  full tree (not just the diff) once per sweep.

## 3. Write the report (always, when not a no-op)

Create `security-reports/<YYYY-MM-DD-HHMM>.md` with:
- Commit swept, timestamp, tools run.
- A table of findings: severity (Critical/High/Medium/Low/Info), location
  (`file:line`), description, and proposed remediation.
- "No findings" is a valid, useful report — write it.

## 4. Ship fixes — auto-merge ONLY on green

Branch from `main`: `git checkout -b claude/security-sweep-<timestamp>`.

Apply fixes, but obey these **non-negotiable rules**:
- **Only auto-fix High/Critical findings that have a clear, minimal, local
  fix.** Keep diffs tight — no broad refactors, no drive-by changes.
- **Never weaken a security control to make a check pass** (don't loosen RLS,
  don't downgrade `requireAuth`, don't widen a role check, don't delete a
  guard). If the only "fix" is to weaken security, it's not a fix — report it.
- **Never move a server-only secret into `NEXT_PUBLIC_*`.**
- Anything ambiguous, architectural, or risky → **report-only**. Put it in the
  PR body under "Needs human review" and do NOT include a code change for it.

Then **gate the merge on a green build**:
1. Run `npx next lint` and `next build` locally. If either fails, **do not
   merge** — push the branch, open a normal (non-auto-merge) PR titled
   `[security-sweep] needs review — build failed`, and stop.
2. If local build is green: commit, push, open a PR (title
   `[security-sweep] <date>`, body = the report + fix summary), and **enable
   auto-merge** so it merges the moment required CI checks (`ci.yml`,
   `security-audit.yml`) pass. This is the authorized "auto-merge to main"
   path: no human review, but the CI gate prevents a broken/red build from
   ever reaching the `main` → Vercel production deploy.
3. If there were findings but **zero** safe auto-fixes, open a **report-only**
   PR (no auto-merge) so a human sees it.

Update `security-reports/.last-sweep` with the swept SHA in the same PR so the
no-op guard works next run.

## 5. Dedupe & hygiene

- Before opening a PR, check for an existing open `[security-sweep]` PR. If one
  exists and covers the same findings, comment/update it instead of stacking a
  duplicate.
- Keep one PR per sweep. Label it `security` if the label exists.

## Loosening / tightening this job (for the human, not the run)

- To make it **truly** push straight to `main` with no CI gate, change §4 to
  commit on `main` and `git push origin main` directly. **Not recommended** —
  removes the only thing stopping an unattended broken deploy.
- To make it **safer**, change §4 to never enable auto-merge (always wait for
  human merge), or restrict auto-merge to `npm audit` dependency bumps only.
