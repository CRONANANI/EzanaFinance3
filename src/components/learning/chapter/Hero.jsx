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
  const sectionTitle = sections?.[currentSectionIdx]?.title;
  const chapterNum = currentSectionIdx + 1;
  const chapterTotal = sections?.length ?? course.totalSections ?? 0;

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
          <span className="lc-edit-bc-sep">›</span>
          <span>{course.title}</span>
        </nav>

        <h1 className="lc-edit-h1">{sectionTitle || course.title}</h1>

        <div className="lc-edit-meta">
          <span className="lc-edit-meta-item">
            Chapter {chapterNum} of {chapterTotal}
          </span>
          <span className="lc-edit-meta-divider" />
          <span className="lc-edit-meta-item">
            <i className="bi bi-clock" /> {course.estimatedMinutes}m
          </span>
          <span className="lc-edit-meta-divider" />
          <span className="lc-edit-meta-item">
            Course {course.courseIndex}/{course.totalCourses}
          </span>
        </div>
      </div>

      {subDeck && currentSectionIdx === 0 ? <p className="lc-edit-subdeck">{subDeck}</p> : null}

      <Stepper
        sections={sections}
        currentIdx={currentSectionIdx}
        completedSet={completedSet}
        onJump={onSectionJump}
      />
    </header>
  );
}
