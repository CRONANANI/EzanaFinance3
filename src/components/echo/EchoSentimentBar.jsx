'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { SaveAuthPrompt } from '@/components/echo/EchoSaveButton';

export function EchoSentimentBar({ articleId }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [average, setAverage] = useState(50);
  const [count, setCount] = useState(0);
  const [userSentiment, setUserSentiment] = useState(50);
  const [draftSentiment, setDraftSentiment] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const loadAggregate = useCallback(async () => {
    try {
      const res = await fetch(`/api/echo/sentiment/${encodeURIComponent(articleId)}`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      setAverage(typeof data.average === 'number' ? data.average : 50);
      setCount(data.count ?? 0);
      if (typeof data.userSentiment === 'number') {
        setUserSentiment(data.userSentiment);
        setDraftSentiment(data.userSentiment);
      }
    } catch {
      /* ignore */
    }
  }, [articleId]);

  useEffect(() => {
    loadAggregate();
  }, [loadAggregate]);

  const redirectParam = encodeURIComponent(pathname || `/ezana-echo/${articleId}`);

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/echo/sentiment/${encodeURIComponent(articleId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sentiment: draftSentiment }),
      });
      if (res.ok) {
        setUserSentiment(draftSentiment);
        await loadAggregate();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const signalPct = Math.round(average);
  const noisePct = 100 - signalPct;

  return (
    <div className="echo-sentiment-bar">
      <div className="echo-sentiment-bar-header">
        <h3 className="echo-sentiment-bar-title">Reader sentiment</h3>
        <span className="echo-sentiment-bar-count">
          {count === 0 ? 'No votes yet' : `${count} ${count === 1 ? 'vote' : 'votes'}`}
        </span>
      </div>

      <div className="echo-sentiment-gauge" aria-hidden>
        <div className="echo-sentiment-gauge-noise" style={{ width: `${noisePct}%` }} />
        <div className="echo-sentiment-gauge-signal" style={{ width: `${signalPct}%` }} />
      </div>
      <div className="echo-sentiment-gauge-labels">
        <span>Noise {noisePct}%</span>
        <span>Signal {signalPct}%</span>
      </div>

      {isAuthenticated ? (
        <div className="echo-sentiment-submit">
          <label htmlFor={`echo-sentiment-${articleId}`} className="echo-sentiment-submit-label">
            Your take: {draftSentiment >= 50 ? 'Signal' : 'Noise'} ({draftSentiment}% signal)
          </label>
          <input
            id={`echo-sentiment-${articleId}`}
            type="range"
            min={0}
            max={100}
            value={draftSentiment}
            onChange={(e) => setDraftSentiment(Number(e.target.value))}
            className="echo-sentiment-slider"
          />
          <button
            type="button"
            className="echo-sentiment-submit-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? 'Saving…'
              : userSentiment === draftSentiment
                ? 'Update sentiment'
                : 'Submit sentiment'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="echo-sentiment-gate-btn"
          onClick={() => setShowAuthPrompt(true)}
        >
          Sign in to share your sentiment
        </button>
      )}

      {showAuthPrompt && (
        <SaveAuthPrompt
          icon="bi-bar-chart-fill"
          headline="Share your read on this article"
          body="Create a free account to flag whether this article's thesis reads as signal or noise — and see how other readers weighed in."
          onClose={() => setShowAuthPrompt(false)}
          onSignUp={() => router.push(`/auth/signup?redirect=${redirectParam}`)}
          onSignIn={() => router.push(`/auth/signin?redirect=${redirectParam}`)}
        />
      )}
    </div>
  );
}
