'use client';

import { useState } from 'react';

export function EchoFooterMoreFrom({ author }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const initial = author?.initial || (author?.name ? author.name.charAt(0).toUpperCase() : 'E');
  const firstName = author?.name ? author.name.split(' ')[0] : 'the team';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, step: 'email' }),
      });
      if (res.ok) {
        setSubmitted(true);
        setEmail('');
      }
    } catch {
      /* ignore */
    }
    setSubmitting(false);
  };

  return (
    <section className="echo-footer-more-from">
      <div className="echo-more-avatar" aria-hidden>
        {initial}
      </div>
      <div>
        <h4 className="echo-more-heading">More from {firstName}, every Friday and Monday.</h4>
        <p className="echo-more-body">
          The Ezana Echo. One markets read, written for people who&apos;d rather skip the noise.
          Unsubscribe anytime.
        </p>

        {submitted ? (
          <p className="echo-more-body" style={{ color: 'var(--echo-accent)' }}>
            <i className="bi bi-check2" aria-hidden /> You&apos;re in. Check your inbox to confirm.
          </p>
        ) : (
          <form className="echo-more-form" onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="echo-more-input"
              required
              aria-label="Email address for newsletter subscription"
            />
            <button type="submit" className="echo-more-subscribe-btn" disabled={submitting}>
              Subscribe <i className="bi bi-arrow-right" aria-hidden />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
