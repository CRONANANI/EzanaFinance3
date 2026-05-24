'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { ORG_SHORT } from '@/lib/orgMockData';
import { TRACKS, getLevelLabel } from '@/lib/learning-curriculum';
import {
  buildProgressMap,
  canAccessCourse,
  getOrderedCoursesForTrack,
  isCourseFullyCompleted,
  isLevelUnlocked,
} from '@/lib/learning-progress-logic';
import { getInitials } from '@/lib/community-utils';
import {
  LearningCard,
  CardPrimary,
  CardSecondary,
  CardMuted,
} from '@/components/learning/LearningCard';
import { useLearningCenterData } from './redesign/useLearningCenterData';
import { PageHeader } from './redesign/PageHeader';
import { EloHero } from './redesign/EloHero';
import { DailyQuest } from './redesign/DailyQuest';
import { TrackTowers } from './redesign/TrackTowers';
import { ActivePath } from './redesign/ActivePath';
import { Leaderboard } from './redesign/Leaderboard';
import { Bookmarks } from './redesign/Bookmarks';
import '@/app/(dashboard)/home-dashboard/home-dashboard.css';
import '@/app/(dashboard)/learning-center/learning-center.css';

function buildEloFromLeaderboard(leaderboard) {
  const me = leaderboard?.rankings?.find((r) => r.is_me);
  return {
    total: me?.total_elo ?? me?.elo ?? 0,
    weekly_delta: me?.delta ?? 0,
    tier: me?.tier || 'Bronze',
    percentile: 25,
    rank_in_network: me?.rank || 1,
    position_pct: me?.position_pct ?? 0,
  };
}

function buildStats(courses) {
  const rows = courses?.progress || [];
  const completed = rows.filter((r) => r.status === 'completed' && r.quiz_passed).length;
  return {
    courses_done: completed,
    courses_total: courses?.overall?.total || 120,
    hours_this_week: '—',
    quizzes_passed_perfect: completed,
    quizzes_passed_total: completed,
    badges_earned: (courses?.badges || []).length,
    next_badge: 'Bronze · Stocks',
  };
}

function computeNextBadgeRemaining(trackId, progressById) {
  const ordered = getOrderedCoursesForTrack(trackId);
  const remaining = ordered.filter((c) => !isCourseFullyCompleted(progressById[c.id])).length;
  return Math.min(remaining, 99);
}

function getPrevLevelLabel(lv) {
  return { intermediate: 'Basic', advanced: 'Intermediate', expert: 'Advanced' }[lv] || 'Basic';
}

function formatResetsIn(iso) {
  if (!iso) return '—';
  const ms = new Date(iso) - Date.now();
  const h = Math.max(0, Math.floor(ms / 3600000));
  const m = Math.max(0, Math.floor((ms % 3600000) / 60000));
  return `${h}h ${m}m`;
}

function LoadingState() {
  return (
    <div className="lc-page dashboard-page-inset db-page">
      <p style={{ color: 'var(--text-muted)' }}>Loading Learning Center…</p>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div className="lc-page dashboard-page-inset db-page">
      <p style={{ color: 'var(--negative)' }}>{error || 'Unable to load.'}</p>
    </div>
  );
}

function OrgAssignedCard() {
  return (
    <LearningCard
      as="div"
      surface="default"
      className="db-card lc-org-card"
      style={{ marginBottom: 18, padding: '1rem 1.25rem', borderColor: 'rgba(99,102,241,0.25)' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              color: 'var(--info)',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontSize: '0.7rem',
            }}
          >
            Assigned by your Portfolio Manager
          </div>
          <CardPrimary
            as="div"
            style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.35rem' }}
          >
            {ORG_SHORT} Learning Assignments
          </CardPrimary>
          <CardSecondary as="p" style={{ fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
            Track what your council expects you to complete this week.
          </CardSecondary>
        </div>
        <Link
          href="/org-team-hub"
          style={{
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--emerald-text)',
            whiteSpace: 'nowrap',
          }}
        >
          Team Hub →
        </Link>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          marginTop: '1rem',
        }}
      >
        {[
          { title: 'Valuation Fundamentals', status: 'in_progress', due: 'Apr 12' },
          { title: 'Pitch Deck Writing', status: 'assigned', due: 'Apr 14' },
          { title: 'Risk & Position Sizing', status: 'assigned', due: 'Apr 18' },
        ].map((a) => (
          <LearningCard
            key={a.title}
            as="div"
            surface="muted"
            style={{
              padding: '0.75rem',
              borderRadius: '10px',
              border: '1px solid var(--border-primary)',
              background: 'var(--surface-card-hover)',
            }}
          >
            <CardPrimary as="div" style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
              {a.title}
            </CardPrimary>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
              <CardMuted as="span" style={{ fontSize: '0.65rem' }}>
                {a.status.replace('_', ' ')}
              </CardMuted>
              <CardMuted as="span" style={{ fontSize: '0.65rem' }}>
                Due {a.due}
              </CardMuted>
            </div>
          </LearningCard>
        ))}
      </div>
    </LearningCard>
  );
}

