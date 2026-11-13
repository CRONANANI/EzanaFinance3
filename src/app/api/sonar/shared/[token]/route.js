import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { isShareToken, publicSnapshot } from '@/lib/sonar/workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEADERS = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const GONE = () =>
  NextResponse.json(
    { error: 'This shared research is no longer available.' },
    { status: 404, headers: HEADERS },
  );

/**
 * GET /api/sonar/shared/[token] (Sonar research workspace, Nov 13 2026). Public, rate limited
 * by the guard. A malformed token is refused before any query. A valid one is read only
 * through the sonar_shared_research() function (one row, never the owner, their note,
 * controls or folder), and the result is trimmed again to the public whitelist
 * (publicSnapshot). Anything else is a 404. The token is never logged.
 *
 * 200 publicSnapshot(): { question, headline, summary, takeaways, sources, depth, answeredAt }
 */
export const GET = withApiGuard(
  async (request, _user, context) => {
    const token = String(context?.params?.token || '');
    if (!isShareToken(token)) return GONE();
    try {
      const { data, error } = await getUserClient().rpc('sonar_shared_research', {
        p_token: token,
      });
      if (error) return GONE();
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return GONE();
      const pub = publicSnapshot({
        ...(row.snapshot || {}),
        question: row.snapshot?.question || row.question,
        depth: row.snapshot?.depth || row.depth,
      });
      return NextResponse.json(pub, { headers: HEADERS });
    } catch (err) {
      return safeErrorResponse(err, {
        message: 'This shared research is not available right now.',
        context: 'sonar/shared',
      });
    }
  },
  { requireAuth: false },
);
