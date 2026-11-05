import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { getClientIp } from '@/lib/client-ip';
import { withTimeout } from '@/lib/with-timeout';
import { reservePing, completePing, failPing } from '@/lib/sonar/quota';
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
 *   done           { runId, remaining }    or    error { message, refund? }
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

    const reservation = await withTimeout(
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
      }),
      1500,
      'reserve',
    );
    const res = reservation.ok ? reservation.value : { ok: false, reason: 'error' };
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
        try {
          run = await runResearch(query, {
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
              if (event === 'plan' && standardMode && mode?.requestedFamilies?.length) {
                const cov = coverageFromPlan(data?.plan, mode.requestedFamilies);
                if (cov.incomplete) send('coverage', { ...cov, goDeeper: 'deep' });
              }
            },
            signal: abort.signal,
            scope: access.scope,
            noCorrect: body?.noCorrect === true,
            force,
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
        if (run) {
          await withTimeout(
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
              }),
              answered ? rememberRun(admin, run, { scope: 'public' }) : null,
            ]),
            1500,
            'telemetry',
          );
        }
        if (answered) {
          send('done', {
            runId,
            remaining: isGuest ? Math.max(0, GUEST_LIMIT - used - 1) : null,
            disclaimer: DISCLAIMER,
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

/* No em dashes in anything this route returns (src/lib/text/em-dash.js). */
export const POST = withNoEmDash(POST_HANDLER);
