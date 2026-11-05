import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { logOrgAction } from '@/lib/org-audit';
import {
  REPORT_KINDS,
  REPORT_STATUSES,
  REPORT_VISIBILITY,
  canEditReport,
  canReadReport,
  cleanSettings,
  defaultTitle,
  summarizeSnapshot,
} from '@/lib/org-sonar/reports';
import { REPORT_COLUMNS, attachNames, loadOrgViewer, orgUserIds } from '@/lib/org-sonar/server';
import { withNoEmDash } from '@/lib/text/no-em-dash-response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * GET /api/org/sonar-reports
 *   ?status=&kind=&ticker=&mine=1&pitchId=&collectionId=&challengeOf=&q=
 * The org research reports the caller can read (RLS decides), newest first.
 */
const GET_HANDLER = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const viewer = await loadOrgViewer(supabase);
    if (!viewer) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const sp = new URL(request.url).searchParams;

    let q = supabase
      .from('org_sonar_reports')
      .select(REPORT_COLUMNS)
      .eq('org_id', viewer.org_id)
      .order('updated_at', { ascending: false })
      .limit(200);
    const status = sp.get('status');
    if (REPORT_STATUSES.includes(status)) q = q.eq('status', status);
    const kind = sp.get('kind');
    if (REPORT_KINDS.includes(kind)) q = q.eq('kind', kind);
    const ticker = (sp.get('ticker') || '').toUpperCase().replace(/[^A-Z0-9.-]/g, '');
    if (ticker) q = q.eq('ticker', ticker.slice(0, 12));
    if (sp.get('mine') === '1') q = q.eq('author_id', viewer.user_id);
    const pitchId = sp.get('pitchId');
    if (pitchId && UUID.test(pitchId)) q = q.eq('pitch_id', pitchId);
    const challengeOf = sp.get('challengeOf');
    if (challengeOf && UUID.test(challengeOf)) q = q.eq('challenge_of', challengeOf);
    const collectionId = sp.get('collectionId');
    if (collectionId && UUID.test(collectionId)) {
      const { data: col } = await supabase
        .from('org_research_collections')
        .select('report_ids')
        .eq('id', collectionId)
        .eq('org_id', viewer.org_id)
        .maybeSingle();
      const ids = (col?.report_ids || []).filter((id) => UUID.test(id));
      if (!ids.length) return NextResponse.json({ reports: [], viewer: viewerOut(viewer) });
      q = q.in('id', ids);
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: 'Reports could not be loaded.' }, { status: 500 });
    let rows = data || [];
    const text = (sp.get('q') || '').trim().toLowerCase();
    if (text) {
      rows = rows.filter((r) =>
        `${r.title} ${r.question || ''} ${r.ticker || ''} ${r.summary?.conclusion || ''}`
          .toLowerCase()
          .includes(text),
      );
    }
    const reports = await attachNames(supabase, viewer.org_id, rows);
    return NextResponse.json({ reports, viewer: viewerOut(viewer) });
  },
  { requireAuth: true },
);

function viewerOut(viewer) {
  return {
    userId: viewer.user_id,
    role: viewer.role,
    teamId: viewer.team_id || null,
    canApprove: Boolean(viewer.canApprove),
  };
}

/* The kind of a saved run, read from what Sonar produced, never from the body. */
function kindOf(snapshot) {
  if (snapshot?.report?.challenge) return 'challenge';
  if (snapshot?.report?.memoKind === 'fund_fit') return 'fund_fit';
  return 'research';
}

/**
 * POST /api/org/sonar-reports
 *   { runId, reportId?, title?, visibility?, sharedWith?, pitchId?, challengeOf? }
 * Save a research run to the org: a new report, or (reportId) a new version
 * of one the caller may edit. The snapshot is read from the caller's own run
 * (sonar_research_runs, RLS: own rows) and must belong to this org.
 */
