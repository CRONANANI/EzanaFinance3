import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadConfig, loadDeliverables, deliverablesComplete } from '@/lib/competitions/onboarding';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const KINDS = ['deck', 'thesis', 'model', 'exhibit'];
const bad = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

/* Resolve the team and confirm the caller belongs to the team's org (admin read —
   the RLS team policy is host-write only, but a team member legitimately manages
   their own deliverables). Returns { team } or null. */
async function resolveTeam(admin, teamId, member) {
  const { data: team } = await admin
    .from('pitch_teams')
    .select('id, competition_id, org_id, status')
    .eq('id', teamId)
    .maybeSingle();
  if (!team) return { notFound: true };
  const isTeamOrg = team.org_id && team.org_id === member.org_id;
  return { team, isTeamOrg };
}

/* GET /api/org/pitch-teams/:teamId/deliverables — the team's deliverables +
   required checklist. Team org members and the host manager can read (RLS). */
export const GET = withApiGuard(
  async (_request, _user, context) => {
    const { teamId } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return bad('Not an org member', 403);

    const admin = getAdminClient();
    const { team, notFound } = await resolveTeam(admin, teamId, member);
    if (notFound) return bad('Team not found', 404);

    const [config, deliverables] = await Promise.all([
      loadConfig(supabase, team.competition_id),
      loadDeliverables(supabase, team.id),
    ]);
    return NextResponse.json({ team, config, deliverables });
  },
  { requireAuth: true },
);

/* POST /api/org/pitch-teams/:teamId/deliverables — record a deliverable (a file
   already uploaded to the pitch-deliverables bucket, or inline thesis text). Only
   the team's own org members. Flips the team to 'submitted' once every required
   kind is present. { kind, file_path?, file_name?, thesis_text? }. */
export const POST = withApiGuard(
  async (request, _user, context) => {
    const { teamId } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return bad('Not an org member', 403);

    const admin = getAdminClient();
    const { team, isTeamOrg, notFound } = await resolveTeam(admin, teamId, member);
    if (notFound) return bad('Team not found', 404);
    if (!isTeamOrg) return bad('Only the team’s own members can submit deliverables.', 403);

    let body;
    try {
      body = await request.json();
    } catch {
      return bad('Invalid JSON');
    }
    const kind = body?.kind;
    if (!KINDS.includes(kind)) return bad('Invalid deliverable kind');
    const thesisText = kind === 'thesis' ? String(body?.thesis_text || '').trim() : null;
    if (!body?.file_path && !thesisText) return bad('A file or thesis text is required.');

    // Enforce the deliverable deadline server-side, not just in the UI.
    const config = await loadConfig(admin, team.competition_id);
    if (config.deliverable_due_at && Date.now() > Date.parse(config.deliverable_due_at)) {
      return bad('The deliverable deadline has passed.', 409);
    }

    // One row per kind — replace on re-upload (RLS lets a team org member write).
    await supabase.from('pitch_deliverables').delete().eq('team_id', team.id).eq('kind', kind);
    const { data, error } = await supabase
      .from('pitch_deliverables')
      .insert({
        team_id: team.id,
        kind,
        file_path: body?.file_path || null,
        file_name: body?.file_name || null,
        thesis_text: thesisText || null,
        uploaded_by: member.id,
      })
      .select('id, kind, file_path, file_name, thesis_text, uploaded_at')
      .single();
    if (error) return bad(error.message, 500);

    // If every required deliverable is now present, flip the team to 'submitted'.
    // The team can't self-write pitch_teams under RLS (host-write only), so use
    // admin here — after confirming caller ownership above.
    const deliverables = await loadDeliverables(admin, team.id);
    let submitted = false;
    if (deliverablesComplete(config, deliverables) && team.status !== 'withdrawn' && team.status !== 'submitted') {
      await admin.from('pitch_teams').update({ status: 'submitted' }).eq('id', team.id);
      submitted = true;
    }

    return NextResponse.json({ deliverable: data, submitted }, { status: 201 });
  },
  { requireAuth: true },
);
