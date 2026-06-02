// Server-only. Mock community data shown ONLY to investor-demo accounts.
// Never written to the database — injected at the API layer for the demo viewer only.

const DEFAULT_DEMO_EMAILS = ['axmabeto@gmail.com', 'isabel.lim546@gmail.com'];
export const DEMO_EMAILS = new Set(
  (process.env.COMMUNITY_DEMO_EMAILS || DEFAULT_DEMO_EMAILS.join(','))
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

/** True only when the authenticated viewer is one of the demo accounts. Email is
 *  resolved server-side by the caller (never from client input). */
export function isDemoViewer(user) {
  const email = user?.email;
  return !!email && DEMO_EMAILS.has(email.toLowerCase());
}

const ID = {
  chen: 'demo-post-mchen-nvda',
  whitfield: 'demo-post-dwhitfield-tlt',
  kapoor: 'demo-post-riyakap-baba',
};

export const DEMO_POSTS = [
  {
    id: ID.chen,
    user_id: 'demo-user-mchen',
    content:
      'Datacenter run-rate still understates Blackwell. $NVDA hyperscaler capex guides are the tell — three of four raised this cycle. Adding on any pullback toward the 50-day.',
    mentioned_ticker: 'NVDA',
    image_url: null,
    poll_data: null,
    ticker_embed: null,
    likes_count: 47,
    comments_count: 12,
    reposts_count: 6,
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
    author: {
      id: 'demo-user-mchen',
      username: 'mchen_capital',
      display_name: 'Marcus Chen',
      bio: '',
      avatar_url: '',
      tier: 'master',
      skill_tier: 'Master',
      conviction_wins: 2341,
    },
    avg_conviction: 91,
    conviction_count: 47,
    my_conviction: null,
    liked_by_me: false,
    saved_by_me: false,
    my_vote: null,
    is_demo: true,
  },
  {
    id: ID.whitfield,
    user_id: 'demo-user-dwhitfield',
    content:
      "Duration trade is back on. If the Fed pivots dovish in Q1, $TLT at these levels is the cleanest expression. Rotating out of $XLE into long bonds — energy's structural bid is fading faster than consensus.",
    mentioned_ticker: 'TLT',
    image_url: null,
    poll_data: null,
    ticker_embed: null,
    likes_count: 112,
    comments_count: 28,
    reposts_count: 19,
    created_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
    author: {
      id: 'demo-user-dwhitfield',
      username: 'dwhitfield',
      display_name: 'Dana Whitfield',
      bio: '',
      avatar_url: '',
      tier: 'oracle',
      skill_tier: 'Oracle',
      conviction_wins: 8902,
    },
    avg_conviction: 83,
    conviction_count: 112,
    my_conviction: null,
    liked_by_me: false,
    saved_by_me: false,
    my_vote: null,
    is_demo: true,
  },
  {
    id: ID.kapoor,
    user_id: 'demo-user-riyakap',
    content:
      "China reopen narrative is getting crowded. $BABA ran 22% in three weeks on stimulus hopes that haven't materialized. Trimming half here — happy to be wrong but the risk/reward flipped.",
    mentioned_ticker: 'BABA',
    image_url: null,
    poll_data: null,
    ticker_embed: null,
    likes_count: 38,
    comments_count: 9,
    reposts_count: 3,
    created_at: new Date(Date.now() - 8 * 3600_000).toISOString(),
    author: {
      id: 'demo-user-riyakap',
      username: 'riyakap',
      display_name: 'Riya Kapoor',
      bio: '',
      avatar_url: '',
      tier: 'journeyman',
      skill_tier: 'Journeyman',
      conviction_wins: 612,
    },
    avg_conviction: 67,
    conviction_count: 38,
    my_conviction: null,
    liked_by_me: false,
    saved_by_me: false,
    my_vote: null,
    is_demo: true,
  },
];

export const DEMO_POSTS_BY_ID = Object.fromEntries(DEMO_POSTS.map((p) => [p.id, p]));

/** Matches /api/community/pulse snake_case response shape. */
export const DEMO_PULSE = {
  net_sentiment: 18,
  posts_last_hour: 14,
  active_investors: 1287,
  discussions_started: 42,
  hottest_ticker: 'NVDA',
  sectors: [
    { name: 'Technology', sentiment: 2.4, mentions: 12 },
    { name: 'Energy', sentiment: -1.1, mentions: 8 },
    { name: 'Financials', sentiment: 0.8, mentions: 5 },
  ],
};

/** Matches /api/community/conviction-map response shape. */
export const DEMO_CONVICTION_MAP = {
  tickers: [
    {
      symbol: 'NVDA',
      ticker: 'NVDA',
      name: 'NVIDIA',
      bull_pct: 78,
      bear_pct: 22,
      post_count: 9,
      avg_conviction: 78,
    },
    {
      symbol: 'TLT',
      ticker: 'TLT',
      name: 'iShares 20+ Treasury',
      bull_pct: 64,
      bear_pct: 36,
      post_count: 5,
      avg_conviction: 64,
    },
    {
      symbol: 'BABA',
      ticker: 'BABA',
      name: 'Alibaba',
      bull_pct: 41,
      bear_pct: 59,
      post_count: 4,
      avg_conviction: 41,
    },
    {
      symbol: 'XLE',
      ticker: 'XLE',
      name: 'Energy Select SPDR',
      bull_pct: 38,
      bear_pct: 62,
      post_count: 3,
      avg_conviction: 38,
    },
  ],
};

/** Matches /api/community/copy-request GET response shape. */
export const DEMO_COPY_REQUESTS = {
  incoming: [
    {
      id: 'demo-copyreq-jtorres',
      requester_id: 'demo-user-jtorres',
      requester_name: 'J. Torres',
      requester_username: 'jtorres',
      status: 'pending',
      message: 'wants to mirror your trades',
      created_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
      resolved_at: null,
    },
    {
      id: 'demo-copyreq-alin',
      requester_id: 'demo-user-alin',
      requester_name: 'A. Lin',
      requester_username: 'a_lin',
      status: 'pending',
      message: 'wants to mirror your trades',
      created_at: new Date(Date.now() - 6 * 3600_000).toISOString(),
      resolved_at: null,
    },
  ],
  outgoing: [],
};

/** Prepend demo posts for the demo viewer only. */
export function withDemoPosts(user, posts) {
  if (!isDemoViewer(user)) return posts || [];
  return [...DEMO_POSTS, ...(posts || [])];
}
