'use client';

import { useEffect, useState } from 'react';
import { MOCK_MEMBERS } from '@/lib/orgMockData';

function nameFromMockOrRow(row, id) {
  if (row?.display_name) return row.display_name;
  const m = MOCK_MEMBERS.find((x) => x.id === id);
  return m?.name || 'Member';
}

function subRoleFromRow(row, id) {
  if (row?.sub_role) return row.sub_role;
  const m = MOCK_MEMBERS.find((x) => x.id === id);
  return m?.sub_role || '';
}

export function FlagDetailPanel({ flagId, currentMemberId, onClose, onChange }) {
  const [flag, setFlag] = useState(null);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    fetch(`/api/org-trading/flags/${flagId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setFlag(d?.flag || null));
  };
  useEffect(() => {
    load();
  }, [flagId]);

  if (!flag) return <div className="ot-flag-detail">Loading…</div>;

  const raiserName = nameFromMockOrRow(flag.raiser, flag.raiser_member_id);
  const recipientName = nameFromMockOrRow(flag.recipient, flag.recipient_member_id);
  const raiserSub = subRoleFromRow(flag.raiser, flag.raiser_member_id);
  const recipientSub = subRoleFromRow(flag.recipient, flag.recipient_member_id);
  const isRecipient = flag.recipient_member_id === currentMemberId;

  const updateStatus = async (status, note = null) => {
    await fetch(`/api/org-trading/flags/${flagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, resolution_note: note }),
    });
    load();
    onChange?.();
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/org-trading/flags/${flagId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply }),
      });
      setReply('');
      load();
      onChange?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ot-flag-detail">
      <div className="ot-flag-detail-header">
        <div>
          <span className={`ot-position-flag-existing ${flag.flag_color}`}>
            <i className="bi bi-flag-fill" />
            {flag.flag_color === 'green' ? 'Green' : 'Red'} Flag
          </span>
          <h2 style={{ margin: '0.5rem 0 0', color: '#f0f6fc', fontSize: '1.1rem' }}>
            {flag.ticker} · {flag.subject}
          </h2>
          <p style={{ fontSize: '0.7rem', color: '#8b949e', margin: '0.25rem 0 0' }}>
            From {raiserName} ({raiserSub}) to {recipientName} ({recipientSub})
          </p>
        </div>
        <button type="button" className="ot-modal-close" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" />
        </button>
      </div>

      <p style={{ fontSize: '0.825rem', color: '#d1d5db', whiteSpace: 'pre-wrap', margin: '1rem 0' }}>
        {flag.body}
      </p>

      {flag.position_shares != null && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 6,
            fontSize: '0.7rem',
            color: '#9ca3af',
            marginBottom: '0.75rem',
          }}
        >
          Position snapshot: {flag.position_shares} shares · avg $
          {Number(flag.position_avg_cost || 0).toFixed(2)} · was $
          {Number(flag.position_current_price || 0).toFixed(2)} at flag time
        </div>
      )}

      {flag.attachments?.length > 0 && (
        <div className="ot-form-group">
          <span className="ot-form-label">Attachments</span>
          <div className="ot-attachment-list">
            {flag.attachments.map((a) => (
              <div key={a.id} className="ot-attachment-item" style={{ cursor: 'default' }}>
                <i className="bi bi-paperclip ot-attachment-icon" />
                <div style={{ flex: 1 }}>
                  <div className="ot-attachment-label">{a.attachment_label}</div>
                  <div className="ot-attachment-kind-pill">{a.attachment_kind.replace('_', ' ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ot-flag-thread">
        {(flag.messages || []).map((m) => {
          const authorName = m.author?.display_name || nameFromMockOrRow(null, m.author_member_id);
          return (
            <div key={m.id} className="ot-flag-message">
              <div className="ot-flag-message-author">
                {authorName} · {new Date(m.created_at).toLocaleString()}
              </div>
              <p className="ot-flag-message-body">{m.body}</p>
            </div>
          );
        })}
      </div>

      {flag.status === 'open' && (
        <>
          <div className="ot-form-group" style={{ marginTop: '1rem' }}>
            <label className="ot-form-label" htmlFor="ot-flag-reply">
              Reply
            </label>
            <textarea
              id="ot-flag-reply"
              className="ot-form-textarea"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Add a comment to the thread…"
            />
          </div>
          <div className="ot-modal-footer">
            <button type="button" className="ot-btn-secondary" onClick={sendReply} disabled={submitting || !reply.trim()}>
              Reply
            </button>
            {isRecipient && (
              <>
                <button type="button" className="ot-btn-secondary" onClick={() => updateStatus('acknowledged')}>
                  Acknowledge
                </button>
                <button type="button" className="ot-btn-primary" onClick={() => updateStatus('resolved', reply || null)}>
                  Resolve
                </button>
              </>
            )}
          </div>
        </>
      )}

      {flag.status !== 'open' && (
        <p
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: 'rgba(16,185,129,0.08)',
            borderLeft: '3px solid #10b981',
            fontSize: '0.75rem',
            color: '#10b981',
          }}
        >
          {flag.status === 'resolved'
            ? 'Resolved'
            : flag.status === 'acknowledged'
              ? 'Acknowledged'
              : 'Escalated'}{' '}
          · {flag.resolved_at ? new Date(flag.resolved_at).toLocaleString() : ''}
          {flag.resolution_note && (
            <span style={{ display: 'block', margin: '0.5rem 0 0', color: '#d1d5db', whiteSpace: 'pre-wrap' }}>
              {flag.resolution_note}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
