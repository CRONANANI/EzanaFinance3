'use client';

export function EventCalendar({ events = [], onWatchToggle }) {
  const handleToggle = async (event) => {
    const next = !(event.is_watched ?? event.watching);
    try {
      const res = await fetch('/api/community/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id, watch: next }),
      });
      if (res.ok) {
        onWatchToggle?.(event.id, next);
      }
    } catch {
      /* ignore */
    }
  };

  if (!events.length) {
    return (
      <div className="ez-card evo-event-calendar" style={{ padding: 16, marginBottom: 14 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>Events</h3>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>No upcoming events.</p>
      </div>
    );
  }

  return (
    <div className="ez-card evo-event-calendar" style={{ padding: 16, marginBottom: 14 }}>
      <h3
        style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}
      >
        Event calendar
      </h3>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {events.map((ev) => {
          const date = ev.event_at || ev.date || ev.starts_at || ev.when;
          const whenLabel = date
            ? new Date(date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : 'TBD';
          const watching = ev.is_watched ?? ev.watching;
          return (
            <li
              key={ev.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 8,
                border: '1px solid var(--border-secondary)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {ev.label || ev.title || ev.name}
                </div>
                <div
                  className="ez-mono"
                  style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}
                >
                  {whenLabel}
                  {ev.ticker && ` · $${ev.ticker}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(ev)}
                className={watching ? 'ez-btn ez-btn--primary' : 'ez-btn ez-btn--secondary'}
                style={{ padding: '6px 10px', fontSize: 11, flexShrink: 0 }}
                title={watching ? 'Watching' : 'Watch event'}
              >
                <i className={`bi ${watching ? 'bi-bell-fill' : 'bi-bell'}`} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
