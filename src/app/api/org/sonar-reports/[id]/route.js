import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { logOrgAction } from '@/lib/org-audit';
import {
  anchorsOf,
  canEditReport,
  canTransition,
  cleanSettings,
  isManager,
} from '@/lib/org-sonar/reports';
import {
  REPORT_COLUMNS,
  attachNames,
  loadOrgViewer,
  orgUserIds,
  viewerRights,
} from '@/lib/org-sonar/server';
import { withNoEmDash } from '@/lib/text/no-em-dash-response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID = /^[0-9a-f-]{36}$/i;

async function loadReport(supabase, id) {
  if (!UUID.test(String(id || ''))) return null;
  const { data } = await supabase
    .from('org_sonar_reports')
    .select(REPORT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  return data || null;
}

/**
 * GET /api/org/sonar-reports/:id?v=<version>
 * The report, its versions, the snapshot of one version (the current one by
 * default), what it is linked to, the challenges against it and the
 * viewer's rights. RLS returns nothing for a report the caller cannot read.
 */
const GET_HANDLER = withApiGuard(
  async (request, _user, { params }) => {
    const supabase = getUserClient();
    const viewer = await loadOrgViewer(supabase);
    if (!viewer) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const report = await loadReport(supabase, params?.id);
    if (!report) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });

    const vParam = Number(new URL(request.url).searchParams.get('v'));
    const wanted =
      Number.isInteger(vParam) && vParam > 0 && vParam <= report.current_version
        ? vParam
        : report.current_version;

    const [versions, snap, challenges, original, pitch, collections] = await Promise.all([
      supabase
        .from('org_sonar_report_versions')
        .select('version, run_id, summary, created_by, created_at')
        .eq('report_id', report.id)
        .order('version', { ascending: false }),
      supabase
        .from('org_sonar_report_versions')
        .select('version, snapshot, created_at')
        .eq('report_id', report.id)
        .eq('version', wanted)
        .maybeSingle(),
      supabase
        .from('org_sonar_reports')
        .select(REPORT_COLUMNS)
        .eq('challenge_of', report.id)
        .order('created_at', { ascending: false }),
      report.challenge_of
        ? supabase
            .from('org_sonar_reports')
            .select(REPORT_COLUMNS)
            .eq('id', report.challenge_of)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      report.pitch_id
        ? supabase
            .from('org_pitches')
            .select('id, ticker, company_name, stage, status')
            .eq('id', report.pitch_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('org_research_collections')
        .select('id, name, owner_id, report_ids')
        .eq('org_id', viewer.org_id)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    const [named] = await attachNames(supabase, viewer.org_id, [report]);
    const namedChallenges = await attachNames(supabase, viewer.org_id, challenges.data || []);
    const cols = collections.data || [];
    return NextResponse.json({
      report: named,
      versions: versions.data || [],
      version: snap.data?.version || null,
      snapshot: snap.data?.snapshot || null,
      anchors: anchorsOf(snap.data?.snapshot),
      challenges: namedChallenges,
      original: original.data || null,
      pitch: pitch.data || null,
      collections: cols
        .filter((c) => (c.report_ids || []).includes(report.id))
        .map((c) => ({ id: c.id, name: c.name })),
      myCollections: cols
        .filter((c) => c.owner_id === viewer.user_id || isManager(viewer))
        .map((c) => ({ id: c.id, name: c.name, has: (c.report_ids || []).includes(report.id) })),
      rights: viewerRights(report, viewer),
      viewer: { userId: viewer.user_id, role: viewer.role, canApprove: viewer.canApprove },
    });
  },
  { requireAuth: true },
);

/**
 * PATCH /api/org/sonar-reports/:id
 *   { status?, reviewNote?, title?, visibility?, sharedWith?, pitchId?,
 *     collectionId?, inCollection? }
 * Status moves follow canTransition (and the database guard); settings need
 * the author or a manager; filing in a collection needs the collection's
 * owner or a manager.
 */
const PATCH_HANDLER = withApiGuard(
  async (request, _user, { params }) => {
    const supabase = getUserClient();
    const viewer = await loadOrgViewer(supabase);
    if (!viewer) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const report = await loadReport(supabase, params?.id);
    if (!report) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    const body = (await request.json().catch(() => null)) || {};

    /* File in (or take out of) a Research Library collection. */
    if (body.collectionId) {
      if (!UUID.test(String(body.collectionId)))
        return NextResponse.json({ error: 'Unknown collection.' }, { status: 400 });
      const { data: col } = await supabase
        .from('org_research_collections')
        .select('id, owner_id, report_ids')
        .eq('id', body.collectionId)
        .eq('org_id', viewer.org_id)
        .maybeSingle();
      if (!col) return NextResponse.json({ error: 'Unknown collection.' }, { status: 404 });
      if (col.owner_id !== viewer.user_id && !isManager(viewer))
        return NextResponse.json(
          { error: 'Only the collection owner can file in it.' },
          { status: 403 },
        );
      const ids = new Set(col.report_ids || []);
      if (body.inCollection === false) ids.delete(report.id);
      else ids.add(report.id);
      const { error } = await supabase
        .from('org_research_collections')
        .update({ report_ids: [...ids] })
        .eq('id', col.id);
      if (error)
        return NextResponse.json({ error: 'The collection was not updated.' }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const patch = {};
    if (body.status) {
      const t = canTransition(report, body.status, viewer, { canApprove: viewer.canApprove });
      if (!t.ok) return NextResponse.json({ error: t.reason }, { status: 403 });
      patch.status = body.status;
      if (typeof body.reviewNote === 'string') {
        patch.review_note = body.reviewNote.trim().slice(0, 2000) || null;
      }
    }
    const settings = cleanSettings(body);
    if (Object.keys(settings).length) {
      if (!canEditReport(report, viewer))
        return NextResponse.json(
          { error: 'Only the author or a manager can change this report.' },
          { status: 403 },
        );
      if (settings.shared_with)
        settings.shared_with = await orgUserIds(supabase, viewer.org_id, settings.shared_with);
      if (settings.pitch_id) {
        const { data: pitch } = await supabase
          .from('org_pitches')
          .select('id')
          .eq('id', settings.pitch_id)
          .eq('org_id', viewer.org_id)
          .maybeSingle();
        if (!pitch) return NextResponse.json({ error: 'Unknown pitch.' }, { status: 400 });
      }
      Object.assign(patch, settings);
      const vis = patch.visibility || report.visibility;
      const shared = patch.shared_with || report.shared_with || [];
      if (vis === 'members' && !shared.length)
        return NextResponse.json(
          { error: 'Choose at least one member to share with.' },
          { status: 400 },
        );
    }
    if (!Object.keys(patch).length) return NextResponse.json({ report });

    const { data: updated, error } = await supabase
      .from('org_sonar_reports')
      .update(patch)
      .eq('id', report.id)
      .select(REPORT_COLUMNS)
      .single();
    if (error) {
      return NextResponse.json(
        { error: error.code === '42501' ? error.message : 'The report was not updated.' },
        { status: error.code === '42501' ? 403 : 500 },
      );
    }
    if (patch.status && isServerSupabaseConfigured()) {
      await logOrgAction(getAdminClient(), {
        orgId: viewer.org_id,
        actorId: viewer.user_id,
        action: `sonar_report_${patch.status}`,
        targetType: 'sonar_report',
        targetId: report.id,
        detail: {
          from: report.status,
          to: patch.status,
          version: report.current_version,
          note: patch.review_note || null,
        },
      });
    }
    const [named] = await attachNames(supabase, viewer.org_id, [updated]);
    return NextResponse.json({ report: named, rights: viewerRights(updated, viewer) });
  },
  { requireAuth: true },
);

/** DELETE /api/org/sonar-reports/:id: the author deletes a draft. */
const DELETE_HANDLER = withApiGuard(
  async (_request, _user, { params }) => {
    const supabase = getUserClient();
    const viewer = await loadOrgViewer(supabase);
    if (!viewer) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const report = await loadReport(supabase, params?.id);
    if (!report) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    if (report.author_id !== viewer.user_id || report.status !== 'draft')
      return NextResponse.json({ error: 'Only the author deletes a draft.' }, { status: 403 });
    const { error } = await supabase.from('org_sonar_reports').delete().eq('id', report.id);
    if (error) return NextResponse.json({ error: 'The report was not deleted.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);

export const GET = withNoEmDash(GET_HANDLER);
export const PATCH = withNoEmDash(PATCH_HANDLER);
export const DELETE = withNoEmDash(DELETE_HANDLER);