const POST_HANDLER = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const viewer = await loadOrgViewer(supabase);
    if (!viewer) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const body = await request.json().catch(() => null);
    const runId = String(body?.runId || '');
    if (!UUID.test(runId))
      return NextResponse.json({ error: 'Unknown research run.' }, { status: 400 });

    const { data: run } = await supabase
      .from('sonar_research_runs')
      .select('id, user_id, org_id, status, snapshot')
      .eq('id', runId)
      .maybeSingle();
    if (!run || run.user_id !== viewer.user_id) {
      return NextResponse.json({ error: 'Unknown research run.' }, { status: 404 });
    }
    if (run.org_id !== viewer.org_id || !run.snapshot) {
      return NextResponse.json(
        { error: 'This run was not made inside your organization, so it cannot be saved here.' },
        { status: 409 },
      );
    }
    const snapshot = run.snapshot;
    const summary = summarizeSnapshot(snapshot);
    const kind = kindOf(snapshot);
    const settings = cleanSettings(body || {});

    if (settings.pitch_id) {
      const { data: pitch } = await supabase
        .from('org_pitches')
        .select('id')
        .eq('id', settings.pitch_id)
        .eq('org_id', viewer.org_id)
        .maybeSingle();
      if (!pitch) settings.pitch_id = null;
    }
    if (settings.shared_with) {
      settings.shared_with = await orgUserIds(supabase, viewer.org_id, settings.shared_with);
    }

    /* A new version of an existing report. */
    if (body?.reportId) {
      if (!UUID.test(String(body.reportId)))
        return NextResponse.json({ error: 'Unknown report.' }, { status: 400 });
      const { data: report } = await supabase
        .from('org_sonar_reports')
        .select(REPORT_COLUMNS)
        .eq('id', body.reportId)
        .maybeSingle();
      if (!report || !canEditReport(report, viewer))
        return NextResponse.json(
          { error: 'You cannot add a version to that report.' },
          { status: 403 },
        );
      if (report.status === 'superseded')
        return NextResponse.json({ error: 'A superseded report is closed.' }, { status: 409 });
      if (report.kind !== kind)
        return NextResponse.json(
          { error: 'A new version has to be the same kind of research as the report.' },
          { status: 409 },
        );
      const { data: version, error: vErr } = await supabase
        .from('org_sonar_report_versions')
        .insert({
          report_id: report.id,
          org_id: report.org_id,
          version: report.current_version + 1,
          run_id: run.id,
          snapshot,
          summary,
          created_by: viewer.user_id,
        })
        .select('version')
        .single();
      if (vErr) return NextResponse.json({ error: 'The version was not saved.' }, { status: 500 });
      const patch = {
        current_version: version.version,
        summary,
        question: summary.question || report.question,
        ticker: summary.ticker || report.ticker,
        ...(report.status === 'draft' ? {} : { status: 'draft' }),
      };
      const { data: updated, error: uErr } = await supabase
        .from('org_sonar_reports')
        .update(patch)
        .eq('id', report.id)
        .select(REPORT_COLUMNS)
        .single();
      if (uErr) return NextResponse.json({ error: 'The report was not updated.' }, { status: 500 });
      return NextResponse.json({ report: updated, version: version.version });
    }

    /* A challenge inherits who can see the report it challenges. */
    let challengeOf = null;
    let inherit = {};
    if (kind === 'challenge' && body?.challengeOf && UUID.test(String(body.challengeOf))) {
      const { data: original } = await supabase
        .from('org_sonar_reports')
        .select(REPORT_COLUMNS)
        .eq('id', body.challengeOf)
        .maybeSingle();
      if (original && canReadReport(original, viewer)) {
        challengeOf = original.id;
        inherit = {
          visibility: original.visibility,
          shared_with: [...new Set([...(original.shared_with || []), original.author_id])],
          team_id: original.team_id,
          pitch_id: original.pitch_id,
        };
      }
    }

    const insert = {
      org_id: viewer.org_id,
      author_id: viewer.user_id,
      author_member_id: viewer.id,
      team_id: viewer.team_id || null,
      kind,
      title: settings.title || defaultTitle(summary, kind),
      question: summary.question || null,
      ticker: summary.ticker,
      sector: snapshot?.run?.researchScope?.subject?.sector || null,
      visibility: REPORT_VISIBILITY.includes(settings.visibility) ? settings.visibility : 'private',
      shared_with: settings.shared_with || [],
      status: 'draft',
      current_version: 1,
      summary,
      pitch_id: settings.pitch_id || null,
      challenge_of: challengeOf,
      ...(challengeOf ? inherit : {}),
    };
    if (insert.visibility === 'members' && !insert.shared_with.length)
      insert.visibility = 'private';

    const { data: report, error } = await supabase
      .from('org_sonar_reports')
      .insert(insert)
      .select(REPORT_COLUMNS)
      .single();
    if (error) return NextResponse.json({ error: 'The report was not saved.' }, { status: 500 });
    const { error: vErr } = await supabase.from('org_sonar_report_versions').insert({
      report_id: report.id,
      org_id: report.org_id,
      version: 1,
      run_id: run.id,
      snapshot,
      summary,
      created_by: viewer.user_id,
    });
    if (vErr) {
      await supabase.from('org_sonar_reports').delete().eq('id', report.id);
      return NextResponse.json({ error: 'The report was not saved.' }, { status: 500 });
    }
    if (isServerSupabaseConfigured()) {
      await logOrgAction(getAdminClient(), {
        orgId: viewer.org_id,
        actorId: viewer.user_id,
        action: 'sonar_report_saved',
        targetType: 'sonar_report',
        targetId: report.id,
        detail: { kind, ticker: report.ticker, runId: run.id, challengeOf },
      });
    }
    return NextResponse.json({ report });
  },
  { requireAuth: true },
);

export const GET = withNoEmDash(GET_HANDLER);
export const POST = withNoEmDash(POST_HANDLER);
