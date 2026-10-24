import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isActivePartner } from '@/lib/partner-access';
import { getActivePlan, getPlanTier } from '@/lib/subscription';
import { getReferralPlanOverride } from '@/lib/referrals-server';
import { getSonarEntitlements, describeDatasetAccess } from '@/lib/sonar/entitlements';
import { routeQuery } from '@/lib/sonar/router';
import { getIndustryRegistryCached } from '@/lib/sonar/industries';

const shownQueryFor = (route, query) =>
  route.understood?.display || route.understood?.corrected || query;
import { getTemplate } from '@/lib/sonar/templates';
import { runSweeps } from '@/lib/sonar/sweeps';
import { getExemplars } from '@/lib/sonar/exemplars';
import { composeBriefing } from '@/lib/sonar/composer';

/**
 * POST /api/sonar/v2 — template-driven Sonar briefings
 * (sonar-templates-spec.md). Body: { query, parentPingId? }.
 *
 * Route -> sweep -> compose -> render blocks. The query is classified into
 * one of 21 templates plus a fallback; the template's datasets are swept in
 * parallel with per-dataset timeouts; the composer writes strict JSON over
 * ONLY the swept rows with two few-shot exemplars; the server validates the
 * schema and every citation before anything reaches the client, and fills
 * chart data from the sweep so the model never types a chart number.
 *
 * Follow-ups: parentPingId chains sonar_threads rows and inherits the
 * parent's resolved entities. Every follow-up counts against the same daily
 * ping quota as a fresh ping (server-side, same sonar_queries ledger as v1).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DISCLAIMER =
  'Sonar synthesizes sourced research from Ezana datasets. Findings only, never financial advice.';

function startOfUtcDayISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/* ── chart + KPI resolution: numbers come from the sweep, never the model ── */

function resolveCharts(template, sweep) {
  const charts = [];
  for (const spec of template.charts) {
    const src = sweep[spec.source];
    if (!src || src.status !== 'ok' || !src.rows.length) continue; // hide, never fake
    if (spec.type === 'ranked_bar' || spec.type === 'donut') {
      const rows = src.rows
        .map((r) => ({
          label: r.ticker || r.recipient || r.client || r.name || r.member || r.question || '·',
          value:
            r.marketCap ?? r.totalUsd ?? r.valueUsd ?? r.value ?? r.holdersNow ?? r.odds ?? null,
        }))
        .filter((r) => Number.isFinite(Number(r.value)))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
      if (rows.length) charts.push({ ...spec, rows });
    } else if (spec.type === 'timeline') {
      const rows = src.rows
        .map((r) => ({
          date: r.tradedAt || r.filedAt || r.publishedAt || null,
          label: r.ticker || r.member || r.filer || r.question || '·',
          value: r.percentOfClass ?? r.odds ?? null,
        }))
        .filter((r) => r.date)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .slice(-12);
      if (rows.length) charts.push({ ...spec, rows });
    } else if (spec.type === 'line') {
      const rows = src.rows
        .map((r) => ({ label: r.ticker || r.label, value: r.changePct ?? r.price ?? null }))
        .filter((r) => Number.isFinite(Number(r.value)))
        .slice(0, 8);
      if (rows.length) charts.push({ ...spec, type: 'ranked_bar', rows });
    } else {
      /* relationship_graph and choropleth are stubbed render types: ship the
         rows and let the client show its stub note. */
      charts.push({ ...spec, rows: src.rows.slice(0, 10), stub: true });
    }
  }
  return charts;
}

function resolveKpis(briefing, sweep) {
  const get = (path) => {
    const [datasetId, ...rest] = String(path || '').split('.');
    let cur = sweep[datasetId]?.rows;
    for (const k of rest) {
      if (cur == null) return null;
      cur = Array.isArray(cur) && /^\d+$/.test(k) ? cur[Number(k)] : cur?.[k];
    }
    return cur ?? null;
  };
  const AGG = {
    'market.total_cap': (s) =>
      s.market?.rows?.reduce((t, r) => t + (Number(r.marketCap) || 0), 0) || null,
    'market.count': (s) => s.market?.rows?.length || null,
    'contracts.total': (s) =>
      s.contracts?.rows?.reduce((t, r) => t + (Number(r.totalUsd) || 0), 0) || null,
    'congress.count': (s) => s.congress?.rows?.length || null,
  };
  return (briefing?.kpis || [])
    .map((k) => {
      const value = AGG[k.value_ref] ? AGG[k.value_ref](sweep) : get(k.value_ref);
      return value == null ? null : { label: k.label, value, format: k.format || null };
    })
    .filter(Boolean)
    .slice(0, 6);
}

