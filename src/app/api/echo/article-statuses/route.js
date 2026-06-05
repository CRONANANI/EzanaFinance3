import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getArchivedArticleIds } from '@/lib/echo-article-status';

export const dynamic = 'force-dynamic';

/**
 * GET /api/echo/article-statuses
 * Returns the list of archived article IDs so client components can filter.
 */
export const GET = withApiGuard(
  async (request, user) => {
    try {
      const archived = await getArchivedArticleIds();
      return NextResponse.json({
        archivedIds: archived.map((a) => a.article_id),
      });
    } catch (err) {
      return NextResponse.json({ archivedIds: [], error: err.message }, { status: 500 });
    }
  },
  { requireAuth: false },
);
