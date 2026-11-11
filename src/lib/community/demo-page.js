// Server-only. Sample data for the Community page (Nov 2026), shown ONLY to
// master admin accounts and the configured demo accounts, so the page can be
// reviewed and demonstrated before the community has real activity.
//
// Nothing here is written to the database and no other member ever receives
// it: each route checks isCommunityDemoViewer(user) on the verified session
// before answering. /api/community/me returns `demo: true` for these viewers
// and the page shows a "Sample data" tag, so nobody mistakes it for real
// activity. Sample rows carry `is_demo: true`; the page keeps likes, saves,
// follows and replies on them local, and never sends them to the server.
//
// Shapes mirror the live routes exactly (feed, stats, insights, discussions,
// leaderboard/top, people, thread). Prices are not invented: Most Discussed
// still takes each ticker's name and day change from live quotes.
import { isAdminUser } from '@/lib/admin-helpers';
import { isDemoViewer } from '@/lib/community/demo-data';

/** Master admin (ADMIN_EMAILS, or app_metadata.role === 'admin', which only
 *  the service role can write) or a COMMUNITY_DEMO_EMAILS account. Never
 *  user_metadata: users can edit that themselves. */
export function isCommunityDemoViewer(user) {
  if (!user) return false;
  return user.app_metadata?.role === 'admin' || isAdminUser(user) || isDemoViewer(user);
}

const HOUR = 3600_000;
const ago = (hours) => new Date(Date.now() - hours * HOUR).toISOString();

/* Stable, UUID-shaped ids so ?post=<id> links and "View discussion" work.
   The fixed prefix can never collide with a generated UUID v4. */
const postId = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const userId = (n) => `00000000-0000-4000-9000-${String(n).padStart(12, '0')}`;
const DEMO_POST_RE = /^00000000-0000-4000-8000-\d{12}$/;

export const isDemoPostId = (id) => DEMO_POST_RE.test(String(id || ''));

const PEOPLE = {
  amara: { n: 1, name: 'Amara Okafor', type: 'Macro strategist', partner: true, followers: 8420 },
  daniel: { n: 2, name: 'Daniel Reyes', type: 'Equity analyst', partner: false, followers: 3150 },
  mei: { n: 3, name: 'Mei Tanaka', type: 'Quant researcher', partner: true, followers: 12600 },
  jonas: {
    n: 4,
    name: 'Jonas Lindqvist',
    type: 'Energy investor',
    partner: false,
    followers: 1980,
  },
  priya: { n: 5, name: 'Priya Nair', type: 'Portfolio manager', partner: true, followers: 5740 },
  tomas: { n: 6, name: 'Tomas Alvarez', type: 'Retail investor', partner: false, followers: 640 },
  helen: { n: 7, name: 'Helen Whitaker', type: 'Fixed income', partner: false, followers: 2210 },
};

function author(key) {
  const p = PEOPLE[key];
  return {
    id: userId(p.n),
    name: p.name,
    username: null,
    avatar_url: null,
    is_partner: p.partner,
    is_demo: true,
  };
}

/* topic: matched to the live community_topics rows by the label's first word,
   so the topic filter and the sidebar keep working whatever the slugs are. */
