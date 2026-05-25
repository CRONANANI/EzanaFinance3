'use client';

export function FooterDock({
  currentIdx,
  totalSections,
  isLastSection,
  isMarkedRead,
  nextShortTitle,
  onPrev,
  onNext,
}) {
  return (
    <div className="lc-edit-footer">
      <div className="lc-edit-footer-left">
        <button
          type="button"
          className="lc-edit-btn-secondary"
          disabled={currentIdx === 0}
          onClick={onPrev}
        >
          ← Previous
        </button>
        <span className="lc-edit-footer-position">
          <strong>Section {currentIdx + 1}</strong> of {totalSections}
        </span>
      </div>
      <div className="lc-edit-footer-right">
        {isMarkedRead && (
          <span className="lc-edit-footer-readhint">
            <i className="bi bi-check2-circle" /> Marked as read
          </span>
        )}
        <button type="button" className="lc-edit-btn-primary" onClick={onNext}>
          {isLastSection ? 'Finish chapter →' : `Next: ${nextShortTitle} →`}
        </button>
      </div>
    </div>
  );
}
