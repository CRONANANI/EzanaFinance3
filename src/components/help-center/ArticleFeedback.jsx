'use client';

import { useId, useState } from 'react';

const MAX_COMMENT = 300;

/* Nov 23 2026 (Help Center audit): a "No" can say why, so the team can see
   which articles have steps that fail, unclear wording, outdated details or
   gaps. Stored as a short prefix on the existing comment (no schema change). */
const DOWN_REASONS = [
  { key: 'steps', label: "Steps didn't work" },
  { key: 'unclear', label: 'Instructions were unclear' },
  { key: 'outdated', label: 'Information is outdated' },
  { key: 'missing', label: "My problem isn't covered" },
];

/**
 * "Was this article helpful?": Yes / No plus an optional 300-char comment.
 * Used on both user and partner help articles. POSTs to the feedback API;
 * degrades gracefully (never blocks the page) and prevents double-submits.
 *
 * Flat by design (branding guide, sections 4 and 6): the choices are text
 * buttons, emerald when selected, and the comment field has no box around
 * it. The chosen thumb also switches to its filled glyph, so the selection
 * is not signalled by colour alone.
 */
export default function ArticleFeedback({ section, articleSlug }) {
  const [rating, setRating] = useState(null); // 'up' | 'down' | null
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const textareaId = useId();
  const counterId = useId();

  const choose = (value) => {
    if (status === 'done' || status === 'sending') return;
    setRating(value);
    if (status === 'error') setStatus('idle');
  };

  const submit = async () => {
    if (!rating || status === 'sending' || status === 'done') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/help-center/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          articleSlug,
          rating,
          comment: (rating === 'down' && reason
            ? `[${DOWN_REASONS.find((r) => r.key === reason)?.label}] ${comment.trim()}`
            : comment.trim()
          )
            .trim()
            .slice(0, MAX_COMMENT),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) setStatus('done');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="hc-feedback">
        <p className="hc-feedback-thanks" role="status">
          <i className="bi bi-check-lg" aria-hidden="true" />
          Thanks for your feedback.
        </p>
      </div>
    );
  }

  return (
    <div className="hc-feedback">
      <div className="hc-feedback-ask">
        <p className="hc-feedback-question">Was this article helpful?</p>
        <div className="hc-feedback-choices">
          <button
            type="button"
            className="hc-feedback-choice"
            aria-label="This article was helpful"
            aria-pressed={rating === 'up'}
            onClick={() => choose('up')}
          >
            <i
              className={`bi ${rating === 'up' ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}`}
              aria-hidden="true"
            />
            Yes
          </button>
          <button
            type="button"
            className="hc-feedback-choice"
            aria-label="This article was not helpful"
            aria-pressed={rating === 'down'}
            onClick={() => choose('down')}
          >
            <i
              className={`bi ${
                rating === 'down' ? 'bi-hand-thumbs-down-fill' : 'bi-hand-thumbs-down'
              }`}
              aria-hidden="true"
            />
            No
          </button>
        </div>
      </div>

      {rating === 'down' && (
        <div className="hc-feedback-reasons" role="group" aria-label="What went wrong?">
          <p className="hc-feedback-label">What went wrong? (optional)</p>
          <div className="hc-feedback-choices">
            {DOWN_REASONS.map((r) => (
              <button
                key={r.key}
                type="button"
                className="hc-feedback-choice"
                aria-pressed={reason === r.key}
                onClick={() => setReason((v) => (v === r.key ? null : r.key))}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {rating && (
        <div className="hc-feedback-form">
          <label htmlFor={textareaId} className="hc-feedback-label">
            Anything else? (optional)
          </label>
          <textarea
            id={textareaId}
            className="hc-feedback-input"
            rows={3}
            maxLength={MAX_COMMENT - 40}
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT - 40))}
            placeholder={
              rating === 'down'
                ? 'Which step failed, or what were you trying to do? Do not include passwords or codes.'
                : 'Tell us what worked…'
            }
            aria-describedby={counterId}
          />
          <div className="hc-feedback-actions">
            <span id={counterId} className="hc-feedback-count" aria-live="polite">
              {comment.length}/{MAX_COMMENT - 40}
            </span>
            {status === 'error' && (
              <span className="hc-feedback-error" role="alert">
                Couldn&apos;t save. Try again.
              </span>
            )}
            <button
              type="button"
              className="hc-feedback-submit"
              onClick={submit}
              disabled={status === 'sending'}
            >
              {status === 'sending' ? 'Sending…' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
