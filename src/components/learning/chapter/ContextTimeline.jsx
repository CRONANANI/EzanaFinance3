'use client';

export function ContextTimeline({ title, events = [], position = 'right' }) {
  return (
    <div className={`lc-edit-timeline lc-edit-timeline--${position}`}>
      {title && <div className="lc-edit-timeline-title">{title}</div>}
      <ol className="lc-edit-timeline-list">
        {events.map((e, i) => (
          <li key={i} className="lc-edit-timeline-item">
            <span className="lc-edit-timeline-year">{e.year}</span>
            <div className="lc-edit-timeline-body">
              <div className="lc-edit-timeline-label">{e.label}</div>
              {e.detail && <div className="lc-edit-timeline-detail">{e.detail}</div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
