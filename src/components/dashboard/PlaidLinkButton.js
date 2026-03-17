'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '@/lib/supabase';

export function PlaidLinkButton({ onSuccess, className = '' }) {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError('Please sign in to connect brokerage');
          return;
        }

        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to get link token');
        }

        const data = await response.json();
        setLinkToken(data.link_token);
      } catch (err) {
        console.error('Error fetching link token:', err);
        setError('Failed to initialize connection');
      }
    };

    fetchLinkToken();
  }, [getToken]);

  const handleOnSuccess = useCallback(async (public_token, metadata) => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ public_token, metadata }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect account');
      }

      const data = await response.json();

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      console.error('Error exchanging token:', err);
      setError('Failed to connect account. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  const handleOnExit = useCallback((err, metadata) => {
    if (err) {
      console.error('Plaid Link error:', err);
      setError('Connection was cancelled or failed');
    }
  }, []);

  const config = {
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit: handleOnExit,
  };

  const { open, ready } = usePlaidLink(config);

  return (
    <div className="plaid-link-container">
      <button
        onClick={() => open()}
        disabled={!ready || loading}
        className={`connect-brokerage-btn ${className}`}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connect Brokerage
          </>
        )}
      </button>

      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}

export default PlaidLinkButton;
