'use client';

import { MOCK_MEMBERS } from '@/lib/orgMockData';

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function displayName(memberRow, mockId) {
  if (memberRow?.display_name) return memberRow.display_name;
  const m = MOCK_MEMBERS.find((x) => x.id === mockId);
  return m?.name || 'Unknown';
}

export function FlagInboxList({ flags, selectedFlagId, onSelect, mode }) {
  if (!flags || flags.length === 0) {
    return (
      <div className="ot-inbox-empty">
        <i className="bi bi-flag" style={{ fontSize: '2rem', color: '#374151', marginBottom: '0.5rem' }} />
        <p>
          {mode === 'inbox'
            ? 'No flags addressed to you.'
            : mode === 'sent'
              ? "You haven't raised any flags yet."
              : 'No resolved flags.'}
        </p>
      </div>
    );
  }

  return (
    <div className="ot-inbox-list">
      {flags.map((f) => {
        const raiserName = displayName(f.raiser, f.raiser_member_id);
        const recipientName = displayName(f.recipient, f.recipient_member_id);
        return (
          <button
            type="button"
            key={f.id}
            className={`ot-inbox-item ${f.status === 'open' ? 'unread' : ''}`}
            onClick={() => onSelect(f.id)}
            style={{
              ...(selectedFlagId === f.id ? { borderColor: 'rgba(99,102,241,0.5)' } : {}),
              width: '100%',
              textAlign: 'left',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            <div className={`ot-inbox-item-flag ${f.flag_color}`} />
            <div className="ot-inbox-item-body">
              <div className="ot-inbox-item-meta">
                {f.ticker} · {raiserName} → {recipientName} · {timeAgo(f.created_at)}
                {f.status !== 'open' && (
                  <span style={{ marginLeft: '0.5rem', textTransform: 'uppercase' }}>· {f.status}</span>
                )}
              </div>
              <h3 className="ot-inbox-item-subject">{f.subject}</h3>
              <p className="ot-inbox-item-snippet">{f.body}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
