/**
 * GET /api/community/thread?post=<id> : one post and its replies, oldest
 * first, for "View discussion" on the Community page (there is no separate
 * post page). Moderation-hidden rows never come back. Replies are posted
 * through the existing POST /api/community/posts with parent_post_id.
 */
import { NextResponse } from 'next/server';
import { withSession, authorsFor, PRIVATE } from '@/lib/community/route-session';
import { excerpt } from '@/lib/community/redesign';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request) {
  return withSession(request, 'thread', async ({ supabase }) => {
    const id = new URL(request.url).searchParams.get('post') || '';
    if (!UUID.test(id))
      return NextResponse.json({ error: 'Post not found' }, { status: 404, headers: PRIVATE });
    const [{ data: post, error }, { data: replies, error: rErr }] = await Promise.all([
      supabase
        .from('community_posts')
        .select('id, user_id, title, content, created_at, comments_count')
        .eq('id', id)
        .is('parent_post_id', null)
        .is('moderation_hidden_at', null)
        .maybeSingle(),
      supabase
        .from('community_posts')
        .select('id, user_id, content, created_at')
        .eq('parent_post_id', id)
        .is('moderation_hidden_at', null)
        .order('created_at', { ascending: true })
        .limit(50),
    ]);
    if (error) throw new Error(error.message);
    if (rErr) throw new Error(rErr.message);
    if (!post)
      return NextResponse.json({ error: 'Post not found' }, { status: 404, headers: PRIVATE });
    const authors = await authorsFor(supabase, [
      post.user_id,
      ...(replies || []).map((r) => r.user_id),
    ]);
    return NextResponse.json(
      {
        post: {
          id: post.id,
          title: post.title || excerpt(post.content, '', 120),
          author: authors.get(post.user_id) || null,
        },
        replies: (replies || []).map((r) => ({
          id: r.id,
          content: r.content || '',
          created_at: r.created_at,
          author: authors.get(r.user_id) || {
            id: r.user_id,
            name: 'Member',
            username: null,
            avatar_url: null,
          },
        })),
      },
      { headers: PRIVATE },
    );
  });
}
