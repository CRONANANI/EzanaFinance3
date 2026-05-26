import { NextResponse } from 'next/server';
import { requireUser, getAdminClient, getCurrentUser } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const articleId = params?.articleId;
  if (!articleId) {
    return NextResponse.json({ error: 'articleId required' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('echo_article_sentiment')
    .select('sentiment, user_id')
    .eq('article_id', articleId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data || [];
  const count = rows.length;
  const average = count > 0 ? rows.reduce((sum, r) => sum + (r.sentiment || 0), 0) / count : 50;

  const distribution = new Array(21).fill(0);
  for (const row of rows) {
    const bucket = Math.min(20, Math.max(0, Math.round((row.sentiment || 0) / 5)));
    distribution[bucket]++;
  }

  let userSentiment = null;
  try {
    const user = await getCurrentUser(request);
    if (user) {
      const mine = rows.find((r) => r.user_id === user.id);
      if (mine) userSentiment = mine.sentiment;
    }
  } catch {
    /* unauthenticated */
  }

  return NextResponse.json({
    average: Math.round(average),
    count,
    distribution,
    userSentiment,
  });
}

export async function POST(request, { params }) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const articleId = params?.articleId;
  if (!articleId) {
    return NextResponse.json({ error: 'articleId required' }, { status: 400 });
  }

  const body = await request.json();
  const sentiment = Number(body?.sentiment);
  if (!Number.isFinite(sentiment) || sentiment < 0 || sentiment > 100) {
    return NextResponse.json({ error: 'sentiment must be 0-100' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { error } = await supabase.from('echo_article_sentiment').upsert(
    {
      user_id: user.id,
      article_id: articleId,
      sentiment: Math.round(sentiment),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,article_id' },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
