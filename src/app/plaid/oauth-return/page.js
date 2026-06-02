'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '@/lib/supabase-browser';

const LINK_TOKEN_KEY = 'plaid_link_token';

function clearStoredLinkToken() {
  try {
    localStorage.removeItem(LINK_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export default function PlaidOAuthReturnPage() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState(null);
  const [status, setStatus] = useState('Finishing brokerage connection…');
  const [error, setError] = useState(null);
  const [redirectUri, setRedirectUri] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LINK_TOKEN_KEY);
      if (!stored) {
        setError('Missing link session. Please try connecting again from home.');
        return;
      }
      setLinkToken(stored);
      setRedirectUri(window.location.href);
    } catch {
      setError('Could not restore link session. Please try connecting again.');
    }
  }, []);

  const exchangePublicToken = useCallback(
    async (public_token, metadata) => {
      setStatus('Syncing your brokerage…');
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('Please sign in to finish connecting.');
          return;
        }

        const response = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ public_token, metadata }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 409 && data.code === 'cross_provider_conflict') {
          clearStoredLinkToken();
          setError(
            'This account is already connected via another provider. Disconnect that one in Settings before switching.',
          );
          return;
        }

        if (!response.ok) {
          throw new Error(data.details || data.error || 'Failed to connect account');
        }

        clearStoredLinkToken();
        setStatus('Connected! Redirecting…');
        setTimeout(() => router.replace('/home?connected=1'), 700);
      } catch (e) {
        clearStoredLinkToken();
        setError(e?.message || 'Something went wrong connecting your brokerage.');
      }
    },
    [router],
  );

  const handleOnExit = useCallback(
    (err) => {
      clearStoredLinkToken();
      if (err) {
        setError('Connection was cancelled or failed. Please try again from home.');
      } else {
        router.replace('/home');
      }
    },
    [router],
  );

  const config = {
    token: linkToken,
    receivedRedirectUri: redirectUri,
    onSuccess: exchangePublicToken,
    onExit: handleOnExit,
  };

  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    if (ready && linkToken && redirectUri && !error) {
      open();
    }
  }, [ready, linkToken, redirectUri, error, open]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 600 }}>{error ? 'Connection error' : status}</div>
      {error ? (
        <>
          <p style={{ color: 'var(--bs-text-label)' }}>{error}</p>
          <button type="button" onClick={() => router.replace('/home')} style={{ marginTop: 8 }}>
            Back to home
          </button>
        </>
      ) : null}
    </div>
  );
}
