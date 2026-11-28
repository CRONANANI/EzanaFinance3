/**
 * Sonar for organizations: the Council Context Provider (OrgSonarContextProvider), server
 * only (Nov 28 2026).
 *
 * Loads exactly the council records one capability needs (context.js contextPlan) for the
 * member the server resolved from the session (getCurrentOrgMember). Every read:
 *   - goes through the caller's own client, so Supabase RLS decides what is visible
 *     (private drafts, team research, report versions, notes);
 *   - is also filtered by the verified org id, never by an id from the browser;
 *   - is limited in size, and never loads every document into one answer.
 * The service role is not used for reads. Nothing here writes.
 *
 * The answer itself is deterministic (intelligence/run.js); no model is called.
 */
import { getOrgPositionBook } from '@/lib/org-position-book';
import { contextPlan } from './intelligence/context';
import { runOrgCapability } from './intelligence/run';

const REPORT_COLS =
  'id, org_id, author_id, team_id, kind, title, ticker, sector, visibility, shared_with, status, current_version, approved_version, pitch_id, approved_at, created_at, updated_at';

async function rows(q) {
  const { data, error } = await q;
  return error || !data ? [] : data;
}

/** The frozen version a report was approved at (or its latest), read under RLS. */
async function reportVersion(supabase, orgId, report, which = 'approved') {
  if (!report) return null;
  const version =
    which === 'approved'
      ? report.approved_version || report.current_version
      : report.current_version;
  if (!version) return null;
  const { data } = await supabase
    .from('org_sonar_report_versions')
    .select('id, report_id, version, snapshot, created_at')
    .eq('org_id', orgId)
    .eq('report_id', report.id)
    .eq('version', version)
    .maybeSingle();
  return data || null;
}

const findingsOf = (snap) =>
  (snap?.report?.keyFindings || [])
    .map((f) => ({ id: f.id, text: f.text || f.claim || '' }))
    .filter((f) => f.text);

/**
 * Load the context for `intent` and run the capability.
 * @param supabase  the caller's client (getUserClient)
 * @param member    the server-resolved active member
 * @param intent    parseOrgIntent() result (capability may come from a validated attachment)
 * @param params    validated attachment params
 */
