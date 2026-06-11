import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WORK_TYPES = ['pitch', 'research_note', 'coverage', 'participation', 'overall'];

/* GET /api/org/grades — RLS returns own grades for students, all for executives. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const canGrade = member.role === 'executive';

    const { data, error } = await supabase
      .from('org_grades')
      .select('*')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Roster + names (only managers need the full roster; students just see names).
    const { data: members } = await supabase
      .from('org_members')
      .select('user_id, display_name, role')
      .eq('org_id', member.org_id)
      .eq('is_active', true);
    const byUser = new Map((members || []).map((m) => [m.user_id, m]));

    const grades = (data || []).map((g) => ({
      ...g,
      student_name: byUser.get(g.student_id)?.display_name || 'Student',
      grader_name: g.graded_by ? byUser.get(g.graded_by)?.display_name || null : null,
    }));

    return NextResponse.json({
      grades,
      roster: canGrade
        ? (members || [])
            .filter((m) => m.role === 'analyst' || m.role === 'portfolio_manager')
            .map((m) => ({ user_id: m.user_id, display_name: m.display_name, role: m.role }))
        : [],
      viewer: { userId: member.user_id, canGrade },
      workTypes: WORK_TYPES,
    });
  },
  { requireAuth: true },
);

/* POST /api/org/grades — create a grade (executive / faculty advisor only). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive / advisor role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const studentId = body?.student_id;
    const workType = body?.work_type;
    if (!studentId || !WORK_TYPES.includes(workType)) {
      return NextResponse.json({ error: 'student_id and a valid work_type required' }, { status: 400 });
    }

    // Student must be a member of the org.
    const { data: student } = await supabase
      .from('org_members')
      .select('user_id, cohort_id')
      .eq('org_id', member.org_id)
      .eq('user_id', studentId)
      .maybeSingle();
    if (!student) return NextResponse.json({ error: 'Student not in org' }, { status: 404 });

    const { data, error } = await supabase
      .from('org_grades')
      .insert({
        org_id: member.org_id,
        cohort_id: student.cohort_id || body?.cohort_id || null,
        student_id: studentId,
        graded_by: member.user_id,
        work_type: workType,
        work_id: body?.work_id || null,
        score: body?.score != null ? Number(body.score) : null,
        max_score: body?.max_score != null ? Number(body.max_score) : 100,
        letter: body?.letter || null,
        feedback: body?.feedback ? String(body.feedback).slice(0, 4000) : null,
        rubric: body?.rubric || null,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ grade: data });
  },
  { requireAuth: true },
);

/* PATCH /api/org/grades — update a grade (executive / advisor only). */
export const PATCH = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive / advisor role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const update = { updated_at: new Date().toISOString(), graded_by: member.user_id };
    if ('score' in body) update.score = body.score != null ? Number(body.score) : null;
    if ('max_score' in body) update.max_score = body.max_score != null ? Number(body.max_score) : 100;
    if ('letter' in body) update.letter = body.letter || null;
    if ('feedback' in body) update.feedback = body.feedback ? String(body.feedback).slice(0, 4000) : null;
    if ('rubric' in body) update.rubric = body.rubric || null;

    const { data, error } = await supabase
      .from('org_grades')
      .update(update)
      .eq('id', body.id)
      .eq('org_id', member.org_id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ grade: data });
  },
  { requireAuth: true },
);
