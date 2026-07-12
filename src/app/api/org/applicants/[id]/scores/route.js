import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import {
  MANAGER_ROLES,
  RUBRIC_CRITERIA,
  aggregateStar,
  submittedInterviewerCount,
} from '../../ats-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* GET /api/org/applicants/:id/scores — the rubric panel.
   ANTI-ANCHORING (enforced HERE, never in the UI): a viewer cannot read another
   interviewer's per-criterion scores or notes until (a) that interviewer has
   submitted AND (b) the viewer has submitted their OWN scores. Aggregate ★ and
   "who's in" counts are always shown so the board stays useful. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: applicant } = await supabase
      .from('org_applicants')
      .select('id')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!applicant) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });

    // RLS: an interviewer reads only their own rows; managers read all rows.
    const { data: rows, error } = await supabase
      .from('org_applicant_scores')
      .select('interviewer_id, criterion, score, weight, notes, submitted_at')
      .eq('applicant_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const all = rows || [];
    const myRows = all.filter((r) => r.interviewer_id === member.id);
    const viewerSubmitted = myRows.some((r) => r.submitted_at);
    // A manager who has not entered any scores is a pure reviewer (a decision
    // maker, not a peer interviewer) and may read submitted notes. Any viewer
    // with their own scores stays anchored until they submit — even a manager.
    const pureReviewer = MANAGER_ROLES.includes(member.role) && myRows.length === 0;
    const canViewOthers = viewerSubmitted || pureReviewer;

    // Resolve interviewer display names.
    const interviewerIds = [...new Set(all.map((r) => r.interviewer_id))];
    let nameById = new Map();
    if (interviewerIds.length > 0) {
      const { data: mem } = await supabase
        .from('org_members')
        .select('id, display_name')
        .in('id', interviewerIds);
      nameById = new Map((mem || []).map((m) => [m.id, m.display_name]));
    }

    const byInterviewer = new Map();
    for (const r of all) {
      if (r.interviewer_id === member.id) continue;
      if (!byInterviewer.has(r.interviewer_id)) byInterviewer.set(r.interviewer_id, []);
      byInterviewer.get(r.interviewer_id).push(r);
    }

    const others = [...byInterviewer.entries()].map(([iid, irows]) => {
      const submitted = irows.some((r) => r.submitted_at);
      // Reveal per-criterion detail only once the panel is unlocked for this viewer.
      const reveal = submitted && canViewOthers;
      return {
        interviewer_id: iid,
        interviewer_name: nameById.get(iid) || 'Interviewer',
        submitted,
        rows: reveal
          ? irows.map((r) => ({
              criterion: r.criterion,
              score: Number(r.score),
              weight: Number(r.weight) || 1,
              notes: r.notes || null,
            }))
          : [],
        locked: !reveal,
      };
    });

    return NextResponse.json({
      criteria: RUBRIC_CRITERIA,
      my: {
        submitted: viewerSubmitted,
        rows: myRows.map((r) => ({
          criterion: r.criterion,
          score: Number(r.score),
          weight: Number(r.weight) || 1,
          notes: r.notes || null,
          submitted_at: r.submitted_at || null,
        })),
      },
      others,
      aggregate_star: aggregateStar(all),
      scores_in: submittedInterviewerCount(all),
      interviewer_count: interviewerIds.length,
      can_view_others: canViewOthers,
      viewer: { memberId: member.id, canManage: MANAGER_ROLES.includes(member.role) },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/applicants/:id/scores — save or submit the viewer's own rubric.
   The viewer scores independently as interviewer_id = their member id. Passing
   submit:true stamps submitted_at (which unlocks their read of peers' notes). */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: applicant } = await supabase
      .from('org_applicants')
      .select('id, org_id')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!applicant) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const scores = Array.isArray(body?.scores) ? body.scores : [];
    if (scores.length === 0) {
      return NextResponse.json({ error: 'scores array required' }, { status: 400 });
    }
    const submit = body?.submit === true;
    const submittedAt = submit ? new Date().toISOString() : null;

    const upserts = [];
    for (const s of scores) {
      if (!RUBRIC_CRITERIA.includes(s?.criterion)) {
        return NextResponse.json({ error: `Invalid criterion: ${s?.criterion}` }, { status: 400 });
      }
      const score = Number(s?.score);
      if (!Number.isFinite(score) || score < 0 || score > 5) {
        return NextResponse.json({ error: 'score must be between 0 and 5' }, { status: 400 });
      }
      const row = {
        org_id: member.org_id,
        applicant_id: id,
        interviewer_id: member.id,
        criterion: s.criterion,
        score,
        weight: Number.isFinite(Number(s?.weight)) ? Number(s.weight) : 1,
        notes: s?.notes ? String(s.notes).slice(0, 2000) : null,
      };
      if (submit) row.submitted_at = submittedAt;
      upserts.push(row);
    }

    const { error } = await supabase
      .from('org_applicant_scores')
      .upsert(upserts, { onConflict: 'applicant_id,interviewer_id,criterion' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, submitted: submit });
  },
  { requireAuth: true },
);
