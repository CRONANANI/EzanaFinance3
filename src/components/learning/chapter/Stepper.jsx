'use client';

export function Stepper({ sections, currentIdx, completedSet, onJump }) {
  const doneCount = sections.filter((_, i) => completedSet.has(i)).length;
  const progressPct =
    sections.length > 1 ? (doneCount / (sections.length - 1)) * 100 : doneCount > 0 ? 100 : 0;

  return (
    <ol className="lc-edit-stepper" role="list">
      <span
        className="lc-edit-stepper-progress"
        style={{ width: `calc((100% - 14px) * ${progressPct / 100})` }}
        aria-hidden
      />
      {sections.map((s, i) => {
        const isActive = i === currentIdx;
        const isDone = completedSet.has(i);
        const stateClass = isActive
          ? 'is-active'
          : isDone
            ? 'is-done'
            : i > currentIdx
              ? 'is-future'
              : '';
        return (
          <li key={s.id || i} className={`lc-edit-step ${stateClass}`}>
            <button
              type="button"
              className="lc-edit-step-node"
              onClick={() => onJump(i)}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Section ${i + 1}: ${s.shortTitle || s.title}`}
            >
              {isDone ? (
                <i className="bi bi-check" />
              ) : (
                <span className="lc-edit-step-num">{i + 1}</span>
              )}
            </button>
            <span className="lc-edit-step-label">{s.shortTitle || s.title}</span>
          </li>
        );
      })}
    </ol>
  );
}
