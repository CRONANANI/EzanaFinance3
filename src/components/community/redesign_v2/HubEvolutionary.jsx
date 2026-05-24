'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { CommunityQuickNav } from './CommunityQuickNav';
import { PulseHero } from './PulseHero';
import { ConvictionMap } from './ConvictionMap';
import { BullBearDebate } from './BullBearDebate';
import { LegendaryTakes } from './LegendaryTakes';
import { EveningBriefing } from './EveningBriefing';
import { EvoComposer } from './EvoComposer';
import { LensBar } from './LensBar';
import { PostCard } from './PostCard';
import { YourCommunityCard } from './YourCommunityCard';
import { EventCalendar } from './EventCalendar';
import { TrendingNarratives } from './TrendingNarratives';
import { CopyInbox } from './CopyInbox';
import { useEvolutionaryData } from './useEvolutionaryData';

const SKILL_ORDER = ['Novice', 'Apprentice', 'Journeyman', 'Master', 'Oracle'];

const SKILL_FILTER_MIN = {
  All: null,
  'Apprentice+': 'Apprentice',
  'Journeyman+': 'Journeyman',
  'Master+': 'Master',
  'Oracle only': 'Oracle',
};

function meetsSkillFilter(rating, filter) {
  const min = SKILL_FILTER_MIN[filter];
  if (!min) return true;
  if (min === 'Oracle') return rating === 'Oracle';
  const minIdx = SKILL_ORDER.indexOf(min);
  const ratingIdx = SKILL_ORDER.indexOf(rating);
  if (ratingIdx < 0) return min === 'Novice';
  return ratingIdx >= minIdx;
}

function FeedSkeleton({ rows = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="ez-card ez-shimmer"
          style={{ padding: 18, minHeight: 140, borderRadius: 12 }}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function HubEvolutionary() {
  const { user } = useAuth();
  const [activeLens, setActiveLens] = useState('Latest');
  const [activeTicker, setActiveTicker] = useState(null);
  const [convictionMin, setConvictionMin] = useState(0);
  const [skillFilter, setSkillFilter] = useState('All');
  const [composerOpen, setComposerOpen] = useState(false);
  const [briefingDismissed, setBriefingDismissed] = useState(false);
  const [quotedPost, setQuotedPost] = useState(null);

  const {
    posts,
    pulse,
    convictionTickers,
    bullBear,
    legendaryTakes,
    narratives,
    events,
    copyRequests,
    loading,
    error,
    updatePostConviction,
    refetch,
    setEvents,
    setCopyRequests,
  } = useEvolutionaryData({
    activeLens,
    skillFilter,
    activeTicker,
    hasUser: !!user?.id,
  });

  const profileHref = useMemo(() => {
    if (!user?.id) return null;
    const handle = user.user_metadata?.username || user.id;
    return `/profile/${handle}`;
  }, [user]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const avg = p.avg_conviction ?? 0;
      if (convictionMin > 0 && avg < convictionMin) return false;
      if (!meetsSkillFilter(p.skillRating, skillFilter)) return false;
      if (activeTicker) {
        const contentMatch = p.content?.toUpperCase().includes(`$${activeTicker}`);
        const embedMatch = p.tickerEmbed?.symbol === activeTicker;
        if (!contentMatch && !embedMatch) return false;
      }
      return true;
    });
  }, [posts, convictionMin, skillFilter, activeTicker]);

  const handleEventWatch = (eventId, watching) => {
    setEvents((prev) =>
      (prev || []).map((e) => (e.id === eventId ? { ...e, is_watched: watching, watching } : e)),
    );
  };

  const handleCopyAction = (requestId) => {
    setCopyRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  return (
    <div
      className="ezana-theme evo-hub"
      style={{ minHeight: '100%', background: 'var(--bg-primary)' }}
    >
      <div style={{ padding: '20px 28px', maxWidth: 1320, margin: '0 auto' }}>
        <CommunityQuickNav profileHref={profileHref} />

        <PulseHero pulse={pulse} activeTicker={activeTicker} setActiveTicker={setActiveTicker} />

        <ConvictionMap
          tickers={convictionTickers}
          activeTicker={activeTicker}
          onSelect={setActiveTicker}
        />

        {activeTicker && bullBear && <BullBearDebate data={bullBear} />}

        {!briefingDismissed && (
          <EveningBriefing
            pulse={pulse}
            postCount={filteredPosts.length}
            onDismiss={() => setBriefingDismissed(true)}
          />
        )}

        <LensBar
          activeLens={activeLens}
          onLensChange={setActiveLens}
          convictionMin={convictionMin}
          onConvictionMinChange={setConvictionMin}
          skillFilter={skillFilter}
          onSkillFilterChange={setSkillFilter}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 20,
          }}
        >
          <div>
            <EvoComposer
              expanded={composerOpen}
              onToggle={() => setComposerOpen((o) => !o)}
              onPosted={refetch}
              quotedPost={quotedPost}
              onClearQuote={() => setQuotedPost(null)}
            />

            {error && (
              <div style={{ color: 'var(--negative)', fontSize: 13, marginBottom: 12 }}>
                {error}
              </div>
            )}

            {loading ? (
              <FeedSkeleton />
            ) : (
              <div data-feed-anchor style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filteredPosts.length === 0 && (
                  <div
                    className="ez-card"
                    style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    No posts match your filters.
                  </div>
                )}
                {filteredPosts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    onConvictionChange={(stats) => updatePostConviction(p.id, stats)}
                  />
                ))}
              </div>
            )}
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <YourCommunityCard />
            <EventCalendar events={events} onWatchToggle={handleEventWatch} />
            <TrendingNarratives narratives={narratives} />
            <LegendaryTakes takes={legendaryTakes} />
            <CopyInbox requests={copyRequests} onAction={handleCopyAction} />
          </aside>
        </div>
      </div>
    </div>
  );
}