const POSTS = [
  {
    n: 1,
    who: 'mei',
    hours: 1,
    topic: 'Tech',
    ticker: 'NVDA',
    title: 'Hyperscaler capex guides are the cleanest read on AI demand',
    body: 'Three of the four largest cloud providers raised capital spending guidance this cycle. I track the ratio of guided capex to trailing revenue as a demand signal for accelerators, and it is at a series high. The risk is digestion in the second half, not demand today.',
    likes: 184,
    comments: 37,
    reposts: 21,
  },
  {
    n: 2,
    who: 'amara',
    hours: 3,
    topic: 'Macro',
    ticker: 'TLT',
    title: 'The case for adding duration before the next policy meeting',
    body: 'Real yields at the long end are still restrictive while services inflation keeps cooling. I am building a position in long Treasuries in three tranches rather than one, because the path matters more than the destination here.',
    likes: 142,
    comments: 48,
    reposts: 16,
  },
  {
    n: 3,
    who: 'daniel',
    hours: 5,
    topic: 'Markets',
    ticker: 'COST',
    title: 'Membership renewal rates matter more than same-store sales',
    body: 'Everyone watches comps. The number that actually drives the valuation is the renewal rate, because it sets the floor under fee income. A walk through the last eight quarters and what a fee increase would do to operating margin.',
    likes: 96,
    comments: 19,
    reposts: 8,
  },
  {
    n: 4,
    who: 'jonas',
    hours: 8,
    topic: 'Commodities',
    ticker: 'XOM',
    title: 'Refining margins are quietly doing the heavy lifting',
    body: 'Crude has gone sideways, yet integrated majors keep beating. The crack spread explains most of it. Here is how I separate upstream and downstream earnings sensitivity before the next print.',
    likes: 71,
    comments: 14,
    reposts: 5,
  },
  {
    n: 5,
    who: 'priya',
    hours: 13,
    topic: 'Investing',
    ticker: null,
    title: 'How I size positions when conviction is high but the range is wide',
    body: 'High conviction is not a reason to size up if the distribution of outcomes is wide. I cap any single idea by the loss I can sit through without changing the plan, then let the thesis earn a larger weight over time.',
    likes: 218,
    comments: 52,
    reposts: 34,
  },
  {
    n: 6,
    who: 'helen',
    hours: 20,
    topic: 'Global',
    ticker: 'EWJ',
    title: 'Japan governance reform is a multi-year story, not a trade',
    body: 'Buybacks and cross-shareholding unwinds are still early. I prefer owning the broad market over picking winners, with the currency left unhedged for now.',
    likes: 58,
    comments: 11,
    reposts: 4,
  },
  {
    n: 7,
    who: 'tomas',
    hours: 27,
    topic: 'Markets',
    ticker: 'AAPL',
    title: 'First time reading a 10-K start to finish: what surprised me',
    body: 'I finally read a full annual report instead of the summary. The segment table and the risk factors taught me more than a year of headlines. Sharing the five sections I would start with next time.',
    likes: 133,
    comments: 41,
    reposts: 12,
  },
  {
    n: 8,
    who: 'mei',
    hours: 44,
    topic: 'Investing',
    ticker: 'SPY',
    title: 'A simple volatility target beats most timing rules I have tested',
    body: 'Scaling exposure to a fixed volatility target improved risk-adjusted returns in my tests more reliably than any moving-average rule, mostly by cutting exposure in the worst months. Method and caveats inside.',
    likes: 164,
    comments: 29,
    reposts: 18,
  },
];

const REPLIES = {
  1: [
    [
      'daniel',
      0.8,
      'Agree on digestion risk. Do you adjust the ratio for leases, or only owned capacity?',
    ],
    [
      'priya',
      0.6,
      'Useful framing. I would add order backlog at the networking suppliers as a cross-check.',
    ],
    ['mei', 0.4, 'Owned capacity only for now. Leases are on my list, the disclosure is uneven.'],
  ],
  2: [
    [
      'helen',
      2.5,
      'Tranches make sense. I am watching the term premium more than the policy rate.',
    ],
    ['tomas', 2, 'What would make you stop adding?'],
    [
      'amara',
      1.5,
      'A re-acceleration in services inflation over two prints. That breaks the thesis.',
    ],
  ],
  5: [
    [
      'daniel',
      12,
      'The point about letting the thesis earn its weight is the part most people skip.',
    ],
    ['jonas', 10, 'How do you handle correlated positions under that cap?'],
    [
      'priya',
      9,
      'I cap the cluster, not only the name. Energy names count as one idea for sizing.',
    ],
  ],
};

function buildPost(p, topics) {
  const first = p.topic.toLowerCase();
  const match = (topics || []).find((t) =>
    String(t.label || '')
      .toLowerCase()
      .startsWith(first),
  );
  return {
    id: postId(p.n),
    title: p.title,
    excerpt: p.body,
    topic_slug: match?.slug || null,
    topic_label: match?.label || null,
    mentioned_ticker: p.ticker,
    image_url: null,
    likes_count: p.likes,
    comments_count: p.comments,
    reposts_count: p.reposts,
    created_at: ago(p.hours),
    liked_by_me: false,
    saved_by_me: false,
    author: author(p.who),
    is_demo: true,
  };
}

/**
 * Sample posts for one feed request.
 *   topics: live [{ slug, label }] rows, used to attach real topic slugs.
 *   topic:  the active topic filter (slug) or null.
 */
