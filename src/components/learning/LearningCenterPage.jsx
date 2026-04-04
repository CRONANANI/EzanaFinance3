'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LEVEL_KEYS, getLevelLabel, TRACKS } from '@/lib/learning-curriculum';
import {
  buildProgressMap,
  canAccessCourse,
  getOrderedCoursesForTrack,
  isCourseFullyCompleted,
  isLevelUnlocked,
} from '@/lib/learning-progress-logic';
import { parseLearningBadgeKey, sortBadgeKeysForDisplay } from '@/lib/learning-badge-ui';
import { LearningTrackBadgeChips } from '@/components/learning/LearningTrackBadgeChips';
import {
  PartnerCreatorContentCard,
  PARTNER_CREATOR_FALLBACK_ITEMS,
  PARTNER_CREATOR_GRID_MAX,
} from '@/components/learning/PartnerCreatorContentCard';
import { FriendsLearningCard } from '@/components/learning/FriendsLearningCard';
import { getInitials } from '@/lib/community-utils';
import { useOrg } from '@/contexts/OrgContext';
import { ORG_SHORT } from '@/lib/orgMockData';
import '@/app/(dashboard)/home-dashboard/home-dashboard.css';
import '@/app/(dashboard)/learning-center/learning-center.css';

const TRACK_COLORS = {
  stocks: '#10b981',
  crypto: '#f59e0b',
  betting: '#6366f1',
  commodities: '#ec4899',
  risk: '#10b981',
};

const TRACK_ICONS = {
  stocks: '📈',
  crypto: '₿',
  betting: '🎯',
  commodities: '🛢️',
  risk: '🧠',
};

const BADGE_TILE_EMOJI = {
  stocks: '📈',
  crypto: '₿',
  betting: '🎯',
  commodities: '🛢️',
  risk: '🧠',
};

const MAX_BADGE_TILES = 8;

function emojiForBadgeKey(key) {
  const p = parseLearningBadgeKey(key);
  if (!p) return '📛';
  if (p.isMaster) return '🏆';
  return BADGE_TILE_EMOJI[p.trackId] || '📛';
}

