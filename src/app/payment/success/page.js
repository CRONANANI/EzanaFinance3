'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <h1>Payment Successful!</h1>
      <p>Thank you for subscribing to Ezana Finance. Your account has been upgraded.</p>
      {sessionId && (
        <p style={{ fontSize: '0.85rem', color: '#888' }}>Session: {sessionId}</p>
      )}
      <button
        type="button"
        onClick={() => router.push('/home-dashboard')}
        style={{ marginTop: '2rem', padding: '12px 32px', cursor: 'pointer' }}
      >
        Go to Dashboard
      </button>
    </div>
  );
}
