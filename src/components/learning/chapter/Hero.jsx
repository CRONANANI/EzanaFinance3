'use client';

import Link from 'next/link';
import { Stepper } from './Stepper';

export function Hero({
  course,
  trackLabel,
  levelLabel,
  sections,
  currentSectionIdx,
  completedSet,
  onSectionJump,
}) {
  return (
    <header className="lc-edit-hero">
      <Link href="/learning-center" className="lc-edit-backlink">
        ← Learning Center
      </Link>

      <div className="lc-edit-hero-row">
        <nav className="lc-edit-breadcrumb" aria-label="breadcrumb">
          <span>{trackLabel}</span>
          <span className="lc-edit-bc-sep">›</span>
          <span>{levelLabel}</span>
        </nav>

        <h1 className="lc-edit-h1">{course.title}</h1>

        <div className="lc-edit-meta">
          <span className="lc-edit-meta-item">
            <i className="bi bi-clock" /> {course.estimatedMinutes}m
          </span>
          <span className="lc-edit-meta-divider" />
          <span className="lc-edit-meta-item">{course.totalSections} sections</span>
          <span className="lc-edit-meta-divider" />
          <span className="lc-edit-meta-item">
            Course {course.courseIndex}/{course.totalCourses}
          </span>
        </div>
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
