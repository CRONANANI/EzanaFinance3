'use client';

import '@/app/(dashboard)/home-dashboard/home-dashboard.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { usePartner } from '@/contexts/PartnerContext';

/* CommunityFeedPost pulls in Recharts (for the ticker embed charts some
   posts have) plus its own 700+ line UI. Feed posts render below the
   composer and the first user interaction is typically with the composer,
   so we dynamic-import the feed post component. Result: Recharts stays
   out of the initial /community bundle (~289 kB before → measurably
   smaller). A minimal placeholder prevents the feed from collapsing
   while the chunk streams in. */
const CommunityFeedPost = dynamic(
  () => import('@/components/community/CommunityFeedPost').then((m) => ({ default: m.CommunityFeedPost })),
  { ssr: false, loading: () => <div className="community-feed-post-skeleton" style={{ minHeight: 180 }} aria-hidden /> }
);
import { CommunitySocialConnectCard } from '@/components/community/CommunitySocialConnectCard';
import CopyRequestInbox from '@/components/community/CopyRequestInbox';
import { UserSearch } from '@/components/community/UserSearch';
import { FeedComposer } from '@/components/community/FeedComposer';
import {
  extractTickerFromContent,
  formatRelativeTime,
  getInitials,
  normalizeTickerEmbed,
} from '@/lib/community-utils';
import { supabase } from '@/lib/supabase';
import { auditContrast } from '@/lib/a11y/audit-contrast';

const DISCUSSION_TONE_TO_CSS = {
  emerald: { background: 'rgba(16,185,129,0.12)', color: '#10b981' },
  amber: { background: 'rgba(245,158,11,0.14)', color: '#d97706' },
  indigo: { background: 'rgba(99,102,241,0.14)', color: '#6366f1' },
};

const FEED_TABS = ['Feed', 'Following', 'Friends', 'Discussions', 'Badges'];
const PAGE_TABS = ['Community', 'My Profile', 'Messages'];

function tabToApiParam(feedTab, feedSort, hasUser) {
  if (feedTab === 'Following' || feedTab === 'Friends') return 'following';
  if (feedTab === 'Discussions') {
    return feedSort === 'Popular' ? 'trending' : 'recent';
  }
  if (feedTab === 'Feed') {
    if (feedSort === 'Popular') return 'trending';
    if (feedSort === 'Following' && hasUser) return 'following';
    return 'recent';
  }
  return 'recent';
}

