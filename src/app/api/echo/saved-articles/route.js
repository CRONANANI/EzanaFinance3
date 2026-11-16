import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { articleId, action, tags = [], keywordClickCount = 0 } = body;

  if (!articleId) {
    return NextResponse.json({ error: 'articleId required' }, { status: 400 });
  }

  const supabase = getAdminClient();

  if (action === 'save') {
    await supabase.from('echo_saved_articles').upsert(
      {
        user_id: user.id,
        article_id: articleId,
        saved_at: new Date().toISOString(),
        tags,
        keyword_click_count: keywordClickCount,
      },
      { onConflict: 'user_id,article_id' },
    );

    await supabase.from('activity_breadcrumbs').insert({
      user_id: user.id,
      event_type: 'article_save',
      event_data: { article_id: articleId, topics: tags, keyword_clicks: keywordClickCount },
    });
  } else if (action === 'unsave') {
    await supabase
      .from('echo_saved_articles')
      .delete()
      .eq('user_id', user.id)
      .eq('article_id', articleId);
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ savedIds: [] });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('echo_saved_articles')
    .select('article_id, saved_at')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load' }, { status: 500 });

  /* savedIds for the article page's save button; saved (newest first, with
     the save date) for the reader's own list on the Echo front page. */
  const rows = data || [];
  return NextResponse.json({
    savedIds: rows.map((r) => r.article_id),
    saved: rows.map((r) => ({ id: r.article_id, savedAt: r.saved_at || null })),
  });
}
