import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { getClientIp } from '@/lib/client-ip';
import { withTimeout } from '@/lib/with-timeout';
import { reservePing, reserveOrgDeep, completePing, failPing } from '@/lib/sonar/quota';
import { defaultOrgPool, budgetMessage } from '@/lib/org-sonar/budget';
import { isFundFitQuestion } from '@/lib/org-sonar/fund-fit';
import { loadFundContext } from '@/lib/org-sonar/fund-context';
import { canReadReport } from '@/lib/org-sonar/reports';
import { hashIp, DISCLAIMER } from '@/lib/sonar/landing-pipeline';
import {
  GUEST_LIMIT,
  guestSecret,
  readGuestCount,
  guestCookieHeader,
  refundToken,
} from '@/lib/sonar/guest-cookie';
import { resolveResearchAccess, clampDepth } from '@/lib/sonar/engine/access';
import { runResearch, DEPTH_PROFILES } from '@/lib/sonar/engine/engine';
import { recordRun } from '@/lib/sonar/engine/telemetry';
import {
  deepResearchEnabled,
  deepResearchForGuests,
  standardResearchEnabled,
} from '@/lib/sonar/deep-research';
import { classifyResearchMode, coverageFromPlan } from '@/lib/sonar/research-mode';
import { logModeEvent, fromClassification } from '@/lib/sonar/mode-events';
import { SONAR_QUERY_MAX } from '@/lib/sonar/limits';
import { rememberRun } from '@/lib/sonar/engine/memory';
import { EMPTY_RESEARCH_STATE, reduceEvent } from '@/lib/sonar/research-state';
import { snapshotFromState } from '@/lib/org-sonar/reports';

import { withNoEmDash } from '@/lib/text/no-em-dash-response';
/**
 * POST /api/sonar/research. Sonar research engine v3, streamed
 * (engine v3, Section 7). Body: { query, depth?, noCorrect?, force? }.
 *
 * Responds with Server-Sent Events:
 *   plan           phase 1: understanding, subject, research spec, plan (fast)
 *   stage          the stage that actually started
 *   task           each evidence task: running, done (items), timeout, failed
 *   panel          a dossier payload as soon as its task lands
 *   memory         prior research recalled for this subject
 *   evidence       what was retrieved and selected, and why
 *   analysis       calculated metrics and charts (only charts with data)
 *   relationships  observed and inferred relationships, and paths
 *   findings       the validated report and the rendered brief
 *   report         the complete research run
 *   done           { runId, remaining, org? }    or    error { message, refund? }
 *
 * The same guards as /api/sonar/landing-query, in the same order: rate limit,
 * input contract, guest cookie, then reserve_sonar_ping BEFORE any spend.
 * Members are capped by their plan's daily queries and limited to their
 * plan's datasets and research depth. A run is charged only if it produced a
 * report with a conclusion or findings; otherwise the reservation is released
 * and a guest receives a signed refund token for the cookie.
 *
 * Off by default: SONAR_ENGINE_V3=true enables it.
 *
 * Deep research mode (Nov 2026): a ping that Sonar recognised as a research
 * assignment, and that the visitor chose to run deeply, posts here with
 * { mode: 'deep' }. That path is on whatever SONAR_ENGINE_V3 says (turn it
 * off with SONAR_DEEP_RESEARCH=false), always runs at deep depth with every
 * dataset (the same data a quick ping shows anyone), and counts as one ping.
 * Since Nov 2026 (research modes) deep research needs a free account:
 * guests get the sign-up gate unless SONAR_DEEP_GUESTS=true, and members are
 * capped per day by their plan (entitlements.deepRunsPerDay, enforced in
 * reserve_sonar_ping_deep; 429 when reached).
 *
 * Standard research (Nov 2026): a question the research-mode classifier
 * rated 'standard' posts here with { mode: 'standard' }, whatever
 * SONAR_ENGINE_V3 says (SONAR_STANDARD_RESEARCH=false turns it off). It runs
 * at standard depth on the user's entitled datasets, counts as one ping and
 * guests may use it within their free pings. If the real plan leaves out a
 * kind of evidence the question asked for, a `coverage` event says so and
 * the UI offers Go deeper.
 *
 * Sonar for organizations (Nov 2026): an org member's run folds every event
 * into the same state the browser builds (lib/sonar/research-state.js) and
 * keeps it on sonar_research_runs (org_id, snapshot), so the analyst can
 * save it to the org as a report (POST /api/org/sonar-reports) from the run
 * itself; done carries org: { canSave: true }.
 *
 * Also for org members, deep runs only: { fundFit: true } (or a question
 * like "Should our fund invest in NVIDIA?") answers for the fund, against
 * its mandate and IPS, read here from the org's own tables; and
 * { challenge: { reportId } } re-runs a saved report's question with its
 * conclusion as the thing to test. The conclusion and the question come
 * from the report (which the caller must be able to read), never the body.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* Deep research writes for up to about three minutes. */
