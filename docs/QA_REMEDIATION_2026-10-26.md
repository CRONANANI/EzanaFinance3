# QA audit remediation (Retail, Partner, Org): summary

Source: `ezana-qa-functional-audit.md` (25 Oct 2026) and its remediation prompt.
All code is on `main` (from `7cf0217` to the commit that adds this file).
**No database changes were applied.** Every SQL change is a migration file for
the operator to apply by hand, in the order below.

## 1. Done, skipped, already fixed

| ID                            | Status                   | Commit                              | Note                                                                                                                                                                                                                                                                                                                              |
| ----------------------------- | ------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI-1                          | done                     | 7cf0217                             | `check:copy` exemption, titans store cycle broken, CI stubs real URLs, `metadataBase` can't throw. Full `next build` with CI's stub env now exits 0.                                                                                                                                                                              |
| RUN-1 / ORG-11                | done                     | 435f286                             | 4 routes declared `supabase`. The new `no-undef: error` rule found 4 more (an undeclared `user`): community events, learning bookmarks, learning leaderboard, profile main-track. ORG-11's demo AAPL stubs removed.                                                                                                               |
| PLAT-1                        | done                     | e8d8575                             | Every middleware await is bounded: rate limit 800 ms (fail open); session 1.5 s on pages (signed out, `reason=timeout`) and 1 s on API (pass to `withApiGuard`); profile/org reads 1.2 s (fail open; profile gates are skipped, never guessed); MFA 1.2 s (fail closed). Test: a never-resolving Supabase still answers in < 2 s. |
| PAR-9                         | done                     | e8d8575, d40b65c                    | Middleware sends partner pages to `/auth/partner/signin`; the legacy page is a server redirect.                                                                                                                                                                                                                                   |
| RET-15                        | done                     | a3bb870                             | aal2 required on API routes for users with a verified factor when `MFA_ENFORCED === 'true'`; the client redirects to `/auth/mfa` on `mfa_required`.                                                                                                                                                                               |
| DEP-1                         | done                     | 07bbcd9                             | `google-auth-library` 10.9.0 and `@supabase/auth-js` 2.116.0 declared at their locked versions.                                                                                                                                                                                                                                   |
| RET-8                         | done                     | 1cb0a8f                             | Plaid writes/reads use the live columns; errors return 500; the encryption key is checked before the token exchange. Every reader is fixed.                                                                                                                                                                                       |
| RET-3, RET-4                  | done                     | f21aaad                             | A live subscription is switched in place (prorated); the same plan returns `alreadySubscribed`. The webhook takes the plan from the price id first.                                                                                                                                                                               |
| RET-5                         | done                     | 56194dc                             | Company Research saves to the user's real watchlists.                                                                                                                                                                                                                                                                             |
| RET-6, RET-20                 | done                     | a7971ac                             | No fake plan, family, session or integrations; `SettingsOverhaulPanels.jsx` deleted.                                                                                                                                                                                                                                              |
| RET-11                        | done                     | e20da21                             | ELO page: skeleton, then real data or "unavailable".                                                                                                                                                                                                                                                                              |
| RET-21                        | done                     | 251e849                             | Portfolio CSV built from `GET /api/mock-trades`.                                                                                                                                                                                                                                                                                  |
| MIG-2, R29                    | done                     | 866ae0f                             | Bucket migration; composers upload to `<uid>/...` and show upload errors.                                                                                                                                                                                                                                                         |
| RET-10, RET-14                | done                     | a93f65f                             | Mock trades priced on the server against DB cash (compare-and-swap); portfolio POST is reset-only; learning writes use the admin client. Migration makes the tables owner-SELECT only.                                                                                                                                            |
| RET-16                        | done                     | dfa9070                             | `quoted_post_id` stored and embedded (falls back until the column exists).                                                                                                                                                                                                                                                        |
| RET-19                        | done                     | 1887edc                             | Lazy admin clients in 25 routes; poll option validated first; `support@ezana.world`.                                                                                                                                                                                                                                              |
| RET-9                         | done                     | 63a793e                             | `record-attempt` only records the signed-in caller's success. The client-reported failure path and the 423 lockout are removed; Supabase Auth limits plus `enforceAuthRateLimit` cover brute force.                                                                                                                               |
| RET-7                         | done                     | a6e3a17                             | Every sender declares an `email-category`; opt-out-able mail checks `user_settings`. Transactional and security mail always sends.                                                                                                                                                                                                |
| RET-1                         | helper only              | (summary commit)                    | `requirePlan()` / `planDecision()` (`src/lib/require-plan.js`, `src/lib/plan-gate.js`). **No call sites**, pending the limits decision (section 5).                                                                                                                                                                               |
| RET-13                        | done                     | a600031                             | The brokerage checklist gate is computed on the server from real records.                                                                                                                                                                                                                                                         |
| RET-17                        | done                     | 949cf43                             | No invented "earned on" dates.                                                                                                                                                                                                                                                                                                    |
| RET-18                        | done                     | fcd6aa1                             | One `TRIAL_DAYS` (14); `/payment/success` redirects to `/home?checkout=success`.                                                                                                                                                                                                                                                  |
| ORG-2, ORG-8                  | done                     | da82827 (code), 5447800 (migration) | The audit's draft migration never fired: inside SECURITY DEFINER, `current_user` is always the owner. It is fixed to read the SET ROLE value, and proven by 13 pg tests.                                                                                                                                                          |
| ORG-1 (+ ORG-20 invite items) | done                     | ffcede2                             | Existing users can accept; the invite email is sent (with a copy-the-link fallback); team/cohort scope is checked; revoke returns 404 when nothing matched.                                                                                                                                                                       |
| ORG-3                         | done                     | ea021ec                             | Only an executive can provision an executive; the tier is validated.                                                                                                                                                                                                                                                              |
| ORG-4                         | done                     | b7430c7                             | Any targeted assignee (team, role, tier, cohort) can submit.                                                                                                                                                                                                                                                                      |
| ORG-5 (+ ORG-20 rescoring)    | done                     | c1d00aa                             | Scorecard checks saves and retries once; submit persists every score; 409 when the competition is complete or archived; 120/min per judge token, no per-IP limit.                                                                                                                                                                 |
| ORG-6                         | done                     | 48b31cf                             | Calendar from meetings, tasks and due dates; `orgMockData.js` deleted.                                                                                                                                                                                                                                                            |
| ORG-7                         | done                     | 4c806b1                             | Grants enforced server-side; `mentor_juniors` hidden.                                                                                                                                                                                                                                                                             |
| ORG-9                         | done                     | 9179c0f                             | `getCurrentOrgMember` honours the `ez_org` cookie; `/api/org/switch`; switcher shown with 2+ memberships.                                                                                                                                                                                                                         |
| ORG-10                        | done                     | 8380187                             | Prefs default to the caller's own membership.                                                                                                                                                                                                                                                                                     |
| ORG-12                        | done                     | 89f944e, d333303                    | Imports upsert on a unique key. They fall back to a plain insert until the index migration is applied.                                                                                                                                                                                                                            |
| ORG-13, ORG-16                | done                     | 70c02e7, ad5512c                    | Only open competitions are joinable; results publish checks every error.                                                                                                                                                                                                                                                          |
| ORG-14                        | done                     | bd49f61                             | Live-only org objects captured (no-op live).                                                                                                                                                                                                                                                                                      |
| ORG-15                        | done                     | 7f2b360                             | The `org-fund-snapshot` cron refreshes competition value, return and rank.                                                                                                                                                                                                                                                        |
| ORG-17, ORG-18                | done                     | b4dd558, f7cfde6                    | Hindsight is SPY from `decision_at`; the PDF print script carries the CSP nonce.                                                                                                                                                                                                                                                  |
| PAR-1, PAR-10                 | done                     | 1e6eef1, 9caa533                    | The verification email is sent (502 on failure); resubmit after expiry; `POST /api/partner-application/resend`.                                                                                                                                                                                                                   |
| PAR-6, PAR-14                 | done                     | 0b17dca                             | Every write is checked; the document link is single-use.                                                                                                                                                                                                                                                                          |
| PAR-2                         | done                     | 3522795                             | Admin review API and the Settings › Partners "Partner applications" panel.                                                                                                                                                                                                                                                        |
| PAR-3                         | done                     | 2668489                             | One `isActivePartner`; the admin flag writes the `partners` row.                                                                                                                                                                                                                                                                  |
| PAR-4, PAR-15                 | done (verification TODO) | 47991b6                             | Manual ACH is visible as pending and deletable; removals are checked.                                                                                                                                                                                                                                                             |
| PAR-5, 7, 8, 12               | done                     | 31ede16, e1bf5e2, ea0c8cc, 4f4dfea  | No fake numbers; real payouts; Post wired; "Preview: data coming soon" elsewhere.                                                                                                                                                                                                                                                 |
| PAR-11, PAR-13                | done                     | ce09bf9, 73bb822                    | Published Echo edits go back to review (logged; no editor channel exists); questionnaire retry.                                                                                                                                                                                                                                   |
| PLAT-2                        | done                     | 7c4a0dc                             | Hub loads capped at 4; snapshot-first reads; snapshot cron added to `vercel.json`. No rows are written until pending file 18 is applied.                                                                                                                                                                                          |
| 2.1                           | done                     | 61ebba4                             | `npm run check:schema-drift` (static; live via `--print-missing-sql` or a DB URL).                                                                                                                                                                                                                                                |
| Phase 8                       | done                     | a70833a, 5e9b226                    | Static policy assertions in `check-rls.mjs`; API/unit tests per group; Playwright `e2e/{retail,partner,org}.spec.js` (skip unless E2E env vars are set).                                                                                                                                                                          |
| ORG-19, PLAT-4                | decision                 | —                                   | See section 5.                                                                                                                                                                                                                                                                                                                    |
| ORG-20 (rest), ORG-21         | not done                 | —                                   | Dead endpoints, write-only DMs, recruiting consent, export scope, falsification role check; org creation. P3, not in the prompt's phases.                                                                                                                                                                                         |

