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
  const { data } = await supabase
    .from('echo_saved_articles')
    .select('article_id')
    .eq('user_id', user.id);

  return NextResponse.json({ savedIds: (data || []).map((r) => r.article_id) });
}
