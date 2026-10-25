import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { judgeRateLimited } from '@/lib/competitions/judge-rate-limit';
import { resolveJudge, tokenFromRequest } from '@/lib/competitions/judge-token';
import { submitJudgeScorecard } from '@/lib/competitions/judge-submit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* POST /api/competitions/judge/submit — save every score in the body, then lock
   the judge's scorecard for a team with the overall comment. Re-validates room
   assignment, each criterion against the rubric and each score against its
   range; 409 once the competition is complete or archived. Idempotent.
   { team_id, comment?, attribute_comment?, scores: [{ criterion_id, score }] } */
export const POST = withApiGuard(
  async (request) => {
    const admin = getAdminClient();
    const rawToken = tokenFromRequest(request);
    if (await judgeRateLimited(rawToken)) {
      return NextResponse.json(
        { error: 'Too many requests. Wait a minute and try again.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }
    const judge = await resolveJudge(admin, rawToken);
    if (!judge) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const result = await submitJudgeScorecard(admin, judge, body);
    return NextResponse.json(result.body, { status: result.status });
  },
  { requireAuth: false },
);
