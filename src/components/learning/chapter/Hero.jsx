'use client';

import Link from 'next/link';
import { Stepper } from './Stepper';

export function Hero({
  course,
  trackLabel,
  levelLabel,
  subDeck,
  sections,
  currentSectionIdx,
  completedSet,
  onSectionJump,
}) {
  return (
    <header className="lc-edit-hero">
      <Link href="/learning-center" className="lc-edit-backlink">
        ← Back to Learning Center
      </Link>
      <nav className="lc-edit-breadcrumb" aria-label="breadcrumb">
        <i className="bi bi-bookmark" />
        <span>{trackLabel}</span>
        <span className="lc-edit-bc-sep">›</span>
        <span>{levelLabel}</span>
        <span className="lc-edit-bc-sep">›</span>
        <span>
          Course {course.courseIndex} of {course.totalCourses}
        </span>
      </nav>
      <h1 className="lc-edit-h1">{course.title}</h1>
      {subDeck && <p className="lc-edit-subdeck">{subDeck}</p>}
      <div className="lc-edit-meta">
        <span className="lc-edit-meta-item">
          <i className="bi bi-clock" /> {course.estimatedMinutes} min · {course.totalSections}{' '}
          sections
        </span>
        <span className="lc-edit-meta-divider" />
        <span className="lc-edit-meta-item">
          <i className="bi bi-bar-chart" /> {levelLabel} ·{' '}
          {levelLabel === 'Bronze'
            ? 'Beginner'
            : levelLabel === 'Silver'
              ? 'Intermediate'
              : levelLabel === 'Gold'
                ? 'Advanced'
                : 'Expert'}
        </span>
        <span className="lc-edit-meta-divider" />
        <span className="lc-edit-meta-item">
          Course {course.courseIndex} of {course.totalCourses}
        </span>
      </div>
      <Stepper
        sections={sections}
        currentIdx={currentSectionIdx}
        completedSet={completedSet}
        onJump={onSectionJump}
      />
    </header>
  );
}
