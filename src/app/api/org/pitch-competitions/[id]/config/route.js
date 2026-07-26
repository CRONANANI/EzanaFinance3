import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { loadConfig, ADMISSION_MODES } from '@/lib/competitions/onboarding';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BOOL_FIELDS = [
  'requires_ticker_at_signup',
  'application_requires_deck',
  'application_requires_thesis',
  'deliverable_deck',
  'deliverable_thesis',
  'deliverable_model',
  'requires_host_approval_after_signup',
];
const TEXT_FIELDS = ['application_prompt', 'deliverable_notes', 'eligibility_note'];
const TS_FIELDS = ['registration_opens_at', 'registration_closes_at', 'deliverable_due_at'];

async function loadCompMeta(supabase, id) {
  const { data } = await supabase.from('pitch_competitions').select('id, host_org_id').eq('id', id).maybeSingle();
  return data || null;
}

/* GET /api/org/pitch-competitions/:id/config — the onboarding config (defaults
   when unsaved). Readable by host + participating orgs (RLS). */
export const GET = withApiGuard(
  async (_request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const comp = await loadCompMeta(supabase, id);
    if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const config = await loadConfig(supabase, comp.id);
    return NextResponse.json({ config, canManage: canManageCompetition(member, comp) });
  },
  { requireAuth: true },
);

/* PUT /api/org/pitch-competitions/:id/config — upsert the config. Host execs/PMs
   (VPs) only. */
export const PUT = withApiGuard(
  async (request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const comp = await loadCompMeta(supabase, id);
    if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canManageCompetition(member, comp)) {
      return NextResponse.json({ error: 'Only host executives and VPs can edit the configuration.' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const row = { competition_id: comp.id, updated_by: member.id, updated_at: new Date().toISOString() };

    if ('admission_mode' in body) {
      if (!ADMISSION_MODES.includes(body.admission_mode)) return NextResponse.json({ error: 'Invalid admission mode' }, { status: 400 });
      row.admission_mode = body.admission_mode;
    }
    if ('ticker_assignment' in body) {
      if (!['team_choice', 'host_assigns', 'from_pool'].includes(body.ticker_assignment)) return NextResponse.json({ error: 'Invalid ticker assignment' }, { status: 400 });
      row.ticker_assignment = body.ticker_assignment;
    }
    if ('side_constraint' in body) {
      if (!['either', 'long_only', 'short_only', 'host_assigns'].includes(body.side_constraint)) return NextResponse.json({ error: 'Invalid side constraint' }, { status: 400 });
      row.side_constraint = body.side_constraint;
    }
    if ('max_teams' in body) {
      const n = Number(body.max_teams);
      row.max_teams = body.max_teams == null || body.max_teams === '' ? null : Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    }
    if ('max_teams_per_org' in body) {
      const n = Number(body.max_teams_per_org);
      row.max_teams_per_org = Number.isFinite(n) && n >= 1 ? Math.round(n) : 1;
    }
    if ('ticker_pool' in body) {
      row.ticker_pool = Array.isArray(body.ticker_pool)
        ? body.ticker_pool.map((t) => String(t).trim().toUpperCase()).filter(Boolean)
        : null;
    }
    for (const f of BOOL_FIELDS) if (f in body) row[f] = !!body[f];
    for (const f of TEXT_FIELDS) if (f in body) row[f] = body[f] ? String(body[f]) : null;
    for (const f of TS_FIELDS) if (f in body) row[f] = body[f] || null;

    const { data, error } = await supabase
      .from('pitch_competition_config')
      .upsert(row, { onConflict: 'competition_id' })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ config: data });
  },
  { requireAuth: true },
);
