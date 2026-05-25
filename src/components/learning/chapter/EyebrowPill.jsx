'use client';

export function EyebrowPill({ sectionIdx, totalSections, isComplete }) {
  return (
    <div className="lc-edit-eyebrow-row">
      <span className={`lc-edit-eyebrow-pill ${isComplete ? 'is-complete' : ''}`}>
        Section {sectionIdx + 1} / {totalSections} · {isComplete ? 'complete' : 'reading'}
        {isComplete && <i className="bi bi-check" />}
      </span>
      <span className="lc-edit-eyebrow-meta">saved automatically</span>
    </div>
  );
}
