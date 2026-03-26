'use client';

import Link from 'next/link';
import { getLevelLabel } from '@/lib/learning-curriculum';
import '../../../app-legacy/components/learning/learning-opportunities.css';

function levelClass(level) {
  if (level === 'basic') return 'beginner';
  if (level === 'expert') return 'advanced';
  return level;
}

/**
 * Full-width course row matching Inside the Capitol learning block — horizontal scroll on small widths.
 */
export function CoursePreviewSection({
  title,
  subtitle,
  courses,
  viewAllHref = '/learning-center',
  viewAllLabel = 'View All Courses →',
  className = '',
}) {
  if (!courses?.length) return null;

  return (
    <section className={`learning-opportunities ${className}`.trim()}>
      <div className="learning-header">
        <div className="learning-title-area">
          <div className="learning-icon">
            <i className="bi bi-mortarboard-fill" aria-hidden />
          </div>
          <div className="learning-title-text">
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
        <Link href={viewAllHref} className="view-all-btn">
          {viewAllLabel}
        </Link>
      </div>
      <div className="courses-grid">
        {courses.map((c) => (
          <Link key={c.id} href={`/learning-center/course/${c.id}`} className="course-card course-card--link">
            <div className="course-header">
              <span className="course-type">Course</span>
              <span className="course-duration">
                <i className="bi bi-clock" aria-hidden /> {c.duration_minutes} min
              </span>
            </div>
            <h4 className="course-title">{c.title}</h4>
            <p className="course-description">{c.description}</p>
            <div className="course-meta">
              <div className="meta-item">
                <i className="bi bi-book" aria-hidden /> Quiz included
              </div>
              <div className="meta-item">
                <i className="bi bi-layers" aria-hidden /> {getLevelLabel(c.level)}
              </div>
            </div>
            <div className="course-footer">
              <span className={`course-level ${levelClass(c.level)}`}>{getLevelLabel(c.level)}</span>
              <span className="enroll-btn" style={{ pointerEvents: 'none' }}>
                Open course
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
