/**
 * GET /api/community/feed?tab=following|trending|latest|saved&topic=&before=&offset=&limit=
 * GET /api/community/feed?sort=relevant|recent|trending|discussed&filter=all|research|...
 *   Nov 23, 2026 (Community v3): with sort or filter, the feed reads
 *   community_feed_v3 (kind filters, four sorts, offset paging, the post's
 *   safe attachment). Until that migration is applied it falls back to
 *   community_feed and filters kinds here.
 * The Community page feed (community_feed RPC, as the signed-in user), with
 * each post's author from public_profiles and a plain-text excerpt.
 *
 * Nov 15 2026: the Saved tab lists the caller's own bookmarks (post_saves,
 * newest save first), and every post carries what its author attached when
 * writing it: the poll, the ticker embed, their conviction, the partner post
 * format and the disclosure. All of it is read as the signed-in user.
 */
import { NextResponse } from 'next/server';
import { withSession, authorsFor, PRIVATE } from '@/lib/community/route-session';
import { normalizeTab, normalizeTopic, excerpt, FEED_PAGE } from '@/lib/community/redesign';
import { isCommunityDemoViewer, demoFeedPosts, mergeFeed } from '@/lib/community/demo-page';
import {
  normalizeFilter,
  normalizeSort,
  kindsForFilter,
  isMissingSchema,
  BUILD_KINDS,
} from '@/lib/community/v3';

const SORT_TO_TAB = {
  relevant: 'latest',
  recent: 'latest',
  trending: 'trending',
  discussed: 'latest',
};

/** A safe attachment as stored by the posts API; anything else is dropped. */
function shapeAttachment(a) {
  if (!a || typeof a !== 'object') return null;
  const url = typeof a.url === 'string' && a.url.startsWith('/') ? a.url : null;
  if (!url) return null;
  if (a.kind === 'sonar')
    return {
      kind: 'sonar',
      url,
      title: String(a.title || '').slice(0, 200),
      question: String(a.question || '').slice(0, 300),
      subject: a.subject ? String(a.subject).slice(0, 120) : null,
      ticker: a.ticker ? String(a.ticker).toUpperCase().slice(0, 12) : null,
      depth: a.depth ? String(a.depth).slice(0, 20) : null,
    };
  if (a.kind === 'echo')
    return {
      kind: 'echo',
      url,
      title: String(a.title || '').slice(0, 200),
      excerpt: String(a.excerpt || '').slice(0, 300),
      image: typeof a.image === 'string' && a.image.startsWith('/') ? a.image : null,
      read_minutes: Number(a.read_minutes) || null,
    };
  return null;
}

/** The v3 rows (sort + kinds), or null when community_feed_v3 is missing. */
async function v3Rows(supabase, { sort, kinds, topic, offset, limit }) {
  const { data, error } = await supabase.rpc('community_feed_v3', {
    p_sort: sort,
    p_kinds: kinds,
    p_topic: topic,
    p_offset: offset,
    p_limit: limit,
  });
  if (error) {
    if (isMissingSchema(error)) return null;
    throw new Error(error.message);
  }
  return data || [];
}

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function shapePoll(pd) {
  if (!pd || typeof pd !== 'object' || !Array.isArray(pd.options)) return null;
  const options = pd.options
    .filter((o) => o && o.id != null)
    .map((o) => ({
      id: String(o.id),
      label: String(o.label || ''),
      votes: Math.max(0, Number(o.votes) || 0),
    }));
  if (options.length < 2) return null;
  const counted = options.reduce((n, o) => n + o.votes, 0);
  return {
    question: String(pd.question || ''),
    options,
    total_votes: Math.max(counted, Number(pd.total_votes) || 0),
  };
}

function shapeEmbed(te) {
  if (!te || typeof te !== 'object' || !Array.isArray(te.symbols)) return null;
  const symbols = te.symbols
    .map((x) => String(x || '').toUpperCase())
    .filter(Boolean)
    .slice(0, 3);
  if (!symbols.length) return null;
  return { symbols, period: String(te.period || '1M') };
}

/**
 * { postId -> { poll, ticker_embed, post_type, disclosure, conviction_pct,
 * my_vote } } for the given feed rows. A failed lookup leaves the post
 * without its extras rather than failing the feed.
 */
async function extrasFor(supabase, userId, rows) {
  const ids = rows.map((r) => r.id).filter((id) => UUID.test(String(id)));
  const out = new Map();
  if (!ids.length) return out;
  const authorOf = new Map(rows.map((r) => [r.id, r.user_id]));
  const [posts, convictions, votes] = await Promise.all([
    supabase
      .from('community_posts')
      .select('id, poll_data, ticker_embed, post_type, disclosure')
      .in('id', ids),
    supabase.from('post_convictions').select('post_id, user_id, conviction_pct').in('post_id', ids),
    supabase
      .from('poll_votes')
      .select('post_id, option_id')
      .eq('user_id', userId)
      .in('post_id', ids),
  ]);
  for (const p of posts.data || []) {
    out.set(p.id, {
      poll: shapePoll(p.poll_data),
      ticker_embed: shapeEmbed(p.ticker_embed),
      post_type: p.post_type || null,
      disclosure: p.disclosure ? String(p.disclosure).slice(0, 200) : null,
      conviction_pct: null,
      my_vote: null,
    });
  }
  /* The conviction shown is the author's own, set when they wrote the post. */
  for (const c of convictions.data || []) {
    const e = out.get(c.post_id);
    if (e && c.user_id === authorOf.get(c.post_id) && Number(c.conviction_pct) > 0) {
      e.conviction_pct = Math.round(Number(c.conviction_pct));
    }
  }
  for (const v of votes.data || []) {
    const e = out.get(v.post_id);
    if (e) e.my_vote = String(v.option_id);
  }
  return out;
}

