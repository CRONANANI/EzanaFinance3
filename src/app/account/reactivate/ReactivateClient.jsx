'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export function ReactivateClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');

  const [status, setStatus] = useState(token ? 'idle' : 'invalid');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const reactivate = async () => {
    if (!token) return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/account/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Reactivation failed');
        return;
      }
      setStatus('success');
      setEmail(data.email || '');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Network error');
    }
  };

  return (
    <div className="reactivate-page">
      <div className="reactivate-card">
        {status === 'idle' && (
          <>
            <div className="reactivate-icon-wrap reactivate-icon-wrap--info">
              <i className="bi bi-arrow-counterclockwise" />
            </div>
            <h1>Reactivate your account</h1>
            <p>
              You&apos;re about to cancel your scheduled account deletion. Your data
              will be preserved and your subscription (if any) will resume normally.
            </p>
            <button type="button" className="reactivate-btn" onClick={reactivate} disabled={!token}>
              Reactivate my account
            </button>
            <Link href="/" className="reactivate-link">
              No, I want to keep my account deleted
            </Link>
          </>
        )}

        {status === 'loading' && (
          <>
            <div className="reactivate-spinner" />
            <h1>Reactivating...</h1>
            <p>Just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="reactivate-icon-wrap reactivate-icon-wrap--success">
              <i className="bi bi-check-lg" />
            </div>
            <h1>Welcome back</h1>
            <p>
              {email
                ? `Your account (${email}) has been reactivated. You can sign in normally.`
                : 'Your account has been reactivated. You can sign in normally.'}
            </p>
            <button type="button" className="reactivate-btn" onClick={() => router.push('/auth/signin')}>
              Sign in
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="reactivate-icon-wrap reactivate-icon-wrap--error">
              <i className="bi bi-exclamation-circle" />
            </div>
            <h1>Couldn&apos;t reactivate</h1>
            <p>{message}</p>
            <Link href="/" className="reactivate-link">
              Go to homepage
            </Link>
          </>
        )}

        {status === 'invalid' && (
          <>
            <div className="reactivate-icon-wrap reactivate-icon-wrap--error">
              <i className="bi bi-exclamation-circle" />
            </div>
            <h1>Invalid link</h1>
            <p>
              This reactivation link is missing or malformed. Check your email for the most recent link.
            </p>
            <Link href="/" className="reactivate-link">
              Go to homepage
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
