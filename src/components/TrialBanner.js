'use client';

import { useRouter } from 'next/navigation';

/**
 * @param {'stripe' | 'account' | 'expired'} variant
 * @param {number} daysRemaining
 */
export function TrialBanner({ daysRemaining, trialExpired, variant = 'account' }) {
  const router = useRouter();

  if (trialExpired || variant === 'expired') {
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
          onClick={() => router.push('/select-plan')}
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

  if (variant === 'stripe' && daysRemaining > 0) {
    return (
      <div
        style={{
          background: 'linear-gradient(90deg, #059669, #10b981)',
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
            ? 'Your free trial ends tomorrow — cancel anytime before then to avoid being charged.'
            : `${daysRemaining} days left in your free trial. You won’t be charged until the trial ends.`}
        </span>
        <button
          type="button"
          onClick={() => router.push('/settings')}
          style={{
            background: 'white',
            color: '#059669',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginLeft: '16px',
          }}
        >
          Manage plan
        </button>
      </div>
    );
  }

  if (variant === 'account' && daysRemaining <= 3 && daysRemaining > 0) {
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
            ? 'Your access window ends tomorrow!'
            : `Your access ends in ${daysRemaining} days.`}{' '}
          Choose a plan to keep full access.
        </span>
        <button
          type="button"
          onClick={() => router.push('/select-plan')}
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
          View plans
        </button>
      </div>
    );
  }

  return null;
}