export const maxDuration = 300;

const DEPTHS = new Set(['quick', 'standard', 'deep']);
const FORCE_KINDS = new Set(['ticker', 'country', 'industry', 'sector', 'state_province', 'theme']);

const POST_HANDLER = withApiGuard(
  async (request) => {
    const startedAt = Date.now();
    const body = await request.json().catch(() => ({}));
    const deepMode = body?.mode === 'deep' && deepResearchEnabled();
    const standardMode = !deepMode && body?.mode === 'standard' && standardResearchEnabled();
    if (process.env.SONAR_ENGINE_V3 !== 'true' && !deepMode && !standardMode) {
      return NextResponse.json({ error: 'Not available.' }, { status: 404 });
    }
    const query = String(body?.query || '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (query.length < 2)
      return NextResponse.json({ error: 'Type something to research.' }, { status: 400 });
    if (query.length > SONAR_QUERY_MAX)
      return NextResponse.json(
        { error: `Keep questions under ${SONAR_QUERY_MAX} characters.` },
        { status: 400 },
      );

    const admin = getAdminClient();
    const access = await resolveResearchAccess(request, admin);
    const isGuest = !access.user;
    const used = isGuest ? readGuestCount(request) : 0;
    const ipHash = hashIp(getClientIp(request) || 'unknown', guestSecret());
    /* The classification travels with every event this route logs, and the
       standard run's coverage check reads the evidence it asked for. Pure
       and fast (no I/O). */
    let mode = null;
    try {
      mode = deepMode || standardMode ? classifyResearchMode(query, { coverage: false }) : null;
    } catch {
      mode = null;
    }
    const logEvent = (action, extra = {}) =>
      mode
        ? withTimeout(
            logModeEvent(admin, {
              ...fromClassification(mode),
              query,
              action,
              userId: access.user?.id || null,
              ipHash: isGuest ? ipHash : null,
              ...extra,
            }),
            600,
            'mode-event',
          )
        : Promise.resolve(null);
    if (deepMode && isGuest && !deepResearchForGuests()) {
      await logEvent('signup_gate', { ranMode: null });
      return NextResponse.json({
        gate: true,
        signup: true,
        remaining: null,
        message: 'Deep research needs a free account. Create one to run it.',
      });
    }
    if (isGuest && used >= GUEST_LIMIT) {
      return NextResponse.json({
        gate: true,
        remaining: 0,
        message: 'You have used your 5 free pings. Create a free account to keep going.',
      });
    }
    const depth = deepMode
      ? 'deep'
      : standardMode
        ? 'standard'
        : clampDepth(DEPTHS.has(body?.depth) ? body.depth : access.maxDepth, access.maxDepth);

    /* Sonar for organizations (Nov 2026): an org member's deep run draws on
       the org's pooled monthly budget (lib/org-sonar/budget.js). */
    const orgDeep = deepMode && !isGuest && Boolean(access.scope?.orgId);
    const memberReserve = () =>
      reservePing(admin, {
        userId: access.user?.id || null,
        limit: isGuest ? null : access.entitlements.dailyQueries,
        ipHash: isGuest ? ipHash : null,
        ipLimit: isGuest
          ? Math.max(GUEST_LIMIT, Number(process.env.SONAR_GUEST_IP_DAILY_CAP) || 20)
          : null,
        isGuest,
        query,
        version: `research${deepMode ? ':deep' : standardMode ? ':standard' : ''}:${access.version}`,
        planTier: access.planTier,
        /* A member's daily cap on deep research runs (reserve_sonar_ping_deep). */
        deepLimit: deepMode && !isGuest ? access.entitlements.deepRunsPerDay : null,
      });
    const reservation = await withTimeout(
      orgDeep
        ? reserveOrgDeep(admin, {
            userId: access.user.id,
            orgId: access.scope.orgId,
            limit: access.entitlements.dailyQueries,
            query,
            version: `research:deep:${access.version}`,
            planTier: access.planTier,
            defaultPool: defaultOrgPool(),
            fallbackDeepLimit: access.entitlements.deepRunsPerDay,
          }).then((r) => (!r.ok && r.reason === 'not_member' ? memberReserve() : r))
        : memberReserve(),
      1500,
      'reserve',
    );
    const res = reservation.ok ? reservation.value : { ok: false, reason: 'error' };
    if (!res.ok && (res.reason === 'org_pool' || res.reason === 'org_allocation')) {
      await logEvent('deep_quota', { ranMode: null, details: { used: res.orgUsed, org: true } });
      return NextResponse.json(
        {
          error: budgetMessage(res.reason, { pool: res.pool, allocation: res.allocation }),
          reason: res.reason,
          standardAvailable: standardResearchEnabled(),
        },
        { status: 429 },
      );
    }
    if (!res.ok && res.reason === 'deep_quota') {
      await logEvent('deep_quota', { ranMode: null, details: { used: res.used } });
      return NextResponse.json(
        {
          error:
            'You\u2019ve used today\u2019s deep research runs. They reset at midnight UTC. A standard answer is still available.',
          reason: 'deep_quota',
          standardAvailable: standardResearchEnabled(),
        },
        { status: 429 },
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            res.reason === 'quota'
              ? 'You have used today’s research runs. They reset at midnight UTC.'
              : 'That research run did not start. Try again in a moment.',
        },
        { status: res.reason === 'error' ? 503 : 429 },
      );
    }

    /* Sonar for organizations: fund fit and challenge runs (deep, org only). */
    const orgId = access.scope?.orgId || null;
    let fund = null;
    let challenge = null;
    let runQuery = query;
    if (deepMode && orgId && body?.challenge?.reportId) {
      const target = await withTimeout(
        loadChallengeTarget(admin, String(body.challenge.reportId), access.user.id, orgId),
        1500,
        'challenge',
      );
      const t = target.ok ? target.value : null;
      if (!t) {
        await withTimeout(failPing(admin, res), 800, 'ledger-fail');
        return NextResponse.json(
          { error: 'That report cannot be challenged from here. Nothing was spent.' },
          { status: 404 },
        );
      }
      challenge = { claim: t.claim, reportId: t.id };
      runQuery = t.question;
      if (t.kind === 'fund_fit' || isFundFitQuestion(runQuery)) {
        const f = await withTimeout(loadFundContext(admin, orgId), 1500, 'fund');
        fund = f.ok ? f.value : null;
      }
    } else if (deepMode && orgId && (body?.fundFit === true || isFundFitQuestion(query))) {
      const f = await withTimeout(loadFundContext(admin, orgId), 1500, 'fund');
      fund = f.ok ? f.value : null;
    }

    const f = body?.force;
    const force =
      f && FORCE_KINDS.has(f.kind) && typeof f.id === 'string' && f.id.length <= 60
        ? {
            kind: f.kind,
            id: f.id,
            label: typeof f.label === 'string' ? f.label.slice(0, 80) : f.id,
            surface: typeof f.surface === 'string' ? f.surface.slice(0, 60) : null,
          }
        : null;

    const runId = crypto.randomUUID();
    const abort = new AbortController();
    request.signal?.addEventListener?.('abort', () => abort.abort());
    const encoder = new TextEncoder();
    let settled = false;

    const stream = new ReadableStream({
      async start(controller) {
        let open = true;
        const send = (event, data) => {
          if (!open) return;
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
            );
          } catch {
            open = false;
          }
        };
        const beat = setInterval(() => {
          if (!open) return;
          try {
            controller.enqueue(encoder.encode(': keep-alive\n\n'));
          } catch {
            open = false;
          }
        }, 10_000);

        let run = null;
        /* An org member's run keeps the state the analyst saw, to save it. */
        let snap = orgId ? EMPTY_RESEARCH_STATE : null;
        try {
          run = await runResearch(runQuery, {
            admin,
            runId,
            depth,
            deadlineAt:
              startedAt + Math.min(DEPTH_PROFILES[depth].budgetMs, (maxDuration - 6) * 1000),
            /* Deep mode reads every dataset, as a quick ping does for anyone. */
            entitledDatasets: deepMode ? null : access.entitlements.datasets,
            /* A standard run whose real plan leaves out evidence the question
               asked for says so right after the plan (never escalates). */
            emit: (event, data) => {
              send(event, data);
              if (snap) snap = reduceEvent(snap, [event, data]);
              if (event === 'plan' && standardMode && mode?.requestedFamilies?.length) {
                const cov = coverageFromPlan(data?.plan, mode.requestedFamilies);
                if (cov.incomplete) {
                  send('coverage', { ...cov, goDeeper: 'deep' });
                  if (snap) snap = reduceEvent(snap, ['coverage', { ...cov, goDeeper: 'deep' }]);
                }
              }
            },
            signal: abort.signal,
            scope: access.scope,
            noCorrect: body?.noCorrect === true,
            force,
            fund,
            challenge,
          });
        } catch (e) {
          console.error('[sonar/research] run failed', e?.name);
        }

        const answered = Boolean(run && (run.executiveConclusion || run.keyFindings?.length));
        /* Charge exactly once: complete on an answer, release otherwise. */
        if (!settled) {
          settled = true;
          if (answered) {
            await withTimeout(
              completePing(admin, res, {
                classification: run.researchScope?.domains?.[0]?.id || null,
                datasets_searched: run.methodology?.plan?.tasks?.map((t) => t.source) || [],
                grounded: true,
              }),
              800,
              'ledger',
            );
          } else {
            await withTimeout(failPing(admin, res), 800, 'ledger-fail');
          }
        }
        const snapshot = answered && snap ? snapshotFromState(snap) : null;
        let saved = false;
        if (run) {
          const tele = await withTimeout(
            Promise.all([
              recordRun(admin, run, {
                queryId: res.id || null,
                userId: access.user?.id || null,
                ipHash: isGuest ? ipHash : null,
                status: answered
                  ? run.researchMetadata?.partial
                    ? 'partial'
                    : 'complete'
                  : 'failed',
                orgId,
                snapshot,
              }),
              answered ? rememberRun(admin, run, { scope: 'public' }) : null,
            ]),
            snapshot ? 4000 : 1500,
            'telemetry',
          );
          saved = Boolean(snapshot && tele.ok && tele.value?.[0]?.snapshotStored);
        }
        if (answered) {
          send('done', {
            runId,
            remaining: isGuest ? Math.max(0, GUEST_LIMIT - used - 1) : null,
            disclaimer: DISCLAIMER,
            org: saved ? { canSave: true, runId, challengeOf: challenge?.reportId || null } : null,
          });
        } else {
          send('error', {
            runId,
            message: abort.signal.aborted
              ? 'Research cancelled. Nothing was spent.'
              : 'That research run did not complete. Nothing was spent.',
            refund: isGuest ? refundToken(runId, used) : null,
          });
        }
        clearInterval(beat);
        open = false;
        try {
          controller.close();
        } catch {
          /* already closed by the client */
        }
      },
      cancel() {
        abort.abort();
      },
    });

    const headers = {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Research-Run': runId,
    };
    /* A guest's count goes up when the run starts; a failed run's refund
       token puts it back (POST /api/sonar/research/refund). */
    if (isGuest) headers['Set-Cookie'] = guestCookieHeader(used + 1);
    return new Response(stream, { status: 200, headers });
  },
  { requireAuth: false, strict: true },
);

/**
 * The report a challenge run tests: readable by the caller (the same rule
 * as RLS, lib/org-sonar/reports.js canReadReport), in the caller's org.
 * Returns { id, kind, question, claim } or null.
 */
async function loadChallengeTarget(admin, reportId, userId, orgId) {
  if (!/^[0-9a-f-]{36}$/i.test(reportId)) return null;
  const [{ data: report }, { data: viewer }] = await Promise.all([
    admin
      .from('org_sonar_reports')
      .select(
        'id, org_id, author_id, team_id, visibility, shared_with, status, kind, question, summary',
      )
      .eq('id', reportId)
      .maybeSingle(),
    admin
      .from('org_members')
      .select('user_id, org_id, role, team_id, is_active')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);
  if (!report || !viewer || !canReadReport(report, viewer)) return null;
  if (report.kind === 'challenge') return null;
  const claim = String(report.summary?.conclusion || '').trim();
  const question = String(report.question || report.summary?.question || '').trim();
  if (!claim || question.length < 2) return null;
  return { id: report.id, kind: report.kind, question: question.slice(0, 600), claim };
}

/* No em dashes in anything this route returns (src/lib/text/em-dash.js). */
export const POST = withNoEmDash(POST_HANDLER);