## 2. Migrations to apply, in order

1. **The 22 pending files** (audit package `migrations-pending/`): 01 to 21 each in its own transaction, in filename order. Then 22 (`…indexes_concurrent.sql`) statement by statement, outside a transaction.
   - **Pre-check 01 (done read-only):** `community_posts` has no live non-internal triggers. File 01 only maintains `comments_count` and sends no notifications, so it is safe.
   - **Pre-check 13 (done read-only):** nothing schedules `refresh_titans_activist`, so there is no double scheduling. File 13 can also be skipped; nothing calls it.
2. `20261026160000_capture_live_only_org_objects.sql`: a no-op live; any time.
3. `20261026110000_storage_buckets_community_documents.sql`: unblocks community images and partner documents.
4. `20261026131000_community_quoted_post.sql`: any time.
5. `20261026140000_org_positions_import_unique.sql`: any time (the code falls back until it exists). Live has 0 duplicate groups.
6. **Only after this deploy is live:**
   - `20261026120000_org_privilege_guards.sql`
   - `20261026130000_server_only_gamification_writes.sql`

**Verification queries** (expected results in brackets):

- **Pending files 01 to 22:**
  - 01: `select count(*) from pg_trigger where tgrelid='public.community_posts'::regclass and tgname='community_posts_reply_ai';` [1]
  - 02: `select to_regclass('public.platform_return_aggregates');` [not null]
  - 03: `select to_regclass('public.country_dimension_scores_mat'), to_regprocedure('public.refresh_empire_scores_mat()');` [both not null]
  - 04: `select to_regprocedure('public.revoke_auth_sessions_for_user(uuid)');` [not null]
  - 05: `select to_regclass('public.help_center_articles'), (select count(*) from pg_proc where proname='match_help_articles');` [not null, ≥1]
  - 06: `select to_regclass('public.org_roles'), to_regclass('public.org_member_roles'), (select count(*) from pg_trigger where tgname='trg_sync_member_role_tier');` [not null, not null, 1]
  - 07: `select to_regclass('public.house_bq_sync_log');`
  - 08: `select to_regclass('public.help_article_views'), (select count(*) from pg_proc where proname='help_center_trending');`
  - 09: `select to_regclass('public.help_search_events');`
  - 10: `select (select count(*) from pg_tables where schemaname='public' and tablename in ('referrals','referral_codes','referral_rewards')), (select count(distinct proname) from pg_proc where pronamespace='public'::regnamespace and proname in ('confirm_referral','ensure_referral_code','ensure_referral_code_for','generate_referral_code','on_profile_email_verified_referral'));` [3, 5]
  - 11: `select count(*) from pg_indexes where indexname in ('br_candidates_person_idx','br_candidates_year_elected_idx');` [2]
  - 12: `select to_regclass('public.help_article_reads');`
  - 13: `select count(distinct proname) from pg_proc where proname in ('refresh_titans_activist','titans_business_days');` [2]
  - 14: `select to_regclass('public.sonar_exemplars'), to_regclass('public.sonar_threads');`
  - 15: `select (select count(*) from pg_proc where proname='thirteen_f_filing_progress'), to_regclass('public.sec_filings_inst_progress_idx');`
  - 16: `select count(*) from pg_tables where schemaname='public' and tablename in ('industries','industry_stages','industry_stage_links','industry_companies','industry_facilities','industry_metrics','industry_risks');` [7]
  - 17: `select count(*) from pg_tables where schemaname='public' and tablename in ('chips_awards','recipient_aliases','chips_award_facilities','industry_review_queue','industry_audit','ingest_runs');` [6]
  - 18: `select to_regclass('public.dataset_snapshots');`
  - 19: `select to_regclass('public.macro_countries'), to_regclass('public.macro_indicators');`
  - 20: `select count(distinct proname) from pg_proc where proname in ('latest_messages','replace_13f_holdings','submit_org_assignment');` [3]
  - 21: `select count(*) from pg_policies where policyname in ('Authors manage own articles','Users see own application','Allow public inserts');` [0]
  - 22: `select count(*) from pg_indexes where schemaname='public' and indexname like 'ix_fk_%';` [≥164] and `select count(*) from pg_index where not indisvalid;` [0]
