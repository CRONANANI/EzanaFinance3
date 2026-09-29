'use client';

import { useState } from 'react';
import { codeFormatProblem, normalizeCode, REFERRAL_CODE_LENGTH } from '@/lib/referrals';

/**
 * "Have a referral code?" on the sign-up form: collapsed by default, opened
 * (and prefilled) when the page arrived with ?ref=. Validates on blur against
 * /api/referrals/validate and shows an inline check or cross; the parent
 * applies the code after sign-up succeeds. Optional: an invalid code never
 * blocks sign-up.
 */
export default function ReferralCodeField({ value, onChange, open, onOpenChange }) {
  const [state, setState] = useState({ status: 'idle', message: '' });

  const validate = async () => {
    const code = normalizeCode(value);
    if (!code) {
      setState({ status: 'idle', message: '' });
      return;
    }
    const problem = codeFormatProblem(code);
    if (problem) {
      setState({ status: 'invalid', message: problem });
      return;
    }
    setState({ status: 'checking', message: 'Checking code' });
    try {
      const res = await fetch('/api/referrals/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setState({
          status: 'idle',
          message: 'Too many checks. It will be verified when you sign up.',
        });
      } else {
        setState({ status: data.valid ? 'valid' : 'invalid', message: data.message || '' });
      }
    } catch {
      setState({ status: 'idle', message: 'It will be verified when you sign up.' });
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="text-sm font-medium text-emerald-700 hover:underline"
      >
        Have a referral code?
      </button>
    );
  }

  const tone =
    state.status === 'valid'
      ? 'text-emerald-700'
      : state.status === 'invalid'
        ? 'text-red-600'
        : 'text-slate-500';

  return (
    <div>
      <label htmlFor="referral-code" className="mb-1 block text-sm font-medium text-slate-700">
        Referral code <span className="font-normal text-slate-500">(optional)</span>
      </label>
      <div className="relative">
        <input
          id="referral-code"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={REFERRAL_CODE_LENGTH + 2}
          value={value}
          onChange={(e) => {
            onChange(normalizeCode(e.target.value));
            setState({ status: 'idle', message: '' });
          }}
          onBlur={validate}
          placeholder="ABCD2345"
          aria-describedby="referral-code-status"
          aria-invalid={state.status === 'invalid'}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-10 font-mono uppercase tracking-[0.2em] text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {state.status === 'valid' || state.status === 'invalid' ? (
          <i
            className={`bi ${state.status === 'valid' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} absolute right-3 top-1/2 -translate-y-1/2 ${tone}`}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p id="referral-code-status" className={`mt-1 min-h-4 text-xs ${tone}`} aria-live="polite">
        {state.message}
      </p>
    </div>
  );
}
