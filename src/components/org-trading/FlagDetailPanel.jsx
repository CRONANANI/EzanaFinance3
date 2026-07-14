'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, CheckCheck, ShieldAlert, X } from 'lucide-react';
import { MOCK_MEMBERS } from '@/lib/orgMockData';
import { actionLabel, reasonLabel } from '@/lib/org-flag-taxonomy';

function nameFromMockOrRow(row, id) {
  if (row?.display_name) return row.display_name;
  const m = MOCK_MEMBERS.find((x) => x.id === id);
  return m?.name || 'Member';
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const STATUS_PILL = {
  open: 'Awaiting response',
  accepted: 'Accepted',
  acknowledged: 'Acknowledged',
  rejected: 'Rejected',
  escalated: 'Escalated to IC',
  resolved: 'Resolved',
  expired: 'Expired',
};

export function FlagDetailPanel({ flagId, currentMemberId, onClose, onChange }) {
  const [flag, setFlag] = useState(null);
  const [reply, setReply] = useState('');
  const [rebuttal, setRebuttal] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
  const isRoutedRecipient =
    flag.recipient_member_id === currentMemberId || flag.sector_head_member_id === currentMemberId;
  const isOpen = flag.status === 'open';

  // Response-due countdown — amber when under 6 hours.
  let dueLabel = null;
  let dueUrgent = false;
  if (flag.response_due_at && isOpen) {
    const hrs = (new Date(flag.response_due_at).getTime() - Date.now()) / 3600000;
    dueUrgent = hrs < 6;
    dueLabel = hrs <= 0 ? 'overdue' : hrs < 1 ? '<1h' : `${Math.round(hrs)}h`;
  }

  const respond = async (response, rebuttalText = null) => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/org-trading/flags/${flagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, rebuttal_text: rebuttalText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setRejecting(false);
      setRebuttal('');
      load();
      onChange?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
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
          <div className="ot-flag-detail-toprow">
            <span className={`ot-position-flag-existing ${flag.flag_color}`}>
              {flag.flag_color === 'green' ? 'Green' : 'Red'} Flag
            </span>
            <span className="ot-ticker-chip ot-num">{flag.ticker}</span>
            <span className={`ot-status-pill status-${flag.status}`}>
              {(STATUS_PILL[flag.status] || flag.status).toUpperCase()}
            </span>
          </div>
          <p className="ot-dossier-muted" style={{ margin: '0.5rem 0 0' }}>
            Raised by {raiserName}
            {flag.conviction ? ` · ${flag.conviction} conviction` : ''} · {timeAgo(flag.created_at)}
          </p>
        </div>
        <button type="button" className="ot-modal-close" aria-label="Close" onClick={onClose}>
          <X size={18} aria-hidden />
        </button>
      </div>

      {(flag.reason || flag.suggested_action) && (
        <p className="ot-flag-reasonline">
          {flag.reason ? `Reason: ${reasonLabel(flag.reason)}` : ''}
          {flag.suggested_action ? ` → Suggested: ${actionLabel(flag.suggested_action)}` : ''}
        </p>
      )}

      {flag.conflict_disclosed && (
        <div className="ot-banner amber" style={{ marginBottom: '0.75rem' }}>
          <AlertTriangle size={13} aria-hidden />
          <span>The raiser disclosed a personal holding in {flag.ticker}.</span>
        </div>
      )}

      <p className="ot-flag-detail-body">{flag.body}</p>

      {flag.thesis_snapshot && (
        <p className="ot-dossier-thesis-text" style={{ marginTop: 0 }}>
          Thesis challenged: “{flag.thesis_snapshot}”
        </p>
      )}

      {(flag.evidence?.length > 0 || flag.attachments?.length > 0) && (
        <div className="ot-form-group">
          <span className="ot-form-label">Evidence</span>
          <div className="ot-evidence-chips">
            {(flag.evidence || []).map((e) => (
              <span key={e.id} className="ot-evidence-chip">
                {e.type}
                {e.caption ? ` · ${e.caption}` : ''}
              </span>
            ))}
            {(flag.attachments || []).map((a) => (
              <span key={a.id} className="ot-evidence-chip">
                {a.attachment_label || a.attachment_kind}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="ot-flag-routeline">
        <span>
          Routed to {nameFromMockOrRow(flag.recipient, flag.recipient_member_id)}
          {flag.sector_head_member_id
            ? ` + ${nameFromMockOrRow(flag.sector_head, flag.sector_head_member_id)}`
            : ''}
        </span>
        {dueLabel && (
          <span className={`ot-due ${dueUrgent ? 'urgent' : ''}`}>Response due in {dueLabel}</span>
        )}
      </div>

      {/* Threaded comments — public within the org. */}
      {flag.messages?.length > 0 && (
        <div className="ot-flag-thread">
          {flag.messages.map((m) => (
            <div key={m.id} className="ot-flag-message">
              <div className="ot-flag-message-author">
                {m.author?.display_name || nameFromMockOrRow(null, m.author_member_id)} ·{' '}
                {new Date(m.created_at).toLocaleString()}
              </div>
              <p className="ot-flag-message-body">{m.body}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="ot-banner red" style={{ marginTop: '0.75rem' }}>
          {error}
        </div>
      )}

      {/* ── Answer path — routed recipients only ── */}
      {isOpen && isRoutedRecipient && (
        <div className="ot-answer-block">
          {!rejecting ? (
            <div className="ot-answer-actions">
              <button
                type="button"
                className="ot-answer-btn accept"
                disabled={submitting}
                onClick={() => respond('accepted')}
              >
                <Check size={14} aria-hidden /> Accept
              </button>
              <button
                type="button"
                className="ot-answer-btn"
                disabled={submitting}
                onClick={() => respond('acknowledged')}
              >
                <CheckCheck size={14} aria-hidden /> Acknowledge
              </button>
              <button
                type="button"
                className="ot-answer-btn reject"
                disabled={submitting}
                onClick={() => setRejecting(true)}
              >
                <X size={14} aria-hidden /> Reject with rebuttal
              </button>
              <button
                type="button"
                className="ot-answer-btn escalate"
                disabled={submitting}
                onClick={() => respond('escalated')}
              >
                <ShieldAlert size={14} aria-hidden /> → IC
              </button>
            </div>
          ) : (
            <div className="ot-form-group">
              <label className="ot-form-label" htmlFor="ot-rebuttal">
                Rebuttal (required) — defend the thesis against this challenge
              </label>
              <textarea
                id="ot-rebuttal"
                className="ot-form-textarea"
                value={rebuttal}
                onChange={(e) => setRebuttal(e.target.value)}
                placeholder="Why the flag is wrong, in writing…"
              />
              <div className="ot-modal-footer">
                <button
                  type="button"
                  className="ot-btn-secondary"
                  onClick={() => setRejecting(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ot-btn-primary ot-cta-red"
                  disabled={submitting || !rebuttal.trim()}
                  onClick={() => respond('rejected', rebuttal.trim())}
                >
                  Submit rejection
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comment box — anyone in the org can add to the thread. */}
      {isOpen && !rejecting && (
        <div className="ot-form-group" style={{ marginTop: '1rem' }}>
          <label className="ot-form-label" htmlFor="ot-flag-reply">
            Comment
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <textarea
              id="ot-flag-reply"
              className="ot-form-textarea"
              style={{ minHeight: 60 }}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Add to the thread…"
            />
            <button
              type="button"
              className="ot-btn-secondary"
              onClick={sendReply}
              disabled={submitting || !reply.trim()}
            >
              Post
            </button>
          </div>
        </div>
      )}

      {!isOpen && (
        <div className={`ot-resolution-note status-${flag.status}`}>
          {STATUS_PILL[flag.status] || flag.status}
          {flag.resolved_at ? ` · ${new Date(flag.resolved_at).toLocaleString()}` : ''}
          {flag.resolution_note && (
            <span className="ot-resolution-text">{flag.resolution_note}</span>
          )}
        </div>
      )}
    </div>
  );
}