export function demoFeedPosts({ tab, topic, topics }) {
  let posts = POSTS.map((p) => buildPost(p, topics));
  if (topic) posts = posts.filter((p) => p.topic_slug === topic);
  if (tab === 'trending') {
    posts.sort(
      (a, b) => b.likes_count + 2 * b.comments_count - (a.likes_count + 2 * a.comments_count),
    );
  }
  return posts;
}

/** Real rows and sample rows in one list, in the tab's order. */
export function mergeFeed(tab, real, demo) {
  const all = [...real, ...demo];
  if (tab === 'trending') {
    return all.sort(
      (a, b) => b.likes_count + 2 * b.comments_count - (a.likes_count + 2 * a.comments_count),
    );
  }
  return all.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function demoThread(id) {
  const p = POSTS.find((x) => postId(x.n) === id);
  if (!p) return null;
  return {
    post: { id, title: p.title, author: author(p.who), is_demo: true },
    replies: (REPLIES[p.n] || []).map(([who, hours, content], i) => ({
      id: `${id}-r${i + 1}`,
      content,
      created_at: ago(Math.min(hours, p.hours)),
      author: author(who),
    })),
  };
}

export const DEMO_STATS = {
  total_members: 48392,
  active_this_month: 12847,
  discussions: 3264,
  my_rank: 14,
};

/* Ticker and post count only; name and day change come from live quotes. */
export const DEMO_MOST_DISCUSSED = [
  { ticker: 'NVDA', posts: 412 },
  { ticker: 'TSLA', posts: 287 },
  { ticker: 'AAPL', posts: 231 },
  { ticker: 'MSFT', posts: 164 },
];

const TOPIC_TRENDS = [
  { topic: 'Tech', posts: 486, prior: 372 },
  { topic: 'Macro', posts: 341, prior: 298 },
  { topic: 'Markets', posts: 302, prior: 319 },
  { topic: 'Commodities', posts: 127, prior: 96 },
];

export function demoTrendingTopics(topics) {
  return TOPIC_TRENDS.map((t) => {
    const match = (topics || []).find((x) =>
      String(x.label || '')
        .toLowerCase()
        .startsWith(t.topic.toLowerCase()),
    );
    return {
      slug: match?.slug || t.topic.toLowerCase(),
      label: match?.label || t.topic,
      posts: t.posts,
      prior: t.prior,
      delta_pct: Math.round(((t.posts - t.prior) / t.prior) * 1000) / 10,
    };
  });
}

export function demoSentiment() {
  return {
    net: 38,
    posts_last_hour: 64,
    hottest_ticker: 'NVDA',
    hottest_mentions: 27,
    at: ago(0.2),
  };
}

export const DEMO_DISCUSSIONS = [
  { post_id: postId(5), title: POSTS[4].title, replies: POSTS[4].comments, badge: 'hot' },
  { post_id: postId(2), title: POSTS[1].title, replies: POSTS[1].comments, badge: 'rising' },
  { post_id: postId(1), title: POSTS[0].title, replies: POSTS[0].comments, badge: 'popular' },
];

export function demoLeaderboard(user, period) {
  const row = (rank, key, return_pct) => ({
    rank,
    user_id: userId(PEOPLE[key].n),
    name: PEOPLE[key].name,
    username: null,
    avatar_url: null,
    return_pct,
    is_me: false,
    is_demo: true,
  });
  const myName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    String(user?.email || '').split('@')[0] ||
    'Member';
  return {
    period,
    top: [row(1, 'mei', 41.82), row(2, 'priya', 36.4), row(3, 'amara', 29.15)],
    me: {
      rank: DEMO_STATS.my_rank,
      user_id: user?.id || userId(0),
      name: myName,
      username: null,
      avatar_url: user?.user_metadata?.avatar_url || null,
      return_pct: 18.37,
      is_me: true,
    },
    ranked: true,
  };
}

export const DEMO_PEOPLE = ['helen', 'jonas'].map((key) => ({
  user_id: userId(PEOPLE[key].n),
  name: PEOPLE[key].name,
  username: null,
  avatar_url: null,
  type: PEOPLE[key].type,
  is_partner: PEOPLE[key].partner,
  followers: PEOPLE[key].followers,
  is_demo: true,
}));
