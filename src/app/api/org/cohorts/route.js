import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/cohorts — list cohorts for the org. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { data, error } = await supabase
      .from('org_cohorts')
      .select('*')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      cohorts: data || [],
      viewer: {
        userId: member.user_id,
        role: member.role,
        isExecutive: member.role === 'executive',
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

/* PATCH /api/org/cohorts — set a cohort current (executive only). */
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
