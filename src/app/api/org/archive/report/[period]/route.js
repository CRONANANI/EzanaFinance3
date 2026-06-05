import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getArchivedPitches, getArchiveAnalytics } from '@/lib/org-pitches';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const period = params.period || 'semester';
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    let since;
    if (period === 'year' || period === 'annual') {
      since = new Date(year, 0, 1);
    } else if (period === 'inception') {
      since = new Date(2020, 0, 1);
    } else {
      since = month < 6 ? new Date(year, 0, 1) : new Date(year, 6, 1);
    }

    const all = getArchivedPitches({});
    const pitches = all.filter((p) => p.decision_at && new Date(p.decision_at) >= since);
    const analytics = getArchiveAnalytics();

    return NextResponse.json({
      period,
      generated_at: now.toISOString(),
      since: since.toISOString(),
      pitches,
      analytics,
      summary: {
        decided_in_period: pitches.length,
        accepted: pitches.filter((p) => p.decision === 'accepted').length,
        rejected: pitches.filter((p) => p.decision === 'rejected').length,
      },
    });
  },
  { requireAuth: true },
);
