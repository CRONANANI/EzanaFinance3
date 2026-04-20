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
import { FriendsLearningCard } from '@/components/learning/FriendsLearningCard';
import {
  LearningCard,
  CardPrimary,
  CardSecondary,
  CardMuted,
  CardBadge,
} from '@/components/learning/LearningCard';
import { useOrg } from '@/contexts/OrgContext';
import { ORG_SHORT } from '@/lib/orgMockData';
import { auditContrast } from '@/lib/a11y/audit-contrast';
import '@/app/(dashboard)/home-dashboard/home-dashboard.css';
import '@/app/(dashboard)/learning-center/learning-center.css';

/*
 * Learning Center — contrast tokens (see learning-center.css → .lc-surface-*)
 * ─────────────────────────────────────────────────────────────────────────
 * Every card on this page wraps content in <LearningCard surface=...>.
 * Inside, use the helpers — never inline hex colors:
 *
 *   <CardPrimary>    → important text (titles, values)
 *   <CardSecondary>  → body / label text
 *   <CardMuted>      → meta / timestamps / secondary captions
 *   <CardBadge>      → pill-style status labels
 *
 * Surface → intent:
 *   default    — regular page cards
 *   tinted     — emerald-washed cards (journey, track tiles)
 *   accent     — fully branded (emerald bg, white fg) — selected track
 *   muted      — secondary-tier cards
 *   completed  — completed course rows (green wash)
 *   locked     — locked course rows (dim but still readable)
 *
 * Raw color tokens (when CSS class isn't enough):
 *   var(--text-primary)    → headings / values
 *   var(--text-secondary)  → body
 *   var(--text-muted)      → de-emphasised
 *   var(--text-faint)      → captions, timestamps (use sparingly)
 *   var(--emerald)         → brand accent
 *   var(--emerald-text)    → brand text (flips darker on light)
 */

const TRACK_COLORS = {
  stocks: 'var(--emerald)',
  crypto: '#f59e0b',
  betting: '#6366f1',
  commodities: '#ec4899',
  risk: 'var(--emerald)',
};

const TRACK_ICONS = {
  stocks: '📈',
  crypto: '₿',
  betting: '🎯',
  commodities: '🛢️',
  risk: '🧠',
};