export function LearningCenterPage() {
  const { user } = useAuth();
  const { isOrgUser } = useOrg();
  const { data, loading, error, setMainTrack, toggleBookmark, setLeaderboardPeriod } =
    useLearningCenterData();

  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('basic');

  const effectiveTrack = selectedTrack || data.mainTrack || 'stocks';

  const progressById = useMemo(
    () => (data.courses ? buildProgressMap(data.courses.progress || []) : {}),
    [data.courses],
  );

  const pathCourses = useMemo(() => {
    if (!data.courses) return [];
    const ordered = getOrderedCoursesForTrack(effectiveTrack).filter(
      (c) => c.level === selectedLevel,
    );
    const bookmarkedIds = new Set(data.bookmarks.map((b) => b.course_id));
    let nextAssigned = false;
    return ordered.map((c) => {
      const p = progressById[c.id];
      const access = canAccessCourse(c, progressById);
      let state;
      if (isCourseFullyCompleted(p)) {
        state = 'completed';
      } else if (!access.ok) {
        state = 'locked';
      } else if (!nextAssigned) {
        state = 'next';
        nextAssigned = true;
      } else {
        state = 'unstarted';
      }
      return {
        id: c.id,
        title: c.title,
        duration_minutes: c.duration_minutes,
        state,
        bookmarked: bookmarkedIds.has(c.id),
      };
    });
  }, [data.courses, data.bookmarks, effectiveTrack, selectedLevel, progressById]);

  const levelUnlocked = useMemo(
    () => isLevelUnlocked(effectiveTrack, selectedLevel, progressById),
    [effectiveTrack, selectedLevel, progressById],
  );

  if (loading) return <LoadingState />;
  if (error || !data.courses) return <ErrorState error={error} />;

  const displayName = data.courses.viewer?.displayName || user?.email?.split('@')[0] || 'there';

  return (
    <div className="lc-page dashboard-page-inset db-page">
      <PageHeader
        user={{
          displayName,
          initials: getInitials(displayName),
        }}
        bookmarkCount={data.bookmarks.length}
        badgeCount={(data.courses.badges || []).length}
        onScrollToBookmarks={() =>
          document.getElementById('lc-bookmarks')?.scrollIntoView({ behavior: 'smooth' })
        }
      />

      <div className="lc-hero-grid">
        <EloHero
          user={{
            main_track: effectiveTrack,
            main_track_label: TRACKS.find((t) => t.id === effectiveTrack)?.shortLabel || 'Stocks',
          }}
          elo={buildEloFromLeaderboard(data.leaderboard)}
          streak={data.streak || { current_streak: 0, days_this_week: [] }}
          friendsOnLadder={(data.leaderboard?.rankings || []).filter((r) => !r.is_me).slice(0, 6)}
          stats={buildStats(data.courses)}
          nextBadgeCoursesLeft={computeNextBadgeRemaining(effectiveTrack, progressById)}
        />
        <DailyQuest
          primary={data.quests?.primary}
          bonus={data.quests?.bonus || []}
          resetsInLabel={formatResetsIn(data.quests?.resets_at)}
        />
      </div>

      {isOrgUser && <OrgAssignedCard />}

      <TrackTowers
        tracks={data.courses.tracks || []}
        mainTrack={data.mainTrack}
        onSelectTrack={(id) => {
          setSelectedTrack(id);
          setSelectedLevel('basic');
          setTimeout(() => {
            document
              .getElementById('lc-active-path')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        }}
        onSetMainTrack={setMainTrack}
      />

      <div id="lc-active-path">
        <ActivePath
          selectedTrack={effectiveTrack}
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          courses={pathCourses}
          levelUnlocked={levelUnlocked}
          prevLevelLabel={getPrevLevelLabel(selectedLevel)}
          onToggleBookmark={toggleBookmark}
          progressById={progressById}
        />
      </div>

      <div className="lc-bottom-grid">
        <Leaderboard
          data={data.leaderboard}
          onPeriodChange={(p) => setLeaderboardPeriod(p === 'track' ? 'all-time' : p)}
        />
        <div id="lc-bookmarks">
          <Bookmarks bookmarks={data.bookmarks} onUnbookmark={toggleBookmark} />
        </div>
      </div>
    </div>
  );
}
