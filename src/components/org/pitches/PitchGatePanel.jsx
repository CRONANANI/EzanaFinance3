'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, CircleDashed, X, ChevronRight, ShieldAlert } from 'lucide-react';

/**
 * The Gate Panel — "this panel is the product". It tells the user exactly what
 * is blocking advancement and where to fix it. Data comes from the server-side
 * gate engine (GET .../gates); advancing goes through POST .../advance, which
 * recomputes every gate again server-side.
 *
 * @param {object}   props
 * @param {object}   props.pitch       the pitch (needs id, stage)
 * @param {Function} [props.onSelectTab]  deep-link handler: (tab) => void
 * @param {Function} [props.onAdvanced]   called with the updated pitch
 */
export function PitchGatePanel({ pitch, onSelectTab, onAdvanced }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [overriding, setOverriding] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    if (!pitch?.id) return;
    setLoading(true);
    fetch(`/api/org/pitches/${pitch.id}/gates`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  }, [pitch?.id, pitch?.stage]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !state) return <div className="pgate pgate--loading">Checking gates…</div>;
  if (!state || !state.nextStage) return null; // terminal stage or no config → nothing to advance

  const { gates, passedCount, total, allPass, nextStageLabel, canAdvance, canOverride } = state;
  const failing = total - passedCount;

  const advance = async (withOverride) => {
    setError(null);
    if (withOverride && reason.trim().length < 20) {
      setError('Override reason must be at least 20 characters.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/org/pitches/${pitch.id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          withOverride ? { override: true, override_reason: reason.trim() } : {},
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setOverriding(false);
      setReason('');
      onAdvanced?.(data.pitch);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const StatusIcon = ({ status }) =>
    status === 'pass' ? (
      <Check size={14} className="pgate-ic pass" aria-hidden />
    ) : status === 'partial' ? (
      <CircleDashed size={14} className="pgate-ic partial" aria-hidden />
    ) : (
      <X size={14} className="pgate-ic fail" aria-hidden />
    );

  return (
    <section className="pgate" aria-label="Advancement gates">
      <header className="pgate-head">
        <span className="pgate-count ot-num">
          {passedCount} of {total}
        </span>
        <span className="pgate-count-label">gates passed</span>
      </header>

      <ul className="pgate-list">
        {gates.map((g) => (
          <li key={g.id} className={`pgate-row ${g.status}`}>
            <StatusIcon status={g.status} />
            <span className="pgate-row-label">{g.label}</span>
            <span className="pgate-row-detail ot-num">{g.detail}</span>
            {g.status !== 'pass' && g.action?.tab && onSelectTab && (
              <button type="button" className="pgate-fix" onClick={() => onSelectTab(g.action.tab)}>
                Fix <ChevronRight size={12} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      {error && <div className="pgate-error">{error}</div>}

      <div className="pgate-foot">
        {!overriding ? (
          <>
            <button
              type="button"
              className="pgate-advance"
              disabled={busy || !canAdvance || !allPass}
              onClick={() => advance(false)}
            >
              {allPass ? (
                <>
                  Advance to {nextStageLabel} <ArrowRight size={14} aria-hidden />
                </>
              ) : (
                `${failing} gate${failing === 1 ? '' : 's'} failing`
              )}
            </button>
            {!allPass && canOverride && (
              <button
                type="button"
                className="pgate-override-btn"
                disabled={busy}
                onClick={() => setOverriding(true)}
              >
                <ShieldAlert size={13} aria-hidden /> Override
              </button>
            )}
          </>
        ) : (
          <div className="pgate-override">
            <label className="pgate-override-label" htmlFor="pgate-reason">
              Override reason (required, ≥20 chars) — recorded on the transition
            </label>
            <textarea
              id="pgate-reason"
              className="pgate-override-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why you are advancing past a failing gate…"
            />
            <div className="pgate-override-actions">
              <button
                type="button"
                className="pgate-override-cancel"
                onClick={() => setOverriding(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pgate-advance"
                disabled={busy || reason.trim().length < 20}
                onClick={() => advance(true)}
              >
                Override &amp; advance
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