const NO_EXTRAS = {
  poll: null,
  ticker_embed: null,
  post_type: null,
  disclosure: null,
  conviction_pct: null,
  my_vote: null,
};

/** The caller's saved posts, newest save first, shaped like community_feed rows. */
async function savedRows(supabase, userId, { topic, offset, limit }) {
  const { data: saves, error } = await supabase
    .from('post_saves')
    .select('post_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  const ids = (saves || []).map((x) => x.post_id);
  if (!ids.length) return { rows: [], fetched: 0 };
  let q = supabase
    .from('community_posts')
    .select(
      'id, user_id, title, content, topic_slug, mentioned_ticker, image_url, likes_count, comments_count, reposts_count, created_at',
    )
    .in('id', ids)
    .is('parent_post_id', null)
    .is('moderation_hidden_at', null);
  if (topic) q = q.eq('topic_slug', topic);
  const [{ data: posts, error: pErr }, { data: likes }, { data: topics }] = await Promise.all([
    q,
    supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', ids),
    supabase.from('community_topics').select('slug, label'),
  ]);
  if (pErr) throw new Error(pErr.message);
  const liked = new Set((likes || []).map((l) => l.post_id));
  const labels = new Map((topics || []).map((t) => [t.slug, t.label]));
  const byId = new Map((posts || []).map((p) => [p.id, p]));
  const rows = ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p) => ({
      ...p,
      topic_label: labels.get(p.topic_slug) || null,
      liked_by_me: liked.has(p.id),
      saved_by_me: true,
    }));
  return { rows, fetched: ids.length };
}

export async function GET(request) {
  return withSession(request, 'feed', async ({ user, supabase }) => {
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

    /* Community v3: sort + kind filter (or the Research Builds list). */
    const v3 = sp.has('sort') || sp.has('filter') || sp.get('builds') === '1';
    const sort = normalizeSort(sp.get('sort'));
    const kinds =
      sp.get('builds') === '1' ? BUILD_KINDS : kindsForFilter(normalizeFilter(sp.get('filter')));

    let rows;
    let fetched;
    let v3Mode = false;
    if (v3) {
      const got = await v3Rows(supabase, { sort, kinds, topic, offset, limit });
      if (got) {
        rows = got;
        fetched = got.length;
        v3Mode = true;
      } else {
        /* Fallback: the old feed, filtered to the kinds here. */
        const { data, error } = await supabase.rpc('community_feed', {
          p_tab: SORT_TO_TAB[sort],
          p_topic: topic,
          p_before: null,
          p_offset: offset,
          p_limit: limit,
        });
        if (error) throw new Error(error.message);
        fetched = (data || []).length;
        rows = (data || []).filter((r) => !kinds || kinds.includes(r.post_type || 'discussion'));
        if (sort === 'discussed')
          rows = [...rows].sort((a, b) => (b.comments_count || 0) - (a.comments_count || 0));
        v3Mode = true;
      }
    } else if (tab === 'saved') {
      ({ rows, fetched } = await savedRows(supabase, user.id, { topic, offset, limit }));
    } else {
      const { data, error } = await supabase.rpc('community_feed', {
        p_tab: tab,
        p_topic: topic,
        p_before: tab === 'trending' ? null : beforeIso,
        p_offset: tab === 'trending' ? offset : 0,
        p_limit: limit,
      });
      if (error) throw new Error(error.message);
      rows = data || [];
      fetched = rows.length;
    }
    const extras = await extrasFor(supabase, user.id, rows).catch(() => new Map());
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
      ...(extras.get(r.id) || NO_EXTRAS),
      attachment: shapeAttachment(r.attachment),
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
      fetched < limit
        ? null
        : v3Mode || tab === 'trending' || tab === 'saved'
          ? { offset: offset + fetched }
          : { before: last?.created_at };

    if (v3Mode) {
      /* Sample posts for admin and demo viewers on the first page of the
         all-posts feed, as before. */
      if (offset === 0 && !kinds && isCommunityDemoViewer(user)) {
        const { data: topicRows } = await supabase.from('community_topics').select('slug, label');
        const demo = demoFeedPosts({ tab: 'latest', topic, topics: topicRows || [] });
        return NextResponse.json(
          { sort, posts: mergeFeed('latest', posts, demo), next },
          { headers: PRIVATE },
        );
      }
      return NextResponse.json({ sort, posts, next }, { headers: PRIVATE });
    }

    /* Master admin and demo accounts: sample posts join the first page (real
       posts stay, so a post the viewer writes still shows). Later pages are
       real rows only, so nothing repeats. */
    if (tab !== 'saved' && !beforeIso && offset === 0 && isCommunityDemoViewer(user)) {
      const { data: topicRows } = await supabase.from('community_topics').select('slug, label');
      const demo = demoFeedPosts({ tab, topic, topics: topicRows || [] });
      return NextResponse.json(
        { tab, topic, posts: mergeFeed(tab, posts, demo), next },
        { headers: PRIVATE },
      );
    }
    return NextResponse.json({ tab, topic, posts, next }, { headers: PRIVATE });
  });
}
