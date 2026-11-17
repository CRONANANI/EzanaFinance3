'use client';

/**
 * Learning Center hub (Nov 2026 flat-canvas redesign): a personal learning
 * dashboard with no title block.
 *
 *   Top    KPI strip (rating, tier, streak, badges, active tracks) and the
 *          page actions (Saved courses, Resume learning)
 *   Row 2  rating history with the rating tiers | daily quest
 *   Row 3  your tracks | active path with the course filter | your progress
 *          and recommended
 *
 * Phones stack the sections in priority order: summary, quest, path, tracks,
 * progress, history, recommended (CSS `order`). The selected track is in the
 * URL (?track=stocks) and also becomes the user's main track, which the
 * daily quest and "Resume learning" follow.
 *
 * The same page serves retail, org and partner accounts. Master admin and
 * demo accounts can see sample content (useLearningHub), labelled as such.
 *
 * Council learning (Nov 2026): council members, once org loading has
 * finished, also get the "Council learning" band under the KPI strip
 * (src/components/learning/council). Everyone else sees the hub unchanged;
 * the band's hook fetches nothing for them.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useOrg } from '@/contexts/OrgContext';
import { useCouncilLearning } from '@/components/learning/council/useCouncilLearning';
import { DEFAULT_PATH } from '@/lib/org-learning-model';
import { Modal, VisuallyHidden } from '@/components/ds';
import { useBeginnerLevelOptional } from '@/contexts/BeginnerLevelContext';
import { InvestingBasicsCard } from '@/components/beginner/InvestingBasicsCard';
import { BeginnerSpotlight } from '@/components/beginner/BeginnerSpotlight';
import { buildProgressMap } from '@/lib/learning-progress-logic';
import { getCourseById } from '@/lib/learning-curriculum';
import {
  LEVELS,
  TRACK_IDS,
  activeTrackCount,
  catalogueRows,
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
  KpiStrip,
  ProgressCard,
  RatingHistory,
  RecommendedCard,
  SavedList,
  TracksCard,
} from './HubCards';

const CouncilLearning = dynamic(() => import('@/components/learning/council/CouncilLearning'), {
  ssr: false,
  loading: () => null,
});

export function LearningHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hub = useLearningHub();
  const beginner = useBeginnerLevelOptional();
  const { isOrgUser, isLoading: orgLoading } = useOrg();
  const councilReady = Boolean(isOrgUser && !orgLoading);
  const council = useCouncilLearning(councilReady, {
    sampleOn: hub.sampleOn,
    sampleKnown: hub.sampleKnown,
  });

  const [range, setRange] = useState('3M');
  const [savedOpen, setSavedOpen] = useState(false);
  const [level, setLevel] = useState(null);
  const [query, setQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [notice, setNotice] = useState(null);

  const coursesStatus = hub.courses.status;
  const ratingStatus = hub.rating.status;
  const courses = hub.courses.data;
  const ratingData = hub.rating.data;

  const urlTrack = validTrack(searchParams.get('track'));
  const trackId =
    urlTrack ||
    (beginner?.band === 'beginner' ? 'stocks' : validTrack(hub.mainTrack)) ||
    courses?.viewer?.currentTrackId ||
    'stocks';

  const progressRows = useMemo(() => courses?.progress || [], [courses]);
  const progressById = useMemo(() => buildProgressMap(progressRows), [progressRows]);
  const bookmarked = useMemo(() => new Set(hub.bookmarks.map((b) => b.course_id)), [hub.bookmarks]);

  const cur = useMemo(() => currentLevel(trackId, progressById), [trackId, progressById]);
  const shownLevel = level || cur;
  /* A track change resets the level, unless the council path asked for one. */
  const pendingLevel = useRef(null);
  useEffect(() => {
    setLevel(pendingLevel.current);
    pendingLevel.current = null;
  }, [trackId]);

  const selectTrack = useCallback(
    (id) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set('track', id);
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
      if (id !== hub.mainTrack) hub.setMainTrack(id);
      /* Choosing a track leaves the all-tracks filter and shows its path. */
      setQuery('');
      setSavedOnly(false);
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

  const showPath = useCallback(() => {
    setSavedOpen(false);
    setQuery('');
    setSavedOnly(false);
    requestAnimationFrame(() => document.getElementById('lh-path')?.focus());
  }, []);

  /* Derived, all from the same rows so the sections agree. */
  const rating = ratingData?.rating ?? null;
  const tier = rating == null ? null : tierFor(rating);
  const next = rating == null ? null : nextTier(rating);
  const stats = useMemo(
    () => trackStats(trackId, progressRows, progressById),
    [trackId, progressRows, progressById],
  );
  const series = useMemo(
    () => ratingSeries(ratingData?.history || [], rating ?? 0, range),
    [ratingData, rating, range],
  );
  const browsing = savedOnly || query.trim().length > 0;
  const rows = useMemo(
    () =>
      browsing
        ? catalogueRows({ query, savedOnly }, progressById, bookmarked)
        : pathRows(trackId, shownLevel, progressById, bookmarked),
    [browsing, query, savedOnly, trackId, shownLevel, progressById, bookmarked],
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
  const streak = hub.streak.data
    ? {
        current: hub.streak.data.current_streak || 0,
        best: hub.streak.data.longest_streak || 0,
        week: hub.streak.data.days_this_week,
      }
    : null;

  /* The beginner path is the Bronze level of the stocks track. Offered until
     that level is complete, and not while it is already on screen. */
  const stocksBronze = useMemo(
    () => levelCounts('stocks', progressById)[LEVELS[0].key],
    [progressById],
  );
  const offerBeginnerPath =
    coursesStatus === 'ready' &&
    stocksBronze.done < stocksBronze.total &&
    !(trackId === 'stocks' && shownLevel === LEVELS[0].key && !browsing);
  const openBeginnerPath = useCallback(() => {
    selectTrack('stocks');
    setLevel(LEVELS[0].key);
    requestAnimationFrame(() => document.getElementById('lh-path')?.focus());
  }, [selectTrack]);

  const retryCourses = () => hub.retry('courses');

  /* Council path: the viewer's own counts for the default levels, and opening
     one of them in the active path. */
  const pathCounts = useMemo(() => {
    if (coursesStatus !== 'ready') return null;
    const out = {};
    for (const s of DEFAULT_PATH)
      out[`${s.track}:${s.level}`] = levelCounts(s.track, progressById)[s.level];
    return out;
  }, [coursesStatus, progressById]);
  const openLevel = useCallback(
    (track, lvl) => {
      if (track !== trackId) pendingLevel.current = lvl;
      selectTrack(track);
      setLevel(lvl);
      requestAnimationFrame(() => document.getElementById('lh-path')?.focus());
    },
    [selectTrack, trackId],
  );

  return (
    <div className="lh-page dashboard-page-inset ez-canvas">
      <VisuallyHidden>
        <h1>Learning Center</h1>
      </VisuallyHidden>

      <div className="lh-rows">
        <KpiStrip
          ratingStatus={ratingStatus}
          rating={rating}
          change={ratingData?.change7d}
          tier={tier}
          streakStatus={hub.streak.status}
          streak={streak}
          coursesStatus={coursesStatus}
          badges={(courses?.badges || []).length}
          activeTracks={activeTrackCount(progressById)}
          totalTracks={TRACK_IDS.length}
          resume={coursesStatus === 'ready' ? resume : null}
          savedCount={hub.bookmarksStatus === 'ready' ? hub.bookmarks.length : null}
          onSaved={() => setSavedOpen(true)}
          sampleAvailable={hub.sampleAvailable}
          sampleOn={hub.sampleOn}
          onSample={hub.setSampleShown}
        />

        {beginner?.band === 'beginner' ? (
          <div className="lh-beginner">
            <InvestingBasicsCard />
          </div>
        ) : null}

        {councilReady ? (
          <CouncilLearning council={council} pathCounts={pathCounts} onOpenLevel={openLevel} />
        ) : null}

        <div className="lh-row lh-row--2">
          <div className="lh-col lh-o-history">
            <RatingHistory
              status={ratingStatus}
              points={series}
              range={range}
              onRange={setRange}
              tier={tier}
              next={next}
              network={ratingData?.network}
              onRetry={() => hub.retry('rating')}
            />
          </div>
          <div className="lh-col lh-o-quest">
            <DailyQuest
              status={hub.quest.status}
              coursesStatus={coursesStatus}
              featured={featured}
              featuredTrack={trackId}
              featuredResume={!!featured && progressById[featured.id]?.status === 'in_progress'}
              tasks={hub.quest.data?.bonus || []}
              resetsAt={hub.quest.data?.resets_at}
              onRetry={() => hub.retry('quest')}
              onBeginnerPath={offerBeginnerPath ? openBeginnerPath : null}
            />
          </div>
        </div>

        <div className="lh-row lh-row--3">
          <div className="lh-col lh-o-tracks">
            <TracksCard
              status={coursesStatus}
              tracks={tracks}
              selected={trackId}
              onSelect={selectTrack}
              onRetry={retryCourses}
            />
          </div>
          <div className="lh-col lh-o-path">
            <ActivePath
              status={coursesStatus}
              trackId={trackId}
              level={shownLevel}
              current={cur}
              counts={counts}
              rows={rows}
              browsing={browsing}
              query={query}
              onQuery={setQuery}
              savedOnly={savedOnly}
              onSavedOnly={setSavedOnly}
              savedCount={hub.bookmarksStatus === 'ready' ? hub.bookmarks.length : null}
              trackDone={stats.done}
              trackTotal={stats.total}
              onLevel={(l) => {
                setLevel(l);
                setQuery('');
                setSavedOnly(false);
              }}
              onBookmark={toggleBookmark}
              onRetry={retryCourses}
            />
          </div>
          <div className="lh-col lh-side">
            <div className="lh-o-progress">
              <ProgressCard
                status={coursesStatus}
                trackId={trackId}
                stats={stats}
                trackRating={ratingData?.byTrack?.[trackId] || 0}
                ratingStatus={ratingStatus}
                streakStatus={hub.streak.status}
                streak={streak}
                onRetryCourses={retryCourses}
                onRetryStreak={() => hub.retry('streak')}
              />
            </div>
            <div className="lh-o-reco">
              <RecommendedCard status={coursesStatus} courses={recos} onRetry={retryCourses} />
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        size="520px"
        title={`Saved courses (${savedCourses.length})`}
      >
        <SavedList
          status={hub.bookmarksStatus}
          courses={savedCourses}
          onRemove={(id) => toggleBookmark(id, false)}
          onBrowse={showPath}
          onRetry={() => hub.retry('bookmarks')}
        />
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
