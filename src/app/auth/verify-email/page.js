'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function VerifyEmailPage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);
  const router = useRouter();

  const redirectIfAlreadyVerified = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/auth/signin?redirect=/auth/verify-email');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.email_verified) {
      router.replace('/home');
    }
  }, [router]);

  const sendCode = useCallback(async () => {
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/auth/send-verification', { method: 'POST' });
      const data = await res.json();

      if (data.alreadyVerified) {
        await redirectIfAlreadyVerified();
        return;
      }

      if (data.error && !data.success) {
        setError(data.error);
      } else {
        setMaskedEmail(data.email || '');
        setSuccess('Verification code sent!');
        setCooldown(60);
      }
    } catch {
      setError('Failed to send code. Please try again.');
    } finally {
      setSending(false);
    }
  }, [redirectIfAlreadyVerified]);

  useEffect(() => {
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send once on mount
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newCode.every((d) => d !== '')) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      verifyCode(pasted);
    }
  };

  const verifyCode = async (codeString) => {
    if (codeString.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeString }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Email verified!');
        setTimeout(() => router.replace('/home'), 1000);
      } else {
        setError(data.error);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0e13',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#0d1117',
          borderRadius: '16px',
          padding: '2.5rem',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h1 style={{ color: '#f0f6fc', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Verify your email</h1>
        <p style={{ color: '#a7b1bb', fontSize: '0.9rem', marginBottom: '2rem' }}>
          {maskedEmail
            ? `We sent a 6-digit code to ${maskedEmail}`
            : 'Sending verification code...'}
        </p>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '1.5rem',
              color: '#f87171',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        {success && !error && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '1.5rem',
              color: '#34d399',
              fontSize: '0.85rem',
            }}
          >
            {success}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '2rem' }}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              disabled={loading}
              style={{
                width: '48px',
                height: '56px',
                textAlign: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '2px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                color: '#f0f6fc',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#10b981';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => verifyCode(code.join(''))}
          disabled={loading || code.some((d) => d === '')}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: 'none',
            background: code.every((d) => d !== '') ? '#10b981' : 'rgba(255, 255, 255, 0.12)',
            color: '#f0f6fc',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '1.5rem',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>

        <p style={{ color: '#a7b1bb', fontSize: '0.85rem' }}>
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            onClick={sendCode}
            disabled={sending || cooldown > 0}
            style={{
              background: 'none',
              border: 'none',
              color: cooldown > 0 ? '#6b7280' : '#10b981',
              cursor: cooldown > 0 ? 'default' : 'pointer',
              textDecoration: 'underline',
              fontSize: '0.85rem',
            }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending...' : 'Resend code'}
          </button>
        </p>
      </div>
    </div>
  );
}
