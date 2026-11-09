/**
 * /api/community/topics
 *   GET              active topics in sort order, with the ones I follow flagged
 *   POST {slug}      follow (pin) a topic
 *   DELETE ?slug=    unfollow
 * RLS on community_topic_follows keeps every write to the caller's own rows.
 */
import { NextResponse } from 'next/server';
import { withSession, PRIVATE } from '@/lib/community/route-session';
import { normalizeTopic } from '@/lib/community/redesign';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return withSession(request, 'topics', async ({ user, supabase }) => {
    const [{ data: topics, error }, { data: follows, error: fErr }] = await Promise.all([
      supabase
        .from('community_topics')
        .select('slug, label, sort_order')
        .eq('is_active', true)
        .order('sort_order'),
      supabase.from('community_topic_follows').select('topic_slug').eq('user_id', user.id),
    ]);
    if (error) throw new Error(error.message);
    if (fErr) throw new Error(fErr.message);
    const followed = new Set((follows || []).map((f) => f.topic_slug));
    return NextResponse.json(
      {
        topics: (topics || []).map((t) => ({
          slug: t.slug,
          label: t.label,
          followed: followed.has(t.slug),
        })),
      },
      { headers: PRIVATE },
    );
  });
}

async function topicExists(supabase, slug) {
  const { data } = await supabase
    .from('community_topics')
    .select('slug')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  return Boolean(data);
}

export async function POST(request) {
  return withSession(request, 'topics follow', async ({ user, supabase }) => {
    const body = await request.json().catch(() => ({}));
    const slug = normalizeTopic(body?.slug);
    if (!slug || !(await topicExists(supabase, slug))) {
      return NextResponse.json(
        { error: 'That topic was not found.' },
        { status: 400, headers: PRIVATE },
      );
    }
    const { error } = await supabase
      .from('community_topic_follows')
      .insert({ user_id: user.id, topic_slug: slug });
    if (error && error.code !== '23505') throw new Error(error.message);
    return NextResponse.json({ slug, followed: true }, { headers: PRIVATE });
  });
}

export async function DELETE(request) {
  return withSession(request, 'topics unfollow', async ({ user, supabase }) => {
    const slug = normalizeTopic(new URL(request.url).searchParams.get('slug'));
    if (!slug)
      return NextResponse.json({ error: 'slug required' }, { status: 400, headers: PRIVATE });
    const { error } = await supabase
      .from('community_topic_follows')
      .delete()
      .eq('user_id', user.id)
      .eq('topic_slug', slug);
    if (error) throw new Error(error.message);
    return NextResponse.json({ slug, followed: false }, { headers: PRIVATE });
  });
}
