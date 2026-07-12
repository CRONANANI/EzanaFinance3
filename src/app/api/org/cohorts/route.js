import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const COHORT_STATUSES = ['recruiting', 'active', 'graduating', 'alumni', 'archived'];

/* GET /api/org/cohorts?status= — list cohorts for the org (optionally filtered
   by lifecycle status). The cohort selector context switches the whole page. */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('org_cohorts')
      .select('*')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false });
    if (status && COHORT_STATUSES.includes(status)) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      cohorts: data || [],
      viewer: {
        memberId: member.id,
        userId: member.user_id,
        role: member.role,
        isExecutive: member.role === 'executive',
        canManage: MANAGER_ROLES.includes(member.role),
        isAdvisor: member.role === 'executive' && member.sub_role === 'Faculty Advisor',
      },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/cohorts — create a cohort (executive only). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const name = (body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Cohort name required' }, { status: 400 });

    const termType = ['semester', 'quarter', 'year'].includes(body?.term_type)
      ? body.term_type
      : 'semester';
    const status = COHORT_STATUSES.includes(body?.status) ? body.status : 'recruiting';

    // If this cohort is current, clear the flag on the others first.
    if (body?.is_current) {
      await supabase
        .from('org_cohorts')
        .update({ is_current: false })
        .eq('org_id', member.org_id)
        .eq('is_current', true);
    }

    const { data, error } = await supabase
      .from('org_cohorts')
      .insert({
        org_id: member.org_id,
        name: name.slice(0, 120),
        term_type: termType,
        status,
        entry_term: body?.entry_term ? String(body.entry_term).slice(0, 40) : null,
        expected_grad_term: body?.expected_grad_term
          ? String(body.expected_grad_term).slice(0, 40)
          : null,
        onboarding_gate: body?.onboarding_gate !== false,
        starts_on: body?.starts_on || null,
        ends_on: body?.ends_on || null,
        is_current: !!body?.is_current,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ cohort: data });
  },
  { requireAuth: true },
);

/* PATCH /api/org/cohorts — update cohort lifecycle / settings (executive only). */
export const PATCH = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const cohortId = body?.cohort_id;
    if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

    if (body?.is_current) {
      await supabase
        .from('org_cohorts')
        .update({ is_current: false })
        .eq('org_id', member.org_id)
        .eq('is_current', true);
    }

    const update = {};
    if ('is_current' in body) update.is_current = !!body.is_current;
    if ('name' in body) update.name = String(body.name).slice(0, 120);
    if ('status' in body && COHORT_STATUSES.includes(body.status)) update.status = body.status;
    if ('entry_term' in body) update.entry_term = body.entry_term || null;
    if ('expected_grad_term' in body) update.expected_grad_term = body.expected_grad_term || null;
    if ('onboarding_gate' in body) update.onboarding_gate = !!body.onboarding_gate;

    const { data, error } = await supabase
      .from('org_cohorts')
      .update(update)
      .eq('id', cohortId)
      .eq('org_id', member.org_id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ cohort: data });
  },
  { requireAuth: true },
);
