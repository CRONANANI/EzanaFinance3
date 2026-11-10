'use client';

/**
 * Learning Center hub (Nov 2026 redesign): a personal learning dashboard.
 *
 *   Row 1  welcome hero | LearningELO
 *   Row 2  rating history | tiers | daily quest
 *   Row 3  your tracks | active path | your progress + recommended
 *
 * Phones stack the cards in priority order: hero, ELO, quest, path, tracks,
 * progress, history, tiers, recommended (CSS `order`). The selected track is
 * in the URL (?track=stocks) and also becomes the user's main track, which
 * the daily quest and "Resume learning" follow.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Modal } from '@/components/ds';
import { useBeginnerLevelOptional } from '@/contexts/BeginnerLevelContext';
import { InvestingBasicsCard } from '@/components/beginner/InvestingBasicsCard';
import { BeginnerSpotlight } from '@/components/beginner/BeginnerSpotlight';
import { buildProgressMap } from '@/lib/learning-progress-logic';
import { ALL_COURSES, TRACKS, getCourseById } from '@/lib/learning-curriculum';
import {
  TRACK_IDS,
  activeTrackCount,
  currentLevel,
  isDone,
  levelCounts,
  nextCourse,
  nextTier,
  orderedCourses,
  pathRows,
  ratingSeries,
  recommendations,
  resumeTarget,
  tierFor,
  trackStats,
  validTrack,
} from '@/lib/learning/hub-model';
import { useLearningHub } from './useLearningHub';
import {
  ActivePath,
  DailyQuest,
  EloCard,
  ProgressCard,
  RatingHistory,
  RecommendedCard,
  SavedList,
  TiersCard,
  TracksCard,
  WelcomeHero,
} from './HubCards';

function HubSkeleton() {
  return (
    <div className="lh-rows" aria-busy="true" aria-label="Loading Learning Center">
      <div className="lh-row">
        <span className="lh-skel lh-skel--hero" />
        <span className="lh-skel lh-skel--hero" />
      </div>
      <div className="lh-row">
        <span className="lh-skel lh-skel--card" />
        <span className="lh-skel lh-skel--card" />
        <span className="lh-skel lh-skel--card" />
      </div>
    </div>
  );
}

export function LearningHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hub = useLearningHub();
  const beginner = useBeginnerLevelOptional();

  const [range, setRange] = useState('3M');
  const [savedOpen, setSavedOpen] = useState(false);
  const [level, setLevel] = useState(null);
  const [notice, setNotice] = useState(null);

  const urlTrack = validTrack(searchParams.get('track'));
  const trackId =
    urlTrack ||
    (beginner?.band === 'beginner' ? 'stocks' : validTrack(hub.mainTrack)) ||
    hub.courses?.viewer?.currentTrackId ||
    'stocks';

  const progressRows = useMemo(() => hub.courses?.progress || [], [hub.courses]);
  const progressById = useMemo(() => buildProgressMap(progressRows), [progressRows]);
  const bookmarked = useMemo(() => new Set(hub.bookmarks.map((b) => b.course_id)), [hub.bookmarks]);

  const cur = useMemo(() => currentLevel(trackId, progressById), [trackId, progressById]);
  const shownLevel = level || cur;
  useEffect(() => setLevel(null), [trackId]);

  const selectTrack = useCallback(
    (id) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set('track', id);
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
      if (id !== hub.mainTrack) hub.setMainTrack(id);
    },
    [router, pathname, searchParams, hub],
  );

  const toggleBookmark = useCallback(
    async (id, on) => {
      const ok = await hub.toggleBookmark(id, on);
      if (!ok) setNotice('Could not update your saved courses. Try again.');
    },
    [hub],
  );

  /* Derived, all from the same rows so the cards agree. */
  const rating = hub.rating?.rating ?? 0;
  const tier = tierFor(rating);
  const next = nextTier(rating);
  const stats = useMemo(
    () => trackStats(trackId, progressRows, progressById),
    [trackId, progressRows, progressById],
  );
  const series = useMemo(
    () => ratingSeries(hub.rating?.history || [], rating, range),
    [hub.rating, rating, range],
  );
  const rows = useMemo(
    () => pathRows(trackId, shownLevel, progressById, bookmarked),
    [trackId, shownLevel, progressById, bookmarked],
  );
  const counts = useMemo(() => levelCounts(trackId, progressById), [trackId, progressById]);
  const featured = useMemo(() => nextCourse(trackId, progressById), [trackId, progressById]);
  const resume = useMemo(
    () => resumeTarget(trackId, progressRows, progressById),
    [trackId, progressRows, progressById],
  );
  const recos = useMemo(() => recommendations(trackId, progressById), [trackId, progressById]);
  const tracks = useMemo(
    () =>
      TRACK_IDS.map((id) => ({
        id,
        done: orderedCourses(id).filter((c) => isDone(progressById[c.id])).length,
        total: orderedCourses(id).length,
      })),
    [progressById],
  );
  const savedCourses = useMemo(
    () => hub.bookmarks.map((b) => getCourseById(b.course_id)).filter(Boolean),
    [hub.bookmarks],
  );

  const firstName = (hub.courses?.viewer?.displayName || '').trim().split(/\s+/)[0] || '';

  if (hub.status === 'error') {
    return (
      <div className="lh-page dashboard-page-inset ez-canvas">
        <div className="lh-error" role="alert">
          <h1 className="lh-card__title">The Learning Center could not load</h1>
          <p className="lh-muted">Check your connection and try again.</p>
          <button type="button" className="lh-btn lh-btn--primary" onClick={hub.reload}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lh-page dashboard-page-inset ez-canvas">
      {hub.status === 'loading' ? (
        <HubSkeleton />
      ) : (
        <div className="lh-rows">
          <div className="lh-row lh-row--1">
            <div className="lh-slot lh-o-hero">
              <WelcomeHero
                firstName={firstName}
                totalCourses={ALL_COURSES.length}
                trackCount={TRACKS.length}
                resume={resume}
                savedCount={hub.bookmarks.length}
                onSaved={() => setSavedOpen(true)}
              />
            </div>
            <div className="lh-slot lh-o-elo">
              <EloCard
                rating={rating}
                change={hub.rating?.change7d || { delta: 0, pct: null, since: '' }}
                tier={tier}
                next={next}
                network={hub.rating?.network}
                trackId={trackId}
                trackRating={hub.rating?.byTrack?.[trackId] || 0}
                stats={stats}
              />
            </div>
          </div>

          {beginner?.band === 'beginner' ? (
            <div className="lh-beginner">
              <InvestingBasicsCard />
            </div>
          ) : null}

          <div className="lh-row lh-row--2">
            <div className="lh-slot lh-o-history">
              <RatingHistory
                status={hub.rating ? 'ready' : 'empty'}
                points={series}
                range={range}
                onRange={setRange}
              />
            </div>
            <div className="lh-slot lh-o-tiers">
              <TiersCard tier={tier} next={next} />
            </div>
            <div className="lh-slot lh-o-quest">
              <DailyQuest
                status={hub.quest ? 'ready' : 'empty'}
                featured={featured}
                featuredTrack={trackId}
                tasks={hub.quest?.bonus || []}
                resetsAt={hub.quest?.resets_at}
              />
            </div>
          </div>

          <div className="lh-row lh-row--3">
            <div className="lh-slot lh-o-tracks">
              <TracksCard tracks={tracks} selected={trackId} onSelect={selectTrack} />
            </div>
            <div className="lh-slot lh-o-path">
              <ActivePath
                trackId={trackId}
                level={shownLevel}
                current={cur}
                counts={counts}
                rows={rows}
                trackDone={stats.done}
                trackTotal={stats.total}
                onLevel={setLevel}
                onBookmark={toggleBookmark}
                onStartTrack={() =>
                  featured && router.push(`/learning-center/course/${featured.id}`)
                }
              />
            </div>
            <div className="lh-slot lh-side">
              <div className="lh-o-progress">
                <ProgressCard
                  streak={{
                    current: hub.streak?.current_streak || 0,
                    best: hub.streak?.longest_streak || 0,
                  }}
                  activeTracks={activeTrackCount(progressById)}
                  totalTracks={TRACK_IDS.length}
                  badges={(hub.courses?.badges || []).length}
                />
              </div>
              <div className="lh-o-reco">
                <RecommendedCard courses={recos} />
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        size="520px"
        title={`Saved courses (${savedCourses.length})`}
      >
        <SavedList courses={savedCourses} onRemove={(id) => toggleBookmark(id, false)} />
      </Modal>

      <div className="lh-toast-region" role="status" aria-live="polite">
        {notice ? (
          <div className="lh-toast">
            <span>{notice}</span>
            <button
              type="button"
              className="lh-icon-btn"
              aria-label="Dismiss"
              onClick={() => setNotice(null)}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      <BeginnerSpotlight
        pageKey="learning-center"
        steps={[
          {
            targetSelector: '[data-task-target="learning-module-card"]',
            message: 'Your active path. Click the next lesson to continue your track.',
            position: 'top',
          },
          {
            targetSelector: '.lh-tracks',
            message: 'Your tracks: pick one to switch the path, the stats and the daily quest.',
            position: 'top',
          },
        ]}
      />
    </div>
  );
}
