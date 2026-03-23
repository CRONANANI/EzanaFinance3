'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSuccessClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }
    setStatus('success');
  }, [sessionId]);

  if (status === 'loading') {
    return <p style={{ padding: '2rem' }}>Verifying payment...</p>;
  }
  if (status === 'error') {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Something went wrong — missing session.</p>
        <Link href="/home-dashboard">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '36rem' }}>
      <h1>Payment Successful!</h1>
      <p>Your account is being updated. Thank you for choosing Ezana Finance.</p>
      <button type="button" onClick={() => router.push('/home-dashboard')}>
        Go to Dashboard
      </button>
    </div>
  );
}