- **New migrations:**
  - 110000: `select id, public, file_size_limit from storage.buckets where id in ('community-images','documents');` [2 rows]
  - 120000: `select tgname from pg_trigger where tgname in ('org_members_guard_privileged','org_pitches_guard_workflow');` [2 rows]. Then a portfolio manager's browser-key `update org_members set role='executive'` should fail with 42501.
  - 130000: `select tablename, policyname, cmd from pg_policies where schemaname='public' and tablename in ('mock_portfolios','mock_trades','user_course_progress','user_learning_badges');` [SELECT only]
  - 131000: `select column_name from information_schema.columns where table_name='community_posts' and column_name='quoted_post_id';` [1 row]
  - 140000: `select indexdef from pg_indexes where indexname='org_positions_import_key';` [1 row]
  - 160000: `select (select count(*) from information_schema.columns where table_schema='public' and ((table_name='org_invites' and column_name in ('can_invite','accepted_by','accepted_at')) or (table_name='org_members' and column_name='can_invite'))), (select count(*) from pg_policies where schemaname='storage' and policyname like 'org members % org-uploads');` [4, 4]

## 3. Code-before-migration list (2.3)

These routes moved from the user client to `getAdminClient()`, each after its existing check. They are deployed now, so 120000 and 130000 are safe to apply after this deploy.

