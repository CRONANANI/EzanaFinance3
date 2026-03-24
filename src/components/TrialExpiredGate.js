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
        <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#fff' }}>Your access period has ended</h1>
        <p style={{ color: '#999', marginBottom: '2rem', lineHeight: '1.6' }}>
          Start a 7-day free trial with a plan to continue using Ezana Finance&apos;s market data, analytics, and
          trading tools. You won&apos;t be charged until the trial ends.
        </p>
        <button
          type="button"
          onClick={() => router.push('/select-plan')}
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
          Choose a plan
        </button>
      </div>
    </div>
  );
}
