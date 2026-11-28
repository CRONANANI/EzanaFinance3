import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, requireUser } from '@/lib/supabase';
import { cacheGet, cacheSet } from '@/lib/cache';
import {
  resolveSubject,
  runComposition,
  runResearchComposition,
  compositionText,
} from '@/lib/sonar/composer/execute';
import { resolveResearchAccess } from '@/lib/sonar/engine/access';
import { PUBLIC_ANALYTICS, analyticsDatasets } from '@/lib/sonar/composer/registry';
import {
  applyOwnershipAccess,
  unentitledOwnershipMode,
} from '@/lib/sonar/composer/ownership-preview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/sonar/composer (Nov 22 2026): the Research Composer's server side.
 *
 *   { action: 'resolve', subject: 'BlackRock' }
 *     200 { subject: { text, kind, id, name, eligible, period?, candidates? } }
 *     Resolves a subject to a 13F filer, a member of Congress or a company with its
 *     data-dependent limit. Cheap and public (guests compose too); cached an hour.
 *
 *   { action: 'run', attachments: [...] }
 *     200 { results: [...], text }
 *
 *   { action: 'run', version: 4, question, primary: { text }, attachments: [...] }
 *     200 { results, plan, text }
 *     4.0: the whole composition (queries, set operations, analyses on derived sets), run in
 *     dependency order. EzanaQL runs through the same validated path as /api/ezanaql/run,
 *     with the reader's id for any private dataset.
 *     Executes the valid analysis attachments with deterministic code (filed SEC figures, the
 *     13F book, estimated member holdings, the Quant Lab backtest engine). Signed-in readers
 *     only: a run reads price history and can take several seconds. The research run then
 *     reads `text` as the reader's attached material.
 *
 * Attachments are re-validated here; the client's statuses are never trusted.
 */
export const POST = withApiGuard(
  async (request) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }
    const admin = getAdminClient();
    if (body?.action === 'resolve') {
      const text = String(body.subject || '')
        .trim()
        .slice(0, 80);
      if (text.length < 2) return NextResponse.json({ subject: null });
      const key = `composer:subject:v1:${text.toLowerCase()}`;
      const hit = await cacheGet(key).catch(() => null);
      if (hit) return NextResponse.json({ subject: hit });
      const subject = await resolveSubject(text, admin);
      if (subject && subject.kind !== 'unresolved')
        await cacheSet(key, subject, 3600).catch(() => {});
      return NextResponse.json({ subject });
    }
    if (body?.action === 'run') {
      /* Optional session on this public route: a run needs one. */
      let user = null;
      try {
        ({ user } = await requireUser(request));
      } catch {
        user = null;
      }
      if (!user?.id) {
        return NextResponse.json({ error: 'Sign in to run research analyses.' }, { status: 401 });
      }
      /* Sonar 6.3: the same plan-dataset gate as the research route. An analytics
         attachment whose datasets the plan lacks is reported, never run. */
      const access = await resolveResearchAccess(request, admin);
      const entitled = new Set(access.entitlements?.datasets || []);
      const gated = (list) => {
        const locked = list.filter(
          (a) =>
            PUBLIC_ANALYTICS.has(a?.capability) &&
            analyticsDatasets(a).some((d) => !entitled.has(d)),
        );
        return {
          kept: list.filter((a) => !locked.includes(a)),
          locked: locked.map((a) => ({
            key: a.key || a.capability,
            capability: a.capability,
            status: 'validation_error',
            issues: [{ message: 'This analysis reads data your plan does not include.' }],
          })),
        };
      };
      const ownershipGate = (results) =>
        applyOwnershipAccess(
          { results },
          { entitlements: access.entitlements, mode: unentitledOwnershipMode() },
        ).composition.results;
      if (body.version === 4) {
        const g = gated(Array.isArray(body.attachments) ? body.attachments.slice(0, 8) : []);
        const attachments = g.kept;
        const primary =
          body.primary && typeof body.primary.text === 'string'
            ? { text: body.primary.text.trim().slice(0, 80) }
            : null;
        const { results, plan } = await runResearchComposition(
          {
            question: String(body.question || '').slice(0, 600),
            primary,
            attachments,
            userId: user.id,
          },
          admin,
        );
        const shown = [...ownershipGate(results), ...g.locked];
        return NextResponse.json({ results: shown, plan, text: compositionText(shown) });
      }
      const g = gated(Array.isArray(body.attachments) ? body.attachments.slice(0, 6) : []);
      const results = [...ownershipGate(await runComposition(g.kept, admin)), ...g.locked];
      return NextResponse.json({ results, text: compositionText(results) });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  },
  { requireAuth: false },
);
