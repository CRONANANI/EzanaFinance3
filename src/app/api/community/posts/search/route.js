import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { cleanSearchQuery, likeContains } from '@/lib/search';
import { parsePagination, paginatedResponse } from '@/lib/pagination';

export const dynamic = 'force-dynamic';

const SELECT_COLS =
  'id, user_id, content, mentioned_ticker, image_url, likes_count, comments_count, reposts_count, created_at';

/**
 * GET /api/community/posts/search?q=<text>&limit=&offset=
 *
 * Full-text search over top-level community posts using the content_tsv GIN
 * index (maps to @@ websearch_to_tsquery). Paginated, newest-first. Falls back
 * to a trigram-accelerated ILIKE if the FTS column isn't present yet.
 */
export const GET = withApiGuard(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const q = cleanSearchQuery(searchParams.get('q'));
      if (q.length < 2) {
        return NextResponse.json(paginatedResponse([], { limit: 20, offset: 0, total: 0 }));
      }

      const { limit, offset, from, to } = parsePagination(searchParams, {
        defaultLimit: 20,
        maxLimit: 50,
      });
      const admin = getAdminClient();

      const { data, error } = await admin
        .from('community_posts')
        .select(SELECT_COLS)
        .is('parent_post_id', null)
        .textSearch('content_tsv', q, { type: 'websearch', config: 'english' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        // FTS column not present yet (migration not applied) → degrade to a
        // trigram-accelerated substring search so results still come back.
        const { data: fallback, error: fbErr } = await admin
          .from('community_posts')
          .select(SELECT_COLS)
          .is('parent_post_id', null)
          .ilike('content', likeContains(q))
          .order('created_at', { ascending: false })
          .range(from, to);
        if (fbErr) return safeErrorResponse(fbErr, { context: 'community posts search' });
        return NextResponse.json(paginatedResponse(fallback || [], { limit, offset }));
      }

      return NextResponse.json(paginatedResponse(data || [], { limit, offset }));
    } catch (err) {
      return safeErrorResponse(err, { context: 'community posts search' });
    }
  },
  { requireAuth: false },
);