export const POST = withApiGuard(
  async (request, user) => {
    const body = await request.json().catch(() => ({}));
    const query = String(body?.query || '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (query.length < 2) {
      return NextResponse.json({ error: 'Type something to ping.' }, { status: 400 });
    }
    if (query.length > 300) {
      return NextResponse.json({ error: 'Keep pings under 300 characters.' }, { status: 400 });
    }
    const parentPingId = /^[0-9a-f-]{36}$/i.test(String(body?.parentPingId || ''))
      ? body.parentPingId
      : null;

    const admin = getAdminClient();
    const userClient = getUserClient();

    /* Quota and entitlements: the same ledger and matrix as Sonar v1, so a
       follow-up ping costs exactly one ping. */
    const [{ data: profile }, member, isPartner, { count: usedToday }, referralPlan] =
      await Promise.all([
        admin
          .from('profiles')
          .select('subscription_plan, subscription_status, one_time_plan')
          .eq('id', user.id)
          .maybeSingle(),
        getCurrentOrgMember(userClient).catch(() => null),
        isActivePartner(userClient, user).catch(() => false),
        admin
          .from('sonar_queries')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfUtcDayISO()),
        getReferralPlanOverride(admin, user.id),
      ]);
    const planTier = getPlanTier(getActivePlan(profile, referralPlan));
    const version = member ? 'org' : isPartner ? 'partner' : 'regular';
    const entitlements = getSonarEntitlements({
      planTier,
      version,
      isPartner,
      orgRole: member?.role || null,
    });
    const { locked } = describeDatasetAccess(entitlements);
    const used = usedToday || 0;
    if (used >= entitlements.dailyQueries) {
      return NextResponse.json({
        quotaExceeded: true,
        message: `You've used all ${entitlements.dailyQueries} Sonar pings for today.`,
        quota: { limit: entitlements.dailyQueries, used, remaining: 0 },
        disclaimer: DISCLAIMER,
      });
    }

    /* Follow-up context: the parent thread's resolved entities. */
    let parent = null;
    if (parentPingId) {
      try {
        const { data } = await admin
          .from('sonar_threads')
          .select('id, user_id, query, template, entities')
          .eq('id', parentPingId)
          .eq('user_id', user.id)
          .maybeSingle();
        parent = data || null;
      } catch {
        parent = null;
      }
    }

    /* Route -> sweep -> exemplars -> compose. */
    const route = await routeQuery(query, { parent });
    const template = getTemplate(route.template);
    const t0 = Date.now();
    const params = await template.sweepParams(route.entities, query);
    const sweep = await runSweeps(template.datasets, params);
    const sweepMs = Date.now() - t0;
    /* The Industry Layout's registry (structure plus approved sourced rows). */
    let industryLayout = null;
    if (route.template === 'industry_layout' && route.entities?.industryId) {
      const reg = await getIndustryRegistryCached(route.entities.industryId).catch(() => null);
      if (reg) {
        const { industry, ...rest } = reg;
        industryLayout = {
          kind: 'industry',
          name: shownQueryFor(route, query),
          industry: { id: industry.id, label: industry.label },
          registry: rest,
        };
      }
    }
    const exemplars = await getExemplars(admin, route.template);
    const t1 = Date.now();
    /* The composer reads the understood title, never the raw text. */
    const shownQuery = route.understood?.display || route.understood?.corrected || query;
    const composed = await composeBriefing({
      query: shownQuery,
      template: route.template,
      entities: route.entities,
      exemplars,
      sweep,
      briefSections: template.briefSections,
    });
    const composeMs = Date.now() - t1;

    const briefing = composed.briefing;
    const matches = template.datasets.map((id) => ({
      id,
      status: sweep[id]?.status || 'unwired',
      rows: (sweep[id]?.rows || []).slice(0, 5),
      count: sweep[id]?.rows?.length || 0,
    }));
    const followups = (
      briefing?.followups?.length
        ? briefing.followups
        : template.defaultFollowups.map((label) => ({ label, query: label }))
    ).slice(0, 4);

    /* Thread row (absent table degrades to a stateless follow-up). */
    let pingId = null;
    try {
      const { data: threadRow } = await admin
        .from('sonar_threads')
        .insert({
          user_id: user.id,
          parent_id: parent?.id || null,
          query,
          template: route.template,
          entities: route.entities,
          briefing: briefing || null,
        })
        .select('id')
        .maybeSingle();
      pingId = threadRow?.id || null;
    } catch {
      pingId = null;
    }

    /* Quota ledger (shared with v1). */
    await admin
      .from('sonar_queries')
      .insert({
        user_id: user.id,
        query_text: query,
        classification: `v2:${route.template}`,
        version,
        plan_tier: planTier,
        datasets_searched: template.datasets,
        grounded: Boolean(briefing),
      })
      .then(
        () => {},
        () => {},
      );

    console.log(`[timing] sonar:v2 ${route.template} sweep ${sweepMs}ms compose ${composeMs}ms`);

    return NextResponse.json({
      pingId,
      parentPingId: parent?.id || null,
      breadcrumb: parent ? [parent.query, shownQuery] : [shownQuery],
      understood: route.understood
        ? {
            display: route.understood.display,
            corrected: route.understood.corrected,
            corrections: route.understood.corrections,
            intent: route.understood.intent,
          }
        : null,
      industryLayout,
      template: route.template,
      templateLabel: template.label,
      routedBy: route.routedBy,
      entities: route.entities,
      headline: briefing?.headline || null,
      brief: briefing?.brief || [],
      kpis: briefing ? resolveKpis(briefing, sweep) : [],
      charts: resolveCharts(template, sweep),
      matchesOrder: briefing?.matches_order || template.datasets,
      matches,
      coverageGaps: briefing?.coverage_gaps || [],
      sources: composed.sources.map((s) => ({ id: s.id, dataset: s.dataset, row: s.row })),
      followups,
      empty: composed.empty,
      degraded: !briefing && !composed.empty ? true : undefined,
      validationErrors:
        process.env.NODE_ENV !== 'production' && composed.errors.length
          ? composed.errors
          : undefined,
      quota: {
        limit: entitlements.dailyQueries,
        used: used + 1,
        remaining: Math.max(0, entitlements.dailyQueries - used - 1),
      },
      locked,
      disclaimer: DISCLAIMER,
    });
  },
  { strict: true },
);