- **org_pitches workflow fields:**
  - `api/org/pitches/[pitchId]/stage`
  - `api/org/pitches/[pitchId]/advance`
  - `api/org/pitches/[pitchId]/deliverables` (with `addDeliverableDb`). The auto-advance now runs only for the pitch author or a manager.
- **org_members `is_active`:** `api/org/cohorts/[id]/lifecycle`.
- **Assignment status:** `api/org/assignments/[id]/submissions`, and the `api/org/assignments` PATCH.
- **Mock portfolio and learning:**
  - `api/mock-trades` POST
  - `api/mock-portfolio` POST
  - `api/learning/progress` POST
- **Partner:**
  - `api/partner/status` (new)
  - `api/admin/partner-applications*` (new, admin-gated)
- **Known effect of 120000:** the falsification route's `last_reaffirmed_at` write by a non-author, non-manager updates 0 rows. That route has no role check today (ORG-20).

## 4. Read-only reconciliation (PAR-3)

Live: 9 of 10 `is_partner = true` profiles have no active `partners` row.

```sql
select p.id, p.username, p.full_name, p.creator_tier, pa.status as partners_status
from public.profiles p
left join public.partners pa on pa.user_id = p.id
where p.is_partner = true
  and (pa.user_id is null or pa.status is distinct from 'active')
order by p.username;
```

