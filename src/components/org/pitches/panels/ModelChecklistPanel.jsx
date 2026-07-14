'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, CircleDashed, Circle, FileUp, ExternalLink, ShieldCheck } from 'lucide-react';

/**
 * ModelChecklistPanel — the deep-dive Deliverables-tab panel that renders the
 * PM-configured required models for a pitch with per-model upload + review
 * state. A model counts toward the `required_models_complete` gate only when it
 * is uploaded AND reviewed (reviewed_at set). Uploading is open to any member;
 * marking reviewed is restricted to PM/exec (server-enforced).
 *
 * @param {object}   props
 * @param {object}   props.pitch      the pitch (needs id)
 * @param {object}   [props.viewer]   { role } — drives the Mark-reviewed affordance
 * @param {Function} [props.onRefresh] called after any write so the parent can
 *                                     re-evaluate gates
 */
const MODEL_LABELS = {
  dcf: 'DCF',
  three_statement: 'Three-Statement',
  comps: 'Comps',
  earnings_analysis: 'Earnings Analysis',
};

function labelFor(type) {
  if (MODEL_LABELS[type]) return MODEL_LABELS[type];
  return String(type || '')
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function ModelChecklistPanel({ pitch, viewer, onRefresh }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(null); // `${type}:upload` | `${type}:review`
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    if (!pitch?.id) return;
    setLoading(true);
    fetch(`/api/org/pitches/${pitch.id}/models`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  }, [pitch?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const post = useCallback(
    async (payload, key) => {
      setError(null);
      setBusy(key);
      try {
        const res = await fetch(`/api/org/pitches/${pitch.id}/models`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setState(data);
        onRefresh?.();
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(null);
      }
    },
    [pitch?.id, onRefresh],
  );

  if (loading && !state) {
    return <div className="pmodel pmodel--loading">Loading required models…</div>;
  }
  if (!state) {
    return <div className="pmodel pmodel--empty">Could not load required models.</div>;
  }

  const { checklist = [], completeCount = 0, requiredCount = 0 } = state;
  // canReview: trust the server flag, fall back to viewer role for first paint.
  const canReview = state.canReview ?? ['portfolio_manager', 'executive'].includes(viewer?.role);

  // Honest-empty: the desk configured no required models.
  if (requiredCount === 0) {
    return (
      <section className="pmodel" aria-label="Required models">
        <header className="pmodel-head">
          <span className="pmodel-title">Required models</span>
        </header>
        <p className="pmodel-empty-note">No required models configured for this desk.</p>
      </section>
    );
  }

  return (
    <section className="pmodel" aria-label="Required models">
      <header className="pmodel-head">
        <span className="pmodel-title">Required models</span>
        <span
          className="pmodel-count ot-num"
          aria-label={`${completeCount} of ${requiredCount} required models complete`}
        >
          {completeCount} of {requiredCount} required
        </span>
      </header>

      {error ? <p className="pmodel-error">{error}</p> : null}

      <ul className="pmodel-list">
        {checklist.map((m) => {
          const uploadKey = `${m.model_type}:upload`;
          const reviewKey = `${m.model_type}:review`;
          const status = m.complete ? 'complete' : m.uploaded ? 'pending' : 'missing';
          const draft = drafts[m.model_type] ?? '';
          return (
            <li key={m.model_type} className={`pmodel-row pmodel-row--${status}`}>
              <div className="pmodel-row-main">
                <span className="pmodel-ic" aria-hidden>
                  {status === 'complete' ? (
                    <Check size={14} className="pmodel-ic-pass" />
                  ) : status === 'pending' ? (
                    <CircleDashed size={14} className="pmodel-ic-partial" />
                  ) : (
                    <Circle size={14} className="pmodel-ic-fail" />
                  )}
                </span>
                <span className="pmodel-name">{labelFor(m.model_type)}</span>
                {m.version ? <span className="pmodel-ver ot-num">v{m.version}</span> : null}
                <span className={`pmodel-state pmodel-state--${status}`}>
                  {status === 'complete'
                    ? 'Reviewed'
                    : status === 'pending'
                      ? 'Uploaded · pending review'
                      : 'Not uploaded'}
                </span>
              </div>

              <div className="pmodel-row-actions">
                {m.uploaded && m.file_url ? (
                  <a
                    className="pmodel-file"
                    href={m.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={12} aria-hidden />
                    <span className="pmodel-file-text">{m.file_url}</span>
                  </a>
                ) : null}

                <div className="pmodel-attach">
                  <input
                    type="text"
                    className="pmodel-input"
                    placeholder={m.uploaded ? 'Replace file URL…' : 'File URL / link…'}
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [m.model_type]: e.target.value }))}
                    disabled={busy === uploadKey}
                    aria-label={`${labelFor(m.model_type)} file URL`}
                  />
                  <button
                    type="button"
                    className="pmodel-btn pmodel-btn--attach"
                    disabled={!draft.trim() || busy === uploadKey}
                    onClick={() => {
                      post({ model_type: m.model_type, file_url: draft.trim() }, uploadKey).then(
                        () => setDrafts((d) => ({ ...d, [m.model_type]: '' })),
                      );
                    }}
                  >
                    <FileUp size={12} aria-hidden />
                    {busy === uploadKey ? 'Attaching…' : 'Attach'}
                  </button>
                </div>

                {canReview && m.uploaded && !m.reviewed ? (
                  <button
                    type="button"
                    className="pmodel-btn pmodel-btn--review"
                    disabled={busy === reviewKey}
                    onClick={() => post({ model_type: m.model_type, reviewed: true }, reviewKey)}
                  >
                    <ShieldCheck size={12} aria-hidden />
                    {busy === reviewKey ? 'Marking…' : 'Mark reviewed'}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
