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

  const bullishPct = Math.round(average);
  const bearishPct = 100 - bullishPct;

  return (
    <div className="echo-sentiment-bar">
      <div className="echo-sentiment-bar-header">
        <h3 className="echo-sentiment-bar-title">Reader sentiment</h3>
        <span className="echo-sentiment-bar-count">
          {count === 0 ? 'No votes yet' : `${count} ${count === 1 ? 'vote' : 'votes'}`}
        </span>
      </div>

      <div className="echo-sentiment-gauge" aria-hidden>
        <div className="echo-sentiment-gauge-bearish" style={{ width: `${bearishPct}%` }} />
        <div className="echo-sentiment-gauge-bullish" style={{ width: `${bullishPct}%` }} />
      </div>
      <div className="echo-sentiment-gauge-labels">
        <span>Bearish {bearishPct}%</span>
        <span>Bullish {bullishPct}%</span>
      </div>

      {isAuthenticated ? (
        <div className="echo-sentiment-submit">
          <label htmlFor={`echo-sentiment-${articleId}`} className="echo-sentiment-submit-label">
            Your take: {draftSentiment >= 50 ? 'Bullish' : 'Bearish'} ({draftSentiment}% bullish)
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
          headline="Share your market sentiment"
          body="Create a free account to vote on whether this article's thesis is bullish or bearish and see how other readers feel."
          onClose={() => setShowAuthPrompt(false)}
          onSignUp={() => router.push(`/auth/signup?redirect=${redirectParam}`)}
          onSignIn={() => router.push(`/auth/signin?redirect=${redirectParam}`)}
        />
      )}
    </div>
  );
}
