'use client';

export function Stepper({ sections, currentIdx, completedSet, onJump }) {
  return (
    <ol className="lc-edit-stepper" role="list">
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
