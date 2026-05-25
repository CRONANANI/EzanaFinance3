'use client';

/**
 * Footer dock for the course chapter editorial layout.
 *
 * The primary action button morphs based on the reader's progress state:
 *   1. Not on last section            → "Next: {nextShortTitle} →"
 *   2. On last section, not done      → "Finish chapter →"
 *   3. Reading acknowledged           → "Confirm & unlock quiz"
 *   4. Reading marked complete server → "Take Quiz →"
 */
export function FooterDock({
  currentIdx,
  totalSections,
  isLastSection,
  isMarkedRead,
  nextShortTitle,
  readAck,
  readingComplete,
  quizPassed,
  submitting,
  onPrev,
  onNext,
  onReadingDone,
  onStartQuiz,
}) {
  let primaryLabel = '';
  let primaryAction = null;
  let primaryDisabled = false;

  if (quizPassed) {
    primaryLabel = 'Chapter complete ✓';
    primaryAction = null;
    primaryDisabled = true;
  } else if (readingComplete) {
    primaryLabel = 'Take Quiz →';
    primaryAction = onStartQuiz;
  } else if (readAck) {
    primaryLabel = 'Confirm & unlock quiz';
    primaryAction = onReadingDone;
    primaryDisabled = !!submitting;
  } else if (isLastSection) {
    primaryLabel = 'Finish chapter →';
    primaryAction = onNext;
  } else {
    primaryLabel = `Next: ${nextShortTitle} →`;
    primaryAction = onNext;
  }

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
        {isMarkedRead && !readAck && (
          <span className="lc-edit-footer-readhint">
            <i className="bi bi-check2-circle" /> Marked as read
          </span>
        )}
        {primaryAction && (
          <button
            type="button"
            className="lc-edit-btn-primary"
            disabled={primaryDisabled}
            onClick={primaryAction}
            data-task-target={primaryLabel === 'Take Quiz →' ? 'learning-quiz-button' : undefined}
          >
            {primaryLabel}
          </button>
        )}
        {!primaryAction && quizPassed && (
          <span className="lc-edit-footer-readhint">{primaryLabel}</span>
        )}
      </div>
    </div>
  );
}
