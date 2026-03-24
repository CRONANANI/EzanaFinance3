'use client';

import { useRouter } from 'next/navigation';

export function TrialBanner({ daysRemaining, trialExpired }) {
  const router = useRouter();

  if (trialExpired) {
    return (
      <div
        style={{
          background: 'linear-gradient(90deg, #dc2626, #b91c1c)',
          color: 'white',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.9rem',
        }}
      >
        <span>Your free trial has ended. Choose a plan to continue using Ezana Finance.</span>
        <button
          type="button"
          onClick={() => router.push('/pricing')}
          style={{
            background: 'white',
            color: '#dc2626',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginLeft: '16px',
          }}
        >
          Choose Plan
        </button>
      </div>
    );
  }

  if (daysRemaining <= 3) {
    return (
      <div
        style={{
          background: 'linear-gradient(90deg, #f59e0b, #d97706)',
          color: 'white',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.9rem',
        }}
      >
        <span>
          {daysRemaining === 1
            ? 'Your free trial ends tomorrow!'
            : `Your free trial ends in ${daysRemaining} days.`}{' '}
          Choose a plan to keep your access.
        </span>
        <button
          type="button"
          onClick={() => router.push('/pricing')}
          style={{
            background: 'white',
            color: '#d97706',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginLeft: '16px',
          }}
        >
          View Plans
        </button>
      </div>
    );
  }

  return null;
}
