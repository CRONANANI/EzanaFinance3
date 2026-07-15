'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, Mail } from 'lucide-react';
import './newsletter-signup.css';

// The EXACT wording shown next to the checkbox. Sent verbatim to the API as
// consent_text so the stored consent record matches what the user actually saw.
const CONSENT_TEXT =
  'Email me Ezana Echo articles and product updates. You can unsubscribe at any time.';

/**
 * Compliant marketing-newsletter signup for the landing footer.
 *
 * - Express consent: the checkbox is UNTICKED by default (a pre-ticked box is
 *   not consent under GDPR Art. 4(11)); submit stays disabled until it's ticked.
 * - Double opt-in: on success we say "check your email to confirm" — we never
 *   claim the address is subscribed yet.
 * - Separate from the waitlist and the Echo list. POSTs to the marketing route.
 */
export function NewsletterSignup({ source = 'landing_footer' }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | submitting | pending | already | error
  const [message, setMessage] = useState('');

  const canSubmit = consent && email.trim().length > 0 && status !== 'submitting';

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('submitting');
    setMessage('');
    try {
      const res = await fetch('/api/newsletter/marketing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          marketing_consent: true,
          consent_text: CONSENT_TEXT,
          source,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
        return;
      }
      if (data.state === 'already_subscribed') {
        setStatus('already');
        setMessage("You're already subscribed.");
      } else {
        setStatus('pending');
        setMessage('Check your email to confirm your subscription.');
        setEmail('');
        setConsent(false);
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  const done = status === 'pending' || status === 'already';

  return (
    <form className="nl-signup" onSubmit={onSubmit} noValidate>
      <div className="nl-signup-row">
        <label htmlFor="nl-signup-email" className="nl-signup-sr">
          Email address
        </label>
        <div className="nl-signup-field">
          <Mail className="nl-signup-field-icon" size={15} aria-hidden />
          <input
            id="nl-signup-email"
            type="email"
            className="nl-signup-input"
            placeholder="you@email.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'submitting'}
            required
          />
        </div>
        <button type="submit" className="nl-signup-btn" disabled={!canSubmit}>
          {status === 'submitting' ? (
            <>
              <Loader2 className="nl-signup-spin" size={14} aria-hidden />
              <span>Subscribing…</span>
            </>
          ) : (
            <span>Subscribe</span>
          )}
        </button>
      </div>

      <label className="nl-signup-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={status === 'submitting'}
        />
        <span>
          {CONSENT_TEXT} Read our{' '}
          <Link href="/privacy-policy" className="nl-signup-link">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <p
        className={`nl-signup-status ${done ? 'is-ok' : ''} ${status === 'error' ? 'is-err' : ''}`}
        aria-live="polite"
      >
        {done && <Check size={13} aria-hidden />}
        {message}
      </p>
    </form>
  );
}
