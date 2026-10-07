'use client';

/**
 * /ezana-api/claim?token=...  One-time claim of an approved API key. The key
 * is generated on claim and shown exactly once.
 */
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import '../ezana-api-claim.css';

function Claim() {
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState('checking'); // checking | valid | used | expired | invalid | claimed | error
  const [info, setInfo] = useState(null);
  const [key, setKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    fetch(`/api/ezana-api/claim?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setState(d.state || 'invalid');
        setInfo(d);
      })
      .catch(() => setState('error'));
  }, [token]);

  const claim = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ezana-api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.key) {
        setError(d.error || 'This claim link is no longer valid.');
        setState('used');
        return;
      }
      setKey(d.key);
      setState('claimed');
      /* Drop the token from the address bar and history. */
      window.history.replaceState(null, '', '/ezana-api/claim');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main id="main-content" className="eac-page">
      <h1 className="eac-title">Claim your Ezana API key</h1>
      {state === 'checking' ? <p className="eac-muted">Checking your link</p> : null}
      {state === 'valid' ? (
        <>
          <p className="eac-muted">
            {info?.name ? `${info.name}. ` : ''}The key is created when you claim it and shown once.
          </p>
          <button type="button" className="eac-btn" onClick={claim} disabled={busy}>
            {busy ? 'Creating your key' : 'Claim key'}
          </button>
        </>
      ) : null}
      {state === 'claimed' ? (
        <>
          <p className="eac-warn">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" /> Store this now. We
            cannot show it again.
          </p>
          <div className="eac-key">
            <code>{key}</code>
            <button type="button" className="eac-copy" onClick={copy}>
              <i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'}`} aria-hidden="true" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="eac-muted">
            Send it as <code>Authorization: Bearer &lt;key&gt;</code> from your server. Never put it
            in a browser or a mobile app. See the{' '}
            <Link href="/ezana-api#quickstart">quickstart</Link>.
          </p>
        </>
      ) : null}
      {state === 'used' ? (
        <p className="eac-muted">
          {error || 'This link was already used. Each claim link works once.'}
        </p>
      ) : null}
      {state === 'expired' ? (
        <p className="eac-muted">
          This link has expired. Reply to the approval email and we will send a new one.
        </p>
      ) : null}
      {state === 'invalid' || state === 'error' ? (
        <p className="eac-muted">
          This claim link is not valid. Check that you opened the whole link from the email.
        </p>
      ) : null}
    </main>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<main className="eac-page" />}>
      <Claim />
    </Suspense>
  );
}
