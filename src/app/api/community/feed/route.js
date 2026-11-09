/**
 * GET /api/community/feed?tab=following|trending|latest&topic=&before=&offset=&limit=
 * The Community page feed (community_feed RPC, as the signed-in user), with
 * each post's author from public_profiles and a plain-text excerpt.
 */
import { NextResponse } from 'next/server';
import { withSession, authorsFor, PRIVATE } from '@/lib/community/route-session';
import { normalizeTab, normalizeTopic, excerpt, FEED_PAGE } from '@/lib/community/redesign';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return withSession(request, 'feed', async ({ supabase }) => {
    const sp = new URL(request.url).searchParams;
    const tab = normalizeTab(sp.get('tab')) || 'latest';
    const topic = normalizeTopic(sp.get('topic'));
    const before = sp.get('before');
    const beforeIso =
      before && Number.isFinite(Date.parse(before)) ? new Date(before).toISOString() : null;
    const offset = Math.max(0, parseInt(sp.get('offset') || '0', 10) || 0);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(sp.get('limit') || String(FEED_PAGE), 10) || FEED_PAGE),
    );

    const { data, error } = await supabase.rpc('community_feed', {
      p_tab: tab,
      p_topic: topic,
      p_before: tab === 'trending' ? null : beforeIso,
      p_offset: tab === 'trending' ? offset : 0,
      p_limit: limit,
    });
    if (error) throw new Error(error.message);

    const rows = data || [];
    const authors = await authorsFor(
      supabase,
      rows.map((r) => r.user_id),
    );
    const posts = rows.map((r) => ({
      id: r.id,
      title: r.title || '',
      excerpt: excerpt(r.content, r.title),
      topic_slug: r.topic_slug,
      topic_label: r.topic_label,
      mentioned_ticker: r.mentioned_ticker ? String(r.mentioned_ticker).toUpperCase() : null,
      image_url: r.image_url || null,
      likes_count: r.likes_count || 0,
      comments_count: r.comments_count || 0,
      reposts_count: r.reposts_count || 0,
      created_at: r.created_at,
      liked_by_me: Boolean(r.liked_by_me),
      saved_by_me: Boolean(r.saved_by_me),
      author: authors.get(r.user_id) || {
        id: r.user_id,
        name: 'Member',
        username: null,
        avatar_url: null,
        is_partner: false,
      },
    }));

    const last = rows[rows.length - 1];
    const next =
      rows.length < limit
        ? null
        : tab === 'trending'
          ? { offset: offset + rows.length }
          : { before: last?.created_at };
    return NextResponse.json({ tab, topic, posts, next }, { headers: PRIVATE });
  });
}
