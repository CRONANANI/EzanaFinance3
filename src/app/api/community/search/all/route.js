/**
 * GET /api/community/search/all?q= : the Community header search. People by
 * username or display name (public_profiles) and posts by full text
 * (community_posts.content_tsv), five of each, as the signed-in user.
 */
import { NextResponse } from 'next/server';
import { withSession, authorsFor, PRIVATE } from '@/lib/community/route-session';
import { displayNameOf, excerpt } from '@/lib/community/redesign';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return withSession(request, 'search', async ({ supabase }) => {
    const raw = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 80);
    /* Characters that would break the PostgREST or() filter or act as wildcards. */
    const q = raw
      .replace(/[%_,()*\\:"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (q.length < 2) return NextResponse.json({ people: [], posts: [] }, { headers: PRIVATE });

    const like = `%${q}%`;
    const [people, posts] = await Promise.all([
      supabase
        .from('public_profiles')
        .select('id, username, display_name, full_name, avatar_url, is_partner')
        .or(`username.ilike.${like},display_name.ilike.${like},full_name.ilike.${like}`)
        .limit(5),
      supabase
        .from('community_posts')
        .select('id, user_id, title, content, created_at')
        .is('parent_post_id', null)
        .is('moderation_hidden_at', null)
        .textSearch('content_tsv', q, { type: 'websearch', config: 'english' })
        .order('created_at', { ascending: false })
        .limit(5),
    ]);
    if (people.error) throw new Error(people.error.message);
    if (posts.error) throw new Error(posts.error.message);
    const authors = await authorsFor(
      supabase,
      (posts.data || []).map((p) => p.user_id),
    );
    return NextResponse.json(
      {
        people: (people.data || []).map((p) => ({
          id: p.id,
          name: displayNameOf(p),
          username: p.username || null,
          avatar_url: p.avatar_url || null,
          is_partner: Boolean(p.is_partner),
        })),
        posts: (posts.data || []).map((p) => ({
          id: p.id,
          title: p.title || excerpt(p.content, '', 90),
          author: authors.get(p.user_id)?.name || 'Member',
          created_at: p.created_at,
        })),
      },
      { headers: PRIVATE },
    );
  });
}
