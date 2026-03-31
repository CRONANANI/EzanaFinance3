'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LEVEL_KEYS, getLevelLabel } from '@/lib/learning-curriculum';
import {
  buildProgressMap,
  canAccessCourse,
  getActiveLearningTrack,
  getOrderedCoursesForTrack,
  isCourseFullyCompleted,
  isLevelUnlocked,
} from '@/lib/learning-progress-logic';
import { LearningCenterHero } from '@/components/learning/LearningCenterHero';
import { PartnerCreatorContentCard } from '@/components/learning/PartnerCreatorContentCard';
import { FriendsLearningCard } from '@/components/learning/FriendsLearningCard';
import { learningTrackBiClass } from '@/lib/dashboard-bi-icons';
import { useOrg } from '@/contexts/OrgContext';
import { ORG_NAME, ORG_SHORT, MOCK_TASKS, MOCK_MEMBERS } from '@/lib/orgMockData';

export function LearningCenterPage() {
  const { isOrgUser, orgRole, orgData } = useOrg();
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

  const viewerForHero = useMemo(() => {
    if (data?.viewer) return data.viewer;
    return {
      displayName: 'Learner',
      avatarUrl: null,
      currentTrackId: getActiveLearningTrack(progressById),
    };
  }, [data?.viewer, progressById]);

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

      <LearningCenterHero viewer={viewerForHero} overall={overall} tracks={tracks} badges={badges} />

      {isOrgUser && (
        <div
          className="db-card"
          style={{
            marginTop: '1rem',
            padding: '1rem 1.25rem',
            border: '1px solid rgba(99,102,241,0.25)',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(16,185,129,0.04))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ color: '#6366f1', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                Assigned by your Portfolio Manager
              </div>
              <div style={{ color: '#f0f6fc', fontSize: '0.95rem', fontWeight: 700, marginTop: '0.35rem' }}>
                {ORG_SHORT} Learning Assignments
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
                Track what your council expects you to complete this week.
              </p>
            </div>
            <Link href="/org-team-hub" className="lc2-course-action" style={{ textDecoration: 'none', height: 'fit-content' }}>
              Team Hub →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>
            {[
              { title: 'Valuation Fundamentals', status: 'in_progress', due: 'Apr 12' },
              { title: 'Pitch Deck Writing', status: 'assigned', due: 'Apr 14' },
              { title: 'Risk & Position Sizing', status: 'assigned', due: 'Apr 18' },
            ].map((a) => (
              <div key={a.title} style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.12)', background: 'rgba(13,17,23,0.6)' }}>
                <div style={{ color: '#f0f6fc', fontWeight: 700, fontSize: '0.8125rem' }}>{a.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.6875rem' }}>
                  <span style={{ color: a.status === 'in_progress' ? '#6366f1' : '#9ca3af', fontWeight: 700 }}>{a.status.replace('_', ' ')}</span>
                  <span style={{ color: '#6b7280' }}>Due {a.due}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PartnerCreatorContentCard />

      <div className="lc2-track-row">
        {tracks.map((t, ti) => (
          <button
            key={t.id}
            type="button"
            className={`lc2-track-card db-card ${selectedTrack === t.id ? 'active' : ''}`}
            onClick={() => setSelectedTrack(t.id)}
            data-task-target={ti === 0 ? 'learning-module-card' : undefined}
          >
            <div className="lc2-track-icon" aria-hidden>
              <i className={`bi ${learningTrackBiClass(t.id)}`} />
            </div>
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

      <FriendsLearningCard />
    </div>
  );
}
