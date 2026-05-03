'use client';

import { useState, useMemo, useEffect } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { supabase } from '@/lib/supabase';

const ATTACHMENT_ICONS = {
  news_event: 'bi-newspaper',
  chart: 'bi-graph-up',
  earnings_analysis: 'bi-bar-chart-line',
  model: 'bi-calculator',
  watchlist_ticker: 'bi-eye',
  position_flag: 'bi-flag',
  isr_event: 'bi-broadcast',
  document: 'bi-file-earmark',
};

export function OrgSendToTeamModal({ onClose, attachment, preSelectedRecipient }) {
  const { orgData, hasPermission } = useOrg();
  const [recipientId, setRecipientId] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [peers, setPeers] = useState([]);

  useEffect(() => {
    if (preSelectedRecipient) setRecipientId(preSelectedRecipient);
  }, [preSelectedRecipient]);

  useEffect(() => {
    if (!orgData?.org?.id || !orgData?.member?.id) return undefined;
    let cancelled = false;
    (async () => {
      const { data, error: qErr } = await supabase
        .from('org_members')
        .select('id, display_name, role, sub_role, team_id')
        .eq('org_id', orgData.org.id)
        .eq('is_active', true)
        .order('display_name');
      if (cancelled || qErr) return;
      setPeers((data || []).filter((p) => p.id !== orgData.member.id));
    })();
    return () => { cancelled = true; };
  }, [orgData?.org?.id, orgData?.member?.id]);

  const filteredMembers = useMemo(() => {
    if (!searchFilter.trim()) return peers;
    const q = searchFilter.toLowerCase();
    return peers.filter((m) => {
      const name = (m.display_name || '').toLowerCase();
      const sr = (m.sub_role || '').toLowerCase();
      const role = (m.role || '').toLowerCase().replace('_', ' ');
      return name.includes(q) || sr.includes(q) || role.includes(q);
    });
  }, [peers, searchFilter]);

  const handleSend = async () => {
    if (!recipientId) {
      setError('Select a recipient.');
      return;
    }
    if (!note.trim() && !attachment) {
      setError('Add a note or attach content.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/org/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_member_id: recipientId,
          subject: attachment?.label || 'Message',
          body: note,
          attachment_kind: attachment?.kind || null,
          attachment_ref: attachment?.ref || null,
          attachment_label: attachment?.label || null,
          attachment_meta: attachment?.meta || {},
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (e) {
      setError(e.message);
      setSending(false);
    }
  };

  if (!hasPermission('send_to_team')) {
    return (
      <div className="ot-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="ot-modal" style={{ maxWidth: 420 }}>
          <div className="ot-modal-header">
            <h2 className="ot-modal-title">Permission Required</h2>
            <button type="button" className="ot-modal-close" onClick={onClose} aria-label="Close">
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <p style={{ color: '#8b949e', fontSize: '0.825rem' }}>
            You don&apos;t have the &quot;Send to Team&quot; permission. Ask your portfolio manager or executive to
            enable it in settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ot-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ot-modal" style={{ maxWidth: 560 }}>
        <div className="ot-modal-header">
          <h2 className="ot-modal-title">
            <i className="bi bi-send" style={{ marginRight: '0.5rem', color: '#6366f1' }} />
            Send to Team Member
          </h2>
          <button type="button" className="ot-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {success ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#10b981' }}>
            <i className="bi bi-check-circle" style={{ fontSize: '2.5rem' }} />
            <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Sent!</p>
          </div>
        ) : (
          <>
            {attachment && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(99, 102, 241, 0.06)',
                  border: '1px solid rgba(99, 102, 241, 0.15)',
                  borderRadius: 8,
                  marginBottom: '1rem',
                }}
              >
                <i
                  className={`bi ${ATTACHMENT_ICONS[attachment.kind] || 'bi-paperclip'}`}
                  style={{ color: '#6366f1', fontSize: '1.1rem' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.825rem',
                      color: '#f0f6fc',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {attachment.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: '#8b949e',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {(attachment.kind || '').replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
            )}

            <div className="ot-form-group">
              <span className="ot-form-label">Recipient</span>
              <input
                className="ot-form-input"
                placeholder="Search members…"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              <div
                style={{
                  maxHeight: 200,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                }}
              >
                {filteredMembers.map((m) => {
                  const label = m.display_name || 'Member';
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRecipientId(m.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        border:
                          recipientId === m.id
                            ? '1px solid #6366f1'
                            : '1px solid rgba(255,255,255,0.06)',
                        background:
                          recipientId === m.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: 'rgba(99,102,241,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: '#6366f1',
                        }}
                      >
                        {label.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f0f6fc' }}>{label}</div>
                        <div style={{ fontSize: '0.625rem', color: '#8b949e' }}>
                          {m.sub_role || m.role?.replace('_', ' ')}
                        </div>
                      </div>
                      {recipientId === m.id && <i className="bi bi-check-circle-fill" style={{ color: '#6366f1' }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ot-form-group">
              <span className="ot-form-label">Add a note</span>
              <textarea
                className="ot-form-textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any context or action items for the recipient…"
                style={{ minHeight: 80 }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#ef4444',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem',
                }}
              >
                {error}
              </div>
            )}

            <div className="ot-modal-footer">
              <button type="button" className="ot-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="ot-btn-primary" onClick={handleSend} disabled={sending || !recipientId}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
