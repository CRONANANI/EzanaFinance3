import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import {
  MANAGER_ROLES,
  ATS_STAGES,
  shapeApplicant,
  aggregateStar,
  submittedInterviewerCount,
} from './ats-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/applicants?cohort_id= — the ATS board for one cohort.
   Returns applicants (blind-redacted server-side when the cohort form has blind
   screening on), per-stage counts, and the recruitment stat strip. RLS scopes
   visibility to managers + assigned interviewers; blind redaction is applied on
   top so identity never reaches the client pre-interview. */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohort_id');
    if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });

    // Confirm the cohort belongs to the caller's org.
    const { data: cohort } = await supabase
      .from('org_cohorts')
      .select('id')
      .eq('id', cohortId)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });

    // Blind screening is a property of the cohort's application form.
    const { data: form } = await supabase
      .from('org_application_forms')
      .select('blind_screening')
      .eq('org_id', member.org_id)
      .eq('cohort_id', cohortId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const blind = !!form?.blind_screening;

    const { data: applicants, error } = await supabase
      .from('org_applicants')
      .select('*')
      .eq('org_id', member.org_id)
      .eq('cohort_id', cohortId)
      .order('applied_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const ids = (applicants || []).map((a) => a.id);
    let scoresByApplicant = new Map();
    if (ids.length > 0) {
      const { data: scores } = await supabase
        .from('org_applicant_scores')
        .select('applicant_id, interviewer_id, score, weight, submitted_at')
        .in('applicant_id', ids);
      for (const s of scores || []) {
        if (!scoresByApplicant.has(s.applicant_id)) scoresByApplicant.set(s.applicant_id, []);
        scoresByApplicant.get(s.applicant_id).push(s);
      }
    }

    const shaped = (applicants || []).map((a) => {
      const rows = scoresByApplicant.get(a.id) || [];
      const interviewers = new Set(rows.map((r) => r.interviewer_id));
      return {
        ...shapeApplicant(a, { blind }),
        aggregate_star: aggregateStar(rows),
        scores_in: submittedInterviewerCount(rows),
        interviewer_count: interviewers.size,
      };
    });

    const stageCounts = {};
    for (const st of ATS_STAGES) stageCounts[st] = 0;
    for (const a of shaped) stageCounts[a.stage] = (stageCounts[a.stage] || 0) + 1;

    const total = shaped.length;
    const interviewed = shaped.filter((a) =>
      ['interview', 'pitch', 'offer', 'accepted'].includes(a.stage),
    ).length;
    const offers = shaped.filter((a) => ['offer', 'accepted'].includes(a.stage)).length;
    const accepted = stageCounts.accepted || 0;

    return NextResponse.json({
      applicants: shaped,
      stageCounts,
      blind,
      stats: {
        applicants: total,
        interviewed,
        offers,
        yield_pct: offers > 0 ? Math.round((accepted / offers) * 100) : null,
      },
      viewer: { memberId: member.id, canManage: MANAGER_ROLES.includes(member.role) },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/applicants — add an applicant to a cohort (manager only).
   The unauthenticated public form intake is out of scope and would use the
   admin client; this is the manager-side "add applicant" path. */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const cohortId = body?.cohort_id;
    const fullName = (body?.full_name || '').trim();
    if (!cohortId) return NextResponse.json({ error: 'cohort_id required' }, { status: 400 });
    if (!fullName) return NextResponse.json({ error: 'full_name required' }, { status: 400 });

    const { data: cohort } = await supabase
      .from('org_cohorts')
      .select('id')
      .eq('id', cohortId)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });

    const stage = ATS_STAGES.includes(body?.stage) ? body.stage : 'applied';

    const { data, error } = await supabase
      .from('org_applicants')
      .insert({
        org_id: member.org_id,
        cohort_id: cohortId,
        full_name: fullName.slice(0, 160),
        email: body?.email ? String(body.email).slice(0, 200) : null,
        program: body?.program ? String(body.program).slice(0, 160) : null,
        year: body?.year ? String(body.year).slice(0, 40) : null,
        source: body?.source ? String(body.source).slice(0, 80) : null,
        resume_url: body?.resume_url || null,
        sample_pitch_url: body?.sample_pitch_url || null,
        responses: body?.responses && typeof body.responses === 'object' ? body.responses : {},
        stage,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ applicant: data }, { status: 201 });
  },
  { requireAuth: true },
);