export async function runCouncilResearch(
  supabase,
  member,
  intent,
  params = {},
  { removed = [], now = Date.now() } = {},
) {
  const orgId = member.org_id;
  const plan = contextPlan(intent, member, { removed });
  const want = new Set(plan.sources);
  const ctx = { indicators: plan.indicators };
  const tickers = intent.tickers || [];

  const tasks = [];
  if (want.has('positions'))
    tasks.push(getOrgPositionBook(supabase, orgId).then((b) => (ctx.positions = b)));
  if (want.has('ips'))
    tasks.push(
      rows(
        supabase
          .from('org_ips_rules')
          .select('id, rule_type, rule_value, label, is_active')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .limit(100),
      ).then((r) => (ctx.ips = r)),
    );
  if (want.has('flags'))
    tasks.push(
      rows(
        supabase
          .from('org_position_flags')
          .select('id, ticker, flag_color, subject, status, created_at')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(100),
      ).then((r) => (ctx.flags = r)),
    );
  if (want.has('reports')) {
    let q = supabase
      .from('org_sonar_reports')
      .select(REPORT_COLS)
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(300);
    if (tickers.length && intent.capability === 'org-research-memory') q = q.in('ticker', tickers);
    tasks.push(rows(q).then((r) => (ctx.reports = r)));
  }
  if (want.has('notes'))
    tasks.push(
      rows(
        supabase
          .from('org_research_notes')
          .select(
            'id, title, ticker, sector, visibility, team_id, author_id, created_at, updated_at',
          )
          .eq('org_id', orgId)
          .order('updated_at', { ascending: false })
          .limit(300),
      ).then((r) => (ctx.notes = r)),
    );
  if (want.has('pitches') || want.has('pitch'))
    tasks.push(
      rows(
        supabase
          .from('org_pitches')
          .select(
            'id, org_id, ticker, company_name, analyst_member_id, team_id, stage, decision, ic_meeting_id, created_at',
          )
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(300),
      ).then((r) => (ctx.pitches = r)),
    );
  if (want.has('coverage'))
    tasks.push(
      rows(
        supabase
          .from('org_sector_coverage')
          .select('member_id, sector, is_primary')
          .eq('org_id', orgId),
      ).then((r) => (ctx.coverage = r)),
    );
  if (want.has('members'))
    tasks.push(
      rows(
        supabase
          .from('org_members')
          .select('id, display_name, role, team_id, is_active')
          .eq('org_id', orgId)
          .eq('is_active', true),
      ).then((r) => (ctx.members = r)),
    );
  if (want.has('assignments'))
    tasks.push(
      rows(
        supabase
          .from('org_assignments')
          .select('id, title, ticker, status, assigned_to')
          .eq('org_id', orgId)
          .limit(300),
      ).then((r) => (ctx.assignments = r)),
    );
  if (want.has('meetings'))
    tasks.push(
      rows(
        supabase
          .from('org_meetings')
          .select('*')
          .eq('org_id', orgId)
          .order('scheduled_at', { ascending: true })
          .limit(200),
      ).then((r) => (ctx.meetings = r)),
    );
  await Promise.all(tasks);

  /* One pitch: chosen explicitly, else the newest readable pitch on the question's ticker. */
  if (want.has('pitch')) {
    const pick = params.pitchId
      ? (ctx.pitches || []).find((p) => p.id === params.pitchId)
      : (ctx.pitches || []).find((p) => tickers.includes(String(p.ticker || '').toUpperCase()));
    if (pick) {
      const { data } = await supabase
        .from('org_pitches')
        .select('*')
        .eq('org_id', orgId)
        .eq('id', pick.id)
        .maybeSingle();
      ctx.pitch = data || null;
      const linked = (ctx.reports || [])
        .filter((r) => r.pitch_id === pick.id)
        .sort((a, b) => (b.status === 'approved') - (a.status === 'approved'))[0];
      if (linked) {
        const v = await reportVersion(supabase, orgId, linked);
        ctx.pitchReport = v ? { ...linked, snapshot: v.snapshot } : null;
        if (v) ctx.citedReports = [linked];
      }
    }
  }

  if (intent.capability === 'org-meeting-briefing') {
    const list = ctx.meetings || [];
    ctx.meeting = params.meetingId
      ? list.find((m) => m.id === params.meetingId)
      : list.find((m) => m.scheduled_at && Date.parse(m.scheduled_at) >= now) || null;
  }

  if (intent.capability === 'org-research-memory') {
    const pool = (ctx.reports || []).filter(
      (r) => r.status === 'approved' || r.status === 'superseded',
    );
    const orig = params.reportId
      ? pool.find((r) => r.id === params.reportId)
      : pool.sort(
          (a, b) =>
            Date.parse(a.approved_at || a.created_at) - Date.parse(b.approved_at || b.created_at),
        )[0];
    if (orig) {
      const v = await reportVersion(supabase, orgId, orig);
      if (v)
        ctx.originalVersion = {
          reportId: orig.id,
          version: v.version,
          createdAt: orig.approved_at || v.created_at,
          findings: findingsOf(v.snapshot),
          assumptions: v.snapshot?.report?.assumptions || [],
        };
      const newer = (ctx.reports || [])
        .filter((r) => r.id !== orig.id && r.ticker === orig.ticker && r.status === 'approved')
        .sort((a, b) => Date.parse(b.approved_at) - Date.parse(a.approved_at))[0];
      if (newer) {
        const nv = await reportVersion(supabase, orgId, newer);
        ctx.currentEvidence = { asOf: newer.approved_at, findings: findingsOf(nv?.snapshot) };
      }
      ctx.citedReports = [orig, newer].filter(Boolean);
    }
  }

  if (intent.capability === 'org-policy-observations' && intent.scenario?.ticker) {
    ctx.scenarioSector = params.sector || null;
    if (params.amountUsd != null) intent.scenario.amountUsd = params.amountUsd;
  }

  const result = runOrgCapability(intent, ctx, { now, staleDays: params.staleDays });
  return {
    plan: { indicators: plan.indicators, removed: plan.removed, cacheKey: plan.cacheKey },
    result,
  };
}
