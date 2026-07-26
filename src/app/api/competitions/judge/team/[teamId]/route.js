import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { resolveJudge, tokenFromRequest, judgeCanAccessTeam } from '@/lib/competitions/judge-token';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SIGNED_TTL = 600; // 10 minutes

/* GET /api/competitions/judge/team/:teamId?token=… — one team's deliverables +
   rubric + the judge's existing scores. ONLY if the team is in a room the judge is
   assigned to (re-validated against the token — a tampered teamId is rejected).
   Deliverable files are handed back as short-lived signed URLs; the judge has no
   other storage access. */
export const GET = withApiGuard(
  async (request, _user, context) => {
    const { teamId } = await context.params;
    const admin = getAdminClient();
    const judge = await resolveJudge(admin, tokenFromRequest(request));
    if (!judge) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 });

    if (!(await judgeCanAccessTeam(admin, judge.id, teamId))) {
      return NextResponse.json({ error: 'This team is not in your room.' }, { status: 403 });
    }

    const { data: team } = await admin
      .from('pitch_teams')
      .select('id, team_name, ticker, side, competition_id')
      .eq('id', teamId)
      .maybeSingle();
    if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [{ data: criteria }, { data: rawDeliverables }, { data: scores }, { data: summary }] = await Promise.all([
      admin
        .from('pitch_rubric_criteria')
        .select('id, label, description, weight, max_score, sort_order')
        .eq('competition_id', team.competition_id)
        .order('sort_order', { ascending: true }),
      admin
        .from('pitch_deliverables')
        .select('id, kind, file_path, file_name, thesis_text')
        .eq('team_id', teamId),
      admin.from('pitch_scores').select('criterion_id, score').eq('judge_id', judge.id).eq('team_id', teamId),
      admin
        .from('pitch_score_summaries')
        .select('comment, submitted, submitted_at')
        .eq('judge_id', judge.id)
        .eq('team_id', teamId)
        .maybeSingle(),
    ]);

    // Mint short-lived signed URLs for file deliverables (never expose the path).
    const deliverables = [];
    for (const d of rawDeliverables || []) {
      let signedUrl = null;
      if (d.file_path) {
        // eslint-disable-next-line no-await-in-loop
        const { data: signed } = await admin.storage
          .from('pitch-deliverables')
          .createSignedUrl(d.file_path, SIGNED_TTL);
        signedUrl = signed?.signedUrl || null;
      }
      deliverables.push({ id: d.id, kind: d.kind, file_name: d.file_name, thesis_text: d.thesis_text, signedUrl });
    }

    const myScores = {};
    for (const s of scores || []) myScores[s.criterion_id] = s.score;

    return NextResponse.json({
      team,
      criteria: criteria || [],
      deliverables,
      myScores,
      comment: summary?.comment || '',
      submitted: !!summary?.submitted,
    });
  },
  { requireAuth: false },
);
