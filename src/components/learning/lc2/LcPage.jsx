'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { TRACKS } from '@/lib/learning-curriculum';
import {
  buildProgressMap,
  canAccessCourse,
  getOrderedCoursesForTrack,
  isCourseFullyCompleted,
} from '@/lib/learning-progress-logic';
import { useLearningCenterData } from '../redesign/useLearningCenterData';

import { LcGreeting } from './LcGreeting';
import { LcEloHero } from './LcEloHero';
import { LcEloChart } from './LcEloSparkline';
import { LcEloLadder } from './LcEloLadder';
import { LcDailyQuest } from './LcDailyQuest';
import { LcSessionMetrics } from './LcSessionMetrics';
import { LcTrackTowers } from './LcTrackTowers';
import { LcActivePath } from './LcActivePath';
import { LcSavedCourses } from './LcSavedCourses';
import { LcUpNext } from './LcUpNext';
import { LcOrgAssigned } from './LcOrgAssigned';

import {
  deriveEloHero,
  deriveStats,
  deriveDailyQuest,
  deriveSessionMetrics,
  deriveUpNext,
} from './lcMappers';

import './lc2.css';
import { useBeginnerLevelOptional } from '@/contexts/BeginnerLevelContext';
import { InvestingBasicsCard } from '@/components/beginner/InvestingBasicsCard';
import { BeginnerSpotlight } from '@/components/beginner/BeginnerSpotlight';
import '@/components/beginner/beginner.css';

function computeNextBadgeRemaining(trackId, progressById) {
  const ordered = getOrderedCoursesForTrack(trackId);
  const remaining = ordered.filter((c) => !isCourseFullyCompleted(progressById[c.id])).length;
  return Math.min(remaining, 99);
}

function LcLoading() {
  return (
    <div className="lc3-shell dashboard-page-inset db-page">
      <div className="lc3-band">
        <div className="lc3-skeleton" style={{ height: 120 }} />
        <div className="lc3-skeleton" style={{ height: 260 }} />
        <div className="lc3-skeleton" style={{ height: 220 }} />
      </div>
    </div>
  );
}

function LcError({ error }) {
  return (
    <div className="lc3-shell dashboard-page-inset db-page">
      <div className="lc3-band" style={{ textAlign: 'center', padding: '80px 0' }}>
        <h2 className="lc3-sec-title">Couldn&apos;t load Learning Center</h2>
        <p className="lc3-empty">{error || 'Try refreshing the page.'}</p>
      </div>
    </div>
  );
}

