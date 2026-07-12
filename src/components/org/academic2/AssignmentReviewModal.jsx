'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Send, Check, RotateCcw, Play, Upload, Paperclip, History, Award } from 'lucide-react';
import { typeMeta, STATUS_LABEL, fmtDue } from './AssignmentCard';

function ts(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
function fmtBytes(n) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* Drill-in review: version history, threaded comments, approve/return, rubric. */
export function AssignmentReviewModal({ assignmentId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [rubric, setRubric] = useState({ score: '', max: '', comment: '' });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/assignments/${assignmentId}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not load assignment.');
        return;
      }
      setDetail(data);
      setRubric((r) => ({
        score: data.assignment?.rubric_score ?? r.score,
        max: data.assignment?.rubric_max ?? r.max,
        comment: data.assignment?.rubric_comment ?? r.comment,
      }));
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    await load();
    onChanged?.();
  };

  const patch = async (payload) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/org/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assignmentId, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Action failed.');
        return false;
      }
      await refresh();
      return true;
    } catch {
      setError('Could not connect.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addComment = async () => {
    const body = comment.trim();
    if (!body) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/org/assignments/${assignmentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setComment('');
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const submitVersion = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/org/assignments/${assignmentId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() || null }),
      });
      if (res.ok) {
        setNote('');
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const doReturn = async () => {
    const c = comment.trim();
    if (!c) {
      setError('A comment is required to return for revision.');
      return;
    }
    const ok = await patch({ status: 'returned', comment: c });
    if (ok) setComment('');
  };

  const saveGrade = async () => {
    const payload = { status: 'graded' };
    if (rubric.max !== '') payload.rubric_max = Number(rubric.max);
    if (rubric.score !== '') payload.rubric_score = Number(rubric.score);
    if (rubric.comment) payload.rubric_comment = rubric.comment;
    await patch(payload);
  };

  const a = detail?.assignment;
  const viewer = detail?.viewer || {};
  const { label, Icon } = a ? typeMeta(a.type) : { label: '', Icon: () => null };
  const status = a?.overdue ? 'overdue' : a?.status;

  return (
    <div
      className="asg2-overlay asg2-overlay--center"
      role="dialog"
      aria-modal="true"
      aria-label="Assignment review"
      onClick={onClose}
    >
      <div className="asg2-modal" onClick={(e) => e.stopPropagation()}>
        <div className="asg2-modal-head">
          <div>
            {a && (
              <div className="asg2-card-top" style={{ marginBottom: '0.5rem' }}>
                <span className="asg2-type" data-type={a.type}>
                  <Icon size={12} aria-hidden="true" /> {label}
                </span>
                <span className="asg2-status" data-status={status}>
                  {STATUS_LABEL[status] || status}
                </span>
              </div>
            )}
            <h2 className="asg2-modal-title">{a?.title || 'Assignment'}</h2>
            {a && (
              <div className="asg2-card-meta" style={{ marginTop: '0.4rem' }}>
                <span className="asg2-num">{fmtDue(a.due_date, a.overdue)}</span>
                {a.assignees?.length > 0 && (
                  <span>· {a.assignees.map((x) => x.name).join(', ')}</span>
                )}
              </div>
            )}
          </div>
          <button type="button" className="asg2-icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="asg2-state">Loading…</div>
        ) : !a ? (
          <div className="asg2-state asg2-error">{error || 'Not found.'}</div>
        ) : (
          <div className="asg2-review-grid">
            {a.instructions && (
              <div>
                <p className="asg2-section-label">Instructions</p>
                <p className="asg2-comment-body">{a.instructions}</p>
              </div>
            )}

            {typeof a.progress_pct === 'number' && a.status !== 'assigned' && (
              <div>
                <p className="asg2-section-label">Progress · {a.progress_pct}%</p>
                <div className="asg2-progress">
                  <span style={{ width: `${Math.max(0, Math.min(100, a.progress_pct))}%` }} />
                </div>
              </div>
            )}

            {/* Attachments — metadata only; upload disabled (no bucket). */}
            <div>
              <p className="asg2-section-label">
                <Paperclip
                  size={12}
                  aria-hidden="true"
                  style={{ verticalAlign: '-2px', marginRight: 4 }}
                />
                Attachments
              </p>
              {detail.attachments?.length ? (
                detail.attachments.map((att) => (
                  <div key={att.id} className="asg2-attach-row">
                    <Paperclip size={13} aria-hidden="true" />
                    {att.file_name}
                    <span className="asg2-attach-size asg2-num">{fmtBytes(att.size_bytes)}</span>
                  </div>
                ))
              ) : (
                <div className="asg2-hint">No attachments.</div>
              )}
              <div className="asg2-hint asg2-hint--disabled" style={{ marginTop: '0.4rem' }}>
                <Upload size={13} aria-hidden="true" /> File upload coming soon
              </div>
            </div>

            {/* Version history */}
            <div>
              <p className="asg2-section-label">
                <History
                  size={12}
                  aria-hidden="true"
                  style={{ verticalAlign: '-2px', marginRight: 4 }}
                />
                Version history
              </p>
              {detail.submissions?.length ? (
                <div className="asg2-versions">
                  {detail.submissions.map((s) => (
                    <div key={s.id} className="asg2-version">
                      <span className="asg2-version-badge asg2-num">v{s.version}</span>
                      <span>{s.submitter_name}</span>
                      <span className="asg2-comment-time asg2-num" style={{ marginLeft: 'auto' }}>
                        {ts(s.created_at)}
                      </span>
                      {s.note && (
                        <span style={{ flexBasis: '100%', color: 'var(--text-muted)' }}>
                          {s.note}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="asg2-hint">No submissions yet.</div>
              )}
            </div>

            {/* Review thread */}
            <div>
              <p className="asg2-section-label">Review thread</p>
              {detail.comments?.length ? (
                <div className="asg2-thread">
                  {detail.comments.map((c) => (
                    <div key={c.id} className={`asg2-comment${c.is_return ? ' is-return' : ''}`}>
                      <div className="asg2-comment-head">
                        <span className="asg2-comment-author">{c.author_name}</span>
                        {c.is_return && <span className="asg2-return-flag">Returned</span>}
                        <span className="asg2-comment-time asg2-num" style={{ marginLeft: 'auto' }}>
                          {ts(c.created_at)}
                        </span>
                      </div>
                      <div className="asg2-comment-body">{c.body}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="asg2-hint">No comments yet.</div>
              )}
              <div className="asg2-field" style={{ marginTop: '0.6rem' }}>
                <textarea
                  className="asg2-textarea"
                  style={{ minHeight: 60 }}
                  placeholder="Add a comment, or feedback when returning for revision…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>

            {/* Rubric (managers) */}
            {viewer.canReview && (
              <div>
                <p className="asg2-section-label">
                  <Award
                    size={12}
                    aria-hidden="true"
                    style={{ verticalAlign: '-2px', marginRight: 4 }}
                  />
                  Rubric
                </p>
                <div className="asg2-rubric">
                  <div>
                    <span className="asg2-label">Score</span>
                    <input
                      className="asg2-input asg2-rubric-score asg2-num"
                      inputMode="numeric"
                      value={rubric.score}
                      onChange={(e) =>
                        setRubric((r) => ({ ...r, score: e.target.value.replace(/[^0-9]/g, '') }))
                      }
                    />
                  </div>
                  <span style={{ paddingBottom: '0.6rem', color: 'var(--text-muted)' }}>/</span>
                  <div>
                    <span className="asg2-label">Out of</span>
                    <input
                      className="asg2-input asg2-rubric-score asg2-num"
                      inputMode="numeric"
                      value={rubric.max}
                      onChange={(e) =>
                        setRubric((r) => ({ ...r, max: e.target.value.replace(/[^0-9]/g, '') }))
                      }
                    />
                  </div>
                </div>
                <div className="asg2-field" style={{ marginTop: '0.5rem' }}>
                  <textarea
                    className="asg2-textarea"
                    style={{ minHeight: 50 }}
                    placeholder="Rubric comment (optional)"
                    value={rubric.comment}
                    onChange={(e) => setRubric((r) => ({ ...r, comment: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {error && <div className="asg2-form-error">{error}</div>}

            {/* Actions */}
            <div className="asg2-modal-actions" style={{ flexWrap: 'wrap' }}>
              <button
                type="button"
                className="asg2-btn asg2-btn--ghost"
                onClick={addComment}
                disabled={busy || !comment.trim()}
              >
                <Send size={13} aria-hidden="true" /> Comment
              </button>

              {/* Assignee actions */}
              {viewer.isAssignee && a.status === 'assigned' && (
                <button
                  type="button"
                  className="asg2-btn"
                  onClick={() => patch({ status: 'in_progress' })}
                  disabled={busy}
                >
                  <Play size={13} aria-hidden="true" /> Start
                </button>
              )}
              {viewer.isAssignee && ['in_progress', 'returned'].includes(a.status) && (
                <button
                  type="button"
                  className="asg2-btn asg2-btn--primary"
                  onClick={submitVersion}
                  disabled={busy}
                >
                  <Upload size={13} aria-hidden="true" /> Submit
                </button>
              )}

              {/* Manager actions */}
              {viewer.canReview && a.status === 'submitted' && (
                <button
                  type="button"
                  className="asg2-btn"
                  onClick={() => patch({ status: 'under_review' })}
                  disabled={busy}
                >
                  Start review
                </button>
              )}
              {viewer.canReview && ['submitted', 'under_review'].includes(a.status) && (
                <>
                  <button type="button" className="asg2-btn" onClick={doReturn} disabled={busy}>
                    <RotateCcw size={13} aria-hidden="true" /> Return for revision
                  </button>
                  <button
                    type="button"
                    className="asg2-btn asg2-btn--primary"
                    onClick={() => patch({ status: 'complete' })}
                    disabled={busy}
                  >
                    <Check size={13} aria-hidden="true" /> Approve
                  </button>
                </>
              )}
              {viewer.canReview && ['complete', 'under_review', 'submitted'].includes(a.status) && (
                <button
                  type="button"
                  className="asg2-btn asg2-btn--primary"
                  onClick={saveGrade}
                  disabled={busy}
                >
                  <Award size={13} aria-hidden="true" /> Save grade
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
