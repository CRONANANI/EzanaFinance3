import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { DEFAULT_MAX, GRADED_ROLES, MAX_FEEDBACK, validateGrade } from '@/lib/org-grades-model';
import { loadGrades } from './_loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

/* GET /api/org/grades: executives receive the council's grades, roster and
   cohorts; every other member receives only their own grades, and none while
   the council has paused grade visibility (see _loader.js). */
export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { payload, error, status } = await loadGrades(supabase, member);
    if (error) return NextResponse.json({ error }, { status: status || 500 });
    return NextResponse.json(payload, { headers: PRIVATE });
  },
  { requireAuth: true },
);

const firstError = (errors) => Object.values(errors)[0];

/* POST /api/org/grades: create a grade (executives only, as today). The
   member must be an active analyst or portfolio manager of the same council,
   the same people the page offers. */
export const POST = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
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
    const errors = validateGrade(body || {}, { mode: 'new' });
    if (Object.keys(errors).length) {
      return NextResponse.json({ error: firstError(errors), fields: errors }, { status: 400 });
    }

    const { data: student } = await supabase
      .from('org_members')
      .select('user_id, cohort_id, role, is_active')
      .eq('org_id', member.org_id)
      .eq('user_id', body.student_id)
      .eq('is_active', true)
      .maybeSingle();
    if (!student || !GRADED_ROLES.includes(student.role)) {
      return NextResponse.json(
        { error: 'Only active analysts and portfolio managers of this council can be graded.' },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from('org_grades')
      .insert({
        org_id: member.org_id,
        cohort_id: student.cohort_id || null,
        student_id: student.user_id,
        graded_by: member.user_id,
        work_type: body.work_type,
        work_id: body?.work_id || null,
        score: Number(body.score),
        max_score:
          body?.max_score != null && body.max_score !== '' ? Number(body.max_score) : DEFAULT_MAX,
        letter: String(body?.letter || '').trim() || null,
        feedback: body?.feedback ? String(body.feedback).slice(0, MAX_FEEDBACK) : null,
        rubric: body?.rubric || null,
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: 'The grade was not saved.' }, { status: 500 });
    return NextResponse.json({ grade: data });
  },
  { requireAuth: true },
);

/* PATCH /api/org/grades: change a grade (executives only). The executive who
   changes it becomes its grader, as before; no history is kept. */
export const PATCH = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
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
    if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data: current } = await supabase
      .from('org_grades')
      .select('id, score, max_score, letter, feedback')
      .eq('id', body.id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!current) return NextResponse.json({ error: 'Grade not found' }, { status: 404 });

    /* Check the grade as it will be after the change. */
    const next = {
      score: 'score' in body ? body.score : current.score,
      max_score: 'max_score' in body ? body.max_score : current.max_score,
      letter: 'letter' in body ? body.letter : current.letter,
      feedback: 'feedback' in body ? body.feedback : current.feedback,
    };
    const errors = validateGrade(next, { mode: 'edit' });
    if (Object.keys(errors).length) {
      return NextResponse.json({ error: firstError(errors), fields: errors }, { status: 400 });
    }

    const update = { updated_at: new Date().toISOString(), graded_by: member.user_id };
    if ('score' in body) update.score = Number(body.score);
    if ('max_score' in body)
      update.max_score =
        body.max_score != null && body.max_score !== '' ? Number(body.max_score) : DEFAULT_MAX;
    if ('letter' in body) update.letter = String(body.letter || '').trim() || null;
    if ('feedback' in body)
      update.feedback = body.feedback ? String(body.feedback).slice(0, MAX_FEEDBACK) : null;
    if ('rubric' in body) update.rubric = body.rubric || null;

    const { data, error } = await supabase
      .from('org_grades')
      .update(update)
      .eq('id', body.id)
      .eq('org_id', member.org_id)
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: 'The change was not saved.' }, { status: 500 });
    return NextResponse.json({ grade: data });
  },
  { requireAuth: true },
);
