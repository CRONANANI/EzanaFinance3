'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, X, MinusCircle, CircleDashed, Users, ShieldAlert } from 'lucide-react';

const MIN_OBJECTION_REASON = 10;

/**
 * CrossDeskPanel — the `cross_desk_review` gate, made legible.
 *
 * Shows the "X of N needed · A approved · O objections" summary, one row per
 * OTHER desk with that desk's PM decision (approve = emerald, object = red with
 * the reason inline), and — when the viewer is an eligible other-desk PM —
 * Approve / Object controls. Object opens a reason textarea (≥10 chars) and the
 * submit stays disabled until the minimum is met. On success we refetch and
 * call onRefresh so the gate panel above re-evaluates.
 *
 * @param {object}   props
 * @param {object}   props.pitch      the pitch (needs id, stage)
 * @param {object}   [props.viewer]   the current member (display only)
 * @param {Function} [props.onRefresh] called after a decision posts
 */
export function CrossDeskPanel({ pitch, viewer, onRefresh }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [objecting, setObjecting] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    if (!pitch?.id) return;
    setLoading(true);
    fetch(`/api/org/pitches/${pitch.id}/cross-desk`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  }, [pitch?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(
    async (decision) => {
      setError(null);
      if (decision === 'object' && reason.trim().length < MIN_OBJECTION_REASON) {
        setError(`An objection needs at least ${MIN_OBJECTION_REASON} characters.`);
        return;
      }
      setBusy(true);
      try {
        const res = await fetch(`/api/org/pitches/${pitch.id}/cross-desk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision,
            reason: decision === 'object' ? reason.trim() : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setState(data);
        setObjecting(false);
        setReason('');
        onRefresh?.();
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    },
    [pitch?.id, reason, onRefresh],
  );

  if (loading && !state) {
    return <div className="pxdesk pxdesk--loading">Loading cross-desk review…</div>;
  }
  if (!state) return null;

  const { summary, desks, viewer: v } = state;
  const anyDecided = desks.some((d) => d.decision);
  const myDecision = v?.decision || null;

  return (
    <section className="pxdesk" aria-label="Cross-desk review">
      <header className="pxdesk-head">
        <div className="pxdesk-title">
          <Users size={14} aria-hidden />
          <span>Cross-Desk Review</span>
        </div>
        <p className="pxdesk-summary">
          <span className="pxdesk-num">{summary.needed}</span>
          <span className="pxdesk-of"> of </span>
          <span className="pxdesk-num">{summary.otherDeskCount}</span> needed
          <span className="pxdesk-dot" aria-hidden>
            ·
          </span>
          <span className="pxdesk-num pxdesk-approved">{summary.approved}</span> approved
          <span className="pxdesk-dot" aria-hidden>
            ·
          </span>
          <span className="pxdesk-num pxdesk-objected">{summary.objections}</span>{' '}
          {summary.objections === 1 ? 'objection' : 'objections'}
        </p>
      </header>

      {!anyDecided ? (
        <div className="pxdesk-empty">
          No desks have weighed in yet. A majority of the other desks’ senior PMs must approve to
          clear this gate.
        </div>
      ) : null}

      <ul className="pxdesk-list">
        {desks.map((d) => (
          <li key={d.team_id} className={`pxdesk-row is-${d.decision || 'pending'}`}>
            <span className="pxdesk-row-ic" aria-hidden>
              {d.decision === 'approve' ? (
                <Check size={14} />
              ) : d.decision === 'object' ? (
                <X size={14} />
              ) : d.decision === 'abstain' ? (
                <MinusCircle size={14} />
              ) : (
                <CircleDashed size={14} />
              )}
            </span>
            <div className="pxdesk-row-main">
              <span className="pxdesk-row-desk">{d.team_name}</span>
              <span className="pxdesk-row-pm">{d.pm_name || 'No senior PM assigned'}</span>
              {d.decision === 'object' && d.reason ? (
                <p className="pxdesk-row-reason">
                  <ShieldAlert size={12} aria-hidden /> {d.reason}
                </p>
              ) : null}
            </div>
            <span className={`pxdesk-badge is-${d.decision || 'pending'}`}>
              {d.decision === 'approve'
                ? 'Approved'
                : d.decision === 'object'
                  ? 'Objected'
                  : d.decision === 'abstain'
                    ? 'Abstained'
                    : 'Pending'}
            </span>
          </li>
        ))}
      </ul>

      {error ? <div className="pxdesk-error">{error}</div> : null}

      {v?.eligible ? (
        <div className="pxdesk-actions">
          {myDecision ? (
            <p className="pxdesk-your-vote">
              You{' '}
              <strong>
                {myDecision === 'approve'
                  ? 'approved'
                  : myDecision === 'object'
                    ? 'objected'
                    : 'abstained'}
              </strong>{' '}
              on this pitch. You may change your decision below.
            </p>
          ) : null}

          {!objecting ? (
            <div className="pxdesk-btns">
              <button
                type="button"
                className="pxdesk-btn pxdesk-btn--approve"
                disabled={busy}
                onClick={() => submit('approve')}
              >
                <Check size={14} aria-hidden /> Approve
              </button>
              <button
                type="button"
                className="pxdesk-btn pxdesk-btn--object"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setObjecting(true);
                }}
              >
                <X size={14} aria-hidden /> Object
              </button>
            </div>
          ) : (
            <div className="pxdesk-object">
              <label className="pxdesk-object-label" htmlFor="pxdesk-reason">
                Objection reason (required, ≥{MIN_OBJECTION_REASON} chars)
              </label>
              <textarea
                id="pxdesk-reason"
                className="pxdesk-object-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why you are objecting to this pitch…"
                aria-describedby="pxdesk-reason-count"
              />
              <div className="pxdesk-object-foot">
                <span id="pxdesk-reason-count" className="pxdesk-object-count pxdesk-num">
                  {reason.trim().length}/{MIN_OBJECTION_REASON}
                </span>
                <div className="pxdesk-object-actions">
                  <button
                    type="button"
                    className="pxdesk-btn pxdesk-btn--ghost"
                    disabled={busy}
                    onClick={() => {
                      setObjecting(false);
                      setReason('');
                      setError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="pxdesk-btn pxdesk-btn--object"
                    disabled={busy || reason.trim().length < MIN_OBJECTION_REASON}
                    onClick={() => submit('object')}
                  >
                    Submit objection
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : v?.is_pitching_desk ? (
        <p className="pxdesk-note">Your desk is pitching — the pitching desk cannot self-review.</p>
      ) : null}
    </section>
  );
}
