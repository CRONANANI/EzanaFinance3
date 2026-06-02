'use client';

import Link from 'next/link';

function profileHref(username, userId) {
  if (username) return `/profile/${encodeURIComponent(username)}`;
  return `/profile/${userId}`;
}

export function CopyInbox({ requests = [], onAction }) {
  const pending = requests.filter((r) => r.status === 'pending');

  const handleAction = async (requestId, action) => {
    try {
      const res = await fetch('/api/community/copy-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action }),
      });
      if (res.ok) {
        onAction?.(requestId, action);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="ez-card ledger-card evo-copy-inbox" style={{ marginBottom: 14 }}>
      <div
        className="cardhdr"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Copy requests</span>
        {pending.length > 0 && (
          <span className="ez-pill ez-pill--warn" style={{ fontSize: 10 }}>
            <span className="ez-mono">{pending.length}</span> pending
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>No pending requests.</p>
      ) : (
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
          {pending.map((r) => (
            <li
              key={r.id}
              style={{
                padding: 12,
                background: 'var(--bg-tertiary)',
                borderRadius: 8,
                border: '1px solid var(--border-primary)',
              }}
            >
              <Link
                href={profileHref(r.requester_username, r.requester_id)}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                }}
              >
                {r.requester_name || 'Member'}
              </Link>
              {r.message && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  {r.message}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => handleAction(r.id, 'approve')}
                  className="ez-btn ez-btn--primary"
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(r.id, 'reject')}
                  className="ez-btn ez-btn--secondary"
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
