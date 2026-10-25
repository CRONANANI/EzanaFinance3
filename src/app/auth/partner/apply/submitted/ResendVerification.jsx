'use client';

import { useState } from 'react';

/** Ask for a fresh verification link (POST /api/partner-application/resend). */
export default function ResendVerification() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState('sending');
    try {
      const res = await fetch('/api/partner-application/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || 'Could not request a new link. Try again shortly.');
      setState('sent');
      setMessage(data.message);
    } catch (err) {
      setState('error');
      setMessage(err.message);
    }
  };

  return (
    <form
      className="partner-form-step"
      onSubmit={submit}
      style={{ maxWidth: '380px', margin: '1.5rem auto 0', textAlign: 'left' }}
    >
      <label htmlFor="partner-resend-email">Send a new link</label>
      <input
        id="partner-resend-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <button
        type="submit"
        className="partner-apply-btn"
        disabled={state === 'sending'}
        style={{ marginTop: '0.75rem', border: 'none', cursor: 'pointer' }}
      >
        {state === 'sending' ? 'Sending...' : 'Resend verification email'}
      </button>
      {message && (
        <p
          role={state === 'error' ? 'alert' : 'status'}
          className={state === 'error' ? 'partner-form-error' : undefined}
          style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}
        >
          {message}
        </p>
      )}
    </form>
  );
}
