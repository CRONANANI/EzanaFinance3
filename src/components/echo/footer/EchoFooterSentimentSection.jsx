'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { SaveAuthPrompt } from '@/components/echo/EchoSaveButton';
import { SentimentHistogram } from './SentimentHistogram';
import { SentimentSlider } from './SentimentSlider';
import { SentimentReadout } from './SentimentReadout';

export function EchoFooterSentimentSection({ articleId }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [sentiment, setSentiment] = useState(50);
  const [voted, setVoted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [aggregateSignal, setAggregateSignal] = useState(50);
  const [voteCount, setVoteCount] = useState(0);
  const [distribution, setDistribution] = useState(() => new Array(21).fill(0));
  const [submitting, setSubmitting] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const redirectParam = encodeURIComponent(pathname || `/ezana-echo/${articleId}`);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/echo/sentiment/${encodeURIComponent(articleId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setAggregateSignal(data.average ?? 50);
        setVoteCount(data.count ?? 0);
        if (data.distribution?.length === 21) {
          setDistribution(data.distribution);
        }
        if (data.userSentiment !== null && data.userSentiment !== undefined) {
          setSentiment(data.userSentiment);
          setVoted(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  const refreshAggregate = async () => {
    const refetched = await fetch(`/api/echo/sentiment/${encodeURIComponent(articleId)}`, {
      credentials: 'include',
    });
    if (!refetched.ok) return;
    const data = await refetched.json();
    setAggregateSignal(data.average ?? 50);
    setVoteCount(data.count ?? 0);
    if (data.distribution?.length === 21) setDistribution(data.distribution);
  };

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
        body: JSON.stringify({ sentiment }),
      });
      if (res.ok) {
        setVoted(true);
        await refreshAggregate();
      }
    } catch {
      /* ignore */
    }
    setSubmitting(false);
  };

  const aggregateLabel =
    aggregateSignal >= 60 ? 'signal' : aggregateSignal >= 40 ? 'balanced' : 'noise';

  return (
    <section className="echo-footer-sentiment-hero">
      <div className="echo-footer-sentiment-eyebrow">Reader sentiment</div>
      <h2 className="echo-footer-sentiment-headline">
        The room is reading this as <em>{aggregateLabel}</em>.
      </h2>

      <SentimentHistogram
        distribution={distribution}
        isVoted={voted || voteCount > 0}
        userSentiment={voted ? sentiment : null}
      />

      <SentimentReadout
        isVoted={voted || voteCount > 0}
        aggregateSignal={aggregateSignal}
        voteCount={voteCount}
        userSentiment={voted ? sentiment : null}
      />

      <div className="echo-footer-slider-section">
        <div className="echo-slider-helper">Drag to register where this lands for you.</div>
        <SentimentSlider
          sentiment={sentiment}
          onSentimentChange={(v) => {
            setSentiment(v);
            setHasInteracted(true);
            if (voted) setVoted(false);
          }}
          isVoted={voted}
          hint={!hasInteracted && !voted}
          disabled={false}
        />
        <button
          type="button"
          className={`echo-slider-cast-btn ${voted ? 'is-voted' : ''} ${
            hasInteracted && !voted && !submitting ? 'is-prompt' : ''
          }`}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {voted ? (
            <>
              <i className="bi bi-check2" aria-hidden /> Vote recorded
            </>
          ) : submitting ? (
            'Saving…'
          ) : (
            'Cast vote'
          )}
        </button>
      </div>

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
    </section>
  );
}