export function LcPage() {
  const { user } = useAuth();
  const { isOrgUser } = useOrg();
  const router = useRouter();

  const { data, loading, error, setMainTrack } = useLearningCenterData();
  const beginner = useBeginnerLevelOptional();

  useEffect(() => {
    if (beginner?.band === 'beginner' && data?.mainTrack && data.mainTrack !== 'stocks') {
      setMainTrack('stocks');
    }
  }, [beginner?.band, data?.mainTrack, setMainTrack]);

  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('basic');

  const effectiveTrack = selectedTrack || data.mainTrack || 'stocks';

  const progressById = useMemo(
    () => (data.courses ? buildProgressMap(data.courses.progress || []) : {}),
    [data.courses],
  );

  const currentTierLevel = useMemo(() => {
    if (!data.courses) return 'basic';
    const order = ['basic', 'intermediate', 'advanced', 'expert'];
    const trackData = (data.courses.tracks || []).find((t) => t.id === effectiveTrack);
    if (!trackData?.summary?.levels) return 'basic';
    for (const lv of order) {
      const l = trackData.summary.levels[lv];
      if (!l || (l.completed || 0) < (l.total || 0)) return lv;
    }
    return 'expert';
  }, [data.courses, effectiveTrack]);

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
      if (isCourseFullyCompleted(p)) state = 'completed';
      else if (!access.ok) state = 'locked';
      else if (!nextAssigned) {
        state = 'next';
        nextAssigned = true;
      } else state = 'unstarted';
      return {
        id: c.id,
        title: c.title,
        duration_minutes: c.duration_minutes,
        state,
        bookmarked: bookmarkedIds.has(c.id),
      };
    });
  }, [data.courses, data.bookmarks, effectiveTrack, selectedLevel, progressById]);

  const levelCounts = useMemo(() => {
    const counts = { basic: 0, intermediate: 0, advanced: 0, expert: 0 };
    if (!data.courses) return counts;
    for (const c of getOrderedCoursesForTrack(effectiveTrack)) {
      if (counts[c.level] !== undefined) counts[c.level]++;
    }
    return counts;
  }, [data.courses, effectiveTrack]);

  const computeRemaining = useCallback(
    (trackId) => computeNextBadgeRemaining(trackId, progressById),
    [progressById],
  );

  if (loading) return <LcLoading />;
  if (error || !data.courses) return <LcError error={error} />;

  const displayName = data.courses.viewer?.displayName || user?.email?.split('@')[0] || 'there';
  const firstName = displayName.split(' ')[0];

  const heroData = deriveEloHero(data, effectiveTrack, currentTierLevel);
  const stats = deriveStats(data, effectiveTrack, computeRemaining);
  const dailyQuest = deriveDailyQuest(data);
  const sessionMetrics = deriveSessionMetrics(data);
  const upNextLessons = deriveUpNext(data, effectiveTrack, progressById);

  const completedInLevel = pathCourses.filter((c) => c.state === 'completed').length;
  const totalInLevel = pathCourses.length;
  const totalMinutes = pathCourses
    .filter((c) => c.state === 'completed')
    .reduce((s, c) => s + (c.duration_minutes || 0), 0);
  const tierComplete = totalInLevel > 0 && completedInLevel === totalInLevel;

  const nextTierMap = { basic: 'Silver', intermediate: 'Gold', advanced: 'Platinum', expert: null };
  const nextTierLabel = nextTierMap[selectedLevel];

  const subline = `${stats.coursesToNext} courses from ${nextTierLabel || 'Platinum'} tier in ${heroData.trackLabel}. You're outpacing your network this week, so keep it going.`;

  const handleResume = () => {
    const courseId =
      dailyQuest.primary?.courseId ||
      data.quests?.primary?.course_id ||
      pathCourses.find((c) => c.state === 'next')?.id ||
      pathCourses[0]?.id;
    if (courseId) router.push(`/learning-center/course/${courseId}`);
  };

  /* The mapper hands back a bare array of ratings; recharts wants rows. The
     labels are relative session markers, which is what the history is. */
  const ratingSeries = (heroData.eloHistory || []).map((rating, i, arr) => ({
    label: i === arr.length - 1 ? 'Now' : `-${arr.length - 1 - i}`,
    rating,
  }));

  const handleLessonClick = (id) => router.push(`/learning-center/course/${id}`);
  const scrollBehavior =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';

  const handleScrollToBookmarks = () =>
    document.getElementById('lc-bookmarks')?.scrollIntoView({ behavior: scrollBehavior });

  return (
    <div className="lc3-shell dashboard-page-inset db-page">
      {/* Band 1, hero: greeting and track progress on the left, the ELO
          figure and stat strip on the right. */}
      <div className="lc3-band">
        <div className="lc3-hero">
          <LcGreeting
            firstName={firstName}
            subline={subline}
            onResume={handleResume}
            onSavedClick={handleScrollToBookmarks}
            trackLabel={heroData.trackLabel}
            completed={stats.coursesDone}
            total={stats.coursesTotal}
          />
          <LcEloHero {...heroData} stats={stats} />
        </div>
      </div>

      {beginner?.band === 'beginner' && (
        <div className="lc3-band">
          <div className="beginner-lc-banner">
            <p className="beginner-lc-banner__text">
              Recommended for you: start with <strong>Stocks &amp; Investing · Bronze</strong>
            </p>
            <Link href="/learning-center/course/stocks-basic-1" className="beginner-lc-banner__cta">
              Start first lesson →
            </Link>
          </div>
          <InvestingBasicsCard />
        </div>
      )}

      {/* Band 2, rating history, tier ladder, and the two daily sub-columns. */}
      <div className="lc3-band">
        <div className="lc3-sec-head">
          <h2 className="lc3-sec-title">Rating history</h2>
          <span className="lc3-sec-meta">Learning ELO</span>
        </div>
        <div className="lc3-chart-row">
          <LcEloChart data={ratingSeries} />
          <LcEloLadder rating={heroData.elo} />
        </div>
        <div className="lc3-subs">
          <LcDailyQuest
            primary={dailyQuest.primary}
            bonus={dailyQuest.bonus}
            resetsInLabel={formatResetsIn(data.quests?.resets_at)}
            onStart={handleResume}
          />
          <LcSessionMetrics streak={sessionMetrics.streak} rows={sessionMetrics.rows} />
        </div>
      </div>

      {/* Band 3, org assignments, org users only. */}
      {isOrgUser && (
        <div className="lc3-band">
          <LcOrgAssigned />
        </div>
      )}

      {/* Band 4, the track table. */}
      <div className="lc3-band">
        <LcTrackTowers
          tracks={data.courses.tracks || []}
          mainTrack={data.mainTrack}
          onSelectTrack={(id) => {
            setSelectedTrack(id);
            setSelectedLevel('basic');
            setTimeout(() => {
              document
                .getElementById('lc-active-path')
                ?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
            }, 50);
          }}
          onSetMainTrack={setMainTrack}
        />
      </div>

      {/* Band 5, the active path. */}
      <div className="lc3-band" id="lc-active-path">
        <LcActivePath
          selectedTrack={effectiveTrack}
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          courses={pathCourses}
          levelCounts={levelCounts}
          completedCount={completedInLevel}
          totalCount={totalInLevel}
          totalMinutes={totalMinutes}
          nextTierLabel={nextTierLabel}
          tierComplete={tierComplete}
          onContinue={() => {
            const next = { basic: 'intermediate', intermediate: 'advanced', advanced: 'expert' }[
              selectedLevel
            ];
            if (next) setSelectedLevel(next);
          }}
          onLessonClick={handleLessonClick}
        />
      </div>

      {/* Band 6, saved and up next. */}
      <div className="lc3-band" id="lc-bookmarks">
        <div className="lc3-subs" style={{ marginTop: 0 }}>
          <LcSavedCourses count={data.bookmarks.length} />
          <LcUpNext lessons={upNextLessons} onLessonClick={handleLessonClick} />
        </div>
      </div>

      <BeginnerSpotlight
        pageKey="learning-center"
        steps={[
          {
            targetSelector: '[data-task-target="learning-module-card"]',
            message: 'Your active path. Click the next lesson to continue your track.',
            position: 'bottom',
          },
          {
            targetSelector: '.lc-track-towers',
            message: 'Your tracks shows progress across every learning track by tier.',
            position: 'top',
          },
        ]}
      />
    </div>
  );
}

function formatResetsIn(iso) {
  if (!iso) return 'unknown';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'soon';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}
