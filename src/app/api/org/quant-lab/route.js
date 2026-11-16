/**
 * GET /api/org/quant-lab   the council tab of Quant Lab (/for-the-quants)
 *
 * The parts of the council tab that US Equities does not already load (the
 * book, sector teams, member directory and stored policy rules come from
 * GET /api/org/company-research):
 *   pitches      the council's open pitches: ticker, analyst, desk, stage,
 *                sector and proposed size (no theses, ballots or tallies)
 *   models       per open pitch, its desk's required models and the upload
 *                and review state of each, built exactly as
 *                GET /api/org/pitches/[pitchId]/models builds it
 *   assignments  open assignments of type Model that the Assignments page
 *                shows this viewer (their own, plus for a manager the work
 *                they gave or gave their direct reports), from its loader
 *
 * Every read runs as the signed-in member through the RLS-scoped client and
 * is scoped to the member's own council; RLS stays the gate. No service-role
 * client. Each part fails on its own: a part that cannot be read arrives as
 * null and the page shows that card's error. Quant Lab strategies are never
 * read here: they stay private to their author.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadAssignments } from '@/app/api/org/assignments/_loader';
import { CLOSED_STAGES, DEFAULT_REQUIRED_MODELS, modelChecklist } from '@/lib/org-quant-lab-model';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

async function pitchesPart(supabase, orgId) {
  const { data, error } = await supabase
    .from('org_pitches')
    .select(
      'id, ticker, company_name, team_id, sector, stage, status, analyst_member_id, position_size_pct, created_at, archived_at',
    )
    .eq('org_id', orgId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return { pitches: null, models: null };
  const open = (data || []).filter((p) => p.ticker && !CLOSED_STAGES.includes(p.stage));
  if (!open.length) return { pitches: [], models: {} };

  const ids = open.map((p) => p.id);
  const teamIds = [...new Set(open.map((p) => p.team_id).filter(Boolean))];
  const [rows, desks] = await Promise.all([
    supabase
      .from('org_pitch_model')
      .select('pitch_id, model_type, file_url, version, reviewed_at')
      .eq('org_id', orgId)
      .in('pitch_id', ids),
    teamIds.length
      ? supabase.from('org_desk_config').select('team_id, required_models').in('team_id', teamIds)
      : Promise.resolve({ data: [] }),
  ]);
  let models = null;
  if (!rows.error && !desks.error) {
    const required = new Map(
      (desks.data || [])
        .filter((d) => Array.isArray(d.required_models) && d.required_models.length)
        .map((d) => [d.team_id, d.required_models]),
    );
    models = {};
    for (const p of open) {
      models[p.id] = modelChecklist(
        required.get(p.team_id) || DEFAULT_REQUIRED_MODELS,
        (rows.data || []).filter((m) => m.pitch_id === p.id),
      );
    }
  }
  return { pitches: open, models };
}

async function assignmentsPart(supabase, member) {
  try {
    const { error, payload } = await loadAssignments(supabase, member);
    if (error) return null;
    return (payload.assignments || [])
      .filter((a) => (a.type || a.assignment_type) === 'model' && !a.archived)
      .map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        due_date: a.due_date || null,
        overdue: Boolean(a.overdue),
        mine: Boolean(a.mine),
        assignees: (a.assignees || []).map((x) => x.name).filter(Boolean),
      }));
  } catch {
    return null;
  }
}

export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const [pitchPart, assignments] = await Promise.all([
      pitchesPart(supabase, member.org_id),
      assignmentsPart(supabase, member),
    ]);
    return NextResponse.json(
      {
        now: Date.now(),
        viewer: { role: member.role, memberId: member.id },
        pitches: pitchPart.pitches,
        models: pitchPart.models,
        assignments,
      },
      { headers: PRIVATE },
    );
  },
  { requireAuth: true },
);