export function LearningCenterPage() {
  const { isOrgUser } = useOrg();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState('stocks');
  const [selectedLevel, setSelectedLevel] = useState('basic');
  const [partnerItems, setPartnerItems] = useState(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/learning/courses', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPartners = useCallback(async () => {
    try {
      const res = await fetch('/api/learning/partner-content', { cache: 'no-store' });
      const json = await res.json();
      setPartnerItems(
        json.items?.length ? json.items.slice(0, PARTNER_CREATOR_GRID_MAX) : PARTNER_CREATOR_FALLBACK_ITEMS,
      );
    } catch {
      setPartnerItems(PARTNER_CREATOR_FALLBACK_ITEMS);
    }
  }, []);

  useEffect(() => {
    load();
    loadPartners();
  }, [load, loadPartners]);

  const progressById = useMemo(() => buildProgressMap(data?.progress || []), [data?.progress]);

  const viewer = useMemo(() => {
    if (data?.viewer) return data.viewer;
    return { displayName: 'Learner', avatarUrl: null };
  }, [data?.viewer]);

  const inProgressCourses = useMemo(() => {
    if (!data?.courses) return [];
    return data.courses
      .filter((c) => {
        const row = progressById[c.id];
        return row?.status === 'in_progress' && !isCourseFullyCompleted(row);
      })
      .slice(0, 3);
  }, [data?.courses, progressById]);

  const coursesForView = useMemo(() => {
    return getOrderedCoursesForTrack(selectedTrack).filter((c) => c.level === selectedLevel);
  }, [selectedTrack, selectedLevel]);

  const badgeKeysSorted = useMemo(
    () => sortBadgeKeysForDisplay(data?.badges?.map((b) => b.badge_key) || []),
    [data?.badges]
  );

  const levelUnlocked = useMemo(
    () => isLevelUnlocked(selectedTrack, selectedLevel, progressById),
    [selectedTrack, selectedLevel, progressById]
  );

  const prevLevelKey = useMemo(() => {
    const idx = LEVEL_KEYS.indexOf(selectedLevel);
    return idx > 0 ? LEVEL_KEYS[idx - 1] : null;
  }, [selectedLevel]);

  if (loading) {
    return (
      <div className="dashboard-page-inset db-page" style={{ paddingTop: 0, paddingBottom: '2rem' }}>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading Learning Center…</p>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="dashboard-page-inset db-page" style={{ paddingTop: 0, paddingBottom: '2rem' }}>
        <p style={{ color: '#ef4444' }}>{err || 'Unable to load.'}</p>
        <button
          type="button"
          onClick={load}
          style={{
            marginTop: '0.75rem',
            padding: '0.35rem 0.85rem',
            borderRadius: 8,
            border: '1px solid rgba(16,185,129,0.25)',
            background: 'rgba(16,185,129,0.08)',
            color: '#10b981',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const { overall, tracks, badges } = data;

  return (
    <div className="dashboard-page-inset db-page lc3-page" style={{ paddingTop: 0, paddingBottom: '2rem' }}>
      {/* Header + trophy */}
      <div className="lc3-header-row">
        <div>
          <h1 className="lc3-page-title">Learning Center</h1>
          <p style={{ color: '#6b7280', fontSize: '.8125rem', marginTop: '.25rem' }}>
            Master the markets — from beginner to expert
          </p>
        </div>

        <div className="db-card lc3-trophy-card">
          <div className="lc3-trophy-avatar">
            {viewer?.avatarUrl ? (
              <img src={viewer.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              getInitials(viewer?.displayName || 'U')
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: '.875rem', margin: 0, color: '#f0f6fc' }}>
              {viewer?.displayName || 'Learner'}
            </p>
            <p style={{ color: '#6b7280', fontSize: '.6875rem', margin: '.1rem 0 .45rem' }}>Trophy cabinet</p>
            {badges?.length > 0 ? (
              <LearningTrackBadgeChips badgeKeys={badges.map((b) => b.badge_key)} />
            ) : (
              <span style={{ color: '#6b7280', fontSize: '.6875rem' }}>Complete courses to earn badges</span>
            )}
          </div>
        </div>
      </div>

      {/* Your Learning Journey */}
      <div className="db-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
          <h2 style={{ fontSize: '.9375rem', fontWeight: 800, margin: 0, color: '#f0f6fc' }}>Your Learning Journey</h2>
          <span style={{ color: '#10b981', fontSize: '.8125rem', fontWeight: 700 }}>
            {overall.completed}/{overall.total} courses complete
          </span>
        </div>

        <div
          style={{
            height: 10,
            background: 'rgba(16,185,129,0.08)',
            borderRadius: 6,
            overflow: 'hidden',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              width: `${overall.pct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #10b981, #059669)',
              borderRadius: 6,
              transition: 'width 0.6s ease',
            }}
          />
        </div>

        <div className="lc3-journey-grid">
          <div>
            <p className="lc3-label">Currently taking</p>
            {inProgressCourses.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '.8125rem' }}>No courses in progress. Start one below!</p>
            ) : (
              inProgressCourses.map((c) => {
                const row = progressById[c.id];
                const pct = row?.progress_pct ?? 0;
                const color = TRACK_COLORS[c.track] || '#10b981';
                return (
                  <div key={c.id} className="lc3-inprogress-row">
                    <span style={{ fontSize: '.8rem' }}>{TRACK_ICONS[c.track]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#f0f6fc', fontSize: '.8125rem', fontWeight: 700, margin: 0 }}>{c.title}</p>
                      <p style={{ color: '#6b7280', fontSize: '.625rem', margin: 0 }}>
                        {TRACKS.find((t) => t.id === c.track)?.shortLabel} · {getLevelLabel(c.level)}
                      </p>
                    </div>
                    <div style={{ width: 50 }}>
                      <div style={{ height: 3, background: 'rgba(16,185,129,0.1)', borderRadius: 2 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
                      </div>
                      <p style={{ fontSize: '.5rem', color: '#6b7280', margin: '.1rem 0 0', textAlign: 'right' }}>
                        {pct}%
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div>
            <p className="lc3-label">
              Badges earned ({badges?.length || 0})
            </p>
            <div className="lc3-badge-tiles">
              {(() => {
                const earnedSlice = badgeKeysSorted.slice(0, MAX_BADGE_TILES);
                const totalSlots = Math.min(MAX_BADGE_TILES, Math.max(6, earnedSlice.length));
                const placeholders = Math.max(0, totalSlots - earnedSlice.length);
                return (
                  <>
                    {earnedSlice.map((key) => (
                      <div key={key} className="lc3-badge-tile lc3-badge-tile-earned" title={key}>
                        {emojiForBadgeKey(key)}
                      </div>
                    ))}
                    {Array.from({ length: placeholders }).map((_, i) => (
                      <div key={`ph-${i}`} className="lc3-badge-tile lc3-badge-tile-locked">
                        ?
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {isOrgUser && (
        <div
          className="db-card"
          style={{
            marginBottom: '1.25rem',
            padding: '1rem 1.25rem',
            border: '1px solid rgba(99,102,241,0.25)',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(16,185,129,0.04))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div
                style={{
                  color: '#6366f1',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontSize: '0.7rem',
                }}
              >
                Assigned by your Portfolio Manager
              </div>
              <div style={{ color: '#f0f6fc', fontSize: '0.95rem', fontWeight: 700, marginTop: '0.35rem' }}>
                {ORG_SHORT} Learning Assignments
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
                Track what your council expects you to complete this week.
              </p>
            </div>
            <Link
              href="/org-team-hub"
              style={{
                textDecoration: 'none',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#10b981',
                whiteSpace: 'nowrap',
              }}
            >
              Team Hub →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>
            {[
              { title: 'Valuation Fundamentals', status: 'in_progress', due: 'Apr 12' },
              { title: 'Pitch Deck Writing', status: 'assigned', due: 'Apr 14' },
              { title: 'Risk & Position Sizing', status: 'assigned', due: 'Apr 18' },
            ].map((a) => (
              <div
                key={a.title}
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(99,102,241,0.12)',
                  background: 'rgba(13,17,23,0.6)',
                }}
              >
                <div style={{ color: '#f0f6fc', fontWeight: 700, fontSize: '0.8125rem' }}>{a.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.6875rem' }}>
                  <span style={{ color: a.status === 'in_progress' ? '#6366f1' : '#9ca3af', fontWeight: 700 }}>
                    {a.status.replace('_', ' ')}
                  </span>
                  <span style={{ color: '#6b7280' }}>Due {a.due}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {partnerItems === undefined ? (
        <div className="db-card" style={{ padding: '1.25rem', marginBottom: '1.25rem', color: '#6b7280', fontSize: '.8125rem' }}>
          Loading partner content…
        </div>
      ) : (
        <PartnerCreatorContentCard items={partnerItems} />
      )}

      {/* Track progress */}
      <div className="lc3-track-progress-row">
        {tracks.map((t, ti) => {
          const pct = t.summary?.pct ?? 0;
          const color = TRACK_COLORS[t.id] || '#10b981';
          const selected = selectedTrack === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`db-card lc3-track-card-btn ${selected ? 'lc3-track-card-btn--selected' : ''}`}
              onClick={() => {
                setSelectedTrack(t.id);
                setSelectedLevel('basic');
              }}
              data-task-target={ti === 0 ? 'learning-module-card' : undefined}
            >
              <p style={{ fontSize: '.8rem', margin: '0 0 .15rem' }}>{TRACK_ICONS[t.id]}</p>
              <p style={{ fontSize: '.6875rem', fontWeight: 700, margin: 0, color: '#f0f6fc' }}>{t.shortLabel}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color, margin: '.35rem 0 .25rem' }}>{pct}%</p>
              <div style={{ height: 4, background: `${color}18`, borderRadius: 2, marginBottom: '.25rem' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
              </div>
              <p style={{ fontSize: '.5625rem', color: '#6b7280' }}>
                {t.summary?.completed ?? 0}/{t.summary?.total ?? t.totalCourses} courses
              </p>
            </button>
          );
        })}
      </div>

      {/* Friends + courses */}
      <div className="lc3-bottom-grid">
        <FriendsLearningCard />

        <div className="db-card lc3-course-panel">
          <div className="db-card-header lc3-course-panel-header">
            <div>
              <h3>
                {TRACK_ICONS[selectedTrack]}{' '}
                {tracks.find((t) => t.id === selectedTrack)?.shortLabel || 'Track'}
              </h3>
              <p style={{ color: '#6b7280', fontSize: '.6875rem', marginTop: '.15rem' }}>
                {getLevelLabel(selectedLevel)} level · {coursesForView.length} courses
              </p>
            </div>
            <div className="lc3-level-tabs">
              {LEVEL_KEYS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setSelectedLevel(lv)}
                  className={selectedLevel === lv ? 'lc3-level-tab lc3-level-tab--active' : 'lc3-level-tab'}
                >
                  {getLevelLabel(lv)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '0 1.25rem 1rem' }}>
            {!levelUnlocked ? (
              <p style={{ color: '#6b7280', fontSize: '.8125rem', padding: '.75rem 0' }}>
                Complete all {getLevelLabel(prevLevelKey)} courses in this track to unlock {getLevelLabel(selectedLevel)}.
              </p>
            ) : (
              coursesForView.map((c, i) => {
                const prog = progressById[c.id];
                const completed = isCourseFullyCompleted(prog);
                const inProgress = prog && prog.status === 'in_progress' && !completed;
                const pct = prog?.progress_pct || 0;
                const access = canAccessCourse(c, progressById);
                const locked = !access.ok;

                const circleContent = completed ? '✓' : inProgress ? `${pct}%` : locked ? '🔒' : String(i + 1);

                const rowInner = (
                  <>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: locked ? '.55rem' : inProgress ? '.45rem' : '.55rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        ...(completed
                          ? { background: '#10b981', color: '#fff' }
                          : inProgress
                            ? {
                                border: '2px solid #f59e0b',
                                background: 'rgba(245,158,11,0.1)',
                                color: '#f59e0b',
                              }
                            : locked
                              ? { border: '1px solid rgba(107,114,128,0.3)', color: '#6b7280' }
                              : { border: '1px solid rgba(107,114,128,0.3)', color: '#6b7280' }),
                      }}
                    >
                      {circleContent}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '.8125rem',
                          fontWeight: 600,
                          margin: 0,
                          color:
                            completed || inProgress || access.ok ? '#f0f6fc' : '#8b949e',
                        }}
                      >
                        {c.title}
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '.5625rem', margin: 0 }}>{c.duration_minutes} min</p>
                    </div>
                    <span
                      style={{
                        fontSize: '.625rem',
                        fontWeight: 700,
                        color: completed ? '#10b981' : inProgress ? '#f59e0b' : '#6b7280',
                      }}
                    >
                      {completed ? 'Complete' : inProgress ? 'In progress' : locked ? 'Locked' : 'Start'}
                    </span>
                  </>
                );

                if (access.ok) {
                  return (
                    <Link
                      key={c.id}
                      href={`/learning-center/course/${c.id}`}
                      className="lc3-course-row-link"
                    >
                      {rowInner}
                    </Link>
                  );
                }

                return (
                  <div key={c.id} className="lc3-course-row-link lc3-course-row-link--disabled" aria-disabled>
                    {rowInner}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
