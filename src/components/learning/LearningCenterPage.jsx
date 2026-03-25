'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LEVEL_KEYS, getLevelLabel } from '@/lib/learning-curriculum';
import {
  buildProgressMap,
  canAccessCourse,
  getOrderedCoursesForTrack,
  isCourseFullyCompleted,
  isLevelUnlocked,
  LEVEL_BADGE_LABELS,
  TRACK_BADGE_LABELS,
} from '@/lib/learning-progress-logic';

function badgeLabel(key) {
  if (TRACK_BADGE_LABELS[key.replace(/_track_master$/, '')] && key.endsWith('_track_master')) {
    const t = key.replace(/_track_master$/, '');
    return TRACK_BADGE_LABELS[t];
  }
  const m = key.match(/_level_(.+)$/);
  if (m && LEVEL_BADGE_LABELS[m[1]]) return LEVEL_BADGE_LABELS[m[1]];
  return key;
}

export function LearningCenterPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState('stocks');

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

  const progressById = useMemo(() => buildProgressMap(data?.progress || []), [data?.progress]);

  const trackMeta = useMemo(() => data?.tracks?.find((t) => t.id === selectedTrack), [data?.tracks, selectedTrack]);

  const levelsForTrack = useMemo(() => {
    if (!selectedTrack) return [];
    const byLevel = {};
    for (const lv of LEVEL_KEYS) {
      byLevel[lv] = getOrderedCoursesForTrack(selectedTrack).filter((c) => c.level === lv);
    }
    return byLevel;
  }, [selectedTrack]);

  if (loading) {
    return (
      <div className="dashboard-page-inset lc2-page db-page">
        <div className="lc2-loading">Loading Learning Center…</div>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="dashboard-page-inset lc2-page db-page">
        <p style={{ color: '#f87171' }}>{err || 'Unable to load.'}</p>
        <button type="button" className="lc2-course-action" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  const { overall, tracks, badges } = data;

  return (
    <div className="dashboard-page-inset lc2-page db-page">
      <header style={{ marginBottom: '1rem' }}>
        <h1 className="lc2-header-title">Learning Center</h1>
        <p className="lc2-header-desc">Master the markets — from beginner to expert</p>
      </header>

      <div className="lc2-overall">
        <div className="lc2-overall-label">
          Overall Progress: {overall.completed}/{overall.total} courses completed ({overall.pct}%)
        </div>
        <div className="lc2-overall-bar">
          <div className="lc2-overall-fill" style={{ width: `${overall.pct}%` }} />
        </div>
      </div>

      <div className="lc2-track-row">
        {tracks.map((t, ti) => (
          <button
            key={t.id}
            type="button"
            className={`lc2-track-card db-card ${selectedTrack === t.id ? 'active' : ''}`}
            onClick={() => setSelectedTrack(t.id)}
            data-task-target={ti === 0 ? 'learning-module-card' : undefined}
          >
            <div className="lc2-track-icon">{t.icon}</div>
            <div className="lc2-track-name">{t.shortLabel}</div>
            <div className="lc2-track-meta">
              {t.totalCourses} courses · {t.summary?.completed ?? 0}/{t.summary?.total ?? t.totalCourses} completed
            </div>
            <div className="lc2-track-bar">
              <div className="lc2-track-bar-fill" style={{ width: `${t.summary?.pct ?? 0}%` }} />
            </div>
            <div className="lc2-track-pct">{t.summary?.pct ?? 0}%</div>
          </button>
        ))}
      </div>

      <div className="lc2-detail">
        {trackMeta && (
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
            {trackMeta.icon} {trackMeta.label} — {trackMeta.summary?.completed ?? 0}/{trackMeta.summary?.total ?? 0}{' '}
            courses completed
          </p>
        )}

        {LEVEL_KEYS.map((level) => {
          const courses = levelsForTrack[level] || [];
          const levelUnlocked = isLevelUnlocked(selectedTrack, level, progressById);
          const done = trackMeta?.summary?.levels?.[level]?.completed ?? 0;
          const total = trackMeta?.summary?.levels?.[level]?.total ?? courses.length;

          return (
            <div key={level} className={`lc2-level-block db-card ${!levelUnlocked ? 'locked' : ''}`}>
              <div className="lc2-level-head">
                <span>
                  {getLevelLabel(level)}
                  {!levelUnlocked ? ' — 🔒 Locked (complete previous level)' : ''}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {levelUnlocked ? `✅ ${done}/${total}` : '—'}
                </span>
              </div>
              {!levelUnlocked ? (
                <div className="lc2-course-row locked" style={{ border: 'none' }}>
                  <span>Complete all {getLevelLabel(LEVEL_KEYS[LEVEL_KEYS.indexOf(level) - 1])} courses to unlock.</span>
                </div>
              ) : (
                <div className="lc2-level-body">
                  {courses.map((c) => {
                    const row = progressById[c.id];
                    const doneCourse = isCourseFullyCompleted(row);
                    const access = canAccessCourse(c, progressById);
                    const locked = !access.ok;
                    const inProgress = row && row.status === 'in_progress' && !doneCourse;

                    let cls = 'lc2-course-row';
                    if (doneCourse) cls += ' done';
                    else if (inProgress) cls += ' active';
                    else if (locked) cls += ' locked';

                    return (
                      <div key={c.id} className={cls}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="lc2-course-title">
                            {doneCourse ? '✅ ' : locked ? '🔒 ' : '○ '}
                            {c.title}
                          </div>
                          <div className="lc2-course-meta">
                            {c.duration_minutes} min
                            {row?.quiz_score != null && doneCourse ? ` · Quiz: ${row.quiz_score}%` : ''}
                            {doneCourse ? ' · Completed' : ''}
                          </div>
                        </div>
                        <div>
                          {locked ? (
                            <span className="lc2-course-meta">Complete previous first</span>
                          ) : (
                            <Link href={`/learning-center/course/${c.id}`} className="lc2-course-action">
                              {doneCourse ? 'Review →' : 'Start Course →'}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {badges?.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <h2 className="lc2-header-title" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
            Your badges
          </h2>
          <div className="lc2-badges">
            {badges.map((b) => (
              <span key={b.badge_key} className="lc2-badge" title={b.badge_key}>
                {badgeLabel(b.badge_key)}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