function hashReturnPct(userId) {
  if (!userId) return '+8.2%';
  let h = 0;
  const s = String(userId);
  for (let i = 0; i < s.length; i += 1) h = Math.imul(31, h) + s.charCodeAt(i);
  const v = ((Math.abs(h) % 220) - 80) / 10;
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDateLine() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function rankPillClass(index) {
  if (index === 0) return 'comm-rank-pill comm-rank-pill--1';
  if (index === 1) return 'comm-rank-pill comm-rank-pill--2';
  if (index === 2) return 'comm-rank-pill comm-rank-pill--3';
  return 'comm-rank-pill';
}

function FeedSkeleton({ rows = 3 }) {
  return (
    <div className="db-card comm-skeleton-list" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="comm-skeleton-row">
          <div className="comm-skeleton-avatar" />
          <div className="comm-skeleton-lines">
            <div className="comm-skeleton-line comm-skeleton-line--short" />
            <div className="comm-skeleton-line comm-skeleton-line--mid" />
            <div className="comm-skeleton-line comm-skeleton-line--full" />
            {i === 0 && <div className="comm-skeleton-line comm-skeleton-line--block" />}
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendingTopicsCard({ topics }) {
  const PAGE_SIZE = 5;
  const [pageIndex, setPageIndex] = useState(0);

  const totalPages = Math.max(1, Math.ceil(topics.length / PAGE_SIZE));
  const startIdx = pageIndex * PAGE_SIZE;
  const visibleTopics = topics.slice(startIdx, startIdx + PAGE_SIZE);
  const isLastPage = pageIndex >= totalPages - 1;

  const handlePagerClick = () => {
    setPageIndex((i) => (isLastPage ? 0 : i + 1));
  };

  return (
    <section
      className="db-card comm-hero-card comm-trending-card comm-trending-card--paginated"
      data-community-card
      aria-label="Trending topics"
    >
      <div className="comm-hero-card-head">
        <div className="comm-card-head-left">
          <div className="comm-card-icon comm-card-icon--fire" aria-hidden>
            <i className="bi bi-fire" />
          </div>
          <div className="comm-card-head-meta">
            <h3>Trending Topics</h3>
            <p>
              Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, topics.length)} of {topics.length}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="comm-trending-pager-inline"
          onClick={handlePagerClick}
          aria-label={isLastPage ? 'Back to top of trending topics' : `Show next ${PAGE_SIZE} topics`}
        >
          <span className="comm-trending-pager-inline__count" aria-hidden>
            {pageIndex + 1} / {totalPages}
          </span>
          <span className="comm-trending-pager-inline__sep" aria-hidden>·</span>
          <span className="comm-trending-pager-inline__label">
            {isLastPage ? 'Back to top' : `Next ${PAGE_SIZE}`}
          </span>
          <i
            className={`bi ${isLastPage ? 'bi-chevron-up' : 'bi-chevron-down'} comm-trending-pager-inline__icon`}
            aria-hidden
          />
        </button>
      </div>

      {topics.length === 0 ? (
        <p className="comm-trending-empty" style={{ margin: '0 1.25rem 1.25rem', color: 'var(--db-muted, #8b949e)', fontSize: '0.875rem' }}>
          No trending hashtags in the last week yet.
        </p>
      ) : null}
      <ul className="comm-trending-row-grid comm-trending-list" aria-label="Ranked trending topics">
        {visibleTopics.map((topic, localIdx) => {
          const globalIdx = startIdx + localIdx;
          return (
            <li key={topic.tag} className="comm-trending-tile-wrap">
              <button type="button" className="comm-trending-tile comm-trending-row">
                <div className="comm-trending-tile__head">
                  <span className="comm-trending-tile__rank" aria-hidden>
                    {String(globalIdx + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`comm-trending-tile__trend comm-trending-tile__trend--${topic.trend}`}
                    aria-label={topic.trend === 'up' ? 'Trending up' : 'Trending down'}
                  >
                    <i
                      className={
                        topic.trend === 'up'
                          ? 'bi bi-arrow-up-right'
                          : 'bi bi-arrow-down-right'
                      }
                      aria-hidden
                    />
                  </span>
                </div>
                <div className="comm-trending-tile__body">
                  <span className="comm-trending-tile__tag">
                    <span className="comm-trending-tile__hash">#</span>
                    {topic.tag}
                  </span>
                  <span className="comm-trending-tile__meta">{topic.posts} posts</span>
                  <span className="comm-trending-tile__category">{topic.category}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CommunityKpiModal({ kind, data, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (!kind) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [kind]);

  if (!kind) return null;

  return (
    <div
      className="comm-kpi-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="comm-kpi-modal" role="document">
        <button
          type="button"
          className="comm-kpi-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <i className="bi bi-x-lg" aria-hidden />
        </button>

        {kind === 'top-performer' && <TopPerformerModalBody data={data} />}
        {kind === 'sector-momentum' && <SectorMomentumModalBody data={data} />}
        {kind === 'investors-to-follow' && <InvestorsToFollowModalBody data={data} />}
      </div>
    </div>
  );
}

function TopPerformerModalBody({ data }) {
  if (!data) return <p className="comm-kpi-modal__empty">No top performer data available right now.</p>;
  return (
    <>
      <div className="comm-kpi-modal__hero">
        <div className="comm-kpi-modal__avatar" aria-hidden>
          {(data.name || '?').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h2 className="comm-kpi-modal__title">{data.name}</h2>
          <p className="comm-kpi-modal__subtitle">@{data.username || data.name?.split(' ')[0]?.toLowerCase()}</p>
        </div>
        <span className="comm-kpi-modal__badge comm-kpi-modal__badge--positive">
          {data.return}
        </span>
      </div>

      <div className="comm-kpi-modal__stats">
        <div className="comm-kpi-modal__stat">
          <span className="comm-kpi-modal__stat-label">Monthly return</span>
          <span className="comm-kpi-modal__stat-value">{data.return}</span>
        </div>
        <div className="comm-kpi-modal__stat">
          <span className="comm-kpi-modal__stat-label">Followers</span>
          <span className="comm-kpi-modal__stat-value">{data.followers || '—'}</span>
        </div>
        <div className="comm-kpi-modal__stat">
          <span className="comm-kpi-modal__stat-label">Win rate</span>
          <span className="comm-kpi-modal__stat-value">{data.winRate || '68%'}</span>
        </div>
      </div>

      <h3 className="comm-kpi-modal__section-title">Top holdings this month</h3>
      <ul className="comm-kpi-modal__list">
        {/* PLACEHOLDER: wire to real portfolio holdings when API/hook is available */}
        {(data.holdings || [
          { ticker: 'NVDA', return: '+12.4%', weight: '24%' },
          { ticker: 'AAPL', return: '+5.2%', weight: '18%' },
          { ticker: 'MSFT', return: '+7.8%', weight: '15%' },
          { ticker: 'META', return: '+9.1%', weight: '12%' },
        ]).map((h) => (
          <li key={h.ticker} className="comm-kpi-modal__list-item">
            <span className="comm-kpi-modal__list-ticker">{h.ticker}</span>
            <span className="comm-kpi-modal__list-weight">{h.weight} of port.</span>
            <span className="comm-kpi-modal__list-return positive">{h.return}</span>
          </li>
        ))}
      </ul>

      {data.id && (
        <Link href={`/community/legendary/${data.id}`} className="comm-kpi-modal__cta">
          View full portfolio <i className="bi bi-arrow-right" aria-hidden />
        </Link>
      )}
    </>
  );
}

function SectorMomentumModalBody({ data }) {
  /* PLACEHOLDER: wire to real sector performance API when available */
  const sectors = data?.sectors || [
    { name: 'Technology', return: '+8.2%', trend: 'up', leaders: ['NVDA', 'MSFT', 'GOOGL'] },
    { name: 'Energy', return: '+6.4%', trend: 'up', leaders: ['XOM', 'CVX', 'COP'] },
    { name: 'Financials', return: '+3.1%', trend: 'up', leaders: ['JPM', 'BAC', 'WFC'] },
    { name: 'Industrials', return: '+2.8%', trend: 'up', leaders: ['CAT', 'BA', 'HON'] },
    { name: 'Healthcare', return: '-1.4%', trend: 'down', leaders: ['UNH', 'JNJ', 'PFE'] },
    { name: 'Consumer Disc.', return: '-2.1%', trend: 'down', leaders: ['AMZN', 'TSLA', 'HD'] },
  ];

  return (
    <>
      <div className="comm-kpi-modal__hero">
        <div className="comm-kpi-modal__icon-wrap" aria-hidden>
          <i className="bi bi-graph-up-arrow" />
        </div>
        <div>
          <h2 className="comm-kpi-modal__title">Sector momentum this week</h2>
          <p className="comm-kpi-modal__subtitle">
            How each sector is moving across the community&apos;s tracked positions.
          </p>
        </div>
      </div>

      <ul className="comm-kpi-modal__sector-list">
        {sectors.map((s) => (
          <li key={s.name} className="comm-kpi-modal__sector-row">
            <div className="comm-kpi-modal__sector-meta">
              <span className="comm-kpi-modal__sector-name">{s.name}</span>
              <span className="comm-kpi-modal__sector-leaders">
                {s.leaders.join(' · ')}
              </span>
            </div>
            <span
              className={`comm-kpi-modal__badge comm-kpi-modal__badge--${
                s.trend === 'up' ? 'positive' : 'negative'
              }`}
            >
              {s.return}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function InvestorsToFollowModalBody({ data }) {
  const investors = data?.investors || [];

  return (
    <>
      <div className="comm-kpi-modal__hero">
        <div className="comm-kpi-modal__icon-wrap" aria-hidden>
          <i className="bi bi-person-plus" />
        </div>
        <div>
          <h2 className="comm-kpi-modal__title">Investors with similar sectors</h2>
          <p className="comm-kpi-modal__subtitle">
            Sorted by performance — these investors hold positions in sectors that overlap with yours.
          </p>
        </div>
      </div>

      {investors.length === 0 ? (
        <p className="comm-kpi-modal__empty">
          No matching investors found yet. Add a few holdings to your watchlist or portfolio so we can find good matches.
        </p>
      ) : (
        <ul className="comm-kpi-modal__investor-list">
          {investors.map((inv) => (
            <li key={inv.id} className="comm-kpi-modal__investor-row">
              <div className="comm-kpi-modal__investor-avatar" aria-hidden>
                {(inv.name || '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="comm-kpi-modal__investor-meta">
                <span className="comm-kpi-modal__investor-name">{inv.name}</span>
                <span className="comm-kpi-modal__investor-tags">
                  {(inv.sectors || []).slice(0, 3).join(' · ')}
                </span>
              </div>
              <span className="comm-kpi-modal__badge comm-kpi-modal__badge--positive">
                {inv.return}
              </span>
              {inv.id && (
                <Link
                  href={`/community/legendary/${inv.id}`}
                  className="comm-kpi-modal__investor-cta"
                  aria-label={`View ${inv.name}'s profile`}
                >
                  <i className="bi bi-arrow-right" aria-hidden />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function CommunityPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPartner } = usePartner();

  const [trendingTopics, setTrendingTopics] = useState([]);
  const [friendsActivity, setFriendsActivity] = useState([]);
  const [trendingDiscussions, setTrendingDiscussions] = useState([]);

  const [userProfile, setUserProfile] = useState(null);
  const [feedTab, setFeedTab] = useState('Feed');
  const [feedSort, setFeedSort] = useState('Latest');
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedMessage, setFeedMessage] = useState('');
  const [feedError, setFeedError] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [composerText, setComposerText] = useState('');
  const [posting, setPosting] = useState(false);
  const [composerImage, setComposerImage] = useState(null);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showTickerSearch, setShowTickerSearch] = useState(false);
  const [tickerQuery, setTickerQuery] = useState('');
  const [tickerEmbedSymbols, setTickerEmbedSymbols] = useState([]);
  const [tickerStep, setTickerStep] = useState('search');
  const [tickerPeriod, setTickerPeriod] = useState('1M');
  const [quoteMap, setQuoteMap] = useState({});
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [suggestedError, setSuggestedError] = useState(false);
  const [followBusy, setFollowBusy] = useState({});
  const [activeModal, setActiveModal] = useState(null);
  const [initialPostCount, setInitialPostCount] = useState(null);
  const [mobileTab, setMobileTab] = useState('feed');

  const firstName = useMemo(() => {
    const raw =
      userProfile?.full_name ||
      userProfile?.display_name ||
      user?.user_metadata?.full_name ||
      '';
    const part = String(raw).trim().split(/\s+/)[0];
    return part || 'there';
  }, [userProfile, user]);

  const fetchFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedMessage('');
    setFeedError(false);
    try {
      const apiTab = tabToApiParam(feedTab, feedSort, !!user?.id);
      const res = await fetch(`/api/community/posts?tab=${encodeURIComponent(apiTab)}`);
      const data = await res.json();
      if (!res.ok) {
        setFeedPosts([]);
        setFeedMessage(data.error || 'Could not load posts');
        setFeedError(true);
        return;
      }
      if (data.message) setFeedMessage(data.message);

      let mapped = (data.posts || []).map((p) => ({
        id: p.id,
        text: p.content,
        userId: p.author?.id,
        username: p.author?.username || '',
        name: (p.author?.display_name || '').trim() || 'Member',
        initials: getInitials(p.author?.display_name || 'Member'),
        time: formatRelativeTime(p.created_at),
        badge: null,
        tickerSym: (() => {
          const te = normalizeTickerEmbed(p.ticker_embed);
          if (te?.symbols?.length) return te.symbols[0].symbol;
          return p.mentioned_ticker || extractTickerFromContent(p.content);
        })(),
        likes: p.likes_count ?? 0,
        comments: p.comments_count ?? 0,
        reposts: p.reposts_count ?? 0,
        liked_by_me: !!p.liked_by_me,
        saved_by_me: !!p.saved_by_me,
        image_url: p.image_url ?? null,
        poll_data: p.poll_data ?? null,
        ticker_embed: p.ticker_embed ?? null,
        my_vote: p.my_vote ?? null,
        returnBadge: hashReturnPct(p.author?.id || p.id),
        isPartner: false,
      }));

      const userIds = [...new Set(mapped.map((m) => m.userId).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, is_partner')
          .in('id', userIds);
        const pmap = Object.fromEntries(
          (profs || []).map((r) => [r.id, r.is_partner === true]),
        );
        mapped = mapped.map((m) => ({ ...m, isPartner: pmap[m.userId] || false }));
      }

      if (feedTab === 'Discussions') {
        mapped = mapped.filter((p) => /#[A-Za-z][A-Za-z0-9_]*/.test(p.text || ''));
      }

      setFeedPosts(mapped);
    } catch (e) {
      console.error(e);
      setFeedPosts([]);
      setFeedMessage('Could not load posts');
      setFeedError(true);
    } finally {
      setFeedLoading(false);
    }
  }, [feedTab, feedSort, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setUserProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, display_name, username')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setUserProfile(data || {});
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tRes, fRes, dRes] = await Promise.all([
          fetch('/api/community/trending-topics'),
          fetch('/api/community/friends-activity'),
          fetch('/api/community/trending-discussions'),
        ]);
        const tJson = tRes.ok ? await tRes.json() : { topics: [] };
        const fJson = fRes.ok ? await fRes.json() : { activity: [] };
        const dJson = dRes.ok ? await dRes.json() : { discussions: [] };
        if (!cancelled) {
          setTrendingTopics(Array.isArray(tJson.topics) ? tJson.topics : []);
          setFriendsActivity(Array.isArray(fJson.activity) ? fJson.activity : []);
          setTrendingDiscussions(Array.isArray(dJson.discussions) ? dJson.discussions : []);
        }
      } catch {
        if (!cancelled) {
          setTrendingTopics([]);
          setFriendsActivity([]);
          setTrendingDiscussions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syms = [...new Set(feedPosts.map((p) => p.tickerSym).filter(Boolean))];
    if (syms.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/market/batch-quotes?symbols=${syms.join(',')}`);
        if (!res.ok) return;
        const data = await res.json();
        const q = data.quotes || {};
        if (!cancelled) {
          const next = {};
          for (const s of syms) {
            const row = q[s];
            if (row) {
              next[s] = {
                price: row.price ?? row.last ?? row.ap ?? 0,
                changePercent:
                  row.changePercent ?? row.change_percent ?? row.pct ?? 0,
              };
            }
          }
          setQuoteMap(next);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feedPosts]);

  const loadSuggested = useCallback(async () => {
    setSuggestedLoading(true);
    setSuggestedError(false);
    try {
      const res = await fetch('/api/community/leaderboard?limit=8&period=weekly');
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const data = await res.json();
      const rows = data.rankings || [];
      setSuggestedUsers(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          username: r.username || '',
          return: `+${Number(r.return).toFixed(1)}%`,
          followers: `${Math.max(1, Math.round((r.trades || 5) * 0.35))}K`,
        })),
      );
    } catch {
      setSuggestedUsers([]);
      setSuggestedError(true);
    } finally {
      setSuggestedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuggested();
  }, [loadSuggested]);

  useEffect(() => {
    if (initialPostCount === null && feedPosts.length > 0) {
      setInitialPostCount(feedPosts.length);
    }
  }, [feedPosts.length, initialPostCount]);

  const newPostCount = Math.max(0, feedPosts.length - (initialPostCount ?? feedPosts.length));

  const scrollToFeed = useCallback(() => {
    const feedElement = document.querySelector('.comm-feed-nav');
    if (feedElement) {
      feedElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const sectorMomentum = useMemo(
    () => ({ name: 'Technology', return: '+8.2%', trend: 'up' }),
    [],
  );

  const closeKpiModal = useCallback(() => setActiveModal(null), []);

  const kpiModalData = useMemo(() => {
    if (!activeModal) return null;
    if (activeModal === 'top-performer') return suggestedUsers[0] ?? null;
    if (activeModal === 'sector-momentum') return null;
    const tags = ['Technology', 'Financials', 'Healthcare', 'Energy', 'Consumer Disc.'];
    return {
      /* PLACEHOLDER sector tags until profile/watchlist overlap API exists */
      investors: suggestedUsers.map((inv, i) => ({
        ...inv,
        sectors:
          inv.sectors ??
          [tags[i % tags.length], tags[(i + 2) % tags.length]],
      })),
    };
  }, [activeModal, suggestedUsers]);

  /** Dev-only contrast audit — runs once the page has had a chance to paint. */
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return undefined;
    const t = setTimeout(() => {
      auditContrast('.db-page.community-root');
    }, 600);
    return () => clearTimeout(t);
  }, [feedLoading, suggestedLoading, feedTab]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleLike = async (postId, liked) => {
    if (!user) return;
    const action = liked ? 'unlike' : 'like';
    setFeedPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked_by_me: !liked, likes: Math.max(0, p.likes + (liked ? -1 : 1)) }
          : p,
      ),
    );
    try {
      const res = await fetch('/api/community/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, action }),
      });
      const data = await res.json();
      if (data.likes_count != null) {
        setFeedPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likes: data.likes_count } : p)),
        );
      }
    } catch {
      fetchFeed();
    }
  };

  const handleSave = async (postId, saved) => {
    if (!user) return;
    const action = saved ? 'unsave' : 'save';
    setFeedPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, saved_by_me: !saved } : p)),
    );
    try {
      await fetch('/api/community/posts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, action }),
      });
    } catch {
      fetchFeed();
    }
  };

  const handleCommentPosted = (postId) => {
    setFeedPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p)),
    );
  };

  const handleFollowSuggested = async (targetId) => {
    if (!user?.id || user.id === targetId) return;
    setFollowBusy((b) => ({ ...b, [targetId]: true }));
    try {
      await fetch('/api/community/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetId, action: 'follow' }),
      });
    } finally {
      setFollowBusy((b) => ({ ...b, [targetId]: false }));
    }
  };

  const onPageTab = (t) => {
    if (t === 'Messages') router.push('/community/messages');
    if (t === 'My Profile') {
      if (!user?.id) return;
      const handle =
        userProfile?.username || user?.user_metadata?.username || user.id;
      router.push(`/profile/${handle}`);
    }
  };

  // ─── Derived KPI values for the stats strip ──────────────────────
  const topSuggestedReturn = suggestedUsers[0]?.return ?? null;

  return (
    <div
      className="dashboard-page-inset db-page community-root"
      style={{ paddingTop: 0, paddingBottom: '2rem' }}
    >
      {/* ═══════════ DESKTOP LAYOUT (≥768px via CSS) ═══════════════════════ */}
      <div className="comm-desktop-shell">
      <div className="comm-greeting-row">
        <div className="comm-greeting-section">
          <h1 className="db-greeting">
            <span>
              {getGreeting()}, {firstName}
            </span>
            <span className="db-greeting-waving" aria-hidden>👋</span>
          </h1>
          <p className="db-greeting-sub">
            Connect, share, and grow with the investing community
          </p>
          <p className="db-greeting-date">{formatDateLine()}</p>
        </div>

        <div className="comm-page-tabs comm-page-tabs--top" role="tablist">
          {PAGE_TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={t === 'Community'}
              onClick={() => onPageTab(t)}
              className={`comm-page-tab ${t === 'Community' ? 'is-active' : ''}`}
            >
              {t === 'Community' && <i className="bi bi-people" aria-hidden />}
              {t === 'My Profile' && <i className="bi bi-person-circle" aria-hidden />}
              {t === 'Messages' && <i className="bi bi-chat-dots" aria-hidden />}
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Trending Topics — full-width card below greeting/tabs ═══ */}
      <div className="comm-hero-cards">
        <TrendingTopicsCard topics={trendingTopics} />
      </div>

      {/* ═══ KPI strip — community-wide snapshot ═══ */}
      <section className="comm-kpi-row" aria-label="Community at a glance">
        <button
          type="button"
          className="db-card comm-kpi-card comm-kpi-card--actionable"
          data-community-card
          onClick={scrollToFeed}
          aria-label={
            newPostCount > 0
              ? `${newPostCount} new posts in feed — click to scroll to feed`
              : `${feedPosts.length} posts in feed — click to scroll to feed`
          }
        >
          <div className="comm-kpi-icon" aria-hidden>
            <i className="bi bi-chat-square-text" />
          </div>
          <div className="comm-kpi-body">
            <span className="comm-kpi-label">
              {newPostCount > 0 ? 'New posts' : 'Posts in feed'}
            </span>
            <span className="comm-kpi-value">
              {newPostCount > 0 ? `+${newPostCount}` : feedPosts.length}
            </span>
            <span className="comm-kpi-sub">
              {newPostCount > 0 ? 'Tap to scroll to feed' : 'Live from the community'}
            </span>
          </div>
          <i className="bi bi-arrow-down comm-kpi-card__chevron" aria-hidden />
        </button>

        <button
          type="button"
          className="db-card comm-kpi-card comm-kpi-card--actionable"
          data-community-card
          onClick={() => setActiveModal('top-performer')}
          aria-label="View top performer's portfolio"
        >
          <div className="comm-kpi-icon" aria-hidden>
            <i className="bi bi-graph-up-arrow" />
          </div>
          <div className="comm-kpi-body">
            <span className="comm-kpi-label">Top performer</span>
            <span className="comm-kpi-value">{topSuggestedReturn || '—'}</span>
            <span className="comm-kpi-sub positive">
              {suggestedUsers[0]?.name
                ? `@${
                    suggestedUsers[0].username ||
                    suggestedUsers[0].name.split(' ')[0].toLowerCase()
                  }`
                : 'Weekly leader'}
            </span>
          </div>
          <i className="bi bi-chevron-right comm-kpi-card__chevron" aria-hidden />
        </button>

        <button
          type="button"
          className="db-card comm-kpi-card comm-kpi-card--actionable"
          data-community-card
          onClick={() => setActiveModal('sector-momentum')}
          aria-label="View sector momentum breakdown"
        >
          <div className="comm-kpi-icon" aria-hidden>
            <i className="bi bi-bar-chart-line" />
          </div>
          <div className="comm-kpi-body">
            <span className="comm-kpi-label">Sector momentum</span>
            <span className="comm-kpi-value">{sectorMomentum?.name || '—'}</span>
            <span className="comm-kpi-sub positive">
              Leading at {sectorMomentum?.return || '—'} this week
            </span>
          </div>
          <i className="bi bi-chevron-right comm-kpi-card__chevron" aria-hidden />
        </button>

        <button
          type="button"
          className="db-card comm-kpi-card comm-kpi-card--actionable"
          data-community-card
          onClick={() => setActiveModal('investors-to-follow')}
          aria-label="View investors with similar holdings"
        >
          <div className="comm-kpi-icon" aria-hidden>
            <i className="bi bi-person-plus" />
          </div>
          <div className="comm-kpi-body">
            <span className="comm-kpi-label">Investors to follow</span>
            <span className="comm-kpi-value">{suggestedUsers.length}</span>
            <span className="comm-kpi-sub">Similar to your sectors</span>
          </div>
          <i className="bi bi-chevron-right comm-kpi-card__chevron" aria-hidden />
        </button>
      </section>

      {activeModal && (
        <CommunityKpiModal kind={activeModal} data={kpiModalData} onClose={closeKpiModal} />
      )}

      {/* ═══ Find investors — user search wrapped in the shared card shell ═══ */}
      <section
        className="db-card comm-usersearch-card"
        data-community-card
        aria-label="Find investors"
      >
        <div className="db-card-header has-icon">
          <div className="comm-card-head-left">
            <div className="comm-card-icon" aria-hidden>
              <i className="bi bi-search" />
            </div>
            <div className="comm-card-head-meta">
              <h3>Find investors</h3>
              <p>
                Search by name or email to view their profile and trading
                activity.
              </p>
            </div>
          </div>
        </div>
        <div className="comm-usersearch-body">
          <UserSearch />
        </div>
      </section>

      <div className="comm-3col">
          <div className="comm-col-left">
            <CommunitySocialConnectCard variant={isPartner ? 'partner' : 'user'} />
            <CopyRequestInbox />
          </div>

          <div className="comm-col-center">
            <div className="comm-sticky-composer">
              <FeedComposer
                user={user}
                userProfile={userProfile}
                composerText={composerText}
                setComposerText={setComposerText}
                posting={posting}
                setPosting={setPosting}
                composerImage={composerImage}
                setComposerImage={setComposerImage}
                showImageMenu={showImageMenu}
                setShowImageMenu={setShowImageMenu}
                showPollBuilder={showPollBuilder}
                setShowPollBuilder={setShowPollBuilder}
                pollQuestion={pollQuestion}
                setPollQuestion={setPollQuestion}
                pollOptions={pollOptions}
                setPollOptions={setPollOptions}
                showTickerSearch={showTickerSearch}
                setShowTickerSearch={setShowTickerSearch}
                tickerQuery={tickerQuery}
                setTickerQuery={setTickerQuery}
                tickerEmbedSymbols={tickerEmbedSymbols}
                setTickerEmbedSymbols={setTickerEmbedSymbols}
                tickerStep={tickerStep}
                setTickerStep={setTickerStep}
                tickerPeriod={tickerPeriod}
                setTickerPeriod={setTickerPeriod}
                onPosted={fetchFeed}
              />
            </div>

            <div className="comm-feed-nav">
              <select
                value={feedSort}
                onChange={(e) => setFeedSort(e.target.value)}
                className="comm-feed-nav__sort"
                aria-label="Sort feed"
              >
                <option>Latest</option>
                <option>Popular</option>
                <option>Following</option>
              </select>
              <div className="comm-feed-nav__tabs">
                {FEED_TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (t === 'Badges') {
                        router.push('/badges');
                        return;
                      }
                      setFeedTab(t);
                    }}
                    className={`comm-feed-nav__tab ${feedTab === t ? 'is-active' : ''}`}
                  >
                    {t === 'Badges' && <i className="bi bi-award" aria-hidden />}
                    {t}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => document.getElementById('comm-composer')?.focus()}
                  className="comm-feed-nav__cta"
                >
                  <i className="bi bi-pencil-square" aria-hidden /> New Post
                </button>
              </div>
            </div>

            <div className="comm-feed-stream">
              {feedLoading ? (
                <FeedSkeleton rows={3} />
              ) : feedError ? (
                <div
                  className="db-card comm-state-card comm-state-card--error"
                  data-community-card
                  role="alert"
                >
                  <div className="comm-state-card__icon">
                    <i className="bi bi-exclamation-triangle" aria-hidden />
                  </div>
                  <p className="comm-state-card__title">Couldn&apos;t load posts</p>
                  <p className="comm-state-card__desc">
                    {feedMessage || 'The community feed is temporarily unavailable.'}
                  </p>
                  <button type="button" className="comm-state-card__retry" onClick={fetchFeed}>
                    Retry
                  </button>
                </div>
              ) : feedPosts.length === 0 ? (
                <div className="db-card comm-state-card" data-community-card>
                  <div className="comm-state-card__icon">
                    <i className="bi bi-chat-dots" aria-hidden />
                  </div>
                  <p className="comm-state-card__title">No posts yet</p>
                  <p className="comm-state-card__desc">
                    Be the first to share something with the community.
                  </p>
                </div>
              ) : (
                <>
                  {feedMessage && (
                    <div className="db-card comm-state-card" data-community-card>
                      <p className="comm-state-card__desc">{feedMessage}</p>
                    </div>
                  )}
                  {feedPosts.map((post) => (
                    <CommunityFeedPost
                      key={post.id}
                      post={post}
                      expanded={expandedId === post.id}
                      onToggle={toggleExpand}
                      onLike={handleLike}
                      onSave={handleSave}
                      quote={post.tickerSym ? quoteMap[post.tickerSym] : undefined}
                      onCommentPosted={handleCommentPosted}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="comm-col-right">
            <section className="db-card suggested-for-you-card" data-community-card aria-label="Suggested investors">
              <div className="db-card-header has-icon">
                <div className="comm-card-head-left">
                  <div className="comm-card-icon" aria-hidden>
                    <i className="bi bi-stars" />
                  </div>
                  <div className="comm-card-head-meta">
                    <h3>Suggested for You</h3>
                    <p>Investors worth following this week</p>
                  </div>
                </div>
                <Link href="/leaderboard" className="comm-card-view-all">
                  View All
                </Link>
              </div>

              <div className="comm-leaderboard-body">
                {suggestedLoading && (
                  <>
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="comm-list-row" aria-hidden>
                        <div className="comm-skeleton-avatar" style={{ width: 30, height: 30 }} />
                        <div className="comm-list-row__body">
                          <div className="comm-skeleton-line comm-skeleton-line--mid" />
                          <div className="comm-skeleton-line comm-skeleton-line--short" style={{ marginTop: 4 }} />
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {!suggestedLoading && suggestedError && (
                  <div className="comm-state-card comm-state-card--error" role="alert">
                    <div className="comm-state-card__icon">
                      <i className="bi bi-exclamation-triangle" aria-hidden />
                    </div>
                    <p className="comm-state-card__title">Couldn&apos;t load suggestions</p>
                    <p className="comm-state-card__desc">
                      Something went wrong fetching this week&apos;s top investors.
                    </p>
                    <button type="button" className="comm-state-card__retry" onClick={loadSuggested}>
                      Retry
                    </button>
                  </div>
                )}

                {!suggestedLoading && !suggestedError && suggestedUsers.length === 0 && (
                  <div className="comm-state-card">
                    <div className="comm-state-card__icon">
                      <i className="bi bi-people" aria-hidden />
                    </div>
                    <p className="comm-state-card__title">No suggestions yet</p>
                    <p className="comm-state-card__desc">
                      Check back once this week&apos;s rankings are computed.
                    </p>
                  </div>
                )}

                {!suggestedLoading && !suggestedError && suggestedUsers.length > 0 &&
                  suggestedUsers.map((u, i) => (
                    <div key={u.id} className="comm-list-row">
                      <span className={rankPillClass(i)} aria-label={`Rank ${i + 1}`}>
                        {i + 1}
                      </span>
                      <div className="comm-list-row__avatar" aria-hidden>
                        {getInitials(u.name)}
                      </div>
                      <div className="comm-list-row__body">
                        <Link href={`/profile/${u.username || u.id}`} className="comm-list-row__name">
                          {u.name}
                        </Link>
                        <p className="comm-list-row__handle">
                          {u.username ? `@${u.username}` : `${u.followers} followers`}
                        </p>
                      </div>
                      <div className="comm-list-row__trail">
                        <p className="comm-list-row__trail-primary comm-metric-pos">{u.return}</p>
                        <p className="comm-list-row__trail-secondary">{u.followers} followers</p>
                      </div>
                      {user?.id !== u.id && (
                        <button
                          type="button"
                          disabled={followBusy[u.id]}
                          onClick={() => handleFollowSuggested(u.id)}
                          className="comm-follow-btn"
                        >
                          {followBusy[u.id] ? '…' : 'Follow'}
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </section>

            <section className="db-card" data-community-card aria-label="Friends activity">
              <div className="db-card-header has-icon">
                <div className="comm-card-head-left">
                  <div className="comm-card-icon" aria-hidden>
                    <i className="bi bi-activity" />
                  </div>
                  <div className="comm-card-head-meta">
                    <h3>Friends Activity</h3>
                    <p>See what your friends are up to</p>
                  </div>
                </div>
                <Link href="/community" className="comm-card-view-all">
                  View All
                </Link>
              </div>

              <div className="comm-leaderboard-body">
                {friendsActivity.length === 0 ? (
                  <p
                    className="comm-state-card__desc"
                    style={{ margin: '0.75rem 1rem', color: 'var(--db-muted, #8b949e)' }}
                  >
                    No recent activity from people you follow. Follow investors to see updates here.
                  </p>
                ) : (
                  friendsActivity.map((f) => (
                    <div key={`${f.username}-${f.time}-${f.name}`} className="comm-list-row">
                      <div className="comm-list-row__avatar" aria-hidden>
                        {getInitials(f.name)}
                      </div>
                      <div className="comm-list-row__body">
                        <p className="comm-list-row__name">{f.name}</p>
                        <p className="comm-list-row__handle">@{f.username}</p>
                        <p className="comm-list-row__meta">{f.action}</p>
                      </div>
                      <div className="comm-list-row__trail">
                        <p className="comm-list-row__trail-secondary">{f.time}</p>
                        {f.ret && (
                          <p
                            className={`comm-list-row__trail-primary ${
                              f.direction === 'pos' ? 'comm-metric-pos' : 'comm-metric-neg'
                            }`}
                          >
                            {f.ret}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="db-card" data-community-card aria-label="Trending discussions">
              <div className="db-card-header has-icon">
                <div className="comm-card-head-left">
                  <div className="comm-card-icon" aria-hidden>
                    <i className="bi bi-chat-quote" />
                  </div>
                  <div className="comm-card-head-meta">
                    <h3>Trending Discussions</h3>
                    <p>What everyone is talking about</p>
                  </div>
                </div>
                <Link href="/community" className="comm-card-view-all">
                  View All
                </Link>
              </div>

              <div className="comm-leaderboard-body">
                {trendingDiscussions.length === 0 ? (
                  <p
                    className="comm-state-card__desc"
                    style={{ margin: '0.75rem 1rem', color: 'var(--db-muted, #8b949e)' }}
                  >
                    No discussion threads with activity this week yet.
                  </p>
                ) : (
                  trendingDiscussions.map((d, di) => {
                    const tone = DISCUSSION_TONE_TO_CSS[d.tone] || DISCUSSION_TONE_TO_CSS.emerald;
                    return (
                      <div
                        key={`${d.title}-${di}`}
                        className="comm-list-row comm-list-row--interactive"
                        role="button"
                        tabIndex={0}
                      >
                        <div
                          className="comm-list-row__icon"
                          style={{
                            background: tone.background,
                            color: tone.color,
                          }}
                          aria-hidden
                        >
                          <i className="bi bi-chat-dots" />
                        </div>
                        <div className="comm-list-row__body">
                          <p className="comm-list-row__name">{d.title}</p>
                          <p className="comm-list-row__handle">Started by {d.author}</p>
                        </div>
                        <div className="comm-list-row__trail">
                          <p className="comm-list-row__trail-secondary">
                            <i className="bi bi-chat" aria-hidden /> {d.comments.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
      </div>

      </div>

      <div className="comm-mobile-shell">
        <div className="comm-mobile-header">
          <h1 className="comm-mobile-header__title">Community</h1>
          <button type="button" className="comm-mobile-header__notif" aria-label="Notifications">
            <i className="bi bi-bell" />
          </button>
        </div>

        <div className="comm-mobile-tabbar">
          {[
            { id: 'feed', label: 'Feed', icon: 'bi-rss' },
            { id: 'trending', label: 'Trending', icon: 'bi-fire' },
            { id: 'people', label: 'People', icon: 'bi-people' },
            { id: 'me', label: 'Me', icon: 'bi-person' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMobileTab(t.id)}
              className={`comm-mobile-tabbar__tab ${mobileTab === t.id ? 'is-active' : ''}`}
            >
              <i className={`bi ${t.icon}`} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="comm-mobile-body">
          {mobileTab === 'feed' && (
            <>
              <div className="comm-mobile-stat-row">
                <div className="comm-mobile-stat-card">
                  <span className="comm-mobile-stat-label">POSTS</span>
                  <span className="comm-mobile-stat-value">{feedPosts.length}</span>
                </div>
                <div className="comm-mobile-stat-card">
                  <span className="comm-mobile-stat-label">FOLLOWING</span>
                  <span className="comm-mobile-stat-value">{suggestedUsers.length}</span>
                </div>
              </div>
              <div className="comm-sticky-composer">
                <FeedComposer
                  user={user}
                  userProfile={userProfile}
                  composerText={composerText}
                  setComposerText={setComposerText}
                  posting={posting}
                  setPosting={setPosting}
                  composerImage={composerImage}
                  setComposerImage={setComposerImage}
                  showImageMenu={showImageMenu}
                  setShowImageMenu={setShowImageMenu}
                  showPollBuilder={showPollBuilder}
                  setShowPollBuilder={setShowPollBuilder}
                  pollQuestion={pollQuestion}
                  setPollQuestion={setPollQuestion}
                  pollOptions={pollOptions}
                  setPollOptions={setPollOptions}
                  showTickerSearch={showTickerSearch}
                  setShowTickerSearch={setShowTickerSearch}
                  tickerQuery={tickerQuery}
                  setTickerQuery={setTickerQuery}
                  tickerEmbedSymbols={tickerEmbedSymbols}
                  setTickerEmbedSymbols={setTickerEmbedSymbols}
                  tickerStep={tickerStep}
                  setTickerStep={setTickerStep}
                  tickerPeriod={tickerPeriod}
                  setTickerPeriod={setTickerPeriod}
                  onPosted={fetchFeed}
                />
              </div>
              <div className="comm-feed-stream">
                {feedLoading ? (
                  <FeedSkeleton rows={3} />
                ) : feedPosts.length === 0 ? (
                  <div className="db-card comm-state-card" data-community-card>
                    <p className="comm-state-card__title">No posts yet</p>
                  </div>
                ) : (
                  feedPosts.map((post) => (
                    <CommunityFeedPost
                      key={post.id}
                      post={post}
                      expanded={expandedId === post.id}
                      onToggle={toggleExpand}
                      onLike={handleLike}
                      onSave={handleSave}
                      quote={post.tickerSym ? quoteMap[post.tickerSym] : undefined}
                      onCommentPosted={handleCommentPosted}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {mobileTab === 'trending' && (
            <div className="comm-mobile-trending-grid">
              {trendingTopics.length === 0 ? (
                <p className="comm-state-card__desc">No trending topics right now.</p>
              ) : (
                trendingTopics.map((topic, i) => (
                  <div key={`${topic.tag}-${i}`} className="comm-mobile-trending-tile">
                    <span className="comm-mobile-trending-tag">#{topic.tag}</span>
                    <span className="comm-mobile-trending-count">{topic.posts} posts</span>
                  </div>
                ))
              )}
            </div>
          )}

          {mobileTab === 'people' && (
            <>
              <section className="db-card" data-community-card>
                <div className="db-card-header has-icon">
                  <div className="comm-card-head-left">
                    <div className="comm-card-icon" aria-hidden>
                      <i className="bi bi-stars" />
                    </div>
                    <div className="comm-card-head-meta">
                      <h3>Suggested for You</h3>
                    </div>
                  </div>
                </div>
                <div className="comm-leaderboard-body">
                  {suggestedUsers.map((u) => (
                    <div key={u.id} className="comm-list-row">
                      <div className="comm-list-row__avatar" aria-hidden>
                        {getInitials(u.name)}
                      </div>
                      <div className="comm-list-row__body">
                        <Link href={`/profile/${u.username || u.id}`} className="comm-list-row__name">
                          {u.name}
                        </Link>
                        <p className="comm-list-row__handle">{u.return}</p>
                      </div>
                      {user?.id !== u.id && (
                        <button
                          type="button"
                          disabled={followBusy[u.id]}
                          onClick={() => handleFollowSuggested(u.id)}
                          className="comm-follow-btn"
                        >
                          {followBusy[u.id] ? '…' : 'Follow'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
              <section className="db-card" data-community-card style={{ marginTop: '0.75rem' }}>
                <div className="db-card-header has-icon">
                  <div className="comm-card-head-left">
                    <div className="comm-card-icon" aria-hidden>
                      <i className="bi bi-activity" />
                    </div>
                    <div className="comm-card-head-meta">
                      <h3>Friends Activity</h3>
                    </div>
                  </div>
                </div>
                <div className="comm-leaderboard-body">
                  {friendsActivity.length === 0 ? (
                    <p className="comm-state-card__desc" style={{ margin: '0.75rem 1rem' }}>
                      No recent activity.
                    </p>
                  ) : (
                    friendsActivity.map((f) => (
                      <div key={`${f.username}-${f.time}`} className="comm-list-row">
                        <div className="comm-list-row__avatar" aria-hidden>
                          {getInitials(f.name)}
                        </div>
                        <div className="comm-list-row__body">
                          <p className="comm-list-row__name">{f.name}</p>
                          <p className="comm-list-row__meta">{f.action}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}

          {mobileTab === 'me' && (
            <>
              <div className="comm-feed-stream">
                {feedLoading ? (
                  <FeedSkeleton rows={2} />
                ) : feedPosts.filter((p) => p.userId === user?.id).length === 0 ? (
                  <div className="db-card comm-state-card" data-community-card>
                    <p className="comm-state-card__title">Your posts</p>
                    <p className="comm-state-card__desc">
                      Nothing here yet. Compose from the Feed tab.
                    </p>
                  </div>
                ) : (
                  feedPosts
                    .filter((p) => p.userId === user?.id)
                    .map((post) => (
                      <CommunityFeedPost
                        key={post.id}
                        post={post}
                        expanded={expandedId === post.id}
                        onToggle={toggleExpand}
                        onLike={handleLike}
                        onSave={handleSave}
                        quote={post.tickerSym ? quoteMap[post.tickerSym] : undefined}
                        onCommentPosted={handleCommentPosted}
                      />
                    ))
                )}
              </div>
              <CommunitySocialConnectCard variant={isPartner ? 'partner' : 'user'} />
              <div style={{ marginTop: '0.75rem' }}>
                <CopyRequestInbox />
              </div>
            </>
          )}
        </div>

        <nav className="comm-mobile-bottom-nav">
          <button type="button" onClick={() => router.push('/home')} className="comm-bottom-icon">
            <i className="bi bi-house" />
            <span>Home</span>
          </button>
          <button type="button" onClick={() => router.push('/company-research')} className="comm-bottom-icon">
            <i className="bi bi-search" />
            <span>Search</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileTab('feed');
              document.getElementById('comm-composer')?.focus();
            }}
            className="comm-bottom-icon comm-bottom-icon--compose"
          >
            <i className="bi bi-plus-circle-fill" />
            <span>Post</span>
          </button>
          <button type="button" className="comm-bottom-icon is-active">
            <i className="bi bi-people-fill" />
            <span>Community</span>
          </button>
          <button type="button" onClick={() => onPageTab('My Profile')} className="comm-bottom-icon">
            <i className="bi bi-person" />
            <span>Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
