'use client';

import { useRouter } from 'next/navigation';

export function TrialExpiredGate() {
  const router = useRouter();

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '80vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#fff' }}>Your free trial has ended</h1>
        <p style={{ color: '#999', marginBottom: '2rem', lineHeight: '1.6' }}>
          Your 7-day free trial is over. Choose a plan to continue accessing Ezana Finance&apos;s market data,
          analytics, and trading tools.
        </p>
        <button
          type="button"
          onClick={() => router.push('/pricing')}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '14px 40px',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Choose a Plan
        </button>
      </div>
    </div>
  );
}
