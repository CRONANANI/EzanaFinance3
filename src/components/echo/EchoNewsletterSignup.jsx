'use client';

import { useState } from 'react';

const TOPIC_OPTIONS = [
  { id: 'markets', label: 'Markets', description: 'Sector rotation, indices, macro' },
  { id: 'technology', label: 'Technology', description: 'AI, semis, cloud, fiber' },
  { id: 'crypto', label: 'Crypto', description: 'BTC, ETH, stablecoins, DeFi' },
  { id: 'policy', label: 'Policy', description: 'Fed, Treasury, regulation, tariffs' },
  { id: 'macro', label: 'Macro', description: 'Inflation, GDP, rates, currencies' },
  { id: 'commodities', label: 'Commodities', description: 'Oil, metals, agriculture' },
];

export function EchoNewsletterSignup() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email');
  const [topics, setTopics] = useState(new Set(['markets']));
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, step: 'email' }),
      });
      if (!res.ok) throw new Error('Subscription failed');
      setStep('topics');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTopicsSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, step: 'topics', topics: Array.from(topics) }),
      });
      setStep('confirmed');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTopic = (id) => {
    const next = new Set(topics);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTopics(next);
  };

  if (step === 'confirmed') {
    return (
      <div className="echo-newsletter echo-newsletter-confirmed">
        <i className="bi bi-check-circle-fill" />
        <h3>You&apos;re subscribed</h3>
        <p>
          We&apos;ll send you the best of Ezana Echo whenever new articles publish on your topics.
        </p>
      </div>
    );
  }

  return (
    <div className="echo-newsletter">
      <h3 className="echo-newsletter-headline">Get Ezana Echo in your inbox</h3>
      <p className="echo-newsletter-subhead">
        New articles delivered as they publish. Choose which topics you want.
      </p>

      {step === 'email' && (
        <form onSubmit={handleEmailSubmit} className="echo-newsletter-form">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="echo-newsletter-input"
          />
          <button type="submit" disabled={submitting} className="echo-newsletter-btn">
            {submitting ? 'Subscribing…' : 'Subscribe'}
          </button>
          {error && <div className="echo-newsletter-error">{error}</div>}
        </form>
      )}

      {step === 'topics' && (
        <div className="echo-newsletter-topics">
          <p className="echo-newsletter-topics-label">Which topics interest you?</p>
          <div className="echo-newsletter-topics-grid">
            {TOPIC_OPTIONS.map((t) => (
              <label
                key={t.id}
                className={`echo-newsletter-topic ${topics.has(t.id) ? 'is-selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={topics.has(t.id)}
                  onChange={() => toggleTopic(t.id)}
                />
                <div className="echo-newsletter-topic-content">
                  <strong>{t.label}</strong>
                  <span>{t.description}</span>
                </div>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={handleTopicsSubmit}
            disabled={submitting || topics.size === 0}
            className="echo-newsletter-btn"
          >
            {submitting ? 'Saving…' : 'Save preferences'}
          </button>
          {error && <div className="echo-newsletter-error">{error}</div>}
        </div>
      )}
    </div>
  );
}
