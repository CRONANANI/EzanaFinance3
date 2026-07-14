'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  X,
  CircleDashed,
  Calculator,
  MessageSquareText,
  ShieldCheck,
  Info,
} from 'lucide-react';

/**
 * SignoffPanel (spec §5.2) — screening-stage sign-off record.
 *
 * Shows every eligible desk member (Senior Analyst tier and above) and their
 * model / qualitative sign-off state, a "N of M" progress toward the desk's
 * `min_senior_signoffs`, and — for the current viewer, if eligible — Approve
 * (model), Approve (qualitative), and Request changes buttons. Every mutation
 * POSTs then calls `onRefresh` so the header gate panel re-evaluates.
 *
 * Eligibility is rendered here but ENFORCED server-side: a junior analyst sees
 * no buttons, and the API rejects them even if they forge the request.
 *
 * @param {object}   props
 * @param {object}   props.pitch      needs { id }
 * @param {object}   props.viewer     { id, role, tier, team_id }
 * @param {Function} [props.onRefresh] called after a successful sign-off
 */
export function SignoffPanel({ pitch, viewer, onRefresh }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // scope|action currently posting
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');

  const load = useCallback(() => {
    if (!pitch?.id) return;
    setLoading(true);
    fetch(`/api/org/pitches/${pitch.id}/signoff`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  }, [pitch?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (scope, decision) => {
    setError(null);
    setBusy(`${scope}:${decision}`);
    try {
      const res = await fetch(`/api/org/pitches/${pitch.id}/signoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, decision, comment: comment.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setComment('');
      load();
      onRefresh?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading && !state) {
    return <div className="pspanel psignoff psignoff--loading">Loading sign-offs…</div>;
  }
  if (!state) {
    return <div className="pspanel psignoff psignoff--empty">Sign-off record unavailable.</div>;
  }

  const { members = [], required = 0, approvedCount = 0, inDeskApproved = 0, gatePass } = state;
  const eligible = state.viewer?.eligible;
  const viewerRow = members.find((m) => m.member_id === (viewer?.id || state.viewer?.id));
  const pct = required > 0 ? Math.min(100, Math.round((approvedCount / required) * 100)) : 0;

  const ScopeState = ({ entry, label, Icon }) => {
    let status = 'pending';
    if (entry?.decision === 'approve') status = 'approve';
    else if (entry?.decision === 'request_changes') status = 'changes';
    return (
      <span className={`psignoff-scope ${status}`} title={entry?.comment || label}>
        <Icon size={12} aria-hidden />
        {status === 'approve' ? (
          <Check size={12} aria-hidden />
        ) : status === 'changes' ? (
          <X size={12} aria-hidden />
        ) : (
          <CircleDashed size={12} aria-hidden />
        )}
        <span className="psignoff-scope-label">{label}</span>
      </span>
    );
  };

  return (
    <section className="pspanel psignoff" aria-label="Screening sign-offs">
      <header className="psignoff-head">
        <div className="psignoff-title">
          <ShieldCheck size={15} aria-hidden />
          <span>Sign-offs</span>
        </div>
        <div className="psignoff-progress-wrap">
          <span className="psignoff-count psignoff-num">
            {approvedCount} of {required}
          </span>
          <span
            className="psignoff-bar"
            role="progressbar"
            aria-valuenow={approvedCount}
            aria-valuemin={0}
            aria-valuemax={required}
            aria-label="Sign-offs collected"
          >
            <span
              className={`psignoff-bar-fill ${gatePass ? 'done' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </span>
        </div>
      </header>

      <p className="psignoff-hint">
        <Info size={12} aria-hidden />
        ≥1 in-desk sign-off required
        {inDeskApproved >= 1 ? (
          <span className="psignoff-hint-ok"> · {inDeskApproved} in-desk</span>
        ) : (
          <span className="psignoff-hint-warn"> · none in-desk yet</span>
        )}
      </p>

      {members.length === 0 ? (
        <div className="psignoff-empty-rows">No eligible sign-off members on this desk yet.</div>
      ) : (
        <ul className="psignoff-list">
          {members.map((m) => {
            const signed = m.model || m.qualitative;
            const isViewer = m.member_id === (viewer?.id || state.viewer?.id);
            return (
              <li
                key={m.member_id}
                className={`psignoff-row ${signed ? 'has-signed' : 'awaiting'}`}
              >
                <div className="psignoff-who">
                  <span className="psignoff-name">
                    {m.display_name}
                    {isViewer && <span className="psignoff-you"> (you)</span>}
                  </span>
                  <span className="psignoff-meta">
                    {formatTier(m.tier || m.role)}
                    {m.in_desk ? (
                      <span className="psignoff-tag in">in-desk</span>
                    ) : (
                      <span className="psignoff-tag out">other desk</span>
                    )}
                  </span>
                </div>
                <div className="psignoff-scopes">
                  <ScopeState entry={m.model} label="Model" Icon={Calculator} />
                  <ScopeState entry={m.qualitative} label="Qual." Icon={MessageSquareText} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {eligible ? (
        <div className="psignoff-actions">
          <label className="psignoff-comment-label" htmlFor="psignoff-comment">
            Comment (optional — attached to your sign-off)
          </label>
          <textarea
            id="psignoff-comment"
            className="psignoff-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional note on your sign-off…"
            rows={2}
          />
          <div className="psignoff-btns">
            <button
              type="button"
              className="psignoff-btn approve"
              disabled={!!busy}
              onClick={() => submit('model', 'approve')}
            >
              <Calculator size={13} aria-hidden />
              {viewerRow?.model?.decision === 'approve' ? 'Model approved' : 'Approve (model)'}
            </button>
            <button
              type="button"
              className="psignoff-btn approve"
              disabled={!!busy}
              onClick={() => submit('qualitative', 'approve')}
            >
              <MessageSquareText size={13} aria-hidden />
              {viewerRow?.qualitative?.decision === 'approve'
                ? 'Qual. approved'
                : 'Approve (qualitative)'}
            </button>
            <button
              type="button"
              className="psignoff-btn changes"
              disabled={!!busy}
              onClick={() => submit('qualitative', 'request_changes')}
            >
              <X size={13} aria-hidden />
              Request changes
            </button>
          </div>
          {error && <div className="psignoff-error">{error}</div>}
        </div>
      ) : (
        <p className="psignoff-noteligible">Sign-off requires Senior Analyst tier or above.</p>
      )}
    </section>
  );
}

function formatTier(tier) {
  if (!tier) return 'Member';
  return tier
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
