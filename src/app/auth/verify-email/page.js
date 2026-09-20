'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { OtpInput } from '@/components/auth/OtpInput';

export default function VerifyEmailPage() {
  const [code, setCode] = useState('');
  const [otpStatus, setOtpStatus] = useState('idle');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
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
        setOtpStatus('success');
        setSuccess('Email verified!');
        /* 1s before redirect: the staggered ring draw (0.15s + 6 * 0.05s +
           0.45s) completes inside it. */
        setTimeout(() => router.replace('/home'), 1000);
      } else {
        setOtpStatus('error');
        setError(data.error);
        /* Shake first, then clear: matches upstream's error feel. Status
           resets to idle on the next keystroke via onChange. */
        setTimeout(() => setCode(''), 350);
      }
    } catch {
      setOtpStatus('error');
      setError('Verification failed. Please try again.');
      setTimeout(() => setCode(''), 350);
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
        background: '#f8fafb',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          borderRadius: '16px',
          padding: '2.5rem',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h1 style={{ color: '#0f172a', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Verify your email
        </h1>
        <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '2rem' }}>
          {maskedEmail
            ? `We sent a 6-digit code to ${maskedEmail}`
            : 'Sending verification code...'}
        </p>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '1.5rem',
              color: '#dc2626',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        {success && !error && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '1.5rem',
              color: '#059669',
              fontSize: '0.85rem',
            }}
          >
            {success}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <OtpInput
            length={6}
            size="lg"
            className="otp-root--on-light"
            value={code}
            onChange={(v) => {
              setCode(v);
              if (otpStatus !== 'idle') setOtpStatus('idle');
              if (error) setError('');
            }}
            onComplete={verifyCode}
            status={otpStatus}
            disabled={loading || otpStatus === 'success'}
            autoFocus
          />
        </div>

        <button
          type="button"
          onClick={() => verifyCode(code)}
          disabled={loading || code.length !== 6}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: 'none',
            background: code.length === 6 ? '#10b981' : '#e2e8f0',
            color: code.length === 6 ? '#ffffff' : '#64748b',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '1.5rem',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>

        <p style={{ color: '#475569', fontSize: '0.85rem' }}>
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            onClick={sendCode}
            disabled={sending || cooldown > 0}
            style={{
              background: 'none',
              border: 'none',
              color: cooldown > 0 ? '#94a3b8' : '#059669',
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
