'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export default function ConnectCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Syncing your brokerage…');
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('Please sign in to finish connecting.');
          return;
        }
        const res = await fetch('/api/snaptrade/sync-connections', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error('Sync failed');
        setStatus('Connected! Redirecting…');
        setTimeout(() => router.replace('/home?connected=1'), 700);
      } catch (e) {
        setError(e?.message || 'Something went wrong syncing your brokerage.');
      }
    })();
  }, [router]);

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
