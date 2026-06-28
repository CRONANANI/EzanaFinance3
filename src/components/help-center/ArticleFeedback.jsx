'use client';

import { useId, useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

const MAX_COMMENT = 300;

/**
 * "Was this article helpful?" — thumbs up/down + an optional 300-char comment.
 * Used on both user and partner help articles. POSTs to the feedback API;
 * degrades gracefully (never blocks the page) and prevents double-submits.
 */
export default function ArticleFeedback({ section, articleSlug }) {
  const [rating, setRating] = useState(null); // 'up' | 'down' | null
  const [comment, setComment] = useState('');
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
          comment: comment.trim().slice(0, MAX_COMMENT),
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
      <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border-primary)' }}>
        <p className="hc-accent text-sm font-medium" role="status">
          Thanks for your feedback!
        </p>
      </div>
    );
  }

  const activeStyle = {
    borderColor: 'var(--emerald)',
    color: 'var(--emerald-text)',
    background: 'var(--emerald-bg)',
  };

  return (
    <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border-primary)' }}>
      <p className="hc-faint mb-4 text-sm">Was this article helpful?</p>

      <div className="flex gap-2">
        <button
          type="button"
          className="hc-btn-ghost inline-flex items-center gap-2 text-sm"
          aria-label="This article was helpful"
          aria-pressed={rating === 'up'}
          onClick={() => choose('up')}
          style={rating === 'up' ? activeStyle : undefined}
        >
          <ThumbsUp className="h-4 w-4" aria-hidden />
          Yes
        </button>
        <button
          type="button"
          className="hc-btn-ghost inline-flex items-center gap-2 text-sm"
          aria-label="This article was not helpful"
          aria-pressed={rating === 'down'}
          onClick={() => choose('down')}
          style={rating === 'down' ? activeStyle : undefined}
        >
          <ThumbsDown className="h-4 w-4" aria-hidden />
          No
        </button>
      </div>

      {rating && (
        <div className="mt-4 max-w-md">
          <label htmlFor={textareaId} className="hc-faint mb-1.5 block text-xs">
            Anything else? (optional)
          </label>
          <textarea
            id={textareaId}
            className="hc-input w-full rounded-md p-2.5 text-sm"
            rows={3}
            maxLength={MAX_COMMENT}
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
            placeholder="Tell us what worked or what was missing…"
            aria-describedby={counterId}
            style={{
              background: 'var(--inset, var(--bg-secondary))',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-body)',
            }}
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span id={counterId} className="hc-faint text-xs lf-mono" aria-live="polite">
              {comment.length}/{MAX_COMMENT}
            </span>
            <div className="flex items-center gap-3">
              {status === 'error' && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--negative, #ef4444)' }}
                  role="alert"
                >
                  Couldn&apos;t save — try again
                </span>
              )}
              <button
                type="button"
                className="hc-btn-primary text-sm"
                onClick={submit}
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
