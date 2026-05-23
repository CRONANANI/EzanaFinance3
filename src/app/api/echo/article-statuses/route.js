import { NextResponse } from 'next/server';
import { getArchivedArticleIds } from '@/lib/echo-article-status';

export const dynamic = 'force-dynamic';

/**
 * GET /api/echo/article-statuses
 * Returns the list of archived article IDs so client components can filter.
 */
export async function GET() {
  try {
    const archived = await getArchivedArticleIds();
    return NextResponse.json({
      archivedIds: archived.map((a) => a.article_id),
    });
  } catch (err) {
    return NextResponse.json({ archivedIds: [], error: err.message }, { status: 500 });
  }
}
