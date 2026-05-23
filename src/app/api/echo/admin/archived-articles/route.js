import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdminUser } from '@/lib/admin-helpers';
import { getArchivedArticleIds } from '@/lib/echo-article-status';
import { getArticleById } from '@/lib/ezana-echo-mock';

export const dynamic = 'force-dynamic';

/**
 * GET /api/echo/admin/archived-articles
 * Returns the list of archived articles with their metadata, merged with
 * mock data so the admin UI has everything needed to render them.
 */
export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const statuses = await getArchivedArticleIds();
    const articles = statuses
      .map((s) => {
        const article = getArticleById(s.article_id);
        if (!article) return null;
        return {
          ...article,
          archivedAt: s.archived_at,
          archivedBy: s.archived_by_email,
          notes: s.notes,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ articles });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
