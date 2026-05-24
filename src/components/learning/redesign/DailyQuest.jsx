'use client';

import Link from 'next/link';
import { getCourseById, TRACKS } from '@/lib/learning-curriculum';
import { ProgressBar, Pill } from './atoms';

function BonusQuest({ quest }) {
  const done = quest.done || quest.progress >= quest.target;
  return (
    <div className={`lc-dq-bonus ${done ? 'lc-dq-bonus--done' : ''}`}>
      <div className="lc-dq-bonus-icon">
        <i className={`bi ${done ? 'bi-check-lg' : 'bi-circle'}`} />
      </div>
      <div>
        <div className="lc-dq-bonus-label">{quest.label}</div>
        <ProgressBar value={quest.progress || 0} max={quest.target || 1} />
      </div>
      <div className="lc-dq-bonus-reward">+{quest.reward_elo} ELO</div>
    </div>
  );
}

export function DailyQuest({ primary, bonus = [], resetsInLabel = '—' }) {
  const course = primary?.course_id ? getCourseById(primary.course_id) : null;
  const trackLabel = course ? TRACKS.find((t) => t.id === course.track)?.shortLabel : null;

  return (
    <section className="lc-daily-quest">
      <div className="lc-dq-header">
        <div>
          <div className="lc-eyebrow">Daily Quest</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>Earn bonus ELO today</div>
        </div>
        <Pill tone="amber">Resets in {resetsInLabel}</Pill>
      </div>

      <div className="lc-dq-primary">
        <div className="lc-dq-primary-row1">
          <Pill tone="emerald">Pick up where you left off</Pill>
        </div>
        <div className="lc-dq-primary-title">{course?.title || 'Explore a new course'}</div>
        <div className="lc-dq-primary-meta">
          {trackLabel && <span>{trackLabel}</span>}
          {course?.level && <span>{course.level}</span>}
          {course?.duration_minutes && <span>{course.duration_minutes} min</span>}
        </div>
        {course && (
          <Link href={`/learning-center/course/${course.id}`} className="lc-dq-cta">
            Start lesson <i className="bi bi-arrow-right" />
          </Link>
        )}
      </div>

      <div className="lc-dq-bonus-header lc-eyebrow">Bonus quests</div>
      <div className="lc-dq-bonus-list">
        {bonus.map((q) => (
          <BonusQuest key={q.id} quest={q} />
        ))}
      </div>
    </section>
  );
}
