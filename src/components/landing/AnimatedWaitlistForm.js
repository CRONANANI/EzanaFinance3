'use client';

import { useState } from 'react';

/**
 * Email waitlist form for the landing page hero.
 *
 * Redesigned to be visually clean — single subtle emerald glow on focus,
 * proper width to display "Enter your email for early access..." without clipping,
 * and accessible loading/success/error states.
 *
 * Behavior unchanged: posts to /api/waitlist with referralSource='landing_page'.
 */
export function AnimatedWaitlistForm({ className = '', alignLeft = false }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, referralSource: 'landing_page' }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
      setMessage(
        "Thank you for subscribing to our events newsletter, we will email you when we are ready to onboard you."
      );
      setEmail('');
    } catch (error) {
      console.error('Waitlist submission error:', error);
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  const isDisabled = status === 'loading' || status === 'success';

  return (
    <div
      className={`waitlist-root flex w-full flex-col ${alignLeft ? 'items-start' : 'items-center'} ${className}`}
    >
      <form
        onSubmit={handleSubmit}
        className="waitlist-form group relative w-full"
        noValidate
      >
        {/* Subtle focus glow — replaces the 5 stacked glow layers from the previous design.
            Becomes visible only on focus-within, so it's a quiet decorative touch
            rather than constant motion. */}
        <div
          className="waitlist-glow pointer-events-none absolute -inset-1 rounded-2xl opacity-0 blur-md transition-opacity duration-500 group-focus-within:opacity-100"
          aria-hidden
        />

        {/* The actual input shell */}
        <div className="relative">
          {/* Email icon (left) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="waitlist-icon"
              aria-hidden
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          {/* Input */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email for early access..."
            autoComplete="email"
            aria-label="Email address for early access"
            disabled={isDisabled}
            className="waitlist-input"
          />

          {/* Decorative spinning ring — sized/centered with submit (h-7 w-7, top-1/2 right-2 -translate-y-1/2) */}
          <div
            className="waitlist-submit-ring pointer-events-none absolute h-7 w-7 top-1/2 right-2 z-[1] -translate-y-1/2 overflow-hidden rounded-full"
            aria-hidden
          />
          <button
            type="submit"
            disabled={isDisabled}
            aria-label={
              status === 'loading'
                ? 'Submitting'
                : status === 'success'
                  ? 'Submitted'
                  : 'Submit email for early access'
            }
            className="waitlist-submit absolute top-1/2 right-2 z-[2] flex h-7 w-7 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-emerald-900/50 bg-gradient-to-b from-[#0a2f1f] via-[#0a0f0a] to-[#0d3325] transition-all hover:border-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? (
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : status === 'success' ? (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Status message (success or error) */}
      {message && (
        <p
          className={`mt-3 text-sm ${alignLeft ? 'text-left' : 'text-center'} ${
            status === 'error' ? 'text-red-400' : 'text-emerald-400'
          }`}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}

      {/* Reassurance footer */}
      {status !== 'success' && (
        <p
          className={`mt-3 flex items-center gap-1.5 text-xs text-gray-500 ${
            alignLeft ? '' : 'justify-center'
          }`}
        >
          <svg
            className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
          No spam, ever.
        </p>
      )}
    </div>
  );
}

export default AnimatedWaitlistForm;