Toggling a user off and on in the admin panel now creates the row.

## 5. Decisions waiting on the product owner

- **RET-1, free-plan limits:** how many watchlists and slots, and whether community is read-only. `requirePlan` is ready. Call-site TODO:
  - `api/watchlists` POST (list count)
  - `api/watchlists/[listId]/items` POST (slot count)
  - `api/community/posts` POST (read-only free tier)
  - `api/research/copilot` (no gate today)
- **ORG-19 / PLAT-4:** should `/council-rankings`, `/badges`, `/leaderboard*`, `/empire-ranking`, `/profile/[username]`, `/real-estate`, `/brokerages-integrations` and `/changelog` stay public?
- **PAR-4:** how manual ACH accounts get verified (micro-deposits or Plaid Auth). Until then they stay `pending_verification`.
- **ORG-7 behaviour change:** following the tier table, plain and Junior PMs can no longer create meetings, and only Senior PMs can publish others' notes, unless granted. Confirm.
- **ORG-4:** with the version index from pending file 20, two cohort members submitting the same assignment can clash. The fix is either per-person versions or a SECURITY DEFINER submit RPC.
- **PAR-11:** an editor notification channel. Edits to published articles are only logged today.
- **RET-18:** the trial based on account age is now 14 days (it was 7 in `trial.js`).
- **RET-10:** the reset starting cash is user-chosen ($1k to $10M). It could be fixed at $100k instead.
- **RET-14:** quiz answer keys are still sent to the browser for instant feedback. Grading is server-side.
- **RET-8:** Plaid holdings are one row per ticker per user, the live unique key, so the same ticker in two accounts is merged.
- **Sender domains:** `notifications@` / `newsletter@` / `support@` still use `ezanafinance.com`; check which domain is verified in Resend.

## 6. Found along the way (not in the audit)

- **Drift beyond the 22 files:** 58 older migrations each have 1 to 6 objects missing live, mostly indexes and public-read policies. Run `npm run check:schema-drift -- --print-missing-sql` and review.
- **Code reads objects that exist nowhere:**
  - tables `portfolio_daily_returns` (`api/portfolio/value-series`) and `positions` (`api/watchlist/holders`);
  - eight live-only RPCs not in the repo (`hub_lobbying_summary`, `hub_contracts_summary`, `lighthouse_latest`, `hub_lobbying_contracts`, `hub_lobbying_by_ticker`, `sonar_top_13f`, `politician_similar`, `profile_follower_count`).

## 7. Gates (on the final commit)

- **All exit 0:**
  - lint: `npm run lint`, `lint:css`, `lint:branding`, `check:copy`, `lint:arch` (0 errors)
  - `npm test`, including the new suites `test:middleware`, `test:retail-a`, `test:retail-b`, `test:org-a`, `test:org-b`, `test:partner`, `test:platform-qa`, and `test:rls` (27)
  - `next build` with CI's stub environment (Sentry upload errors are expected without a token)
- **Not run:** signed-in end-to-end. The Playwright journeys need `E2E_*` credentials and a running server.