export function LearningCenterPage() {
  const { isOrgUser } = useOrg();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState('stocks');
  const [selectedLevel, setSelectedLevel] = useState('basic');

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

  useEffect(() => {
    load();
  }, [load]);

  // Dev-only contrast audit — logs any text on this page that fails WCAG AA
  // against its nearest opaque background. Run in both light and dark mode.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && !loading && data) {
      const t = setTimeout(() => auditContrast('.lc3-page'), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [loading, data]);

  const progressById = useMemo(
    () => buildProgressMap(data?.progress || []),
    [data?.progress],
  );

  const inProgressCourses = useMemo(() => {
    if (!data?.courses) return [];
    return data.courses
      .filter((c) => {
        const row = progressById[c.id];
        return row?.status === 'in_progress' && !isCourseFullyCompleted(row);
      })
      .slice(0, 3);
  }, [data?.courses, progressById]);

  const suggestedCourses = useMemo(() => {
    if (!data?.courses) return [];
    const inProgIds = new Set(inProgressCourses.map((c) => c.id));
    return data.courses
      .filter((c) => {
        if (inProgIds.has(c.id)) return false;
        const access = canAccessCourse(c, progressById);
        if (!access.ok) return false;
        const row = progressById[c.id];
        return !row || !isCourseFullyCompleted(row);
      })
      .slice(0, 3);
  }, [data?.courses, progressById, inProgressCourses]);

  const coursesForView = useMemo(() => {
    return getOrderedCoursesForTrack(selectedTrack).filter(
      (c) => c.level === selectedLevel,
    );
  }, [selectedTrack, selectedLevel]);

  const levelUnlocked = useMemo(
    () => isLevelUnlocked(selectedTrack, selectedLevel, progressById),
    [selectedTrack, selectedLevel, progressById],
  );

  const prevLevelKey = useMemo(() => {
    const idx = LEVEL_KEYS.indexOf(selectedLevel);
    return idx > 0 ? LEVEL_KEYS[idx - 1] : null;
  }, [selectedLevel]);

  if (loading) {
    return (
      <div
        className="dashboard-page-inset db-page lc3-page"
        style={{ paddingTop: 0, paddingBottom: '2rem' }}
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Loading Learning Center…
        </p>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div
        className="dashboard-page-inset db-page lc3-page"
        style={{ paddingTop: 0, paddingBottom: '2rem' }}
      >
        <p style={{ color: 'var(--negative)' }}>{err || 'Unable to load.'}</p>
        <button
          type="button"
          onClick={load}
          style={{
            marginTop: '0.75rem',
            padding: '0.35rem 0.85rem',
            borderRadius: 8,
            border: '1px solid var(--emerald-border)',
            background: 'var(--emerald-bg)',
            color: 'var(--emerald-text)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const { overall, tracks } = data;

  return (
    <div
      className="dashboard-page-inset db-page lc3-page"
      style={{ paddingTop: 0, paddingBottom: '2rem' }}
    >
      <div className="lc3-header-row">
        <div>
          <h1 className="lc3-page-title">Learning Center</h1>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '.8125rem',
              marginTop: '.25rem',
            }}
          >
            Master the markets — from beginner to expert
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '0.75rem',
        }}
      >
        <Link
          href="/learning-center/badges"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.9rem',
            background: 'var(--emerald-bg)',
            border: '1px solid var(--emerald-border)',
            borderRadius: '8px',
            color: 'var(--emerald-text)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <i className="bi bi-award" aria-hidden /> Badges
        </Link>
      </div>

      {/* ── Your Learning Journey (tinted surface) ─────────────────── */}
      <LearningCard
        as="div"
        surface="tinted"
        className="db-card"
        style={{ padding: '1.5rem', marginBottom: '1.25rem' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '.75rem',
          }}
        >
          <CardPrimary
            as="h2"
            style={{ fontSize: '.9375rem', fontWeight: 800, margin: 0 }}
          >
            Your Learning Journey
          </CardPrimary>
          <span
            style={{
              color: 'var(--emerald-text)',
              fontSize: '.8125rem',
              fontWeight: 700,
            }}
          >
            {overall.completed}/{overall.total} courses complete
          </span>
        </div>

        <div
          style={{
            height: 10,
            background: 'var(--emerald-bg)',
            borderRadius: 6,
            overflow: 'hidden',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              width: `${overall.pct}%`,
              height: '100%',
              background:
                'linear-gradient(90deg, var(--emerald), var(--emerald-hover))',
              borderRadius: 6,
              transition: 'width 0.6s ease',
            }}
          />
        </div>

        <div className="lc3-journey-grid">
          <div>
            <p className="lc3-label">Currently taking</p>
            {inProgressCourses.length === 0 ? (
              <CardMuted
                as="p"
                style={{ fontSize: '.8125rem', margin: '.25rem 0 0' }}
              >
                No courses in progress. Start one below!
              </CardMuted>
            ) : (
              inProgressCourses.map((c) => {
                const row = progressById[c.id];
                const pct = row?.progress_pct ?? 0;
                const color = TRACK_COLORS[c.track] || 'var(--emerald)';
                return (
                  <div key={c.id} className="lc3-inprogress-row">
                    <span style={{ fontSize: '.8rem' }}>
                      {TRACK_ICONS[c.track]}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <CardPrimary
                        as="p"
                        style={{
                          fontSize: '.8125rem',
                          fontWeight: 700,
                          margin: 0,
                        }}
                      >
                        {c.title}
                      </CardPrimary>
                      <CardMuted
                        as="p"
                        style={{ fontSize: '.6875rem', margin: 0 }}
                      >
                        {TRACKS.find((t) => t.id === c.track)?.shortLabel} ·{' '}
                        {getLevelLabel(c.level)}
                      </CardMuted>
                    </div>
                    <div style={{ width: 50 }}>
                      <div
                        style={{
                          height: 3,
                          background: 'var(--emerald-bg-hover)',
                          borderRadius: 2,
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: color,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <CardMuted
                        as="p"
                        style={{
                          fontSize: '.625rem',
                          margin: '.1rem 0 0',
                          textAlign: 'right',
                        }}
                      >
                        {pct}%
                      </CardMuted>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div>
            <p className="lc3-label">Suggested courses</p>
            {suggestedCourses.length === 0 ? (
              <CardMuted
                as="p"
                style={{ fontSize: '.8125rem', margin: '.25rem 0 0' }}
              >
                You&apos;re all caught up — explore tracks below.
              </CardMuted>
            ) : (
              suggestedCourses.map((c) => {
                const color = TRACK_COLORS[c.track] || 'var(--emerald)';
                return (
                  <div key={c.id} className="lc3-inprogress-row">
                    <span style={{ fontSize: '.8rem' }}>
                      {TRACK_ICONS[c.track]}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        href={`/learning-center/course/${c.id}`}
                        style={{
                          color: 'var(--text-primary)',
                          fontSize: '.8125rem',
                          fontWeight: 700,
                          margin: 0,
                          textDecoration: 'none',
                        }}
                      >
                        {c.title}
                      </Link>
                      <CardMuted
                        as="p"
                        style={{ fontSize: '.6875rem', margin: 0 }}
                      >
                        {TRACKS.find((t) => t.id === c.track)?.shortLabel} ·{' '}
                        {getLevelLabel(c.level)}
                      </CardMuted>
                    </div>
                    <div style={{ width: 50 }}>
                      <div
                        style={{
                          height: 3,
                          background: 'var(--emerald-bg-hover)',
                          borderRadius: 2,
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            background: color,
                            borderRadius: 2,
                            opacity: 0.45,
                          }}
                        />
                      </div>
                      <CardMuted
                        as="p"
                        style={{
                          fontSize: '.625rem',
                          margin: '.1rem 0 0',
                          textAlign: 'right',
                        }}
                      >
                        Start
                      </CardMuted>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </LearningCard>

      {/* ── Org-assigned learning (default surface, purple-accent trim) ── */}
      {isOrgUser && (
        <LearningCard
          as="div"
          surface="default"
          className="db-card"
          style={{
            marginBottom: '1.25rem',
            padding: '1rem 1.25rem',
            borderColor: 'rgba(99,102,241,0.25)',
          }}
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
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  marginTop: '0.35rem',
                }}
              >
                {ORG_SHORT} Learning Assignments
              </CardPrimary>
              <CardSecondary
                as="p"
                style={{ fontSize: '0.8rem', margin: '0.35rem 0 0' }}
              >
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
                <CardPrimary
                  as="div"
                  style={{ fontWeight: 700, fontSize: '0.8125rem' }}
                >
                  {a.title}
                </CardPrimary>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.35rem',
                    fontSize: '0.6875rem',
                  }}
                >
                  <CardBadge
                    tone={a.status === 'in_progress' ? 'info' : 'neutral'}
                  >
                    {a.status.replace('_', ' ')}
                  </CardBadge>
                  <CardMuted as="span">Due {a.due}</CardMuted>
                </div>
              </LearningCard>
            ))}
          </div>
        </LearningCard>
      )}

      {/* ── Track progress tiles (tinted / accent when selected) ─────── */}
      <div className="lc3-track-progress-row">
        {tracks.map((t, ti) => {
          const pct = t.summary?.pct ?? 0;
          const color = TRACK_COLORS[t.id] || 'var(--emerald)';
          const selected = selectedTrack === t.id;
          return (
            <LearningCard
              key={t.id}
              as="button"
              type="button"
              surface={selected ? 'accent' : 'tinted'}
              className={`db-card lc3-track-card-btn ${selected ? 'lc3-track-card-btn--selected' : ''}`}
              onClick={() => {
                setSelectedTrack(t.id);
                setSelectedLevel('basic');
              }}
              data-task-target={ti === 0 ? 'learning-module-card' : undefined}
              aria-pressed={selected}
            >
              <p style={{ fontSize: '.8rem', margin: '0 0 .15rem' }}>
                {TRACK_ICONS[t.id]}
              </p>
              <CardPrimary
                as="p"
                style={{
                  fontSize: '.6875rem',
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {t.shortLabel}
              </CardPrimary>
              <p
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: selected ? '#ffffff' : color,
                  margin: '.35rem 0 .25rem',
                }}
              >
                {pct}%
              </p>
              <div
                style={{
                  height: 4,
                  background: selected
                    ? 'rgba(255,255,255,0.25)'
                    : 'var(--emerald-bg-hover)',
                  borderRadius: 2,
                  marginBottom: '.25rem',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: selected ? '#ffffff' : color,
                    borderRadius: 2,
                  }}
                />
              </div>
              <CardMuted as="p" style={{ fontSize: '.625rem', margin: 0 }}>
                {t.summary?.completed ?? 0}/
                {t.summary?.total ?? t.totalCourses} courses
              </CardMuted>
            </LearningCard>
          );
        })}
      </div>

      {/* ── Friends + course panel ───────────────────────────────── */}
      <div className="lc3-bottom-grid">
        <FriendsLearningCard />

        <LearningCard
          as="div"
          surface="default"
          className="db-card lc3-course-panel"
        >
          <div className="db-card-header lc3-course-panel-header">
            <div>
              <CardPrimary
                as="h3"
                style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}
              >
                {TRACK_ICONS[selectedTrack]}{' '}
                {tracks.find((t) => t.id === selectedTrack)?.shortLabel ||
                  'Track'}
              </CardPrimary>
              <CardMuted
                as="p"
                style={{ fontSize: '.75rem', marginTop: '.15rem' }}
              >
                {getLevelLabel(selectedLevel)} level · {coursesForView.length}{' '}
                courses
              </CardMuted>
            </div>
            <div className="lc3-level-tabs" role="tablist">
              {LEVEL_KEYS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setSelectedLevel(lv)}
                  role="tab"
                  aria-selected={selectedLevel === lv}
                  className={
                    selectedLevel === lv
                      ? 'lc3-level-tab lc3-level-tab--active'
                      : 'lc3-level-tab'
                  }
                >
                  {getLevelLabel(lv)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '0 1.25rem 1rem' }}>
            {!levelUnlocked ? (
              <CardMuted
                as="p"
                style={{ fontSize: '.8125rem', padding: '.75rem 0' }}
              >
                Complete all {getLevelLabel(prevLevelKey)} courses in this
                track to unlock {getLevelLabel(selectedLevel)}.
              </CardMuted>
            ) : (
              coursesForView.map((c, i) => (
                <CourseRow
                  key={c.id}
                  course={c}
                  index={i}
                  progress={progressById[c.id]}
                  access={canAccessCourse(c, progressById)}
                />
              ))
            )}
          </div>
        </LearningCard>
      </div>
    </div>
  );
}

/**
 * Course row — surface adapts to course state so the status badge, title
 * and metadata all resolve to a contrasting foreground automatically.
 */
function CourseRow({ course, index, progress, access }) {
  const completed = isCourseFullyCompleted(progress);
  const inProgress =
    progress && progress.status === 'in_progress' && !completed;
  const pct = progress?.progress_pct || 0;
  const locked = !access.ok;

  const surface = completed
    ? 'completed'
    : locked
      ? 'locked'
      : inProgress
        ? 'tinted'
        : 'default';

  const circleContent = completed
    ? '✓'
    : inProgress
      ? `${pct}%`
      : locked
        ? '🔒'
        : String(index + 1);

  const statusTone = completed
    ? 'positive'
    : inProgress
      ? 'warning'
      : locked
        ? 'neutral'
        : 'neutral';

  const statusText = completed
    ? 'Complete'
    : inProgress
      ? 'In progress'
      : locked
        ? 'Locked'
        : 'Start';

  const circleStyle = completed
    ? { background: 'var(--emerald)', color: '#fff' }
    : inProgress
      ? {
          border: '2px solid var(--warning)',
          background: 'var(--warning-bg)',
          color: 'var(--warning)',
        }
      : locked
        ? {
            border: '1px solid var(--border-primary)',
            color: 'var(--text-muted)',
          }
        : {
            border: '1px solid var(--border-primary)',
            color: 'var(--text-muted)',
          };

  const body = (
    <>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: locked ? '.55rem' : inProgress ? '.55rem' : '.6875rem',
          fontWeight: 700,
          flexShrink: 0,
          ...circleStyle,
        }}
      >
        {circleContent}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <CardPrimary
          as="p"
          style={{ fontSize: '.8125rem', fontWeight: 600, margin: 0 }}
        >
          {course.title}
        </CardPrimary>
        <CardMuted
          as="p"
          style={{ fontSize: '.6875rem', margin: 0 }}
        >
          {course.duration_minutes} min
        </CardMuted>
      </div>
      <CardBadge tone={statusTone}>{statusText}</CardBadge>
    </>
  );

  const rowClass = `lc3-course-row-card ${access.ok ? '' : 'lc3-course-row-card--disabled'}`.trim();

  if (access.ok) {
    return (
      <LearningCard
        as={Link}
        href={`/learning-center/course/${course.id}`}
        surface={surface}
        className={rowClass}
      >
        {body}
      </LearningCard>
    );
  }

  return (
    <LearningCard
      as="div"
      surface={surface}
      className={rowClass}
      aria-disabled
    >
      {body}
    </LearningCard>
  );
}
